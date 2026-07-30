import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

// GET - Récupérer un BL spécifique
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const bonLivraison = await prisma.bonLivraison.findUnique({
      where: { id },
      include: {
        client: true,
        lignes: {
          include: {
            product: true,
            home: true,
          }
        },
        reglements: {
          include: {
            reglement: {
              include: {
                client: true
              }
            }
          }
        },
        chauffeur: {
          include: {
            user: true,
            vehicule: true
          }
        }
      }
    });

    if (!bonLivraison) {
      return NextResponse.json(
        { error: 'Bon de livraison non trouvé' },
        { status: 404 }
      );
    }

    // Formater les données pour le frontend
    const formattedBL = {
      ...bonLivraison,
      montantTotal: bonLivraison.montantTotal || 0,
      montantPaye: bonLivraison.montantPaye || 0,
      montantRestant: bonLivraison.montantRestant || 0,
      remise: bonLivraison.remise || 0,
      paiements: bonLivraison.reglements.map((r: any) => {
        const details = r.reglement.detailsMixte ? JSON.parse(r.reglement.detailsMixte) : null;
        if (details && Array.isArray(details) && details.length > 0) {
          return details.map((d: any) => ({
            type: d.type,
            montant: d.montant,
            reference: d.reference,
            banque: d.banque,
            echeance: d.echeance,
            imageUrl: d.imageUrl,
            nameSecondClient: d.nameSecondClient,
          }));
        } else {
          return [{
            type: r.reglement.typeReglement,
            montant: r.montant,
            reference: r.reglement.reference,
            banque: r.reglement.banque,
            echeance: r.reglement.echeance,
            imageUrl: r.reglement.imageUrl,
            nameSecondClient: r.reglement.nameSecondClient,
          }];
        }
      }).flat()
    };

    return NextResponse.json(formattedBL);
  } catch (error) {
    console.error('Error fetching bon livraison:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bon livraison' },
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

// Scénario	targetChauffeurId	Caisse utilisée
// Admin modifie BL d'un chauffeur	id du chauffeur	Caisse du chauffeur
// Chauffeur modifie son propre BL	id du chauffeur	Caisse du chauffeur
// Admin modifie BL sans chauffeur	null	Caisse admin
// Admin modifie BL d'un chauffeur sans caisse	id du chauffeur	Créée pour le chauffeur

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

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

    const { id } = await params;
    const body = await req.json();
    const {
      clientId,
      statut,
      lignes: nouvellesLignes,
      montantTotal,
      montantHT,
      montantTVA,
      montantPaye,
      montantRestant,
      remise,
      typeRemise,
      modeReglement,
      paiements,
      montant,
      typeReglement,
      reference,
      echeance,
      imageUrl,
      banque,
      nameSecondClient,
      domiciliation,
      homeId: bodyHomeId,
    } = body;

    // Récupérer le BL existant avec ses relations
    const existingBL = await prisma.bonLivraison.findUnique({
      where: { id },
      include: {
        lignes: true,
        reglements: {
          include: {
            reglement: true
          }
        },
        chauffeur: true
      }
    });

    if (!existingBL) {
      return NextResponse.json(
        { error: 'Bon de livraison non trouvé' },
        { status: 404 }
      );
    }

    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client non trouvé' },
        { status: 404 }
      );
    }

    // ========== GESTION DU HOMEID POUR LES CHAUFFEURS ==========
    let finalHomeId = bodyHomeId || existingBL.homeId;

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
      for (const ligne of nouvellesLignes) {
        if (ligne.homeId !== finalHomeId) {
          console.log(`[API] Correction homeId pour ligne: ${ligne.homeId} -> ${finalHomeId}`);
          ligne.homeId = finalHomeId;
        }
      }
    }
    // ========== FIN GESTION HOMEID ==========

    // Déterminer le chauffeur cible pour la caisse
    let targetChauffeurId = existingBL.chauffeurId;

    if (!targetChauffeurId && user.role === 'CHAUFFEUR' && user.chauffeur?.id) {
      targetChauffeurId = user.chauffeur.id;
    }

    console.log(`🎯 Chauffeur cible pour la caisse: ${targetChauffeurId || 'Admin'}`);

    // ========== VÉRIFICATION DES REMISES (comme dans POST) ==========
    const productIds = nouvellesLignes.map((l: { productId: any; }) => l.productId);
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

    const sousTotalTotal = nouvellesLignes.reduce((sum: number, l: { productId: string; quantite: number; prixVente?: number }) => {
      const prixUnitaire = l.prixVente ?? productMap.get(l.productId)?.prixVente ?? 0;
      return sum + prixUnitaire * l.quantite;
    }, 0);

    let montantRemiseDemande = 0;
    if (remise && remise > 0) {
      if (typeRemise === 'pourcentage') {
        montantRemiseDemande = (sousTotalTotal * remise) / 100;
      } else if (typeRemise === 'montant') {
        montantRemiseDemande = remise;
      }
    }

    const plafondTotalAutorise = nouvellesLignes.reduce((total: number, ligne: { productId: string; quantite: number; }) => {
      const product = productMap.get(ligne.productId);
      const plafond = product?.plafondRemise || 0;
      return total + (plafond * ligne.quantite);
    }, 0);

    if (montantRemiseDemande > plafondTotalAutorise) {
      const depassement = montantRemiseDemande - plafondTotalAutorise;

      const remiseDetails = [];
      for (const ligne of nouvellesLignes) {
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

      return NextResponse.json(
        {
          error: 'REMISE_NON_AUTORISEE',
          message: 'La remise demandée dépasse le plafond autorisé',
          plafondTotal: plafondTotalAutorise,
          remiseDemandee: montantRemiseDemande,
          depassement: depassement,
          remiseDetails: remiseDetails
        },
        { status: 400 }
      );
    }

    // Transaction
    const updatedBL = await prisma.$transaction(async (tx: any) => {
      // 1. Récupérer ou créer la caisse du chauffeur cible
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let caisse = await tx.caisse.findFirst({
        where: {
          date: today,
          chauffeurId: targetChauffeurId || null
        }
      });

      if (!caisse) {
        caisse = await tx.caisse.create({
          data: {
            date: today,
            chauffeurId: targetChauffeurId || null,
            soldeOuverture: 0,
            totalEncaissements: 0,
            totalDecaissements: 0,
            soldeTheorique: 0,
            statut: 'OUVERTE',
          },
        });
        console.log(`✅ Caisse créée pour le chauffeur: ${targetChauffeurId || 'Admin'}`);
      }

      if (caisse.statut === 'CLOTUREE') {
        throw new Error(`La caisse du ${targetChauffeurId ? 'chauffeur' : 'admin'} est déjà clôturée pour aujourd'hui`);
      }

      // 2. SUPPRIMER TOUS LES ANCIENS MOUVEMENTS DE CAISSE
      const anciensReglementIds = existingBL.reglements.map((r: { reglementId: any }) => r.reglementId);

      const mouvementsASupprimer = await tx.mouvementCaisse.findMany({
        where: {
          OR: [
            { reference: { in: anciensReglementIds } },
            { reference: existingBL.numero },
            { libelle: { contains: existingBL.numero } }
          ],
          caisseId: caisse.id
        }
      });

      console.log(`Mouvements à supprimer: ${mouvementsASupprimer.length}`);

      for (const mouvement of mouvementsASupprimer) {
        if (mouvement.type === 'ENCAISSEMENT') {
          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalEncaissements: { decrement: mouvement.montant },
              soldeTheorique: { decrement: mouvement.montant }
            }
          });
        } else if (mouvement.type === 'DECAISSEMENT' || mouvement.type === 'DECAISSEMENTVIRTUEL') {
          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalDecaissements: { decrement: mouvement.montant },
              soldeTheorique: { increment: mouvement.montant }
            }
          });
        } else if (mouvement.type === 'ENCAISSEMENTVIRTUEL') {
          await tx.caisse.update({
            where: { id: caisse.id },
            data: {
              totalEncaissements: { decrement: mouvement.montant },
              soldeTheorique: { decrement: mouvement.montant }
            }
          });
        }

        await tx.mouvementCaisse.delete({
          where: { id: mouvement.id }
        });
      }

      // 3. Restaurer l'ancien stock
      for (const ancienneLigne of existingBL.lignes) {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: ancienneLigne.productId,
              homeId: ancienneLigne.homeId,
            },
          },
          data: { quantite: { increment: ancienneLigne.quantite } },
        });

        await tx.product.update({
          where: { id: ancienneLigne.productId },
          data: { quantiteStock: { increment: ancienneLigne.quantite } },
        });
      }

      // 4. Vérifier le stock pour les nouvelles lignes (comme dans POST)
      for (const nouvelleLigne of nouvellesLignes) {
        const stockLocation = await tx.stockLocation.findUnique({
          where: {
            productId_homeId: {
              productId: nouvelleLigne.productId,
              homeId: nouvelleLigne.homeId,
            },
          },
          include: { product: true },
        });

        if (!stockLocation) {
          const product = await tx.product.findUnique({
            where: { id: nouvelleLigne.productId }
          });
          throw new Error(`Le produit "${product?.designation}" n'est pas disponible dans l'emplacement sélectionné.`);
        }

        // Vérifier si la nouvelle quantité est disponible en stock
        // (On a déjà restauré l'ancien stock, donc on vérifie le stock actuel)
        if (stockLocation.quantite < nouvelleLigne.quantite) {
          throw new Error(
            `Stock insuffisant pour "${stockLocation.product.designation}". Disponible: ${stockLocation.quantite}, Demandé: ${nouvelleLigne.quantite}`
          );
        }
      }

      // 5. Supprimer les anciens règlements et leurs liaisons
      for (const reglementBL of existingBL.reglements) {
        await tx.reglementClientBL.delete({
          where: { id: reglementBL.id }
        });
        await tx.reglementClient.delete({
          where: { id: reglementBL.reglementId }
        });
      }

      // 6. Supprimer les anciennes lignes
      await tx.ligneBL.deleteMany({
        where: { bonLivraisonId: id }
      });

      // 7. Calculer le solde crédit (comme dans POST)
      const soldeCreditActuel = await calculateClientCreditBalance(clientId);

      const ancienMontantCredit = existingBL.montantCredit || 0;
      const soldeSansCeBL = soldeCreditActuel - ancienMontantCredit;

      let montantCreditUtilise = 0;
      if (typeReglement === 'CREDIT' && montant) {
        montantCreditUtilise = montant;
      } else if (modeReglement === 'MIXTE' && paiements) {
        montantCreditUtilise = paiements
          .filter((p: any) => p.type === 'CREDIT')
          .reduce((sum: number, p: any) => sum + p.montant, 0);
      }

      // Nouveau solde = solde sans ce BL + nouveau crédit utilisé
      const nouveauResteCredit = soldeSansCeBL + montantCreditUtilise;

      // 8. Mettre à jour le BL
      await tx.bonLivraison.update({
        where: { id },
        data: {
          clientId,
          statut: statut || existingBL.statut,
          montantTotal,
          montantHT: montantHT || 0,
          montantTVA: montantTVA || 0,
          montantPaye,
          montantRestant,
          remise: remise || 0,
          modeReglement: modeReglement || null,
          homeId: finalHomeId || null,
          chauffeurId: existingBL.chauffeurId || (user.role === 'CHAUFFEUR' ? user.chauffeur?.id : null),
          resteCredit: nouveauResteCredit,
          montantCredit: montantCreditUtilise,
        }
      });

      // 9. Créer les nouvelles lignes (comme dans POST)
      if (nouvellesLignes.length > 0) {
        await tx.ligneBL.createMany({
          data: nouvellesLignes.map((l: any) => ({
            bonLivraisonId: id,
            productId: l.productId,
            homeId: l.homeId,
            quantite: l.quantite,
            prixVente: l.prixVente ?? 0,
          }))
        });
      }

      // 10. Diminuer le nouveau stock (comme dans POST)
      for (const nouvelleLigne of nouvellesLignes) {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: nouvelleLigne.productId,
              homeId: nouvelleLigne.homeId,
            },
          },
          data: { quantite: { decrement: nouvelleLigne.quantite } },
        });

        await tx.product.update({
          where: { id: nouvelleLigne.productId },
          data: { quantiteStock: { decrement: nouvelleLigne.quantite } },
        });

        await tx.stockMovement.create({
          data: {
            productId: nouvelleLigne.productId,
            type: 'SORTIE',
            quantite: nouvelleLigne.quantite,
            motif: `Modification BL ${existingBL.numero}`,
            date: new Date(),
          },
        });
      }

      // 11. CRÉER LES NOUVEAUX RÈGLEMENTS (comme dans POST)
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
            chauffeurId: targetChauffeurId || null,
            montant: montantTotalReglement,
            typeReglement: 'MIXTE',
            reference: existingBL.numero,
            statut: statutGlobal,
            detailsMixte: JSON.stringify(detailsAvecStatut),
            date: new Date(),
          },
        });

        await tx.reglementClientBL.create({
          data: {
            reglementId: reglement.id,
            bonLivraisonId: id,
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
            chauffeurId: targetChauffeurId || null,
            montant: montant,
            typeReglement: typeReglement,
            reference: reference || existingBL.numero,
            banque: banque,
            echeance: echeance ? new Date(echeance) : null,
            imageUrl: imageUrl || null,
            domiciliation,
            statut: statutReglement,
            detailsMixte: JSON.stringify([detailsPaiement]),
            date: new Date(),
          },
        });

        await tx.reglementClientBL.create({
          data: {
            reglementId: reglement.id,
            bonLivraisonId: id,
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

      // 12. Mouvement pour le prix d'achat (comme dans POST)
      let totalPrixAchat = 0;
      for (const ligne of nouvellesLignes) {
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
            reference: existingBL.numero,
            libelle: `Prix d'achat des produits - BL ${existingBL.numero}`,
          },
        });

        const newTotalDecaissements = Number(caisse.totalDecaissements) + totalPrixAchat;
        const newSolde = Number(caisse.soldeOuverture) + Number(caisse.totalEncaissements) - newTotalDecaissements;

        await tx.caisse.update({
          where: { id: caisse.id },
          data: {
            totalDecaissements: newTotalDecaissements,
            soldeTheorique: newSolde,
          },
        });
      }

      return await tx.bonLivraison.findUnique({
        where: { id },
        include: {
          client: true,
          lignes: { include: { product: true, home: true } },
          reglements: { include: { reglement: true } }
        }
      });
    });

    let whatsappUrl = null;

    // Déterminer si le paiement contient du crédit
    const estCredit = (typeReglement === 'CREDIT' && montant && montant > 0) ||
      (modeReglement === 'MIXTE' && paiements && paiements.some((p: any) => p.type === 'CREDIT' && p.montant > 0));

    if (estCredit && client.telephone) {
      // Récupérer le solde de crédit actuel du client
      const nouveauSoldeCredit = await calculateClientCreditBalance(clientId);

      // Calculer le montant de crédit utilisé dans ce BL
      let montantCreditUtilise = 0;
      if (typeReglement === 'CREDIT' && montant) {
        montantCreditUtilise = montant;
      } else if (modeReglement === 'MIXTE' && paiements) {
        montantCreditUtilise = paiements
          .filter((p: any) => p.type === 'CREDIT')
          .reduce((sum: number, p: any) => sum + p.montant, 0);
      }

      // Générer le lien WhatsApp
      whatsappUrl = await sendCreditNotificationWhatsApp(
        client.telephone,
        montantCreditUtilise,
        nouveauSoldeCredit,
        client.nom,
        existingBL.numero
      );
    }

    return NextResponse.json({
      ...updatedBL,
      whatsappUrl: whatsappUrl
    });
  } catch (error) {
    console.error('Error updating bon livraison:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bon livraison' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession();

    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    const { id } = await params;

    const existingBL = await prisma.bonLivraison.findUnique({
      where: { id },
      include: {
        lignes: true,
        reglements: {
          include: {
            reglement: {
              include: {
                factures: true,
                bonLivraisons: true
              }
            }
          }
        },
        retourClients: true,
        factures: true
      }
    });

    if (!existingBL) {
      return NextResponse.json(
        { error: 'Bon de livraison non trouvé' },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx: any) => {
      // 1. Récupérer les mouvements de caisse à supprimer
      // On cherche les mouvements liés à ce BL via la référence (numero)
      const mouvementsCaisse = await tx.mouvementCaisse.findMany({
        where: {
          OR: [
            { reference: existingBL.numero },
            { reference: existingBL.id },
            // Si vous stockez l'ID du BL dans le libellé ou autre champ
          ]
        }
      });

      // 2. Supprimer les mouvements de caisse
      if (mouvementsCaisse.length > 0) {
        // Récupérer les IDs des caisses concernées pour mise à jour
        const caisseIds = [...new Set(mouvementsCaisse.map((m: { caisseId: any; }) => m.caisseId))];
        
        // Supprimer les mouvements
        await tx.mouvementCaisse.deleteMany({
          where: {
            id: { in: mouvementsCaisse.map((m: { id: any; }) => m.id) }
          }
        });

        // Recalculer les soldes des caisses concernées
        for (const caisseId of caisseIds) {
          // Récupérer la caisse avec ses mouvements restants
          const caisse = await tx.caisse.findUnique({
            where: { id: caisseId },
            include: {
              mouvements: true
            }
          });

          if (caisse) {
            // Recalculer les totaux
            const totalEncaissements = caisse.mouvements
              .filter((m: { type: string; }) => m.type === 'ENCAISSEMENT' || m.type === 'ENCAISSEMENTVIRTUEL')
              .reduce((sum: any, m: { montant: any; }) => sum + m.montant, 0);

            const totalDecaissements = caisse.mouvements
              .filter((m: { type: string; }) => m.type === 'DECAISSEMENT' || m.type === 'DECAISSEMENTVIRTUEL')
              .reduce((sum: any, m: { montant: any; }) => sum + m.montant, 0);

            // Mettre à jour la caisse
            await tx.caisse.update({
              where: { id: caisseId },
              data: {
                totalEncaissements,
                totalDecaissements,
                soldeTheorique: caisse.soldeOuverture + totalEncaissements - totalDecaissements
              }
            });
          }
        }
      }

      // 3. Restaurer les stocks
      for (const ligne of existingBL.lignes) {
        await tx.stockLocation.update({
          where: {
            productId_homeId: {
              productId: ligne.productId,
              homeId: ligne.homeId,
            },
          },
          data: { quantite: { increment: ligne.quantite } },
        });

        await tx.product.update({
          where: { id: ligne.productId },
          data: { quantiteStock: { increment: ligne.quantite } },
        });
      }

      // 4. Supprimer les lignes BL
      await tx.ligneBL.deleteMany({
        where: { bonLivraisonId: id }
      });

      // 5. Supprimer les règlements associés
      for (const reglementBL of existingBL.reglements) {
        // Supprimer la liaison ReglementClientBL
        await tx.reglementClientBL.delete({
          where: { id: reglementBL.id }
        });

        // Supprimer le ReglementClient
        await tx.reglementClient.delete({
          where: { id: reglementBL.reglementId }
        });
      }

      // 6. Supprimer les retours clients associés
      if (existingBL.retourClients && existingBL.retourClients.length > 0) {
        for (const retour of existingBL.retourClients) {
          // Supprimer les lignes du retour client
          await tx.ligneRetourClient.deleteMany({
            where: { retourClientId: retour.id }
          });
          // Supprimer le retour client
          await tx.retourClient.delete({
            where: { id: retour.id }
          });
        }
      }

      // 7. Supprimer les factures associées (si elles ne sont liées qu'à ce BL)
      if (existingBL.factures && existingBL.factures.length > 0) {
        for (const facture of existingBL.factures) {
          // Supprimer les lignes de facture
          await tx.ligneFacture.deleteMany({
            where: { factureId: facture.id }
          });
          // Supprimer la facture
          await tx.facture.delete({
            where: { id: facture.id }
          });
        }
      }

      // 8. Supprimer le BL
      await tx.bonLivraison.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Bon de livraison supprimé avec succès'
    });
  } catch (error) {
    console.error('Error deleting bon livraison:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete bon livraison' },
      { status: 500 }
    );
  }
}