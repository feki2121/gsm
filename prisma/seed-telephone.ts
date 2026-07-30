import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Début du seeding complet...')
  
  // Nettoyage des données existantes (ordre important pour respecter les clés étrangères)
  console.log('🧹 Nettoyage des données existantes...')
  
  await prisma.$executeRaw`PRAGMA foreign_keys = OFF;`
  
  await prisma.ligneInventaire.deleteMany()
  await prisma.inventaire.deleteMany()
  await prisma.mouvementCaisse.deleteMany()
  await prisma.caisse.deleteMany()
  await prisma.reglementFactureFournisseur.deleteMany()
  await prisma.reglementFournisseurBE.deleteMany()
  await prisma.ligneFactureFournisseur.deleteMany()
  await prisma.factureFournisseur.deleteMany()
  await prisma.ligneBonSortie.deleteMany()
  await prisma.bonSortie.deleteMany()
  await prisma.transfertStock.deleteMany()
  await prisma.stockParType.deleteMany()
  await prisma.ligneBonEntree.deleteMany()
  await prisma.reglementFournisseur.deleteMany()
  await prisma.bonEntree.deleteMany()
  await prisma.reglementClientBL.deleteMany()
  await prisma.reglementFacture.deleteMany()
  await prisma.reglementClient.deleteMany()
  await prisma.ligneRetourClient.deleteMany()
  await prisma.retourClient.deleteMany()
  await prisma.ligneFacture.deleteMany()
  await prisma.facture.deleteMany()
  await prisma.ligneBL.deleteMany()
  await prisma.bonLivraison.deleteMany()
  await prisma.ligneDevis.deleteMany()
  await prisma.devis.deleteMany()
  await prisma.stockLocation.deleteMany()
  await prisma.stockMovement.deleteMany()
  await prisma.retourFournisseur.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.chauffeur.deleteMany()
  await prisma.vehicule.deleteMany()
  await prisma.userPermission.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.user.deleteMany()
  await prisma.client.deleteMany()
  await prisma.fournisseur.deleteMany()
  await prisma.home.deleteMany()
  
  await prisma.$executeRaw`PRAGMA foreign_keys = ON;`
  console.log('✅ Nettoyage terminé')

  // ==================== 1. ENTREPÔTS ====================
  console.log('\n📦 Création des entrepôts...')
  
  const principal = await prisma.home.create({
    data: { nom: 'PRINCIPAL', description: 'Entrepôt principal - Stock central' }
  })

  const voitureA = await prisma.home.create({
    data: { nom: 'VOITURE_A', description: 'Entrepôt secondaire - Camion A' }
  })

  const voitureB = await prisma.home.create({
    data: { nom: 'VOITURE_B', description: 'Entrepôt secondaire - Camion B' }
  })
  
  console.log('✅ 3 entrepôts créés')

  // ==================== 2. VÉHICULES ====================
  console.log('\n🚚 Création des véhicules...')
  
  const vehiculeA = await prisma.vehicule.create({
    data: {
      immatricule: '123-TUN-456',
      nom: 'voiture a',
      description: 'Camion de livraison A - Renault Master',
      homeId: voitureA.id
    }
  })

  const vehiculeB = await prisma.vehicule.create({
    data: {
      immatricule: '789-TUN-012',
      nom: 'voiture b',
      description: 'Camion de livraison B - Mercedes Sprinter',
      homeId: voitureB.id
    }
  })
  
  console.log('✅ 2 véhicules créés')

  // ==================== 3. CATÉGORIES ====================
  console.log('\n📂 Création des catégories...')
  
  const categories = await prisma.category.createMany({
    data: [
      { nom: 'SMARTPHONES', description: 'Téléphones intelligents' },
      { nom: 'ACCESSOIRES', description: 'Accessoires téléphoniques' },
      { nom: 'CHARGEURS', description: 'Chargeurs et câbles' },
      { nom: 'AUDIO', description: 'Écouteurs et casques audio' },
      { nom: 'COQUILLES', description: 'Coques et protections' },
      { nom: 'REPARATION', description: 'Pièces de réparation' }
    ]
  })
  
  console.log('✅ 6 catégories créées')

  // Récupérer les catégories pour les utiliser
  const smartphoneCat = await prisma.category.findFirst({ where: { nom: 'SMARTPHONES' } })
  const accessoireCat = await prisma.category.findFirst({ where: { nom: 'ACCESSOIRES' } })
  const chargeurCat = await prisma.category.findFirst({ where: { nom: 'CHARGEURS' } })
  const audioCat = await prisma.category.findFirst({ where: { nom: 'AUDIO' } })
  const coquilleCat = await prisma.category.findFirst({ where: { nom: 'COQUILLES' } })
  const reparationCat = await prisma.category.findFirst({ where: { nom: 'REPARATION' } })

  // ==================== 4. PRODUITS ====================
  console.log('\n📱 Création des produits...')
  
  const products = await prisma.product.createMany({
    data: [
      // Smartphones
      { reference: 'IPH14-128', code: 'APL-001', designation: 'iPhone 14 128GB', categoryId: smartphoneCat!.id, homeId: principal.id, prixAchat: 2800, prixVente: 3500, tva: 19, quantiteStock: 50, seuilAlerte: 5 },
      { reference: 'IPH14-256', code: 'APL-002', designation: 'iPhone 14 256GB', categoryId: smartphoneCat!.id, homeId: principal.id, prixAchat: 3200, prixVente: 4000, tva: 19, quantiteStock: 30, seuilAlerte: 5 },
      { reference: 'SAM-S23', code: 'SAM-001', designation: 'Samsung Galaxy S23', categoryId: smartphoneCat!.id, homeId: principal.id, prixAchat: 2400, prixVente: 3000, tva: 19, quantiteStock: 45, seuilAlerte: 5 },
      { reference: 'XIAO-13', code: 'XIA-001', designation: 'Xiaomi 13', categoryId: smartphoneCat!.id, homeId: principal.id, prixAchat: 1800, prixVente: 2300, tva: 19, quantiteStock: 60, seuilAlerte: 5 },
      
      // Chargeurs
      { reference: 'CHG-20W', code: 'CHG-001', designation: 'Chargeur 20W USB-C', categoryId: chargeurCat!.id, homeId: principal.id, prixAchat: 15, prixVente: 35, tva: 19, quantiteStock: 200, seuilAlerte: 20 },
      { reference: 'CHG-65W', code: 'CHG-002', designation: 'Chargeur GaN 65W', categoryId: chargeurCat!.id, homeId: principal.id, prixAchat: 35, prixVente: 70, tva: 19, quantiteStock: 100, seuilAlerte: 10 },
      { reference: 'CAB-USB-1M', code: 'CAB-001', designation: 'Câble USB-C 1m', categoryId: chargeurCat!.id, homeId: principal.id, prixAchat: 3, prixVente: 10, tva: 19, quantiteStock: 500, seuilAlerte: 50 },
      
      // Audio
      { reference: 'AIRP-PRO2', code: 'AUD-001', designation: 'AirPods Pro 2', categoryId: audioCat!.id, homeId: principal.id, prixAchat: 180, prixVente: 280, tva: 19, quantiteStock: 40, seuilAlerte: 5 },
      { reference: 'BUDS2-PRO', code: 'AUD-002', designation: 'Galaxy Buds2 Pro', categoryId: audioCat!.id, homeId: principal.id, prixAchat: 140, prixVente: 220, tva: 19, quantiteStock: 35, seuilAlerte: 5 },
      
      // Coquilles
      { reference: 'COQ-IPH14', code: 'COQ-001', designation: 'Coque iPhone 14 Silicone', categoryId: coquilleCat!.id, homeId: principal.id, prixAchat: 5, prixVente: 15, tva: 19, quantiteStock: 300, seuilAlerte: 30 },
      { reference: 'PROT-ECRAN', code: 'COQ-002', designation: 'Protection écran verre trempé', categoryId: coquilleCat!.id, homeId: principal.id, prixAchat: 2, prixVente: 10, tva: 19, quantiteStock: 400, seuilAlerte: 40 },
      
      // Accessoires
      { reference: 'POW-BANK-10K', code: 'ACC-001', designation: 'Powerbank 10000mAh', categoryId: accessoireCat!.id, homeId: principal.id, prixAchat: 20, prixVente: 50, tva: 19, quantiteStock: 80, seuilAlerte: 10 },
      
      // Pièces réparation
      { reference: 'ECR-IPH12', code: 'REP-001', designation: 'Écran iPhone 12', categoryId: reparationCat!.id, homeId: principal.id, prixAchat: 80, prixVente: 160, tva: 19, quantiteStock: 25, seuilAlerte: 5 }
    ]
  })
  
  console.log('✅ 13 produits créés')

  // Récupérer tous les produits pour les utiliser ensuite
  const allProducts = await prisma.product.findMany()

  // ==================== 5. STOCK LOCATIONS ====================
  console.log('\n📍 Création des répartitions de stock...')
  
  // Répartir le stock entre les entrepôts
  for (const product of allProducts) {
    // Stock dans l'entrepôt principal
    await prisma.stockLocation.upsert({
      where: { productId_homeId: { productId: product.id, homeId: principal.id } },
      update: {},
      create: {
        productId: product.id,
        homeId: principal.id,
        quantite: Math.floor(product.quantiteStock * 0.7) // 70% dans principal
      }
    })
    
    // Stock dans VOITURE_A pour certains produits
    if (Math.random() > 0.6) {
      await prisma.stockLocation.upsert({
        where: { productId_homeId: { productId: product.id, homeId: voitureA.id } },
        update: {},
        create: {
          productId: product.id,
          homeId: voitureA.id,
          quantite: Math.floor(product.quantiteStock * 0.15)
        }
      })
    }
    
    // Stock dans VOITURE_B pour certains produits
    if (Math.random() > 0.7) {
      await prisma.stockLocation.upsert({
        where: { productId_homeId: { productId: product.id, homeId: voitureB.id } },
        update: {},
        create: {
          productId: product.id,
          homeId: voitureB.id,
          quantite: Math.floor(product.quantiteStock * 0.15)
        }
      })
    }
  }
  
  console.log('✅ Répartitions de stock créées')

  // ==================== 6. CLIENTS ====================
  console.log('\n👥 Création des clients...')
  
  const clients = await prisma.client.createMany({
    data: [
      { nom: 'Tunisie Telecom', telephone: '+21670100000', adresse: 'Centre Urbain Nord, Tunis', email: 'contact@tunisietelecom.tn', creditAutorise: 50000, estAutoriseCredit: true, ville: 'Tunis' },
      { nom: 'Orange Tunisie', telephone: '+21671100000', adresse: 'Les Berges du Lac, Tunis', email: 'commercial@orange.tn', creditAutorise: 40000, estAutoriseCredit: true, ville: 'Tunis' },
      { nom: 'Phone Center Sfax', telephone: '+21674100000', adresse: 'Route de l\'aéroport, Sfax', email: 'contact@phonecenter.tn', creditAutorise: 15000, estAutoriseCredit: true, ville: 'Sfax' },
      { nom: 'Smart Tech Sousse', telephone: '+21673100000', adresse: 'Sahloul, Sousse', email: 'info@smarttech.tn', creditAutorise: 12000, estAutoriseCredit: true, ville: 'Sousse' },
      { nom: 'Digital Store Nabeul', telephone: '+21672123456', adresse: 'Centre ville, Nabeul', email: 'contact@digitalstore.tn', creditAutorise: 8000, estAutoriseCredit: false, ville: 'Nabeul' }
    ]
  })
  
  console.log('✅ 5 clients créés')

  // Récupérer les clients
  const clientList = await prisma.client.findMany()

  // ==================== 7. FOURNISSEURS ====================
  console.log('\n🏭 Création des fournisseurs...')
  
  await prisma.fournisseur.createMany({
    data: [
      { nom: 'Apple Distribution Intl', telephone: '+33123456789', adresse: 'Paris, France', email: 'sales@apple.com' },
      { nom: 'Samsung Electronics', telephone: '+82212345678', adresse: 'Suwon, Corée', email: 'contact@samsung.com' },
      { nom: 'Xiaomi International', telephone: '+861012345678', adresse: 'Beijing, Chine', email: 'sales@xiaomi.com' },
      { nom: 'Accessoires Distribution', telephone: '+33234567890', adresse: 'Marseille, France', email: 'info@access-distrib.fr' }
    ]
  })
  
  console.log('✅ 4 fournisseurs créés')

  // ==================== 8. UTILISATEURS ET CHAUFFEURS ====================
  console.log('\n👤 Création des utilisateurs...')
  
  // Créer les utilisateurs
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@phonestore.tn',
      phone: '+21650123456',
      password: 'admin123', // À hasher en production
      nom: 'Admin Principal',
      role: 'ADMIN'
    }
  })
  
  const chauffeur1User = await prisma.user.create({
    data: {
      email: 'chauffeur.a@phonestore.tn',
      phone: '+21650123457',
      password: 'chauffeur123',
      nom: 'Ahmed Ben Ali',
      role: 'CHAUFFEUR'
    }
  })
  
  const chauffeur2User = await prisma.user.create({
    data: {
      email: 'chauffeur.b@phonestore.tn',
      phone: '+21650123458',
      password: 'chauffeur123',
      nom: 'Mohamed Salah',
      role: 'CHAUFFEUR'
    }
  })
  
  console.log('✅ 3 utilisateurs créés')
  
  // Créer les chauffeurs
  console.log('\n👨‍✈️ Création des chauffeurs...')
  
  await prisma.chauffeur.createMany({
    data: [
      { userId: chauffeur1User.id, vehiculeId: vehiculeA.id, nom: 'Ahmed Ben Ali', telephone: '+21698765432', cin: '12345678' },
      { userId: chauffeur2User.id, vehiculeId: vehiculeB.id, nom: 'Mohamed Salah', telephone: '+21655443322', cin: '87654321' }
    ]
  })
  
  console.log('✅ 2 chauffeurs créés')

  // ==================== 9. PERMISSIONS ====================
  console.log('\n🔐 Création des permissions...')
  
  await prisma.rolePermission.createMany({
    data: [
      { role: 'ADMIN', permission: 'can_view_products', granted: true },
      { role: 'ADMIN', permission: 'can_edit_products', granted: true },
      { role: 'ADMIN', permission: 'can_view_clients', granted: true },
      { role: 'ADMIN', permission: 'can_edit_clients', granted: true },
      { role: 'ADMIN', permission: 'can_view_vehicles', granted: true },
      { role: 'CHAUFFEUR', permission: 'can_view_products', granted: true },
      { role: 'CHAUFFEUR', permission: 'can_view_deliveries', granted: true }
    ]
  })
  
  console.log('✅ Permissions créées')

  // ==================== 10. BONS DE LIVRAISON ====================
  console.log('\n📦 Création des bons de livraison...')
  
  const chauffeurs = await prisma.chauffeur.findMany()
  
  for (let i = 1; i <= 10; i++) {
    const client = clientList[Math.floor(Math.random() * clientList.length)]
    const chauffeur = chauffeurs[Math.floor(Math.random() * chauffeurs.length)]
    const totalTTC = Math.random() * 5000 + 500
    
    await prisma.bonLivraison.create({
      data: {
        numero: `BL-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        clientId: client.id,
        chauffeurId: chauffeur.id,
        homeId: principal.id,
        statut: ['EN_ATTENTE', 'LIVRE', 'LIVRE'][Math.floor(Math.random() * 3)] as any,
        modeReglement: ['ESPECE', 'CHEQUE', 'CREDIT'][Math.floor(Math.random() * 3)] as any,
        montantTotal: totalTTC,
        montantPaye: Math.random() > 0.5 ? totalTTC : totalTTC * Math.random(),
        montantRestant: 0
      }
    })
  }
  
  console.log('✅ 10 bons de livraison créés')

  console.log('\n✅ Seeding terminé avec succès !')
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding :', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })