import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: fournisseurId } = await params;

    // Récupérer le fournisseur
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
      include: {
        bonsEntree: {
          orderBy: { date: 'desc' },
          include: {
            reglements: {
              include: {
                reglement: true
              }
            }
          }
        },
        reglements: {
          orderBy: { date: 'desc' },
          include: {
            bonsEntree: {
              include: {
                bonEntree: true
              }
            }
          }
        }
      }
    });

    if (!fournisseur) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 });
    }

    // Récupérer TOUS les règlements de type CREDIT (sans filtre PAY-)
    // Les crédits sont des règlements avec typeReglement = 'CREDIT' et statut = 'EN_ATTENTE'
    const creditsDirects = fournisseur.reglements.filter(
      reg => reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE'
    );
    
    // Récupérer les crédits dans les paiements MIXTE
    let creditsMixte: any[] = [];
    for (const reg of fournisseur.reglements) {
      if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const details = JSON.parse(reg.detailsMixte);
          for (let i = 0; i < details.length; i++) {
            const detail = details[i];
            // Vérifier si c'est un crédit en attente
            if (detail.type === 'CREDIT' && detail.statut === 'EN_ATTENTE' && detail.montant > 0) {
              creditsMixte.push({
                id: `${reg.id}-credit-${i}`,
                date: reg.date,
                montant: detail.montant,
                reference: reg.reference,
                statut: detail.statut,
                typeReglement: 'CREDIT',
                isFromMixte: true,
                originalReglement: reg,
                bonsEntree: reg.bonsEntree
              });
            }
          }
        } catch (e) {
          console.error('Erreur parsing detailsMixte:', e);
        }
      }
    }

    // Tous les crédits à payer
    const allCredits = [...creditsDirects, ...creditsMixte];
    const creditsAPayer = allCredits.filter(credit => credit.statut === 'EN_ATTENTE');
    
    // Calculer le solde total = somme des crédits EN_ATTENTE
    const soldeTotal = creditsAPayer.reduce((sum, credit) => sum + credit.montant, 0);

    // Pour l'historique des paiements, inclure UNIQUEMENT les règlements avec référence commençant par "PAY-"
    // Ces paiements sont des paiements effectués en espèces pour régler les crédits
    const historiquePaiements = fournisseur.reglements.filter(reg => 
      reg.reference && reg.reference.startsWith('PAY-')
    );

    return NextResponse.json({
      fournisseur: {
        id: fournisseur.id,
        nom: fournisseur.nom,
        telephone: fournisseur.telephone,
        email: fournisseur.email,
        adresse: fournisseur.adresse,
        solde: soldeTotal
      },
      creditsAPayer: creditsAPayer.map(credit => ({
        id: credit.id,
        date: credit.date,
        montant: credit.montant,
        reference: credit.reference,
        statut: credit.statut,
        typeReglement: credit.typeReglement,
        isFromMixte: credit.isFromMixte || false,
        bonsEntree: credit.bonsEntree?.map((be: any) => ({
          bonEntree: {
            id: be.bonEntree?.id || be.bonEntreeId,
            numero: be.bonEntree?.numero || 'N/A',
            date: be.bonEntree?.date,
            totalTTC: be.bonEntree?.totalTTC
          }
        })) || []
      })),
      historiquePaiements: historiquePaiements.map(reg => ({
        id: reg.id,
        date: reg.date,
        montant: reg.montant,
        typeReglement: reg.typeReglement,
        reference: reg.reference,
        statut: reg.statut,
        banque: reg.banque,
        detailsMixte: reg.detailsMixte,
        bonsEntree: reg.bonsEntree.map((be: any) => ({
          beId: be.bonEntree.id,
          beNumero: be.bonEntree.numero,
          montantApplique: be.montant
        }))
      })),
      bonsEntree: fournisseur.bonsEntree.map(be => ({
        id: be.id,
        numero: be.numero,
        date: be.date,
        totalTTC: be.totalTTC,
        type: be.type,
        statut: be.statut
      }))
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde fournisseur' },
      { status: 500 }
    );
  }
}