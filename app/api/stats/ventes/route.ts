import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const moisDebut = parseInt(searchParams.get('moisDebut') || '1');
    const moisFin = parseInt(searchParams.get('moisFin') || '12');

    // Récupérer toutes les factures de l'année
    const factures = await prisma.facture.findMany({
      where: {
        date: {
          gte: new Date(year, moisDebut - 1, 1),
          lt: new Date(year, moisFin, 0),
        },
      },
      select: {
        date: true,
        totalTTC: true,
        statut: true,
      },
    });

    // Récupérer tous les règlements clients de l'année (recouvrement)
    const reglements = await prisma.reglementClient.findMany({
      where: {
        date: {
          gte: new Date(year, moisDebut - 1, 1),
          lt: new Date(year, moisFin, 0),
        },
        statut: 'ENCAISSE',
      },
      select: {
        date: true,
        montant: true,
      },
    });

    // Regrouper les ventes par mois
    const ventesParMois: { [key: number]: number } = {};
    const recouvrementParMois: { [key: number]: number } = {};

    // Initialiser les mois
    for (let i = moisDebut; i <= moisFin; i++) {
      ventesParMois[i] = 0;
      recouvrementParMois[i] = 0;
    }

    // Aggréger les factures
    for (const facture of factures) {
      const mois = facture.date.getMonth() + 1;
      if (mois >= moisDebut && mois <= moisFin) {
        ventesParMois[mois] += facture.totalTTC;
      }
    }

    // Aggréger les règlements
    for (const reglement of reglements) {
      const mois = reglement.date.getMonth() + 1;
      if (mois >= moisDebut && mois <= moisFin) {
        recouvrementParMois[mois] += reglement.montant;
      }
    }

    // Formater les données pour le graphique
    const moisLabels: { [key: number]: string } = {
      1: 'Jan', 2: 'Fév', 3: 'Mar', 4: 'Avr', 5: 'Mai', 6: 'Juin',
      7: 'Juil', 8: 'Aoû', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Déc'
    };

    const data = [];
    for (let i = moisDebut; i <= moisFin; i++) {
      data.push({
        name: moisLabels[i],
        ventes: Math.round(ventesParMois[i]),
        recouvrement: Math.round(recouvrementParMois[i]),
      });
    }

    // Calculer les totaux
    const totalVentes = factures.reduce((sum, f) => sum + f.totalTTC, 0);
    const totalRecouvrement = reglements.reduce((sum, r) => sum + r.montant, 0);
    const tauxRecouvrement = totalVentes > 0 ? (totalRecouvrement / totalVentes) * 100 : 0;

    // Statistiques supplémentaires
    const stats = {
      totalVentes,
      totalRecouvrement,
      tauxRecouvrement: Math.round(tauxRecouvrement),
      nombreFactures: factures.length,
      nombreReglements: reglements.length,
      ventesMoisCourant: ventesParMois[new Date().getMonth() + 1] || 0,
      recouvrementMoisCourant: recouvrementParMois[new Date().getMonth() + 1] || 0,
    };

    return NextResponse.json({
      success: true,
      data,
      stats,
      period: {
        year,
        moisDebut,
        moisFin,
      },
    });
  } catch (error) {
    console.error('Error fetching ventes stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ventes stats' },
      { status: 500 }
    );
  }
}