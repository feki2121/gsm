import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {

    const session = await getServerSession();
        if (!session) {
          return NextResponse.json(
            { error: 'Non authentifié' },
            { status: 401 }
          );
        }
    
        // Récupérer l'utilisateur avec son chauffeur et son véhicule
        const user = await prisma.user.findUnique({
          where: { email: session.user?.email! },
          include: {
            chauffeur: {
              include: {
                vehicule: {
                  include: {
                    home: true  // Inclure le home associé au véhicule
                  }
                }
              }
            }
          }
        });
    
        if (!user) {
          return NextResponse.json(
            { error: 'Utilisateur non trouvé' },
            { status: 404 }
          );
        }
    const { id: fournisseurId } = await params;
    const body = await request.json();
    const { montant, reference, datePaiement } = body;

    if (!montant || montant <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    // Récupérer TOUS les crédits du fournisseur (directs ET dans les MIXTE) avec statut EN_ATTENTE
    const allReglements = await prisma.reglementFournisseur.findMany({
      where: {
        fournisseurId,
        OR: [
          { typeReglement: 'CREDIT', statut: 'EN_ATTENTE' },
          { typeReglement: 'MIXTE' }
        ]
      },
      include: {
        bonsEntree: {
          include: {
            bonEntree: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Extraire tous les crédits (directs + de MIXTE)
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
          bonsEntree: reg.bonsEntree
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
                bonsEntree: reg.bonsEntree
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
        { error: 'Aucun crédit à payer pour ce fournisseur' },
        { status: 400 }
      );
    }

    // Trier par date
    allCredits.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const soldeTotal = allCredits.reduce((sum, credit) => sum + credit.montant, 0);

    if (montant > soldeTotal) {
      return NextResponse.json(
        { error: `Le montant (${montant} DT) dépasse le solde total dû (${soldeTotal} DT)` },
        { status: 400 }
      );
    }

    let resteAPayer = montant;
    const creditsPayes: any[] = [];

    // Répartir le paiement (FIFO)
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
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer le nouveau règlement (ESPECE, PAYE immédiatement)
      const nouveauReglement = await tx.reglementFournisseur.create({
        data: {
          fournisseurId,
          montant,
          typeReglement: 'ESPECE',
          reference: reference || `PAY-${Date.now()}`,
          date: datePaiement ? new Date(datePaiement) : new Date(),
          statut: 'PAYE'
        }
      });

      // 2. Traiter chaque crédit payé
      for (const credit of creditsPayes) {
        if (!credit.isFromMixte) {
          // Crédit direct
          const nouveauMontant = credit.montant - credit.montantPaye;
          
          if (nouveauMontant <= 0) {
            await tx.reglementFournisseur.update({
              where: { id: credit.id },
              data: { statut: 'PAYE', montant: 0 }
            });
          } else {
            await tx.reglementFournisseur.update({
              where: { id: credit.id },
              data: { montant: nouveauMontant }
            });
          }
        } else {
          // Crédit dans un paiement MIXTE
          const reglementMixte = await tx.reglementFournisseur.findUnique({
            where: { id: credit.originalReglement.id }
          });
          
          if (reglementMixte && reglementMixte.detailsMixte) {
            const details = JSON.parse(reglementMixte.detailsMixte);
            const nouveauMontantDetail = credit.originalDetail.montant - credit.montantPaye;
            
            if (nouveauMontantDetail <= 0) {
              details[credit.detailIndex].statut = 'PAYE';
              details[credit.detailIndex].montant = 0;
            } else {
              details[credit.detailIndex].montant = nouveauMontantDetail;
            }
            
            // Vérifier si tous les détails sont payés
            const tousPayes = details.every((d: any) => d.statut === 'PAYE');
            const statutGlobal = tousPayes ? 'PAYE' : 'PARTIELLE';
            
            await tx.reglementFournisseur.update({
              where: { id: reglementMixte.id },
              data: {
                detailsMixte: JSON.stringify(details),
                statut: statutGlobal,
                montant: details.reduce((sum: number, d: any) => sum + (d.montant || 0), 0)
              }
            });
          }
        }
        
        // Lier au BE
        if (credit.bonsEntree && credit.bonsEntree.length > 0) {
          for (const beLink of credit.bonsEntree) {
            await tx.reglementFournisseurBE.create({
              data: {
                reglementId: nouveauReglement.id,
                bonEntreeId: beLink.bonEntreeId,
                montant: credit.montantPaye
              }
            });
          }
        }
      }

      // 3. Mettre à jour le solde du fournisseur
      await tx.fournisseur.update({
        where: { id: fournisseurId },
        data: {
          solde: { decrement: montant }
        }
      });

      // 4. Mouvement de caisse (DÉCAISSEMENT car on paye le fournisseur)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
     // let caisse = await tx.caisse.findUnique({ where: { date: today } });
     //  let caisse;

      // Solution 1: Utiliser findFirst (recommandé et plus simple)
      // caisse = await tx.caisse.findFirst({
      //   where: {
      //     date: today,
      //     chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null
      //   }
      // });
      // if (!caisse) {
      //   caisse = await tx.caisse.create({
      //     data: {
      //       date: today, 
      //       soldeOuverture: 0,
      //       totalEncaissements: 0,
      //       totalDecaissements: 0,
      //       soldeTheorique: 0,
      //       statut: 'OUVERTE',
      //     },
      //   });
      // }
      
      // await tx.mouvementCaisse.create({
      //   data: {
      //     caisseId: caisse.id,
      //     type: 'DECAISSEMENT',
      //     modeReglement: 'ESPECE',
      //     montant: montant,
      //     reference: nouveauReglement.reference || nouveauReglement.id,
      //     libelle: `Paiement fournisseur`,
      //   },
      // });
      
      // await tx.caisse.update({
      //   where: { id: caisse.id },
      //   data: {
      //     totalDecaissements: { increment: montant },
      //     soldeTheorique: { decrement: montant }
      //   }
      // });

      return nouveauReglement;
    });

    return NextResponse.json({
      success: true,
      message: 'Paiement fournisseur enregistré avec succès',
      reglement: result
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'enregistrement du paiement' },
      { status: 500 }
    );
  }
}