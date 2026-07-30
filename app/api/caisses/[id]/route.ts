// import { prisma } from '@/lib/prisma';
// import { NextRequest, NextResponse } from 'next/server';

// // GET caisse by ID
// export async function GET(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const caisse = await prisma.caisse.findUnique({
//       where: { id: params.id },
//       include: {
//         mouvements: true,
//       },
//     });

//     if (!caisse) {
//       return NextResponse.json(
//         { error: 'Caisse not found' },
//         { status: 404 }
//       );
//     }

//     return NextResponse.json(caisse);
//   } catch (error) {
//     console.error('Error fetching caisse:', error);
//     return NextResponse.json(
//       { error: 'Failed to fetch caisse' },
//       { status: 500 }
//     );
//   }
// }

// // PUT update caisse
// export async function PUT(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     const body = await req.json();
//     if (body.date) {
//       body.date = new Date(body.date);
//     }

//     const caisse = await prisma.caisse.update({
//       where: { id: params.id },
//       data: body,
//       include: {
//         mouvements: true,
//       },
//     });

//     return NextResponse.json(caisse);
//   } catch (error) {
//     console.error('Error updating caisse:', error);
//     if ((error as any).code === 'P2025') {
//       return NextResponse.json(
//         { error: 'Caisse not found' },
//         { status: 404 }
//       );
//     }
//     return NextResponse.json(
//       { error: 'Failed to update caisse' },
//       { status: 500 }
//     );
//   }
// }

// // DELETE caisse
// export async function DELETE(
//   req: NextRequest,
//   { params }: { params: { id: string } }
// ) {
//   try {
//     await prisma.caisse.delete({
//       where: { id: params.id },
//     });

//     return NextResponse.json({ message: 'Caisse deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting caisse:', error);
//     if ((error as any).code === 'P2025') {
//       return NextResponse.json(
//         { error: 'Caisse not found' },
//         { status: 404 }
//       );
//     }
//     return NextResponse.json(
//       { error: 'Failed to delete caisse' },
//       { status: 500 }
//     );
//   }
// }
