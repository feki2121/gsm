import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fonction pour calculer le solde crédit
async function calculateClientCreditBalance(clientId: string) {
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      reglements: {
        include: {
          bonLivraisons: {
            include: {
              bonLivraison: true
            }
          }
        }
      }
    }
  });

  if (!client) return 0;

  let allCredits: any[] = [];

  // 1. Credits directs (typeReglement = 'CREDIT')
  const creditsDirects = client.reglements.filter((reg: any) => reg.typeReglement === 'CREDIT');
  allCredits.push(...creditsDirects);

  // 2. Credits dans les paiements MIXTE (détailsMixte)
  for (const reg of client.reglements) {
    if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
      try {
        const details = JSON.parse(reg.detailsMixte);
        for (const detail of details) {
          if (detail.type === 'CREDIT' && detail.montant > 0) {
            allCredits.push({
              id: `${reg.id}-credit`,
              date: reg.date,
              montant: detail.montant,
              reference: reg.reference,
              statut: detail.statut || 'EN_ATTENTE',
              typeReglement: 'CREDIT',
              originalReglement: reg,
              isFromMixte: true
            });
          }
        }
      } catch (e) {
        console.error('Erreur parsing detailsMixte:', e);
      }
    }
  }

  // Calculer le solde total = somme des crédits EN_ATTENTE uniquement
  const soldeTotal = allCredits
    .filter(credit => credit.statut === 'EN_ATTENTE')
    .reduce((sum, reg) => sum + reg.montant, 0);

  return soldeTotal;
}

// Fonction pour envoyer la notification WhatsApp
async function sendCreditNotificationWhatsApp(telephone: string, montantBL: number, nouveauSolde: number, clientNom: string, numeroBL: string) {
  try {
    // Nettoyer le numéro de téléphone
    let cleanPhone = telephone.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '216' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('216')) {
      cleanPhone = '216' + cleanPhone;
    }

    // Formater le message pour une vente à crédit
    const message = `Cher ${clientNom},

Nous vous informons qu'un nouveau bon de livraison (BL N° ${numeroBL}) a été émis pour un montant de ${montantBL.toFixed(3)} DT, en mode crédit.

Votre nouveau solde crédit est de ${nouveauSolde.toFixed(3)} DT.

Nous vous remercions pour votre confiance.

Cordialement,
Kallel Tech Company`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;

    console.log('WhatsApp URL générée pour crédit BL:', clientNom);
    console.log('Montant BL:', montantBL);
    console.log('Nouveau solde:', nouveauSolde);

    return whatsappUrl;
  } catch (error) {
    console.error('Erreur création URL WhatsApp crédit:', error);
    return null;
  }
}

// ✅ CORRECTION : Utilisation de `await` pour déballer `params`
export async function POST(
  req: NextRequest,
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

    // ✅ IMPORTANT : Déballer params avec await
    const { id } = await params;

    console.log('📝 WhatsApp API - ID reçu:', id);

    if (!id) {
      return NextResponse.json(
        { error: 'ID du bon de livraison manquant' },
        { status: 400 }
      );
    }

    // Récupérer le BL avec ses données
    const bonLivraison = await prisma.bonLivraison.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
            home: true
          }
        }
      }
    });

    if (!bonLivraison) {
      return NextResponse.json(
        { error: 'Bon de livraison non trouvé' },
        { status: 404 }
      );
    }

    if (!bonLivraison.client) {
      return NextResponse.json(
        { error: 'Client non trouvé pour ce bon de livraison' },
        { status: 404 }
      );
    }

    const client = bonLivraison.client;

    // Vérifier si le BL est en mode crédit
    const estCredit = await (async () => {
      // Vérifier les règlements liés au BL
      const reglementsBL = await prisma.reglementClientBL.findMany({
        where: {
          bonLivraisonId: id
        },
        include: {
          reglement: true
        }
      });

      for (const rb of reglementsBL) {
        const reg = rb.reglement;
        if (reg.typeReglement === 'CREDIT') {
          return true;
        }
        if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
          try {
            const details = JSON.parse(reg.detailsMixte);
            for (const detail of details) {
              if (detail.type === 'CREDIT' && detail.montant > 0) {
                return true;
              }
            }
          } catch (e) {
            console.error('Erreur parsing detailsMixte:', e);
          }
        }
      }
      return false;
    })();

    if (!estCredit) {
      return NextResponse.json(
        { error: 'Ce bon de livraison n\'est pas en mode crédit' },
        { status: 400 }
      );
    }

    if (!client.telephone) {
      return NextResponse.json(
        { error: 'Le client n\'a pas de numéro de téléphone' },
        { status: 400 }
      );
    }

    // Calculer le nouveau solde crédit
    const nouveauSoldeCredit = await calculateClientCreditBalance(client.id);

    // Récupérer le montant crédit utilisé pour ce BL
    let montantCreditUtilise = 0;
    const reglementsBL = await prisma.reglementClientBL.findMany({
      where: {
        bonLivraisonId: id
      },
      include: {
        reglement: true
      }
    });

    for (const rb of reglementsBL) {
      const reg = rb.reglement;
      if (reg.typeReglement === 'CREDIT') {
        montantCreditUtilise += rb.montant;
      }
      if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const details = JSON.parse(reg.detailsMixte);
          for (const detail of details) {
            if (detail.type === 'CREDIT' && detail.montant > 0) {
              montantCreditUtilise += detail.montant;
            }
          }
        } catch (e) {
          console.error('Erreur parsing detailsMixte:', e);
        }
      }
    }

    // Si aucun montant crédit trouvé, utiliser le montant total du BL
    if (montantCreditUtilise === 0) {
      montantCreditUtilise = bonLivraison.montantTotal || 0;
    }

    console.log('📊 Montant crédit utilisé:', montantCreditUtilise);
    console.log('📊 Nouveau solde crédit:', nouveauSoldeCredit);

    // Générer l'URL WhatsApp
    const whatsappUrl = await sendCreditNotificationWhatsApp(
      client.telephone,
      montantCreditUtilise,
      nouveauSoldeCredit,
      client.nom,
      bonLivraison.numero
    );

    if (!whatsappUrl) {
      return NextResponse.json(
        { error: 'Erreur lors de la génération du message WhatsApp' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      whatsappUrl,
      message: 'URL WhatsApp générée avec succès'
    });

  } catch (error) {
    console.error('Error generating WhatsApp URL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate WhatsApp URL' },
      { status: 500 }
    );
  }
}