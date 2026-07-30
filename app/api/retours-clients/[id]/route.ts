import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET retour client by ID
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retour = await prisma.retourClient.findUnique({
      where: { id },
      include: {
        client: true,
        facture: true,
        lignes: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!retour) {
      return NextResponse.json(
        { error: 'Retour client not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(retour);
  } catch (error) {
    console.error('Error fetching retour client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retour client' },
      { status: 500 }
    );
  }
}

// DELETE retour client
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const result = await prisma.$transaction(async (tx) => {
      const retour = await tx.retourClient.findUnique({
        where: { id },
        include: { lignes: true, client: true },
      });

      if (!retour) {
        throw new Error('Retour client not found');
      }

      // Annuler les mouvements de stock
      for (const ligne of retour.lignes) {
        const product = await tx.product.findUnique({
          where: { id: ligne.productId },
        });
        
        if (product) {
          const stockLocation = await tx.stockLocation.findFirst({
            where: { productId: ligne.productId },
          });
          
          const homeId = stockLocation?.homeId || product.homeId;
          
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: ligne.productId,
                homeId: homeId,
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
      
      // Restaurer le solde du client
      await tx.client.update({
        where: { id: retour.clientId },
        data: {
          solde: { increment: retour.montant },
        },
      });
      
      // Supprimer le retour
      await tx.retourClient.delete({
        where: { id },
      });
    });

    return NextResponse.json({ message: 'Retour client deleted successfully' });
  } catch (error) {
    console.error('Error deleting retour client:', error);
    return NextResponse.json(
      { error: 'Failed to delete retour client' },
      { status: 500 }
    );
  }
}