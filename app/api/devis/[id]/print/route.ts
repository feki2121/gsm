// import { NextRequest, NextResponse } from 'next/server';
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient();

// // Importer pdfmake dynamiquement pour éviter les problèmes
// async function getPdfMake() {
//   const pdfMakeModule = await import('pdfmake/build/pdfmake');
//   const pdfFontsModule = await import('pdfmake/build/vfs_fonts');
  
//   // Initialisation standard sans forcer l'objet
//   const pdfMake = pdfMakeModule.default;
//   const pdfFonts = pdfFontsModule.default;
  
//   pdfMake.vfs = pdfFonts.pdfMake.vfs;
  
//   return pdfMake;
// }

// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ id: string }> }
// ) {
//   try {
//     const { id } = await params;
    
//     const devis = await prisma.devis.findUnique({
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

//     if (!devis) {
//       return NextResponse.json({ error: 'Devis non trouvé' }, { status: 404 });
//     }

//     const pdfMake = await getPdfMake();

//     const totalTTC = devis.totalTTC || 0;
//     const totalHT = devis.totalHT || 0;
//     const tva = totalTTC - totalHT;

//     const docDefinition = {
//       content: [
//         {
//           columns: [
//             {
//               text: 'KALLAL TECH COMPANY\nVente en Gros Produits Divers\n01. Teniour chihia 3000 - SFAX\nTél: 25 535 035\nT.V.A.: 1860077 Q/A/M/000',
//               style: 'companyInfo'
//             },
//             {
//               text: `DEVIS\nN° ${devis.numero}`,
//               style: 'title'
//             }
//           ],
//           margin: [0, 0, 0, 20]
//         },
//         {
//           canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#1a4d8c' }],
//           margin: [0, 0, 0, 15]
//         },
//         {
//           columns: [
//             {
//               text: [
//                 { text: 'CLIENT\n', style: 'subheader' },
//                 { text: `${devis.client?.nom || 'N/A'}\n` },
//                 { text: `${devis.client?.adresse || ''}\n` },
//                 { text: `Tél: ${devis.client?.tel || ''}` }
//               ],
//               width: '50%'
//             },
//             {
//               text: [
//                 { text: 'DÉTAILS DU DOCUMENT\n', style: 'subheader' },
//                 { text: `Date: ${new Date(devis.date).toLocaleDateString('fr-TN')}\n` },
//                 devis.validite ? { text: `Validité: ${new Date(devis.validite).toLocaleDateString('fr-TN')}\n` } : {},
//                 { text: `Total TTC: ${totalTTC.toFixed(3)} DT` }
//               ],
//               alignment: 'right',
//               width: '50%'
//             }
//           ],
//           margin: [0, 0, 0, 20]
//         },
//         {
//           table: {
//             headerRows: 1,
//             widths: ['45%', '15%', '15%', '10%', '15%'],
//             body: [
//               [
//                 { text: 'Désignation', style: 'tableHeader' },
//                 { text: 'Référence', style: 'tableHeader' },
//                 { text: 'Qté', style: 'tableHeader', alignment: 'center' },
//                 { text: 'P.U. HT', style: 'tableHeader', alignment: 'right' },
//                 { text: 'Total HT', style: 'tableHeader', alignment: 'right' }
//               ],
//               ...(devis.lignes || []).map((ligne: any) => [
//                 { text: ligne.product?.designation || '-', fontSize: 9 },
//                 { text: ligne.product?.reference || '-', fontSize: 9 },
//                 { text: ligne.quantite, fontSize: 9, alignment: 'center' },
//                 { text: (ligne.prixUnitaire || 0).toFixed(3), fontSize: 9, alignment: 'right' },
//                 { text: ((ligne.quantite || 0) * (ligne.prixUnitaire || 0)).toFixed(3), fontSize: 9, alignment: 'right' }
//               ])
//             ]
//           },
//           layout: {
//             fillColor: (rowIndex: number) => {
//               if (rowIndex === 0) return '#1a4d8c';
//               return rowIndex % 2 === 0 ? '#f8f9fa' : null;
//             },
//             hLineWidth: () => 0.5,
//             vLineWidth: () => 0,
//             hLineColor: () => '#ddd',
//           },
//           margin: [0, 0, 0, 20]
//         },
//         {
//           columns: [
//             { width: '*', text: '' },
//             {
//               width: 180,
//               stack: [
//                 { text: `Total HT: ${totalHT.toFixed(3)} DT`, alignment: 'right', margin: [0, 5, 0, 5] },
//                 { text: `TVA (19%): ${tva.toFixed(3)} DT`, alignment: 'right', margin: [0, 5, 0, 5] },
//                 { 
//                   text: `Total TTC: ${totalTTC.toFixed(3)} DT`, 
//                   alignment: 'right', 
//                   style: 'total',
//                   margin: [0, 10, 0, 0]
//                 }
//               ]
//             }
//           ]
//         },
//         {
//           text: [
//             { text: 'CONDITIONS GÉNÉRALES\n', style: 'subheader' },
//             { text: '• Paiement à réception de facture - Devis valable 30 jours\n' },
//             { text: '• TVA non applicable - Article 10 de la loi n°89-114\n' },
//             { text: '• En cas de retard de paiement, une pénalité de 15% sera appliquée' }
//           ],
//           margin: [0, 30, 0, 0],
//           fontSize: 9
//         }
//       ],
//       styles: {
//         companyInfo: {
//           fontSize: 9,
//           color: '#555',
//           lineHeight: 1.5
//         },
//         title: {
//           fontSize: 18,
//           bold: true,
//           color: '#1a4d8c',
//           alignment: 'right'
//         },
//         subheader: {
//           fontSize: 10,
//           bold: true,
//           color: '#1a4d8c',
//           margin: [0, 0, 0, 5]
//         },
//         tableHeader: {
//           bold: true,
//           color: 'white',
//           alignment: 'center',
//           fontSize: 10
//         },
//         total: {
//           bold: true,
//           fontSize: 14,
//           color: '#1a4d8c'
//         }
//       },
//       defaultStyle: {
//         fontSize: 10
//       },
//       footer: (currentPage: number, pageCount: number) => ({
//         text: `KALLAL TECH COMPANY - 01. Teniour chihia 3000 - SFAX - Tél: 25 535 035 | Page ${currentPage}/${pageCount}`,
//         alignment: 'center',
//         fontSize: 7,
//         color: '#999',
//         margin: [0, 0, 0, 20]
//       })
//     };

//     const pdfDoc = pdfMake.createPdf(docDefinition);
    
//     const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
//       pdfDoc.getBuffer((buffer: Buffer) => {
//         resolve(buffer);
//       });
//     });

//     return new NextResponse(pdfBuffer, {
//       headers: {
//         'Content-Type': 'application/pdf',
//         'Content-Disposition': `inline; filename="devis-${devis.numero}.pdf"`,
//       },
//     });
//   } catch (error) {
//     console.error('Erreur PDF:', error);
//     return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
//   }
// }