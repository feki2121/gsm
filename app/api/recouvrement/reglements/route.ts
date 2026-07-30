import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const reglements = await prisma.reglementClient.findMany({
      include: {
        client: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reglements);
  } catch (error) {
    console.error('Error fetching reglements:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglements' },
      { status: 500 }
    );
  }
}