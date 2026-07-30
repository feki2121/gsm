import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Déballer params avec await (Next.js 15)
    const { id } = await params;
    
    const { searchParams } = new URL(req.url);
    const typeBE = searchParams.get('type');

    const where: any = { productId: id };
    if (typeBE) where.typeBE = typeBE;

    const stockParType = await prisma.stockParType.findMany({
      where,
      include: {
        product: true,
      },
    });

    // Calculer le stock total
    const stockTotal = await prisma.product.findUnique({
      where: { id },
      select: { quantiteStock: true },
    });

    const result = {
      total: stockTotal?.quantiteStock || 0,
      parType: stockParType.reduce((acc, curr) => {
        acc[curr.typeBE] = curr.quantite;
        return acc;
      }, {} as Record<string, number>),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching stock by type:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock by type' },
      { status: 500 }
    );
  }
}