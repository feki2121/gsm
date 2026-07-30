import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const historique = await prisma.prixProduitHistorique.findMany({
      where: {
        productId: id,
      },
      orderBy: {
        dateApplication: 'desc',
      },
      include: {
        bonEntree: {
          select: {
            numero: true,
            date: true,
            fournisseur: {
              select: {
                nom: true,
              },
            },
          },
        },
      },
    });

    // Récupérer aussi le produit pour avoir les prix actuels
    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        reference: true,
        designation: true,
        prixAchat: true,
        prixAchatHT: true,
        prixVente: true,
        tva: true,
      },
    });

    return NextResponse.json({
      product,
      historique,
    });
  } catch (error) {
    console.error('Error fetching price history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch price history' },
      { status: 500 }
    );
  } 
} 