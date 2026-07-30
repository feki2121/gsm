
import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { put } from '@vercel/blob';
import { randomUUID } from 'crypto';

// GET - Récupérer toutes les dépenses
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const chauffeurIdParam = searchParams.get('chauffeurId');
    const categorie = searchParams.get('categorie');
    const dateDebut = searchParams.get('dateDebut');
    const dateFin = searchParams.get('dateFin');

    let where: any = {};

    // Admin peut voir toutes les dépenses, chauffeur voit seulement ses dépenses
    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      where.chauffeurId = user.chauffeur.id;
    } else if (user.role === 'ADMIN' && chauffeurIdParam) {
      where.chauffeurId = chauffeurIdParam;
    }

    if (categorie) where.categorie = categorie;

    if (dateDebut || dateFin) {
      where.date = {};
      if (dateDebut) where.date.gte = new Date(dateDebut);
      if (dateFin) {
        const endDate = new Date(dateFin);
        endDate.setHours(23, 59, 59, 999);
        where.date.lte = endDate;
      }
    }

    const depenses = await prisma.reglementDivers.findMany({
      where,
      include: {
        chauffeur: {
          include: { user: true }
        }
      },
      orderBy: { date: 'desc' },
    });

    return NextResponse.json(depenses);
  } catch (error) {
    console.error('Error fetching depenses:', error);
    return NextResponse.json({ error: 'Failed to fetch depenses' }, { status: 500 });
  }
}

// POST - Créer une nouvelle dépense
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    const formData = await req.formData();
    const libelle = formData.get('libelle') as string;
    const categorie = formData.get('categorie') as string;
    const montant = parseFloat(formData.get('montant') as string);
    const modeReglement = formData.get('modeReglement') as string;
    const reference = formData.get('reference') as string;
    const justificatif = formData.get('justificatif') as string;
    const date = formData.get('date') as string;
    const file = formData.get('file') as File | null;
    const chauffeurIdParam = formData.get('chauffeurId') as string;

    if (!libelle || !categorie || !montant || !modeReglement) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    // Déterminer le chauffeurId
    let chauffeurId: string | null = null;
    
    if (user.role === 'CHAUFFEUR' && user.chauffeur) {
      chauffeurId = user.chauffeur.id;
    } else if (user.role === 'ADMIN' && chauffeurIdParam) {
      chauffeurId = chauffeurIdParam;
    }

    // Upload du fichier si présent
    let imageUrl: string | null = null;
    if (file) {
      try {
        const blob = await put(`depenses/${randomUUID()}-${file.name}`, file, {
          access: 'public',
          token: process.env.BLOB_READ_WRITE_TOKEN,
        });
        imageUrl = blob.url;
      } catch (error) {
        console.error('Error uploading file:', error);
      }
    }

    const depense = await prisma.reglementDivers.create({
      data: {
        libelle,
        categorie: categorie as any,
        montant,
        modeReglement: modeReglement as any,
        reference: reference || null,
        justificatif: justificatif || null,
        date: date ? new Date(date) : new Date(),
        chauffeurId,
        imageUrl,
      },
      include: {
        chauffeur: {
          include: { user: true }
        }
      },
    });

    // Créer un mouvement de caisse (décaissement)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let caisse = await prisma.caisse.findFirst({
      where: {
        date: today,
        chauffeurId: chauffeurId
      }
    });

    if (!caisse) {
      caisse = await prisma.caisse.create({
        data: {
          date: today,
          chauffeurId,
          soldeOuverture: 0,
          totalEncaissements: 0,
          totalDecaissements: 0,
          soldeTheorique: 0,
          statut: 'OUVERTE',
        },
      });
    }

    await prisma.mouvementCaisse.create({
      data: {
        caisseId: caisse.id,
        type: 'DECAISSEMENT',
        modeReglement: modeReglement as any,
        montant,
        reference: `${libelle}`,
        libelle: `Dépense: ${libelle}`,
      },
    });

    await prisma.caisse.update({
      where: { id: caisse.id },
      data: {
        totalDecaissements: { increment: montant },
        soldeTheorique: { increment: -montant },
      },
    });

    return NextResponse.json(depense, { status: 201 });
  } catch (error) {
    console.error('Error creating depense:', error);
    return NextResponse.json({ error: 'Failed to create depense' }, { status: 500 });
  }
}

// DELETE - Supprimer une dépense
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    await prisma.reglementDivers.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting depense:', error);
    return NextResponse.json({ error: 'Failed to delete depense' }, { status: 500 });
  }
}

// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';

// // GET all reglements divers with pagination
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '10');
//     const skip = (page - 1) * limit;

//     const [reglements, total] = await Promise.all([
//       prisma.reglementDivers.findMany({
//         skip,
//         take: limit,
//       }),
//       prisma.reglementDivers.count(),
//     ]);

//     return NextResponse.json({
//       data: reglements,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching reglements divers:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch reglements divers' },
//       { status: 500 }
//     );
//   }
// }

// // POST create reglement divers
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const {
//       libelle,
//       categorie,
//       montant,
//       modeReglement,
//       reference,
//       justificatif,
//     } = body;

//     if (!libelle || !categorie || !montant || !modeReglement) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     const reglement = await prisma.reglementDivers.create({
//       data: {
//         libelle,
//         categorie,
//         montant,
//         modeReglement,
//         reference,
//         justificatif,
//       },
//     });

//     return NextResponse.json(reglement, { status: 201 });
//   } catch (error) {
//     console.error('Error creating reglement divers:', error);
//     return NextResponse.json(
//       { error: 'Failed to create reglement divers' },
//       { status: 500 }
//     );
//   }
// }
