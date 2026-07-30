import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nom, email, cin, phone, password, role, vehiculeId } = body;

    // Vérifier si l'email existe déjà
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "Cet email est déjà utilisé" },
        { status: 400 }
      );
    }

    // Vérifier si le téléphone existe déjà
    if (phone) {
      const existingUserByPhone = await prisma.user.findUnique({
        where: { phone },
      });

      if (existingUserByPhone) {
        return NextResponse.json(
          { error: "Ce numéro de téléphone est déjà utilisé" },
          { status: 400 }
        );
      }
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Créer l'utilisateur
    const user = await prisma.user.create({
      data: {
        nom,
        email,
        phone,
        password: hashedPassword,
        role: role === "ADMIN" ? "ADMIN" : "CHAUFFEUR",
      },
    });

    // Si c'est un chauffeur, créer l'entrée dans la table Chauffeur
    if (role === "CHAUFFEUR") {
      if (!vehiculeId) {
        // Si pas de véhicule, supprimer l'utilisateur créé
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: "Un véhicule est requis pour un chauffeur" },
          { status: 400 }
        );
      }

      // Vérifier si le véhicule existe
      const vehicule = await prisma.vehicule.findUnique({
        where: { id: vehiculeId },
      });

      if (!vehicule) {
        await prisma.user.delete({ where: { id: user.id } });
        return NextResponse.json(
          { error: "Véhicule non trouvé" },
          { status: 404 }
        );
      }

      // Créer le chauffeur
      await prisma.chauffeur.create({
        data: {
          userId: user.id,
          nom: user.nom,
          telephone: user.phone || "",
          vehiculeId: vehiculeId,
          cin: cin,
        },
      });
    }

    // Ne pas retourner le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: `${role === "ADMIN" ? "Administrateur" : "Chauffeur"} créé avec succès`,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la création de l'utilisateur" },
      { status: 500 }
    );
  }
}