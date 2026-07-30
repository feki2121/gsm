import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    const [retours, total] = await Promise.all([
      prisma.retourFournisseur.findMany({
        skip,
        take: limit,
        include: {
          fournisseur: true,
          bonEntree: true,
          lignes: {
            include: {
              product: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.retourFournisseur.count(),
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
    console.error('Error fetching retours fournisseurs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retours fournisseurs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fournisseurId,
      bonEntreeId,
      motif,
      produits,
    } = body;

    if (!fournisseurId || !bonEntreeId || !produits || produits.length === 0) {
      return NextResponse.json(
        { error: 'Fournisseur, BE et au moins un produit sont requis' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // Générer le numéro du retour
      const date = new Date();
      const year = date.getFullYear();
      const count = await tx.retourFournisseur.count({
        where: {
          date: {
            gte: new Date(year, 0, 1),
            lt: new Date(year + 1, 0, 1),
          },
        },
      });
      const numero = `RET-FOUR-${year}-${String(count + 1).padStart(4, '0')}`;

      // Récupérer le BE avec ses lignes
      const bonEntree = await tx.bonEntree.findUnique({
        where: { id: bonEntreeId },
        include: {
          lignes: {
            include: { product: true }
          },
          fournisseur: true
        },
      });
      
      if (!bonEntree) {
        throw new Error('Bon d\'entrée non trouvé');
      }
      
      if (bonEntree.fournisseurId !== fournisseurId) {
        throw new Error('Le BE ne correspond pas au fournisseur sélectionné');
      }

      // Calculer le montant total du retour et valider les quantités
      let montantTotal = 0;
      const lignesRetour = [];

      for (const produit of produits) {
        const ligneBE = bonEntree.lignes.find(l => l.productId === produit.productId);
        
        if (!ligneBE) {
          throw new Error(`Produit ${produit.productId} non trouvé dans le BE`);
        }
        
        const quantiteDejaRetournee = ligneBE.quantiteRetournee || 0;
        const quantiteMaxRetournable = ligneBE.quantite - quantiteDejaRetournee;
        
        if (produit.quantite > quantiteMaxRetournable) {
          throw new Error(`Quantité retournée pour ${ligneBE.product?.designation} dépasse la quantité disponible (max: ${quantiteMaxRetournable})`);
        }
        
        const prixUnitaire = produit.prixUnitaire || ligneBE.prixUnitaireHT;
        const totalLigne = produit.quantite * prixUnitaire;
        montantTotal += totalLigne;
        
        lignesRetour.push({
          ...produit,
          ligneBEId: ligneBE.id,
          prixUnitaire,
          totalLigne,
          ancienneQuantite: ligneBE.quantite,
          nouvelleQuantite: ligneBE.quantite - produit.quantite,
        });
      }

      // 1. Mettre à jour les lignes du BE (diminuer les quantités)
      for (const ligne of lignesRetour) {
        await tx.ligneBonEntree.update({
          where: { id: ligne.ligneBEId },
          data: {
            quantite: { decrement: ligne.quantite },
            quantiteRetournee: { increment: ligne.quantite },
          },
        });
      }

      // 2. Recalculer le nouveau montant total du BE
      const lignesBEMisesAJour = await tx.ligneBonEntree.findMany({
        where: { bonEntreeId },
        include: { product: true }
      });
      
      const nouveauMontantTotal = lignesBEMisesAJour.reduce(
        (sum, l) => sum + (l.quantite * l.prixUnitaireHT),
        0
      );
      
      // 3. Mettre à jour le BE
      await tx.bonEntree.update({
        where: { id: bonEntreeId },
        data: {
          totalHT: nouveauMontantTotal,
          totalTTC: nouveauMontantTotal * (1 + (bonEntree.lignes[0]?.tva || 19) / 100),
          ...(nouveauMontantTotal <= 0 && {
            statut: 'ANNULE',
          }),
        },
      });

      // 4. Mettre à jour le stock (déduire les produits retournés)
      for (const ligne of lignesRetour) {
        const product = await tx.product.findUnique({
          where: { id: ligne.productId },
        });
        
        if (!product) continue;
        
        const stockLocation = await tx.stockLocation.findFirst({
          where: { productId: ligne.productId },
        });
        
        const homeId = stockLocation?.homeId || product.homeId;
        
        // Diminuer le stock
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: homeId,
            },
          },
          data: {
            quantite: { decrement: ligne.quantite },
          },
        });
        
        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: { decrement: ligne.quantite },
          },
        });
        
        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Retour fournisseur - ${numero} (BE: ${bonEntree.numero}) - ${motif || 'Retour'}`,
            date: new Date(),
          },
        });
      }

      // 5. Créer le retour fournisseur
      const retour = await tx.retourFournisseur.create({
        data: {
          numero,
          date: new Date(),
          fournisseurId,
          bonEntreeId,
          montant: montantTotal,
          motif: motif || null,
          lignes: {
            create: lignesRetour.map(l => ({
              productId: l.productId,
              quantite: l.quantite,
              prixUnitaire: l.prixUnitaire,
              ligneBonEntreeId: l.ligneBEId,
            })),
          },
        },
        include: {
          fournisseur: true,
          bonEntree: true,
          lignes: {
            include: {
              product: true,
            },
          },
        },
      });

      // 6. Mettre à jour le solde du fournisseur (le retour diminue ce qu'on lui doit)
      await tx.fournisseur.update({
        where: { id: fournisseurId },
        data: {
          solde: { decrement: montantTotal },
        },
      });

      return retour;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating retour fournisseur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create retour fournisseur' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  // À implémenter si nécessaire
}