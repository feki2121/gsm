/**
 * EXEMPLE CONCRET DE REFACTORISATION
 * Comment migrer de l'ancienne fonction handlePrintBL vers printBL()
 */

// ============================================
// AVANT (ancienne approche)
// ============================================

// const handlePrintBL = (bonLivraison: BonLivraison) => {
//   const printWindow = window.open('', '_blank');
//   if (!printWindow) return;
//
//   printWindow.document.write(`
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <title>Bon de Livraison ${bonLivraison.numero}</title>
//     <meta charset="UTF-8">
//     <style>
//       @media print {
//         body { margin: 0; padding: 0; }
//         .no-print { display: none; }
//         .page { margin: 0; padding: 20px; }
//       }
//       body {
//         font-family: Arial, sans-serif;
//         margin: 0;
//         padding: 20px;
//       }
//       .page {
//         max-width: 1000px;
//         margin: 0 auto;
//         background: white;
//       }
//       /* ... 200 lignes de CSS ... */
//     </style>
//   </head>
//   <body>
//     <div class="page">
//       <!-- ... 100 lignes de HTML ... -->
//     </div>
//     <script>
//       window.onload = () => {
//         window.print();
//       };
//     </script>
//   </body>
//   </html>
//   `);
//   printWindow.document.close();
// };

// ============================================
// APRÈS (nouvelle approche)
// ============================================

// 1. Ajouter l'import en haut du fichier
import { printBL } from "@/lib/print-utils";
import { BLPrintData } from "@/types/print";

// 2. Remplacer la fonction handlePrintBL par:
const handlePrintBLNew = (bonLivraison: BonLivraison) => {
  // Transformer les données BonLivraison en BLPrintData
  const printData: BLPrintData = {
    id: bonLivraison.id,
    numero: bonLivraison.numero,
    date: bonLivraison.date,
    client: {
      nom: bonLivraison.client?.nom || "",
      adresse: bonLivraison.client?.adresse || undefined,
      telephone: bonLivraison.client?.telephone || undefined,
    },
    statut: bonLivraison.statut,
    factureId: bonLivraison.factureId || undefined,
    lignes: bonLivraison.lignes.map((ligne) => ({
      product: ligne.product,
      home: ligne.home,
      quantite: ligne.quantite,
    })),
  };

  // Imprimer - c'est tout !
  printBL(printData);
};

// ============================================
// EXEMPLE AVEC FORMATS MULTIPLES
// ============================================

const handlePrintWithFormat = (
  bonLivraison: BonLivraison,
  format: "A4" | "TICKET"
) => {
  const printData: BLPrintData = {
    id: bonLivraison.id,
    numero: bonLivraison.numero,
    date: bonLivraison.date,
    client: bonLivraison.client,
    statut: bonLivraison.statut,
    factureId: bonLivraison.factureId || undefined,
    lignes: bonLivraison.lignes,
  };

  // Format A4 standard
  if (format === "A4") {
    printBL(printData, "A4");
  }
  // Format ticket réduit
  else {
    printBL(printData, "TICKET");
  }
};

// ============================================
// UTILISATION DANS LE BOUTON
// ============================================

// Avant:
// <Button onClick={() => handlePrintBL(bonLivraison)}>
//   <Printer className="h-4 w-4 mr-1" /> Imprimer
// </Button>

// Après (identique):
// <Button onClick={() => handlePrintBLNew(bonLivraison)}>
//   <Printer className="h-4 w-4 mr-1" /> Imprimer
// </Button>

// Avec sélection de format:
// <Dialog>
//   <DialogTrigger asChild>
//     <Button variant="ghost" size="sm">
//       <Printer className="h-4 w-4" />
//     </Button>
//   </DialogTrigger>
//   <DialogContent>
//     <DialogHeader>
//       <DialogTitle>Sélectionner le format</DialogTitle>
//     </DialogHeader>
//     <div className="space-y-2">
//       <Button onClick={() => handlePrintWithFormat(bonLivraison, "A4")}>
//         Format A4
//       </Button>
//       <Button onClick={() => handlePrintWithFormat(bonLivraison, "TICKET")}>
//         Format Ticket
//       </Button>
//     </div>
//   </DialogContent>
// </Dialog>

// ============================================
// COMPARAISON DES TAILLES DE CODE
// ============================================

/*

Ancienne approche (par page):
- bons-livraison/page.tsx: 250+ lignes
- factures/page.tsx: 250+ lignes
- devis/page.tsx: 300+ lignes
- bons-sortie/page.tsx: 280+ lignes
Total: ~1080+ lignes dupliquées

Nouvelle approche:
- print-utils.ts: 150 lignes (réutilisées dans 4 pages)
- printStyles.ts: 200 lignes (réutilisées dans 4 pages)
- templates/ : 400 lignes (partagées)
Total réutilisable: ~750 lignes (au lieu de 1080)

Réduction: ~26% du code
Avantage: 1 modification affecte tous les documents

*/

// ============================================
// DONNÉES DE MAPPING
// ============================================

// BonLivraison -> BLPrintData
// {
//   id: string
//   numero: string
//   date: Date
//   clientId: string
//   client?: Client
//   statut: string
//   factureId?: string
//   lignes: LigneBL[]
// }
// =>
// {
//   id: string
//   numero: string
//   date: Date | string
//   client?: { nom, adresse?, telephone? }
//   statut: string
//   factureId?: string
//   lignes: Array<{ product?, home?, quantite }>
// }

// Facture -> FacturePrintData
// Similaire, avec totalHT, totalTVA, totalTTC, remise

// Devis -> DevisPrintData
// Similaire, avec validite

// BonSortie -> BonSortiePrintData
// Similaire, avec destination, nomConducteur, etc.
