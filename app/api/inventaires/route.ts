import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// GET tous les inventaires (liste)
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

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

    let whereClause: any = {};

    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      // Chauffeur: voir uniquement ses BLs assignés
      whereClause = {
        chauffeurId: user.chauffeur.id
      };
    }
    const [inventaires, total] = await Promise.all([
      prisma.inventaire.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          lignes: {
            include: {
              product: true,
              home: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.inventaire.count(),
    ]);

    // Enrichir les données avec les homes uniques par inventaire
    const inventairesAvecHomes = inventaires.map(inventaire => {
      // Extraire les homes uniques des lignes
      const homesMap = new Map();
      inventaire.lignes.forEach(ligne => {
        if (ligne.home && !homesMap.has(ligne.home.id)) {
          homesMap.set(ligne.home.id, ligne.home);
        }
      });
      const homes = Array.from(homesMap.values());

      return {
        ...inventaire,
        homes, // Ajouter la liste des entrepôts concernés
        homeIds: homes.map(h => h.id), // Ajouter les IDs pour faciliter l'utilisation
      };
    });

    return NextResponse.json({
      data: inventairesAvecHomes,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Error fetching inventaires:', error);
    return NextResponse.json({ error: 'Failed to fetch inventaires' }, { status: 500 });
  }
}

// POST créer un inventaire
export async function POST(req: NextRequest) {
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

    const body = await req.json();


    const { dateDebut, dateFin, description, homes, homeId: bodyHomeId, } = body;

    let finalHomeId = bodyHomeId;

    // Si l'utilisateur est CHAUFFEUR, forcer le homeId de son véhicule
    if (user.role === 'CHAUFFEUR') {
      if (!user.chauffeur?.vehicule?.homeId) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas assigné à un véhicule avec un emplacement valide' },
          { status: 400 }
        );
      }
      finalHomeId = user.chauffeur.vehicule.homeId;
      console.log(`[API] Chauffeur détecté: ${user.nom} - Forçage du homeId à: ${finalHomeId}`);
    }
    if (!homes || homes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un entrepôt est requis' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Créer l'inventaire
      const inventaire = await tx.inventaire.create({
        data: {
          numero: `INV-${Date.now()}`,
          chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null,
          date: new Date(),
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          description: description || null,
          statut: 'EN_COURS',
        },
      });

      // Pour chaque entrepôt sélectionné
      for (const homeId of homes) {
        // Récupérer tous les produits avec stock dans cet entrepôt
        const stockLocations = await tx.stockLocation.findMany({
          where: { homeId },
          include: {
            product: true,
            home: true
          },
        });

        // Créer une ligne d'inventaire pour chaque produit
        for (const stock of stockLocations) {
          await tx.ligneInventaire.create({
            data: {
              inventaireId: inventaire.id,
              productId: stock.productId,
              homeId: homeId,
              quantiteTheorique: stock.quantite,
              quantitePhysique: 0,
              ecart: 0,
            },
          });
        }
      }

      // Retourner l'inventaire avec ses relations
      return await tx.inventaire.findUnique({
        where: { id: inventaire.id },
        include: {
          lignes: {
            include: {
              product: true,
              home: true
            },
          },
        },
      });
    });

    // Enrichir la réponse avec les homes
    const homesMap = new Map();
    result?.lignes.forEach(ligne => {
      if (ligne.home && !homesMap.has(ligne.home.id)) {
        homesMap.set(ligne.home.id, ligne.home);
      }
    });

    const responseData = {
      ...result,
      homes: Array.from(homesMap.values()),
      homeIds: Array.from(homesMap.keys()),
    };

    return NextResponse.json(responseData, { status: 201 });
  } catch (error) {
    console.error('Error creating inventaire:', error);
    return NextResponse.json({ error: 'Failed to create inventaire' }, { status: 500 });
  }
}

// GET un inventaire spécifique par ID
export async function GET_BY_ID(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const inventaire = await prisma.inventaire.findUnique({
      where: { id: params.id },
      include: {
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    if (!inventaire) {
      return NextResponse.json({ error: 'Inventaire non trouvé' }, { status: 404 });
    }

    // Enrichir avec les homes uniques
    const homesMap = new Map();
    inventaire.lignes.forEach(ligne => {
      if (ligne.home && !homesMap.has(ligne.home.id)) {
        homesMap.set(ligne.home.id, ligne.home);
      }
    });

    const inventaireAvecHomes = {
      ...inventaire,
      homes: Array.from(homesMap.values()),
      homeIds: Array.from(homesMap.keys()),
    };

    return NextResponse.json(inventaireAvecHomes);
  } catch (error) {
    console.error('Error fetching inventaire:', error);
    return NextResponse.json({ error: 'Failed to fetch inventaire' }, { status: 500 });
  }
}

// PUT mettre à jour un inventaire (compter les produits)
// export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
//   try {
//     const body = await req.json();
//     const { lignes } = body; // [{ id: string, quantitePhysique: number }]

//     const result = await prisma.$transaction(async (tx) => {
//       // Mettre à jour chaque ligne d'inventaire
//       for (const ligne of lignes) {
//         await tx.ligneInventaire.update({
//           where: { id: ligne.id },
//           data: {
//             quantitePhysique: ligne.quantitePhysique,
//             ecart: ligne.quantitePhysique - (await tx.ligneInventaire.findUnique({
//               where: { id: ligne.id }
//             })).quantiteTheorique,
//           },
//         });
//       }

//       // Vérifier si tous les produits ont été comptés
//       const toutesLesLignes = await tx.ligneInventaire.findMany({
//         where: { inventaireId: params.id },
//       });

//       const toutesComptees = toutesLesLignes.every(l => l.quantitePhysique > 0);

//       if (toutesComptees) {
//         await tx.inventaire.update({
//           where: { id: params.id },
//           data: { statut: 'VALIDE' },
//         });
//       }

//       return await tx.inventaire.findUnique({
//         where: { id: params.id },
//         include: {
//           lignes: {
//             include: {
//               product: true,
//               home: true,
//             },
//           },
//         },
//       });
//     });

//     return NextResponse.json(result);
//   } catch (error) {
//     console.error('Error updating inventaire:', error);
//     return NextResponse.json({ error: 'Failed to update inventaire' }, { status: 500 });
//   }
// }

// DELETE supprimer un inventaire
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await prisma.$transaction(async (tx) => {
      // Supprimer d'abord toutes les lignes d'inventaire
      await tx.ligneInventaire.deleteMany({
        where: { inventaireId: params.id },
      });

      // Puis supprimer l'inventaire
      await tx.inventaire.delete({
        where: { id: params.id },
      });
    });

    return NextResponse.json({ message: 'Inventaire supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting inventaire:', error);
    return NextResponse.json({ error: 'Failed to delete inventaire' }, { status: 500 });
  }
}