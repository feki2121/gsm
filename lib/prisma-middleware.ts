import { Prisma } from '@prisma/client'

export function addSoftDeleteMiddleware(prisma: any) {
  // Middleware pour filtrer automatiquement les enregistrements supprimés
  prisma.$use(async (params: any, next: any) => {
    // Modèles concernés par le soft delete
    const softDeleteModels = ['Fournisseur', 'Client', 'Product', 'User']
    
    if (softDeleteModels.includes(params.model) && 
        (params.action === 'findMany' || 
         params.action === 'findUnique' || 
         params.action === 'findFirst')) {
      
      if (params.args === undefined) {
        params.args = {}
      }
      if (params.args.where === undefined) {
        params.args.where = {}
      }
      
      // Ajouter automatiquement le filtre isDeleted: false
      if (params.args.where.isDeleted === undefined) {
        params.args.where.isDeleted = false
      }
    }
    
    return next(params)
  })
}