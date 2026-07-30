import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { any } from 'zod';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: {
        chauffeur: {
          include: {
            vehicule: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    let homes: any[] = [];

    if (user.role === 'ADMIN') {
      // Admin voit tous les entrepôts
      homes = await prisma.home.findMany();
    } else if (user.role === 'CHAUFFEUR' && user.chauffeur?.vehicule) {
      // Chauffeur voit seulement l'entrepôt de son véhicule
      const vehiculeHome = await prisma.home.findUnique({
        where: { id: user.chauffeur.vehicule.homeId }
      });
      if (vehiculeHome) homes = [vehiculeHome];
    } else if (user.role === 'CHAUFFEUR') {
      // Chauffeur voit seulement l'entrepôt principal
      const principalHome = await prisma.home.findFirst({
        where: { nom: 'PRINCIPAL' }
      });
      if (principalHome) homes = [principalHome];
    } else {
      // Par défaut, entrepôt principal
      const principalHome = await prisma.home.findFirst({
        where: { nom: 'PRINCIPAL' }
      });
      if (principalHome) homes = [principalHome];
    }

    return NextResponse.json({ data: homes });
  } catch (error) {
    console.error('Error fetching accessible homes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accessible homes' },
      { status: 500 }
    );
  }
}