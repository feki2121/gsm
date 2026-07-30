import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Récupérer une facture par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
        bonLivraisonRef: true,
      },
    });

    if (!facture) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    return NextResponse.json(facture);
  } catch (error) {
    console.error('Erreur GET facture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Modifier une facture
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      numero,
      clientId,
      date,
      totalHT,
      totalTVA,
      totalTTC,
      remise,
      statut,
      type,
      lignes,
      bonsLivraisonIds,
    } = body;

    // Vérifier si la facture existe
    const existingFacture = await prisma.facture.findUnique({
      where: { id },
      include: { lignes: true, bonLivraisonRef: true },
    });

    if (!existingFacture) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    if (!numero || !clientId) {
      return NextResponse.json(
        { error: 'Numéro et client sont requis' },
        { status: 400 }
      );
    }

    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une ligne est requise' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Si c'est une facture directe (sans BL), gérer l'ajustement de stock
      const isDirecte = existingFacture.bonLivraisonId === null;
      
      if (isDirecte) {
        // Récupérer les anciennes lignes pour ajuster le stock
        const anciennesLignes = existingFacture.lignes;
        
        // Créer un Map des anciennes quantités par produit
        const anciennesQuantites = new Map();
        for (const ligne of anciennesLignes) {
          anciennesQuantites.set(ligne.productId, ligne.quantite);
        }

        // 1.1 Restaurer l'ancien stock (annuler l'ancienne sortie)
        for (const ligne of anciennesLignes) {
          // Restaurer le stock FAC
          await tx.stockParType.update({
            where: {
              productId_typeBE: {
                productId: ligne.productId,
                typeBE: 'FAC',
              },
            },
            data: {
              quantite: { increment: ligne.quantite },
            },
          });

          // Restaurer le stock total
          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              quantiteStock: { increment: ligne.quantite },
            },
          });
        }

        // 1.2 Vérifier le nouveau stock FAC pour les nouvelles lignes
        for (const ligne of lignes) {
          const stockFAC = await tx.stockParType.findUnique({
            where: {
              productId_typeBE: {
                productId: ligne.productId,
                typeBE: 'FAC',
              },
            },
          });

          const quantiteFAC = stockFAC?.quantite || 0;
          const ancienneQuantite = anciennesQuantites.get(ligne.productId) || 0;
          const nouvelleQuantite = ligne.quantite;
          const quantiteSupplementaire = nouvelleQuantite - ancienneQuantite;

          if (quantiteSupplementaire > 0 && quantiteFAC < quantiteSupplementaire) {
            const product = await tx.product.findUnique({
              where: { id: ligne.productId },
            });
            throw new Error(
              `Stock FAC insuffisant pour "${product?.designation}". ` +
              `Stock FAC disponible: ${quantiteFAC}, Besoin supplémentaire: ${quantiteSupplementaire}`
            );
          }
        }

        // 1.3 Appliquer le nouveau stock
        for (const ligne of lignes) {
          const ancienneQuantite = anciennesQuantites.get(ligne.productId) || 0;
          const difference = ligne.quantite - ancienneQuantite;

          if (difference !== 0) {
            // Mettre à jour le stock FAC
            await tx.stockParType.update({
              where: {
                productId_typeBE: {
                  productId: ligne.productId,
                  typeBE: 'FAC',
                },
              },
              data: {
                quantite: { decrement: difference },
              },
            });

            // Mettre à jour le stock total
            await tx.product.update({
              where: { id: ligne.productId },
              data: {
                quantiteStock: { decrement: difference },
              },
            });

            // Créer un mouvement de stock pour l'ajustement
            if (difference !== 0) {
              await tx.stockMovement.create({
                data: {
                  productId: ligne.productId,
                  type: difference > 0 ? 'SORTIE' : 'ENTREE',
                  quantite: Math.abs(difference),
                  motif: `Modification facture - Ajustement ${difference > 0 ? 'sortie' : 'retour'}`,
                  date: new Date(),
                },
              });
            }
          }
        }
      }

      // 2. Mettre à jour le solde du client
      const ancienTotal = existingFacture.totalTTC;
      const nouveauTotal = totalTTC || (totalHT + totalTVA);
      const differenceSolde = nouveauTotal - ancienTotal;

      if (differenceSolde !== 0) {
        await tx.client.update({
          where: { id: clientId },
          data: {
            solde: { increment: differenceSolde },
          },
        });
      }

      // 3. Si le client a changé, ajuster le solde de l'ancien client
      if (clientId !== existingFacture.clientId) {
        // Enlever le montant de l'ancien client
        await tx.client.update({
          where: { id: existingFacture.clientId },
          data: {
            solde: { decrement: ancienTotal },
          },
        });
        
        // Ajouter au nouveau client (déjà fait dans l'étape 2)
        // Donc on annule l'incrément du dessus pour le nouveau client
        await tx.client.update({
          where: { id: clientId },
          data: {
            solde: { increment: nouveauTotal },
          },
        });
      }

      // 4. Supprimer les anciennes lignes
      await tx.ligneFacture.deleteMany({
        where: { factureId: id },
      });

      // 5. Créer les nouvelles lignes
      const nouvellesLignes = lignes.map((l: any) => ({
        productId: l.productId,
        homeId: l.homeId || null,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        tva: l.tva || 19,
      }));

      // 6. Mettre à jour la facture
      const facture = await tx.facture.update({
        where: { id },
        data: {
          numero,
          clientId,
          date: new Date(date),
          totalHT,
          totalTVA,
          totalTTC: nouveauTotal,
          remise: remise || 0,
          statut: statut || 'IMPAYEE',
          type: type || 'DIRECTE',
          lignes: {
            create: nouvellesLignes,
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
          bonLivraisonRef: true,
        },
      });

      // 7. Mettre à jour les références des BL si nécessaire
      if (bonsLivraisonIds && bonsLivraisonIds.length > 0) {
        // Détacher l'ancien BL si existant
        if (existingFacture.bonLivraisonId) {
          await tx.bonLivraison.update({
            where: { id: existingFacture.bonLivraisonId },
            data: {
              factureId: null,
              statut: 'EN_ATTENTE',
            },
          });
        }

        // Attacher les nouveaux BLs
        await tx.bonLivraison.updateMany({
          where: { id: { in: bonsLivraisonIds } },
          data: {
            factureId: facture.id,
            statut: 'LIVRE',
          },
        });
      }

      return facture;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Erreur PUT facture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une facture
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const facture = await prisma.facture.findUnique({
      where: { id },
      include: { 
        lignes: true,
        bonLivraisonRef: true 
      },
    });

    if (!facture) {
      return NextResponse.json(
        { error: 'Facture non trouvée' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Si c'est une facture directe (sans BL), restaurer le stock
      const isDirecte = facture.bonLivraisonId === null;
      
      if (isDirecte) {
        for (const ligne of facture.lignes) {
          // Restaurer le stock FAC
          await tx.stockParType.update({
            where: {
              productId_typeBE: {
                productId: ligne.productId,
                typeBE: 'FAC',
              },
            },
            data: {
              quantite: { increment: ligne.quantite },
            },
          });

          // Restaurer le stock total
          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              quantiteStock: { increment: ligne.quantite },
            },
          });

          // Créer un mouvement de stock pour le retour
          await tx.stockMovement.create({
            data: {
              productId: ligne.productId,
              type: 'ENTREE',
              quantite: ligne.quantite,
              motif: `Suppression facture - Annulation vente`,
              date: new Date(),
            },
          });
        }
      } else {
        // 2. Si la facture vient d'un BL, détacher le BL
        await tx.bonLivraison.updateMany({
          where: { factureId: id },
          data: {
            factureId: null,
            statut: 'EN_ATTENTE',
          },
        });
      }

      // 3. Enlever le montant du solde du client
      await tx.client.update({
        where: { id: facture.clientId },
        data: {
          solde: { decrement: facture.totalTTC },
        },
      });

      // 4. Supprimer la facture (les lignes seront supprimées automatiquement)
      await tx.facture.delete({
        where: { id },
      });
    });

    return NextResponse.json(
      { message: 'Facture supprimée avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur DELETE facture:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}