import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all products with pagination
// Modifiez la fonction GET pour inclure stockParType
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        include: {
          category: true,
          home: true,
          stockLocations: {
            include: {
              home: true,
            },
          },
          stockParType: true, // Ajoutez cette ligne
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count(),
    ]);

    return NextResponse.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST create product
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reference,
      designation,
      categoryId,
      homeId,
      prixAchat,
      prixAchatHT,
      prixVente,
      tva,
      quantiteStock,
      seuilAlerte,
    } = body;

    if (!reference || !designation || !categoryId || !homeId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          reference,
          designation,
          categoryId,
          homeId,
          prixAchat,
          prixAchatHT,
          prixVente,
          tva,
          quantiteStock: quantiteStock || 0,
          seuilAlerte: seuilAlerte || 5,
        },
      });

      if (quantiteStock && quantiteStock > 0) {
        await tx.stockLocation.create({
          data: {
            productId: createdProduct.id,
            homeId,
            quantite: quantiteStock,
          },
        });
      }

      return await tx.product.findUnique({
        where: { id: createdProduct.id },
        include: {
          category: true,
          home: true,
          stockLocations: {
            include: {
              home: true,
            },
          },
        },
      });
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: 'Failed to create product' },
      { status: 500 }
    );
  }
}
