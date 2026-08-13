import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

const roundTo3Decimals = (value: number): number => {
  return Number(value.toFixed(3));
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;
    const statut = searchParams.get('statut');
    const type = searchParams.get('type');

    const where: any = {};
    if (statut) where.statut = statut;
    if (type) where.type = type;

    const [bons, total] = await Promise.all([
      prisma.bonEntree.findMany({
        skip,
        take: limit,
        where,
        include: {
          fournisseur: true,
          lignes: {
            include: {
              product: true,
              home: true,
            },
          },
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonEntree.count({ where }),
    ]);

    return NextResponse.json({
      data: bons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bons entree:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bons entree' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fournisseurId, date, lignes, type, referenceDoc, description, paiements } = body;

    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins une ligne est requise' },
        { status: 400 }
      );
    }

    if (paiements && paiements.length > 0 && !fournisseurId) {
      return NextResponse.json(
        { error: 'Un fournisseur est requis pour enregistrer les règlements' },
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
        throw new Error('Entrepôt principal non trouvé. Veuillez créer un entrepôt nommé "PRINCIPAL"');
      }

      // 🔧 ÉTAPE 1: Traiter d'abord tous les nouveaux produits pour générer des codes uniques
      const productsToCreate: any[] = [];
      const processedLignes: any[] = [];

      // ✅ Récupérer TOUS les codes existants en une seule fois
      const currentYear = new Date().getFullYear();
      const existingProducts = await tx.product.findMany({
        where: {
          code: {
            startsWith: `${currentYear}-`,
          },
        },
        select: { code: true }
      });

      // ✅ Créer un Set des codes existants
      const usedCodes = new Set(
        existingProducts.map((p: any) => p.code)
      );

      // Première passe: collecter les nouveaux produits et générer leurs codes
      for (const ligne of lignes) {
        if (!ligne.productId && ligne.newProduct) {
          let productCode = ligne.newProduct.code;

          if (!productCode || productCode.trim() === "") {
            // ✅ Trouver le numéro maximum PARMI TOUS les codes (existants + déjà créés dans cette transaction)
            let maxNumber = 0;

            // Vérifier les codes existants
            for (const code of usedCodes) {
              const codeStr = code as string;
              const match = codeStr.match(new RegExp(`${currentYear}-(\\d+)`));
              if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumber) maxNumber = num;
              }
            }

            // Vérifier les codes déjà générés pour cette transaction
            for (const product of productsToCreate) {
              if (product.code) {
                const match = product.code.match(new RegExp(`${currentYear}-(\\d+)`));
                if (match) {
                  const num = parseInt(match[1]);
                  if (num > maxNumber) maxNumber = num;
                }
              }
            }

            // Générer le prochain code
            let nextNumber = maxNumber + 1;
            let generatedCode = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;

            // ✅ Vérifier que le code est vraiment unique (parmi existants + déjà créés)
            while (usedCodes.has(generatedCode) || productsToCreate.some(p => p.code === generatedCode)) {
              nextNumber++;
              generatedCode = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
            }

            productCode = generatedCode;
          } else {
            // ✅ Vérifier que le code saisi n'existe pas déjà
            if (usedCodes.has(productCode)) {
              throw new Error(`Le code produit "${productCode}" existe déjà en base de données`);
            }

            // Vérifier qu'il n'y a pas de conflit avec d'autres nouveaux produits
            if (productsToCreate.some(p => p.code === productCode)) {
              throw new Error(`Le code produit "${productCode}" est dupliqué entre plusieurs nouveaux produits`);
            }
          }

          // ✅ Ajouter le code à la liste des codes utilisés (pour cette transaction)
          usedCodes.add(productCode);

          productsToCreate.push({
            ...ligne.newProduct,
            code: productCode,
            homeId: defaultHome.id
          });

          processedLignes.push({
            ...ligne,
            generatedCode: productCode,
            willCreateProduct: true
          });
        } else {
          processedLignes.push({
            ...ligne,
            willCreateProduct: false
          });
        }
      }

      // ÉTAPE 2: Créer tous les nouveaux produits en base de données
      const createdProductsMap = new Map();

      for (const productData of productsToCreate) {
        const newProduct = await tx.product.create({
          data: {
            reference: productData.reference,
            code: productData.code,
            designation: productData.designation,
            categoryId: productData.categoryId,
            homeId: productData.homeId,
            prixAchat: productData.prixAchat,
            prixAchatHT: productData.prixAchatHT || 0,
            prixVente: productData.prixVente,
            prixVenteHT: productData.prixVenteHT || 0,
            tva: productData.tva || 19,
            quantiteStock: 0,
            seuilAlerte: productData.seuilAlerte || 5,
            plafondRemise: productData.plafondRemise || 0,
            imageUrl: productData.imageUrl || null,
          },
        });

        createdProductsMap.set(productData.code, newProduct.id);
      }

      // ÉTAPE 3: Traiter les lignes et calculer les totaux
      const lignesCalculees = await Promise.all(processedLignes.map(async (ligne: any) => {
        let productId = ligne.productId;

        // Si c'est un nouveau produit, récupérer l'ID créé
        if (ligne.willCreateProduct && ligne.generatedCode) {
          productId = createdProductsMap.get(ligne.generatedCode);
          if (!productId) {
            throw new Error(`Produit avec code ${ligne.generatedCode} non trouvé après création`);
          }
        }

        const ligneHT = roundTo3Decimals(ligne.quantite * ligne.prixUnitaireHT);
        const ligneTotalTTC = roundTo3Decimals(ligne.quantite * ligne.prixUnitaireTTC);
        const ligneTVA = roundTo3Decimals(ligneTotalTTC - ligneHT);

        totalHT = roundTo3Decimals(totalHT + ligneHT);
        totalTVA = roundTo3Decimals(totalTVA + ligneTVA);

        return {
          productId,
          homeId: defaultHome.id,
          quantite: ligne.quantite,
          prixUnitaireHT: ligne.prixUnitaireHT,
          prixUnitaireTTC: ligne.prixUnitaireTTC,
          prixVente: ligne.prixVente,
          prixVenteHT: roundTo3Decimals(ligne.prixVenteHT || 0),
          tva: ligne.tva || 19,
          totalHT: ligneHT,
          totalTTC: ligneTotalTTC,
          originalLigne: ligne
        };
      }));

      let totalTTC = roundTo3Decimals(lignesCalculees.reduce((sum, ligne) => sum + ligne.totalTTC, 0));

      // Créer le bon d'entrée
      const bonEntree = await tx.bonEntree.create({
        data: {
          numero: `BE-${type || 'AUCUN'}-${Date.now()}`,
          date: date ? new Date(date) : new Date(),
          fournisseurId: fournisseurId || null,
          type: type || 'AUCUN',
          referenceDoc: referenceDoc || null,
          description: description || null,
          statut: 'VALIDE',
          totalHT: totalHT,
          totalTVA: totalTVA,
          totalTTC: totalTTC,
          createdBy: 'system',
          lignes: {
            create: lignesCalculees.map(ligne => ({
              productId: ligne.productId,
              homeId: ligne.homeId,
              quantite: ligne.quantite,
              prixUnitaireHT: ligne.prixUnitaireHT,
              tva: ligne.tva,
              totalHT: ligne.totalHT,
              totalTTC: ligne.totalTTC,
            })),
          },
        },
        include: {
          fournisseur: true,
          lignes: {
            include: {
              product: true,
              home: true,
            },
          },
        },
      });

      // Mettre à jour le stock et les historiques
      for (const ligne of lignesCalculees) {
        // Vérification du plafond de remise
        const product = await tx.product.findUnique({
          where: { id: ligne.productId }
        });

        // Mise à jour du stockLocation
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

        // Mise à jour du stock global
        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            quantiteStock: { increment: ligne.quantite },
          },
        });

        // Mise à jour prix produit
        await tx.product.update({
          where: { id: ligne.productId },
          data: {
            prixVente: ligne.prixVente,
            prixVenteHT: ligne.prixVenteHT || 0,
            prixAchat: ligne.prixUnitaireTTC,
            prixAchatHT: ligne.prixUnitaireHT,
            tva: ligne.tva,
          },
        });

        // Mise à jour stock par type
        const stockParType = await tx.stockParType.findUnique({
          where: {
            productId_typeBE: {
              productId: ligne.productId,
              typeBE: type || 'AUCUN',
            },
          },
        });

        if (stockParType) {
          await tx.stockParType.update({
            where: {
              productId_typeBE: {
                productId: ligne.productId,
                typeBE: type || 'AUCUN',
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
              typeBE: type || 'AUCUN',
              quantite: ligne.quantite,
            },
          });
        }

        // Création mouvement de stock
        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'ENTREE',
            quantite: ligne.quantite,
            motif: `Bon d'entrée ${bonEntree.numero} - Type: ${type || 'AUCUN'}`,
            date: new Date(),
          },
        });
      }

      // Gérer les règlements fournisseurs
      if (paiements && paiements.length > 0 && fournisseurId) {
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
              reference: paiement.reference || bonEntree.numero,
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
              bonEntreeId: bonEntree.id,
              montant: paiement.montant,
            },
          });
        } else {
          const detailsAvecStatut = paiements.map((paiement: any) => {
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

          const montantTotal = paiements.reduce((sum: number, p: any) => sum + p.montant, 0);
          const tousPayes = detailsAvecStatut.every((d: any) => d.statut === 'PAYE');
          const statutGlobal = tousPayes ? 'PAYE' : 'EN_ATTENTE';

          const reglement = await tx.reglementFournisseur.create({
            data: {
              fournisseurId: fournisseurId,
              montant: montantTotal,
              typeReglement: 'MIXTE',
              reference: bonEntree.numero,
              statut: statutGlobal,
              detailsMixte: JSON.stringify(detailsAvecStatut),
              date: new Date(),
            },
          });

          await tx.reglementFournisseurBE.create({
            data: {
              reglementId: reglement.id,
              bonEntreeId: bonEntree.id,
              montant: montantTotal,
            },
          });
        }
      }

      return bonEntree;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating bon entree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bon entree' },
      { status: 500 }
    );
  }
}