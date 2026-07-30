import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get('date');

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // ============================================
    // 1. Récupérer UNIQUEMENT les bons de livraison du jour
    // ============================================
    const bonsLivraison = await prisma.bonLivraison.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        client: true,
        lignes: {
          include: {
            product: {
              include: {
                category: true,
              },
            },
            home: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });

    // ============================================
    // 2. Agréger les ventes UNIQUEMENT à partir des BL
    // ============================================
    const ventesParProduit = new Map();

    for (const bl of bonsLivraison) {
      for (const ligne of bl.lignes) {
        const key = ligne.productId;
        if (!ventesParProduit.has(key)) {
          ventesParProduit.set(key, {
            productId: ligne.productId,
            reference: ligne.product.reference,
            code: (ligne.product as any).code,
            designation: ligne.product.designation,
            category: ligne.product.category?.nom || 'Non catégorisé',
            prixVente: ligne.product.prixVente || 0,
            quantiteTotale: 0,
            totalHT: 0,
            totalTTC: 0,
            emplacements: new Map(),
            bonsLivraison: [],
          });
        }

        const entry = ventesParProduit.get(key);
        entry.quantiteTotale += ligne.quantite;

        // Utiliser le prix unitaire du BL ou celui du produit
        const prixUnitaire = ligne.prixVente || ligne.product.prixVente || 0;
        entry.totalHT += ligne.quantite * prixUnitaire;
        const tva = ligne.product.tva || 19;
        entry.totalTTC += ligne.quantite * prixUnitaire * (1 + tva / 100);
        const emplacementKey = ligne.homeId || 'default';
        if (!entry.emplacements.has(emplacementKey)) {
          entry.emplacements.set(emplacementKey, {
            homeId: ligne.homeId,
            homeNom: ligne.home?.nom || 'Emplacement inconnu',
            quantite: 0,
          });
        }
        entry.emplacements.get(emplacementKey).quantite += ligne.quantite;

        entry.bonsLivraison.push({
          id: bl.id,
          numero: bl.numero,
          client: bl.client?.nom,
          date: bl.date,
          statut: bl.statut,
        });
      }
    }

    // Convertir la Map en tableau pour la réponse
    const ventesListe = Array.from(ventesParProduit.values()).map(item => ({
      ...item,
      emplacements: Array.from(item.emplacements.values()),
    }));

    // Calculer les totaux généraux
    const totalVentes = {
      quantiteTotale: ventesListe.reduce((sum, v) => sum + v.quantiteTotale, 0),
      totalHT: ventesListe.reduce((sum, v) => sum + v.totalHT, 0),
      totalTTC: ventesListe.reduce((sum, v) => sum + v.totalTTC, 0),
      nombreBonsLivraison: bonsLivraison.length,
      nombreFactures: 0,
      nombreBonsSortie: 0,
    };

    return NextResponse.json({
      success: true,
      date: targetDate.toISOString(),
      dateFormatted: targetDate.toLocaleDateString('fr-TN'),
      totalVentes,
      ventes: ventesListe,
      details: {
        bonsLivraison: bonsLivraison.map(bl => ({
          id: bl.id,
          numero: bl.numero,
          client: bl.client?.nom,
          date: bl.date,
          statut: bl.statut,
          totalTTC: bl.lignes.reduce((sum, ligne) => {
            const prixUnitaire = (ligne as any).prixUnitaire ||
              (ligne as any).prixVente ||
              ligne.product.prixVente || 0;
            const tva = (ligne.product as any).tva || 19;
            return sum + (ligne.quantite * prixUnitaire * (1 + tva / 100));
          }, 0),
        })),
        factures: [],
        bonsSortie: [],
      },
    });
  } catch (error) {
    console.error('Error fetching inventaire journalier:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventaire journalier' },
      { status: 500 }
    );
  }
}