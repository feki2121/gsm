import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST create facture from bon livraison
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { bonLivraisonId, numero, remise } = body;

    if (!bonLivraisonId || !numero) {
      return NextResponse.json(
        { error: 'bonLivraisonId et numero sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que le BL existe et n'a pas déjà une facture associée
    const bonLivraison = await prisma.bonLivraison.findUnique({
      where: { id: bonLivraisonId },
      include: {
        client: true,
        lignes: { include: { product: true, home: true } },
        factures: true, // vérifier s'il y a déjà une facture
      },
    });

    if (!bonLivraison) {
      return NextResponse.json(
        { error: 'Bon de livraison non trouvé' },
        { status: 404 }
      );
    }

    if (bonLivraison.factures.length > 0) {
      return NextResponse.json(
        { error: 'Une facture existe déjà pour ce bon de livraison' },
        { status: 400 }
      );
    }

    // Calculer les totaux
    let totalHT = 0;
    let totalTVA = 0;

    const lignesFacture = bonLivraison.lignes.map(ligne => {
      const prixUnitaire = ligne.product.prixVente;
      const montantHT = ligne.quantite * prixUnitaire;
      const montantTVA = montantHT * (ligne.product.tva || 19) / 100;

      totalHT += montantHT;
      totalTVA += montantTVA;

      return {
        productId: ligne.productId,
        homeId: ligne.homeId, // utiliser le même emplacement que le BL
        quantite: ligne.quantite,
        prixUnitaire: prixUnitaire,
        tva: ligne.product.tva || 19,
      };
    });

    const totalTTC = totalHT + totalTVA - (remise || 0);

    // Créer la facture (le stock a déjà été diminué lors de la création du BL)
    const facture = await prisma.facture.create({
      data: {
        numero,
        clientId: bonLivraison.clientId,
        bonLivraisonId: bonLivraisonId,
        totalHT,
        totalTVA,
        totalTTC,
        remise: remise || 0,
        statut: 'IMPAYEE',
        type: 'DIRECTE',
        lignes: {
          createMany: {
            data: lignesFacture,
          },
        },
      },
      include: {
        client: true,
        lignes: { include: { product: true, home: true } },
        bonLivraisonRef: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Facture créée avec succès à partir du bon de livraison',
      data: facture
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating facture from BL:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erreur lors de la création de la facture' },
      { status: 500 }
    );
  }
}