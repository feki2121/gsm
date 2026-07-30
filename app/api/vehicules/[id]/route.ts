import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Récupérer un véhicule
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicule = await prisma.vehicule.findUnique({
      where: { id },
      include: {
        home: true,
        chauffeurs: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!vehicule) {
      return NextResponse.json(
        { error: 'Véhicule non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicule);
  } catch (error) {
    console.error('Error fetching vehicule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicule' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un véhicule
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { immatricule, nom, description, homeId } = body;

    const vehicule = await prisma.vehicule.update({
      where: { id },
      data: {
        immatricule,
        nom,
        description,
        homeId,
      },
      include: {
        home: true,
      },
    });

    return NextResponse.json(vehicule);
  } catch (error) {
    console.error('Error updating vehicule:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicule' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un véhicule
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier si des chauffeurs sont assignés
    const chauffeurs = await prisma.chauffeur.findMany({
      where: { vehiculeId: id },
    });

    if (chauffeurs.length > 0) {
      return NextResponse.json(
        { error: `Impossible de supprimer: ${chauffeurs.length} chauffeur(s) assigné(s) à ce véhicule` },
        { status: 400 }
      );
    }

    await prisma.vehicule.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicule:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicule' },
      { status: 500 }
    );
  }
}