import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET devis by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const devis = await prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!devis) {
      return NextResponse.json(
        { error: 'Devis not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(devis);
  } catch (error) {
    console.error('Error fetching devis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    );
  }
}

// PUT update devis
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      clientId, 
      totalHT, 
      totalTTC, 
      validite, 
      statut, 
      lignes,
      remise,
      remiseType
    } = body;

    // Mettre à jour le devis
    const devis = await prisma.devis.update({
      where: { id },
      data: {
        clientId,
        totalHT,
        totalTTC,
        validite: new Date(validite),
        statut,
        remise: remise || 0,
        remiseType: remiseType || "PERCENT",
      },
    });

    // Supprimer les anciennes lignes
    await prisma.ligneDevis.deleteMany({
      where: { devisId: id },
    });

    // Créer les nouvelles lignes
    if (lignes && lignes.length > 0) {
      await prisma.ligneDevis.createMany({
        data: lignes.map((ligne: any) => ({
          devisId: id,
          productId: ligne.productId,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          tva: ligne.tva || 19,
        })),
      });
    }

    // Récupérer le devis mis à jour
    const updatedDevis = await prisma.devis.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(updatedDevis);
  } catch (error) {
    console.error('Error updating devis:', error);
    return NextResponse.json(
      { error: 'Failed to update devis' },
      { status: 500 }
    );
  }
}

// DELETE devis
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.$transaction(async (tx) => {
      // Supprimer d'abord les lignes du devis
      await tx.ligneDevis.deleteMany({
        where: { devisId: id },
      });
      
      // Puis supprimer le devis
      await tx.devis.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting devis:', error);
    return NextResponse.json(
      { error: 'Failed to delete devis' },
      { status: 500 }
    );
  }
}