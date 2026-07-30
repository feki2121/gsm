import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const facture = await prisma.factureFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    if (!facture) {
      return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
    }

    return NextResponse.json(facture);
  } catch (error) {
    console.error('Error fetching facture:', error);
    return NextResponse.json({ error: 'Failed to fetch facture' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const facture = await prisma.factureFournisseur.update({
      where: { id },
      data: body,
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    return NextResponse.json(facture);
  } catch (error) {
    console.error('Error updating facture:', error);
    return NextResponse.json({ error: 'Failed to update facture' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.$transaction(async (tx) => {
      // Récupérer les lignes pour annuler le stock
      const facture = await tx.factureFournisseur.findUnique({
        where: { id },
        include: { lignes: true },
      });

      if (facture && facture.lignes) {
        for (const ligne of facture.lignes) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: ligne.productId,
                homeId: ligne.homeId,
              },
            },
            data: {
              quantite: { decrement: ligne.quantite },
            },
          });

          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              quantiteStock: { decrement: ligne.quantite },
            },
          });
        }
      }

      await tx.factureFournisseur.delete({ where: { id } });
    });

    return NextResponse.json({ message: 'Facture supprimée avec succès' });
  } catch (error) {
    console.error('Error deleting facture:', error);
    return NextResponse.json({ error: 'Failed to delete facture' }, { status: 500 });
  }
}