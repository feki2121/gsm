/**
 * EXEMPLE D'UTILISATION - Refactorisation du système d'impression
 * 
 * Avant: Code dupliqué avec HTML/CSS inline dans chaque page
 * Après: Utilisation d'utilitaires centralisés
 */

// ============================================
// AVANT (dans app/bons-livraison/page.tsx)
// ============================================
// const handlePrintBL = (bonLivraison: BonLivraison) => {
//   const printWindow = window.open('', '_blank');
//   if (!printWindow) return;
//   
//   printWindow.document.write(`
//     <!DOCTYPE html>
//     <html>
//     <head>
//       <style>
//         ... 200+ lignes de CSS
//       </style>
//     </head>
//     <body>
//       ... 100+ lignes de HTML
//     </body>
//     </html>
//   `);
//   printWindow.document.close();
// };

// ============================================
// APRÈS (utiliser printBL)
// ============================================
// OPTION 1: Utilitaire simple
import { printBL, printFacture, printDevis, printBonSortie } from "@/lib/print-utils";
import { BLPrintData } from "@/types/print";

// Dans votre page, remplacer l'ancienne fonction par:
const handlePrintBLNew = (bonLivraison: any) => {
  // Transformer les données au format BLPrintData
  const printData: BLPrintData = {
    id: bonLivraison.id,
    numero: bonLivraison.numero,
    date: bonLivraison.date,
    client: bonLivraison.client,
    statut: bonLivraison.statut,
    factureId: bonLivraison.factureId,
    lignes: bonLivraison.lignes.map((ligne: any) => ({
      product: ligne.product,
      home: ligne.home,
      quantite: ligne.quantite,
    })),
  };

  // Imprimer en format A4
  printBL(printData, "A4");

  // Ou en format ticket:
  // printBL(printData, "TICKET");
};

// ============================================
// OPTION 2: Avec hook usePrint
// ============================================
import { usePrint } from "@/hooks/usePrint";

export default function ExampleWithHook() {
  const { printHTML, isLoading, error } = usePrint();

  const handlePrint = (bonLivraison: any) => {
    const printData: BLPrintData = {
      id: bonLivraison.id,
      numero: bonLivraison.numero,
      date: bonLivraison.date,
      client: bonLivraison.client,
      statut: bonLivraison.statut,
      factureId: bonLivraison.factureId,
      lignes: bonLivraison.lignes,
    };

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <!-- PrintLayout génère automatiquement le HTML avec tous les styles -->
      </head>
      <body>
        <!-- Votre contenu -->
      </body>
      </html>
    `;

    printHTML(htmlContent);
  };

  return (
    <button onClick={() => handlePrint({ /* data */ })}>
      {isLoading ? "Impression..." : "Imprimer"}
    </button>
  );
}

// ============================================
// CHECKLISTE DE REFACTORISATION
// ============================================
/*

Pour refactoriser chaque page:

1. BONS-LIVRAISON (/app/bons-livraison/page.tsx)
   - Remplacer handlePrintBL par: printBL(printData, "A4")
   - Transformer les données au format BLPrintData
   - Supprimer les 250+ lignes de code d'impression

2. FACTURES (/app/factures/page.tsx)
   - Remplacer handlePrintFacture par: printFacture(printData, "A4")
   - Transformer les données au format FacturePrintData
   - Supprimer le code HTML/CSS dupliqué

3. DEVIS (/app/devis/page.tsx)
   - Remplacer handlePrint par: printDevis(printData, "A4")
   - Transformer les données au format DevisPrintData

4. BONS-SORTIE (/app/bons-sortie/page.tsx)
   - Remplacer handlePrintBonSortie par: printBonSortie(printData, "A4")
   - Transformer les données au format BonSortiePrintData

5. FACTURES DEPUIS BL (/app/factures/creer-depuis-bl/page.tsx)
   - Remplacer par printFacture()

*/

// ============================================
// AVANTAGES DE LA NOUVELLE APPROCHE
// ============================================
/*

✅ Code DRY (Don't Repeat Yourself)
  - Les styles CSS et structure HTML sont centralisés
  - Une seule source de vérité pour tous les documents

✅ Maintenabilité améliorée
  - Changements de style en un seul endroit
  - Moins de bugs à cause de la duplication

✅ Flexibilité
  - Support facile de multiples formats (A4, TICKET)
  - Extensible pour de nouveaux types de documents

✅ Typage TypeScript
  - Typage fort pour les données de chaque document
  - Autocomplétion et détection d'erreurs

✅ Performance
  - Moins de code à charger
  - Réutilisation des styles

✅ Consistance visuelle
  - Tous les documents ont la même apparence
  - Branding unifié

*/

// ============================================
// STRUCTURE DES DOSSIERS CRÉÉE
// ============================================
/*

components/
├── print/
│   ├── PrintHeader.tsx          # Header réutilisable
│   ├── PrintFooter.tsx          # Footer réutilisable
│   ├── PrintLayout.tsx          # Layout wrapper principal
│   ├── PrintWrapper.tsx         # Wrapper pour React Components
│   ├── printStyles.ts           # Styles CSS centralisés
│   ├── index.ts                 # Exports
│   └── templates/
│       ├── BLTemplate.tsx       # Template pour Bons de Livraison
│       ├── FactureTemplate.tsx  # Template pour Factures
│       ├── DevisTemplate.tsx    # Template pour Devis
│       ├── BonSortieTemplate.tsx # Template pour Bons de Sortie
│       └── index.ts             # Exports

hooks/
└── usePrint.ts                  # Hook pour gérer l'impression

lib/
└── print-utils.ts              # Utilitaires et fonctions principales

types/
└── print.ts                    # Types TypeScript

*/
