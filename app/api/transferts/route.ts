import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all transferts with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10000');
    const skip = (page - 1) * limit;

    const [transferts, total] = await Promise.all([
      prisma.transfertStock.findMany({
        skip,
        take: limit,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          sourceHome: true,
          destinationHome: true,
        },
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.transfertStock.count(),
    ]);

    // Grouper les transferts par lot (même numero s'ils ont un suffixe)
    const groupedTransferts = transferts.reduce((acc: any[], transfert) => {
      const baseNumero = transfert.numero.split('-part-')[0];
      const existing = acc.find(t => t.lotNumero === baseNumero);
      
      if (existing) {
        existing.transferts.push(transfert);
        existing.totalQuantite += transfert.quantite;
        existing.products.push({
          product: transfert.product,
          quantite: transfert.quantite
        });
      } else {
        acc.push({
          id: transfert.id,
          lotNumero: baseNumero,
          date: transfert.date,
          sourceHome: transfert.sourceHome,
          destinationHome: transfert.destinationHome,
          motif: transfert.motif,
          statut: transfert.statut,
          transferts: [transfert],
          totalQuantite: transfert.quantite,
          products: [{
            product: transfert.product,
            quantite: transfert.quantite
          }]
        });
      }
      return acc;
    }, []);

    return NextResponse.json({
      data: groupedTransferts,
      pagination: {
        page,
        limit,
        total: groupedTransferts.length,
        pages: Math.ceil(groupedTransferts.length / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transferts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transferts' },
      { status: 500 }
    );
  }
}

// POST create multiple transferts (grouped)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sourceHomeId,
      destinationHomeId,
      produits, // [{ productId, quantite }]
      motif,
    } = body;

    // Validation
    if (!sourceHomeId || !destinationHomeId || !produits || produits.length === 0) {
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      );
    }

    if (sourceHomeId === destinationHomeId) {
      return NextResponse.json(
        { error: 'La source et la destination ne peuvent pas être identiques' },
        { status: 400 }
      );
    }

    // Vérifier les stocks pour chaque produit
    for (const produit of produits) {
      const sourceStock = await prisma.stockLocation.findUnique({
        where: {
          productId_homeId: {
            productId: produit.productId,
            homeId: sourceHomeId,
          },
        },
      });

      if (!sourceStock || sourceStock.quantite < produit.quantite) {
        const product = await prisma.product.findUnique({
          where: { id: produit.productId },
        });
        return NextResponse.json(
          { error: `Stock insuffisant pour ${product?.designation}. Disponible: ${sourceStock?.quantite || 0}` },
          { status: 400 }
        );
      }
    }

    // Générer un numéro de lot commun
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await prisma.transfertStock.count({
      where: {
        date: {
          gte: new Date(today.setHours(0, 0, 0, 0)),
          lt: new Date(today.setHours(23, 59, 59, 999)),
        },
      },
    });
    const lotNumero = `TRF-${dateStr}-${(count + 1).toString().padStart(3, '0')}`;

    const createdTransferts = [];

    // Créer un transfert par produit
    for (let i = 0; i < produits.length; i++) {
      const produit = produits[i];
      const numero = `${lotNumero}-part-${(i + 1).toString().padStart(2, '0')}`;

      const result = await prisma.$transaction(async (tx) => {
        // 1. Créer le transfert
        const transfert = await tx.transfertStock.create({
          data: {
            numero,
            productId: produit.productId,
            sourceHomeId,
            destinationHomeId,
            quantite: produit.quantite,
            motif: motif || `Transfert groupé - ${produits.length} produits`,
            statut: 'VALIDE',
            validePar: 'system',
            dateValidation: new Date(),
          },
          include: {
            product: true,
            sourceHome: true,
            destinationHome: true,
          },
        });

        // 2. Réduire le stock dans l'emplacement source
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: produit.productId,
              homeId: sourceHomeId,
            },
          },
          data: {
            quantite: {
              decrement: produit.quantite,
            },
          },
        });

        // 3. Ajouter ou créer le stock dans l'emplacement destination
        const destStock = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: produit.productId,
              homeId: destinationHomeId,
            },
          },
        });

        if (destStock) {
          await tx.stockLocation.update({
            where: {
              productId_homeId: {
                productId: produit.productId,
                homeId: destinationHomeId,
              },
            },
            data: {
              quantite: {
                increment: produit.quantite,
              },
            },
          });
        } else {
          await tx.stockLocation.create({
            data: {
              productId: produit.productId,
              homeId: destinationHomeId,
              quantite: produit.quantite,
            },
          });
        }

        // 4. Mettre à jour la quantité totale du produit
        const totalStock = await tx.stockLocation.aggregate({
          where: { productId: produit.productId },
          _sum: { quantite: true },
        });

        await tx.product.update({
          where: { id: produit.productId },
          data: {
            quantiteStock: totalStock._sum.quantite || 0,
          },
        });

        // 5. Créer les mouvements de stock
        await tx.stockMovement.create({
          data: {
            productId: produit.productId,
            type: 'SORTIE',
            quantite: produit.quantite,
            motif: `Transfert #${lotNumero} - vers ${transfert.destinationHome.nom}`,
          },
        });

        await tx.stockMovement.create({
          data: {
            productId: produit.productId,
            type: 'ENTREE',
            quantite: produit.quantite,
            motif: `Transfert #${lotNumero} - depuis ${transfert.sourceHome.nom}`,
          },
        });

        return transfert;
      });

      createdTransferts.push(result);
    }

    return NextResponse.json({
      success: true,
      lotNumero,
      transferts: createdTransferts,
      totalProduits: produits.length,
      totalQuantite: produits.reduce((sum: any, p: { quantite: any; }) => sum + p.quantite, 0),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating transferts:', error);
    return NextResponse.json(
      { error: 'Failed to create transferts' },
      { status: 500 }
    );
  }
}