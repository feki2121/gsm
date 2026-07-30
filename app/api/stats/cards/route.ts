// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';

// export async function GET(req: NextRequest) {
//     try {
//         // Date du jour
//         const today = new Date();
//         const startOfDay = new Date(today);
//         startOfDay.setHours(0, 0, 0, 0);
//         const endOfDay = new Date(today);
//         endOfDay.setHours(23, 59, 59, 999);

//         // Début du mois
//         const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
//         startOfMonth.setHours(0, 0, 0, 0);

//         // ============================================
//         // 1. CA du Jour (factures du jour)
//         // ============================================
//         const facturesJour = await prisma.facture.findMany({
//             where: {
//                 date: {
//                     gte: startOfDay,
//                     lte: endOfDay,
//                 },
//             },
//             select: {
//                 totalTTC: true,
//             },
//         });

//         const caJour = facturesJour.reduce((sum, f) => sum + f.totalTTC, 0);

//         // ============================================
//         // 2. CA du Mois (factures du mois)
//         // ============================================
//         const facturesMois = await prisma.facture.findMany({
//             where: {
//                 date: {
//                     gte: startOfMonth,
//                 },
//             },
//             select: {
//                 totalTTC: true,
//             },
//         });

//         const caMois = facturesMois.reduce((sum, f) => sum + f.totalTTC, 0);
//         const nbFacturesMois = facturesMois.length;

//         // ============================================
//         // 3. Créances Clients (solde total des clients)
//         // ============================================
//         const clients = await prisma.client.findMany({
//             select: {
//                 solde: true,
//             },
//         });

//         const totalCreances = clients.reduce((sum, c) => sum + (c.solde > 0 ? c.solde : 0), 0);

//         // ============================================
//         // 4. Dettes Fournisseurs (solde total des fournisseurs)

//         // ============================================
//         // Dettes Fournisseurs - CORRIGÉE (gère les paiements mixtes)
//         // ============================================
//         const fournisseurs = await prisma.fournisseur.findMany({
//             include: {
//                 factures: {
//                     select: {
//                         id: true,
//                         numero: true,
//                         totalTTC: true,
//                         date: true,
//                     },
//                 },
//                 retourFournisseurs: {
//                     select: {
//                         id: true,
//                         montant: true,
//                         date: true,
//                     },
//                 },
//                 reglements: {
//                     include: {
//                         factures: true,
//                     },
//                 },
//             },
//         });

//         const detaillesFournisseurs = fournisseurs.map(f => {
//             // Total des achats
//             const totalAchats = f.factures.reduce((s, fac) => s + fac.totalTTC, 0);

//             // Total des retours
//             const totalRetours = f.retourFournisseurs.reduce((s, ret) => s + ret.montant, 0);

//             // Total des paiements effectués (gestion mixte)
//             let totalPaye = 0;
//             const detailsPaiements: any[] = [];

//             for (const reglement of f.reglements) {
//                 if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
//                     try {
//                         const details = JSON.parse(reglement.detailsMixte);
//                         for (const detail of details) {
//                             if (detail.statut === 'PAYE') {
//                                 totalPaye += detail.montant;
//                                 detailsPaiements.push({
//                                     type: detail.type,
//                                     montant: detail.montant,
//                                     date: reglement.date,
//                                     statut: 'PAYE',
//                                     reference: detail.reference,
//                                 });
//                             }
//                         }
//                     } catch (error) {
//                         console.error('Error parsing detailsMixte:', error);
//                     }
//                 } else if (reglement.statut === 'PAYE') {
//                     totalPaye += reglement.montant;
//                     detailsPaiements.push({
//                         type: reglement.typeReglement,
//                         montant: reglement.montant,
//                         date: reglement.date,
//                         statut: 'PAYE',
//                         reference: reglement.reference,
//                     });
//                 }
//             }

//             const dette = totalAchats - totalRetours - totalPaye;

//             return {
//                 id: f.id,
//                 nom: f.nom,
//                 totalAchats,
//                 totalRetours,
//                 totalPaye,
//                 dette: dette > 0 ? dette : 0,
//                 details: {
//                     factures: f.factures,
//                     retours: f.retourFournisseurs,
//                     paiements: detailsPaiements,
//                 },
//             };
//         });

//         const totalDettes = detaillesFournisseurs.reduce((sum, f) => sum + f.dette, 0);

//         // ============================================
//         // 5. Solde Caisse du jour
//         // ============================================
//         const caisseJour = await prisma.caisse.findFirst({
//             where: { date: startOfDay },
//         });

//         const soldeCaisse = caisseJour?.soldeTheorique || 0;

//         // ============================================
//         // 6. Nombre de clients
//         // ============================================
//         const nbClients = await prisma.client.count();

//         // ============================================
//         // 7. Nombre de produits
//         // ============================================
//         const nbProduits = await prisma.product.count();

//         // ============================================
//         // 8. Produits en alerte (stock <= seuilAlerte)
//         // ============================================
//         const produitsAlerte = await prisma.product.findMany({
//             where: {
//                 quantiteStock: {
//                     lte: prisma.product.fields.seuilAlerte,
//                 },
//             },
//             select: {
//                 id: true,
//                 designation: true,
//                 quantiteStock: true,
//                 seuilAlerte: true,
//             },
//         });

//         // ============================================
//         // 9. Calcul des tendances (comparaison mois précédent)
//         // ============================================
//         const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
//         const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

//         const facturesMoisPrecedent = await prisma.facture.findMany({
//             where: {
//                 date: {
//                     gte: startOfLastMonth,
//                     lte: endOfLastMonth,
//                 },
//             },
//             select: {
//                 totalTTC: true,
//             },
//         });

//         const caMoisPrecedent = facturesMoisPrecedent.reduce((sum, f) => sum + f.totalTTC, 0);
//         const evolutionCAMois = caMoisPrecedent > 0
//             ? ((caMois - caMoisPrecedent) / caMoisPrecedent) * 100
//             : 0;

//         // ============================================
//         // 10. Règlements du jour
//         // ============================================
//         const reglementsJour = await prisma.reglementClient.findMany({
//             where: {
//                 date: {
//                     gte: startOfDay,
//                     lte: endOfDay,
//                 },
//                 statut: 'ENCAISSE',
//             },
//             select: {
//                 montant: true,
//             },
//         });

//         const totalReglementsJour = reglementsJour.reduce((sum, r) => sum + r.montant, 0);
//         const tauxReglement = caJour > 0 ? (totalReglementsJour / caJour) * 100 : 0;

//         // ============================================
//         // Construction de la réponse
//         // ============================================
//         return NextResponse.json({
//             success: true,
//             stats: {
//                 caJour,
//                 caMois,
//                 totalCreances,
//                 totalDettes,
//                 soldeCaisse,
//                 nbClients,
//                 nbProduits,
//                 nbFacturesMois,
//                 produitsAlerte: produitsAlerte,
//                 totalReglementsJour,
//                 tauxReglement,
//                 evolutionCAMois: Math.round(evolutionCAMois),
//             },
//             date: {
//                 today: today.toISOString(),
//                 startOfMonth: startOfMonth.toISOString(),
//             },
//         });
//     } catch (error) {
//         console.error('Error fetching dashboard stats:', error);
//         return NextResponse.json(
//             { error: 'Failed to fetch dashboard stats' },
//             { status: 500 }
//         );
//     }
// }