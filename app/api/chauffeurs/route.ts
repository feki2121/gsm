import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [chauffeurs, total] = await Promise.all([
      prisma.chauffeur.findMany({
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              nom: true,
              role: true,
            },
          },
          vehicule: {
            select: {
              id: true,
              immatricule: true,
              nom: true,
              description: true,
              homeId: true,
            }
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.chauffeur.count(),
    ]);

    // Transformer les données pour correspondre au format attendu
    const formattedChauffeurs = chauffeurs.map(chauffeur => ({
      id: chauffeur.id,
      userId: chauffeur.userId,
      nom: chauffeur.nom,
      telephone: chauffeur.telephone,
      cin: chauffeur.cin,
      createdAt: chauffeur.createdAt,
      updatedAt: chauffeur.updatedAt,
      user: chauffeur.user,
      vehicule: chauffeur.vehicule ? {
        id: chauffeur.vehicule.id,
        matricule: chauffeur.vehicule.immatricule,
        nom: chauffeur.vehicule.nom,
        description: chauffeur.vehicule.description,
        homeId: chauffeur.vehicule.homeId,
      } : null,
    }));

    return NextResponse.json({
      success: true,
      data: formattedChauffeurs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching chauffeurs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch chauffeurs' 
      },
      { status: 500 }
    );
  }
}

// POST - Créer un chauffeur
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, nom, telephone, password, vehiculeId } = body;

    if (!email || !nom || !telephone || !password) {
      return NextResponse.json(
        { error: 'Email, nom, téléphone et mot de passe sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const chauffeur = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          nom,
          role: 'CHAUFFEUR',
        },
      });

      const chauffeur = await tx.chauffeur.create({
        data: {
          userId: user.id,
          nom,
          telephone,
          vehiculeId: vehiculeId || null,
        },
        include: {
          user: true,
          vehicule: true,
        },
      });

      return chauffeur;
    });

    return NextResponse.json(chauffeur, { status: 201 });
  } catch (error) {
    console.error('Error creating chauffeur:', error);
    return NextResponse.json(
      { error: 'Failed to create chauffeur' },
      { status: 500 }
    );
  }
}