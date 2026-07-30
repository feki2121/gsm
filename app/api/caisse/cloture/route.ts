import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
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
    const { soldeReel } = body;  // ← Plus besoin de la date !

    if (soldeReel === undefined) {
      return NextResponse.json(
        { error: 'Solde réel requis' },
        { status: 400 }
      );
    }

    console.log('[CLOTURE] Rôle utilisateur:', user.role);
    console.log('[CLOTURE] Chauffeur associé:', user.chauffeur?.id || 'Aucun');

    let caisse = null;

    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      // Récupérer la dernière caisse OUVERTE du chauffeur
      caisse = await prisma.caisse.findFirst({
        where: {
          chauffeurId: user.chauffeur.id,
          statut: 'OUVERTE'
        },
        orderBy: {
          date: 'desc'  // La plus récente d'abord
        },
        include: { mouvements: true },
      });
      
      // Si pas de caisse personnelle ouverte, chercher la caisse admin ouverte
      if (!caisse) {
        console.log('[CLOTURE] Pas de caisse personnelle ouverte, recherche caisse admin ouverte...');
        caisse = await prisma.caisse.findFirst({
          where: {
            chauffeurId: null,
            statut: 'OUVERTE'
          },
          orderBy: {
            date: 'desc'
          },
          include: { mouvements: true },
        });
      }
    } else if (user.role === 'ADMIN') {
      // Admin: récupérer la dernière caisse admin ouverte
      caisse = await prisma.caisse.findFirst({
        where: {
          chauffeurId: null,
          statut: 'OUVERTE'
        },
        orderBy: {
          date: 'desc'
        },
        include: { mouvements: true },
      });
    }

    if (!caisse) {
      return NextResponse.json(
        { error: 'Aucune caisse ouverte trouvée pour ce chauffeur' },
        { status: 404 }
      );
    }

    console.log('[CLOTURE] Caisse trouvée:', caisse.id);
    console.log('[CLOTURE] Date de la caisse:', caisse.date);
    console.log('[CLOTURE] Solde théorique:', caisse.soldeTheorique);

    if (caisse.statut === 'CLOTUREE') {
      return NextResponse.json(
        { error: 'Cette caisse est déjà clôturée' },
        { status: 400 }
      );
    }

    const ecart = soldeReel - caisse.soldeTheorique;
    console.log('[CLOTURE] Écart calculé:', ecart);

    const updatedCaisse = await prisma.caisse.update({
      where: { id: caisse.id },
      data: {
        soldeReel,
        ecart,
        statut: 'CLOTUREE',
      },
      include: { mouvements: true },
    });

    console.log('[CLOTURE] Clôture réussie pour la caisse ID:', updatedCaisse.id);

    return NextResponse.json(updatedCaisse);
  } catch (error) {
    console.error('Error closing cash register:', error);
    return NextResponse.json(
      { error: 'Failed to close cash register' },
      { status: 500 }
    );
  }
}