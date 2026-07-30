import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrateLigneBLHomeIds() {
  try {
    console.log('Starting migration of LigneBL homeId values...');

    // Get all LigneBL records
    const ligneBLs = await prisma.ligneBL.findMany({
      include: { product: true }
    });

    console.log(`Found ${ligneBLs.length} LigneBL records`);

    let updated = 0;
    for (const ligne of ligneBLs) {
      if (!ligne.homeId && ligne.product?.homeId) {
        await prisma.ligneBL.update({
          where: { id: ligne.id },
          data: { homeId: ligne.product.homeId }
        });
        updated++;
        console.log(`Updated LigneBL ${ligne.id} with homeId ${ligne.product.homeId}`);
      }
    }

    console.log(`Migration completed. Updated ${updated} records.`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrateLigneBLHomeIds();