import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        bonLivraisons: {
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
            bonLivraisons: {
              include: {
                bonLivraison: true
              }
            }
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Filtrer les règlements où la référence commence par "PAY-"
    const filteredReglements = client.reglements.filter((reg: any) => 
      reg.reference && reg.reference.startsWith('PAY-')
    );

    // Récupérer TOUS les règlements de type CREDIT (peu importe le statut)
    // MAIS aussi ceux qui sont dans des paiements MIXTE (détailsMixte)

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
              // Créer un objet crédit virtuel à partir du détail MIXTE
              allCredits.push({
                id: `${reg.id}-credit`,
                date: reg.date,
                montant: detail.montant,
                reference: reg.reference,
                statut: detail.statut || 'EN_ATTENTE',
                typeReglement: 'CREDIT',
                bonLivraisons: reg.bonLivraisons,
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

    // Filtrer uniquement les crédits EN_ATTENTE pour l'affichage
    const creditsAPayer = allCredits.filter(credit => credit.statut === 'EN_ATTENTE');

    return NextResponse.json({
      client: {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        email: client.email,
        solde: soldeTotal,
        creditAutorise: client.creditAutorise,
        creditDisponible: client.creditDisponible,
        estAutoriseCredit: client.estAutoriseCredit
      },
      creditsAPayer: creditsAPayer.map(credit => ({
        id: credit.id,
        date: credit.date,
        montant: credit.montant,
        reference: credit.reference,
        statut: credit.statut,
        typeReglement: credit.typeReglement,
        isFromMixte: credit.isFromMixte || false,
        bonLivraisons: credit.bonLivraisons?.map((bl: any) => ({
          bonLivraison: {
            id: bl.bonLivraison?.id || bl.bonLivraisonId,
            numero: bl.bonLivraison?.numero || 'N/A',
            date: bl.bonLivraison?.date
          }
        })) || []
      })),
      historiquePaiements: filteredReglements.map((reg: any) => ({
        id: reg.id,
        date: reg.date,
        montant: reg.montant,
        typeReglement: reg.typeReglement,
        reference: reg.reference,
        statut: reg.statut,
        banque: reg.banque,
        detailsMixte: reg.detailsMixte,
        bls: reg.bonLivraisons.map((bl: any) => ({
          blId: bl.bonLivraison.id,
          blNumero: bl.bonLivraison.numero,
          montantApplique: bl.montant
        }))
      })),
      bonsLivraison: client.bonLivraisons.map((bl: any) => ({
        id: bl.id,
        numero: bl.numero,
        date: bl.date,
        montantTotal: bl.montantTotal,
        montantPaye: bl.montantPaye,
        montantRestant: bl.montantRestant,
        statut: bl.statut,
        reglements: bl.reglements.map((r: any) => ({
          reglement: {
            id: r.reglement.id,
            montant: r.montant,
            typeReglement: r.reglement.typeReglement,
            statut: r.reglement.statut
          }
        })) 
      }))
    });  
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération du solde client' },
      { status: 500 }
    );
  }
}