import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Récupérer les produits en alerte (stock <= seuilAlerte)
    const produitsAlerte = await prisma.product.findMany({
      where: {
        quantiteStock: {
          lte: prisma.product.fields.seuilAlerte,
        },
      },
      include: {
        category: true,
        home: true,
      },
      orderBy: {
        quantiteStock: 'asc',
      },
      take: 10,
    });

    // Récupérer les traites proches (échéance dans les 7 jours)
    const today = new Date();
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    const traitesProches = await prisma.reglementClient.findMany({
      where: {
        typeReglement: {
          in: ['TRAITE_BANCAIRE', 'TRAITE_DOMICILE'],
        },
        statut: 'EN_ATTENTE',
        echeance: {
          gte: today,
          lte: in7Days,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        echeance: 'asc',
      },
      take: 10,
    });

    // Récupérer les factures impayées depuis plus de 30 jours
    const ilYA30Jours = new Date();
    ilYA30Jours.setDate(today.getDate() - 30);

    const facturesImpayees = await prisma.facture.findMany({
      where: {
        statut: 'IMPAYEE',
        date: {
          lte: ilYA30Jours,
        },
      },
      include: {
        client: true,
      },
      orderBy: {
        date: 'asc',
      },
      take: 5,
    });

    // Récupérer les stocks par emplacement pour les produits en alerte
    const produitsAvecStock = await Promise.all(
      produitsAlerte.map(async (produit) => {
        const stockLocations = await prisma.stockLocation.findMany({
          where: { productId: produit.id },
          include: { home: true },
        });
        return {
          ...produit,
          stockLocations,
        };
      })
    );

    // Calculer le nombre total d'alertes
    const stats = {
      totalProduitsAlerte: produitsAlerte.length,
      totalTraitesProches: traitesProches.length,
      totalFacturesImpayees: facturesImpayees.length,
      produitsRupture: produitsAlerte.filter(p => p.quantiteStock === 0).length,
      produitsStockBas: produitsAlerte.filter(p => p.quantiteStock > 0).length,
    };

    return NextResponse.json({
      success: true,
      stats,
      produitsAlerte: produitsAvecStock.map(p => ({
        id: p.id,
        reference: p.reference,
        designation: p.designation,
        quantiteStock: p.quantiteStock,
        seuilAlerte: p.seuilAlerte,
        prixVente: p.prixVente,
        category: p.category?.nom,
        home: p.home?.nom,
        stockLocations: p.stockLocations.map(sl => ({
          homeNom: sl.home.nom,
          quantite: sl.quantite,
        })),
      })),
      traitesProches: traitesProches.map(t => ({
        id: t.id,
        reference: t.reference,
        montant: t.montant,
        echeance: t.echeance,
        client: t.client,
        typeReglement: t.typeReglement,
      })),
      facturesImpayees: facturesImpayees.map(f => ({
        id: f.id,
        numero: f.numero,
        totalTTC: f.totalTTC,
        date: f.date,
        client: f.client,
      })),
    });
  } catch (error) {
    console.error('Error fetching dashboard alertes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard alertes' },
      { status: 500 }
    );
  }
}