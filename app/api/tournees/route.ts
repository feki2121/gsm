import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Calculer la distance entre deux points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// GET - Récupérer les tournées
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const chauffeurIdParam = searchParams.get('chauffeurId');
    const statut = searchParams.get('statut');
    const ville = searchParams.get('ville');

    let where: any = {};

    if (chauffeurIdParam) {
      where.chauffeurId = chauffeurIdParam;
    } else if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      where.chauffeurId = user.chauffeur.id;
    }

    if (statut) where.statut = statut;
    if (ville) where.ville = ville;

    const tournees = await prisma.tournee.findMany({
      where,
      include: {
        chauffeur: {
          include: {
            user: true
          }
        },
        missions: {
          include: {
            client: true,
            adresse: true,
          },
          orderBy: { ordre: 'asc' },
        },
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(tournees);
  } catch (error) {
    console.error('Error fetching tournees:', error);
    return NextResponse.json([]);
  }
}

// POST - Créer une nouvelle tournée
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { ville, positionChauffeur } = body;

    if (!ville) {
      return NextResponse.json({ error: 'Ville requise' }, { status: 400 });
    }

    // Déterminer le chauffeurId
    let chauffeurId: string | null = null;

    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      // Chauffeur : utilise son propre ID
      chauffeurId = user.chauffeur.id;
    }
    // Pour ADMIN, chauffeurId reste null

    // Récupérer tous les clients avec adresses dans la ville
    const clientsAvecAdresses = await prisma.client.findMany({
      where: {
        addresses: {
          some: {
            ville: ville,
            latitude: { not: null },
            longitude: { not: null },
          },
        },
      },
      include: {
        addresses: {
          where: {
            ville: ville,
            latitude: { not: null },
            longitude: { not: null },
          },
          orderBy: {
            estPrincipale: 'desc',
          },
          // take: 1,
        },
      },
    });

    if (clientsAvecAdresses.length === 0) {
      return NextResponse.json({ error: 'Aucun client trouvé dans cette ville' }, { status: 400 });
    }

    // Calculer les distances et trier
    const clientsAvecDistance = clientsAvecAdresses.map(client => {
      const adresse = client.addresses[0];
      let distance = Infinity;
      if (positionChauffeur?.lat && positionChauffeur?.lng && adresse?.latitude && adresse?.longitude) {
        distance = calculateDistance(
          positionChauffeur.lat,
          positionChauffeur.lng,
          adresse.latitude,
          adresse.longitude
        );
      }
      return {
        client,
        adresse,
        distance,
      };
    });

    // Trier par distance
    clientsAvecDistance.sort((a, b) => a.distance - b.distance);

    // Générer le numéro de tournée
    const count = await prisma.tournee.count();
    const numero = `TOUR-${(count + 1).toString().padStart(4, '0')}`;

    // Créer la tournée et les missions (chauffeurId peut être null)
    const tournee = await prisma.tournee.create({
      data: {
        numero,
        chauffeurId, // Peut être null pour ADMIN
        ville,
        missions: {
          create: clientsAvecDistance.map((item, index) => ({
            clientId: item.client.id,
            adresseId: item.adresse.id,
            ordre: index + 1,
            latitude: item.adresse.latitude,
            longitude: item.adresse.longitude,
            distance: item.distance === Infinity ? null : item.distance,
          })),
        },
      },
      include: {
        chauffeur: {
          include: {
            user: true
          }
        },
        missions: {
          include: {
            client: true,
            adresse: true,
          },
        },
      },
    });

    return NextResponse.json(tournee, { status: 201 });
  } catch (error) {
    console.error('Error creating tournee:', error);
    return NextResponse.json({ error: 'Failed to create tournee' }, { status: 500 });
  }
}

// PATCH - Mettre à jour une mission
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await req.json();
    const { missionId, action, commentaire, statut, actionHistory } = body;

    const validActions = ['VISITE', 'VALIDATION', 'A_REVISITER'];
    if (action && !validActions.includes(action)) {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 });
    }

    const validStatuts = ['EN_ATTENTE', 'REALISEE', 'REPORTEE', 'ANNULEE'];
    if (statut && !validStatuts.includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Vérifier que la mission existe et appartient au chauffeur
    const existingMission = await prisma.mission.findUnique({
      where: { id: missionId },
      include: { tournee: true }
    });

    if (!existingMission) {
      return NextResponse.json({ error: 'Mission non trouvée' }, { status: 404 });
    }

    // Vérifier les permissions
    if (session.user.role === 'CHAUFFEUR') {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email! },
        include: { chauffeur: true }
      });
      
      if (existingMission.tournee.chauffeurId !== user?.chauffeur?.id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
      }
    }

    const updateData: any = {};
    if (action) updateData.action = action;
    if (commentaire !== undefined) updateData.commentaire = commentaire;
    if (statut) updateData.statut = statut;
    if (statut === 'REALISEE' && !existingMission.dateRealisation) {
      updateData.dateRealisation = new Date();
    }
    if (actionHistory) updateData.actionHistory = actionHistory;

    const mission = await prisma.mission.update({
      where: { id: missionId },
      data: updateData,
      include: {
        client: true,
        adresse: true,
      },
    });

    return NextResponse.json(mission);
  } catch (error) {
    console.error('Error updating mission:', error);
    return NextResponse.json({ error: 'Failed to update mission' }, { status: 500 });
  }
}