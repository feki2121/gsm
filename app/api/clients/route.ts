import { prisma } from '@/lib/prisma';
import { Client } from '@/lib/types';
import { NextRequest, NextResponse } from 'next/server';

// GET all clients with pagination and real solde calculation
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const skip = (page - 1) * limit;
    
    // Paramètre optionnel pour inclure ou exclure les prospects
    const includeProspects = searchParams.get('includeProspects') === 'true';
    const seulementProspects = searchParams.get('seulementProspects') === 'true';

    // Construction du filtre where
    let where: any = {};
    
    if (seulementProspects) {
      // Récupérer uniquement les prospects
      where.estProspect = true;
    } else if (!includeProspects) {
      // Par défaut : exclure les prospects (estProspect = false)
      where.estProspect = false;
    }
    // Si includeProspects = true, on ne met pas de filtre (tous les clients)

    const [clients, total] = await Promise.all([
      prisma.client.findMany({
        skip,
        take: limit,
        where, // ← Application du filtre
        select: {
          id: true,
          nom: true,
          telephone: true,
          email: true,
          cin: true,
          mf: true,
          estProspect: true, // ← Ajout de estProspect dans la sélection
          creditAutorise: true,
          creditUtilise: true,
          creditDisponible: true,
          estAutoriseCredit: true,
          createdAt: true,
          updatedAt: true,
          addresses: {
            select: {
              id: true,
              adresse: true,
              lieuDit: true,
              codePostal: true,
              ville: true,
              latitude: true,
              longitude: true,
              estPrincipale: true,
            },
            orderBy: {
              estPrincipale: 'desc',
            },
          },
          // Inclure les règlements pour calculer le solde réel
          reglements: {
            select: {
              typeReglement: true,
              montant: true,
              statut: true,
              detailsMixte: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.client.count({ where }), // ← Application du filtre au count
    ]);

    // Fonction pour calculer le solde réel d'un client
    const calculerSoldeClient = (client: any): number => {
      let totalCreditsEnAttente = 0;

      // 1. Parcourir les règlements directs de type CREDIT
      for (const reg of client.reglements) {
        if (reg.typeReglement === 'CREDIT' && reg.statut === 'EN_ATTENTE') {
          totalCreditsEnAttente += reg.montant;
        }
        
        // 2. Vérifier les paiements MIXTE qui contiennent des CREDIT
        if (reg.typeReglement === 'MIXTE' && reg.detailsMixte && reg.statut === 'EN_ATTENTE') {
          try {
            const details = JSON.parse(reg.detailsMixte);
            for (const detail of details) {
              if (detail.type === 'CREDIT' && detail.montant > 0) {
                // Vérifier le statut du crédit dans le détail
                const creditStatut = detail.statut || 'EN_ATTENTE';
                if (creditStatut === 'EN_ATTENTE') {
                  totalCreditsEnAttente += detail.montant;
                }
              }
            }
          } catch (e) {
            console.error('Erreur parsing detailsMixte:', e);
          }
        }
      }

      return totalCreditsEnAttente;
    };

    // Transformer les données avec le calcul du solde réel
    const clientsWithMainAddress = clients.map((client: any) => {
      const mainAddress = client.addresses.find((addr: { estPrincipale: boolean }) => addr.estPrincipale) || client.addresses[0];
      const soldeReel = calculerSoldeClient(client);
      
      return {
        id: client.id,
        nom: client.nom,
        telephone: client.telephone,
        email: client.email,
        cin: client.cin,
        mf: client.mf,
        estProspect: client.estProspect, // ← Ajout de estProspect dans la réponse
        solde: soldeReel,
        creditAutorise: client.creditAutorise,
        creditUtilise: client.creditUtilise,
        creditDisponible: client.creditDisponible,
        estAutoriseCredit: client.estAutoriseCredit,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        adresse: mainAddress?.adresse || null,
        lieuDit: mainAddress?.lieuDit || null,
        codePostal: mainAddress?.codePostal || null,
        ville: mainAddress?.ville || null,
        latitude: mainAddress?.latitude || null,
        longitude: mainAddress?.longitude || null,
      };
    });

    return NextResponse.json({
      data: clientsWithMainAddress,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      filters: { // ← Ajout d'informations sur les filtres appliqués
        seulementProspects,
        includeProspects,
        estProspectExclu: !includeProspects && !seulementProspects
      }
    });
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clients' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      nom, 
      telephone, 
      adresse, 
      email, 
      cin, 
      mf, 
      solde,
      lieuDit,
      codePostal,
      ville,
      latitude,
      longitude 
    } = body;

    if (!nom || !telephone) {
      return NextResponse.json(
        { error: 'Client name and telephone are required' },
        { status: 400 }
      );
    }

    // Créer le client et son adresse dans une transaction
    const client = await prisma.$transaction(async (tx) => {
      const newClient = await tx.client.create({
        data: {
          nom,
          telephone,
          email: email || null,
          cin: cin || null,
          mf: mf || null,
          solde: solde || 0,
        },
      });

      // Créer l'adresse principale si fournie
      if (adresse) {
        await tx.clientAddress.create({
          data: {
            clientId: newClient.id,
            adresse,
            lieuDit: lieuDit || null,
            codePostal: codePostal || null,
            ville: ville || null,
            latitude: latitude || null,
            longitude: longitude || null,
            estPrincipale: true,
          },
        });
      }

      return newClient;
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    console.error('Error creating client:', error);
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }
}