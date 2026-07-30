import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { produits } = await req.json();

    if (!produits || produits.length === 0) {
      return NextResponse.json(
        { error: 'Aucun produit à vérifier' },
        { status: 400 }
      );
    }

    const verification = await Promise.all(
      produits.map(async (produit: { productId: string; quantite: number }) => {
        // Validation des données
        if (!produit.productId || produit.quantite <= 0) {
          return {
            productId: produit.productId,
            error: 'Données de produit invalides',
            estDisponible: false,
          };
        }

        // Récupérer le produit en parallèle
        const [product, stockFAC, autresStocks] = await Promise.all([
          prisma.product.findUnique({
            where: { id: produit.productId },
            select: { 
              reference: true, 
              designation: true, 
              quantiteStock: true 
            },
          }),
          prisma.stockParType.findUnique({
            where: {
              productId_typeBE: {
                productId: produit.productId,
                typeBE: 'FAC',
              },
            },
          }),
          prisma.stockParType.findMany({
            where: {
              productId: produit.productId,
              typeBE: { not: 'FAC' },
            },
          }),
        ]);

        if (!product) {
          return {
            productId: produit.productId,
            error: 'Produit non trouvé',
            estDisponible: false,
          };
        }

        const quantiteFAC = stockFAC?.quantite || 0;
        const estDisponible = quantiteFAC >= produit.quantite;
        const quantiteManquante = estDisponible ? 0 : produit.quantite - quantiteFAC;

        return {
          productId: produit.productId,
          reference: product.reference,
          designation: product.designation,
          quantiteDemandee: produit.quantite,
          stockFACDisponible: quantiteFAC,
          stockTotal: product.quantiteStock,
          estDisponible,
          quantiteManquante,
          autresStocks: autresStocks.map(s => ({
            type: s.typeBE,
            quantite: s.quantite,
          })),
        };
      })
    );

    // Filtrer les erreurs
    const erreurs = verification.filter(v => v.error);
    if (erreurs.length > 0) {
      return NextResponse.json(
        { error: 'Erreur lors de la vérification', details: erreurs },
        { status: 400 }
      );
    }

    const produitsIndisponibles = verification.filter(v => !v.estDisponible);
    const totalIndisponible = produitsIndisponibles.length;
    
    // Construire le message
    let message = "";
    let detailsMessage = "";
    
    if (totalIndisponible === 0) {
      message = "✓ Stock FAC suffisant pour tous les produits";
      detailsMessage = "Tous les produits ont un stock suffisant provenant des factures fournisseurs.";
    } else {
      message = `⛔ Stock FAC insuffisant pour ${totalIndisponible} produit(s)`;
      detailsMessage = produitsIndisponibles.map(p => 
        `${p.designation}: ${p.stockFACDisponible} disponible(s) / ${p.quantiteDemandee} demandé(s) (manque ${p.quantiteManquante})`
      ).join('; ');
    }

    return NextResponse.json({
      success: totalIndisponible === 0,
      verification,
      totalIndisponible,
      produitsIndisponibles,
      message,
      detailsMessage,
    });
  } catch (error) {
    console.error('Error verifying stock:', error);
    return NextResponse.json(
      { 
        error: 'Erreur lors de la vérification du stock',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}