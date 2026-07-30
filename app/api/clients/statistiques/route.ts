// app/api/clients/statistiques/route.ts
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');
    const clientId = searchParams.get('clientId');

    // Construction des filtres de date
    let dateFilter: any = {};
    if (dateDebut) {
      const start = new Date(dateDebut);
      start.setHours(0, 0, 0, 0);
      dateFilter.gte = start;
    }
    if (dateFin) {
      const end = new Date(dateFin);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    // 1. Récupérer TOUS les BL de la période avec leurs règlements
    const bls = await prisma.bonLivraison.findMany({
      where: {
        date: dateFilter,
        ...(clientId && clientId !== 'all' ? { clientId } : {}),
        statut: 'LIVRE',
      },
      include: {
        client: {
          include: {
            addresses: true,
          },
        },
        lignes: {
          include: {
            product: {
              select: {
                id: true,
                designation: true,
                prixAchat: true,
                prixVente: true,
              },
            },
          },
        },
        reglements: {
          include: {
            reglement: true,
          },
        },
      },
    });

    if (bls.length === 0) {
      return NextResponse.json({ data: [], total: 0 });
    }

    // 2. Récupérer TOUS les mouvements de caisse de la période
    const tousMouvements = await prisma.mouvementCaisse.findMany({
      where: {
        date: dateFilter,
      },
    });

    // 🔍 DEBUG: Afficher les mouvements pour le BL problématique
    const blProblematique = bls.find(bl => bl.numero === 'BL-1782134917607');
    if (blProblematique) {
      const mouvementsBL = tousMouvements.filter(m => 
        m.reference === blProblematique.numero || 
        (m.libelle && m.libelle.includes(blProblematique.numero))
      );
      // Chercher tous les mouvements qui pourraient être liés à ce client
      const mouvementsClient = tousMouvements.filter(m => 
        m.libelle && m.libelle.includes('WALID PHONE OOREDOO')
      );
    }

    // 3. Récupérer les informations des clients séparément
    const clientIds = [...new Set(bls.map(bl => bl.clientId))];
    const clients = await prisma.client.findMany({
      where: {
        id: { in: clientIds },
      },
    });
    const clientMapInfo = new Map(clients.map(c => [c.id, c]));

    // 4. Grouper par client
    const clientMap = new Map<string, {
      clientId: string;
      clientNom: string;
      clientTelephone: string;
      clientEmail: string | null;
      clientVille: string | null;
      bls: any[];
      mouvements: any[];
      mouvementsVirtuels: any[];
      totalCA: number;
      totalHT: number;
      totalTVA: number;
      totalRecette: number;
      totalAchat: number;
      totalFrais: number;
    }>();

    for (const bl of bls) {
      const clientKey = bl.clientId;
      const clientInfo = clientMapInfo.get(clientKey);
      
      if (!clientMap.has(clientKey)) {
        clientMap.set(clientKey, {
          clientId: bl.clientId,
          clientNom: clientInfo?.nom || 'Client inconnu',
          clientTelephone: clientInfo?.telephone || '',
          clientEmail: clientInfo?.email || null,
          clientVille: (clientInfo as any)?.ville || null,
          bls: [],
          mouvements: [],
          mouvementsVirtuels: [],
          totalCA: 0,
          totalHT: 0,
          totalTVA: 0,
          totalRecette: 0,
          totalAchat: 0,
          totalFrais: 0,
        });
      }

      const data = clientMap.get(clientKey)!;
      data.bls.push(bl);
      
      data.totalCA += bl.montantTotal || 0;
      data.totalHT += bl.montantHT || 0;
      data.totalTVA += bl.montantTVA || 0;

      const blWithReglements = bl as any;
      const mouvementsBL: any[] = [];
      const references: string[] = [];

      // ✅ NOUVEAU: Ajouter le numéro du BL comme référence
      references.push(bl.numero);

      // Collecter les références des règlements
      if (blWithReglements.reglements && Array.isArray(blWithReglements.reglements)) {
        for (const regBL of blWithReglements.reglements) {
          if (regBL.reglement) {
            // La référence du règlement (peut être un numéro de chèque)
            if (regBL.reglement.reference) {
              references.push(regBL.reglement.reference);
            }
            // Aussi l'ID du règlement
            references.push(regBL.reglement.id);
            // ✅ NOUVEAU: Ajouter l'ID du ReglementClientBL
            references.push(regBL.id);
          }
        }
      }

      console.log(`🔍 BL ${bl.numero} - Références recherchées:`, references);

      // Chercher les mouvements par référence
      const mouvementsParReference = tousMouvements.filter(m => 
        references.includes(m.reference || '')
      );
      mouvementsBL.push(...mouvementsParReference);

      // Chercher par libellé (si le libellé contient une des références)
      const mouvementsParLibelle = tousMouvements.filter(m => 
        m.libelle && references.some(ref => m.libelle?.includes(ref))
      );
      mouvementsBL.push(...mouvementsParLibelle);

      // Fallback : chercher par numéro de BL dans le libellé
      if (mouvementsBL.length === 0) {
        const mouvementsFallback = tousMouvements.filter(m => 
          m.libelle && m.libelle.includes(bl.numero)
        );
        mouvementsBL.push(...mouvementsFallback);
      }

      console.log(`🔍 BL ${bl.numero} - ${mouvementsBL.length} mouvements trouvés`);

      // On prend TOUS les encaissements
      const encaissements = mouvementsBL
        .filter((m: any) => m.type === 'ENCAISSEMENT' || m.type === 'ENCAISSEMENTVIRTUEL' || m.type === 'ENCAISSEMENTCREDIT')
        .reduce((sum: number, m: any) => sum + m.montant, 0);
      
      console.log(`🔍 BL ${bl.numero} - Encaissements: ${encaissements}`);
      
      data.totalRecette += encaissements;
      data.mouvements.push(...mouvementsBL);

      // Achat = décaissements virtuels
      const achats = tousMouvements
        .filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero)
        .reduce((sum, m) => sum + m.montant, 0);
      
      data.totalAchat += achats;
      data.mouvementsVirtuels.push(...tousMouvements.filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero));
    }

    // 5. Construction des statistiques finales
    const stats = Array.from(clientMap.values()).map((data) => {
      const totalBL = data.bls.length;
      
      const caTotal = data.totalCA;
      const caHT = data.totalHT;
      const caTVA = data.totalTVA;
      
      const recette = data.totalRecette;
      const achat = data.totalAchat;
      const frais = data.totalFrais;
      
      const margeBrute = recette - achat;
      const margeNette = recette - achat - frais;
      
      const tauxMargeBrute = recette > 0 ? margeBrute / recette : 0;
      const tauxMargeNette = recette > 0 ? margeNette / recette : 0;
      
      const panierMoyen = totalBL > 0 ? recette / totalBL : 0;

      const sortedBLs = [...data.bls].sort((a, b) => b.date.getTime() - a.date.getTime());
      const dernierAchat = sortedBLs.length > 0 ? sortedBLs[0].date.toISOString() : null;
      const firstAchat = sortedBLs.length > 0 ? sortedBLs[sortedBLs.length - 1].date.toISOString() : null;

      // Top produits
      const productMap = new Map<string, { productId: string; designation: string; quantite: number; total: number }>();
      for (const bl of data.bls) {
        for (const ligne of bl.lignes) {
          if (ligne.product) {
            const key = ligne.productId;
            if (!productMap.has(key)) {
              productMap.set(key, {
                productId: ligne.productId,
                designation: ligne.product.designation,
                quantite: 0,
                total: 0,
              });
            }
            const p = productMap.get(key)!;
            p.quantite += ligne.quantite;
            p.total += ligne.prixVente * ligne.quantite;
          }
        }
      }
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.total - a.total)
        .slice(0, 10);

      // Calculer la marge brute et nette par BL
      const blsWithMargins = data.bls.map((bl) => {
        const blWithReglements = bl as any;
        let blMouvements: any[] = [];
        const references: string[] = [];

        // ✅ Ajouter le numéro du BL
        references.push(bl.numero);

        if (blWithReglements.reglements && Array.isArray(blWithReglements.reglements)) {
          for (const regBL of blWithReglements.reglements) {
            if (regBL.reglement) {
              if (regBL.reglement.reference) {
                references.push(regBL.reglement.reference);
              }
              references.push(regBL.reglement.id);
              references.push(regBL.id);
            }
          }
        }

        const blMouvementsParReference = tousMouvements.filter(m => 
          references.includes(m.reference || '')
        );
        blMouvements.push(...blMouvementsParReference);

        const blMouvementsParLibelle = tousMouvements.filter(m => 
          m.libelle && references.some(ref => m.libelle?.includes(ref))
        );
        blMouvements.push(...blMouvementsParLibelle);

        if (blMouvements.length === 0) {
          blMouvements = tousMouvements.filter(m => 
            m.libelle && m.libelle.includes(bl.numero)
          );
        }
        
        const blRecette = blMouvements
          .filter((m: any) => m.type === 'ENCAISSEMENT' || m.type === 'ENCAISSEMENTVIRTUEL' || m.type === 'ENCAISSEMENTCREDIT')
          .reduce((sum: number, m: any) => sum + m.montant, 0);
        
        const blAchat = tousMouvements
          .filter(m => m.type === 'DECAISSEMENTVIRTUEL' && m.reference === bl.numero)
          .reduce((sum, m) => sum + m.montant, 0);
        
        const blMargeBrute = blRecette - blAchat;
        const blMargeNette = blRecette - blAchat - frais;

        return {
          id: bl.id,
          numero: bl.numero,
          date: bl.date.toISOString(),
          montantTotal: bl.montantTotal || 0,
          montantHT: bl.montantHT || 0,
          margeBrute: blMargeBrute,
          margeNette: blMargeNette,
        };
      });

      return {
        clientId: data.clientId,
        clientNom: data.clientNom,
        clientTelephone: data.clientTelephone,
        clientEmail: data.clientEmail,
        clientVille: data.clientVille,
        totalBL,
        caTotal,
        caHT,
        caTVA,
        recette,
        achat,
        margeBrute,
        margeNette,
        tauxMargeBrute,
        tauxMargeNette,
        panierMoyen,
        dernierAchat,
        firstAchat,
        totalMouvements: data.mouvements.length,
        topProducts,
        bls: blsWithMargins,
      };
    });

    stats.sort((a, b) => b.recette - a.recette);
   
    return NextResponse.json({
      data: stats,
      total: stats.length,
    });
  } catch (error) {
    console.error('Error fetching client statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client statistics' },
      { status: 500 }
    );
  }
}