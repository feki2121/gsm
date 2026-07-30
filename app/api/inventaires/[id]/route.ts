import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET un inventaire par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Attendre la résolution de params (Next.js 16)
    const { id } = await params;
    
    console.log("Récupération inventaire ID:", id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID manquant' },
        { status: 400 }
      );
    }
    
    const inventaire = await prisma.inventaire.findUnique({
      where: { id },
      include: {
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    if (!inventaire) {
      return NextResponse.json(
        { error: 'Inventaire non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(inventaire);
  } catch (error) {
    console.error('Error fetching inventaire:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventaire', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT mettre à jour le statut d'un inventaire
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { statut } = body;

    const inventaire = await prisma.inventaire.update({
      where: { id },
      data: { statut },
    });

    return NextResponse.json(inventaire);
  } catch (error) {
    console.error('Error updating inventaire:', error);
    return NextResponse.json(
      { error: 'Failed to update inventaire' },
      { status: 500 }
    );
  }
}