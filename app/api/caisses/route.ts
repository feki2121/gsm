// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';

// // GET all caisses with pagination
// export async function GET(req: NextRequest) {
//   try {
//     const { searchParams } = new URL(req.url);
//     const page = parseInt(searchParams.get('page') || '1');
//     const limit = parseInt(searchParams.get('limit') || '10');
//     const skip = (page - 1) * limit;

//     const [caisses, total] = await Promise.all([
//       prisma.caisse.findMany({
//         skip,
//         take: limit,
//         include: {
//           mouvements: true,
//         },
//       }),
//       prisma.caisse.count(),
//     ]);

//     return NextResponse.json({
//       data: caisses,
//       pagination: {
//         page,
//         limit,
//         total,
//         pages: Math.ceil(total / limit),
//       },
//     });
//   } catch (error) {
//     console.error('Error fetching caisses:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch caisses' },
//       { status: 500 }
//     );
//   }
// }

// // POST create caisse
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const {
//       date,
//       soldeOuverture,
//       totalEncaissements,
//       totalDecaissements,
//       soldeTheorique,
//       soldeReel,
//       statut,
//     } = body;

//     if (!date || soldeOuverture === undefined || soldeTheorique === undefined) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     const caisse = await prisma.caisse.create({
//       data: {
//         date: new Date(date),
//         soldeOuverture,
//         totalEncaissements: totalEncaissements || 0,
//         totalDecaissements: totalDecaissements || 0,
//         soldeTheorique,
//         soldeReel,
//         statut: statut || 'OUVERTE',
//       },
//       include: {
//         mouvements: true,
//       },
//     });

//     return NextResponse.json(caisse, { status: 201 });
//   } catch (error) {
//     console.error('Error creating caisse:', error);
//     return NextResponse.json(
//       { error: 'Failed to create caisse' },
//       { status: 500 }
//     );
//   }
// }
