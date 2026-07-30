import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Déballer params (Next.js 16)
    const resolvedParams = await params;
    const inventaireId = resolvedParams.id;
    
    const body = await req.json();
    const { ligneId, quantitePhysique, commentaire } = body;

    const ligne = await prisma.$transaction(async (tx) => {
      // Récupérer la ligne
      const existingLigne = await tx.ligneInventaire.findUnique({
        where: { id: ligneId },
      });

      if (!existingLigne) {
        throw new Error('Ligne non trouvée');
      }

      // Calculer l'écart
      const ecart = quantitePhysique - existingLigne.quantiteTheorique;

      // Mettre à jour la ligne
      const updatedLigne = await tx.ligneInventaire.update({
        where: { id: ligneId },
        data: {
          quantitePhysique,
          ecart,
          commentaire: commentaire || null,
        },
      });

      return updatedLigne;
    });

    return NextResponse.json(ligne);
  } catch (error) {
    console.error('Error updating ligne inventaire:', error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}