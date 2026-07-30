import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';


const roundTo3Decimals = (value: number): number => {
  return Number(value.toFixed(3));
};
interface LigneInput {
  productId: string;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  prixVente: number;
  tva: number;
}

interface LigneCalculee {
  productId: string;
  homeId: string;
  quantite: number;
  prixUnitaireHT: number;
  tva: number;
  totalHT: number;
  totalTTC: number;
  prixVente: number;
}

interface PaiementInput {
  type: string;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  imageUrl?: string | null;
}

// GET - Récupérer un bon d'entrée spécifique
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const bonEntree = await prisma.bonEntree.findUnique({
      where: { id },
      include: {
        fournisseur: true,
        lignes: {
          include: {
            product: true,
            home: true,
          },
        },
        reglements: {
          include: {
            reglement: true,
          },
        },
      },
    });

    if (!bonEntree) {
      return NextResponse.json(
        { error: 'Bon d\'entrée non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(bonEntree);
  } catch (error) {
    console.error('Error fetching bon entree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bon entree' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un bon d'entrée avec mise à jour du stock et des règlements
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { date, fournisseurId, type, referenceDoc, description, lignes, paiements } = body;

    // Vérifier si le BE existe avec ses anciennes données
    const existingBE = await prisma.bonEntree.findUnique({
      where: { id },
      include: {
        lignes: {
          include: { product: true }
        },
        fournisseur: true,
        reglements: {
          include: { reglement: true }
        }
      },
    });

    if (!existingBE) {
      return NextResponse.json(
        { error: 'Bon d\'entrée non trouvé' },
        { status: 404 }
      );
    }

    // Validation des lignes
    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une ligne est requise' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      let totalHT = 0;
      let totalTVA = 0;

      const defaultHome = await tx.home.findFirst({
        where: { nom: 'PRINCIPAL' }
      });

      if (!defaultHome) {
        throw new Error('Entrepôt principal non trouvé');
      }

      // ============================================================
      // 1. ANNULER L'ANCIEN STOCK
      // ============================================================
      for (const oldLigne of existingBE.lignes) {
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: oldLigne.productId,
              homeId: oldLigne.homeId,
            },
          },
        });

        if (stockLocation) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: oldLigne.productId,
                homeId: oldLigne.homeId,
              },
            },
            data: {
              quantite: { decrement: oldLigne.quantite },
            },
          });
        }

        await tx.product.update({
          where: { id: oldLigne.productId },
          data: {
            quantiteStock: { decrement: oldLigne.quantite },
          },
        });

        const stockParType = await tx.stockParType.findUnique({
          where: {
            productId_typeBE: {
              productId: oldLigne.productId,
              typeBE: existingBE.type,
            },
          },
        });

        if (stockParType) {
          await tx.stockParType.update({
            where: {
              productId_typeBE: {
                productId: oldLigne.productId,
                typeBE: existingBE.type,
              },
            },
            data: {
              quantite: { decrement: oldLigne.quantite },
            },
          });
        }
      }

      // ============================================================
      // 2. ANNULER L'ANCIEN SOLDE FOURNISSEUR
      // ============================================================
      if (existingBE.fournisseurId && existingBE.type === 'FAC') {
        await tx.fournisseur.update({
          where: { id: existingBE.fournisseurId },
          data: {
            solde: { decrement: existingBE.totalTTC },
          },
        });
      }

      // ============================================================
      // 3. SUPPRIMER LES ANCIENS RÈGLEMENTS
      // ============================================================
      for (const oldReglement of existingBE.reglements) {
        // Supprimer la liaison
        await tx.reglementFournisseurBE.deleteMany({
          where: {
            reglementId: oldReglement.reglementId,
            bonEntreeId: id
          },
        });

        // Supprimer le règlement lui-même
        await tx.reglementFournisseur.delete({
          where: { id: oldReglement.reglementId },
        });
      }

      // ============================================================
      // 4. CALCULER LES NOUVEAUX TOTAUX
      // ============================================================
      const lignesCalculees: LigneCalculee[] = lignes.map((ligne: LigneInput) => {
        const ligneHT = roundTo3Decimals(ligne.quantite * ligne.prixUnitaireHT);
        const ligneTVA = roundTo3Decimals(ligneHT * (ligne.tva / 100));
        totalHT += ligneHT;
        totalTVA += ligneTVA;

        return {
          productId: ligne.productId,
          homeId: defaultHome.id,
          quantite: ligne.quantite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          tva: ligne.tva || 19,
          totalHT: ligneHT,
          totalTTC: ligneHT + ligneTVA,
          prixVente: ligne.prixVente,
        };
      });

      let totalTTC = totalHT + totalTVA;

      if (type === "FAC") {
        totalTTC = roundTo3Decimals(Number(totalTTC) + 1);
      }


      // ============================================================
      // 5. SUPPRIMER LES ANCIENNES LIGNES
      // ============================================================
      await tx.ligneBonEntree.deleteMany({
        where: { bonEntreeId: id },
      });

      // ============================================================
      // 6. CRÉER LES NOUVELLES LIGNES
      // ============================================================
      await tx.ligneBonEntree.createMany({
        data: lignesCalculees.map((ligne: LigneCalculee) => ({
          bonEntreeId: id,
          productId: ligne.productId,
          homeId: ligne.homeId,
          quantite: ligne.quantite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          tva: ligne.tva,
          totalHT: ligne.totalHT,
          totalTTC: ligne.totalTTC,
        })),
      });

      // ============================================================
      // 7. APPLIQUER LE NOUVEAU STOCK
      // ============================================================
      for (const ligne of lignesCalculees) {
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
        });

        if (stockLocation) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: ligne.productId,
                homeId: ligne.homeId,
              },
            },
            data: {
              quantite: { increment: ligne.quantite },
            },
          });
        } else {
          await tx.stockLocation.create({
            data: {
              productId: ligne.productId,
              homeId: ligne.homeId,
              quantite: ligne.quantite,
            },
          });
        }

        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: { increment: ligne.quantite },
          },
        });

        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            prixVente: roundTo3Decimals(ligne.prixVente),
            prixAchat: roundTo3Decimals(ligne.prixUnitaireHT * (1 + ligne.tva / 100)),
            prixAchatHT: roundTo3Decimals(ligne.prixUnitaireHT),
            tva: roundTo3Decimals(ligne.tva),
          },
        });

        const stockParType = await tx.stockParType.findUnique({
          where: {
            productId_typeBE: {
              productId: ligne.productId,
              typeBE: type || existingBE.type,
            },
          },
        });

        if (stockParType) {
          await tx.stockParType.update({
            where: {
              productId_typeBE: {
                productId: ligne.productId,
                typeBE: type || existingBE.type,
              },
            },
            data: {
              quantite: { increment: ligne.quantite },
            },
          });
        } else {
          await tx.stockParType.create({
            data: {
              productId: ligne.productId,
              typeBE: type || existingBE.type,
              quantite: ligne.quantite,
            },
          });
        }

        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Modification BE ${existingBE.numero}`,
            date: new Date(),
          },
        });
      }

      // ============================================================
      // 8. APPLIQUER LE NOUVEAU SOLDE FOURNISSEUR
      // ============================================================
      if (fournisseurId && type === 'FAC') {
        await tx.fournisseur.update({
          where: { id: fournisseurId },
          data: {
            solde: { increment: totalTTC },
          },
        });
      }

      // ============================================================
      // 9. CRÉER LES NOUVEAUX RÈGLEMENTS (comme dans POST)
      // ============================================================
      if (paiements && paiements.length > 0 && fournisseurId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Si un seul paiement
        if (paiements.length === 1) {
          const paiement = paiements[0];
          const estImmediat = paiement.type === 'ESPECE';
          const statutReglement = estImmediat ? 'PAYE' : 'EN_ATTENTE';

          const detailsPaiement = {
            type: paiement.type,
            montant: paiement.montant,
            reference: paiement.reference,
            banque: paiement.banque,
            echeance: paiement.echeance,
            imageUrl: paiement.imageUrl,
            statut: statutReglement,
            datePaiement: estImmediat ? new Date().toISOString() : null
          };

          const reglement = await tx.reglementFournisseur.create({
            data: {
              fournisseurId: fournisseurId,
              montant: paiement.montant,
              typeReglement: paiement.type,
              reference: paiement.reference || existingBE.numero,
              banque: paiement.banque,
              echeance: paiement.echeance ? new Date(paiement.echeance) : null,
              imageUrl: paiement.imageUrl || null,
              statut: statutReglement,
              detailsMixte: JSON.stringify([detailsPaiement]),
              date: new Date(),
            },
          });

          await tx.reglementFournisseurBE.create({
            data: {
              reglementId: reglement.id,
              bonEntreeId: id,
              montant: paiement.montant,
            },
          });
        }
        // Si plusieurs paiements, créer un règlement MIXTE
        else if (paiements.length > 1) {
          const detailsAvecStatut = paiements.map((paiement: PaiementInput) => {
            const estImmediat = paiement.type === 'ESPECE';
            return {
              type: paiement.type,
              montant: paiement.montant,
              reference: paiement.reference,
              banque: paiement.banque,
              echeance: paiement.echeance,
              imageUrl: paiement.imageUrl,
              montantPaye: estImmediat ? paiement.montant : 0,
              statut: estImmediat ? 'PAYE' : 'EN_ATTENTE',
              datePaiement: estImmediat ? new Date().toISOString() : null
            };
          });

          const montantTotal = paiements.reduce((sum: number, p: PaiementInput) => sum + p.montant, 0);
          const tousPayes = detailsAvecStatut.every((d: any) => d.statut === 'PAYE');
          const statutGlobal = tousPayes ? 'PAYE' : 'EN_ATTENTE';

          const reglement = await tx.reglementFournisseur.create({
            data: {
              fournisseurId: fournisseurId,
              montant: montantTotal,
              typeReglement: 'MIXTE',
              reference: existingBE.numero,
              statut: statutGlobal,
              detailsMixte: JSON.stringify(detailsAvecStatut),
              date: new Date(),
            },
          });

          await tx.reglementFournisseurBE.create({
            data: {
              reglementId: reglement.id,
              bonEntreeId: id,
              montant: montantTotal,
            },
          });
        }
      }

      // ============================================================
      // 10. METTRE À JOUR LE BE
      // ============================================================
      const updatedBE = await tx.bonEntree.update({
        where: { id },
        data: {
          date: date ? new Date(date) : new Date(),
          fournisseurId: fournisseurId || null,
          type: type || 'AUCUN',
          referenceDoc: referenceDoc || null,
          description: description || null,
          totalHT,
          totalTVA,
          totalTTC,
          updatedAt: new Date(),
        },
        include: {
          fournisseur: true,
          lignes: {
            include: { product: true },
          },
          reglements: {
            include: { reglement: true },
          },
        },
      });
      return updatedBE;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating bon entree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bon entree' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un bon d'entrée
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Récupérer l'ID soit des params, soit de l'URL
    let bonEntreeId: string | null = id || null;
    
    // Si pas dans les params, essayer dans l'URL searchParams
    if (!bonEntreeId) {
      const { searchParams } = new URL(req.url);
      bonEntreeId = searchParams.get('id');
    }
    
    // Si toujours pas, essayer dans le corps
    if (!bonEntreeId) {
      try {
        const body = await req.json();
        bonEntreeId = body.id || null;
      } catch (e) {
        console.log("No body or invalid JSON");
      }
    }


    if (!bonEntreeId) {
      console.log("No ID provided");
      return NextResponse.json(
        { error: 'ID du bon d\'entrée requis' },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: any) => {
      
      // 1. Récupérer le bon d'entrée avec toutes ses données
      const bonEntree = await tx.bonEntree.findUnique({
        where: { id: bonEntreeId },
        include: {
          lignes: {
            include: {
              product: true
            }
          },
          reglements: {
            include: {
              reglement: true
            }
          },
          retourFournisseurs: true,
          historiquePrix: true
        }
      });


      if (!bonEntree) {
        throw new Error('Bon d\'entrée non trouvé');
      }


      // 2. Vérifier si le bon est déjà utilisé dans des retours fournisseurs
      if (bonEntree.retourFournisseurs && bonEntree.retourFournisseurs.length > 0) {
        throw new Error('Impossible de supprimer un bon d\'entrée avec des retours fournisseurs associés');
      }

      // 3. Supprimer les règlements associés
      if (bonEntree.reglements && bonEntree.reglements.length > 0) {
        for (const reglementBE of bonEntree.reglements) {
          
          // Supprimer la liaison ReglementFournisseurBE
          await tx.reglementFournisseurBE.delete({
            where: { id: reglementBE.id }
          });

          // Vérifier si le règlement a d'autres liaisons
          const autresLiaisons = await tx.reglementFournisseurBE.count({
            where: { 
              reglementId: reglementBE.reglementId,
              id: { not: reglementBE.id }
            }
          });

          // Si c'était la seule liaison, supprimer le règlement
          if (autresLiaisons === 0) {
            // Vérifier si le règlement a des factures associées
            const facturesLiees = await tx.reglementFactureFournisseur.count({
              where: { reglementId: reglementBE.reglementId }
            });


            if (facturesLiees === 0) {
              await tx.reglementFournisseur.delete({
                where: { id: reglementBE.reglementId }
              });
            }
          }
        }
      }

      // 4. Inverser les mouvements de stock
      // console.log(`Processing ${bonEntree.lignes.length} lignes for stock inversion`);
      for (const ligne of bonEntree.lignes) {
        // console.log(`Processing ligne for product ${ligne.product.designation} (${ligne.productId})`);
        
        // 4.1 Supprimer les mouvements de stock associés
        const deletedMovements = await tx.stockMovement.deleteMany({
          where: {
            productId: ligne.productId,
            motif: `Bon d'entrée ${bonEntree.numero} - Type: ${bonEntree.type || 'AUCUN'}`
          }
        });
        // //   console.log(`Deleted ${deletedMovements.count} stock movements`);

        // 4.2 Inverser le stock par type
        const stockParType = await tx.stockParType.findUnique({
          where: {
            productId_typeBE: {
              productId: ligne.productId,
              typeBE: bonEntree.type || 'AUCUN'
            }
          }
        });

        if (stockParType) {
          const nouvelleQuantite = stockParType.quantite - ligne.quantite;
          // console.log(`StockParType before: ${stockParType.quantite}, after: ${nouvelleQuantite}`);
          
          if (nouvelleQuantite < 0) {
            throw new Error(`Stock insuffisant pour le produit ${ligne.product.designation}`);
          }

          if (nouvelleQuantite === 0) {
            await tx.stockParType.delete({
              where: {
                productId_typeBE: {
                  productId: ligne.productId,
                  typeBE: bonEntree.type || 'AUCUN'
                }
              }
            });
          } else {
            await tx.stockParType.update({
              where: {
                productId_typeBE: {
                  productId: ligne.productId,
                  typeBE: bonEntree.type || 'AUCUN'
                }
              },
              data: {
                quantite: nouvelleQuantite
              }
            });
          }
        } else {
          // //   console.log(`No StockParType found for product ${ligne.productId} and type ${bonEntree.type}`);
        }

        // 4.3 Inverser le stock location
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId
            }
          }
        });

        if (stockLocation) {
          const nouvelleQuantite = stockLocation.quantite - ligne.quantite;
          // //   console.log(`StockLocation before: ${stockLocation.quantite}, after: ${nouvelleQuantite}`);
          
          if (nouvelleQuantite < 0) {
            throw new Error(`Stock insuffisant dans l'entrepôt pour le produit ${ligne.product.designation}`);
          }

          if (nouvelleQuantite === 0) {
            await tx.stockLocation.delete({
              where: {
                productId_homeId: {
                  productId: ligne.productId,
                  homeId: ligne.homeId
                }
              }
            });
          } else {
            await tx.stockLocation.update({
              where: {
                productId_homeId: {
                  productId: ligne.productId,
                  homeId: ligne.homeId
                }
              },
              data: {
                quantite: nouvelleQuantite
              }
            });
          }
        } else {
          // //   console.log(`No StockLocation found for product ${ligne.productId} and home ${ligne.homeId}`);
        }

        // 4.4 Inverser le stock global du produit
        const product = await tx.product.findUnique({
          where: { id: ligne.productId }
        });

        if (product) {
          const nouvelleQuantiteStock = product.quantiteStock - ligne.quantite;
          //  console.log(`Product stock before: ${product.quantiteStock}, after: ${nouvelleQuantiteStock}`);
          
          if (nouvelleQuantiteStock < 0) {
            throw new Error(`Stock global insuffisant pour le produit ${product.designation}`);
          }

          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              quantiteStock: nouvelleQuantiteStock
            }
          });
        }

        // 4.5 Mettre à jour les prix du produit
        // Récupérer le dernier bon d'entrée pour ce produit (hors celui qu'on supprime)
        const dernierBonEntree = await tx.bonEntree.findFirst({
          where: {
            id: { not: bonEntreeId },
            lignes: {
              some: {
                productId: ligne.productId
              }
            }
          },
          orderBy: {
            date: 'desc'
          },
          include: {
            lignes: {
              where: {
                productId: ligne.productId
              },
              take: 1
            }
          }
        });

        if (dernierBonEntree && dernierBonEntree.lignes.length > 0) {
          const derniereLigne = dernierBonEntree.lignes[0];
          // console.log(`Updating product prices from last BE ${dernierBonEntree.numero}`);
          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              prixAchat: derniereLigne.prixUnitaireTTC,
              prixAchatHT: derniereLigne.prixUnitaireHT,
              tva: derniereLigne.tva
            }
          });
        } else {
          await tx.product.update({
            where: { id: ligne.productId },
            data: {
              prixAchat: 0,
              prixAchatHT: 0,
              tva: 19
            }
          });
        }
      }
     
      // 6. Supprimer les lignes du bon d'entrée - CORRECTION ICI
      const deletedLignes = await tx.ligneBonEntree.deleteMany({
        where: { bonEntreeId: bonEntreeId }
      });

      // 7. Supprimer le bon d'entrée
      await tx.bonEntree.delete({
        where: { id: bonEntreeId }
      });

      return {
        message: 'Bon d\'entrée supprimé avec succès',
        deletedBonEntree: {
          id: bonEntree.id,
          numero: bonEntree.numero,
          type: bonEntree.type
        }
      };
    });

    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('Error deleting bon entree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete bon entree' },
      { status: 500 }
    );
  }
} 