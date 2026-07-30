import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET mouvement caisse by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mouvement = await prisma.mouvementCaisse.findUnique({
      where: { id: params.id },
      include: {
        caisse: true,
      },
    });

    if (!mouvement) {
      return NextResponse.json(
        { error: 'Mouvement caisse not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(mouvement);
  } catch (error) {
    console.error('Error fetching mouvement caisse:', error);
    return NextResponse.json(
      { error: 'Failed to fetch mouvement caisse' },
      { status: 500 }
    );
  }
}

// PUT update mouvement caisse
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const mouvement = await prisma.mouvementCaisse.update({
      where: { id: params.id },
      data: body,
      include: {
        caisse: true,
      },
    });

    return NextResponse.json(mouvement);
  } catch (error) {
    console.error('Error updating mouvement caisse:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Mouvement caisse not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update mouvement caisse' },
      { status: 500 }
    );
  }
}

// DELETE mouvement caisse
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.mouvementCaisse.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Mouvement caisse deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting mouvement caisse:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Mouvement caisse not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete mouvement caisse' },
      { status: 500 }
    );
  }
}
