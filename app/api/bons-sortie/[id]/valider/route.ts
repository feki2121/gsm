import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
// import { getServerSession } from 'next-auth';

const prisma = new PrismaClient();

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // const session = await getServerSession();
    // if (!session) {
    //   return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    // }

    const bonSortie = await prisma.bonSortie.findUnique({
      where: { id: params.id },
      include: { lignes: true },
    });

    if (!bonSortie) {
      return NextResponse.json({ error: 'Bon de sortie non trouvé' }, { status: 404 });
    }

    if (bonSortie.statut !== 'BROUILLON') {
      return NextResponse.json({ error: 'Seul un brouillon peut être validé' }, { status: 400 });
    }

    // Vérifier les stocks et les mettre à jour
    const mouvements = [];
    
    for (const ligne of bonSortie.lignes) {
      const stockLocation = await prisma.stockLocation.findUnique({
        where: {
          productId_homeId: {
            productId: ligne.productId,
            homeId: ligne.homeId,
          },
        },
      });

      if (!stockLocation || stockLocation.quantite < ligne.quantite) {
        return NextResponse.json(
          { error: `Stock insuffisant pour le produit ${ligne.productId}` },
          { status: 400 }
        );
      }

      // Mettre à jour le stock
      await prisma.stockLocation.update({
        where: {
          productId_homeId: {
            productId: ligne.productId,
            homeId: ligne.homeId,
          },
        },
        data: {
          quantite: { decrement: ligne.quantite },
        },
      });

      // Mettre à jour la quantité globale du produit
      await prisma.product.update({
        where: { id: ligne.productId },
        data: {
          quantiteStock: { decrement: ligne.quantite },
        },
      });

      // Créer un mouvement de stock
      const mouvement = await prisma.stockMovement.create({
        data: {
          productId: ligne.productId,
          type: 'SORTIE',
          quantite: ligne.quantite,
          motif: `Bon de sortie N°${bonSortie.numero} - ${bonSortie.motif}`,
          date: new Date(),
        },
      });
      mouvements.push(mouvement);
    }

    // Valider le bon de sortie
    const bonSortieValide = await prisma.bonSortie.update({
      where: { id: params.id },
      data: {
        statut: 'VALIDE',
        // validePar: session.user?.email || 'system',
                validePar: 'system',

        dateValidation: new Date(),
        mouvements: {
          connect: mouvements.map(m => ({ id: m.id })),
        },
      },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
      },
    });

    // Si c'est une vente et qu'il y a un client, mettre à jour son solde
    if (bonSortie.motif === 'VENTE' && bonSortie.clientId) {
      await prisma.client.update({
        where: { id: bonSortie.clientId },
        data: {
          solde: { increment: bonSortie.totalTTC },
        },
      });
    }

    return NextResponse.json(bonSortieValide);
  } catch (error) {
    console.error('Erreur validation bon-sortie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}