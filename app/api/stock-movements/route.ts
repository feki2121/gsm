import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all stock movements with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const productId = searchParams.get('productId');

    // Construire le where clause
    const where: any = {};
    if (productId) {
      where.productId = productId;
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        skip,
        take: limit,
        where,
        include: {
          product: {
            include: {
              category: true,
              home: true,
            },
          },
        },
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return NextResponse.json({
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movements' },
      { status: 500 }
    );
  }
}

// POST create stock movement
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { productId, homeId, type, quantite, motif } = body;

    // Validation
    if (!productId || !type || !quantite || !motif) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, type, quantite, motif' },
        { status: 400 }
      );
    }

    if (quantite <= 0) {
      return NextResponse.json(
        { error: 'Quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Vérifier si le produit existe
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const sourceHomeId = homeId || product.homeId;

    const stockLocation = await prisma.stockLocation.findUnique({
      where: {
        productId_homeId: {
          productId,
          homeId: sourceHomeId,
        },
      },
    });

    // Vérifier le stock pour les sorties
    if (type === 'SORTIE' && (!stockLocation || stockLocation.quantite < quantite)) {
      return NextResponse.json(
        { error: `Stock insuffisant. Stock actuel: ${stockLocation?.quantite ?? 0}` },
        { status: 400 }
      );
    }

    // Utiliser une transaction pour créer le mouvement et mettre à jour le stock
    const result = await prisma.$transaction(async (tx) => {
      const movement = await tx.stockMovement.create({
        data: {
          productId,
          type,
          quantite,
          motif,
        },
        include: {
          product: {
            include: {
              category: true,
              home: true,
            },
          },
        },
      });

      if (type === 'ENTREE') {
        await tx.stockLocation.upsert({
          where: {
            productId_homeId: {
              productId,
              homeId: sourceHomeId,
            },
          },
          update: {
            quantite: {
              increment: quantite,
            },
          },
          create: {
            productId,
            homeId: sourceHomeId,
            quantite,
          },
        });
      } else if (type === 'SORTIE') {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId,
              homeId: sourceHomeId,
            },
          },
          data: {
            quantite: {
              decrement: quantite,
            },
          },
        });
      } else if (type === 'AJUSTEMENT') {
        await tx.stockLocation.upsert({
          where: {
            productId_homeId: {
              productId,
              homeId: sourceHomeId,
            },
          },
          update: {
            quantite,
          },
          create: {
            productId,
            homeId: sourceHomeId,
            quantite,
          },
        });
      }

      const totalStock = await tx.stockLocation.aggregate({
        where: { productId },
        _sum: { quantite: true },
      });

      await tx.product.update({
        where: { id: productId },
        data: {
          quantiteStock: totalStock._sum.quantite || 0,
        },
      });

      return movement;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to create stock movement' },
      { status: 500 }
    ); 
  }
}