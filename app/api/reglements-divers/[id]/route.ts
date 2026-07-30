import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET reglement divers by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reglement = await prisma.reglementDivers.findUnique({
      where: { id: params.id },
    });

    if (!reglement) {
      return NextResponse.json(
        { error: 'Reglement divers not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(reglement);
  } catch (error) {
    console.error('Error fetching reglement divers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglement divers' },
      { status: 500 }
    );
  }
}

// PUT update reglement divers
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();

    const reglement = await prisma.reglementDivers.update({
      where: { id: params.id },
      data: body,
    });

    return NextResponse.json(reglement);
  } catch (error) {
    console.error('Error updating reglement divers:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Reglement divers not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update reglement divers' },
      { status: 500 }
    );
  }
}

// DELETE reglement divers
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.reglementDivers.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      message: 'Reglement divers deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting reglement divers:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Reglement divers not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete reglement divers' },
      { status: 500 }
    );
  }
}
