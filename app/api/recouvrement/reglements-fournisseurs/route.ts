import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const reglements = await prisma.reglementFournisseur.findMany({
      include: {
        fournisseur: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(reglements);
  } catch (error) {
    console.error('Error fetching reglements fournisseurs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglements fournisseurs' },
      { status: 500 }
    );
  }
}