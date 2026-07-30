import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all clients with pagination and real solde calculation (exclude prospects)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;

    // Récupérer uniquement les clients qui ne sont pas des prospects
    const where = { estProspect: false };

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        skip,
        take: limit,
        where,
        select: {
          id: true,
          nom: true,
          telephone: true,
          email: true,
          creditAutorise: true,
          creditUtilise: true,
          creditDisponible: true,
          estAutoriseCredit: true,
          createdAt: true,
          addresses: {
            select: {
              id: true,
              adresse: true,
              lieuDit: true,
              codePostal: true,
              ville: true,
              latitude: true,
              longitude: true,
              estPrincipale: true,
            },
            orderBy: {
              estPrincipale: 'desc',
            },
          },
          // Inclure les règlements pour calculer le solde réel
          reglements: {
            select: {
              id: true,
              typeReglement: true,
              montant: true,
              statut: true,
              reference: true,
              date: true,
              detailsMixte: true,
            },
            orderBy: { date: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }),
    ]);

    // Fonction pour calculer le solde réel d'un client (crédits EN_ATTENTE uniquement)
    const calculerSoldeClient = (client: any): number => {
      let totalCreditsEnAttente = 0;
      const reglementsTraites = new Set();

      for (const reg of client.reglements) {
        // 1. Credits directs
        if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
          if (!reglementsTraites.has(reg.id)) {
            totalCreditsEnAttente += reg.montant;
            reglementsTraites.add(reg.id);
          }
        }

        // 2. Credits dans les paiements MIXTE
        if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
          try {
            const details = JSON.parse(reg.detailsMixte);
            for (const detail of details) {
              if (detail.type === 'CREDIT' && detail.montant > 0) {
                const creditStatut = detail.statut || 'EN_ATTENTE';
                if (creditStatut === 'EN_ATTENTE') {
                  const creditId = `${reg.id}-${detail.type}-${detail.montant}`;
                  if (!reglementsTraites.has(creditId)) {
                    totalCreditsEnAttente += detail.montant;
                    reglementsTraites.add(creditId);
                  }
                }
              }
            }
          } catch (e) {
            console.error('Erreur parsing detailsMixte:', e);
          }
        }
      }

      return totalCreditsEnAttente;
    };

    // Transformer les données (supprimer les champs non utilisés par la page)
    const clientsFormatted = clients.map((client: any) => {
      const soldeReel = calculerSoldeClient(client);
      const mainAddress = client.addresses?.find((addr: any) => addr.estPrincipale) || client.addresses?.[0] || null;

      return {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        email: client.email,
        solde: soldeReel,
        creditAutorise: client.creditAutorise,
        creditDisponible: client.creditDisponible,
        createdAt: client.createdAt,
        adresse: mainAddress?.adresse || null,
      };
    });

    // Calculer le total des soldes réels (crédits à payer)
    const totalSoldeGeneral = clientsFormatted.reduce((sum: number, client: any) => {
      return sum + (client.solde > 0 ? client.solde : 0);
    }, 0);

    // Calculer le nombre de clients ayant un solde
    const clientsAvecSolde = clientsFormatted.filter(c => c.solde > 0).length;

    return NextResponse.json({
      data: clientsFormatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      totalSoldeGeneral,
      stats: {
        clientsAvecSolde,
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}