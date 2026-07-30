/**
 * EXEMPLE COMPLET: Comment intégrer le nouveau système d'impression
 * dans une page existante (app/bons-livraison/page.tsx)
 */

// ============================================
// EN HAUT DU FICHIER: Ajouter les imports
// ============================================

"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
// ... autres imports existants ...

// ✅ AJOUTER CES IMPORTS POUR L'IMPRESSION:
import { printBL } from "@/lib/print-utils";
import { BLPrintData, PrintFormat } from "@/types/print";

// ============================================
// À LA PLACE DE handlePrintBL (lignes 563-803)
// ============================================

// ❌ ANCIEN CODE (250+ lignes)
// const handlePrintBL = (bonLivraison: BonLivraison) => {
//   const printWindow = window.open('', '_blank');
//   if (!printWindow) return;
//   printWindow.document.write(`
//   <!DOCTYPE html>
//   <html>
//   <head>
//     <style>
//       ... 200+ lignes de CSS ...
//     </style>
//   </head>
//   <body>
//     ... 100+ lignes de HTML ...
//   </body>
//   </html>
//   `);
//   printWindow.document.close();
// };

// ✅ NOUVEAU CODE (simples 15 lignes)
const handlePrintBL = (bonLivraison: BonLivraison, format: PrintFormat = "A4") => {
  // Transformer BonLivraison en BLPrintData
  const printData: BLPrintData = {
    id: bonLivraison.id,
    numero: bonLivraison.numero,
    date: bonLivraison.date,
    client: bonLivraison.client
      ? {
          nom: bonLivraison.client.nom,
          adresse: bonLivraison.client.adresse || undefined,
          telephone: bonLivraison.client.telephone,
        }
      : undefined,
    statut: bonLivraison.statut,
    factureId: bonLivraison.factureId || undefined,
    lignes: bonLivraison.lignes.map((ligne) => ({
      product: ligne.product,
      home: ligne.home,
      quantite: ligne.quantite,
    })),
  };

  // Appeler la fonction d'impression
  printBL(printData, format);
};

// ============================================
// DANS LE RENDU: Remplacer le bouton Imprimer
// ============================================

// AVANT (si le bouton appelle handlePrintBL):
// <Button
//   variant="ghost"
//   size="sm"
//   onClick={() => handlePrintBL(item)}
// >
//   <Printer className="h-4 w-4" />
// </Button>

// APRÈS (même chose, ça marche !):
// <Button
//   variant="ghost"
//   size="sm"
//   onClick={() => handlePrintBL(item)}
// >
//   <Printer className="h-4 w-4" />
// </Button>

// ============================================
// OPTIONNEL: Ajouter sélection de format
// ============================================

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

// Ajouter cet état au composant:
const [printFormatDialog, setPrintFormatDialog] = useState(false);
const [selectedItemForPrint, setSelectedItemForPrint] = useState<BonLivraison | null>(null);

// Utiliser dans le rendu:
// Dans la colonne "actions" du tableau:
<Dialog open={printFormatDialog} onOpenChange={setPrintFormatDialog}>
  <DialogTrigger asChild>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => {
        setSelectedItemForPrint(item);
        setPrintFormatDialog(true);
      }}
    >
      <Printer className="h-4 w-4" />
    </Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>
        Sélectionner le format d'impression pour {selectedItemForPrint?.numero}
      </DialogTitle>
    </DialogHeader>
    <div className="space-y-2">
      <Button
        className="w-full"
        onClick={() => {
          selectedItemForPrint && handlePrintBL(selectedItemForPrint, "A4");
          setPrintFormatDialog(false);
        }}
      >
        📄 Format A4 (Standard)
      </Button>
      <Button
        variant="outline"
        className="w-full"
        onClick={() => {
          selectedItemForPrint && handlePrintBL(selectedItemForPrint, "TICKET");
          setPrintFormatDialog(false);
        }}
      >
        🎟️ Format Ticket (Réduit)
      </Button>
    </div>
  </DialogContent>
</Dialog>;

// ============================================
// RÉSUMÉ DES CHANGEMENTS
// ============================================

/*

AVANT:
- Fichier: ~1200 lignes
- Fonction handlePrintBL: 250 lignes
- HTML/CSS: 200+ lignes

APRÈS:
- Fichier: ~950 lignes (-20%)
- Fonction handlePrintBL: 15 lignes (-94%)
- HTML/CSS: SUPPRIMÉ, réutilisé depuis print/

AVANTAGES:
✅ Code plus lisible
✅ Moins de maintenance
✅ Styles centralisés
✅ Support multi-format
✅ Typage fort
✅ Réutilisable dans 4 pages

*/

// ============================================
// EXEMPLE COMPLET AVEC TOAST
// ============================================

import { useToast } from "@/hooks/use-toast";

const handlePrintBLWithFeedback = (
  bonLivraison: BonLivraison,
  format: PrintFormat = "A4"
) => {
  const { toast } = useToast();

  try {
    const printData: BLPrintData = {
      id: bonLivraison.id,
      numero: bonLivraison.numero,
      date: bonLivraison.date,
      client: bonLivraison.client,
      statut: bonLivraison.statut,
      factureId: bonLivraison.factureId || undefined,
      lignes: bonLivraison.lignes,
    };

    printBL(printData, format);

    toast({
      title: "Impression lancée",
      description: `BL ${bonLivraison.numero} - Format ${format === "A4" ? "A4" : "Ticket"}`,
    });
  } catch (error) {
    toast({
      title: "Erreur",
      description:
        error instanceof Error
          ? error.message
          : "Impossible d'imprimer ce document",
      variant: "destructive",
    });
  }
};

// ============================================
// FICHIERS À APPLIQUER CETTE REFACTORISATION
// ============================================

/*

1. ✅ app/bons-livraison/page.tsx
   - Remplacer handlePrintBL (lignes 563-803)
   - Ajouter import { printBL } from "@/lib/print-utils"
   - Transformer les données en BLPrintData
   - Gain: ~240 lignes supprimées

2. app/factures/page.tsx
   - Remplacer handlePrintFacture
   - Ajouter import { printFacture } from "@/lib/print-utils"
   - Transformer les données en FacturePrintData
   - Gain: ~240 lignes supprimées

3. app/devis/page.tsx
   - Remplacer handlePrint
   - Ajouter import { printDevis } from "@/lib/print-utils"
   - Transformer les données en DevisPrintData
   - Gain: ~250 lignes supprimées

4. app/bons-sortie/page.tsx
   - Remplacer handlePrintBonSortie
   - Ajouter import { printBonSortie } from "@/lib/print-utils"
   - Transformer les données en BonSortiePrintData
   - Gain: ~250 lignes supprimées

5. app/factures/creer-depuis-bl/page.tsx
   - Remplacer handlePrintFacture
   - Ajouter import { printFacture } from "@/lib/print-utils"

TOTAL GAIN: ~1000 lignes de code supprimées!

*/

// ============================================
// CHECKLIST POUR CETTE PAGE
// ============================================

/*

□ Backup du fichier original
□ Ajouter imports en haut du fichier
□ Remplacer handlePrintBL par la nouvelle version
□ Ajouter les états pour sélection de format (optionnel)
□ Ajouter Dialog pour sélection de format (optionnel)
□ Tester impression A4
  □ Vérifier header
  □ Vérifier tableau
  □ Vérifier footer
  □ Vérifier signatures
□ Tester impression Ticket
  □ Vérifier mise en page compactée
  □ Vérifier lisibilité
  □ Vérifier élimination des colonnes non essentielles
□ Tester avec plusieurs BL
□ Tester avec client sans adresse
□ Valider que rien d'autre n'est cassé
□ Commit et push

*/

// ============================================
// STRUCTURE FINALE DU RÉPERTOIRE print/
// ============================================

/*

components/print/
├── PrintHeader.tsx
├── PrintFooter.tsx
├── PrintLayout.tsx
├── PrintWrapper.tsx
├── printStyles.ts
├── index.ts
└── templates/
    ├── BLTemplate.tsx
    ├── FactureTemplate.tsx
    ├── DevisTemplate.tsx
    ├── BonSortieTemplate.tsx
    └── index.ts

hooks/
└── usePrint.ts

lib/
└── print-utils.ts

types/
└── print.ts

Documentation:
├── PRINT_REFACTORING_GUIDE.md
├── PRINT_SYSTEM_REFERENCE.md
├── MIGRATION_EXAMPLE.md
└── INTEGRATION_STEPS.md (ce fichier)

*/
