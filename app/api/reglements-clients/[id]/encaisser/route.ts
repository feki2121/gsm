import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { getServerSession } from 'next-auth';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
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

    const { id } = await params;

    let detailIndex: number | undefined;
    let montantAEncaisse: number | undefined;

    try {
      const text = await req.text();
      if (text && text.length > 0) {
        const body = JSON.parse(text);
        detailIndex = body.detailIndex;
        montantAEncaisse = body.montant;
      }
    } catch (e) {
      console.log('No body or invalid body received');
    }

    const reglement = await prisma.reglementClient.findUnique({
      where: { id },
      include: { client: true },
    });

    if (!reglement) {
      return NextResponse.json({ error: 'Règlement non trouvé' }, { status: 404 });
    }

    // ── CAS MIXTE ──────────────────────────────────────────────────────────────
    if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
      const details: any[] = JSON.parse(reglement.detailsMixte);

      // Indexes des paiements non-espèce avec un reste à encaisser
      const nonEncaisseIndexes = details.reduce((acc, d, idx) => {
        const reste = d.montant - (d.montantEncaisse || 0);
        if (d.type !== 'ESPECE' && reste > 0) acc.push(idx);
        return acc;
      }, [] as number[]);

      if (nonEncaisseIndexes.length === 0) {
        return NextResponse.json({ error: 'Aucun paiement à encaisser' }, { status: 400 });
      }

      const indexAEncaisse =
        detailIndex !== undefined && nonEncaisseIndexes[detailIndex] !== undefined
          ? nonEncaisseIndexes[detailIndex]
          : nonEncaisseIndexes[0];

      const paiement = details[indexAEncaisse];
      const montantRestant = paiement.montant - (paiement.montantEncaisse || 0);
      const montantEncaisse = Math.min(montantAEncaisse || montantRestant, montantRestant);
      const nouveauMontantEncaisse = (paiement.montantEncaisse || 0) + montantEncaisse;

      details[indexAEncaisse] = {
        ...paiement,
        montantEncaisse: nouveauMontantEncaisse,
        statut: nouveauMontantEncaisse >= paiement.montant ? 'ENCAISSE' : 'PARTIELLE',
        dateEncaissement: new Date().toISOString(),
      };

      // Statut global (les ESPECES sont toujours considérées encaissées)
      const tousEncaisse = details.every(d =>
        d.type === 'ESPECE' || (d.montant - (d.montantEncaisse || 0)) === 0
      );
      const aucunNonEspeceEncaisse = details.every(d =>
        d.type === 'ESPECE' || (d.montantEncaisse || 0) === 0
      );

      const statutGlobal = tousEncaisse
        ? 'ENCAISSE'
        : aucunNonEspeceEncaisse
        ? 'EN_ATTENTE'
        : 'PARTIELLE';

      const updatedReglement = await prisma.reglementClient.update({
        where: { id },
        data: {
          detailsMixte: JSON.stringify(details),
          statut: statutGlobal as any,
        },
      });

      const resteCount = details.filter(d => {
        const reste = d.montant - (d.montantEncaisse || 0);
        return reste > 0 && d.type !== 'ESPECE';
      }).length;

      return NextResponse.json({
        message: `${montantEncaisse} encaissé sur ${paiement.type}`,
        reste: resteCount,
        updatedReglement,
      });
    }

    // ── CAS SIMPLE (CHEQUE, TRAITE, CREDIT…) ──────────────────────────────────
    if (reglement.statut === 'ENCAISSE') {
      return NextResponse.json({ error: 'Règlement déjà encaissé' }, { status: 400 });
    }

    const updatedReglement = await prisma.reglementClient.update({
      where: { id },
      data: {
        statut: 'ENCAISSE',
        // Optionnel : tracer la date d'encaissement
        // dateEncaissement: new Date(),
      },
    });

    return NextResponse.json({
      message: `${reglement.typeReglement} encaissé avec succès`,
      reglement: updatedReglement,
    });

  } catch (error) {
    console.error('Error cashing payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cash payment' },
      { status: 500 }
    );
  }
}