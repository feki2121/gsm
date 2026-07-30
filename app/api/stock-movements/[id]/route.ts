import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET stock movement by ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const movement = await prisma.stockMovement.findUnique({
      where: { id: params.id },
      include: {
        product: {
          include: {
            category: true,
            home: true,
          },
        },
      },
    });

    if (!movement) {
      return NextResponse.json(
        { error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(movement);
  } catch (error) {
    console.error('Error fetching stock movement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock movement' },
      { status: 500 }
    );
  }
}

// DELETE stock movement (annuler un mouvement)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Récupérer le mouvement
    const movement = await prisma.stockMovement.findUnique({
      where: { id: params.id },
    });

    if (!movement) {
      return NextResponse.json(
        { error: 'Stock movement not found' },
        { status: 404 }
      );
    }

    // Récupérer le produit
    const product = await prisma.product.findUnique({
      where: { id: movement.productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const sourceHomeId = product.homeId;

    // Inverser l'effet du mouvement
    if (movement.type === 'AJUSTEMENT') {
      return NextResponse.json(
        { error: 'Cannot delete adjustment movements' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.stockMovement.delete({
        where: { id: params.id },
      });

      if (movement.type === 'ENTREE') {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: movement.productId,
              homeId: sourceHomeId,
            },
          },
          data: {
            quantite: {
              decrement: movement.quantite,
            },
          },
        });
      } else if (movement.type === 'SORTIE') {
        await tx.stockLocation.upsert({
          where: {
            productId_homeId: {
              productId: movement.productId,
              homeId: sourceHomeId,
            },
          },
          update: {
            quantite: {
              increment: movement.quantite,
            },
          },
          create: {
            productId: movement.productId,
            homeId: sourceHomeId,
            quantite: movement.quantite,
          },
        });
      }

      const totalStock = await tx.stockLocation.aggregate({
        where: { productId: movement.productId },
        _sum: { quantite: true },
      });

      await tx.product.update({
        where: { id: movement.productId },
        data: { quantiteStock: totalStock._sum.quantite || 0 },
      });
    });

    return NextResponse.json({ message: 'Stock movement deleted successfully' });
  } catch (error) {
    console.error('Error deleting stock movement:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Stock movement not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete stock movement' },
      { status: 500 }
    );
  }
}