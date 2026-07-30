import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST payer a payment (effectuer le paiement)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    console.log("Processing payment ID:", id);

    const result = await prisma.$transaction(async (tx: any) => {
      // Get the payment
      const reglement = await tx.reglementFournisseur.findUnique({
        where: { id },
        include: {
          fournisseur: true,
        },
      });

      if (!reglement) {
        throw new Error('Reglement not found');
      }

      if (reglement.statut === 'PAYE') {
        throw new Error('Payment already made');
      }

      // Update payment status
      const updatedReglement = await tx.reglementFournisseur.update({
        where: { id },
        data: { statut: 'PAYE' },
      });

      // Create cash register movement (DECAISSEMENT)
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

      // Create mouvement (DECAISSEMENT)
      const mouvement = await tx.mouvementCaisse.create({
        data: {
          caisseId: caisse.id,
          type: 'DECAISSEMENT',
          modeReglement: reglement.typeReglement,
          montant: reglement.montant,
          reference: reglement.reference || reglement.id,
          libelle: `Paiement fournisseur: ${reglement.fournisseur.nom} - ${reglement.reference || 'Sans référence'}`,
        },
      });

      // Update cash register totals
      const newTotalDecaissements = caisse.totalDecaissements + reglement.montant;
      await tx.caisse.update({
        where: { id: caisse.id },
        data: {
          totalDecaissements: newTotalDecaissements,
          soldeTheorique: caisse.soldeOuverture + caisse.totalEncaissements - newTotalDecaissements,
        },
      });

      return { reglement: updatedReglement, mouvement };
    });

    return NextResponse.json(result.reglement);
  } catch (error) {
    console.error('Error paying supplier payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pay supplier payment' },
      { status: 500 }
    );
  }
}