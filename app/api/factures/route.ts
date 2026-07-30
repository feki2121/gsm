import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// Version simplifiée - retourne TOUTES les factures sans pagination
export async function GET(req: NextRequest) {
    try {
        const factures = await prisma.facture.findMany({
            include: {
                client: {
                    include: {
                        addresses: true
                    }
                },
                lignes: {
                    include: {
                        product: true,
                        home: true,
                    },
                },
                bonLivraisonRef: true,
            },
            orderBy: { date: 'desc' },
        });

        return NextResponse.json({
            data: factures,
        });
    } catch (error) {
        console.error('Error fetching factures:', error);
        return NextResponse.json(
            { error: 'Failed to fetch factures' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            numero,
            clientId,
            bonLivraisonId,
            bonsLivraisonIds,
            totalHT,
            totalTVA,
            totalTTC,
            remise,
            statut,
            type,
            lignes
        } = body;

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
            // 1. Si la facture est créée à partir d'un BL, vérifier que le BL existe
            if (bonLivraisonId) {
                const bonLivraison = await tx.bonLivraison.findUnique({
                    where: { id: bonLivraisonId },
                    include: { lignes: true },
                });

                if (!bonLivraison) {
                    throw new Error('Bon de livraison non trouvé');
                }

                // Vérifier qu'une facture n'existe pas déjà pour ce BL
                const existingFacture = await tx.facture.findFirst({
                    where: { bonLivraisonId },
                });

                if (existingFacture) {
                    throw new Error('Une facture existe déjà pour ce bon de livraison');
                }
            }

            // 2. Créer la facture
            const facture = await tx.facture.create({
                data: {
                    numero,
                    date: new Date(),
                    clientId,
                    bonLivraisonId: bonLivraisonId || null,  // ✅ Peut être null
                    totalHT,
                    totalTVA,
                    totalTTC: totalTTC || (totalHT + totalTVA),
                    remise: remise || 0,
                    statut: statut || 'IMPAYEE',
                    type: type || 'DIRECTE',
                    lignes: {
                        create: lignes.map((l: any) => ({
                            productId: l.productId,
                            homeId: l.homeId || null,
                            quantite: l.quantite,
                            prixUnitaire: l.prixUnitaire,
                            tva: l.tva || 19,
                            remiseLigne: l.remiseLigne
                        })),
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

            // 3. Gestion du stock : NE PAS diminuer si la facture vient d'un BL
            //    (le stock a déjà été diminué lors de la création du BL)
            if (!bonLivraisonId) {
                // Cas 1: Facture directe → Diminuer le stock
                // Dans la transaction, remplacez la vérification de stock par :

                // Vérifier le stock FAC pour chaque produit
                for (const ligne of lignes) {
                    // Vérifier le stock de type FAC uniquement
                    const stockFAC = await tx.stockParType.findUnique({
                        where: {
                            productId_typeBE: {
                                productId: ligne.productId,
                                typeBE: 'FAC',
                            },
                        },
                    });

                    const quantiteFAC = stockFAC?.quantite || 0;

                    if (quantiteFAC < ligne.quantite) {
                        const product = await tx.product.findUnique({
                            where: { id: ligne.productId },
                        });
                        throw new Error(
                            `Stock FAC insuffisant pour "${product?.designation}". ` +
                            `Stock FAC disponible: ${quantiteFAC}, Demandé: ${ligne.quantite}. ` +
                            `Le stock provenant des factures fournisseurs est insuffisant pour cette vente.`
                        );
                    }
                }

                // Puis, après création de la facture, diminuer le stock FAC uniquement
                for (const ligne of lignes) {
                    // Diminuer le stock FAC
                    await tx.stockParType.update({
                        where: {
                            productId_typeBE: {
                                productId: ligne.productId,
                                typeBE: 'FAC',
                            },
                        },
                        data: {
                            quantite: { decrement: ligne.quantite },
                        },
                    });

                    // Diminuer aussi le stock total du produit
                    await tx.product.update({
                        where: { id: ligne.productId },
                        data: {
                            quantiteStock: { decrement: ligne.quantite },
                        },
                    });

                    // Créer un mouvement de stock
                    await tx.stockMovement.create({
                        data: {
                            productId: ligne.productId,
                            type: 'SORTIE',
                            quantite: ligne.quantite,
                            motif: `Facture client - Vente`,
                            date: new Date(),
                        },
                    });
                }
            } else {
                // Cas 2: Facture créée à partir d'un BL → NE PAS diminuer le stock
                // (le stock a déjà été diminué lors de la création du BL)
                console.log(`Facture créée à partir du BL ${bonLivraisonId} - Stock non modifié`);
            }

            // 4. Mettre à jour le solde du client
            const totalFacture = totalTTC || (totalHT + totalTVA);
            await tx.client.update({
                where: { id: clientId },
                data: {
                    solde: { increment: totalFacture },
                },
            });

            // 5. Si la facture est créée à partir d'un BL, mettre à jour la référence
            if (bonLivraisonId) {
                await tx.bonLivraison.update({
                    where: { id: bonLivraisonId },
                    data: {
                        factureId: facture.id,
                        statut: 'LIVRE',  // Optionnel: marquer le BL comme livré
                    },
                });
            }


            if (bonsLivraisonIds && bonsLivraisonIds.length > 0) {
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

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating facture:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create facture' },
            { status: 500 }
        );
    }
}