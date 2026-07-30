import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("chauff123", 10);

  const user = await prisma.user.upsert({
    where: { phone: "55554444" },
    update: {},
    create: {
      phone: "55554444",
      email: "chauff@gmail.com",
      password: hashedPassword,
      nom: "Chauffeur",
      role: "CHAUFFEUR",
    },
  });

  // ✅ Création du chauffeur lié au user
  const chauffeur = await prisma.chauffeur.upsert({
    where: { userId: user.id },
    update: {
      vehiculeId: "cmo3ijogj0004tla8yt5gly8u", // ✅ assignation véhicule
    },
    create: {
      userId: user.id,
      nom: user.nom,
      telephone: user.phone || "00000000",
      vehiculeId: "cmo3ijogj0004tla8yt5gly8u", // ✅ assignation véhicule
    },
  });

  console.log("✅ Chauffeur créé:", chauffeur.nom);
  console.log("🚚 Véhicule assigné:", chauffeur.vehiculeId);
  console.log("📧 Email:", user.email);
  console.log("📝 Mot de passe: chauff123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());