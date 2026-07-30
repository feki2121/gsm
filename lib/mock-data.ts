import {
  Category,
  Home,
  Product,
  Client,
  Fournisseur,
  Devis,
  BonLivraison,
  Facture,
  ReglementClient,
  ReglementFournisseur,
  ReglementDivers,
  Caisse,
  StockMovement,
  StatutDevis,
  StatutBL,
  StatutFacture,
  TypeFacture,
  TypeReglement,
  StatutReglement,
  StatutCaisse,
  TypeMouvementCaisse,
  CategorieDepense,
  TypeMouvementStock,
} from "./types";

// Homes (Emplacements)
export const homes: Home[] = [
  { id: "home-1", nom: "Showroom Principal", description: "Espace d'exposition principal", createdAt: new Date("2024-01-01") },
  { id: "home-2", nom: "Entrepôt A", description: "Stockage principal", createdAt: new Date("2024-01-01") },
  { id: "home-3", nom: "Entrepôt B", description: "Stockage secondaire", createdAt: new Date("2024-01-01") },
];

// Categories
export const categories: Category[] = [
  { id: "cat-1", nom: "Réfrigérateur", description: "Réfrigérateurs et congélateurs", createdAt: new Date("2024-01-01") },
  { id: "cat-2", nom: "Lave-linge", description: "Machines à laver", createdAt: new Date("2024-01-01") },
  { id: "cat-3", nom: "Télévision", description: "Téléviseurs et écrans", createdAt: new Date("2024-01-01") },
  { id: "cat-4", nom: "Climatisation", description: "Climatiseurs et ventilateurs", createdAt: new Date("2024-01-01") },
  { id: "cat-5", nom: "Cuisine", description: "Électroménager de cuisine", createdAt: new Date("2024-01-01") },
  { id: "cat-6", nom: "Four", description: "Fours et micro-ondes", createdAt: new Date("2024-01-01") },
];

// Products
export const products: Product[] = [
  {
    id: "prod-1",
    reference: "REF-001",
    designation: "Réfrigérateur Samsung 450L",
    categoryId: "cat-1",
    category: categories[0],
    homeId: "home-1",
    home: homes[0],
    prixAchat: 1800,
    prixVente: 2499,
    quantiteStock: 8,
    seuilAlerte: 3,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "prod-2",
    reference: "REF-002",
    designation: "Réfrigérateur LG 380L",
    categoryId: "cat-1",
    category: categories[0],
    homeId: "home-2",
    home: homes[1],
    prixAchat: 1500,
    prixVente: 1999,
    quantiteStock: 5,
    seuilAlerte: 3,
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
  },
  {
    id: "prod-3",
    reference: "LAV-001",
    designation: "Lave-linge Beko 8kg",
    categoryId: "cat-2",
    category: categories[1],
    homeId: "home-1",
    home: homes[0],
    prixAchat: 900,
    prixVente: 1299,
    quantiteStock: 12,
    seuilAlerte: 5,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "prod-4",
    reference: "LAV-002",
    designation: "Lave-linge Samsung 10kg",
    categoryId: "cat-2",
    category: categories[1],
    homeId: "home-2",
    home: homes[1],
    prixAchat: 1200,
    prixVente: 1699,
    quantiteStock: 2,
    seuilAlerte: 3,
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
  },
  {
    id: "prod-5",
    reference: "TV-001",
    designation: "TV Samsung 55\" 4K",
    categoryId: "cat-3",
    category: categories[2],
    homeId: "home-1",
    home: homes[0],
    prixAchat: 2200,
    prixVente: 2999,
    quantiteStock: 6,
    seuilAlerte: 2,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "prod-6",
    reference: "TV-002",
    designation: "TV LG 65\" OLED",
    categoryId: "cat-3",
    category: categories[2],
    homeId: "home-1",
    home: homes[0],
    prixAchat: 4500,
    prixVente: 5999,
    quantiteStock: 3,
    seuilAlerte: 2,
    createdAt: new Date("2024-02-01"),
    updatedAt: new Date("2024-02-01"),
  },
  {
    id: "prod-7",
    reference: "CLIM-001",
    designation: "Climatiseur Carrier 12000 BTU",
    categoryId: "cat-4",
    category: categories[3],
    homeId: "home-2",
    home: homes[1],
    prixAchat: 1100,
    prixVente: 1599,
    quantiteStock: 15,
    seuilAlerte: 5,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10"),
  },
  {
    id: "prod-8",
    reference: "CLIM-002",
    designation: "Climatiseur LG 18000 BTU",
    categoryId: "cat-4",
    category: categories[3],
    homeId: "home-2",
    home: homes[1],
    prixAchat: 1600,
    prixVente: 2199,
    quantiteStock: 1,
    seuilAlerte: 3,
    createdAt: new Date("2024-02-10"),
    updatedAt: new Date("2024-02-10"),
  },
  {
    id: "prod-9",
    reference: "CUI-001",
    designation: "Robot Moulinex Companion",
    categoryId: "cat-5",
    category: categories[4],
    homeId: "home-1",
    home: homes[0],
    prixAchat: 800,
    prixVente: 1199,
    quantiteStock: 7,
    seuilAlerte: 3,
    createdAt: new Date("2024-02-15"),
    updatedAt: new Date("2024-02-15"),
  },
  {
    id: "prod-10",
    reference: "FOUR-001",
    designation: "Four Bosch Encastrable",
    categoryId: "cat-6",
    category: categories[5],
    homeId: "home-3",
    home: homes[2],
    prixAchat: 1300,
    prixVente: 1799,
    quantiteStock: 4,
    seuilAlerte: 2,
    createdAt: new Date("2024-02-20"),
    updatedAt: new Date("2024-02-20"),
  },
];

// Clients
export const clients: Client[] = [
  { id: "cli-1", nom: "Mohamed Ben Ali", telephone: "71 234 567", adresse: "15 Rue de Tunis, Sfax", email: "mohamed.benali@email.com", solde: 2500, createdAt: new Date("2024-01-01"), updatedAt: new Date() },
  { id: "cli-2", nom: "Fatma Trabelsi", telephone: "98 765 432", adresse: "22 Avenue Bourguiba, Sousse", email: "fatma.t@email.com", solde: 0, createdAt: new Date("2024-01-15"), updatedAt: new Date() },
  { id: "cli-3", nom: "Ahmed Mansour", telephone: "55 123 789", adresse: "8 Rue des Jasmins, Monastir", email: "ahmed.m@email.com", solde: 4200, createdAt: new Date("2024-02-01"), updatedAt: new Date() },
  { id: "cli-4", nom: "Sonia Khalfi", telephone: "22 456 789", adresse: "45 Avenue de la Liberté, Tunis", email: "sonia.k@email.com", solde: 1800, createdAt: new Date("2024-02-10"), updatedAt: new Date() },
  { id: "cli-5", nom: "Karim Bouazizi", telephone: "50 987 654", adresse: "12 Rue Ibn Khaldoun, Bizerte", email: "karim.b@email.com", solde: 0, createdAt: new Date("2024-03-01"), updatedAt: new Date() },
];

// Fournisseurs
export const fournisseurs: Fournisseur[] = [
  { id: "four-1", nom: "Samsung Tunisie", telephone: "71 800 800", adresse: "Zone Industrielle Tunis", email: "contact@samsung.tn", solde: 15000, createdAt: new Date("2024-01-01"), updatedAt: new Date() },
  { id: "four-2", nom: "LG Distribution", telephone: "71 700 700", adresse: "Mégrine, Ben Arous", email: "lg.tunisie@email.com", solde: 8500, createdAt: new Date("2024-01-01"), updatedAt: new Date() },
  { id: "four-3", nom: "Beko Import", telephone: "71 600 600", adresse: "Zone Industrielle Sousse", email: "beko@email.com", solde: 5200, createdAt: new Date("2024-01-15"), updatedAt: new Date() },
  { id: "four-4", nom: "Carrier Climatisation", telephone: "71 500 500", adresse: "La Marsa, Tunis", email: "carrier@email.com", solde: 0, createdAt: new Date("2024-02-01"), updatedAt: new Date() },
];

// Stock Movements
export const stockMovements: StockMovement[] = [
  { id: "mv-1", productId: "prod-1", type: TypeMouvementStock.ENTREE, quantite: 10, motif: "Achat initial", date: new Date("2024-01-15") },
  { id: "mv-2", productId: "prod-1", type: TypeMouvementStock.SORTIE, quantite: 2, motif: "Vente facture F-001", date: new Date("2024-02-20") },
  { id: "mv-3", productId: "prod-3", type: TypeMouvementStock.ENTREE, quantite: 15, motif: "Réapprovisionnement", date: new Date("2024-02-01") },
  { id: "mv-4", productId: "prod-3", type: TypeMouvementStock.SORTIE, quantite: 3, motif: "Vente facture F-002", date: new Date("2024-03-05") },
  { id: "mv-5", productId: "prod-5", type: TypeMouvementStock.ENTREE, quantite: 8, motif: "Achat fournisseur", date: new Date("2024-02-10") },
  { id: "mv-6", productId: "prod-5", type: TypeMouvementStock.SORTIE, quantite: 2, motif: "Vente", date: new Date("2024-03-10") },
];

// Devis
export const devis: Devis[] = [
  {
    id: "dev-1",
    numero: "DEV-2024-001",
    date: new Date("2024-03-01"),
    clientId: "cli-1",
    client: clients[0],
    totalHT: 4198,
    totalTTC: 4995.62,
    validite: new Date("2024-04-01"),
    statut: StatutDevis.ACCEPTE,
    lignes: [
      { id: "ld-1", devisId: "dev-1", productId: "prod-1", product: products[0], quantite: 1, prixUnitaire: 2499, tva: 19 },
      { id: "ld-2", devisId: "dev-1", productId: "prod-3", product: products[2], quantite: 1, prixUnitaire: 1299, tva: 19 },
    ],
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "dev-2",
    numero: "DEV-2024-002",
    date: new Date("2024-03-10"),
    clientId: "cli-3",
    client: clients[2],
    totalHT: 5998,
    totalTTC: 7137.62,
    validite: new Date("2024-04-10"),
    statut: StatutDevis.EN_ATTENTE,
    lignes: [
      { id: "ld-3", devisId: "dev-2", productId: "prod-5", product: products[4], quantite: 2, prixUnitaire: 2999, tva: 19 },
    ],
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "dev-3",
    numero: "DEV-2024-003",
    date: new Date("2024-03-15"),
    clientId: "cli-2",
    client: clients[1],
    totalHT: 1599,
    totalTTC: 1902.81,
    validite: new Date("2024-04-15"),
    statut: StatutDevis.TRANSFORME_EN_FACTURE,
    lignes: [
      { id: "ld-4", devisId: "dev-3", productId: "prod-7", product: products[6], quantite: 1, prixUnitaire: 1599, tva: 19 },
    ],
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2024-03-20"),
  },
];

// Bons de Livraison
export const bonsLivraison: BonLivraison[] = [
  {
    id: "bl-1",
    numero: "BL-2024-001",
    date: new Date("2024-03-05"),
    clientId: "cli-1",
    client: clients[0],
    factureId: "fac-1",
    statut: StatutBL.LIVRE,
    lignes: [
      { id: "lbl-1", bonLivraisonId: "bl-1", productId: "prod-1", product: products[0], quantite: 1 },
      { id: "lbl-2", bonLivraisonId: "bl-1", productId: "prod-3", product: products[2], quantite: 1 },
    ],
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "bl-2",
    numero: "BL-2024-002",
    date: new Date("2024-03-20"),
    clientId: "cli-2",
    client: clients[1],
    factureId: "fac-2",
    statut: StatutBL.LIVRE,
    lignes: [
      { id: "lbl-3", bonLivraisonId: "bl-2", productId: "prod-7", product: products[6], quantite: 1 },
    ],
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-03-20"),
  },
  {
    id: "bl-3",
    numero: "BL-2024-003",
    date: new Date("2024-03-25"),
    clientId: "cli-4",
    client: clients[3],
    statut: StatutBL.EN_ATTENTE,
    lignes: [
      { id: "lbl-4", bonLivraisonId: "bl-3", productId: "prod-9", product: products[8], quantite: 2 },
    ],
    createdAt: new Date("2024-03-25"),
    updatedAt: new Date("2024-03-25"),
  },
];

// Factures
export const factures: Facture[] = [
  {
    id: "fac-1",
    numero: "FAC-2024-001",
    date: new Date("2024-03-05"),
    clientId: "cli-1",
    client: clients[0],
    totalHT: 3798,
    totalTVA: 721.62,
    totalTTC: 4519.62,
    remise: 0,
    statut: StatutFacture.PARTIELLE,
    type: TypeFacture.DEVIS,
    lignes: [
      { id: "lf-1", factureId: "fac-1", productId: "prod-1", product: products[0], quantite: 1, prixUnitaire: 2499, tva: 19 },
      { id: "lf-2", factureId: "fac-1", productId: "prod-3", product: products[2], quantite: 1, prixUnitaire: 1299, tva: 19 },
    ],
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "fac-2",
    numero: "FAC-2024-002",
    date: new Date("2024-03-20"),
    clientId: "cli-2",
    client: clients[1],
    totalHT: 1599,
    totalTVA: 303.81,
    totalTTC: 1902.81,
    remise: 0,
    statut: StatutFacture.PAYEE,
    type: TypeFacture.DEVIS,
    lignes: [
      { id: "lf-3", factureId: "fac-2", productId: "prod-7", product: products[6], quantite: 1, prixUnitaire: 1599, tva: 19 },
    ],
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-03-20"),
  },
  {
    id: "fac-3",
    numero: "FAC-2024-003",
    date: new Date("2024-03-22"),
    clientId: "cli-3",
    client: clients[2],
    totalHT: 7198,
    totalTVA: 1367.62,
    totalTTC: 8565.62,
    remise: 200,
    statut: StatutFacture.IMPAYEE,
    type: TypeFacture.DIRECTE,
    lignes: [
      { id: "lf-4", factureId: "fac-3", productId: "prod-5", product: products[4], quantite: 1, prixUnitaire: 2999, tva: 19 },
      { id: "lf-5", factureId: "fac-3", productId: "prod-8", product: products[7], quantite: 2, prixUnitaire: 2199, tva: 19 },
    ],
    createdAt: new Date("2024-03-22"),
    updatedAt: new Date("2024-03-22"),
  },
  {
    id: "fac-4",
    numero: "FAC-2024-004",
    date: new Date("2024-03-25"),
    clientId: "cli-4",
    client: clients[3],
    totalHT: 2398,
    totalTVA: 455.62,
    totalTTC: 2853.62,
    remise: 0,
    statut: StatutFacture.IMPAYEE,
    type: TypeFacture.DIRECTE,
    lignes: [
      { id: "lf-6", factureId: "fac-4", productId: "prod-9", product: products[8], quantite: 2, prixUnitaire: 1199, tva: 19 },
    ],
    createdAt: new Date("2024-03-25"),
    updatedAt: new Date("2024-03-25"),
  },
];

// Règlements Clients
export const reglementsClients: ReglementClient[] = [
  {
    id: "rc-1",
    date: new Date("2024-03-05"),
    clientId: "cli-1",
    client: clients[0],
    montant: 2000,
    typeReglement: TypeReglement.ESPECE,
    statut: StatutReglement.ENCAISSE,
    factures: [{ id: "rf-1", reglementId: "rc-1", factureId: "fac-1", montantApplique: 2000 }],
    createdAt: new Date("2024-03-05"),
    updatedAt: new Date("2024-03-05"),
  },
  {
    id: "rc-2",
    date: new Date("2024-03-20"),
    clientId: "cli-2",
    client: clients[1],
    montant: 1902.81,
    typeReglement: TypeReglement.CHEQUE,
    reference: "CHQ-123456",
    banque: "BIAT",
    statut: StatutReglement.ENCAISSE,
    factures: [{ id: "rf-2", reglementId: "rc-2", factureId: "fac-2", montantApplique: 1902.81 }],
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-03-20"),
  },
  {
    id: "rc-3",
    date: new Date("2024-03-22"),
    clientId: "cli-3",
    client: clients[2],
    montant: 3000,
    typeReglement: TypeReglement.TRAITE_BANCAIRE,
    reference: "TR-2024-001",
    banque: "STB",
    echeance: new Date("2024-04-22"),
    statut: StatutReglement.EN_ATTENTE,
    factures: [{ id: "rf-3", reglementId: "rc-3", factureId: "fac-3", montantApplique: 3000 }],
    createdAt: new Date("2024-03-22"),
    updatedAt: new Date("2024-03-22"),
  },
  {
    id: "rc-4",
    date: new Date("2024-03-25"),
    clientId: "cli-4",
    client: clients[3],
    montant: 1500,
    typeReglement: TypeReglement.TRAITE_DOMICILE,
    reference: "TRD-2024-001",
    domiciliation: "Agence La Marsa",
    echeance: new Date("2024-04-25"),
    statut: StatutReglement.EN_ATTENTE,
    factures: [{ id: "rf-4", reglementId: "rc-4", factureId: "fac-4", montantApplique: 1500 }],
    createdAt: new Date("2024-03-25"),
    updatedAt: new Date("2024-03-25"),
  },
  {
    id: "rc-5",
    date: new Date("2024-03-28"),
    clientId: "cli-1",
    client: clients[0],
    montant: 2500,
    typeReglement: TypeReglement.TRAITE_BANCAIRE,
    reference: "TR-2024-002",
    banque: "BIAT",
    echeance: new Date("2024-05-15"),
    statut: StatutReglement.EN_ATTENTE,
    factures: [],
    createdAt: new Date("2024-03-28"),
    updatedAt: new Date("2024-03-28"),
  },
];

// Règlements Fournisseurs
export const reglementsFournisseurs: ReglementFournisseur[] = [
  {
    id: "rfr-1",
    date: new Date("2024-03-01"),
    fournisseurId: "four-1",
    fournisseur: fournisseurs[0],
    montant: 10000,
    typeReglement: TypeReglement.TRAITE_BANCAIRE,
    reference: "TRF-2024-001",
    banque: "BIAT",
    echeance: new Date("2024-04-01"),
    statut: StatutReglement.EN_ATTENTE,
    createdAt: new Date("2024-03-01"),
    updatedAt: new Date("2024-03-01"),
  },
  {
    id: "rfr-2",
    date: new Date("2024-03-10"),
    fournisseurId: "four-2",
    fournisseur: fournisseurs[1],
    montant: 5000,
    typeReglement: TypeReglement.CHEQUE,
    reference: "CHQ-789012",
    banque: "STB",
    statut: StatutReglement.PAYE,
    createdAt: new Date("2024-03-10"),
    updatedAt: new Date("2024-03-10"),
  },
  {
    id: "rfr-3",
    date: new Date("2024-03-15"),
    fournisseurId: "four-3",
    fournisseur: fournisseurs[2],
    montant: 3000,
    typeReglement: TypeReglement.TRAITE_DOMICILE,
    reference: "TRD-F-001",
    domiciliation: "Agence Sousse",
    echeance: new Date("2024-04-15"),
    statut: StatutReglement.EN_ATTENTE,
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2024-03-15"),
  },
  {
    id: "rfr-4",
    date: new Date("2024-03-20"),
    fournisseurId: "four-1",
    fournisseur: fournisseurs[0],
    montant: 8000,
    typeReglement: TypeReglement.TRAITE_BANCAIRE,
    reference: "TRF-2024-002",
    banque: "ATB",
    echeance: new Date("2024-05-20"),
    statut: StatutReglement.EN_ATTENTE,
    createdAt: new Date("2024-03-20"),
    updatedAt: new Date("2024-03-20"),
  },
];

// Règlements Divers
export const reglementsDivers: ReglementDivers[] = [
  {
    id: "rd-1",
    date: new Date("2024-03-01"),
    libelle: "Carburant véhicule livraison",
    categorie: CategorieDepense.ESSENCE,
    montant: 150,
    modeReglement: TypeReglement.ESPECE,
    createdAt: new Date("2024-03-01"),
  },
  {
    id: "rd-2",
    date: new Date("2024-03-05"),
    libelle: "Facture STEG Mars",
    categorie: CategorieDepense.ELECTRICITE,
    montant: 450,
    modeReglement: TypeReglement.CHEQUE,
    reference: "CHQ-EL-001",
    createdAt: new Date("2024-03-05"),
  },
  {
    id: "rd-3",
    date: new Date("2024-03-10"),
    libelle: "Réparation climatiseur magasin",
    categorie: CategorieDepense.REPARATION,
    montant: 280,
    modeReglement: TypeReglement.ESPECE,
    createdAt: new Date("2024-03-10"),
  },
  {
    id: "rd-4",
    date: new Date("2024-03-15"),
    libelle: "Fournitures bureau",
    categorie: CategorieDepense.FOURNITURE,
    montant: 120,
    modeReglement: TypeReglement.ESPECE,
    createdAt: new Date("2024-03-15"),
  },
  {
    id: "rd-5",
    date: new Date("2024-03-20"),
    libelle: "Facture Tunisie Télécom",
    categorie: CategorieDepense.TELECOM,
    montant: 85,
    modeReglement: TypeReglement.CHEQUE,
    reference: "CHQ-TEL-001",
    createdAt: new Date("2024-03-20"),
  },
  {
    id: "rd-6",
    date: new Date("2024-03-25"),
    libelle: "Facture SONEDE",
    categorie: CategorieDepense.EAU,
    montant: 65,
    modeReglement: TypeReglement.ESPECE,
    createdAt: new Date("2024-03-25"),
  },
];

// Caisse
export const caisses: Caisse[] = [
  {
    id: "caisse-1",
    date: new Date("2024-03-25"),
    soldeOuverture: 5000,
    totalEncaissements: 3500,
    totalDecaissements: 1200,
    soldeTheorique: 7300,
    soldeReel: 7300,
    ecart: 0,
    statut: StatutCaisse.CLOTUREE,
    mouvements: [
      { id: "mc-1", date: new Date("2024-03-25T09:30:00"), caisseId: "caisse-1", type: TypeMouvementCaisse.ENCAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 2000, reference: "FAC-2024-004", libelle: "Règlement partiel facture", createdAt: new Date() },
      { id: "mc-2", date: new Date("2024-03-25T11:00:00"), caisseId: "caisse-1", type: TypeMouvementCaisse.ENCAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 1500, reference: "FAC-2024-005", libelle: "Vente comptant", createdAt: new Date() },
      { id: "mc-3", date: new Date("2024-03-25T14:30:00"), caisseId: "caisse-1", type: TypeMouvementCaisse.DECAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 150, libelle: "Carburant livraison", createdAt: new Date() },
      { id: "mc-4", date: new Date("2024-03-25T16:00:00"), caisseId: "caisse-1", type: TypeMouvementCaisse.DECAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 1050, libelle: "Règlement fournisseur", createdAt: new Date() },
    ],
    createdAt: new Date("2024-03-25"),
    updatedAt: new Date("2024-03-25"),
  },
  {
    id: "caisse-2",
    date: new Date("2024-03-26"),
    soldeOuverture: 7300,
    totalEncaissements: 4200,
    totalDecaissements: 850,
    soldeTheorique: 10650,
    statut: StatutCaisse.OUVERTE,
    mouvements: [
      { id: "mc-5", date: new Date("2024-03-26T10:00:00"), caisseId: "caisse-2", type: TypeMouvementCaisse.ENCAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 2500, reference: "FAC-2024-006", libelle: "Règlement facture client", createdAt: new Date() },
      { id: "mc-6", date: new Date("2024-03-26T11:30:00"), caisseId: "caisse-2", type: TypeMouvementCaisse.ENCAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 1700, reference: "FAC-2024-007", libelle: "Vente comptant", createdAt: new Date() },
      { id: "mc-7", date: new Date("2024-03-26T15:00:00"), caisseId: "caisse-2", type: TypeMouvementCaisse.DECAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 350, libelle: "Fournitures diverses", createdAt: new Date() },
      { id: "mc-8", date: new Date("2024-03-26T16:30:00"), caisseId: "caisse-2", type: TypeMouvementCaisse.DECAISSEMENT, modeReglement: TypeReglement.ESPECE, montant: 500, libelle: "Réparation véhicule", createdAt: new Date() },
    ],
    createdAt: new Date("2024-03-26"),
    updatedAt: new Date("2024-03-26"),
  },
];

// Dashboard Stats
export function getDashboardStats() {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  
  const caJour = factures
    .filter(f => new Date(f.date).toDateString() === today.toDateString())
    .reduce((sum, f) => sum + f.totalTTC, 0);
  
  const caMois = factures
    .filter(f => new Date(f.date) >= startOfMonth)
    .reduce((sum, f) => sum + f.totalTTC, 0);
  
  const totalCreances = clients.reduce((sum, c) => sum + c.solde, 0);
  const totalDettes = fournisseurs.reduce((sum, f) => sum + f.solde, 0);
  
  const produitsAlerte = products.filter(p => p.quantiteStock <= p.seuilAlerte);
  
  const traitesEnAttente = reglementsClients.filter(
    r => (r.typeReglement === TypeReglement.TRAITE_BANCAIRE || r.typeReglement === TypeReglement.TRAITE_DOMICILE) && r.statut === StatutReglement.EN_ATTENTE
  );
  
  const facturesImpayees = factures.filter(f => f.statut === StatutFacture.IMPAYEE || f.statut === StatutFacture.PARTIELLE);
  
  const caisseActuelle = caisses.find(c => c.statut === StatutCaisse.OUVERTE);
  
  return {
    caJour,
    caMois,
    totalCreances,
    totalDettes,
    produitsAlerte,
    traitesEnAttente,
    facturesImpayees,
    soldeCaisse: caisseActuelle?.soldeTheorique || 0,
    nbClients: clients.length,
    nbProduits: products.length,
    nbFacturesMois: factures.filter(f => new Date(f.date) >= startOfMonth).length,
  };
}

// Get upcoming traites (7 days)
export function getUpcomingTraites() {
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  
  const clientTraites = reglementsClients.filter(r => 
    (r.typeReglement === TypeReglement.TRAITE_BANCAIRE || r.typeReglement === TypeReglement.TRAITE_DOMICILE) &&
    r.statut === StatutReglement.EN_ATTENTE &&
    r.echeance &&
    new Date(r.echeance) <= in7Days
  );
  
  const fournisseurTraites = reglementsFournisseurs.filter(r =>
    (r.typeReglement === TypeReglement.TRAITE_BANCAIRE || r.typeReglement === TypeReglement.TRAITE_DOMICILE) &&
    r.statut === StatutReglement.EN_ATTENTE &&
    r.echeance &&
    new Date(r.echeance) <= in7Days
  );
  
  return { clientTraites, fournisseurTraites };
}
