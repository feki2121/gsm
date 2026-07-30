import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all fournisseurs with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;

    const [fournisseurs, total] = await Promise.all([
      prisma.fournisseur.findMany({
        skip,
        take: limit,
      }),
      prisma.fournisseur.count(),
    ]);

    return NextResponse.json({
      data: fournisseurs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching fournisseurs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fournisseurs' },
      { status: 500 }
    );
  }
}

// POST create fournisseur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, telephone, adresse, email, solde } = body;

    if (!nom || !telephone) {
      return NextResponse.json(
        { error: 'Fournisseur name and telephone are required' },
        { status: 400 }
      );
    }

    const fournisseur = await prisma.fournisseur.create({
      data: {
        nom,
        telephone,
        adresse,
        email,
        solde: solde || 0,
      },
    });

    return NextResponse.json(fournisseur, { status: 201 });
  } catch (error) {
    console.error('Error creating fournisseur:', error);
    return NextResponse.json(
      { error: 'Failed to create fournisseur' },
      { status: 500 }
    );
  }
}
