import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const home = await prisma.home.findFirst({
    where: { nom: "PRINCIPAL" }
  });

  if (!home) {
    console.error("❌ Entrepôt principal non trouvé!");
    return;
  }

  const vehicule = await prisma.vehicule.upsert({
    where: { immatricule: "123-TUN-456" },
    update: {},
    create: {
      immatricule: "123-TUN-456",
      nom: "Camion 1",
      description: "Camion de livraison principal",
      homeId: home.id,
    },
  });

  console.log("✅ Véhicule créé:", vehicule.nom, "-", vehicule.immatricule);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());