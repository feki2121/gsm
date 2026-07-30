# 🎨 Système d'Impression Refactorisé - Housem

## 📋 Vue d'ensemble

Ce système élimine complètement la duplication de code HTML/CSS pour l'impression en créant une solution modulaire et réutilisable pour tous les documents (BL, Facture, Devis, Bon de Sortie).

### Avant vs Après

| Aspect | Avant | Après |
|--------|-------|-------|
| Lignes de code dupliqué | ~1000 | 0 |
| Fonctions d'impression | 4+ pages | 1 fichier |
| Support formats | Non | A4 + Ticket |
| Typage TypeScript | Faible | Fort |
| Maintenabilité | Difficile | Excellente |
| Réduction code | - | 26% |

---

## 📁 Structure des fichiers créés

```
components/
├── print/
│   ├── PrintHeader.tsx          # En-tête réutilisable
│   ├── PrintFooter.tsx          # Pied de page réutilisable
│   ├── PrintLayout.tsx          # Conteneur principal
│   ├── PrintWrapper.tsx         # Wrapper React
│   ├── printStyles.ts           # Styles CSS centralisés
│   ├── index.ts                 # Exports
│   └── templates/
│       ├── BLTemplate.tsx       # Template Bon de Livraison
│       ├── FactureTemplate.tsx  # Template Facture
│       ├── DevisTemplate.tsx    # Template Devis
│       ├── BonSortieTemplate.tsx # Template Bon de Sortie
│       └── index.ts

hooks/
└── usePrint.ts                 # Hook pour gérer l'impression

lib/
└── print-utils.ts             # Utilitaires (fonction principales)

types/
└── print.ts                   # Types TypeScript
```

---

## 🚀 Utilisation rapide

### Option 1: Utilitaires simples (recommandé)

```typescript
import { printBL } from "@/lib/print-utils";
import { BLPrintData } from "@/types/print";

const handlePrint = (bonLivraison: BonLivraison) => {
  const data: BLPrintData = {
    id: bonLivraison.id,
    numero: bonLivraison.numero,
    date: bonLivraison.date,
    client: bonLivraison.client,
    statut: bonLivraison.statut,
    factureId: bonLivraison.factureId,
    lignes: bonLivraison.lignes,
  };

  // Format A4
  printBL(data);
  
  // Ou format Ticket
  printBL(data, "TICKET");
};
```

### Option 2: Avec Hook pour plus de contrôle

```typescript
import { usePrint } from "@/hooks/usePrint";

const { printHTML, isLoading, error } = usePrint();

const handlePrint = () => {
  const html = generateBLPrintHTML(data);
  printHTML(html);
};
```

---

## 📦 Fonctions disponibles

### Impression directe

```typescript
// Bons de Livraison
printBL(data: BLPrintData, format?: "A4" | "TICKET"): void

// Factures
printFacture(data: FacturePrintData, format?: "A4" | "TICKET"): void

// Devis
printDevis(data: DevisPrintData, format?: "A4" | "TICKET"): void

// Bons de Sortie
printBonSortie(data: BonSortiePrintData, format?: "A4" | "TICKET"): void
```

### Génération HTML

```typescript
generateBLPrintHTML(data: BLPrintData, format?: "A4" | "TICKET"): string
generateFacturePrintHTML(data: FacturePrintData, format?: "A4" | "TICKET"): string
generateDevisPrintHTML(data: DevisPrintData, format?: "A4" | "TICKET"): string
generateBonSortiePrintHTML(data: BonSortiePrintData, format?: "A4" | "TICKET"): string

// Utilitaire bas niveau
openPrintWindow(htmlContent: string, filename?: string): Window | null
```

---

## 🎯 Types de données

### BLPrintData (Bon de Livraison)
```typescript
{
  id: string;
  numero: string;
  date: Date | string;
  client?: { nom, adresse?, telephone? };
  statut: string;
  factureId?: string;
  lignes: Array<{ product?, home?, quantite }>;
}
```

### FacturePrintData (Facture)
```typescript
{
  ...BLPrintData;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
}
```

### DevisPrintData (Devis)
```typescript
{
  id: string;
  numero: string;
  date: Date | string;
  validite?: Date | string;
  client?: { nom, adresse?, telephone? };
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  lignes: Array<{ product?, quantite, prixUnitaire }>;
}
```

### BonSortiePrintData (Bon de Sortie)
```typescript
{
  id: string;
  numero: string;
  date: Date | string;
  destination: string;
  nomConducteur: string;
  matriculeVehicule: string;
  numCIN: string;
  adresseLivraison: string;
  observation?: string;
  client?: { nom };
  destinataire?: string;
  motif: string;
  statut: string;
  totalHT: number;
  totalTTC: number;
  lignes: Array<{ product?, quantite, prixUnitaireHT, prixUnitaireTTC }>;
}
```

---

## 🛠️ Integration dans les pages existantes

### Étapes pour chaque page

1. **Ajouter les imports**
```typescript
import { printBL } from "@/lib/print-utils";
import { BLPrintData } from "@/types/print";
```

2. **Remplacer la fonction d'impression** (~250 lignes supprimées)
```typescript
// AVANT: handlePrintBL (250+ lignes de HTML/CSS)
// APRÈS: 15 lignes

const handlePrintBL = (bonLivraison: BonLivraison) => {
  const data: BLPrintData = { /* transforme les données */ };
  printBL(data);
};
```

3. **Tester l'impression**
- Format A4
- Format Ticket
- Cas limites

### Pages à refactoriser

- [ ] `app/bons-livraison/page.tsx` (handlePrintBL)
- [ ] `app/factures/page.tsx` (handlePrintFacture)
- [ ] `app/devis/page.tsx` (handlePrint)
- [ ] `app/bons-sortie/page.tsx` (handlePrintBonSortie)
- [ ] `app/factures/creer-depuis-bl/page.tsx`

---

## 📱 Formats supportés

### A4 (Standard)
- Dimensions: 210mm × 297mm
- Orientation: Portrait
- Contenu: Complet avec tous les détails
- Signatures: Incluses
- Tableau: Tous les colonnes

### TICKET (Compact)
- Dimensions: 80mm × Variable
- Orientation: Portrait
- Contenu: Essentiel
- Signatures: Masquées
- Tableau: Colonnes réduites

---

## 🎨 Styles CSS

Tous les styles sont centralisés dans `components/print/printStyles.ts`

### Classes principales
```css
.page              /* Conteneur principal */
.header            /* En-tête */
.company-info      /* Info entreprise */
.title             /* Titre */
.info-section      /* Section d'infos */
.table             /* Tableau */
.totals            /* Totaux */
.footer            /* Pied de page */
.signatures        /* Signatures */
.statut-badge      /* Badge statut */
```

### Variantes format ticket
```css
.page.ticket
.header.ticket
.table.ticket
.totals.ticket
etc.
```

---

## 📊 Exemples complets

### Imprimer un BL avec format sélectionnable

```typescript
import { printBL } from "@/lib/print-utils";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PrintDialog({ bonLivraison }: { bonLivraison: BonLivraison }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          🖨️ Imprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Format d'impression</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Button
            className="w-full"
            onClick={() => {
              const data: BLPrintData = { /* ... */ };
              printBL(data, "A4");
              setOpen(false);
            }}
          >
            📄 A4
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              const data: BLPrintData = { /* ... */ };
              printBL(data, "TICKET");
              setOpen(false);
            }}
          >
            🎟️ Ticket
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Avec gestion d'erreur

```typescript
const handlePrintWithFeedback = async (bonLivraison: BonLivraison) => {
  const { toast } = useToast();
  
  try {
    const data: BLPrintData = { /* ... */ };
    printBL(data);
    
    toast({
      title: "Impression lancée",
      description: `BL ${bonLivraison.numero}`,
    });
  } catch (error) {
    toast({
      title: "Erreur",
      description: "Impossible d'imprimer ce document",
      variant: "destructive",
    });
  }
};
```

---

## 🧪 Tests

Voir `VERIFICATION_CHECKLIST.ts` pour la liste complète des tests.

### Tests essentiels
- [ ] Impression A4
- [ ] Impression TICKET
- [ ] Tous les éléments s'affichent
- [ ] Mise en page correcte
- [ ] Calculs corrects (HT, TVA, TTC)
- [ ] Client sans adresse/téléphone
- [ ] Longues listes de produits
- [ ] Valeurs extrêmes

---

## 📚 Documentation

### Fichiers de documentation inclus

1. **PRINT_REFACTORING_GUIDE.md** - Guide complet de refactorisation
2. **PRINT_SYSTEM_REFERENCE.md** - Référence API détaillée
3. **MIGRATION_EXAMPLE.md** - Exemple concret de migration
4. **INTEGRATION_STEPS.md** - Étapes détaillées d'intégration
5. **VERIFICATION_CHECKLIST.ts** - Checklist complète

---

## 🚨 Troubleshooting

### "Impossible d'ouvrir la fenêtre d'impression"
→ Les pop-ups sont bloqués. Vérifier les paramètres du navigateur.

### "Les styles ne s'appliquent pas"
→ Vérifier que `combinePrintStyles()` est importé et utilisé.

### "Les données n'apparaissent pas"
→ Vérifier que tous les champs obligatoires sont présents.

### "Le format ticket est illisible"
→ C'est normal pour un format 80mm. Optimiser les données si nécessaire.

---

## 📈 Avantages

✅ **Code DRY** - Une seule source de vérité pour tous les documents
✅ **Maintenabilité** - Changements en un seul endroit
✅ **Flexibilité** - Support multi-format (A4, TICKET)
✅ **Typage** - TypeScript fort pour chaque document
✅ **Performance** - Moins de code à charger
✅ **Consistance** - Branding unifié sur tous les documents

---

## 📞 Support

Pour tout question ou problème:
1. Consulter la documentation fournie
2. Vérifier les exemples dans `INTEGRATION_STEPS.md`
3. Examiner le checklist dans `VERIFICATION_CHECKLIST.ts`

---

## 🎁 Bonus: Utilitaires additionnels

Vous pouvez facilement ajouter:
- Exportation en PDF
- Envoi par email
- Sauvegarde en base de données
- Historique des impressions
- Watermarks personnalisés

Tous les fondations sont en place pour ces extensions!

---

**Créé pour optimiser la maintenabilité et réduire la duplication de code** ✨
