// app/api/bons-livraison/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get('clientId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Construire la condition where
    const where: any = {};
    
    // Filtrer par clientId si fourni
    if (clientId && clientId !== '') {
      where.clientId = clientId;
    }

    // Ne prendre que les BL actifs (non annulés)
    where.statut = {
      not: 'ANNULE'
    };
    
    // Optionnel : exclure les BL avec montantRestant <= 0 (déjà entièrement payés)
    // where.montantRestant = {
    //   gt: 0
    // };

    const [bonsLivraison, total] = await Promise.all([
      prisma.bonLivraison.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          lignes: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonLivraison.count({ where }),
    ]);

    return NextResponse.json({
      data: bonsLivraison,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bons livraison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bons livraison' },
      { status: 500 }
    );
  }
}