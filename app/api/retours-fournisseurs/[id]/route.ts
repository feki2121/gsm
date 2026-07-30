import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Récupérer un retour spécifique
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const retour = await prisma.retourFournisseur.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        bonEntree: true,
        lignes: {
          include: {
            product: true,
            ligneBonEntree: true,
          },
        },
      },
    });

    if (!retour) {
      return NextResponse.json(
        { error: 'Retour fournisseur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(retour);
  } catch (error) {
    console.error('Error fetching retour:', error);
    return NextResponse.json(
      { error: 'Failed to fetch retour' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un retour fournisseur
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { motif, produits } = body;

    // Vérifier si le retour existe
    const existingRetour = await prisma.retourFournisseur.findUnique({
      where: { id },
      include: {
        bonEntree: {
          include: { lignes: true }
        },
        lignes: true,
      },
    });

    if (!existingRetour) {
      return NextResponse.json(
        { error: 'Retour non trouvé' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      // Ensure bonEntree exists
      if (!existingRetour.bonEntree) {
        throw new Error("Bon d'entrée non trouvé");
      }
 
      // 1. ANNULER L'ANCIEN RETOUR (restaurer les anciennes quantités)
      for (const oldLigne of existingRetour.lignes) {
        // Restaurer la quantité dans la ligne du BE
        await tx.ligneBonEntree.update({
          where: { id: oldLigne.ligneBonEntreeId! }, // Use non-null assertion if you're sure it exists
          data: {
            quantite: { increment: oldLigne.quantite },
            quantiteRetournee: { decrement: oldLigne.quantite },
          },
        });

        // Restaurer le stock
        const stockLocation = await tx.stockLocation.findFirst({
          where: { productId: oldLigne.productId },
        });

        if (stockLocation) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: oldLigne.productId,
                homeId: stockLocation.homeId,
              },
            },
            data: {
              quantite: { increment: oldLigne.quantite },
            },
          });
        }

        // Restaurer le stock global
        await tx.product.update({
          where: { id: oldLigne.productId },
          data: {
            quantiteStock: { increment: oldLigne.quantite },
          },
        });
      }

      // Restaurer l'ancien solde du fournisseur
      if (!existingRetour.fournisseurId) {
        throw new Error("Fournisseur ID non trouvé");
      }

      await tx.fournisseur.update({
        where: { id: existingRetour.fournisseurId },
        data: {
          solde: { increment: existingRetour.montant },
        },
      });

      // Restaurer l'ancien total du BE
      const oldBEMontant = existingRetour.bonEntree.totalHT + existingRetour.montant;
      await tx.bonEntree.update({
        where: { id: existingRetour.bonEntreeId! }, // Use non-null assertion
        data: {
          totalHT: oldBEMontant,
          totalTTC: oldBEMontant * (1 + (existingRetour.bonEntree.lignes[0]?.tva || 19) / 100),
          statut: 'VALIDE',
        },
      });

      // 2. SUPPRIMER LES ANCIENNES LIGNES DE RETOUR
      await tx.ligneRetourFournisseur.deleteMany({
        where: { retourFournisseurId: id },
      });

      // 3. APPLIQUER LE NOUVEAU RETOUR
      let nouveauMontant = 0;
      const nouvellesLignes = [];

      for (const produit of produits) {
        const ligneBE = await tx.ligneBonEntree.findFirst({
          where: {
            bonEntreeId: existingRetour.bonEntreeId!,
            productId: produit.productId,
          },
        });

        if (!ligneBE) {
          throw new Error(`Produit non trouvé dans le BE`);
        }

        const quantiteDejaRetournee = ligneBE.quantiteRetournee || 0;
        const quantiteMax = ligneBE.quantite - quantiteDejaRetournee;

        if (produit.quantite > quantiteMax) {
          throw new Error(`Quantité maximale pour ce produit: ${quantiteMax}`);
        }

        const totalLigne = produit.quantite * produit.prixUnitaire;
        nouveauMontant += totalLigne;

        // Mettre à jour la ligne BE
        await tx.ligneBonEntree.update({
          where: { id: ligneBE.id },
          data: {
            quantite: { decrement: produit.quantite },
            quantiteRetournee: { increment: produit.quantite },
          },
        });

        // Mettre à jour le stock
        const stockLocation = await tx.stockLocation.findFirst({
          where: { productId: produit.productId },
        });

        if (stockLocation) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: produit.productId,
                homeId: stockLocation.homeId,
              },
            },
            data: {
              quantite: { decrement: produit.quantite },
            },
          });
        }

        await tx.product.update({
          where: { id: produit.productId },
          data: {
            quantiteStock: { decrement: produit.quantite },
          },
        });

        nouvellesLignes.push({
          productId: produit.productId,
          quantite: produit.quantite,
          prixUnitaire: produit.prixUnitaire,
          ligneBonEntreeId: ligneBE.id,
        });
      }

      // Mettre à jour le BE
      const nouveauTotalBE = await tx.ligneBonEntree.aggregate({
        where: { bonEntreeId: existingRetour.bonEntreeId! },
        _sum: { totalHT: true },
      });

      const nouveauTotal = nouveauTotalBE._sum?.totalHT ?? 0;

      await tx.bonEntree.update({
        where: { id: existingRetour.bonEntreeId! },
        data: {
          totalHT: nouveauTotal,
          totalTTC: nouveauTotal * 1.19,
          statut: nouveauTotal <= 0 ? 'ANNULE' : 'VALIDE',
        },
      });

      // Mettre à jour le solde fournisseur
      await tx.fournisseur.update({
        where: { id: existingRetour.fournisseurId },
        data: {
          solde: { decrement: nouveauMontant },
        },
      });

      // Créer les nouvelles lignes de retour
      await tx.ligneRetourFournisseur.createMany({
        data: nouvellesLignes.map(l => ({
          retourFournisseurId: id,
          productId: l.productId,
          quantite: l.quantite,
          prixUnitaire: l.prixUnitaire,
          ligneBonEntreeId: l.ligneBonEntreeId,
        })),
      });

      // Mettre à jour le retour
      const updatedRetour = await tx.retourFournisseur.update({
        where: { id },
        data: {
          montant: nouveauMontant,
          motif: motif || null,
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

      return updatedRetour;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating retour:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update retour' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un retour fournisseur
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existingRetour = await prisma.retourFournisseur.findUnique({
      where: { id },
      include: {
        bonEntree: {
          include: { lignes: true }
        },
        lignes: true,
      },
    });

    if (!existingRetour) {
      return NextResponse.json(
        { error: 'Retour non trouvé' },
        { status: 404 }
      );
    }

    // Check if bonEntree exists
    if (!existingRetour.bonEntree) {
      return NextResponse.json(
        { error: 'Bon d\'entrée associé non trouvé' },
        { status: 404 }
      );
    }

    // Check if fournisseurId exists
    if (!existingRetour.fournisseurId) {
      return NextResponse.json(
        { error: 'Fournisseur non associé' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Restaurer les quantités dans le BE
      for (const ligne of existingRetour.lignes) {
        // Ensure ligneBonEntreeId exists
        if (!ligne.ligneBonEntreeId) {
          throw new Error(`Ligne bon d'entrée ID manquant pour le produit ${ligne.productId}`);
        }

        await tx.ligneBonEntree.update({
          where: { id: ligne.ligneBonEntreeId },
          data: {
            quantite: { increment: ligne.quantite },
            quantiteRetournee: { decrement: ligne.quantite },
          },
        });

        // Restaurer le stock
        const stockLocation = await tx.stockLocation.findFirst({
          where: { productId: ligne.productId },
        });

        if (stockLocation) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: ligne.productId,
                homeId: stockLocation.homeId,
              },
            },
            data: {
              quantite: { increment: ligne.quantite },
            },
          });
        }

        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: { increment: ligne.quantite },
          },
        });
      }

      // 2. Restaurer le total du BE
      const nouveauTotalBE = await tx.ligneBonEntree.aggregate({
        where: { bonEntreeId: existingRetour.bonEntreeId! },
        _sum: { totalHT: true },
      });

      const nouveauTotal = nouveauTotalBE._sum?.totalHT ?? 0;

      await tx.bonEntree.update({
        where: { id: existingRetour.bonEntreeId! },
        data: {
          totalHT: nouveauTotal,
          totalTTC: nouveauTotal * 1.19,
          statut: 'VALIDE',
        },
      });

      // 3. Restaurer le solde du fournisseur
      await tx.fournisseur.update({
        where: { id: existingRetour.fournisseurId },
        data: {
          solde: { increment: existingRetour.montant },
        },
      });

      // 4. Supprimer les lignes de retour
      await tx.ligneRetourFournisseur.deleteMany({
        where: { retourFournisseurId: id },
      });

      // 5. Supprimer le retour
      await tx.retourFournisseur.delete({
        where: { id },
      });
    });

    return NextResponse.json(
      { message: 'Retour fournisseur supprimé avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting retour:', error);
    return NextResponse.json(
      { error: 'Failed to delete retour' },
      { status: 500 }
    );
  }
}