import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Récupérer tous les véhicules
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [vehicules, total] = await Promise.all([
      prisma.vehicule.findMany({
        skip,
        take: limit,
        include: {
          home: true,
          chauffeurs: {
            include: {
              user: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicule.count(),
    ]);

    return NextResponse.json({
      data: vehicules,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching vehicules:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicules' },
      { status: 500 }
    );
  }
}

// POST - Créer un véhicule
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { immatricule, nom, description, homeId } = body;

    if (!immatricule || !nom || !homeId) {
      return NextResponse.json(
        { error: 'Immatricule, nom et entrepôt sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'immatricule existe déjà
    const existingVehicule = await prisma.vehicule.findUnique({
      where: { immatricule },
    });

    if (existingVehicule) {
      return NextResponse.json(
        { error: 'Cette immatricule est déjà utilisée' },
        { status: 400 }
      );
    }

    const vehicule = await prisma.vehicule.create({
      data: {
        immatricule,
        nom,
        description,
        homeId,
      },
      include: {
        home: true,
      },
    });

    return NextResponse.json(vehicule, { status: 201 });
  } catch (error) {
    console.error('Error creating vehicule:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicule' },
      { status: 500 }
    );
  }
}