// app/api/users/permissions/route.ts (version corrigée)
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// GET - Récupérer les permissions d'un utilisateur
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    const url = new URL(req.url);
    const userId = url.searchParams.get("userId") || session.user.id;

    // Récupérer l'utilisateur avec son rôle et ses permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        permissions: true,
        chauffeur: {
          include: {
            vehicule: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Récupérer les permissions par défaut du rôle
    const rolePermissions = await prisma.rolePermission.findMany({
      where: { role: user.role, granted: true },
    });

    // Créer un Map des permissions personnalisées
    const customPermissionsMap = new Map();
    user.permissions.forEach(up => {
      customPermissionsMap.set(up.permission, up.granted);
    });

    // Construire la liste finale des permissions
    // Si une permission a une entrée personnalisée, utiliser sa valeur
    // Sinon, utiliser la valeur par défaut du rôle
    const allPermissions: string[] = [];
    
    for (const rp of rolePermissions) {
      const isCustomGranted = customPermissionsMap.get(rp.permission);
      
      // Si la permission a été explicitement définie (même à false), l'inclure
      if (customPermissionsMap.has(rp.permission)) {
        if (customPermissionsMap.get(rp.permission) === true) {
          allPermissions.push(rp.permission);
        }
      } 
      // Sinon, utiliser la valeur par défaut du rôle
      else if (rp.granted) {
        allPermissions.push(rp.permission);
      }
    }

    // Ajouter les permissions personnalisées qui ne sont pas dans les permissions par défaut
    for (const [perm, granted] of customPermissionsMap) {
      const existsInRole = rolePermissions.some(rp => rp.permission === perm);
      if (!existsInRole && granted) {
        allPermissions.push(perm);
      }
    }

    return NextResponse.json({ 
      success: true, 
      permissions: allPermissions,
      role: user.role,
      user: {
        id: user.id,
        nom: user.nom,
        email: user.email,
        role: user.role,
        chauffeur: user.chauffeur,
      },
      customPermissions: user.permissions,
      rolePermissions: rolePermissions.map(rp => ({ permission: rp.permission, granted: rp.granted })),
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des permissions" },
      { status: 500 }
    );
  }
}

// POST - Ajouter/modifier une permission pour un utilisateur
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    const body = await req.json();
    const { userId, permission, granted } = body;

    if (!userId || !permission) {
      return NextResponse.json({ error: "userId et permission requis" }, { status: 400 });
    }

    // Vérifier que l'utilisateur existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return NextResponse.json({ error: "Utilisateur non trouvé" }, { status: 404 });
    }

    // Récupérer la permission par défaut du rôle
    const rolePermission = await prisma.rolePermission.findUnique({
      where: {
        role_permission: {
          role: userExists.role,
          permission,
        },
      },
    });

    // Si la permission modifiée est la même que la valeur par défaut du rôle,
    // on peut supprimer l'entrée personnalisée pour éviter la redondance
    if (rolePermission && rolePermission.granted === granted) {
      // Supprimer la permission personnalisée si elle existe
      try {
        await prisma.userPermission.delete({
          where: {
            userId_permission: {
              userId,
              permission,
            },
          },
        });
      } catch (e) {
        // Ignorer si la permission n'existe pas
      }
      return NextResponse.json({ 
        success: true, 
        message: "Permission réinitialisée à la valeur par défaut" 
      });
    } 
    // Sinon, créer ou mettre à jour la permission personnalisée
    else {
      const userPermission = await prisma.userPermission.upsert({
        where: {
          userId_permission: {
            userId,
            permission,
          },
        },
        update: { granted },
        create: {
          userId,
          permission,
          granted,
        },
      });

      return NextResponse.json({ success: true, data: userPermission });
    }
  } catch (error) {
    console.error("Error updating permission:", error);
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la permission" },
      { status: 500 }
    );
  }
}