// app/api/bons-entree/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fournisseurId = searchParams.get('fournisseurId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    const where: any = {};
    
    if (fournisseurId && fournisseurId !== '') {
      where.fournisseurId = fournisseurId;
    }
    
    where.statut = {
      not: 'ANNULE'
    };

    const [bonsEntree, total] = await Promise.all([
      prisma.bonEntree.findMany({
        where,
        skip,
        take: limit,
        include: {
          fournisseur: true,
          lignes: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonEntree.count({ where }),
    ]);

    return NextResponse.json({
      data: bonsEntree,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bons entree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bons entree' },
      { status: 500 }
    );
  }
}