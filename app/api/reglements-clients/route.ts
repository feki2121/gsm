import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié', data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé', data: [], pagination: { page: 1, limit: 10, total: 0, pages: 0 } },
        { status: 404 }
      );
    }

    // Récupérer les filtres
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const clientId = searchParams.get('clientId');  // ← Recherche par ID
    const typeReglement = searchParams.get('typeReglement');
    const statut = searchParams.get('statut');

    console.log('Filtres reçus:', { dateDebut, dateFin, clientId, typeReglement, statut });

    // Construire les conditions WHERE
    const where: any = {};

    // Filtre par chauffeur (si chauffeur)
    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      where.chauffeurId = user.chauffeur.id;
    }

    // Filtre par date
    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        const startDate = new Date(dateDebut);
        startDate.setHours(0, 0, 0, 0);
        where.date.gte = startDate;
      }
      if (dateFin) {
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Filtre par client ID
    if (clientId && clientId.trim() !== '' && clientId !== 'undefined') {
      where.clientId = clientId;
    }

    // Filtre par type de règlement
    if (typeReglement && typeReglement !== 'TOUS' && typeReglement !== 'undefined') {
      where.typeReglement = typeReglement;
    } else if (!typeReglement || typeReglement === 'TOUS') {
      // Par défaut, exclure CREDIT
      where.typeReglement = {
        not: 'CREDIT'
      };
    }

    // Filtre par statut
    if (statut && statut !== 'TOUS' && statut !== 'undefined') {
      where.statut = statut;
    }

    console.log('Where clause:', JSON.stringify(where, null, 2));

    // Exécuter les requêtes avec pagination
    const [reglements, total] = await Promise.all([
      prisma.reglementClient.findMany({
        skip,
        take: limit,
        where,
        include: {
          client: true,
          factures: { 
            include: { 
              facture: true 
            } 
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.reglementClient.count({ where }),
    ]);

    console.log(`Found ${reglements.length} reglements, total: ${total}`);

    return NextResponse.json({
      data: reglements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { dateDebut, dateFin, clientId, typeReglement, statut },
    });
  } catch (error) {
    console.error('Error fetching reglements clients:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch reglements clients',
        data: [],
        pagination: { page: 1, limit: 10, total: 0, pages: 0 }
      },
      { status: 500 }
    );
  }
}
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '10');
//     const skip = (page - 1) * limit;

//     const [reglements, total] = await Promise.all([
//       prisma.reglementClient.findMany({
//         skip,
//         take: limit,
//         include: {
//           client: true,
//           factures: { include: { facture: true } },
//         },
//         orderBy: { date: 'desc' },
//       }),
//       prisma.reglementClient.count(),
//     ]);

//     return NextResponse.json({
//       data: reglements,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching reglements clients:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch reglements clients' },
//       { status: 500 }
//     );
//   }
// }

// POST create reglement client with automatic cash register movement
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son chauffeur
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

    const body = await req.json();
    const {
      clientId,
      montant,
      typeReglement,
      reference,
      statut,
      echeance,
      banque,
      domiciliation,
      factureIds = [],
    } = body;

    if (!clientId || !montant || !typeReglement) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, montant, typeReglement' },
        { status: 400 }
      );
    }

    // Check if client exists
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }
    const chauffeurId = user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null;


    // Create the payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the payment
      const reglement = await tx.reglementClient.create({
        data: {
          clientId,
          chauffeurId,
          montant,
          typeReglement,
          reference,
          statut: statut || 'EN_ATTENTE',
          echeance: echeance ? new Date(echeance) : null,
          banque,
          domiciliation,
        },
        include: {
          client: true,
        },
      });

      // 2. Link to invoices if provided
      // if (factureIds.length > 0) {
      //   await tx.reglementFacture.createMany({
      //     data: factureIds.map((factureId: string) => ({
      //       reglementId: reglement.id,
      //       factureId,
      //       montantApplique: montant / factureIds.length, // Répartition égale
      //     })),
      //   });

      //   // Update invoice statuses
      //   for (const factureId of factureIds) {
      //     const facture = await tx.facture.findUnique({
      //       where: { id: factureId },
      //       include: {
      //         reglements: true,
      //       },
      //     });

      //     if (facture) {
      //       const totalRegle = facture.reglements.reduce(
      //         (sum, r) => sum + r.montantApplique,
      //         0
      //       );
      //       const nouveauTotalRegle = totalRegle + (montant / factureIds.length);

      //       let nouveauStatut: 'IMPAYEE' | 'PAYEE' | 'PARTIELLE' = 'IMPAYEE';
      //       if (nouveauTotalRegle >= facture.totalTTC) {
      //         nouveauStatut = 'PAYEE';
      //       } else if (nouveauTotalRegle > 0) {
      //         nouveauStatut = 'PARTIELLE';
      //       }

      //       await tx.facture.update({
      //         where: { id: factureId },
      //         data: { statut: nouveauStatut as any },
      //       });
      //     }
      //   }
      // }

      // 3. Create cash register movement if payment is cashed
      if (statut === 'ENCAISSE' || (!statut && typeReglement === 'ESPECE')) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Get or create cash register for today
        let caisse = await tx.caisse.findFirst({
          where: { date: today },
        });

        if (!caisse) {
          caisse = await tx.caisse.create({
            data: {
              date: today,
              soldeOuverture: 0,
              totalEncaissements: 0,
              totalDecaissements: 0,
              soldeTheorique: 0,
              statut: 'OUVERTE',
            },
          });
        }

        if (caisse.statut === 'CLOTUREE') {
          throw new Error('Cash register is already closed for today');
        }

        // Create movement
        // const mouvement = await tx.mouvementCaisse.create({
        //   data: {
        //     caisseId: caisse.id,
        //     type: 'ENCAISSEMENT',
        //     modeReglement: typeReglement,
        //     montant,
        //     reference: reference || reglement.id,
        //     libelle: `Règlement client: ${client.nom}`,
        //   },
        // });

        // Update cash register totals
        // const newTotalEncaissements = caisse.totalEncaissements + montant;
        // await tx.caisse.update({
        //   where: { id: caisse.id },
        //   data: {
        //     totalEncaissements: newTotalEncaissements,
        //     soldeTheorique: caisse.soldeOuverture + newTotalEncaissements - caisse.totalDecaissements,
        //   },
        // });

        return { reglement };
      }

      return { reglement };
    });

    return NextResponse.json(result.reglement, { status: 201 });
  } catch (error) {
    console.error('Error creating reglement client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reglement client' },
      { status: 500 }
    );
  }
}