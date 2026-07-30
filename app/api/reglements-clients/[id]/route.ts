// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';

// // GET reglement client by ID
// export async function GET(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const reglement = await prisma.reglementClient.findUnique({
//       where: { id: params.id },
//       include: {
//         client: true,
//         factures: { include: { facture: true } },
//       },
//     });

//     if (!reglement) {
//       return NextResponse.json(
//         { error: 'Reglement client not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(reglement);
//   } catch (error) {
//     console.error('Error fetching reglement client:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch reglement client' },
//       { status: 500 }
//     );
//   }
// }

// // PUT update reglement client
// export async function PUT(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     if (body.echeance) {
//       body.echeance = new Date(body.echeance);
//     }

//     const reglement = await prisma.reglementClient.update({
//       where: { id: params.id },
//       data: body,
//       include: {
//         client: true,
//         factures: { include: { facture: true } },
//       },
//     });

//     return NextResponse.json(reglement);
//   } catch (error) {
//     console.error('Error updating reglement client:', error);
//     if ((error as any).code === 'P2025') {
//       return NextResponse.json(
//         { error: 'Reglement client not found' },
//         { status: 404 }
//       );
//     }
//     return NextResponse.json(
//       { error: 'Failed to update reglement client' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE reglement client
// export async function DELETE(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     await prisma.reglementClient.delete({
//       where: { id: params.id },
//     });

//     return NextResponse.json({
//       message: 'Reglement client deleted successfully',
//     });
//   } catch (error) {
//     console.error('Error deleting reglement client:', error);
//     if ((error as any).code === 'P2025') {
//       return NextResponse.json(
//         { error: 'Reglement client not found' },
//         { status: 404 }
//       );
//     }
//     return NextResponse.json(
//       { error: 'Failed to delete reglement client' },
//       { status: 500 }
//     );
//   }
// }

import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }  // ← Changez le type ici
) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Non authentifié' },
        { status: 401 }
      );
    }

    // ⚠️ IMPORTANT: await params avant de l'utiliser
    const { id } = await params;  // ← Ajoutez await ici

    const reglement = await prisma.reglementClient.findUnique({
      where: { id },
      include: {
        client: true,
        chauffeur: {
          include: {
            user: true
          }
        },
        factures: {
          include: {
            facture: true
          }
        },
        bonLivraisons: {
          include: {
            bonLivraison: {
              include: {
                client: true
              }
            }
          }
        }
      }
    });

    if (!reglement) {
      return NextResponse.json(
        { error: 'Règlement non trouvé' },
        { status: 404 }
      );
    }

    // Vérifier si l'utilisateur a accès
    const user = await prisma.user.findUnique({
      where: { email: session.user?.email! },
      include: { chauffeur: true }
    });

    if (user?.role === 'CHAUFFEUR' && reglement.chauffeurId !== user.chauffeur?.id) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403 }
      );
    }

    // Parser les détails mixte si nécessaire
    let detailsMixteParsed = null;
    if (reglement.detailsMixte) {
      try {
        detailsMixteParsed = JSON.parse(reglement.detailsMixte);
      } catch (e) {
        console.error('Erreur parsing detailsMixte:', e);
      }
    }

    return NextResponse.json({
      ...reglement,
      detailsMixte: detailsMixteParsed
    });
  } catch (error) {
    console.error('Error fetching reglement:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reglement' },
      { status: 500 }
    );
  }
}