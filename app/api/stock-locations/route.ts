import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Récupérer le stock d'un produit dans une station spécifique
// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const productId = searchParams.get('productId');
//     const homeId = searchParams.get('homeId');

//     if (!productId || !homeId) {
//       return NextResponse.json(
//         { error: 'productId et homeId sont requis' },
//         { status: 400 }
//       );
//     }

//     const stockLocation = await prisma.stockLocation.findUnique({
//       where: {
//         productId_homeId: {
//           productId: productId,
//           homeId: homeId,
//         },
//       },
//     });

//     return NextResponse.json({
//       quantite: stockLocation?.quantite || 0,
//       productId,
//       homeId,
//     });
//   } catch (error) {
//     console.error('Error fetching stock location:', error);
//     return NextResponse.json(
//       { error: 'Erreur serveur', quantite: 0 },
//       { status: 500 }
//     );
//   }
// }



export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const homeId = searchParams.get('homeId');

    if (!homeId) {
      return NextResponse.json(
        { error: 'homeId est requis' },
        { status: 400 }
      );
    }

    const stockLocations = await prisma.stockLocation.findMany({
      where: {
        homeId,
        quantite: { gt: 0 }
      },
      include: {
        product: true,
        home: true,
      },
      orderBy: {
        product: {
          designation: 'asc',
        },
      },
    });

    const data = stockLocations.map(sl => ({
      productId: sl.productId,
      productReference: sl.product.reference,
      productDesignation: sl.product.designation,
      stockLocationId: sl.id,
      quantite: sl.quantite,
      prixVente: sl.product.prixVente,
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error fetching stock locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock locations' },
      { status: 500 }
    );
  }
}

// POST - Créer ou mettre à jour un stock location
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, homeId, quantite } = body;

    if (!productId || !homeId || quantite === undefined) {
      return NextResponse.json(
        { error: 'productId, homeId et quantite sont requis' },
        { status: 400 }
      );
    }

    const stockLocation = await prisma.stockLocation.upsert({
      where: {
        productId_homeId: {
          productId,
          homeId,
        },
      },
      update: {
        quantite,
      },
      create: {
        productId,
        homeId,
        quantite,
      },
    });

    return NextResponse.json(stockLocation, { status: 201 });
  } catch (error) {
    console.error('Error creating/updating stock location:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Mettre à jour la quantité
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, homeId, quantite } = body;

    if (!productId || !homeId || quantite === undefined) {
      return NextResponse.json(
        { error: 'productId, homeId et quantite sont requis' },
        { status: 400 }
      );
    }

    const stockLocation = await prisma.stockLocation.update({
      where: {
        productId_homeId: {
          productId,
          homeId,
        },
      },
      data: {
        quantite,
      },
    });

    return NextResponse.json(stockLocation);
  } catch (error) {
    console.error('Error updating stock location:', error);
    return NextResponse.json(
      { error: 'Erreur serveur' },
      { status: 500 }
    );
  }
}