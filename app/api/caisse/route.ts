import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Ajoutez cette fonction au début du fichier, après les imports
function extractBancaireInfo(mouvement: any) {
  let numeroDoc = null;
  let banque = null;
  let dateEcheance = null;
  let nameSecondClient = null;

  // 1. Si le mouvement a un detailsMixte (cas des règlements MIXTE)
  if (mouvement.detailsMixte) {
    try {
      const details = typeof mouvement.detailsMixte === 'string'
        ? JSON.parse(mouvement.detailsMixte)
        : mouvement.detailsMixte;

      // Pour les mouvements MIXTE, on cherche le détail correspondant au modeReglement
      if (Array.isArray(details)) {
        const detail = details.find((d: any) => {
          // Correspondance entre le modeReglement du mouvement et le type dans detailsMixte
          if (mouvement.modeReglement === 'CHEQUE' && d.type === 'CHEQUE') return true;
          if (mouvement.modeReglement === 'TRAITE_BANCAIRE' && d.type === 'TRAITE_BANCAIRE') return true;
          if (mouvement.modeReglement === 'TRAITE_DOMICILE' && d.type === 'TRAITE_DOMICILE') return true;
          if (mouvement.modeReglement === 'VIREMENT' && d.type === 'VIREMENT') return true;
          if (mouvement.modeReglement === 'ESPECE' && d.type === 'ESPECE') return true;
          return false;
        });

        if (detail) {
          nameSecondClient = detail.nameSecondClient || null;
          banque = detail.banque || null;
          numeroDoc = detail.reference || null;
          dateEcheance = detail.echeance || null;
        }
      }
    } catch (e) {
      console.error('Erreur parsing detailsMixte:', e);
    }
  }

  // 2. Si pas de detailsMixte mais des champs directs (règlement simple)
  if (!nameSecondClient && mouvement.nameSecondClient) {
    nameSecondClient = mouvement.nameSecondClient;
  }
  if (!banque && mouvement.banque) {
    banque = mouvement.banque;
  }
  if (!numeroDoc && (mouvement.numeroDoc || mouvement.reference)) {
    numeroDoc = mouvement.numeroDoc || mouvement.reference;
  }
  if (!dateEcheance && mouvement.dateEcheance) {
    dateEcheance = mouvement.dateEcheance;
  }
  if (!dateEcheance && mouvement.echeance) {
    dateEcheance = mouvement.echeance;
  }

  return { numeroDoc, banque, dateEcheance, nameSecondClient };
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const dateDebut = searchParams.get('dateDebut') || new Date().toISOString().split('T')[0];
    const dateFin = searchParams.get('dateFin') || dateDebut;
    const chauffeurIdParam = searchParams.get('chauffeurId');
    const showAll = searchParams.get('all') === 'true';

    const startOfDay = new Date(dateDebut);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(dateFin);
    endOfDay.setHours(23, 59, 59, 999);

    // ── MODE: toutes les caisses (admin) ──────────────────────────────────────
    if (user.role === 'ADMIN' && showAll) {
      const allCaisses = await prisma.caisse.findMany({
        where: {
          date: { gte: startOfDay, lte: endOfDay }
        },
        include: {
          mouvements: {
            orderBy: { date: 'desc' },
            take: 100
          },
          chauffeur: true,
        },
      });

      const caissesWithTotals = allCaisses.map((c: any) => {
        const mouvements = (c.mouvements || []).filter(
          (m: any) => m.type !== 'DECAISSEMENTVIRTUEL'
        );

        // Ajouter les infos bancaires aux mouvements
        const mouvementsAvecBancaire = mouvements.map((m: any) => {
          const bancaireInfo = extractBancaireInfo(m);
          return {
            id: m.id,
            date: m.date,
            type: m.type,
            modeReglement: m.modeReglement,
            montant: m.montant,
            reference: m.reference,
            libelle: m.libelle,
            numeroDoc: bancaireInfo.numeroDoc,
            banque: bancaireInfo.banque,
            dateEcheance: bancaireInfo.dateEcheance,
            nameSecondClient: bancaireInfo.nameSecondClient,
          };
        });

        const totalEncaissements = mouvements
          .filter((m: any) => m.type === 'ENCAISSEMENT')
          .reduce((sum: number, m: any) => sum + m.montant, 0);
        const totalDecaissements = mouvements
          .filter((m: any) => m.type === 'DECAISSEMENT')
          .reduce((sum: number, m: any) => sum + m.montant, 0);
        const soldeTheorique = c.soldeOuverture + totalEncaissements - totalDecaissements;

        return {
          ...c,
          mouvements: mouvementsAvecBancaire,
          totalEncaissements,
          totalDecaissements,
          soldeTheorique,
          chauffeurNom: c.chauffeur?.nom || 'Caisse générale',
        };
      });

      return NextResponse.json({
        type: 'all',
        caisses: caissesWithTotals,
        dateDebut: startOfDay,
        dateFin: endOfDay,
      });
    }

    // ── MODE: caisse unique ───────────────────────────────────────────────────
    let whereCondition: any = {
      date: { gte: startOfDay, lte: endOfDay }
    };

    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      whereCondition.chauffeurId = user.chauffeur.id;
    } else if (user.role === 'CHAUFFEUR' && !user.chauffeur) {
      whereCondition.chauffeurId = null;
    } else if (user.role === 'ADMIN' && chauffeurIdParam) {
      whereCondition.chauffeurId = chauffeurIdParam;
    } else if (user.role === 'ADMIN' && !chauffeurIdParam) {
      whereCondition.chauffeurId = null;
    }

    const caisses = await prisma.caisse.findMany({
      where: whereCondition,
      include: {
        mouvements: {
          orderBy: { date: 'desc' }
        },
      },
    });

    // Récupérer TOUS les mouvements
    let tousLesMouvements = caisses.flatMap((c: { mouvements: any[] }) => c.mouvements || []);

    // MODIFICATION : Récupérer les règlements avec leurs detailsMixte
    const mouvementsAvecReglement = await Promise.all(
      tousLesMouvements.map(async (mouvement: any) => {
        // Chercher le règlement correspondant (pour CHEQUE, TRAITE_BANCAIRE, TRAITE_DOMICILE, et MIXTE)
        if (mouvement.reference && (
          mouvement.modeReglement === 'CHEQUE' ||
          mouvement.modeReglement === 'TRAITE_BANCAIRE' ||
          mouvement.modeReglement === 'TRAITE_DOMICILE' ||
          mouvement.modeReglement === 'MIXTE'  // 👈 AJOUTEZ CETTE LIGNE
        )) {
          // Chercher le règlement par référence
          let reglement = await prisma.reglementClient.findFirst({
            where: {
              reference: mouvement.reference,
            },
            select: {
              banque: true,
              nameSecondClient: true,
              echeance: true,
              reference: true,
              detailsMixte: true,
              typeReglement: true,
            }
          });

          // Si pas trouvé par référence, chercher par ID dans le libellé
          if (!reglement && mouvement.libelle) {
            const reglementId = mouvement.libelle.match(/[a-f0-9]{24}/)?.[0];
            if (reglementId) {
              reglement = await prisma.reglementClient.findUnique({
                where: { id: reglementId },
                select: {
                  banque: true,
                  nameSecondClient: true,
                  echeance: true,
                  reference: true,
                  detailsMixte: true,
                  typeReglement: true,
                }
              });
            }
          }

          if (reglement) {
            return {
              ...mouvement,
              banque: reglement.banque,
              nameSecondClient: reglement.nameSecondClient,
              echeance: reglement.echeance,
              detailsMixte: reglement.detailsMixte,  // 👈 IMPORTANT: inclure detailsMixte
              typeReglement: reglement.typeReglement,
            };
          }
        }
        return mouvement;
      })
    );
    tousLesMouvements = mouvementsAvecReglement;

    // Totaux sans les virtuels
    const mouvementsSansVirtuel = tousLesMouvements.filter(
      (m: { type: string; }) => m.type !== 'DECAISSEMENTVIRTUEL'
    );

    const totalEncaissements = mouvementsSansVirtuel
      .filter((m: { type: string }) => m.type === 'ENCAISSEMENT')
      .reduce((sum: number, m: { montant: number }) => sum + m.montant, 0);
    const totalDecaissements = mouvementsSansVirtuel
      .filter((m: { type: string }) => m.type === 'DECAISSEMENT')
      .reduce((sum: number, m: { montant: number }) => sum + m.montant, 0);
    const soldeOuverture = caisses.reduce((sum: number, c: { soldeOuverture: number }) => sum + c.soldeOuverture, 0);
    const soldeTheorique = soldeOuverture + totalEncaissements - totalDecaissements;

    // Si aucune caisse trouvée
    // if (caisses.length === 0) {
    //   const newCaisseData: any = {
    //     date: startOfDay,
    //     soldeOuverture: 0,
    //     totalEncaissements: 0,
    //     totalDecaissements: 0,
    //     soldeTheorique: 0,
    //     statut: 'OUVERTE',
    //   };
    //   if (user.role === 'CHAUFFEUR' && user.chauffeur) {
    //     newCaisseData.chauffeurId = user.chauffeur.id;
    //   } else if (user.role === 'ADMIN' && chauffeurIdParam) {
    //     newCaisseData.chauffeurId = chauffeurIdParam;
    //   }
    //   const nouvelleCaisse = await prisma.caisse.create({
    //     data: newCaisseData,
    //     include: { mouvements: true },
    //   });
    //   return NextResponse.json({
    //     type: 'single',
    //     id: nouvelleCaisse.id,
    //     date: nouvelleCaisse.date,
    //     statut: nouvelleCaisse.statut,
    //     soldeOuverture: 0,
    //     totalEncaissements: 0,
    //     totalDecaissements: 0,
    //     soldeTheorique: 0,
    //     soldeReel: null,
    //     ecart: null,
    //     mouvements: [],
    //     mouvementsAffichage: [],
    //   });
    // }

    // Transformer les mouvements avec les infos bancaires
    const mouvementsAvecBancaire = mouvementsSansVirtuel.map((m: any) => {
      const bancaireInfo = extractBancaireInfo(m);
      return {
        id: m.id,
        date: m.date,
        type: m.type,
        modeReglement: m.modeReglement,
        montant: m.montant,
        reference: m.reference,
        libelle: m.libelle,
        numeroDoc: bancaireInfo.numeroDoc,
        banque: bancaireInfo.banque,
        dateEcheance: bancaireInfo.dateEcheance ? new Date(bancaireInfo.dateEcheance).toISOString().split('T')[0] : null,
        nameSecondClient: bancaireInfo.nameSecondClient,
      };
    });

    return NextResponse.json({
      type: 'single',
      id: caisses[0]?.id,
      date: caisses[0]?.date,
      statut: caisses[0]?.statut || 'OUVERTE',
      soldeOuverture,
      totalEncaissements,
      totalDecaissements,
      soldeTheorique,
      soldeReel: null,
      ecart: null,
      mouvements: tousLesMouvements,
      mouvementsAffichage: mouvementsAvecBancaire,
    });
  } catch (error) {
    console.error('Error fetching cash register:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash register', mouvements: [] },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const body = await req.json();
    const { type, modeReglement, montant, reference, libelle, date } = body;

    if (!type || !modeReglement || !montant || !libelle) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const movementDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(movementDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(movementDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Chercher la caisse du jour
    const whereClause: any = {
      date: { gte: startOfDay, lte: endOfDay }  // ← date: { gte, lte }
    };
    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      whereClause.chauffeurId = user.chauffeur.id;
    } else {
      whereClause.chauffeurId = null;
    }

    let caisse = await prisma.caisse.findFirst({ where: whereClause });

    if (!caisse) {
      caisse = await prisma.caisse.create({
        data: {
          date: startOfDay,  // ← date simple pour la création
          chauffeurId: user.chauffeur ? user.chauffeur.id : null,
          soldeOuverture: 0,
          totalEncaissements: 0,
          totalDecaissements: 0,
          soldeTheorique: 0,
          statut: 'OUVERTE',
        },
      });
    }

    if (caisse.statut === 'CLOTUREE') {
      return NextResponse.json(
        { error: 'Cash register is already closed for this day' },
        { status: 400 }
      );
    }

    const mouvement = await prisma.mouvementCaisse.create({
      data: {
        caisseId: caisse.id,
        type,
        modeReglement,
        montant,
        reference,
        libelle,
        date: movementDate,
      },
    });

    const totalEncaissements = type === 'ENCAISSEMENT'
      ? caisse.totalEncaissements + montant
      : caisse.totalEncaissements;

    const totalDecaissements = type === 'DECAISSEMENT'
      ? caisse.totalDecaissements + montant
      : caisse.totalDecaissements;

    await prisma.caisse.update({
      where: { id: caisse.id },
      data: {
        totalEncaissements,
        totalDecaissements,
        soldeTheorique: caisse.soldeOuverture + totalEncaissements - totalDecaissements,
      },
    });

    return NextResponse.json(mouvement, { status: 201 });

  } catch (error) {
    console.error('Error creating movement:', error);
    return NextResponse.json({ error: 'Failed to create movement' }, { status: 500 });
  }
}