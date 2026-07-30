// app/api/fournisseurs/[id]/extrait/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: fournisseurId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const showOnlyNonSoldes = searchParams.get('showOnlyNonSoldes') === 'true';

    // Récupérer le fournisseur
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
    });

    if (!fournisseur) {
      return NextResponse.json({ error: 'Fournisseur non trouvé' }, { status: 404 });
    }

    const startDate = dateDebut ? new Date(dateDebut) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = dateFin ? new Date(dateFin) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // 1. Récupérer les bons d'entrée (débit)
    const bonsEntree = await prisma.bonEntree.findMany({
      where: {
        fournisseurId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // 2. Récupérer les règlements fournisseurs
    const reglements = await prisma.reglementFournisseur.findMany({
      where: {
        fournisseurId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        bonsEntree: {
          include: { bonEntree: true }
        }
      },
      orderBy: { date: 'asc' },
    });

    // Construire la liste des transactions
    let transactions: any[] = [];

    // Ajouter les bons d'entrée (débit)
    for (const be of bonsEntree) {
      if (showOnlyNonSoldes && be.statut === 'BROUILLON') continue;
      
      transactions.push({
        id: be.id,
        date: be.date, 
        type: 'BON_ENTREE',
        numero: be.numero,
        description: `Bon d'entrée ${be.numero} - ${be.type || 'Achat'}`,
        debit: be.totalTTC,
        credit: 0,
        solde: 0,
        statut: be.statut,
      });
    }

    // Dans la partie où vous traitez les règlements, modifiez pour inclure le numéro de chèque/traite
for (const reglement of reglements) {
  // Pour les règlements MIXTE, on extrait les détails
  if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
    try {
      const details = JSON.parse(reglement.detailsMixte);
      for (const detail of details) {
        if (detail.type === 'CREDIT') {
          // Les crédits sont des débits (à payer)
          // (code existant)
        } else {
          // Les autres types sont des crédits (paiements)
          const estPaye = detail.type === 'ESPECE' || detail.statut === 'PAYE';
          if (showOnlyNonSoldes && estPaye) continue;
          
          transactions.push({
            id: `${reglement.id}-${detail.type}`,
            date: reglement.date,
            type: 'REGLEMENT',
            numero: reglement.reference,
            description: `Règlement ${detail.type}${detail.reference ? ` - ${detail.reference}` : ''}`,
            debit: 0,
            credit: detail.montant,
            solde: 0,
            statut: detail.statut,
            typeReglement: detail.type,
            reference: detail.reference,
            // Ajoutez le numéro de chèque/traite pour les détails mixtes
            numeroChequeTraite: (detail.type === 'CHEQUE' || 
                                 detail.type === 'TRAITE_BANCAIRE' || 
                                 detail.type === 'TRAITE_DOMICILE') ? detail.numeroCheque || detail.reference : null,
            banque: detail.banque || null,
          });
        }
      }
    } catch (e) {
      console.error('Erreur parsing détails mixte:', e);
    }
  } else if (reglement.typeReglement === 'CREDIT') {
    // Les crédits sont des débits
    // (code existant)
  } else {
    // Règlements normaux (ESPECE, CHEQUE, etc.)
    const estPaye = reglement.statut === 'PAYE';
    if (showOnlyNonSoldes && estPaye) continue;
    
    transactions.push({
      id: reglement.id,
      date: reglement.date,
      type: 'REGLEMENT',
      numero: reglement.reference,
      description: `Règlement fournisseur ${reglement.typeReglement}${reglement.reference ? ` - ${reglement.reference}` : ''}`,
      debit: 0,
      credit: reglement.montant,
      solde: 0,
      statut: reglement.statut,
      typeReglement: reglement.typeReglement,
      reference: reglement.reference,
      // Ajoutez le numéro de chèque/traite
      numeroChequeTraite: (reglement.typeReglement === 'CHEQUE' || 
                           reglement.typeReglement === 'TRAITE_BANCAIRE' || 
                           reglement.typeReglement === 'TRAITE_DOMICILE') ? reglement.reference : null,
      banque: reglement.banque || null,
    });
  }
}

    // Trier par date
    transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculer les soldes cumulés
    let soldeCourant = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    transactions = transactions.map(transaction => {
      soldeCourant = soldeCourant + transaction.debit - transaction.credit;
      totalDebit += transaction.debit;
      totalCredit += transaction.credit;
      
      return {
        ...transaction,
        solde: soldeCourant,
      };
    });

    return NextResponse.json({
      fournisseur: {
        id: fournisseur.id,
        nom: fournisseur.nom,
        telephone: fournisseur.telephone,
        email: fournisseur.email,
        adresse: fournisseur.adresse,
        // matriculeFiscale: fournisseur.matriculeFiscale,
        // codePostal: fournisseur.codePostal,
        // rib: fournisseur.rib,
      },
      transactions,
      totalDebit,
      totalCredit,
      soldeFinal: soldeCourant,
      periode: {
        debut: formatDate(startDate),
        fin: formatDate(endDate),
      },
    });
  } catch (error) {
    console.error('Erreur:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la génération de l\'extrait de compte fournisseur' },
      { status: 500 }
    );
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}