import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all homes with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [homes, total] = await Promise.all([
      prisma.home.findMany({
        skip,
        take: limit,
        include: {
          produits: {
            include: {
              category: true,
              stockLocations: {
                include: {
                  home: true,
                },
              },
            },
          },
          stockLocations: {
            include: {
              product: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.home.count(),
    ]);

    return NextResponse.json({
      data: homes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching homes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch homes' },
      { status: 500 }
    );
  }
}

// POST create home
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, description } = body;

    if (!nom) {
      return NextResponse.json(
        { error: 'Home name is required' },
        { status: 400 }
      );
    }

    const existingHome = await prisma.home.findUnique({
      where: { nom },
    });

    if (existingHome) {
      return NextResponse.json(
        { error: 'Un emplacement avec ce nom existe déjà' },
        { status: 400 }
      );
    }

    const home = await prisma.home.create({
      data: {
        nom,
        description,
      },
      include: {
        produits: true,
        stockLocations: true,
      },
    });

    return NextResponse.json(home, { status: 201 });
  } catch (error) {
    console.error('Error creating home:', error);
    return NextResponse.json(
      { error: 'Failed to create home' },
      { status: 500 }
    );
  }
}