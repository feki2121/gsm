import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const defaultHome = await prisma.home.upsert({
      where: { nom: 'PRINCIPAL' },
      update: {},
      create: {
        nom: 'PRINCIPAL',
        description: 'Entrepôt principal par défaut',
      },
    });
    
    console.log('✅ Entrepôt principal créé:', defaultHome);
  } catch (error) {
    console.error('Erreur lors de la création de l\'entrepôt principal:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();