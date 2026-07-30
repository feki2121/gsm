import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [factures, total] = await Promise.all([
            prisma.factureFournisseur.findMany({
                skip,
                take: limit,
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
            prisma.factureFournisseur.count(),
        ]);

        return NextResponse.json({
            data: factures,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        console.error('Error fetching factures fournisseurs:', error);
        return NextResponse.json(
            { error: 'Failed to fetch factures fournisseurs' },
            { status: 500 }
        );
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { fournisseurId, date, lignes, remise } = body;

        if (!fournisseurId || !lignes || lignes.length === 0) {
            return NextResponse.json(
                { error: 'Fournisseur et au moins une ligne sont requis' },
                { status: 400 }
            );
        }

        const result = await prisma.$transaction(async (tx) => {
            let totalHT = 0;
            let totalTVA = 0;

            const lignesCalculees = await Promise.all(lignes.map(async (ligne: any) => {
                const ligneHT = ligne.quantite * ligne.prixUnitaireHT;
                const ligneTVA = ligneHT * (ligne.tva / 100);
                totalHT += ligneHT;
                totalTVA += ligneTVA;

                // Vérifier le produit ou le créer
                let productId = ligne.productId;

                if (!productId && ligne.newProduct) {
                    // Créer un nouveau produit
                    const newProduct = await tx.product.create({
                        data: {
                            reference: ligne.newProduct.reference,
                            designation: ligne.newProduct.designation,
                            categoryId: ligne.newProduct.categoryId,
                            homeId: ligne.homeId,
                            prixAchat: ligne.prixUnitaireHT,
                            prixVente: ligne.newProduct.prixVente || ligne.prixUnitaireHT * 1.3,
                            quantiteStock: 0,
                            seuilAlerte: ligne.newProduct.seuilAlerte || 5,
                        },
                    });
                    productId = newProduct.id;
                    console.log("✅ Nouveau produit créé:", {
                        id: newProduct.id,
                        reference: newProduct.reference,
                        designation: newProduct.designation
                    });
                }

                return {
                    productId,
                    homeId: ligne.homeId,
                    quantite: ligne.quantite,
                    prixUnitaireHT: ligne.prixUnitaireHT,
                    tva: ligne.tva || 19,
                    totalHT: ligneHT,
                    totalTTC: ligneHT + ligneTVA,
                };
            }));

            const totalTTC = totalHT + totalTVA;
            const remiseValue = remise || 0;
            const totalApresRemise = totalTTC * (1 - remiseValue / 100);

            // Créer la facture
            const facture = await tx.factureFournisseur.create({
                data: {
                    numero: `F-FOUR-${Date.now()}`,
                    date: date ? new Date(date) : new Date(),
                    fournisseurId,
                    totalHT,
                    totalTVA,
                    totalTTC: totalApresRemise,
                    remise: remiseValue,
                    statut: 'IMPAYEE',
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

            // Mettre à jour le stock
            for (const ligne of lignesCalculees) {
                // Mettre à jour StockLocation
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

                // Mettre à jour la quantité globale du produit
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
                        motif: `Facture fournisseur N°${facture.numero}`,
                        date: new Date(),
                    },
                });
            }

            // Mettre à jour le solde du fournisseur
            await tx.fournisseur.update({
                where: { id: fournisseurId },
                data: {
                    solde: { increment: totalApresRemise },
                },
            });

            return facture;
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        console.error('Error creating facture fournisseur:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to create facture' },
            { status: 500 }
        );
    }
}