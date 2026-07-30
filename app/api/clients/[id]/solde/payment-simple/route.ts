import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

// Fonction pour envoyer la notification WhatsApp
async function sendWhatsAppNotification(telephone: string, montantPaye: number, soldeRestant: number, clientNom: string) {
  try {
    // Nettoyer le numéro de téléphone
    let cleanPhone = telephone.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '216' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('216')) {
      cleanPhone = '216' + cleanPhone;
    }

    // Utiliser les valeurs réelles (sans Math.abs pour le solde restant)
    const montantReel = montantPaye;
    const soldeReel = soldeRestant >= 0 ? soldeRestant : 0;

    // Formater le message
    const message = `Cher ${clientNom},

Nous vous remercions pour votre règlement de ${montantReel.toFixed(3)} DT.

Le solde restant de votre compte est de ${soldeReel.toFixed(3)} DT.

Cordialement,
CHIHA GSM`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;
    return whatsappUrl;
  } catch (error) {
    console.error('Erreur création URL WhatsApp:', error);
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: {
        chauffeur: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    const chauffeurId = user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null;

    const { id: clientId } = await params;
    const body = await request.json();
    const { montant, reference, datePaiement } = body;

    if (!montant || montant <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    // Récupérer le client AVANT la transaction
    const clientAvant = await prisma.client.findUnique({
      where: { id: clientId },
      select: { solde: true, nom: true, telephone: true, creditDisponible: true }
    });

    if (!clientAvant) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Récupérer les crédits EN_ATTENTE pour calculer le solde actuel
    const allReglements = await prisma.reglementClient.findMany({
      where: {
        clientId,
        OR: [
          { typeReglement: 'CREDIT', statut: 'EN_ATTENTE' },
          { typeReglement: 'MIXTE' }
        ]
      },
      include: {
        bonLivraisons: {
          include: {
            bonLivraison: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Calculer le solde actuel à partir des crédits EN_ATTENTE
    let soldeActuel = 0;

    for (const reg of allReglements) {
      if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
        soldeActuel += reg.montant;
      } else if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const details = JSON.parse(reg.detailsMixte);
          for (const detail of details) {
            if (detail.type === 'CREDIT' && detail.statut === 'EN_ATTENTE' && detail.montant > 0) {
              soldeActuel += detail.montant;
            }
          }
        } catch (e) {
          console.error('Erreur parsing detailsMixte:', e);
        }
      }
    }

    console.log('=== DÉBUT PAIEMENT ===');
    console.log('Client:', clientAvant.nom);
    console.log('Solde AVANT paiement (crédits EN_ATTENTE):', soldeActuel);
    console.log('Montant à payer:', montant);

    // Vérifier que le montant ne dépasse pas le solde
    if (montant > soldeActuel) {
      return NextResponse.json(
        { error: `Le montant (${montant} DT) dépasse le solde dû (${soldeActuel} DT)` },
        { status: 400 }
      );
    }

    // Extraire tous les crédits à payer
    let allCredits: any[] = [];

    for (const reg of allReglements) {
      if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
        allCredits.push({
          id: reg.id,
          montant: reg.montant,
          date: reg.date,
          statut: reg.statut,
          isFromMixte: false,
          originalReglement: reg,
          bonLivraisons: reg.bonLivraisons
        });
      } else if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const details = JSON.parse(reg.detailsMixte);
          for (let i = 0; i < details.length; i++) {
            const detail = details[i];
            if (detail.type === 'CREDIT' && detail.statut === 'EN_ATTENTE' && detail.montant > 0) {
              allCredits.push({
                id: `${reg.id}-credit-${i}`,
                montant: detail.montant,
                date: reg.date,
                statut: detail.statut,
                isFromMixte: true,
                originalReglement: reg,
                detailIndex: i,
                originalDetail: detail,
                bonLivraisons: reg.bonLivraisons
              });
            }
          }
        } catch (e) {
          console.error('Erreur parsing detailsMixte:', e);
        }
      }
    }

    if (allCredits.length === 0) {
      return NextResponse.json(
        { error: 'Aucun crédit à payer pour ce client' },
        { status: 400 }
      );
    }

    // Trier par date
    allCredits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let resteAPayer = montant;
    const creditsPayes: any[] = [];

    // Répartir le paiement
    for (const credit of allCredits) {
      if (resteAPayer <= 0) break;

      const montantAPayer = Math.min(resteAPayer, credit.montant);

      creditsPayes.push({
        ...credit,
        montantPaye: montantAPayer
      });

      resteAPayer -= montantAPayer;
    }

    // Transaction
    await prisma.$transaction(async (tx: any) => {
      // 1. Créer le nouveau règlement
      const nouveauReglement = await tx.reglementClient.create({
        data: {
          clientId,
          chauffeurId,
          montant,
          typeReglement: 'CREDIT',
          reference: reference || `PAY-${Date.now()}`,
          date: datePaiement ? new Date(datePaiement) : new Date(),
          statut: 'ENCAISSE'
        }
      });

      // 2. Traiter chaque crédit payé (les marquer comme ENCAISSE)
      for (const credit of creditsPayes) {
        if (!credit.isFromMixte) {
          // Crédit direct
          const nouveauMontant = credit.montant - credit.montantPaye;

          if (nouveauMontant <= 0) {
            await tx.reglementClient.update({
              where: { id: credit.id },
              data: { statut: 'ENCAISSE', montant: 0 }
            });
          } else {
            await tx.reglementClient.update({
              where: { id: credit.id },
              data: { montant: nouveauMontant }
            });
          }
        } else {
          // Crédit dans un paiement MIXTE
          const reglementMixte = await tx.reglementClient.findUnique({
            where: { id: credit.originalReglement.id }
          });

          if (reglementMixte && reglementMixte.detailsMixte) {
            const details = JSON.parse(reglementMixte.detailsMixte);
            const nouveauMontantDetail = credit.originalDetail.montant - credit.montantPaye;

            if (nouveauMontantDetail <= 0) {
              details[credit.detailIndex].statut = 'ENCAISSE';
              details[credit.detailIndex].montant = 0;
            } else {
              details[credit.detailIndex].montant = nouveauMontantDetail;
            }

            const tousEncaisses = details.every((d: any) => d.statut === 'ENCAISSE');
            const statutGlobal = tousEncaisses ? 'ENCAISSE' : 'PARTIELLE';

            await tx.reglementClient.update({
              where: { id: reglementMixte.id },
              data: {
                detailsMixte: JSON.stringify(details),
                statut: statutGlobal,
                montant: details.reduce((sum: number, d: any) => sum + (d.montant || 0), 0)
              }
            });
          }
        }

        // Lier au BL
        if (credit.bonLivraisons && credit.bonLivraisons.length > 0) {
          for (const blLink of credit.bonLivraisons) {
            await tx.reglementClientBL.create({
              data: {
                reglementId: nouveauReglement.id,
                bonLivraisonId: blLink.bonLivraisonId,
                montant: credit.montantPaye
              }
            });
          }
        }
      }

      // 3. Mettre à jour le creditDisponible du client
      await tx.client.update({
        where: { id: clientId },
        data: {
          creditDisponible: { increment: montant }
        }
      });

      // 4. Mouvement de caisse
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let caisse = await tx.caisse.findFirst({
        where: {
          date: today,
          chauffeurId: chauffeurId
        }
      });

      if (!caisse) {
        caisse = await tx.caisse.create({
          data: {
            date: today,
            chauffeurId: chauffeurId,
            soldeOuverture: 0,
            totalEncaissements: 0,
            totalDecaissements: 0,
            soldeTheorique: 0,
            statut: 'OUVERTE',
          },
        });
      }

      await tx.mouvementCaisse.create({
        data: {
          caisseId: caisse.id,
          type: 'ENCAISSEMENTCREDIT',
          modeReglement: 'CREDIT',
          montant: montant,
          reference: nouveauReglement.reference || nouveauReglement.id,
          libelle: `Encaissement crédit client - ${clientAvant.nom}`,
        },
      });

      await tx.caisse.update({
        where: { id: caisse.id },
        data: {
          totalEncaissements: { increment: montant },
          soldeTheorique: { increment: montant }
        }
      });

      return nouveauReglement;
    });

    // Recalculer le nouveau solde restant après paiement
    const allReglementsApres = await prisma.reglementClient.findMany({
      where: {
        clientId,
        OR: [
          { typeReglement: 'CREDIT', statut: 'EN_ATTENTE' },
          { typeReglement: 'MIXTE' }
        ]
      }
    });

    let nouveauSoldeTotal = 0;

    for (const reg of allReglementsApres) {
      if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
        nouveauSoldeTotal += reg.montant;
      } else if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const details = JSON.parse(reg.detailsMixte);
          for (const detail of details) {
            if (detail.type === 'CREDIT' && detail.statut === 'EN_ATTENTE' && detail.montant > 0) {
              nouveauSoldeTotal += detail.montant;
            }
          }
        } catch (e) {
          console.error('Erreur parsing detailsMixte:', e);
        }
      }
    }

    console.log('=== RÉSUMÉ FINAL ===');
    console.log('Client:', clientAvant.nom);
    console.log('Montant payé:', montant);
    console.log('Ancien solde:', soldeActuel);
    console.log('Nouveau solde:', nouveauSoldeTotal);
    console.log('Calcul:', soldeActuel, '-', montant, '=', nouveauSoldeTotal);

    // Générer l'URL WhatsApp
    let whatsappUrl = null;
    if (clientAvant.telephone) {
      whatsappUrl = await sendWhatsAppNotification(
        clientAvant.telephone,
        montant,
        nouveauSoldeTotal,
        clientAvant.nom
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Paiement enregistré avec succès',
      montantPaye: montant,
      soldeRestant: nouveauSoldeTotal,
      soldeInitial: soldeActuel,
      clientNom: clientAvant.nom,
      whatsappUrl: whatsappUrl
    });

  } catch (error) {
    console.error('Erreur détaillée:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du paiement: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}