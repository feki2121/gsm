import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { detailIndex } = body;

    const reglement = await prisma.reglementFournisseur.findUnique({
      where: { id },
      include: { fournisseur: true },
    });

    if (!reglement) {
      return NextResponse.json({ error: 'Règlement non trouvé' }, { status: 404 });
    }

    // Paiement mixte
    if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
      const details: any[] = JSON.parse(reglement.detailsMixte);
      
      const nonPayeIndexes = details.reduce((acc, d, idx) => {
        if (d.type !== 'ESPECE' && d.statut !== 'PAYE') {
          acc.push(idx);
        }
        return acc;
      }, [] as number[]);
      
      const indexAPayer = detailIndex !== undefined && nonPayeIndexes[detailIndex] !== undefined
        ? nonPayeIndexes[detailIndex]
        : nonPayeIndexes[0];
      
      if (indexAPayer === undefined) {
        return NextResponse.json({ error: 'Aucun paiement à effectuer' }, { status: 400 });
      }
      
      const paiementAPayer = details[indexAPayer];
      
      details[indexAPayer] = { 
        ...paiementAPayer, 
        statut: 'PAYE',
        datePaiement: new Date().toISOString()
      };
      
      const tousPayes = details.every(
        d => d.type === 'ESPECE' || d.statut === 'PAYE'
      );
      
      await prisma.reglementFournisseur.update({
        where: { id },
        data: {
          detailsMixte: JSON.stringify(details),
          statut: tousPayes ? 'PAYE' : 'EN_ATTENTE',
          updatedAt: new Date(),
        },
      });
      
      // Mise à jour du solde du fournisseur (réduction de la dette)
      await prisma.fournisseur.update({
        where: { id: reglement.fournisseurId },
        data: {
          solde: { decrement: paiementAPayer.montant },
        },
      });
      
      return NextResponse.json({
        success: true,
        message: `${paiementAPayer.type} payé avec succès`,
      });
    }
    
    // Paiement simple
    if (reglement.statut === 'PAYE') {
      return NextResponse.json({ error: 'Règlement déjà payé' }, { status: 400 });
    }
    
    await prisma.reglementFournisseur.update({
      where: { id },
      data: { statut: 'PAYE', updatedAt: new Date() },
    });
    
    // Mise à jour du solde du fournisseur
    await prisma.fournisseur.update({
      where: { id: reglement.fournisseurId },
      data: {
        solde: { decrement: reglement.montant },
      },
    });
    
    return NextResponse.json({ success: true, message: "Paiement effectué avec succès" });
  } catch (error) {
    console.error('Error paying supplier payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pay' },
      { status: 500 }
    );
  }
}