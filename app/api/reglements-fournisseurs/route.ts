import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;
     
    // Récupérer les filtres
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const fournisseurNom = searchParams.get('fournisseurNom');
    const typeReglement = searchParams.get('typeReglement');
    const statut = searchParams.get('statut');

    // Construire les conditions WHERE
    const where: any = {
      // Exclure uniquement CREDIT, garder MIXTE
      typeReglement: {
        not: 'CREDIT'
      }
    };

    // Filtre par date
    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) {
        where.date.gte = new Date(dateDebut);
      }
      if (dateFin) {
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    // Filtre par fournisseur (recherche par nom)
    if (fournisseurNom && fournisseurNom.trim() !== '') {
      where.fournisseur = {
        nom: {
          contains: fournisseurNom,
        },
      };
    }

    // Filtre par type de règlement (si différent de TOUS)
    if (typeReglement && typeReglement !== 'TOUS') {
      if (typeReglement === 'CREDIT') {
        // Si l'utilisateur filtre spécifiquement CREDIT, on l'exclut quand même
        // Ou on peut retourner un tableau vide
        where.typeReglement = 'CREDIT_IMPOSIBLE'; // Aucun résultat
      } else {
        where.typeReglement = typeReglement;
      }
    }

    // Filtre par statut
    if (statut && statut !== 'TOUS') {
      where.statut = statut;
    }

    const [reglements, total] = await Promise.all([
      prisma.reglementFournisseur.findMany({
        skip,
        take: limit,
        include: {
          fournisseur: true,
        },
        where,
        orderBy: { date: 'desc' },
      }),
      prisma.reglementFournisseur.count({ where }),
    ]);

    return NextResponse.json({
      data: reglements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { dateDebut, dateFin, fournisseurNom, typeReglement, statut },
    });
  } catch (error) {
    console.error('Error fetching reglements fournisseurs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglements fournisseurs' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      fournisseurId,
      montantTotal,
      typeReglement,
      reference,
      banque,
      echeance,
      statut,
      detailsMixte,
    } = body;

    if (!fournisseurId) {
      return NextResponse.json(
        { error: 'Fournisseur requis' },
        { status: 400 }
      );
    }

    // Vérifier que le fournisseur existe
    const fournisseur = await prisma.fournisseur.findUnique({
      where: { id: fournisseurId },
    });

    if (!fournisseur) {
      return NextResponse.json(
        { error: 'Fournisseur non trouvé' },
        { status: 404 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      let reglement;

      // Cas d'un paiement mixte
      if (detailsMixte && Array.isArray(detailsMixte) && detailsMixte.length > 1) {
        const detailsAvecStatut = detailsMixte.map((d: any) => ({
          type: d.type,
          montant: d.montant,
          reference: d.reference,
          banque: d.banque,
          echeance: d.echeance,
          statut: d.type === 'ESPECE' ? 'PAYE' : 'EN_ATTENTE',
          datePaiement: d.type === 'ESPECE' ? new Date().toISOString() : null
        }));

        const tousPayes = detailsAvecStatut.every((d: any) => d.statut === 'PAYE');
        const statutGlobal = tousPayes ? 'PAYE' : 'EN_ATTENTE';

        reglement = await tx.reglementFournisseur.create({
          data: {
            fournisseurId,
            montant: montantTotal,
            typeReglement: 'MIXTE',
            reference: reference || null,
            statut: statutGlobal,
            detailsMixte: JSON.stringify(detailsAvecStatut),
            date: new Date(),
          },
          include: { fournisseur: true },
        });

        // Gérer la caisse pour les espèces
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        let caisse = await tx.caisse.findFirst({ where: { date: today } });
        if (!caisse) {
          caisse = await tx.caisse.create({
            data: {
              date: today,
              soldeOuverture: 0,
              totalEncaissements: 0,
              totalDecaissements: 0,
              soldeTheorique: 0,
              statut: 'OUVERTE',
            },
          });
        }

        // Mouvements de caisse pour les espèces (décaissement)
        const especesMontant = detailsAvecStatut
          .filter((d: any) => d.type === 'ESPECE')
          .reduce((sum: number, d: any) => sum + d.montant, 0);

        if (especesMontant > 0) {
          await tx.mouvementCaisse.create({
            data: {
              caisseId: caisse.id,
              type: 'DECAISSEMENT',
              modeReglement: 'ESPECE',
              montant: especesMontant,
              reference: reglement.id,
              libelle: `Règlement fournisseur: ${fournisseur.nom} - Espèces`,
            },
          });

          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalDecaissements: { increment: especesMontant },
              soldeTheorique: { decrement: especesMontant },
            },
          });
        }
      } 
      // Paiement simple
      else {
        const estImmediat = typeReglement === 'ESPECE';
        const statutReglement = estImmediat ? 'PAYE' : (statut || 'EN_ATTENTE');

        const detailsPaiement = {
          type: typeReglement,
          montant: montantTotal,
          reference: reference,
          banque: banque,
          echeance: echeance,
          statut: statutReglement,
          datePaiement: estImmediat ? new Date().toISOString() : null
        };

        reglement = await tx.reglementFournisseur.create({
          data: {
            fournisseurId,
            montant: montantTotal,
            typeReglement,
            reference: reference || null,
            banque: banque || null,
            echeance: echeance ? new Date(echeance) : null,
            statut: statutReglement,
            detailsMixte: JSON.stringify([detailsPaiement]),
            date: new Date(),
          },
          include: { fournisseur: true },
        });

        // Gérer la caisse pour les espèces
        if (estImmediat && montantTotal > 0) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let caisse = await tx.caisse.findFirst({ where: { date: today } });
          if (!caisse) {
            caisse = await tx.caisse.create({
              data: {
                date: today,
                soldeOuverture: 0,
                totalEncaissements: 0,
                totalDecaissements: 0,
                soldeTheorique: 0,
                statut: 'OUVERTE',
              },
            });
          }

          await tx.mouvementCaisse.create({
            data: {
              caisseId: caisse.id,
              type: 'DECAISSEMENT',
              modeReglement: typeReglement,
              montant: montantTotal,
              reference: reglement.reference || reglement.id,
              libelle: `Règlement fournisseur: ${fournisseur.nom}`,
            },
          });

          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalDecaissements: { increment: montantTotal },
              soldeTheorique: { decrement: montantTotal },
            },
          });
        }
      }

      // Mettre à jour le solde du fournisseur
      await tx.fournisseur.update({
        where: { id: fournisseurId },
        data: {
          solde: { increment: montantTotal },
        },
      });

      return reglement;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating reglement fournisseur:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create reglement fournisseur' },
      { status: 500 }
    );
  }
}