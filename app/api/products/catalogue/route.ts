// app/api/products/catalogue/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      where: {
        stockLocations: {
          some: {
            quantite: {
              gt: 0,
            },
          },
        },
      },
      include: {
        category: true,
        stockLocations: {
          include: {
            home: true,
          },
          where: {
            quantite: {
              gt: 0,
            },
          },
        },
        stockParType: true,
      },
      orderBy: {
        designation: 'asc',
      },
    });

    const catalogueData = products.map(product => {
      const totalStockPhysique = product.stockLocations?.reduce(
        (sum, loc) => sum + loc.quantite, 
        0
      ) || 0;

      const stockParTypeObj: Record<string, number> = {};
      if (product.stockParType) {
        product.stockParType.forEach((item: any) => {
          stockParTypeObj[item.typeBE] = item.quantite;
        });
      }

      return {
        ...product,
        stockParType: stockParTypeObj,
        quantiteStock: totalStockPhysique,
        emplacements: product.stockLocations.map(loc => ({
          nom: loc.home?.nom || 'Inconnu',
          quantite: loc.quantite,
        })),
      };
    });

    return NextResponse.json({
      data: catalogueData,
      total: catalogueData.length,
    });
  } catch (error) {
    console.error('Error generating catalogue:', error);
    return NextResponse.json(
      { error: 'Failed to generate catalogue' },
      { status: 500 }
    );
  }
}