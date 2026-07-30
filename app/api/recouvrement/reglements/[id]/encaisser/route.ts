import { prisma } from '@/lib/prisma';
import { typeReglementLabels } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { detailIndex } = body;

    const reglement = await prisma.reglementClient.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!reglement) {
      return NextResponse.json({ error: 'Règlement non trouvé' }, { status: 404 });
    }

    // Si c'est un paiement MIXTE
    if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
      const details: any[] = JSON.parse(reglement.detailsMixte);

      const nonEncaisseIndexes = details.reduce((acc, d, idx) => {
        if (d.type !== 'ESPECE' && d.statut !== 'ENCAISSE') {
          acc.push(idx);
        }
        return acc;
      }, [] as number[]);

      const indexAEncaisse = detailIndex !== undefined && nonEncaisseIndexes[detailIndex] !== undefined
        ? nonEncaisseIndexes[detailIndex]
        : nonEncaisseIndexes[0];

      if (indexAEncaisse === undefined) {
        return NextResponse.json({ error: 'Aucun paiement à encaisser' }, { status: 400 });
      }

      const paiementAEncaisse = details[indexAEncaisse];

      details[indexAEncaisse] = {
        ...paiementAEncaisse,
        statut: 'ENCAISSE',
        dateEncaissement: new Date().toISOString()
      };

      const tousEncaisse = details.every(
        d => d.type === 'ESPECE' || d.statut === 'ENCAISSE'
      );

      await prisma.reglementClient.update({
        where: { id },
        data: {
          detailsMixte: JSON.stringify(details),
          statut: tousEncaisse ? 'ENCAISSE' : 'EN_ATTENTE',
          updatedAt: new Date(),
        },
      });

      // Ajout à la caisse
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
          type: 'ENCAISSEMENT',
          modeReglement: paiementAEncaisse.type,
          montant: paiementAEncaisse.montant,
          reference: paiementAEncaisse.reference || reglement.id,
          libelle: `Encaissement ${paiementAEncaisse.type} - Client: ${reglement.client.nom}`,
        },
      });

      await prisma.caisse.update({
        where: { id: caisse.id },
        data: {
          totalEncaissements: { increment: paiementAEncaisse.montant },
          soldeTheorique: { increment: paiementAEncaisse.montant },
        },
      });

      return NextResponse.json({
        success: true,
        message: `${paiementAEncaisse.type} encaissé avec succès`,
      });
    }

    // Pour les paiements simples (non mixtes)
    if (reglement.statut === 'ENCAISSE') {
      return NextResponse.json({ error: 'Règlement déjà encaissé' }, { status: 400 });
    }

    await prisma.reglementClient.update({
      where: { id },
      data: { statut: 'ENCAISSE', updatedAt: new Date() },
    });

    // Ajout à la caisse
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
    type TypeReglement =
      | 'ESPECE'
      | 'CHEQUE'
      | 'VIREMENT'
      | 'TRAITE_BANCAIRE'
      | 'CREDIT'
      | 'MIXTE'
      | 'TRAITE_DOMICILE';

    await prisma.mouvementCaisse.create({
      data: {
        caisseId: caisse.id,
        type: 'ENCAISSEMENT',
        modeReglement: reglement.typeReglement as TypeReglement,
        montant: reglement.montant,
        reference: reglement.reference || reglement.id,
        libelle: `Encaissement ${reglement.typeReglement} - Client: ${reglement.client.nom}`,
      },
    });

    await prisma.caisse.update({
      where: { id: caisse.id },
      data: {
        totalEncaissements: { increment: reglement.montant },
        soldeTheorique: { increment: reglement.montant },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Paiement encaissé avec succès",
    });
  } catch (error) {
    console.error('Error cashing payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cash payment' },
      { status: 500 }
    );
  }
}