import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const chauffeurId = user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null;
    const { id: clientId } = await params;
    const body = await request.json();
    const { montantInitial, reference, datePaiement } = body;

    if (!montantInitial || montantInitial <= 0) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
    }

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      select: { solde: true, nom: true, telephone: true, creditDisponible: true }
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Transaction pour créer le crédit initial
    await prisma.$transaction(async (tx: any) => {
      // 1. Créer un règlement de type CREDIT avec statut EN_ATTENTE
      const nouveauCredit = await tx.reglementClient.create({
        data: {
          clientId,
          chauffeurId,
          montant: montantInitial,
          typeReglement: 'CREDIT',
          reference: reference || `CREDIT-INITIAL-${Date.now()}`,
          date: datePaiement ? new Date(datePaiement) : new Date(),
          statut: 'EN_ATTENTE'
        }
      });

      // 2. Mettre à jour le solde du client (incrémenter)
      await tx.client.update({
        where: { id: clientId },
        data: {
          solde: { increment: montantInitial },
          creditDisponible: { decrement: montantInitial }
        }
      });

      return nouveauCredit;
    });

    // Récupérer le nouveau solde
    const clientMisAJour = await prisma.client.findUnique({
      where: { id: clientId },
      select: { solde: true, nom: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Solde initial ajouté avec succès',
      montantAjoute: montantInitial,
      nouveauSolde: clientMisAJour?.solde || 0,
      clientNom: client.nom
    });

  } catch (error) {
    console.error('Erreur détaillée:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'ajout du solde initial: ' + (error instanceof Error ? error.message : 'Erreur inconnue') },
      { status: 500 }
    );
  }
}