// import { NextRequest, NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
    
//     const facture = await prisma.facture.findUnique({
//       where: { id },
//       include: {
//         client: true,
//         lignes: {
//           include: {
//             product: true,
//           },
//         },
//       },
//     });

//     if (!facture) {
//       return NextResponse.json({ error: 'Facture non trouvée' }, { status: 404 });
//     }

//     // Import dynamique de @react-pdf/renderer
//     const { renderToBuffer } = await import('@react-pdf/renderer');
    
//     // Import dynamique du composant DocumentPDF
//     const { DocumentPDF } = await import('@/components/pdf/DocumentPDF');

//     const pdfBuffer = await renderToBuffer(
//       DocumentPDF({ type: 'FACTURE', data: facture })
//     );

//     return new NextResponse(pdfBuffer, {
//       headers: {
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `inline; filename="facture-${facture.numero}.pdf"`,
//       },
//     });
//   } catch (error) {
//     console.error('Erreur PDF:', error);
//     return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
//   }
// }