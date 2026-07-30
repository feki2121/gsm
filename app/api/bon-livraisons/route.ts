import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// Fonction utilitaire pour créer une date UTC sans décalage
function createUTCDate(dateStr: string, isEndOfDay: boolean = false): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (isEndOfDay) {
    date.setUTCHours(23, 59, 59, 999);
  } else {
    date.setUTCHours(0, 0, 0, 0);
  }
  return date;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const skip = (page - 1) * limit;

    // Récupérer les filtres
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const clientId = searchParams.get('clientId');
    const homeId = searchParams.get('homeId');

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Construire la clause WHERE
    let whereClause: any = {};

    // Filtre par chauffeur
    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      whereClause.chauffeurId = user.chauffeur.id;
    }

    // Filtre par plage de dates avec correction UTC
    if (dateDebut && dateDebut !== 'undefined' && dateDebut !== 'null') {
      whereClause.date = {
        ...whereClause.date,
        gte: createUTCDate(dateDebut, false)
      };
    }

    if (dateFin && dateFin !== 'undefined' && dateFin !== 'null') {
      whereClause.date = {
        ...whereClause.date,
        lte: createUTCDate(dateFin, true)
      };
    }

    // Filtre par client
    if (clientId && clientId !== 'all' && clientId !== 'undefined') {
      whereClause.clientId = clientId;
    }

    // Filtre par emplacement
    if (homeId && homeId !== 'all' && homeId !== 'undefined') {
      whereClause.lignes = {
        some: {
          homeId: homeId
        }
      };
    }

    const [bonLivraisons, total] = await Promise.all([
      prisma.bonLivraison.findMany({
        skip,
        take: limit,
        where: whereClause,
        include: {
          client: {
            include: {
              addresses: true
            }
          },
          lignes: {
            include: {
              product: true,
              home: true,
            }
          },
          reglements: {
            include: {
              reglement: true
            }
          },
          chauffeur: {
            include: {
              user: true,
              vehicule: true
            }
          }
        },
        orderBy: { date: 'desc' },
      }),
      prisma.bonLivraison.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      data: bonLivraisons,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching bon livraisons:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bon livraisons' },
      { status: 500 }
    );
  }
}

async function calculateClientCreditBalance(clientId: string) {
  // Récupérer le client avec tous ses règlements
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      reglements: {
        include: {
          bonLivraisons: {
            include: {
              bonLivraison: true
            }
          }
        }
      }
    }
  });

  if (!client) return 0;

  let allCredits: any[] = [];

  // 1. Credits directs (typeReglement = 'CREDIT')
  const creditsDirects = client.reglements.filter((reg: any) => reg.typeReglement === 'CREDIT');
  allCredits.push(...creditsDirects);

  // 2. Credits dans les paiements MIXTE (détailsMixte)
  for (const reg of client.reglements) {
    if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
      try {
        const details = JSON.parse(reg.detailsMixte);
        for (const detail of details) {
          if (detail.type === 'CREDIT' && detail.montant > 0) {
            allCredits.push({
              id: `${reg.id}-credit`,
              date: reg.date,
              montant: detail.montant,
              reference: reg.reference,
              statut: detail.statut || 'EN_ATTENTE',
              typeReglement: 'CREDIT',
              originalReglement: reg,
              isFromMixte: true
            });
          }
        }
      } catch (e) {
        console.error('Erreur parsing detailsMixte:', e);
      }
    }
  }

  // Calculer le solde total = somme des crédits EN_ATTENTE uniquement
  const soldeTotal = allCredits
    .filter(credit => credit.statut === 'EN_ATTENTE')
    .reduce((sum, reg) => sum + reg.montant, 0);

  return soldeTotal;
}

async function sendCreditNotificationWhatsApp(telephone: string, montantBL: number, nouveauSolde: number, clientNom: string, numeroBL: string) {
  try {
    // Nettoyer le numéro de téléphone
    let cleanPhone = telephone.replace(/[\s\-\(\)]/g, '');

    if (cleanPhone.startsWith('0')) {
      cleanPhone = '216' + cleanPhone.substring(1);
    } else if (!cleanPhone.startsWith('216')) {
      cleanPhone = '216' + cleanPhone;
    }

    // Formater le message pour une vente à crédit
    const message = `Cher ${clientNom},

Nous vous informons qu'un nouveau bon de livraison (BL N° ${numeroBL}) a été émis pour un montant de ${montantBL.toFixed(3)} DT, en mode crédit.

Votre nouveau solde crédit est de ${nouveauSolde.toFixed(3)} DT.

Nous vous remercions pour votre confiance.

Cordialement,
CHIHA GSM`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://api.whatsapp.com/send/?phone=${cleanPhone}&text=${encodedMessage}&type=phone_number&app_absent=0`;

    console.log('WhatsApp URL générée pour crédit BL:', clientNom);
    console.log('Montant BL:', montantBL);
    console.log('Nouveau solde:', nouveauSolde);

    return whatsappUrl;
  } catch (error) {
    console.error('Erreur création URL WhatsApp crédit:', error);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son chauffeur et son véhicule
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: {
        chauffeur: {
          include: {
            vehicule: {
              include: {
                home: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      numero,
      clientId,
      factureId,
      statut,
      lignes,
      modeReglement,
      montantTotal,
      montantHT,
      montantTVA,
      montantPaye,
      montantRestant,
      detailsMixte,
      paiements,
      montant,
      typeReglement,
      reference,
      echeance,
      imageUrl,
      banque,
      nameSecondClient,
      domiciliation,
      factureIds = [],
      homeId: bodyHomeId,
      remise,
      typeRemise,
    } = body;

    // ========== GESTION DU HOMEID POUR LES CHAUFFEURS ==========
    let finalHomeId = bodyHomeId;

    if (user.role === 'CHAUFFEUR') {
      if (!user.chauffeur?.vehicule?.homeId) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas assigné à un véhicule avec un emplacement valide' },
          { status: 400 }
        );
      }
      finalHomeId = user.chauffeur.vehicule.homeId;
      console.log(`[API] Chauffeur détecté: ${user.nom} - Forçage du homeId à: ${finalHomeId}`);
    }

    if (user.role === 'CHAUFFEUR') {
      for (const ligne of lignes) {
        if (ligne.homeId !== finalHomeId) {
          console.log(`[API] Correction homeId pour ligne: ${ligne.homeId} -> ${finalHomeId}`);
          ligne.homeId = finalHomeId;
        }
      }
    }
    // ========== FIN GESTION HOMEID ==========

    // Validations de base
    if (!numero || !clientId) {
      return NextResponse.json(
        { error: 'Numéro et client sont requis' },
        { status: 400 }
      );
    }

    if (!lignes || lignes.length === 0) {
      return NextResponse.json(
        { error: 'Au moins un produit est requis' },
        { status: 400 }
      );
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    let clientMisAJour = client;
    if (client.estProspect === true) {
      console.log(`[API] Client prospect détecté: ${client.nom} (${client.id}) - Transformation en client confirmé`);
      clientMisAJour = await prisma.client.update({
        where: { id: clientId },
        data: {
          estProspect: false,
          estPasseParBL: true,
          updatedAt: new Date(),
        },
      });
      console.log(`[API] Client ${client.nom} transformé avec succès en client confirmé`);
    }

    // Vérifier que le numéro est unique
    const existingBL = await prisma.bonLivraison.findUnique({
      where: { numero }
    });

    if (existingBL) {
      return NextResponse.json(
        { error: 'Un bon de livraison avec ce numéro existe déjà' },
        { status: 400 }
      );
    }

    // ========== VÉRIFICATION DES REMISES CORRIGÉE ==========
    const productIds = lignes.map((l: { productId: any; }) => l.productId);
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        designation: true,
        prixVente: true,
        plafondRemise: true
      }
    });

    const productMap = new Map(products.map(p => [p.id, p]));

     const sousTotalTotal = lignes.reduce((sum: number, l: { productId: string; quantite: number; prixVente?: number }) => {
      const prixUnitaire = l.prixVente ?? productMap.get(l.productId)?.prixVente ?? 0;
      return sum + prixUnitaire * l.quantite;
    }, 0);

    // Calculer le montant total de la remise demandée
    let montantRemiseDemande = 0;
    if (remise && remise > 0) {
      if (typeRemise === 'pourcentage') {
        montantRemiseDemande = (sousTotalTotal * remise) / 100;
      } else if (typeRemise === 'montant') {
        montantRemiseDemande = remise;
      }
    }

    // Calculer le plafond total autorisé
    const plafondTotalAutorise = lignes.reduce((total: number, ligne: { productId: string; quantite: number; }) => {
      const product = productMap.get(ligne.productId);
      const plafond = product?.plafondRemise || 0;
      return total + (plafond * ligne.quantite);
    }, 0);

    // Vérification - Si remise dépasse le plafond
    if (montantRemiseDemande > plafondTotalAutorise) {
      const depassement = montantRemiseDemande - plafondTotalAutorise;
      const pourcentageDepassement = (depassement / plafondTotalAutorise) * 100;

       const remiseDetails = [];
      for (const ligne of lignes) {
        const product = productMap.get(ligne.productId);
        if (product) {
          const plafondLigne = (product.plafondRemise || 0) * ligne.quantite;
          const prixLigne = product.prixVente * ligne.quantite;
          const partRemise = (montantRemiseDemande / sousTotalTotal) * prixLigne;

          if (partRemise > plafondLigne) {
            remiseDetails.push({
              productDesignation: product.designation,
              quantite: ligne.quantite,
              prixUnitaireBase: product.prixVente,
              prixUnitaireUtilise: ligne.prixVente || product.prixVente,
              totalLigne: prixLigne,
              plafondAutorise: plafondLigne,
              remiseDemandee: partRemise,
              depassement: partRemise - plafondLigne
            });
          }
        }
      }

      console.log('=== REMISE BLOQUÉE ===');
      console.log('montantRemiseDemande:', montantRemiseDemande);
      console.log('plafondTotalAutorise:', plafondTotalAutorise);

      return NextResponse.json(
        {
          error: 'REMISE_NON_AUTORISEE',
          message: 'La remise demandée dépasse le plafond autorisé',
          plafondTotal: plafondTotalAutorise,
          remiseDemandee: montantRemiseDemande,
          depassement: depassement,
          pourcentageDepassement: pourcentageDepassement,
          remiseDetails: remiseDetails
        },
        { status: 400 }
      );
    }
    // console.log('=== REMISE AUTORISÉE ===');
    // console.log('montantRemiseDemande:', montantRemiseDemande);
    // console.log('plafondTotalAutorise:', plafondTotalAutorise);

    // Transaction pour créer le bon de livraison
    const bonLivraison = await prisma.$transaction(async (tx) => {
      // 1. Vérifier le stock pour chaque ligne
      for (const ligne of lignes) {
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
          include: { product: true },
        });

        if (!stockLocation) {
          const product = await tx.product.findUnique({
            where: { id: ligne.productId }
          });
          throw new Error(`Le produit "${product?.designation}" n'est pas disponible dans l'emplacement sélectionné.`);
        }

        if (stockLocation.quantite < ligne.quantite) {
          throw new Error(
            `Stock insuffisant pour "${stockLocation.product.designation}". Disponible: ${stockLocation.quantite}, Demandé: ${ligne.quantite}`
          );
        }
      }

      const soldeCreditActuel = await calculateClientCreditBalance(clientId);

      // Déterminer le montant crédit utilisé dans ce BL
      let montantCreditUtilise = 0;

      // Si le paiement est de type CREDIT
      if (typeReglement === 'CREDIT' && montant) {
        montantCreditUtilise = montant;
      }
      // Si c'est un paiement MIXTE avec des crédits
      else if (modeReglement === 'MIXTE' && paiements) {
        montantCreditUtilise = paiements
          .filter((p: any) => p.type === 'CREDIT')
          .reduce((sum: number, p: any) => sum + p.montant, 0);
      }

      const nouveauResteCredit = soldeCreditActuel + montantCreditUtilise;


      // 2. Créer le bon de livraison
      const newBL = await tx.bonLivraison.create({
        data: {
          numero,
          clientId,
          factureId: factureId || null,
          statut: 'LIVRE',
          modeReglement: modeReglement || null,
          montantTotal,
          montantHT,
          montantTVA,
          montantPaye,
          montantRestant,
          remise: remise || 0,
          detailsMixte: detailsMixte || null,
          homeId: finalHomeId || null,
          chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null,
          resteCredit: nouveauResteCredit,
          montantCredit: montantCreditUtilise,
          lignes: {
            createMany: {
              data: lignes.map((l: { productId: string; homeId: string; quantite: number, prixVente?: number }) => ({
                productId: l.productId,
                homeId: l.homeId,
                quantite: l.quantite,
                prixVente: l.prixVente ?? 0,
              }))
            },
          },
        },
        include: {
          client: true,
          lignes: { include: { product: true, home: true } },
        },
      });

      // 3. Diminuer le stock
      for (const ligne of lignes) {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
          data: { quantite: { decrement: ligne.quantite } },
        });

        await tx.product.update({
          where: { id: ligne.productId },
          data: { quantiteStock: { decrement: ligne.quantite } },
        });

        await tx.stockMovement.create({
          data: {
            productId: ligne.productId,
            type: 'SORTIE',
            quantite: ligne.quantite,
            motif: `Bon de livraison ${numero}`,
            date: new Date(),
          },
        });
      }

      // 4. Gérer la caisse
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let caisse = await tx.caisse.findFirst({
        where: {
          date: today,
          chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null
        }
      });

      if (!caisse) {
        caisse = await tx.caisse.create({
          data: {
            date: today,
            chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null,
            soldeOuverture: 0,
            totalEncaissements: 0,
            totalDecaissements: 0,
            soldeTheorique: 0,
            statut: 'OUVERTE',
          },
        });
      }

      if (caisse.statut === 'CLOTUREE') {
        throw new Error('La caisse est déjà clôturée pour aujourd\'hui');
      }

      // 5. Créer le règlement client (votre code existant)
      if ((paiements && paiements.length > 1) || modeReglement === 'MIXTE') {
        const paiementsValides = paiements || [];

        const detailsAvecStatut = paiementsValides.map((p: any) => ({
          type: p.type,
          montant: p.montant,
          reference: p.reference,
          banque: p.banque,
          echeance: p.echeance,
          imageUrl: p.imageUrl,
          nameSecondClient: p.nameSecondClient,
          statut: (p.type === 'ESPECE' || p.type === 'VIREMENT') ? 'ENCAISSE' : 'EN_ATTENTE',
          dateEncaissement: (p.type === 'ESPECE' || p.type === 'VIREMENT') ? new Date().toISOString() : null
        }));

        const montantTotalReglement = paiementsValides.reduce((sum: number, p: any) => sum + p.montant, 0);
        const tousEncaisse = detailsAvecStatut.every((d: any) => d.statut === 'ENCAISSE');
        const statutGlobal = tousEncaisse ? 'ENCAISSE' : 'EN_ATTENTE';

        const reglement = await tx.reglementClient.create({
          data: {
            clientId,
            nameSecondClient: nameSecondClient || null,
            chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null,
            montant: montantTotalReglement,
            typeReglement: 'MIXTE',
            reference: numero,
            statut: statutGlobal,
            detailsMixte: JSON.stringify(detailsAvecStatut),
            date: new Date(),
          },
          include: { client: true },
        });

        await tx.reglementClientBL.create({
          data: {
            reglementId: reglement.id,
            bonLivraisonId: newBL.id,
            montant: montantTotalReglement,
          },
        });

        for (const detail of detailsAvecStatut) {
          if (detail.montant > 0) {
            const typeMouvement = detail.type === 'CREDIT' ? 'ENCAISSEMENTVIRTUEL' : 'ENCAISSEMENT';

            await tx.mouvementCaisse.create({
              data: {
                caisseId: caisse.id,
                type: typeMouvement,
                modeReglement: detail.type,
                montant: detail.montant,
                reference: reglement.reference || reglement.id,
                libelle: `Règlement client: ${client.nom}`,
              },
            });

            const newTotalEncaissements = caisse.totalEncaissements + detail.montant;
            await tx.caisse.update({
              where: { id: caisse.id },
              data: {
                totalEncaissements: newTotalEncaissements,
                soldeTheorique: caisse.soldeOuverture + newTotalEncaissements - caisse.totalDecaissements,
              },
            });
          }
        }
      } else if (montant && typeReglement) {
        const estImmediat = typeReglement === 'ESPECE' || typeReglement === 'VIREMENT';
        const statutReglement = estImmediat ? 'ENCAISSE' : 'EN_ATTENTE';

        const detailsPaiement = {
          type: typeReglement,
          montant: montant,
          reference: reference,
          banque: banque,
          echeance: echeance,
          imageUrl: imageUrl,
          nameSecondClient: nameSecondClient,
          statut: statutReglement,
          dateEncaissement: estImmediat ? new Date().toISOString() : null
        };

        const reglement = await tx.reglementClient.create({
          data: {
            clientId,
            nameSecondClient: nameSecondClient || null,
            chauffeurId: user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null,
            montant: montant,
            typeReglement: typeReglement,
            reference: reference || numero,
            banque: banque,
            echeance: echeance ? new Date(echeance) : null,
            imageUrl: imageUrl || null,
            domiciliation,
            statut: statutReglement,
            detailsMixte: JSON.stringify([detailsPaiement]),
            date: new Date(),
          },
          include: { client: true },
        });

        await tx.reglementClientBL.create({
          data: {
            reglementId: reglement.id,
            bonLivraisonId: newBL.id,
            montant: montant,
          },
        });

        if (montant > 0) {
          const typeMouvement = typeReglement === 'CREDIT' ? 'ENCAISSEMENTVIRTUEL' : 'ENCAISSEMENT';

          await tx.mouvementCaisse.create({
            data: {
              caisseId: caisse.id,
              type: typeMouvement,
              modeReglement: typeReglement,
              montant: montant,
              reference: reglement.reference || reglement.id,
              libelle: `Règlement client: ${client.nom}`,
            },
          });

          const newTotalEncaissements = caisse.totalEncaissements + montant;
          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalEncaissements: newTotalEncaissements,
              soldeTheorique: caisse.soldeOuverture + newTotalEncaissements - caisse.totalDecaissements,
            },
          });
        }
      }

      let totalPrixAchat = 0;
      for (const ligne of lignes) {
        const produit = await tx.product.findUnique({
          where: { id: ligne.productId },
          select: { prixAchat: true }
        });

        if (produit) {
          totalPrixAchat += produit.prixAchat * ligne.quantite;
        }
      }

      if (totalPrixAchat > 0) {
        await tx.mouvementCaisse.create({
          data: {
            caisseId: caisse.id,
            type: 'DECAISSEMENTVIRTUEL',
            modeReglement: 'ESPECE',
            montant: totalPrixAchat,
            reference: newBL.numero,
            libelle: `Prix d'achat des produits - BL ${newBL.numero}`,
          },
        });
      }

      return newBL;
    });

    let whatsappUrl = null;

    const estCredit = (typeReglement === 'CREDIT' && montant && montant > 0) ||
      (modeReglement === 'MIXTE' && paiements && paiements.some((p: any) => p.type === 'CREDIT' && p.montant > 0));

    if (estCredit && client.telephone) {
      const nouveauSoldeCredit = await calculateClientCreditBalance(clientId);
      let montantCreditUtilise = 0;
      if (typeReglement === 'CREDIT' && montant) {
        montantCreditUtilise = montant;
      } else if (modeReglement === 'MIXTE' && paiements) {
        montantCreditUtilise = paiements
          .filter((p: any) => p.type === 'CREDIT')
          .reduce((sum: number, p: any) => sum + p.montant, 0);
      }

      whatsappUrl = await sendCreditNotificationWhatsApp(
        client.telephone,
        montantCreditUtilise,
        nouveauSoldeCredit,
        client.nom,
        numero
      );
    }
    return NextResponse.json({
      ...bonLivraison,
      whatsappUrl: whatsappUrl
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating bon livraison:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bon livraison' },
      { status: 500 }
    );
  }
}