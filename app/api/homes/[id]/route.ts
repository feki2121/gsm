import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET home by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const home = await prisma.home.findUnique({
      where: { id: params.id },
      include: {
        produits: {
          include: {
            category: true,
            stockLocations: true,
          },
        },
        stockLocations: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(home);
  } catch (error) {
    console.error('Error fetching home:', error);
    return NextResponse.json(
      { error: 'Failed to fetch home' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await req.json();
    const { nom, description } = body;

    if (!nom) {
      return NextResponse.json(
        { error: 'Home name is required' },
        { status: 400 }
      );
    }

    const existingHome = await prisma.home.findFirst({
      where: {
        nom,
        id: { not: id },
      },
    });

    if (existingHome) {
      return NextResponse.json(
        { error: 'Un emplacement avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    const home = await prisma.home.update({
      where: { id },
      data: {
        nom,
        description,
      },
      include: {
        produits: true,
        stockLocations: true,
      },
    });

    return NextResponse.json(home);
  } catch (error) {
    console.error('Error updating home:', error);

    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update home' },
      { status: 500 }
    );
  }
}

// DELETE home
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const home = await prisma.home.findUnique({
      where: { id: params.id },
      include: {
        produits: true,
        stockLocations: true,
      },
    });

    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }

    if (home.produits.length > 0 || home.stockLocations.length > 0) {
      return NextResponse.json(
        { error: 'Impossible de supprimer cet emplacement car il contient des produits ou du stock' },
        { status: 400 }
      );
    }

    await prisma.home.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Home deleted successfully' });
  } catch (error) {
    console.error('Error deleting home:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete home' },
      { status: 500 }
    );
  }
}