// /app/api/factures/next-number/route.ts
import { NextResponse } from "next/server";
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    // ✅ Récupérer TOUTES les factures avec le format 2026/XXX
    const factures2026 = await prisma.facture.findMany({
      where: {
        numero: {
          startsWith: '2026/',
        },
      },
      orderBy: {
        numero: 'desc',
      },
      select: {
        numero: true,
      },
    });

    console.log(`📊 Factures trouvées au format 2026/: ${factures2026.length}`);

    let nextSeqNumber = 134; // Valeur par défaut

    if (factures2026.length > 0) {
      // ✅ Prendre le dernier numéro et incrémenter
      const lastFacture = factures2026[0];
      const match = lastFacture.numero.match(/\/(\d+)$/);
      if (match) {
        const lastNumber = parseInt(match[1], 10);
        nextSeqNumber = lastNumber + 1;
        console.log(`📝 Dernier numéro trouvé: ${lastNumber}, prochain: ${nextSeqNumber}`);
      }
    } else {
      console.log('📝 Aucune facture 2026/ trouvée, départ à 134');
    }

    // ✅ Vérifier si le numéro existe déjà (sécurité supplémentaire)
    let exists = true;
    let attempts = 0;
    const maxAttempts = 10;

    while (exists && attempts < maxAttempts) {
      const paddedNumber = nextSeqNumber.toString().padStart(3, '0');
      const testNumero = `2026/${paddedNumber}`;
      
      const existing = await prisma.facture.findUnique({
        where: { numero: testNumero },
        select: { id: true },
      });

      if (existing) {
        console.log(`⚠️ Numéro ${testNumero} existe déjà, on passe au suivant`);
        nextSeqNumber++;
        attempts++;
      } else {
        exists = false;
      }
    }

    const year = 2026;
    const paddedNumber = nextSeqNumber.toString().padStart(3, '0');
    const numero = `${year}/${paddedNumber}`;

    console.log(`✅ Prochain numéro généré: ${numero}`);

    return NextResponse.json({ 
      numero,
      debug: {
        totalFactures2026: factures2026.length,
        nextSeqNumber,
        paddedNumber
      }
    });
  } catch (error) {
    console.error("Error generating next number:", error);
    return NextResponse.json(
      { error: "Erreur lors de la génération du numéro" },
      { status: 500 }
    );
  }
}