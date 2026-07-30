import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    let detailIndex = undefined;
    let montantAPayer = undefined;
    
    try {
      const text = await req.text();
      if (text && text.length > 0) {
        const body = JSON.parse(text);
        detailIndex = body.detailIndex;
        montantAPayer = body.montant;
      }
    } catch (e) {
      console.log('No body received');
    }

    const reglement = await prisma.reglementFournisseur.findUnique({
      where: { id },
      include: { fournisseur: true },
    });

    if (!reglement) {
      return NextResponse.json({ error: 'Règlement non trouvé' }, { status: 404 });
    }

    if (reglement.statut === 'PAYE') {
      return NextResponse.json({ error: 'Règlement déjà payé' }, { status: 400 });
    }

    // Cas MIXTE
    if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
      const details: any[] = JSON.parse(reglement.detailsMixte);
      
      const nonPayesIndexes = details.reduce((acc, d, idx) => {
        if (d.type !== 'ESPECE' && d.statut !== 'PAYE') {
          acc.push(idx);
        }
        return acc;
      }, [] as number[]);
      
      let indexAPayer: number;
      if (detailIndex !== undefined && nonPayesIndexes[detailIndex] !== undefined) {
        indexAPayer = nonPayesIndexes[detailIndex];
      } else if (nonPayesIndexes.length > 0) {
        indexAPayer = nonPayesIndexes[0];
      } else {
        return NextResponse.json({ error: 'Aucun paiement à effectuer' }, { status: 400 });
      }
      
      const paiementAPayer = details[indexAPayer];
      const montantRestant = paiementAPayer.montant - (paiementAPayer.montantPaye || 0);
      
      let montantPaye = montantAPayer || montantRestant;
      if (montantPaye > montantRestant) {
        montantPaye = montantRestant;
      }
      
      const nouveauMontantPaye = (paiementAPayer.montantPaye || 0) + montantPaye;
      const estComplet = nouveauMontantPaye >= paiementAPayer.montant;
      
      details[indexAPayer] = { 
        ...paiementAPayer, 
        montantPaye: nouveauMontantPaye,
        statut: estComplet ? 'PAYE' : 'PARTIELLE',
        datePaiement: new Date().toISOString()
      };
      
      const tousPayes = details.every(d => {
        const reste = d.montant - (d.montantPaye || 0);
        return reste === 0;
      });
      const aucunPaye = details.every(d => (d.montantPaye || 0) === 0);
      const partiellementPaye = !tousPayes && !aucunPaye;
      
      let statutGlobal: string;
      if (tousPayes) {
        statutGlobal = 'PAYE';
      } else if (partiellementPaye) {
        statutGlobal = 'PARTIELLE';
      } else {
        statutGlobal = 'EN_ATTENTE';
      }
      
      const updatedReglement = await prisma.reglementFournisseur.update({
        where: { id },
        data: {
          detailsMixte: JSON.stringify(details),
          statut: statutGlobal as any,
        },
      });
      
      // Gérer la caisse (décaissement)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let caisse = await prisma.caisse.findFirst({ where: { date: today } });
      if (!caisse) {
        caisse = await prisma.caisse.create({
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
      
      await prisma.mouvementCaisse.create({
        data: {
          caisseId: caisse.id,
          type: 'DECAISSEMENT',
          modeReglement: paiementAPayer.type,
          montant: montantPaye,
          reference: paiementAPayer.reference || reglement.id,
          libelle: `Paiement fournisseur: ${reglement.fournisseur?.nom} - ${paiementAPayer.type} (${montantPaye}/${paiementAPayer.montant})`,
        },
      });
      
      await prisma.caisse.update({
        where: { id: caisse.id },
        data: {
          totalDecaissements: { increment: montantPaye },
          soldeTheorique: { decrement: montantPaye },
        },
      });
      
      return NextResponse.json({
        message: `${montantPaye} payé sur ${paiementAPayer.type}`,
        updatedReglement
      });
    }
    
    // Paiement simple
    const result = await prisma.$transaction(async (tx: any) => {
      const updatedReglement = await tx.reglementFournisseur.update({
        where: { id },
        data: { statut: 'PAYE' },
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let caisse = await tx.caisse.findFirst({ where: { date: today } });
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
      
      await tx.mouvementCaisse.create({
        data: {
          caisseId: caisse.id,
          type: 'DECAISSEMENT',
          modeReglement: reglement.typeReglement,
          montant: reglement.montant,
          reference: reglement.reference || reglement.id,
          libelle: `Paiement fournisseur: ${reglement.fournisseur?.nom}`,
        },
      });
      
      await tx.caisse.update({
        where: { id: caisse.id },
        data: {
          totalDecaissements: { increment: reglement.montant },
          soldeTheorique: { decrement: reglement.montant },
        },
      });
      
      return updatedReglement;
    });
    
    return NextResponse.json({ 
      message: `Paiement effectué avec succès`,
      reglement: result 
    });
  } catch (error) {
    console.error('Error processing payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process payment' },
      { status: 500 }
    );
  }
}