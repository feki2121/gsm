
// Enums
export enum Role {
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  CAISSIER = "CAISSIER",
}

export enum TypeMouvementStock {
  ENTREE = "ENTREE",
  SORTIE = "SORTIE",
  AJUSTEMENT = "AJUSTEMENT",
}

export enum StatutDevis {
  EN_ATTENTE = "EN_ATTENTE",
  ACCEPTE = "ACCEPTE",
  REFUSE = "REFUSE",
  TRANSFORME_EN_FACTURE = "TRANSFORME_EN_FACTURE",
}

export enum StatutBL {
  EN_ATTENTE = "EN_ATTENTE",
  LIVRE = "LIVRE",
  ANNULE = "ANNULE",
}

export enum StatutFacture {
  PAYEE = "PAYEE",
  IMPAYEE = "IMPAYEE",
  PARTIELLE = "PARTIELLE",
}

export enum TypeFacture {
  DEVIS = "DEVIS",
  DIRECTE = "DIRECTE",
}

export enum TypeReglement {
  ESPECE = "ESPECE",
  CHEQUE = "CHEQUE",
  TRAITE_DOMICILE = "TRAITE_DOMICILE",
  TRAITE_BANCAIRE = "TRAITE_BANCAIRE",
  VIREMENT = "VIREMENT",
  CREDIT = "CREDIT",
  MIXTE = "MIXTE",
}

export enum StatutReglement {
  EN_ATTENTE = "EN_ATTENTE",
  PARTIELLE = "PARTIELLE",
  ENCAISSE = "ENCAISSE",
  PAYE = "PAYE",
  REJETE = "REJETE",
  RENOUVELE = "RENOUVELE",
}

export enum StatutCaisse {
  OUVERTE = "OUVERTE",
  CLOTUREE = "CLOTUREE",
}

export enum TypeMouvementCaisse {
  ENCAISSEMENT = "ENCAISSEMENT",
  DECAISSEMENT = "DECAISSEMENT",
  DECAISSEMENTVIRTUEL = "DECAISSEMENTVIRTUEL",
  ENCAISSEMENTVIRTUEL = "ENCAISSEMENTVIRTUEL",
  ENCAISSEMENTCREDIT = "ENCAISSEMENTCREDIT",
}

export enum CategorieDepense {
  ESSENCE = "ESSENCE",
  ELECTRICITE = "ELECTRICITE",
  EAU = "EAU",
  TELECOM = "TELECOM",
  REPARATION = "REPARATION",
  FOURNITURE = "FOURNITURE",
  AUTRE = "AUTRE",
}

// Interfaces
export interface User {
  id: string;
  email: string;
  password: string;
  nom: string;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

export interface Home {
  id: string;
  nom: string;
  description?: string;
  createdAt: Date;
}

export interface Category {
  id: string;
  nom: string;
  description?: string;
  createdAt: Date;
}

export interface StockLocation {
  id: string;
  productId: string;
  homeId: string;
  quantite: number;
  home?: Home;
}

export interface Product {
  id: string;
  imageUrl: string;
  reference: string;
  code?: string;
  designation: string;
  categoryId: string;
  category?: Category;
  homeId: string;
  home?: Home;
  prixAchat: number;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
  quantiteStock: number;
  seuilAlerte: number;
  stockLocations?: StockLocation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface StockMovement {
  id: string;
  productId: string;
  product?: Product;
  type: TypeMouvementStock;
  quantite: number;
  motif: string;
  date: Date;
}

export interface Client {
  id: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string | null;
  mf: string | null;
  cin: string | null;
  adresse: string | null;
  solde: number;
  latitude: number | null;
  longitude: number | null;
  lieuDit: string | null;
  codePostal: string | null;
  ville: string | null;
  createdAt: string;
  updatedAt: string;
  addresses?: ClientAddress[];

}

export interface ClientAddress {
  id: string;
  clientId: string;
  adresse: string;
  lieuDit: string | null;
  codePostal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  estPrincipale: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  matriculeFiscal? : string;
  adresse?: string;
  email?: string;
  solde: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneDevis {
  id: string;
  devisId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

export interface Devis {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTTC: number;
  validite: Date;
  statut: StatutDevis;
  lignes: LigneDevis[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneBL {
  id: string;
  bonLivraisonId: string;
  productId: string;
  product?: Product;
  quantite: number;
}

export interface BonLivraison {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  factureId?: string;
  statut: StatutBL;
  lignes: LigneBL[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneFacture {
  id: string;
  factureId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

export interface Facture {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
  statut: StatutFacture;
  type: TypeFacture;
  lignes: LigneFacture[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LigneRetourClient {
  id: string;
  retourClientId: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
}

export interface RetourClient {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  factureId?: string;
  montant: number;
  lignes: LigneRetourClient[];
  createdAt: Date;
}

export interface RetourFournisseur {
  id: string;
  numero: string;
  date: Date;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  montant: number;
  createdAt: Date;
}

export interface ReglementFacture {
  id: string;
  reglementId: string;
  factureId: string;
  facture?: Facture;
  montantApplique: number;
}

export interface ReglementClientBL {
  id: string;
  reglementId: string;
  bonLivraisonId: string;
  bonLivraison?: BonLivraison;
  montantApplique: number;
}

export interface ReglementClient {
  id: string;
  date: Date;
  clientId: string;
  client?: Client;
  montant: number;
  typeReglement: TypeReglement;
  reference?: string;
  statut: StatutReglement;
  echeance?: Date;
  banque?: string;
  nameSecondClient?: string;
  detailsMixte: string | null;
  domiciliation?: string;
  factures: ReglementFacture[];
  bonsLivraison: ReglementClientBL[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ReglementFournisseur {
  id: string;
  date: Date;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  montant: number;
  typeReglement: TypeReglement;
  reference?: string;
  statut: StatutReglement;
  echeance?: Date;
  banque?: string;
  domiciliation?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReglementDivers {
  id: string;
  date: Date;
  libelle: string;
  categorie: CategorieDepense;
  montant: number;
  modeReglement: TypeReglement;
  reference?: string;
  justificatif?: string;
  createdAt: Date;
}

export interface MouvementCaisse {
  id: string;
  date: Date;
  caisseId: string;
  type: TypeMouvementCaisse;
  modeReglement: TypeReglement;
  montant: number;
  reference?: string;
  libelle: string;
  createdAt: Date;
}

export interface Caisse {
  id: string;
  date: Date;
  soldeOuverture: number;
  totalEncaissements: number;
  totalDecaissements: number;
  soldeTheorique: number;
  soldeReel?: number;
  ecart?: number;
  statut: StatutCaisse;
  mouvements: MouvementCaisse[];
  createdAt: Date;
  updatedAt: Date;
}

// Utility function for formatting currency
// lib/types.ts
export function formatCurrency(amount: number): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return "0.000 TND";
  }
  return amount.toLocaleString("fr-TN", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }) + " TND";
}
// Utility function for formatting dates
export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Label mappings
export const statutDevisLabels: Record<StatutDevis, string> = {
  [StatutDevis.EN_ATTENTE]: "En attente",
  [StatutDevis.ACCEPTE]: "Accepté",
  [StatutDevis.REFUSE]: "Refusé",
  [StatutDevis.TRANSFORME_EN_FACTURE]: "Transformé en facture",
};

export const statutFactureLabels: Record<StatutFacture, string> = {
  [StatutFacture.PAYEE]: "Payée",
  [StatutFacture.IMPAYEE]: "Impayée",
  [StatutFacture.PARTIELLE]: "Partielle",
};

export const statutBLLabels: Record<StatutBL, string> = {
  [StatutBL.EN_ATTENTE]: "En attente",
  [StatutBL.LIVRE]: "Livré",
  [StatutBL.ANNULE]: "Annulé",
};

export const typeReglementLabels: Record<TypeReglement, string> = {
  [TypeReglement.ESPECE]: "Espèce",
  [TypeReglement.CHEQUE]: "Chèque",
  [TypeReglement.TRAITE_DOMICILE]: "Traite à domicile",
  [TypeReglement.TRAITE_BANCAIRE]: "Traite bancaire",
  [TypeReglement.VIREMENT]: "Virement",
  [TypeReglement.CREDIT]: "Crédit",
  [TypeReglement.MIXTE]: "Paiement Mixte",
};

export const statutReglementLabels: Record<StatutReglement, string> = {
  [StatutReglement.EN_ATTENTE]: "En attente",
  [StatutReglement.PARTIELLE]: "Partielle",
  [StatutReglement.ENCAISSE]: "Encaissé",
  [StatutReglement.PAYE]: "Payé",
  [StatutReglement.REJETE]: "Rejeté",
  [StatutReglement.RENOUVELE]: "Renouvelé",
};

export const categorieDepenseLabels: Record<CategorieDepense, string> = {
  [CategorieDepense.ESSENCE]: "Essence",
  [CategorieDepense.ELECTRICITE]: "Électricité",
  [CategorieDepense.EAU]: "Eau",
  [CategorieDepense.TELECOM]: "Télécom",
  [CategorieDepense.REPARATION]: "Réparation",
  [CategorieDepense.FOURNITURE]: "Fourniture",
  [CategorieDepense.AUTRE]: "Autre",
};

export const typeMouvementStockLabels: Record<TypeMouvementStock, string> = {
  [TypeMouvementStock.ENTREE]: "Entrée",
  [TypeMouvementStock.SORTIE]: "Sortie",
  [TypeMouvementStock.AJUSTEMENT]: "Ajustement",
};



export const formatDateTime = (date: Date | string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};



// ... autres exports