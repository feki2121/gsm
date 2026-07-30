import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Chercher si c'est un lot (plusieurs transferts avec le même préfixe)
    const allTransferts = await prisma.transfertStock.findMany({
      where: {
        OR: [
          { id },
          { numero: { startsWith: id } },
          { numero: { contains: id } }
        ]
      },
      include: {
        product: {
          include: { category: true }
        },
        sourceHome: true,
        destinationHome: true,
      },
      orderBy: { numero: 'asc' },
    });

    if (allTransferts.length === 0) {
      return NextResponse.json(
        { error: 'Transfert non trouvé' },
        { status: 404 }
      );
    }

    // Si un seul transfert, le retourner directement
    if (allTransferts.length === 1) {
      return NextResponse.json(allTransferts[0]);
    }

    // Grouper par lot (prendre le préfixe commun)
    const baseNumero = allTransferts[0].numero.split('-part-')[0];
    const groupedTransferts = allTransferts.filter(t => t.numero.startsWith(baseNumero));

    const result = {
      lotNumero: baseNumero,
      date: groupedTransferts[0].date,
      sourceHome: groupedTransferts[0].sourceHome,
      destinationHome: groupedTransferts[0].destinationHome,
      motif: groupedTransferts[0].motif,
      statut: groupedTransferts[0].statut,
      validePar: groupedTransferts[0].validePar,
      dateValidation: groupedTransferts[0].dateValidation,
      transferts: groupedTransferts,
      totalQuantite: groupedTransferts.reduce((sum, t) => sum + t.quantite, 0),
      totalValeur: groupedTransferts.reduce((sum, t) => sum + (t.quantite * (t.product?.prixVente || 0)), 0),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching transfert:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transfert' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action } = body; // 'ANNULER'

    const transfert = await prisma.transfertStock.findUnique({
      where: { id: params.id },
      include: {
        product: true,
        sourceHome: true,
        destinationHome: true,
      },
    });

    if (!transfert) {
      return NextResponse.json(
        { error: 'Transfert not found' },
        { status: 404 }
      );
    }

    if (transfert.statut !== 'VALIDE') {
      return NextResponse.json(
        { error: 'Only validated transferts can be cancelled' },
        { status: 400 }
      );
    }

    // Annuler le transfert - restaurer l'emplacement d'origine
    const result = await prisma.$transaction(async (tx) => {
      const updatedTransfert = await tx.transfertStock.update({
        where: { id: params.id },
        data: {
          statut: 'ANNULE',
        },
      });

      const updatedDestStock = await tx.stockLocation.update({
        where: {
          productId_homeId: {
            productId: transfert.productId,
            homeId: transfert.destinationHomeId,
          },
        },
        data: {
          quantite: {
            decrement: transfert.quantite,
          },
        },
      });

      await tx.stockLocation.upsert({
        where: {
          productId_homeId: {
            productId: transfert.productId,
            homeId: transfert.sourceHomeId,
          },
        },
        update: {
          quantite: {
            increment: transfert.quantite,
          },
        },
        create: {
          productId: transfert.productId,
          homeId: transfert.sourceHomeId,
          quantite: transfert.quantite,
        },
      });

      const totalStock = await tx.stockLocation.aggregate({
        where: { productId: transfert.productId },
        _sum: { quantite: true },
      });

      const newHomeId =
        transfert.product.homeId === transfert.destinationHomeId &&
        updatedDestStock.quantite === 0
          ? transfert.sourceHomeId
          : transfert.product.homeId;

      await tx.product.update({
        where: { id: transfert.productId },
        data: {
          quantiteStock: totalStock._sum.quantite || 0,
          homeId: newHomeId,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: transfert.productId,
          type: 'ENTREE',
          quantite: transfert.quantite,
          motif: `Annulation transfert depuis ${transfert.destinationHome.nom}`,
        },
      });

      await tx.stockMovement.create({
        data: {
          productId: transfert.productId,
          type: 'SORTIE',
          quantite: transfert.quantite,
          motif: `Annulation transfert vers ${transfert.sourceHome.nom}`,
        },
      });

      return updatedTransfert;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error cancelling transfert:', error);
    return NextResponse.json(
      { error: 'Failed to cancel transfert' },
      { status: 500 }
    );
  }
}

// DELETE transfert
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.transfertStock.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Transfert deleted successfully' });
  } catch (error) {
    console.error('Error deleting transfert:', error);
    if ((error as any).code === 'P2025') {
      return NextResponse.json(
        { error: 'Transfert not found' },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to delete transfert' },
      { status: 500 }
    );
  }
}