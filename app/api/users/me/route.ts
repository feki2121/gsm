import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'utilisateur avec son chauffeur et son véhicule
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        chauffeur: {
          include: {
            vehicule: {
              include: {
                home: true  // Important: inclure le home du véhicule
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Utilisateur non trouvé" },
        { status: 404 }
      );
    }

    // Retourner les données avec le chauffeur et son homeId
    return NextResponse.json({
      id: user.id,
      email: user.email,
      nom: user.nom,
      role: user.role,
      chauffeur: user.chauffeur ? {
        id: user.chauffeur.id,
        nom: user.chauffeur.nom,
        telephone: user.chauffeur.telephone,
        vehicule: user.chauffeur.vehicule ? {
          id: user.chauffeur.vehicule.id,
          nom: user.chauffeur.vehicule.nom,
          immatricule: user.chauffeur.vehicule.immatricule,
          homeId: user.chauffeur.vehicule.homeId,
          home: user.chauffeur.vehicule.home ? {
            id: user.chauffeur.vehicule.home.id,
            nom: user.chauffeur.vehicule.home.nom
          } : null
        } : null
      } : null
    });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}