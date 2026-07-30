import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// GET - Récupérer un utilisateur par ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        chauffeur: {
          include: {
            vehicule: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Ne pas retourner le mot de passe
    const { password, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de l'utilisateur" },
      { status: 500 }
    );
  }
}

// PUT - Modifier un utilisateur
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nom, email, cin, phone, role, vehiculeId, password } = body;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        chauffeur: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Vérifier si l'email existe déjà (pour un autre utilisateur)
    if (email && email !== existingUser.email) {
      const existingUserByEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUserByEmail) {
        return NextResponse.json(
          { error: "Cet email est déjà utilisé" },
          { status: 400 }
        );
      }
    }

    // Vérifier si le téléphone existe déjà (pour un autre utilisateur)
    if (phone && phone !== existingUser.phone) {
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

    // Préparer les données de mise à jour
    const updateData: any = {
      nom,
      email,
      phone,
      role: role === "ADMIN" ? "ADMIN" : "CHAUFFEUR",
    };

    // Mettre à jour le mot de passe si fourni
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Mettre à jour l'utilisateur
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    // Gérer le cas chauffeur
    if (role === "CHAUFFEUR") {
      if (!vehiculeId) {
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
        return NextResponse.json(
          { error: "Véhicule non trouvé" },
          { status: 404 }
        );
      }

      // Mettre à jour ou créer le chauffeur
      if (existingUser.chauffeur) {
        await prisma.chauffeur.update({
          where: { id: existingUser.chauffeur.id },
          data: {
            nom: user.nom,
            telephone: user.phone || "",
            vehiculeId: vehiculeId,
            cin: cin,
          },
        });
      } else {
        await prisma.chauffeur.create({
          data: {
            userId: user.id,
            nom: user.nom,
            telephone: user.phone || "",
            vehiculeId: vehiculeId,
          },
        });
      }
    } else if (role === "ADMIN" && existingUser.chauffeur) {
      // Si on change de CHAUFFEUR à ADMIN, supprimer l'entrée chauffeur
      await prisma.chauffeur.delete({
        where: { id: existingUser.chauffeur.id },
      });
    }

    // Ne pas retourner le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      message: "Utilisateur modifié avec succès",
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la modification de l'utilisateur" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer un utilisateur
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Vérifier si l'utilisateur existe
    const existingUser = await prisma.user.findUnique({
      where: { id },
      include: {
        chauffeur: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Supprimer l'entrée chauffeur si elle existe
    if (existingUser.chauffeur) {
      await prisma.chauffeur.delete({
        where: { id: existingUser.chauffeur.id },
      });
    }

    // Supprimer l'utilisateur
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      message: "Utilisateur supprimé avec succès",
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Erreur lors de la suppression de l'utilisateur" },
      { status: 500 }
    );
  }
}