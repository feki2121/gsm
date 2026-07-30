import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all traites (reglements clients de type TRAITE)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statut = searchParams.get('statut');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');

    const where: any = {
      typeReglement: {
        in: ['TRAITE_DOMICILE', 'TRAITE_BANCAIRE'],
      },
    };

    if (statut) {
      where.statut = statut;
    }

    if (dateDebut || dateFin) {
      where.echeance = {};
      if (dateDebut) where.echeance.gte = new Date(dateDebut);
      if (dateFin) where.echeance.lte = new Date(dateFin);
    }

    const traites = await prisma.reglementClient.findMany({
      where,
      include: {
        client: true,
        factures: {
          include: {
            facture: true,
          },
        },
      },
      orderBy: { echeance: 'asc' },
    });

    return NextResponse.json(traites);
  } catch (error) {
    console.error('Error fetching traites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch traites' },
      { status: 500 }
    );
  }
}