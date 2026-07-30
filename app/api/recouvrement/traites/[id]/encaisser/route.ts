import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST encaisser une traite
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Traite ID is required' },
        { status: 400 }
      );
    }

    console.log("Processing traite encaissement ID:", id);

    const result = await prisma.$transaction(async (tx: any) => {
      // Get the traite
      const traite = await tx.reglementClient.findUnique({
        where: { id },
        include: {
          client: true,
        },
      });

      if (!traite) {
        throw new Error('Traite not found');
      }

      if (traite.statut === 'ENCAISSE') {
        throw new Error('Traite already cashed');
      }

      const now = new Date();

      // Update traite status with encaissement date
      const updatedTraite = await tx.reglementClient.update({
        where: { id },
        data: {
          statut: 'ENCAISSE',
          updatedAt: now,
        },
      });

      // Create cash register movement
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let caisse = await tx.caisse.findFirst({
        where: { date: today },
      });

      if (!caisse) {
        caisse = await tx.caisse.create({
          data: {
            date: today,
            soldeOuverture: 0,
            totalEncaissements: 0,
            totalDecaissements: 0,
            soldeTheorique: 0,
            statut: 'OUVERTE',
          },
        });
      }

      if (caisse.statut === 'CLOTUREE') {
        throw new Error('Cash register is already closed for today');
      }

      // Create mouvement (ENCAISSEMENT)
      const mouvement = await tx.mouvementCaisse.create({
        data: {
          caisseId: caisse.id,
          type: 'ENCAISSEMENT',
          modeReglement: traite.typeReglement,
          montant: traite.montant,
          reference: traite.reference || traite.id,
          libelle: `Encaissement traite client: ${traite.client.nom} - ${traite.reference || 'Sans référence'} - Encaissé le ${now.toLocaleDateString('fr-FR')}`,
        },
      });

      // Update cash register totals
      const newTotalEncaissements = caisse.totalEncaissements + traite.montant;
      await tx.caisse.update({
        where: { id: caisse.id },
        data: {
          totalEncaissements: newTotalEncaissements,
          soldeTheorique: caisse.soldeOuverture + newTotalEncaissements - caisse.totalDecaissements,
        },
      });

      return { traite: updatedTraite, mouvement, dateEncaissement: now };
    });

    return NextResponse.json({
      success: true,
      traite: result.traite,
      dateEncaissement: result.dateEncaissement,
    });
  } catch (error) {
    console.error('Error encaissant traite:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cash traite' },
      { status: 500 }
    );
  }
}