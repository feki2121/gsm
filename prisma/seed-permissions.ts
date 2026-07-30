// prisma/seed-permissions.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const permissionsByRole = {
  ADMIN: [
    // Dashboard
    "can_view_dashboard",
    
    // Achats
    "can_view_fournisseurs",
    "can_manage_fournisseurs",
    "can_view_bons_entree",
    "can_create_bon_entree",
    "can_validate_bon_entree",
    "can_view_factures_fournisseurs",
    "can_manage_factures_fournisseurs",
    
    // Ventes
    "can_view_clients",
    "can_manage_clients",
    "can_view_devis",
    "can_create_devis",
    "can_validate_devis",
    "can_view_bons_livraison",
    "can_create_bon_livraison",
    "can_validate_bon_livraison",
    "can_view_factures",
    "can_create_facture",
    "can_manage_factures",
    
    // Stock
    "can_view_produits",
    "can_manage_produits",
    "can_view_categories",
    "can_manage_categories",
    "can_view_emplacements",
    "can_manage_emplacements",
    "can_view_mouvements_stock",
    "can_view_transferts",
    "can_create_transfert",
    "can_validate_transfert",
    "can_view_inventaires",
    "can_create_inventaire",
    "can_validate_inventaire",
    
    // Logistique
    "can_view_tournees",
    "can_manage_tournees",
    "can_view_chauffeurs",
    "can_manage_chauffeurs",
    "can_view_vehicules",
    "can_manage_vehicules",
    
    // Finances
    "can_view_caisse",
    "can_manage_caisse",
    "can_view_reglements",
    "can_create_reglement",
    "can_validate_reglement",
    "can_view_depenses",
    "can_create_depense",
    
    // Rapports
    "can_view_rapports",
    "can_export_rapports",
    
    // Paramètres
    "can_view_settings",
    "can_manage_settings",
    "can_manage_users",
  ],
  
  CHAUFFEUR: [
    // Dashboard
    "can_view_dashboard",
    
    // Ventes (limité)
    "can_view_clients",
    "can_view_bons_livraison",
    "can_update_bon_livraison_status", // Peut marquer comme livré
    
    // Stock (lecture seule)
    "can_view_produits",
    "can_view_emplacements",
    
    // Logistique
    "can_view_tournees",
    "can_update_tournee_status",
    "can_view_vehicules",
    
    // Rapports (lecture seule)
    "can_view_rapports",
    
    // Personnel
    "can_view_own_profile",
    "can_update_own_profile",
  ],
}

async function main() {
  console.log("🌱 Début de l'initialisation des permissions...")
  
  for (const [role, permissions] of Object.entries(permissionsByRole)) {
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          role_permission: {
            role: role as any,
            permission,
          },
        },
        update: {},
        create: {
          role: role as any,
          permission,
          granted: true,
        },
      })
    }
    console.log(`✅ Permissions ajoutées pour le rôle ${role}`)
  }
  
  console.log("🎉 Initialisation des permissions terminée!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())