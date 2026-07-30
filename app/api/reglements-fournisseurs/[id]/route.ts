import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET reglement fournisseur by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reglement = await prisma.reglementFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
      },
    });

    if (!reglement) {
      return NextResponse.json(
        { error: 'Reglement fournisseur not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reglement);
  } catch (error) {
    console.error('Error fetching reglement fournisseur:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglement fournisseur' },
      { status: 500 }
    );
  }
}

// PUT update reglement fournisseur
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (body.echeance) {
      body.echeance = new Date(body.echeance);
    }

    const reglement = await prisma.reglementFournisseur.update({
      where: { id },
      data: body,
      include: {
        fournisseur: true,
      },
    });

    return NextResponse.json(reglement);
  } catch (error) {
    console.error('Error updating reglement fournisseur:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Reglement fournisseur not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update reglement fournisseur' },
      { status: 500 }
    );
  }
}

// DELETE reglement fournisseur
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.reglementFournisseur.delete({
      where: { id },
    });

    return NextResponse.json({
      message: 'Reglement fournisseur deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting reglement fournisseur:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Reglement fournisseur not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete reglement fournisseur' },
      { status: 500 }
    );
  }
}
