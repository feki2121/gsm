import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const clientId = resolvedParams.id;

    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        nom: true,
        estAutoriseCredit: true,
        creditAutorise: true,
        creditUtilise: true,
        creditDisponible: true,
        solde: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Calculer le crédit disponible
    const creditDisponible = (client.creditAutorise || 0) - client.creditUtilise;

    return NextResponse.json({
      ...client,
      creditDisponible,
      peutUtiliserCredit: client.estAutoriseCredit && creditDisponible > 0,
    });
  } catch (error) {
    console.error('Error fetching client credit:', error);
    return NextResponse.json({ error: 'Failed to fetch client credit' }, { status: 500 });
  }
}