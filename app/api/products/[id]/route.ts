import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        home: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { error: 'Failed to fetch product' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      reference,
      code,
      designation,
      categoryId,
      prixAchat,
      prixAchatHT,
      prixVente,
      prixVenteHT,
      tva,
      seuilAlerte,
      plafondRemise,
      imageUrl,
    } = body;

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    if (reference !== existingProduct.reference) {
      const duplicateReference = await prisma.product.findFirst({
        where: {
          reference,
          id: { not: id },
        },
      });

      if (duplicateReference) {
        return NextResponse.json(
          { error: 'Cette référence est déjà utilisée par un autre produit' },
          { status: 400 }
        );
      }
    }

    if (code && code !== existingProduct.code) {
      const duplicateCode = await prisma.product.findFirst({
        where: {
          code,
          id: { not: id },
        },
      });

      if (duplicateCode) {
        return NextResponse.json(
          { error: 'Ce code est déjà utilisé par un autre produit' },
          { status: 400 }
        );
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        reference,
        code: code || null,
        designation,
        prixAchat,
        prixAchatHT,
        prixVente,
        prixVenteHT,
        tva,
        seuilAlerte,
        plafondRemise,
        imageUrl: imageUrl || null,
        category: {
          connect: { id: categoryId }
        },
      },
      include: {
        category: true,
        home: true,
      },
    });

    return NextResponse.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update product' },
      { status: 500 }
    );
  }
}
 
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier si le produit existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Produit non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si le produit est utilisé dans des bons d'entrée
    const usedInBonsEntree = await prisma.ligneBonEntree.findFirst({
      where: { productId: id },
    });

    if (usedInBonsEntree) {
      return NextResponse.json(
        { error: 'Ce produit ne peut pas être supprimé car il est utilisé dans des bons d\'entrée' },
        { status: 400 }
      );
    }

    // Supprimer le produit
    await prisma.product.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Produit supprimé avec succès' });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { error: 'Failed to delete product' },
      { status: 500 }
    );
  }
}
