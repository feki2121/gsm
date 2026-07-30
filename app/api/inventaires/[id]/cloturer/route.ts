import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const inventaireId = params.id;

    const inventaire = await prisma.inventaire.update({
      where: { id: inventaireId },
      data: {
        statut: 'CLOTURE',
        dateValidation: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Inventaire clôturé",
      inventaire,
    });
  } catch (error) {
    console.error('Error closing inventaire:', error);
    return NextResponse.json(
      { error: 'Failed to close inventaire' },
      { status: 500 }
    );
  }
}