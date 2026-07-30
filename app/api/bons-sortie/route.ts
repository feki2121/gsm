import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateNumeroBonSortie(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  
  const count = await prisma.bonSortie.count({
    where: {
      date: {
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      }
    }
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `${year}/${sequence}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url); 
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;
    const statut = searchParams.get('statut');

    const where: any = {};
    if (statut) where.statut = statut;

    const [bonsSortie, total] = await Promise.all([
      prisma.bonSortie.findMany({
        where,
        skip,
        take: limit,
        include: {
          client: true,
          lignes: {
            include: {
              product: true,
              home: {
                include: {
                  stockLocations: {
                    where: {
                      productId: { not: undefined }
                    }
                  }
                }
              },
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonSortie.count({ where }),
    ]);

    return NextResponse.json({
      data: bonsSortie,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Erreur GET bons-sortie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      clientId, 
      destinataire, 
      motif, 
      destination,
      nomConducteur,
      matriculeVehicule,
      numCIN,
      dateDebut,
      dateFin,
      adresseLivraison, 
      observation,
      lignes
    } = body;

    // Vérifier les stocks disponibles par station
    for (const ligne of lignes) {
      const stockLocation = await prisma.stockLocation.findUnique({
        where: {
          productId_homeId: {
            productId: ligne.productId,
            homeId: ligne.homeId,
          },
        },
      });

      if (!stockLocation || stockLocation.quantite < ligne.quantite) {
        const product = await prisma.product.findUnique({
          where: { id: ligne.productId }
        });
        return NextResponse.json(
          { 
            error: `Stock insuffisant pour ${product?.designation} dans la station. Disponible: ${stockLocation?.quantite || 0}, Demandé: ${ligne.quantite}` 
          },
          { status: 400 }
        );
      }
    }

    // Calculer les totaux
    let totalHT = 0;
    let totalTTC = 0;
    const lignesCalculees = lignes.map((ligne: any) => {
      const ligneHT = ligne.quantite * ligne.prixUnitaireHT;
      const ligneTTC = ligne.quantite * ligne.prixUnitaireTTC;
      totalHT += ligneHT;
      totalTTC += ligneTTC;
      return { 
        ...ligne, 
        totalHT: ligneHT, 
        totalTTC: ligneTTC,
        tva: 19
      };
    });

    const numero = await generateNumeroBonSortie();

    const bonSortie = await prisma.bonSortie.create({
      data: {
        numero,
        date: new Date(),
        destination,
        nomConducteur,
        matriculeVehicule,
        numCIN,
        dateDebut,
        dateFin,
        clientId: clientId || null,
        destinataire: clientId ? "" : destinataire,
        motif,
        adresseLivraison: adresseLivraison || null,
        observation: observation || null,
        totalHT,
        totalTTC,
        createdBy: 'system',
        statut: 'BROUILLON',
        lignes: {
          create: lignesCalculees.map((ligne: any) => ({
            productId: ligne.productId,
            homeId: ligne.homeId,
            quantite: ligne.quantite,
            prixUnitaireHT: ligne.prixUnitaireHT,
            prixUnitaireTTC: ligne.prixUnitaireTTC,
            remise: ligne.remise || 0,
            totalHT: ligne.totalHT,
            totalTTC: ligne.totalTTC,
            tva: 19
          })),
        },
      },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    return NextResponse.json(bonSortie, { status: 201 });
  } catch (error) {
    console.error('Erreur POST bon-sortie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}