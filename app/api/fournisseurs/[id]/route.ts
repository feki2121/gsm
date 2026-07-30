import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET - Récupérer un fournisseur spécifique
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ⚠️ Important: await params

    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json(fournisseur);
  } catch (error) {
    console.error('Error fetching fournisseur:', error);
    return NextResponse.json(
      { error: 'Failed to fetch fournisseur' },
      { status: 500 }
    );
  }
}

// PUT - Modifier un fournisseur
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params; // ⚠️ Important: await params
    const body = await req.json();
    const { nom, telephone, adresse, email, solde } = body;

    if (!nom || !telephone) {
      return NextResponse.json(
        { error: 'Le nom et le téléphone sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si le fournisseur existe
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });

    if (!existingFournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    const fournisseur = await prisma.fournisseur.update({
      where: { id },
      data: {
        nom,
        telephone,
        adresse,
        email,
        solde: solde !== undefined ? solde : existingFournisseur.solde,
      },
    });

    return NextResponse.json(fournisseur);
  } catch (error) {
    console.error('Error updating fournisseur:', error);
    return NextResponse.json(
      { error: 'Failed to update fournisseur' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un fournisseur
// app/api/fournisseurs/[id]/route.ts - DELETE
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("Tentative de suppression du fournisseur:", id);

    // Vérifier si le fournisseur existe
    const existingFournisseur = await prisma.fournisseur.findUnique({
      where: { id },
    });
    console.log("Fournisseur trouvé:", existingFournisseur?.nom);

    if (!existingFournisseur) {
      console.log("Fournisseur non trouvé");
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier s'il y a des bons d'entrée associés
    const bonsEntreeCount = await prisma.bonEntree.count({
      where: { fournisseurId: id },
    });
    console.log("Nombre de bons d'entrée associés:", bonsEntreeCount);

    if (bonsEntreeCount > 0) {
      console.log("Suppression refusée - a des bons d'entrée");
      return NextResponse.json(
        { error: `Impossible de supprimer ce fournisseur car il est associé à ${bonsEntreeCount} bon(s) d'entrée` },
        { status: 400 }
      );
    }

    // Si on arrive ici, on peut supprimer
    console.log("Suppression autorisée, exécution...");
    await prisma.fournisseur.delete({
      where: { id },
    });
    console.log("Suppression réussie");

    return NextResponse.json(
      { message: 'Fournisseur supprimé avec succès' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error deleting fournisseur:', error);
    return NextResponse.json(
      { error: 'Failed to delete fournisseur' },
      { status: 500 }
    );
  }
}