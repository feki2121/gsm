// app/api/clients/[id]/extrait/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { StatutBL } from '@/lib/types';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { id: clientId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const showOnlyNonSoldes = searchParams.get('showOnlyNonSoldes') === 'true';

    // Récupérer le client
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: {
        addresses: true,
      },
    });

    if (!client) {
      return NextResponse.json({ error: 'Client non trouvé' }, { status: 404 });
    }

    const startDate = dateDebut ? new Date(dateDebut) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = dateFin ? new Date(dateFin) : new Date();
    endDate.setHours(23, 59, 59, 999);

    // 1. Récupérer les factures
    const factures = await prisma.facture.findMany({
      where: {
        clientId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // 2. Récupérer les bons de livraison
    const bonsLivraison = await prisma.bonLivraison.findMany({
      where: {
        clientId,
        date: { gte: startDate, lte: endDate },
      },
      orderBy: { date: 'asc' },
    });

    // 3. Récupérer les règlements (y compris ceux avec CREDIT)
    const reglements = await prisma.reglementClient.findMany({
      where: {
        clientId,
        date: { gte: startDate, lte: endDate },
      },
      include: {
        bonLivraisons: {
          include: { bonLivraison: true }
        }
      },
      orderBy: { date: 'asc' },
    });

    // Construire la liste des transactions
    let transactions: any[] = [];

    // Ajouter les factures (débit)
    for (const facture of factures) {
      if (showOnlyNonSoldes && facture.statut === 'PAYEE') continue;

      transactions.push({
        id: facture.id,
        date: facture.date,
        type: 'FACTURE',
        numero: facture.numero,
        description: `Facture ${facture.numero}`,
        debit: facture.totalTTC,
        credit: 0,
        solde: 0,
        statut: facture.statut,
      });
    }

    // Ajouter les BL (débit)
    for (const bl of bonsLivraison) {
      //if (showOnlyNonSoldes && bl.statut === 'PAYE') continue;
      if (showOnlyNonSoldes && bl.statut === StatutBL.LIVRE) continue;
      transactions.push({
        id: bl.id,
        date: bl.date,
        type: 'BON_LIVRAISON',
        numero: bl.numero,
        description: `Bon de livraison ${bl.numero}`,
        debit: bl.montantTotal,
        credit: 0,
        solde: 0,
        statut: bl.statut,
      });
    }

    // Ajouter les règlements (crédit)
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
              const estEncaisse = detail.type === 'ESPECE' || detail.montantEncaisse > 0;
              if (showOnlyNonSoldes && estEncaisse) continue;

              transactions.push({
                id: `${reglement.id}-${detail.type}`,
                date: reglement.date,
                type: 'REGLEMENT',
                numero: reglement.reference,
                description: `Règlement ${detail.type}${detail.reference ? ` - ${detail.reference}` : ''}`,
                debit: 0,
                credit: detail.montant - (detail.montantEncaisse || 0),
                solde: 0,
                statut: detail.statut || (estEncaisse ? 'ENCAISSE' : 'EN_ATTENTE'),
                typeReglement: detail.type,
                reference: detail.reference,
                numeroChequeTraite: (detail.type === 'CHEQUE' || detail.type === 'TRAITE_BANCAIRE' || detail.type === 'TRAITE_DOMICILE') ? detail.numeroCheque || detail.reference : null,
              });
            }
          }
        } catch (e) {
          console.error('Erreur parsing détails mixte:', e);
        }
      }
      else if (reglement.typeReglement === 'CREDIT') {
        // Les crédits sont des débits
        // (code existant)
      } else {
        // Règlements normaux (ESPECE, CHEQUE, etc.)
        const estEncaisse = reglement.statut === 'ENCAISSE';
        if (showOnlyNonSoldes && estEncaisse) continue;

        transactions.push({
          id: reglement.id,
          date: reglement.date,
          type: 'REGLEMENT',
          numero: reglement.reference,
          description: `Règlement ${reglement.typeReglement}${reglement.reference ? ` - ${reglement.reference}` : ''}`,
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

    // Remplacer cette partie dans l'objet client retourné :

    return NextResponse.json({
      client: {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        email: client.email,
        adresse: client.addresses.find((addr: any) => addr.estPrincipale)?.adresse || client.addresses[0]?.adresse || null,
        codePostal: client.addresses.find((addr: any) => addr.estPrincipale)?.codePostal || client.addresses[0]?.codePostal || null,
        matriculeFiscale: client.mf,
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
      { error: 'Erreur lors de la génération de l\'extrait de compte' },
      { status: 500 }
    );
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}