import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Déballer params (Next.js 16)
    const resolvedParams = await params;
    const inventaireId = resolvedParams.id;
    
    const body = await req.json();
    const { ajusterStock } = body;

    console.log("Validation inventaire ID:", inventaireId);

    const result = await prisma.$transaction(async (tx) => {
      // Récupérer l'inventaire avec ses lignes
      const inventaire = await tx.inventaire.findUnique({
        where: { id: inventaireId },
        include: {
          lignes: {
            include: {
              product: true,
              home: true,
            },
          },
        },
      });

      if (!inventaire) {
        throw new Error('Inventaire non trouvé');
      }

      // Vérifier que toutes les lignes ont été comptées
      // const lignesNonComptees = inventaire.lignes.filter(l => l.quantitePhysique === 0);
      // if (lignesNonComptees.length > 0) {
      //   throw new Error(`${lignesNonComptees.length} produit(s) non comptés. Veuillez compléter l'inventaire.`);
      // }

      // Si demandé, ajuster le stock selon les écarts
      if (ajusterStock) {
        for (const ligne of inventaire.lignes) {
          if (ligne.ecart !== 0) {
            // Mettre à jour StockLocation
            await tx.stockLocation.update({
              where: {
                productId_homeId: {
                  productId: ligne.productId,
                  homeId: ligne.homeId,
                },
              },
              data: {
                quantite: { increment: ligne.ecart },
              },
            });

            // Mettre à jour la quantité globale du produit
            await tx.product.update({
              where: { id: ligne.productId },
              data: {
                quantiteStock: { increment: ligne.ecart },
              },
            });

            // Créer un mouvement de stock pour l'ajustement
            await tx.stockMovement.create({
              data: {
                productId: ligne.productId,
                type: ligne.ecart > 0 ? 'ENTREE' : 'SORTIE',
                quantite: Math.abs(ligne.ecart),
                motif: `Ajustement inventaire ${inventaire.numero} - Écart: ${ligne.ecart > 0 ? 'Surplus' : 'Manquant'}`,
                date: new Date(),
              },
            });

            // Mettre à jour StockParType (type AUCUN pour les ajustements)
            const stockParType = await tx.stockParType.findUnique({
              where: {
                productId_typeBE: {
                  productId: ligne.productId,
                  typeBE: 'AUCUN',
                },
              },
            });

            if (stockParType) {
              await tx.stockParType.update({
                where: {
                  productId_typeBE: {
                    productId: ligne.productId,
                    typeBE: 'AUCUN',
                  },
                },
                data: {
                  quantite: { increment: ligne.ecart },
                },
              });
            } else if (ligne.ecart > 0) {
              await tx.stockParType.create({
                data: {
                  productId: ligne.productId,
                  typeBE: 'AUCUN',
                  quantite: ligne.ecart,
                },
              });
            }
          }
        }
      }

      // Mettre à jour le statut de l'inventaire
      const updatedInventaire = await tx.inventaire.update({
        where: { id: inventaireId },
        data: {
          statut: 'VALIDE',
          dateValidation: new Date(),
          validePar: 'system', // À remplacer par l'utilisateur connecté
        },
        include: {
          lignes: {
            include: {
              product: true,
              home: true,
            },
          },
        },
      });

      return updatedInventaire;
    });

    return NextResponse.json({
      success: true,
      message: ajusterStock 
        ? "Inventaire validé et stock ajusté automatiquement" 
        : "Inventaire validé (stock non ajusté)",
      inventaire: result,
    });
  } catch (error) {
    console.error('Error validating inventaire:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to validate inventaire' },
      { status: 500 }
    );
  }
}