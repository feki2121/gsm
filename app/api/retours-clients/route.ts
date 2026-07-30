import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all retours clients with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [retours, total] = await Promise.all([
      prisma.retourClient.findMany({
        skip,
        take: limit,
        include: {
          client: true,
          bonLivraison: {
            include: {
              lignes: true,
            },
          },
          lignes: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.retourClient.count(),
    ]);

    return NextResponse.json({
      data: retours,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching retours clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retours clients' },
      { status: 500 }
    );
  }
}

// POST create retour client with BL update
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      clientId,
      bonLivraisonId,
      lignes,
      montant,
    } = body;

    if (!clientId || !bonLivraisonId || !lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Client, BL et au moins un produit sont requis' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Générer le numéro du retour
      const date = new Date();
      const year = date.getFullYear();
      const count = await tx.retourClient.count({
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });
      const numero = `RET-${year}-${String(count + 1).padStart(4, '0')}`;

      // Récupérer le BL avec ses lignes
      const bonLivraison = await tx.bonLivraison.findUnique({
        where: { id: bonLivraisonId },
        include: {
          lignes: {
            include: { product: true }
          },
          client: true
        },
      });

      if (!bonLivraison) {
        throw new Error('Bon de livraison non trouvé');
      }

      if (bonLivraison.clientId !== clientId) {
        throw new Error('Le BL ne correspond pas au client sélectionné');
      }

      // Calculer le montant total du retour et valider les quantités
      let montantTotal = 0;
      const lignesRetour = [];

      for (const ligne of lignes) {
        // Trouver la ligne correspondante dans le BL
        const ligneBL = bonLivraison.lignes.find(l => l.productId === ligne.productId);

        if (!ligneBL) {
          throw new Error(`Produit ${ligne.productId} non trouvé dans le BL`);
        }

        // Calculer la quantité déjà retournée
        const quantiteDejaRetournee = ligneBL.quantiteRetournee || 0;
        const quantiteMaxRetournable = ligneBL.quantite - quantiteDejaRetournee;

        if (ligne.quantite > quantiteMaxRetournable) {
          throw new Error(`Quantité retournée pour ${ligneBL.product?.designation} dépasse la quantité disponible (max: ${quantiteMaxRetournable})`);
        }

        const prixUnitaire = ligne.prixUnitaire || ligneBL.product?.prixVente || 0;
        const totalLigne = ligne.quantite * prixUnitaire;
        montantTotal += totalLigne;

        lignesRetour.push({
          ...ligne,
          ligneBLId: ligneBL.id,
          prixUnitaire,
          totalLigne,
          ancienneQuantite: ligneBL.quantite,
          nouvelleQuantite: ligneBL.quantite - ligne.quantite,
        });
      }

      // 1. Mettre à jour les lignes du BL (diminuer les quantités)
      for (const ligne of lignesRetour) {
        await tx.ligneBL.update({
          where: { id: ligne.ligneBLId },
          data: {
            quantite: { decrement: ligne.quantite },
            quantiteRetournee: { increment: ligne.quantite },
          },
        });
      }

      // 2. Recalculer le nouveau montant total du BL
      const lignesBLMisesAJour = await tx.ligneBL.findMany({
        where: { bonLivraisonId },
        include: { product: true }
      });

      const nouveauMontantTotal = lignesBLMisesAJour.reduce(
        (sum, l) => sum + (l.quantite * (l.product?.prixVente || 0)),
        0
      );

      const nouveauMontantRestant = nouveauMontantTotal - bonLivraison.montantPaye;

      // 3. Mettre à jour le BL
      await tx.bonLivraison.update({
        where: { id: bonLivraisonId },
        data: {
          montantTotal: nouveauMontantTotal,
          montantRestant: Math.max(0, nouveauMontantRestant),
          // Si le BL devient à 0, changer le statut
          ...(nouveauMontantTotal <= 0 && {
            statut: 'ANNULE',
          }),
        },
      });

      // 4. Mettre à jour le stock (réintégrer les produits retournés)
      for (const ligne of lignesRetour) {
        const product = await tx.product.findUnique({
          where: { id: ligne.productId },
        });

        if (!product) continue;

        // Récupérer l'emplacement par défaut
        const stockLocation = await tx.stockLocation.findFirst({
          where: { productId: ligne.productId },
        });

        const homeId = stockLocation?.homeId || product.homeId;

        // Augmenter le stock
        await tx.stockLocation.upsert({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: homeId,
            },
          },
          update: {
            quantite: { increment: ligne.quantite },
          },
          create: {
            productId: ligne.productId,
            homeId: homeId,
            quantite: ligne.quantite,
          },
        });

        // Mettre à jour le stock global
        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: { increment: ligne.quantite },
          },
        });

        // Créer un mouvement de stock
        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Retour client - ${numero} (BL: ${bonLivraison.numero})`,
            date: new Date(),
          },
        });
      }

      // 5. Créer le retour client
      const retour = await tx.retourClient.create({
        data: {
          numero,
          date: new Date(),
          clientId,
          bonLivraisonId,
          montant: montantTotal,
          lignes: {
            create: lignesRetour.map(l => ({
              productId: l.productId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
            })),
          },
        },
        include: {
          client: true,
          bonLivraison: true,
          lignes: {
            include: {
              product: true,
            },
          },
        },
      });

      // 6. Mettre à jour le solde du client (crédit)
      await tx.client.update({
        where: { id: clientId },
        data: {
          solde: { decrement: montantTotal },
        },
      });

      // 7. Si le BL a une facture associée, mettre à jour la facture
      if (bonLivraison.factureId) {
        const facture = await tx.facture.findUnique({
          where: { id: bonLivraison.factureId },
          include: { reglements: true },
        });

        if (facture) {
          const nouveauMontantFacture = facture.totalTTC - montantTotal;

          await tx.facture.update({
            where: { id: bonLivraison.factureId },
            data: {
              totalTTC: nouveauMontantFacture,
              ...(nouveauMontantFacture <= 0 && { statut: 'PAYEE' }),
            },
          });
        }
      }

      return retour;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating retour client:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create retour client' },
      { status: 500 }
    );
  }
}

// DELETE retour client
export async function DELETE(req: NextRequest) {
  // À implémenter si nécessaire
}