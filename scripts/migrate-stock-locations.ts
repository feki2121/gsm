import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('🔄 Migration des stocks vers StockLocation...');
  
  const products = await prisma.product.findMany({
    include: { home: true },
  });
  
  for (const product of products) {
    // Créer l'entrée StockLocation pour chaque produit
    await prisma.stockLocation.upsert({
      where: {
        productId_homeId: {
          productId: product.id,
          homeId: product.homeId,
        },
      },
      update: {
        quantite: product.quantiteStock,
      },
      create: {
        productId: product.id,
        homeId: product.homeId,
        quantite: product.quantiteStock,
      },
    });
    
    console.log(`✅ ${product.designation} - ${product.quantiteStock} unités`);
  }
  
  console.log('🎉 Migration terminée !');
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());