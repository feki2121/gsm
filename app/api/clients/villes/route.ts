import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const villes = await prisma.clientAddress.findMany({
      where: {
        ville: { not: null },
      },
      select: {
        ville: true,
      },
      distinct: ['ville'],
    });

    const villesList = villes.map((v: { ville: string | null }) => v.ville).filter((v: string | null): v is string => !!v);
    return NextResponse.json(villesList);
  } catch (error) {
    console.error('Error fetching villes:', error);
    return NextResponse.json([], { status: 500 });
  }
}