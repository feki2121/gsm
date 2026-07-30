import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son chauffeur
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: {
        chauffeur: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }
    const chauffeurId = user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null;
    const body = await req.json();
    const { clientId, montantTotal, detailsMixte, factureIds = [] } = body;

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    // Vérifier qu'il y a au moins un paiement
    if (!detailsMixte || detailsMixte.length === 0) {
      return NextResponse.json({ error: 'Aucun détail de paiement' }, { status: 400 });
    }

    // Ajouter le statut initial pour chaque ligne (ESPECE = ENCAISSE, autres = EN_ATTENTE)
    const detailsAvecStatut = detailsMixte.map((d: any) => ({
      ...d,
      statut: d.type === 'ESPECE' ? 'ENCAISSE' : 'EN_ATTENTE',
      dateEncaissement: d.type === 'ESPECE' ? new Date().toISOString() : null
    }));

    const result = await prisma.$transaction(async (tx) => {
      // Créer le règlement principal de type MIXTE
      const reglement = await tx.reglementClient.create({
        data: {
          clientId,
          montant: montantTotal,
          typeReglement: 'MIXTE',
          detailsMixte: JSON.stringify(detailsAvecStatut),
          statut: 'EN_ATTENTE', // Statut global tant que tout n'est pas encaissé
          chauffeurId,
        },
      });

      // Lier aux factures si nécessaire
      // if (factureIds.length > 0) {
      //   await tx.reglementFacture.createMany({
      //     data: factureIds.map((factureId: string) => ({
      //       reglementId: reglement.id,
      //       factureId,
      //       montantApplique: montantTotal / factureIds.length,
      //     })),
      //   });
      // }

      // Gérer la caisse pour les espèces (encaissement immédiat)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // let caisse = await tx.caisse.findUnique({ where: { date: today } });
      // if (!caisse) {
      //   caisse = await tx.caisse.create({
      //     data: {
      //       date: today,
      //       soldeOuverture: 0,
      //       totalEncaissements: 0,
      //       totalDecaissements: 0,
      //       soldeTheorique: 0,
      //       statut: 'OUVERTE',
      //     },
      //   });
      // }

      // Créer des mouvements de caisse pour les espèces uniquement
      // const especesMontant = detailsAvecStatut
      //   .filter((d: any) => d.type === 'ESPECE')
      //   .reduce((sum: number, d: any) => sum + d.montant, 0);

      // if (especesMontant > 0) {
      //   await tx.mouvementCaisse.create({
      //     data: {
      //       caisseId: caisse.id,
      //       type: 'ENCAISSEMENT',
      //       modeReglement: 'ESPECE',
      //       montant: especesMontant,
      //       reference: reglement.id,
      //       libelle: `Règlement client: ${client.nom} - Espèces (paiement mixte)`,
      //     },
      //   });

      //   await tx.caisse.update({
      //     where: { id: caisse.id },
      //     data: {
      //       totalEncaissements: { increment: especesMontant },
      //       soldeTheorique: { increment: especesMontant },
      //     },
      //   });
      // }

      return reglement;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating mixed payment:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create mixed payment' },
      { status: 500 }
    );
  }
}