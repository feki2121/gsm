import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

// GET - Récupérer un chauffeur
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { id },
      include: {
        user: true,
        vehicule: true,
        bonLivraisons: {
          include: {
            client: true,
          },
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(chauffeur);
  } catch (error) {
    console.error('Error fetching chauffeur:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chauffeur' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un chauffeur
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { nom, telephone, vehiculeId, password } = body;

    const chauffeur = await prisma.chauffeur.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le chauffeur
    const updatedChauffeur = await prisma.$transaction(async (tx: any) => {
      // Mettre à jour l'utilisateur
      if (nom || password) {
        const userData: any = {};
        if (nom) userData.nom = nom;
        if (password) userData.password = await bcrypt.hash(password, 10);
        
        await tx.user.update({
          where: { id: chauffeur.userId },
          data: userData,
        });
      }

      // Mettre à jour le chauffeur
      const updated = await tx.chauffeur.update({
        where: { id },
        data: {
          nom: nom || undefined,
          telephone: telephone || undefined,
          vehiculeId: vehiculeId || null,
        },
        include: {
          user: true,
          vehicule: true,
        },
      });

      return updated;
    });

    return NextResponse.json(updatedChauffeur);
  } catch (error) {
    console.error('Error updating chauffeur:', error);
    return NextResponse.json(
      { error: 'Failed to update chauffeur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un chauffeur
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!chauffeur) {
      return NextResponse.json(
        { error: 'Chauffeur non trouvé' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      // Supprimer le chauffeur
      await tx.chauffeur.delete({ where: { id } });
      // Supprimer l'utilisateur associé
      await tx.user.delete({ where: { id: chauffeur.userId } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting chauffeur:', error);
    return NextResponse.json(
      { error: 'Failed to delete chauffeur' },
      { status: 500 }
    );
  }
}