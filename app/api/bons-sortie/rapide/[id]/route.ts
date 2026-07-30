import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function generateNumeroBonSortie(): Promise<string> {
  const date = new Date();
  const year = date.getFullYear();
  
  const count = await prisma.bonSortie.count({
    where: {
      date: { 
        gte: new Date(year, 0, 1),
        lt: new Date(year + 1, 0, 1),
      }
    }
  });
  
  const sequence = String(count + 1).padStart(3, '0');
  return `${year}/${sequence}`;
}

// GET - Récupérer un bon de sortie rapide par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID non fourni' },
        { status: 400 }
      );
    }

    const bonSortie = await prisma.bonSortie.findUnique({
      where: { id },
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

    if (!bonSortie) {
      return NextResponse.json(
        { error: 'Bon de sortie non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(bonSortie);
  } catch (error) {
    console.error('Erreur GET bon-sortie-rapide:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un bon de sortie rapide
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      homeId,
      destination,
      nomConducteur,
      matriculeVehicule,
      numCIN,
      dateDebut,
      dateFin,
      clientId,
      destinataire,
      adresseLivraison,
      observation,
      produits,
    } = body;

    console.log("Mise à jour du bon de sortie:", { id, homeId, produits });

    // Vérifier si le bon de sortie existe
    const existingBonSortie = await prisma.bonSortie.findUnique({
      where: { id },
      include: { lignes: true },
    });

    if (!existingBonSortie) {
      return NextResponse.json(
        { error: 'Bon de sortie non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier les stocks disponibles (en tenant compte des anciennes lignes)
    for (const produit of produits) {
      if (produit.quantiteSortie <= 0) continue;

      // Calculer la quantité précédemment utilisée pour ce produit
      const ancienneLigne = existingBonSortie.lignes.find(
        (ligne: { productId: any }) => ligne.productId === produit.productId
      );
      const ancienneQuantite = ancienneLigne?.quantite || 0;

      // Nouvelle quantité à vérifier (différence si c'est une augmentation)
      const quantiteNecessaire = produit.quantiteSortie - ancienneQuantite;

      if (quantiteNecessaire > 0) {
        const stockLocation = await prisma.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: produit.productId,
              homeId: homeId,
            },
          },
        });

        if (!stockLocation || stockLocation.quantite < quantiteNecessaire) {
          const product = await prisma.product.findUnique({
            where: { id: produit.productId }
          });
          return NextResponse.json(
            { 
              error: `Stock insuffisant pour ${product?.designation}. Disponible: ${stockLocation?.quantite || 0}, Demandé supplémentaire: ${quantiteNecessaire}` 
            },
            { status: 400 }
          );
        }
      }
    }

    // Préparer les nouvelles lignes
    const lignesCalculees: { productId: any; homeId: any; quantite: any; prixUnitaireHT: any; prixUnitaireTTC: number; remise: number; totalHT: number; totalTTC: number; tva: number; }[] = [];
    let totalHT = 0;
    let totalTTC = 0;

    for (const produit of produits) {
      if (produit.quantiteSortie <= 0) continue;

      const prixUnitaireHT = produit.prixUnitaireHT;
      const prixUnitaireTTC = prixUnitaireHT * 1.19;
      const ligneHT = produit.quantiteSortie * prixUnitaireHT;
      const ligneTTC = produit.quantiteSortie * prixUnitaireTTC;

      totalHT += ligneHT;
      totalTTC += ligneTTC;

      lignesCalculees.push({
        productId: produit.productId,
        homeId: homeId,
        quantite: produit.quantiteSortie,
        prixUnitaireHT: prixUnitaireHT,
        prixUnitaireTTC: prixUnitaireTTC,
        remise: 0,
        totalHT: ligneHT,
        totalTTC: ligneTTC,
        tva: 19
      });
    }

    if (lignesCalculees.length === 0) {
      return NextResponse.json(
        { error: 'Aucun produit sélectionné' },
        { status: 400 }
      );
    }

    // Mettre à jour le bon de sortie
    const bonSortie = await prisma.$transaction(async (tx: any) => {
      // Supprimer les anciennes lignes (correction: ligneBonSortie avec majuscule)
      await tx.ligneBonSortie.deleteMany({
        where: { bonSortieId: id },
      });

      // Mettre à jour le bon de sortie
      const updated = await tx.bonSortie.update({
        where: { id },
        data: {
          dateDebut: new Date(dateDebut),
          dateFin: new Date(dateFin),
          destination,
          nomConducteur,
          matriculeVehicule,
          numCIN,
          clientId: clientId || null,
          destinataire: clientId ? "" : (destinataire || ""),
          adresseLivraison: adresseLivraison || null,
          observation: observation || null,
          totalHT,
          totalTTC,
          updatedAt: new Date(),
          lignes: {
            create: lignesCalculees,
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

      return updated;
    });

    return NextResponse.json(bonSortie);
  } catch (error) {
    console.error('Erreur PUT bon-sortie-rapide:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un bon de sortie rapide
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier si le bon de sortie existe
    const bonSortie = await prisma.bonSortie.findUnique({
      where: { id },
    });

    if (!bonSortie) {
      return NextResponse.json(
        { error: 'Bon de sortie non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le bon de sortie (les lignes seront supprimées automatiquement grâce à onDelete: Cascade)
    await prisma.bonSortie.delete({
      where: { id },
    });

    return NextResponse.json(
      { message: 'Bon de sortie supprimé avec succès' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Erreur DELETE bon-sortie-rapide:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}