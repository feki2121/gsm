import { prisma } from '@/lib/prisma';
import { Product } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Define proper types
interface StockLocation {
  homeId: string;
  quantite: number;
  home?: {
    nom: string | null;
  } | null;
}

interface ProductWithStock {
  id: string;
  reference: string;
  designation: string;
  prixAchat: number | null;
  prixVente: number | null;
  seuilAlerte: number;
  categoryId: string | null;
  category?: {
    nom: string | null;
  } | null;
  stockLocations: StockLocation[];
  stockReel?: number;
  stockLocationsFiltered?: StockLocation[];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const homeId = searchParams.get('homeId');
    const categoryId = searchParams.get('categoryId');
    const seuilPersonnalise = searchParams.get('seuil');

    const where: Record<string, unknown> = {};

    if (categoryId && categoryId !== 'all') {
      where.categoryId = categoryId;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        stockLocations: {
          include: {
            home: true,
          },
        },
      },
    });

    const productsWithRealStock = products.map((product: ProductWithStock) => {
      const stockLocationsFiltered =
        homeId && homeId !== 'all'
          ? product.stockLocations?.filter((l) => l.homeId === homeId)
          : product.stockLocations;

      const stockReel = stockLocationsFiltered?.reduce(
        (sum, loc) => sum + (loc.quantite || 0),
        0
      );

      return {
        ...product,
        stockReel,
        stockLocationsFiltered,
      };
    });

    const alertes = productsWithRealStock.filter((product: ProductWithStock) => {
      const seuil = seuilPersonnalise
        ? parseInt(seuilPersonnalise, 10)
        : product.seuilAlerte;

      return product.stockReel ? product.stockReel <= seuil : false;
    });

    const rupture = alertes.filter((p : ProductWithStock) => p.stockReel === 0);
    const stockBas = alertes.filter(
      (p: ProductWithStock) => p.stockReel && p.stockReel > 0 && p.stockReel <= p.seuilAlerte
    );

    const statsParCategorie = alertes.reduce((acc: Record<string, unknown>, product: ProductWithStock) => {
      const catName = product.category?.nom || 'Sans catégorie';

      if (!acc[catName]) {
        acc[catName] = {
          categorie: catName,
          count: 0,
          produits: [],
        };
      }

      const categoryAcc = acc[catName] as {
        count: number;
        produits: Array<{
          id: string;
          reference: string;
          designation: string;
          stockReel: number;
          seuilAlerte: number;
        }>;
      };

      categoryAcc.count++;
      categoryAcc.produits.push({
        id: product.id,
        reference: product.reference,
        designation: product.designation,
        stockReel: product.stockReel || 0,
        seuilAlerte: product.seuilAlerte,
      });

      return acc;
    }, {});

    const statsParEmplacement = alertes.reduce((acc: Record<string, unknown>, product: ProductWithStock) => {
      const locations = product.stockLocationsFiltered ?? [];

      if (locations.length > 0) {
        locations.forEach((location) => {
          const homeName = location.home?.nom || 'Sans emplacement';

          if (!acc[homeName]) {
            acc[homeName] = {
              emplacement: homeName,
              count: 0,
              produits: [],
            };
          }

          const locationAcc = acc[homeName] as {
            count: number;
            produits: Array<{
              id: string;
              reference: string;
              designation: string;
              stockReel: number;
              seuilAlerte: number;
            }>;
          };

          locationAcc.count++;
          locationAcc.produits.push({
            id: product.id,
            reference: product.reference,
            designation: product.designation,
            stockReel: location.quantite || 0,
            seuilAlerte: product.seuilAlerte,
          });
        });
      }

      return acc;
    }, {});

    const valeurStockTotal = productsWithRealStock.reduce(
      (sum: number, p: ProductWithStock) => sum + (p.prixAchat || 0) * (p.stockReel || 0),
      0
    );

    const valeurStockAlerte = alertes.reduce(
      (sum: number, p: ProductWithStock) => sum + (p.prixAchat || 0) * (p.stockReel || 0),
      0
    );

    const alertesFormatted = alertes.map((p: ProductWithStock) => ({
      id: p.id,
      reference: p.reference,
      designation: p.designation,
      category: p.category?.nom || null,
      home: p.stockLocationsFiltered?.[0]?.home?.nom || null,
      prixVente: p.prixVente,
      prixAchat: p.prixAchat,
      quantiteStock: p.stockReel,
      seuilAlerte: p.seuilAlerte,
      stockLocations: (p.stockLocationsFiltered || []).map((sl) => ({
        homeNom: sl.home?.nom || null,
        quantite: sl.quantite,
      })),
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalProduits: productsWithRealStock.length,
        totalAlertes: alertes.length,
        rupture: rupture.length,
        stockBas: stockBas.length,
        valeurStockTotal,
        valeurStockAlerte,
      },
      statsParCategorie: Object.values(statsParCategorie),
      statsParEmplacement: Object.values(statsParEmplacement),
      alertes: alertesFormatted,
    });

  } catch (error) {
    console.error('Error fetching alertes stock:', error);

    return NextResponse.json(
      { error: 'Failed to fetch alertes stock' },
      { status: 500 }
    );
  }
}