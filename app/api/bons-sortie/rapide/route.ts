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

export async function POST(request: NextRequest) {
  try {
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
      produits
    } = body;

    console.log("Received data:", { homeId, destination, produits });

    // Vérifier les stocks disponibles
    for (const produit of produits) {
      if (produit.quantiteSortie <= 0) continue;
      
      const stockLocation = await prisma.stockLocation.findUnique({
        where: {
          productId_homeId: {
            productId: produit.productId,
            homeId: homeId,
          },
        },
      });

      if (!stockLocation || stockLocation.quantite < produit.quantiteSortie) {
        const product = await prisma.product.findUnique({
          where: { id: produit.productId }
        });
        return NextResponse.json(
          { 
            error: `Stock insuffisant pour ${product?.designation}. Disponible: ${stockLocation?.quantite || 0}, Demandé: ${produit.quantiteSortie}` 
          },
          { status: 400 }
        );
      }
    }

    // Préparer les lignes de bon de sortie
    const lignes = [];
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
      
      lignes.push({
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

    if (lignes.length === 0) {
      return NextResponse.json(
        { error: "Aucun produit sélectionné" },
        { status: 400 }
      );
    }

    const numero = await generateNumeroBonSortie();

    // Création du bon de sortie avec les lignes
    const bonSortie = await prisma.bonSortie.create({
      data: {
        numero,
        date: new Date(),
        dateDebut: new Date(dateDebut),
        dateFin: new Date(dateFin),
        destination,
        nomConducteur,
        matriculeVehicule,
        numCIN,
        clientId: clientId || null,
        destinataire: clientId ? "" : (destinataire || ""),
        motif: "VENTE",
        adresseLivraison: adresseLivraison || null,
        observation: observation || null,
        totalHT,
        totalTTC,
        createdBy: 'system',
        statut: 'BROUILLON',
        lignes: {
          create: lignes.map(ligne => ({
            productId: ligne.productId,
            homeId: ligne.homeId,
            quantite: ligne.quantite,
            prixUnitaireHT: ligne.prixUnitaireHT,
            prixUnitaireTTC: ligne.prixUnitaireTTC,
            remise: ligne.remise,
            totalHT: ligne.totalHT,
            totalTTC: ligne.totalTTC,
            tva: ligne.tva
          }))
        }
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

    return NextResponse.json(bonSortie, { status: 201 });
  } catch (error) {
    console.error('Erreur POST bon-sortie-rapide:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur serveur' },
      { status: 500 }
    );
  }
}