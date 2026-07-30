// types/auth.ts
export interface CreateUserDTO {
  email: string;
  password: string;
  nom: string;
  role: UserRole;
  chauffeur?: CreateChauffeurDTO; // Optionnel, si le rôle est CHAUFFEUR
}

export interface CreateChauffeurDTO {
  nom: string;
  telephone: string;
  vehiculeId?: string;
}

export interface UpdateUserDTO {
  email?: string;
  nom?: string;
  role?: UserRole;
  password?: string; // Optionnel, pour changement de mot de passe
}

export interface UserResponse {
  id: string;
  email: string;
  nom: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
  chauffeur?: ChauffeurResponse;
}

export interface ChauffeurResponse {
  id: string;
  nom: string;
  telephone: string;
  vehicule?: {
    id: string;
    immatricule: string;
    nom: string;
  };
}

export type UserRole = 'ADMIN' | 'CHAUFFEUR';

// Permissions par module
export interface UserPermissions {
  // Dashboard
  canViewDashboard: boolean;
  
  // Achats
  canViewFournisseurs: boolean;
  canManageFournisseurs: boolean;
  canViewBonsEntree: boolean;
  canCreateBonEntree: boolean;
  canValidateBonEntree: boolean;
  canViewFacturesFournisseurs: boolean;
  canManageFacturesFournisseurs: boolean;
  
  // Ventes
  canViewClients: boolean;
  canManageClients: boolean;
  canViewDevis: boolean;
  canCreateDevis: boolean;
  canValidateDevis: boolean;
  canViewBonsLivraison: boolean;
  canCreateBonLivraison: boolean;
  canValidateBonLivraison: boolean;
  canViewFactures: boolean;
  canCreateFacture: boolean;
  
  // Stock
  canViewProduits: boolean;
  canManageProduits: boolean;
  canViewCategories: boolean;
  canManageCategories: boolean;
  canViewEmplacements: boolean;
  canManageEmplacements: boolean;
  canViewMouvementsStock: boolean;
  canViewTransferts: boolean;
  canCreateTransfert: boolean;
  canValidateTransfert: boolean;
  canViewInventaires: boolean;
  canCreateInventaire: boolean;
  canValidateInventaire: boolean;
  
  // Logistique
  canViewTournees: boolean;
  canManageTournees: boolean;
  canViewChauffeurs: boolean;
  canManageChauffeurs: boolean;
  canViewVehicules: boolean;
  canManageVehicules: boolean;
  
  // Finances
  canViewCaisse: boolean;
  canManageCaisse: boolean;
  canViewReglements: boolean;
  canCreateReglement: boolean;
  canValidateReglement: boolean;
  canViewDepenses: boolean;
  canCreateDepense: boolean;
  
  // Rapports
  canViewRapports: boolean;
  canExportRapports: boolean;
  
  // Paramètres
  canViewSettings: boolean;
  canManageSettings: boolean;
  canManageUsers: boolean;
}

// Permissions par rôle
export const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  ADMIN: {
    canViewDashboard: true,
    canViewFournisseurs: true,
    canManageFournisseurs: true,
    canViewBonsEntree: true,
    canCreateBonEntree: true,
    canValidateBonEntree: true,
    canViewFacturesFournisseurs: true,
    canManageFacturesFournisseurs: true,
    canViewClients: true,
    canManageClients: true,
    canViewDevis: true,
    canCreateDevis: true,
    canValidateDevis: true,
    canViewBonsLivraison: true,
    canCreateBonLivraison: true,
    canValidateBonLivraison: true,
    canViewFactures: true,
    canCreateFacture: true,
    canViewProduits: true,
    canManageProduits: true,
    canViewCategories: true,
    canManageCategories: true,
    canViewEmplacements: true,
    canManageEmplacements: true,
    canViewMouvementsStock: true,
    canViewTransferts: true,
    canCreateTransfert: true,
    canValidateTransfert: true,
    canViewInventaires: true,
    canCreateInventaire: true,
    canValidateInventaire: true,
    canViewTournees: true,
    canManageTournees: true,
    canViewChauffeurs: true,
    canManageChauffeurs: true,
    canViewVehicules: true,
    canManageVehicules: true,
    canViewCaisse: true,
    canManageCaisse: true,
    canViewReglements: true,
    canCreateReglement: true,
    canValidateReglement: true,
    canViewDepenses: true,
    canCreateDepense: true,
    canViewRapports: true,
    canExportRapports: true,
    canViewSettings: true,
    canManageSettings: true,
    canManageUsers: true,
  },
  CHAUFFEUR: {
    canViewDashboard: true,
    canViewFournisseurs: false,
    canManageFournisseurs: false,
    canViewBonsEntree: false,
    canCreateBonEntree: false,
    canValidateBonEntree: false,
    canViewFacturesFournisseurs: false,
    canManageFacturesFournisseurs: false,
    canViewClients: true,
    canManageClients: false,
    canViewDevis: false,
    canCreateDevis: false,
    canValidateDevis: false,
    canViewBonsLivraison: true,
    canCreateBonLivraison: false, // Le chauffeur ne crée pas, il exécute
    canValidateBonLivraison: true, // Peut valider la livraison
    canViewFactures: false,
    canCreateFacture: false,
    canViewProduits: true,
    canManageProduits: false,
    canViewCategories: false,
    canManageCategories: false,
    canViewEmplacements: true,
    canManageEmplacements: false,
    canViewMouvementsStock: true,
    canViewTransferts: false,
    canCreateTransfert: false,
    canValidateTransfert: false,
    canViewInventaires: false,
    canCreateInventaire: false,
    canValidateInventaire: false,
    canViewTournees: true,
    canManageTournees: false,
    canViewChauffeurs: false,
    canManageChauffeurs: false,
    canViewVehicules: true,
    canManageVehicules: false,
    canViewCaisse: false,
    canManageCaisse: false,
    canViewReglements: false,
    canCreateReglement: false,
    canValidateReglement: false,
    canViewDepenses: false,
    canCreateDepense: false,
    canViewRapports: true,
    canExportRapports: false,
    canViewSettings: false,
    canManageSettings: false,
    canManageUsers: false,
  },
};