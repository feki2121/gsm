import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET stock locations for a product
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stockLocations = await prisma.stockLocation.findMany({
      where: { productId: params.id },
      include: {
        home: true,
      },
    });
    
    return NextResponse.json(stockLocations);
  } catch (error) {
    console.error('Error fetching stock locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock locations' },
      { status: 500 }
    );
  }
}