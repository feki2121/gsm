import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all devis with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [devis, total] = await Promise.all([
      prisma.devis.findMany({
        skip,
        take: limit,
        include: {
          client: true,
          lignes: { include: { product: true } },
        },
      }),
      prisma.devis.count(),
    ]);

    return NextResponse.json({
      data: devis,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching devis:', error);
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    );
  }
}

// POST create devis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { numero, clientId, totalHT, totalTTC, validite, statut, lignes, remise, remiseType  } =
      body;

    if (!numero || !clientId || !totalHT || !totalTTC || !validite) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const devis = await prisma.devis.create({
      data: {
        numero,
        clientId,
        totalHT,
        totalTTC,
        validite: new Date(validite),
        statut: statut || 'EN_ATTENTE',
        remise: remise || 0,
        remiseType: remiseType || 'PERCENT',
        lignes: lignes
          ? {
              createMany: {
                data: lignes,
              },
            }
          : undefined,
      },
      include: {
        client: true,
        lignes: { include: { product: true } },
      },
    });

    return NextResponse.json(devis, { status: 201 });
  } catch (error) {
    console.error('Error creating devis:', error);
    return NextResponse.json(
      { error: 'Failed to create devis' },
      { status: 500 }
    );
  }
}
