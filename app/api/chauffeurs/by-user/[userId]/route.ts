// app/api/chauffeurs/by-user/[userId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const chauffeur = await prisma.chauffeur.findUnique({
      where: { userId: params.userId },
      include: {
        vehicule: {
          include: {
            home: true
          }
        }
      }
    });

    if (!chauffeur) {
      return NextResponse.json({ error: "Chauffeur non trouvé" }, { status: 404 });
    }

    return NextResponse.json(chauffeur);
  } catch (error) {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}