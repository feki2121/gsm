import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Démarrage du seeding...')

  // ============= 1. CRÉATION DES ENTREPÔTS =============
  console.log('📦 Création des entrepôts...')
  
  const principal = await prisma.home.create({
    data: {
      nom: 'PRINCIPAL',
      description: 'Entrepôt principal - Stock central'
    }
  })

  const voitureA = await prisma.home.create({
    data: {
      nom: 'VOITURE_A',
      description: 'Entrepôt secondaire - Camion A'
    }
  })

  const voitureB = await prisma.home.create({
    data: {
      nom: 'VOITURE_B',
      description: 'Entrepôt secondaire - Camion B'
    }
  })

  // ============= 2. CRÉATION DES VÉHICULES =============
  console.log('🚚 Création des véhicules...')
  
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

  // ============= 3. CRÉATION DES UTILISATEURS ET CHAUFFEURS =============
  console.log('👤 Création des utilisateurs et chauffeurs...')
  
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@entreprise.com',
      phone: '+21612345678',
      password: '$2b$10$YourHashedPasswordHere', // Mot de passe: admin123
      nom: 'Admin Système',
      role: 'ADMIN',
      permissions: {
        create: [
          { permission: 'can_view_all', granted: true },
          { permission: 'can_edit_all', granted: true },
          { permission: 'can_delete_all', granted: true }
        ]
      }
    }
  })

  const chauffeur1User = await prisma.user.create({
    data: {
      email: 'chauffeur.a@entreprise.com',
      phone: '+21698765432',
      password: '$2b$10$YourHashedPasswordHere', // Mot de passe: chauffeur123
      nom: 'Ahmed Ben Ali',
      role: 'CHAUFFEUR'
    }
  })

  const chauffeur2User = await prisma.user.create({
    data: {
      email: 'chauffeur.b@entreprise.com',
      phone: '+21655443322',
      password: '$2b$10$YourHashedPasswordHere',
      nom: 'Mohamed Salah',
      role: 'CHAUFFEUR'
    }
  })

  const chauffeur1 = await prisma.chauffeur.create({
    data: {
      userId: chauffeur1User.id,
      vehiculeId: vehiculeA.id,
      nom: 'Ahmed Ben Ali',
      telephone: '+21698765432',
      cin: '12345678'
    }
  })

  const chauffeur2 = await prisma.chauffeur.create({
    data: {
      userId: chauffeur2User.id,
      vehiculeId: vehiculeB.id,
      nom: 'Mohamed Salah',
      telephone: '+21655443322',
      cin: '87654321'
    }
  })

  // ============= 4. CRÉATION DES CATÉGORIES =============
  console.log('📱 Création des catégories de produits...')
  
  const categories = await Promise.all([
    prisma.category.create({ data: { nom: 'SMARTPHONES', description: 'Téléphones intelligents' } }),
    prisma.category.create({ data: { nom: 'ACCESSOIRES', description: 'Accessoires téléphoniques' } }),
    prisma.category.create({ data: { nom: 'COQUILLES', description: 'Coques et protections' } }),
    prisma.category.create({ data: { nom: 'CHARGEURS', description: 'Chargeurs et câbles' } }),
    prisma.category.create({ data: { nom: 'AUDIO', description: 'Écouteurs et casques' } }),
    prisma.category.create({ data: { nom: 'REPARATION', description: 'Pièces de réparation' } })
  ])

  const [smartphones, accessoires, coquilles, chargeurs, audio, reparation] = categories

  // ============= 5. CRÉATION DES PRODUITS =============
  console.log('📱 Création des produits (50+ produits)...')
  
  const products = [
    // Smartphones
    { reference: 'IPH14-128', code: 'APL-001', designation: 'iPhone 14 128GB', category: smartphones, prixAchat: 2800, prixVente: 3500, tva: 19 },
    { reference: 'IPH14-256', code: 'APL-002', designation: 'iPhone 14 256GB', category: smartphones, prixAchat: 3200, prixVente: 4000, tva: 19 },
    { reference: 'IPH14P-128', code: 'APL-003', designation: 'iPhone 14 Pro 128GB', category: smartphones, prixAchat: 3600, prixVente: 4500, tva: 19 },
    { reference: 'SAM-S23', code: 'SAM-001', designation: 'Samsung Galaxy S23', category: smartphones, prixAchat: 2400, prixVente: 3000, tva: 19 },
    { reference: 'SAM-S23U', code: 'SAM-002', designation: 'Samsung Galaxy S23 Ultra', category: smartphones, prixAchat: 3200, prixVente: 4000, tva: 19 },
    { reference: 'XIAO-13', code: 'XIA-001', designation: 'Xiaomi 13', category: smartphones, prixAchat: 1800, prixVente: 2300, tva: 19 },
    { reference: 'XIAO-13P', code: 'XIA-002', designation: 'Xiaomi 13 Pro', category: smartphones, prixAchat: 2200, prixVente: 2800, tva: 19 },
    { reference: 'HUA-P60', code: 'HUA-001', designation: 'Huawei P60', category: smartphones, prixAchat: 2000, prixVente: 2600, tva: 19 },
    { reference: 'OPPO-F21', code: 'OPP-001', designation: 'Oppo Find X5', category: smartphones, prixAchat: 1900, prixVente: 2500, tva: 19 },
    { reference: 'GOOG-P7', code: 'GOG-001', designation: 'Google Pixel 7', category: smartphones, prixAchat: 2100, prixVente: 2700, tva: 19 },
    
    // Chargeurs
    { reference: 'CHG-20W', code: 'CHG-001', designation: 'Chargeur 20W USB-C', category: chargeurs, prixAchat: 15, prixVente: 35, tva: 19 },
    { reference: 'CHG-65W', code: 'CHG-002', designation: 'Chargeur GaN 65W', category: chargeurs, prixAchat: 35, prixVente: 70, tva: 19 },
    { reference: 'CHG-VOOC', code: 'CHG-003', designation: 'Chargeur VOOC 65W', category: chargeurs, prixAchat: 40, prixVente: 80, tva: 19 },
    { reference: 'CAB-USB-1M', code: 'CAB-001', designation: 'Câble USB-C 1m', category: chargeurs, prixAchat: 3, prixVente: 10, tva: 19 },
    { reference: 'CAB-USB-2M', code: 'CAB-002', designation: 'Câble USB-C 2m', category: chargeurs, prixAchat: 5, prixVente: 15, tva: 19 },
    { reference: 'CAB-LTNG', code: 'CAB-003', designation: 'Câble Lightning 1m', category: chargeurs, prixAchat: 4, prixVente: 12, tva: 19 },
    
    // Audio
    { reference: 'AIRP-PRO2', code: 'AUD-001', designation: 'AirPods Pro 2', category: audio, prixAchat: 180, prixVente: 280, tva: 19 },
    { reference: 'BUDS2-PRO', code: 'AUD-002', designation: 'Galaxy Buds2 Pro', category: audio, prixAchat: 140, prixVente: 220, tva: 19 },
    { reference: 'XIAO-BUDS', code: 'AUD-003', designation: 'Xiaomi Buds 3 Pro', category: audio, prixAchat: 60, prixVente: 120, tva: 19 },
    { reference: 'CASQ-SONY', code: 'AUD-004', designation: 'Casque Sony WH-1000XM5', category: audio, prixAchat: 280, prixVente: 420, tva: 19 },
    { reference: 'ECR-SANDBERG', code: 'AUD-005', designation: 'Écouteurs Sandberg', category: audio, prixAchat: 12, prixVente: 30, tva: 19 },
    
    // Coquilles
    { reference: 'COQ-IPH14-SIL', code: 'COQ-001', designation: 'Coque iPhone 14 Silicone', category: coquilles, prixAchat: 5, prixVente: 15, tva: 19 },
    { reference: 'COQ-S23-CARB', code: 'COQ-002', designation: 'Coque S23 Carbone', category: coquilles, prixAchat: 8, prixVente: 20, tva: 19 },
    { reference: 'COQ-UNIV', code: 'COQ-003', designation: 'Coque Universelle', category: coquilles, prixAchat: 2, prixVente: 8, tva: 19 },
    { reference: 'PROT-ECRAN', code: 'COQ-004', designation: 'Protection écran verre trempé', category: coquilles, prixAchat: 2, prixVente: 10, tva: 19 },
    
    // Accessoires
    { reference: 'SUP-PHONE', code: 'ACC-001', designation: 'Support téléphone voiture', category: accessoires, prixAchat: 8, prixVente: 25, tva: 19 },
    { reference: 'POW-BANK-10K', code: 'ACC-002', designation: 'Powerbank 10000mAh', category: accessoires, prixAchat: 20, prixVente: 50, tva: 19 },
    { reference: 'POW-BANK-20K', code: 'ACC-003', designation: 'Powerbank 20000mAh', category: accessoires, prixAchat: 35, prixVente: 75, tva: 19 },
    { reference: 'RING-LIGHT', code: 'ACC-004', designation: 'Ring Light 10"', category: accessoires, prixAchat: 25, prixVente: 60, tva: 19 },
    { reference: 'SELFIE-STICK', code: 'ACC-005', designation: 'Perche à selfie Bluetooth', category: accessoires, prixAchat: 6, prixVente: 18, tva: 19 },
    
    // Pièces réparation
    { reference: 'ECR-IPH12', code: 'REP-001', designation: 'Écran iPhone 12', category: reparation, prixAchat: 80, prixVente: 160, tva: 19 },
    { reference: 'BAT-IPH12', code: 'REP-002', designation: 'Batterie iPhone 12', category: reparation, prixAchat: 25, prixVente: 60, tva: 19 },
    { reference: 'ECR-S20', code: 'REP-003', designation: 'Écran Galaxy S20', category: reparation, prixAchat: 70, prixVente: 140, tva: 19 },
    { reference: 'BAT-S20', code: 'REP-004', designation: 'Batterie Galaxy S20', category: reparation, prixAchat: 20, prixVente: 50, tva: 19 },
  ]

  const createdProducts = []
  for (const product of products) {
    const created = await prisma.product.create({
      data: {
        reference: product.reference,
        code: product.code,
        designation: product.designation,
        categoryId: product.category.id,
        homeId: principal.id,
        prixAchat: product.prixAchat,
        prixVente: product.prixVente,
        tva: product.tva,
        quantiteStock: Math.floor(Math.random() * 100) + 20,
        seuilAlerte: 5
      }
    })
    createdProducts.push(created)
  }

  // ============= 6. CRÉATION DES CLIENTS =============
  console.log('👥 Création des clients (15 clients)...')
  
  const clients = await Promise.all([
    prisma.client.create({
      data: {
        nom: 'Tunisie Telecom',
        telephone: '+21670100000',
        adresse: 'Centre Urbain Nord, Tunis',
        email: 'contact@tunisietelecom.tn',
        creditAutorise: 50000,
        estAutoriseCredit: true,
        latitude: 36.8375,
        longitude: 10.2405,
        ville: 'Tunis',
        codePostal: '1082'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Orange Tunisie',
        telephone: '+21671100000',
        adresse: 'Les Berges du Lac, Tunis',
        email: 'commercial@orange.tn',
        creditAutorise: 40000,
        estAutoriseCredit: true,
        latitude: 36.8375,
        longitude: 10.2755,
        ville: 'Tunis',
        codePostal: '1053'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Ooredoo Tunisie',
        telephone: '+21672100000',
        adresse: 'Ariana, Tunis',
        email: 'achats@ooredoo.tn',
        creditAutorise: 45000,
        estAutoriseCredit: true,
        latitude: 36.8600,
        longitude: 10.1955,
        ville: 'Ariana',
        codePostal: '2080'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Phone Center Sfax',
        telephone: '+21674100000',
        adresse: 'Route de l\'aéroport, Sfax',
        email: 'contact@phonecenter.tn',
        creditAutorise: 15000,
        estAutoriseCredit: true,
        latitude: 34.7400,
        longitude: 10.7600,
        ville: 'Sfax'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Smart Tech Sousse',
        telephone: '+21673100000',
        adresse: 'Sahloul, Sousse',
        email: 'info@smarttech.tn',
        creditAutorise: 12000,
        estAutoriseCredit: true,
        latitude: 35.8200,
        longitude: 10.6300,
        ville: 'Sousse'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Digital Store Nabeul',
        telephone: '+21672123456',
        adresse: 'Centre ville, Nabeul',
        email: 'contact@digitalstore.tn',
        creditAutorise: 8000,
        estAutoriseCredit: false,
        latitude: 36.4500,
        longitude: 10.7300,
        ville: 'Nabeul'
      }
    }),
    prisma.client.create({
      data: {
        nom: 'Tech Plus Bizerte',
        telephone: '+21672123457',
        adresse: 'Route de Tunis, Bizerte',
        email: 'commercial@techplus.tn',
        creditAutorise: 7000,
        estAutoriseCredit: false,
        latitude: 37.2700,
        longitude: 9.8700,
        ville: 'Bizerte'
      }
    })
  ])

  // ============= 7. CRÉATION DES FOURNISSEURS =============
  console.log('🏭 Création des fournisseurs...')
  
  const fournisseurs = await Promise.all([
    prisma.fournisseur.create({
      data: {
        nom: 'Apple Distribution Intl',
        telephone: '+33123456789',
        adresse: 'Paris, France',
        email: 'sales@apple.com',
        solde: 0
      }
    }),
    prisma.fournisseur.create({
      data: {
        nom: 'Samsung Electronics',
        telephone: '+82212345678',
        adresse: 'Suwon, Corée',
        email: 'contact@samsung.com',
        solde: 0
      }
    }),
    prisma.fournisseur.create({
      data: {
        nom: 'Xiaomi International',
        telephone: '+861012345678',
        adresse: 'Beijing, Chine',
        email: 'sales@xiaomi.com',
        solde: 0
      }
    }),
    prisma.fournisseur.create({
      data: {
        nom: 'Huawei Technologies',
        telephone: '+8675512345678',
        adresse: 'Shenzhen, Chine',
        email: 'contact@huawei.com',
        solde: 0
      }
    }),
    prisma.fournisseur.create({
      data: {
        nom: 'Accessoires Distribution',
        telephone: '+33234567890',
        adresse: 'Marseille, France',
        email: 'info@access-distrib.fr',
        solde: 0
      }
    })
  ])

  // ============= 8. CRÉATION DES STOCK LOCATIONS =============
  console.log('📍 Initialisation des stocks par entrepôt...')
  
  for (const product of createdProducts) {
    // Stock principal
    await prisma.stockLocation.upsert({
      where: { productId_homeId: { productId: product.id, homeId: principal.id } },
      update: {},
      create: {
        productId: product.id,
        homeId: principal.id,
        quantite: product.quantiteStock
      }
    })
    
    // Stock dans les véhicules (uniquement pour certains produits)
    if (Math.random() > 0.7) {
      await prisma.stockLocation.upsert({
        where: { productId_homeId: { productId: product.id, homeId: voitureA.id } },
        update: {},
        create: {
          productId: product.id,
          homeId: voitureA.id,
          quantite: Math.floor(Math.random() * 10)
        }
      })
    }
    
    if (Math.random() > 0.8) {
      await prisma.stockLocation.upsert({
        where: { productId_homeId: { productId: product.id, homeId: voitureB.id } },
        update: {},
        create: {
          productId: product.id,
          homeId: voitureB.id,
          quantite: Math.floor(Math.random() * 8)
        }
      })
    }
  }

  // ============= 9. CRÉATION DES BONS DE LIVRAISON =============
  console.log('📦 Création des bons de livraison...')
  
  const bonLivraisons = []
  for (let i = 1; i <= 20; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)]
    const chauffeur = i % 2 === 0 ? chauffeur1 : chauffeur2
    const home = i % 3 === 0 ? voitureA : (i % 3 === 1 ? voitureB : principal)
    
    const totalHT = Math.random() * 5000 + 500
    const totalTTC = totalHT * 1.19
    
    const bl = await prisma.bonLivraison.create({
      data: {
        numero: `BL-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        clientId: client.id,
        chauffeurId: chauffeur.id,
        homeId: home.id,
        statut: ['EN_ATTENTE', 'LIVRE', 'LIVRE'][Math.floor(Math.random() * 3)] as any,
        modeReglement: ['ESPECE', 'CHEQUE', 'CREDIT', 'MIXTE'][Math.floor(Math.random() * 4)] as any,
        montantTotal: totalTTC,
        montantPaye: Math.random() > 0.5 ? totalTTC : totalTTC * Math.random(),
        montantRestant: 0
      }
    })
    
    // Mise à jour du montant restant
    const montantPaye = bl.montantPaye
    await prisma.bonLivraison.update({
      where: { id: bl.id },
      data: { montantRestant: bl.montantTotal - montantPaye }
    })
    
    bonLivraisons.push(bl)
    
    // Ajouter des lignes au BL
    const numLines = Math.floor(Math.random() * 5) + 1
    for (let j = 0; j < numLines; j++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)]
      const quantite = Math.floor(Math.random() * 20) + 1
      
      await prisma.ligneBL.create({
        data: {
          bonLivraisonId: bl.id,
          productId: product.id,
          homeId: home.id,
          quantite: quantite
        }
      })
    }
  }

  // ============= 10. CRÉATION DES BONS DE SORTIE =============
  console.log('📤 Création des bons de sortie...')
  
  for (let i = 1; i <= 15; i++) {
    const client = i % 2 === 0 ? clients[Math.floor(Math.random() * clients.length)] : undefined
    const totalHT = Math.random() * 3000 + 200
    const totalTTC = totalHT * 1.19
    
    const bonSortie = await prisma.bonSortie.create({
      data: {
        numero: `BS-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
        dateDebut: new Date(),
        dateFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        destination: `Zone ${String.fromCharCode(65 + i % 26)}`,
        nomConducteur: i % 2 === 0 ? 'Ahmed Ben Ali' : 'Mohamed Salah',
        matriculeVehicule: i % 2 === 0 ? '123-TUN-456' : '789-TUN-012',
        numCIN: i % 2 === 0 ? '12345678' : '87654321',
        clientId: client?.id,
        destinataire: client?.nom || 'Client divers',
        motif: ['VENTE', 'TRANSFERT', 'DON'][Math.floor(Math.random() * 3)] as any,
        statut: ['BROUILLON', 'VALIDE', 'ANNULE'][Math.floor(Math.random() * 3)] as any,
        totalHT: totalHT,
        totalTTC: totalTTC,
        createdBy: adminUser.id
      }
    })
    
    // Ajouter des lignes
    const numLines = Math.floor(Math.random() * 3) + 1
    for (let j = 0; j < numLines; j++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)]
      const quantite = Math.floor(Math.random() * 10) + 1
      const prixHT = product.prixVente
      const prixTTC = prixHT * 1.19
      
      await prisma.ligneBonSortie.create({
        data: {
          bonSortieId: bonSortie.id,
          productId: product.id,
          homeId: principal.id,
          quantite: quantite,
          prixUnitaireHT: prixHT,
          prixUnitaireTTC: prixTTC,
          totalHT: quantite * prixHT,
          totalTTC: quantite * prixTTC,
          tva: 19
        }
      })
    }
  }

  // ============= 11. CRÉATION DES FACTURES FOURNISSEURS =============
  console.log('📄 Création des factures fournisseurs...')
  
  for (let i = 1; i <= 10; i++) {
    const fournisseur = fournisseurs[Math.floor(Math.random() * fournisseurs.length)]
    const totalHT = Math.random() * 10000 + 1000
    const totalTVA = totalHT * 0.19
    const totalTTC = totalHT + totalTVA
    
    const facture = await prisma.factureFournisseur.create({
      data: {
        numero: `F-FOUR-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        fournisseurId: fournisseur.id,
        totalHT: totalHT,
        totalTVA: totalTVA,
        totalTTC: totalTTC,
        statut: ['IMPAYEE', 'PARTIELLE', 'PAYEE'][Math.floor(Math.random() * 3)] as any
      }
    })
    
    // Ajouter des lignes
    const numLines = Math.floor(Math.random() * 5) + 1
    for (let j = 0; j < numLines; j++) {
      const product = createdProducts[Math.floor(Math.random() * createdProducts.length)]
      const quantite = Math.floor(Math.random() * 50) + 10
      const prixHT = product.prixAchat
      
      await prisma.ligneFactureFournisseur.create({
        data: {
          factureId: facture.id,
          productId: product.id,
          quantite: quantite,
          prixUnitaireHT: prixHT,
          totalHT: quantite * prixHT,
          totalTTC: quantite * prixHT * 1.19,
          tva: 19,
          homeId: principal.id
        }
      })
    }
  }

  // ============= 12. CRÉATION DES BONS D'ENTREE =============
  console.log('📥 Création des bons d\'entrée...')
  
  for (let i = 1; i <= 12; i++) {
    const fournisseur = fournisseurs[Math.floor(Math.random() * fournisseurs.length)]
    const totalHT = Math.random() * 5000 + 500
    const totalTVA = totalHT * 0.19
    const totalTTC = totalHT + totalTVA
    
    await prisma.bonEntree.create({
      data: {
        numero: `BE-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        fournisseurId: fournisseur.id,
        type: ['BS', 'BL', 'FAC', 'AUCUN'][Math.floor(Math.random() * 4)] as any,
        statut: ['BROUILLON', 'VALIDE'][Math.floor(Math.random() * 2)] as any,
        totalHT: totalHT,
        totalTVA: totalTVA,
        totalTTC: totalTTC,
        createdBy: adminUser.id
      }
    })
  }

  // ============= 13. CRÉATION DES TRANSFERTS DE STOCK =============
  console.log('🔄 Création des transferts de stock...')
  
  for (let i = 1; i <= 8; i++) {
    const product = createdProducts[Math.floor(Math.random() * createdProducts.length)]
    const sourceHome = i % 2 === 0 ? principal : voitureA
    const destHome = i % 2 === 0 ? voitureB : principal
    
    await prisma.transfertStock.create({
      data: {
        numero: `TR-${String(i).padStart(5, '0')}`,
        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        productId: product.id,
        sourceHomeId: sourceHome.id,
        destinationHomeId: destHome.id,
        quantite: Math.floor(Math.random() * 30) + 5,
        motif: 'Réapprovisionnement véhicule',
        statut: ['EN_ATTENTE', 'VALIDE'][Math.floor(Math.random() * 2)] as any,
        validePar: Math.random() > 0.3 ? adminUser.id : undefined,
        dateValidation: Math.random() > 0.3 ? new Date() : undefined
      }
    })
  }

  // ============= 14. CRÉATION DES RÈGLEMENTS CLIENTS =============
  console.log('💰 Création des règlements clients...')
  
  for (let i = 1; i <= 25; i++) {
    const client = clients[Math.floor(Math.random() * clients.length)]
    const montant = Math.random() * 5000 + 100
    
    await prisma.reglementClient.create({
      data: {
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000),
        clientId: client.id,
        montant: montant,
        typeReglement: ['ESPECE', 'CHEQUE', 'VIREMENT', 'TRAITE_BANCAIRE'][Math.floor(Math.random() * 4)] as any,
        statut: ['EN_ATTENTE', 'ENCAISSE', 'PAYE'][Math.floor(Math.random() * 3)] as any
      }
    })
  }

  // ============= 15. CRÉATION DES MOUVEMENTS DE CAISSE =============
  console.log('💵 Création des mouvements de caisse...')
  
  // Créer une caisse ouverte
  const caisse = await prisma.caisse.create({
    data: {
      date: new Date(),
      soldeOuverture: 5000,
      soldeTheorique: 5000,
      statut: 'OUVERTE'
    }
  })
  
  // Ajouter des mouvements
  for (let i = 1; i <= 30; i++) {
    const type = Math.random() > 0.5 ? 'ENCAISSEMENT' : 'DECAISSEMENT'
    const montant = Math.random() * 1000 + 50
    
    await prisma.mouvementCaisse.create({
      data: {
        date: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000),
        caisseId: caisse.id,
        type: type as any,
        modeReglement: ['ESPECE', 'CHEQUE', 'VIREMENT'][Math.floor(Math.random() * 3)] as any,
        montant: montant,
        libelle: type === 'ENCAISSEMENT' ? 'Vente client' : 'Achat fournisseur'
      }
    })
  }

  // ============= 16. CRÉATION DES INVENTAIRES =============
  console.log('📊 Création des inventaires...')
  
  const inventaire = await prisma.inventaire.create({
    data: {
      numero: 'INV-2024-001',
      date: new Date(),
      dateDebut: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      dateFin: new Date(),
      statut: 'VALIDE',
      validePar: adminUser.id,
      dateValidation: new Date()
    }
  })
  
  // Ajouter des lignes d'inventaire
  for (const product of createdProducts.slice(0, 20)) {
    const stockTheorique = product.quantiteStock
    const ecart = Math.floor(Math.random() * 10) - 5
    const stockPhysique = Math.max(0, stockTheorique + ecart)
    
    await prisma.ligneInventaire.create({
      data: {
        inventaireId: inventaire.id,
        productId: product.id,
        homeId: principal.id,
        quantiteTheorique: stockTheorique,
        quantitePhysique: stockPhysique,
        ecart: ecart,
        commentaire: ecart !== 0 ? 'Ajustement inventaire' : undefined
      }
    })
  }

  // ============= 17. CRÉATION DES PERMISSIONS DE RÔLES =============
  console.log('🔐 Création des permissions...')
  
  const rolePermissions = [
    { role: 'ADMIN', permission: 'can_view_products' },
    { role: 'ADMIN', permission: 'can_edit_products' },
    { role: 'ADMIN', permission: 'can_delete_products' },
    { role: 'ADMIN', permission: 'can_view_clients' },
    { role: 'ADMIN', permission: 'can_edit_clients' },
    { role: 'ADMIN', permission: 'can_view_vehicles' },
    { role: 'ADMIN', permission: 'can_edit_vehicles' },
    { role: 'ADMIN', permission: 'can_view_transfers' },
    { role: 'ADMIN', permission: 'can_validate_transfers' },
    { role: 'CHAUFFEUR', permission: 'can_view_products' },
    { role: 'CHAUFFEUR', permission: 'can_view_deliveries' },
    { role: 'CHAUFFEUR', permission: 'can_update_delivery_status' },
    { role: 'CHAUFFEUR', permission: 'can_view_assigned_vehicle' }
  ]
  
  for (const rp of rolePermissions) {
    await prisma.rolePermission.upsert({
      where: { role_permission: { role: rp.role as any, permission: rp.permission } },
      update: {},
      create: {
        role: rp.role as any,
        permission: rp.permission,
        granted: true
      }
    })
  }

  console.log('✅ Seeding terminé avec succès !')
  console.log(`📊 Résumé:`)
  console.log(`   - ${await prisma.user.count()} utilisateurs`)
  console.log(`   - ${await prisma.product.count()} produits`)
  console.log(`   - ${await prisma.client.count()} clients`)
  console.log(`   - ${await prisma.bonLivraison.count()} bons de livraison`)
  console.log(`   - ${await prisma.bonSortie.count()} bons de sortie`)
  console.log(`   - ${await prisma.factureFournisseur.count()} factures fournisseurs`)
  console.log(`   - ${await prisma.transfertStock.count()} transferts de stock`)
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })