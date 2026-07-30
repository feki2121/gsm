/**
 * DOCUMENTATION COMPLÈTE DU SYSTÈME D'IMPRESSION REFACTORISÉ
 */

// ============================================
// 1. TYPES TYPESCRIPT
// ============================================

/**
 * PrintFormat: Format du document à imprimer
 * - "A4": Format standard A4 (210mm x 297mm)
 * - "TICKET": Format ticket réduit (80mm)
 */
type PrintFormat = "A4" | "TICKET";

/**
 * BLPrintData: Données pour imprimer un Bon de Livraison
 * @property id - Identifiant unique du BL
 * @property numero - Numéro du BL
 * @property date - Date du BL
 * @property client - Informations client
 * @property statut - Statut (EN_ATTENTE, LIVRE, ANNULE)
 * @property factureId - ID de la facture associée (optionnel)
 * @property lignes - Lignes du BL
 */
interface BLPrintData {
  id: string;
  numero: string;
  date: Date | string;
  client?: { nom: string; adresse?: string; telephone?: string };
  statut: string;
  factureId?: string;
  lignes: Array<{
    product?: { reference: string; designation: string };
    home?: { nom: string };
    quantite: number;
  }>;
}

/**
 * FacturePrintData: Données pour imprimer une Facture
 * Contient en plus: totalHT, totalTVA, totalTTC, remise
 */
interface FacturePrintData extends BLPrintData {
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise?: number;
  lignes: Array<{
    product?: { reference: string; designation: string };
    home?: { nom: string };
    quantite: number;
    prixUnitaire: number;
  }>;
}

/**
 * DevisPrintData: Données pour imprimer un Devis
 * Similaire à FacturePrintData avec validite
 */
interface DevisPrintData {
  id: string;
  numero: string;
  date: Date | string;
  validite?: Date | string;
  client?: { nom: string; adresse?: string; telephone?: string };
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  lignes: Array<{
    product?: { reference: string; designation: string; tva: number };
    quantite: number;
    prixUnitaire: number;
  }>;
}

/**
 * BonSortiePrintData: Données pour imprimer un Bon de Sortie
 * Contient des infos supplémentaires de transport
 */
interface BonSortiePrintData {
  id: string;
  numero: string;
  date: Date | string;
  destination: string;
  nomConducteur: string;
  matriculeVehicule: string;
  numCIN: string;
  adresseLivraison: string;
  observation?: string;
  client?: { nom: string };
  destinataire?: string;
  motif: string;
  statut: string;
  totalHT: number;
  totalTTC: number;
  lignes: Array<{
    product?: { reference: string; designation: string };
    quantite: number;
    prixUnitaireHT: number;
    prixUnitaireTTC: number;
  }>;
}

// ============================================
// 2. COMPOSANTS
// ============================================

/**
 * PrintLayout: Wrapper principal pour tout document d'impression
 * 
 * Props:
 * - format: "A4" | "TICKET" (défaut: "A4")
 * - children: Contenu du document (template)
 * 
 * Usage:
 * <PrintLayout format="A4">
 *   <PrintHeader ... />
 *   <TemplateContent />
 *   <PrintFooter ... />
 * </PrintLayout>
 */

/**
 * PrintHeader: Composant d'en-tête réutilisable
 * 
 * Props:
 * - format: "A4" | "TICKET"
 * - title: Titre du document
 * - reference: Numéro/référence du document
 * - date: Date du document
 * - companyName: Nom de l'entreprise (défaut: KALLAL TECH COMPANY)
 * - companyAddress: Adresse (défaut: 01. Teniour chihia 3000 - SFAX)
 * - companyPhone: Téléphone (défaut: 25 535 035)
 * - companyVAT: N° TVA (défaut: 1860077 Q/A/M/000)
 * - logoUrl: URL du logo (défaut: ktc.png)
 * 
 * Features:
 * - Logo automatiquement caché si non trouvé
 * - Responsive (différent pour A4 et TICKET)
 * - Styles respectent print.ts
 */

/**
 * PrintFooter: Composant de pied de page réutilisable
 * 
 * Props:
 * - format: "A4" | "TICKET"
 * - companyName: Nom de l'entreprise
 * - companyAddress: Adresse
 * - companyPhone: Téléphone
 * - customMessage: Message personnalisé (optionnel)
 * 
 * Features:
 * - Message par défaut avec infos entreprise
 * - Ou message personnalisé
 * - Responsive
 */

/**
 * BLTemplate: Template pour Bons de Livraison
 * 
 * Props:
 * - data: BLPrintData
 * - format: "A4" | "TICKET" (défaut: "A4")
 * 
 * Affiche:
 * - Numéro et date du BL
 * - Informations client
 * - Statut
 * - Tableau des produits (Réf, Désignation, Emplacement, Qté)
 * - Signatures (A4 seulement)
 */

/**
 * FactureTemplate: Template pour Factures
 * 
 * Props:
 * - data: FacturePrintData
 * - format: "A4" | "TICKET" (défaut: "A4")
 * 
 * Affiche:
 * - Numéro et date de la facture
 * - Informations client
 * - Tableau des produits (Réf, Désignation, Qté, P.U., Total)
 * - Totaux (HT, TVA, Remise, Timbre, TTC)
 * - Signatures (A4 seulement)
 */

/**
 * DevisTemplate: Template pour Devis
 * 
 * Props:
 * - data: DevisPrintData
 * - format: "A4" | "TICKET" (défaut: "A4")
 * 
 * Affiche:
 * - Numéro, date et validité du devis
 * - Informations client
 * - Tableau des produits
 * - Totaux
 * - Signatures (A4 seulement)
 */

/**
 * BonSortieTemplate: Template pour Bons de Sortie
 * 
 * Props:
 * - data: BonSortiePrintData
 * - format: "A4" | "TICKET" (défaut: "A4")
 * 
 * Affiche:
 * - Numéro, date et motif du BS
 * - Destinataire et destination
 * - Informations conducteur (A4 seulement)
 * - Tableau des produits
 * - Totaux (A4 seulement)
 * - Signatures (A4 seulement)
 */

// ============================================
// 3. UTILITAIRES
// ============================================

/**
 * printBL(data: BLPrintData, format?: PrintFormat): void
 * 
 * Ouvre une fenêtre d'impression pour imprimer un BL
 * 
 * Usage:
 * import { printBL } from "@/lib/print-utils";
 * 
 * const blData: BLPrintData = { ... };
 * printBL(blData);           // Format A4
 * printBL(blData, "TICKET"); // Format ticket
 */

/**
 * printFacture(data: FacturePrintData, format?: PrintFormat): void
 * 
 * Ouvre une fenêtre d'impression pour imprimer une facture
 * 
 * Usage:
 * import { printFacture } from "@/lib/print-utils";
 * 
 * const factureData: FacturePrintData = { ... };
 * printFacture(factureData);           // Format A4
 * printFacture(factureData, "TICKET"); // Format ticket
 */

/**
 * printDevis(data: DevisPrintData, format?: PrintFormat): void
 * 
 * Ouvre une fenêtre d'impression pour imprimer un devis
 */

/**
 * printBonSortie(data: BonSortiePrintData, format?: PrintFormat): void
 * 
 * Ouvre une fenêtre d'impression pour imprimer un bon de sortie
 */

/**
 * generateBLPrintHTML(data: BLPrintData, format?: PrintFormat): string
 * 
 * Génère le HTML complet d'un BL sans ouvrir de fenêtre
 * Utile si vous avez besoin du HTML brut
 * 
 * Usage:
 * const html = generateBLPrintHTML(blData);
 * // Utiliser html pour sauvegarde, envoi par email, etc.
 */

/**
 * generateFacturePrintHTML, generateDevisPrintHTML, generateBonSortiePrintHTML
 * 
 * Similaires à generateBLPrintHTML pour les autres documents
 */

/**
 * openPrintWindow(htmlContent: string, filename?: string): Window | null
 * 
 * Ouvre une fenêtre d'impression avec du HTML fourni
 * 
 * Usage:
 * const window = openPrintWindow(htmlContent, "mon-document");
 * 
 * Returns: Window | null
 * - null si les pop-ups sont bloqués
 */

// ============================================
// 4. HOOK
// ============================================

/**
 * usePrint(options?: UsePrintOptions)
 * 
 * Hook React pour gérer l'impression avec états et erreurs
 * 
 * Options:
 * - format?: "A4" | "TICKET"
 * - filename?: string
 * - onBeforePrint?: () => void
 * - onAfterPrint?: () => void
 * 
 * Returns:
 * - printHTML(htmlContent: string): void
 * - printComponent(component: React.ReactElement): void
 * - printElement(element: HTMLElement | null): void
 * - isLoading: boolean
 * - error: string | null
 * - reset(): void
 * 
 * Usage:
 * const { printHTML, isLoading, error } = usePrint();
 * 
 * const handlePrint = () => {
 *   const html = generateBLPrintHTML(data);
 *   printHTML(html);
 * };
 * 
 * return (
 *   <>
 *     <Button onClick={handlePrint} disabled={isLoading}>
 *       {isLoading ? "Impression..." : "Imprimer"}
 *     </Button>
 *     {error && <Alert>{error}</Alert>}
 *   </>
 * );
 */

// ============================================
// 5. STYLES CSS
// ============================================

/**
 * Les styles sont centralisés dans printStyles.ts
 * 
 * Fonctions disponibles:
 * - getA4Styles(): string          // Styles pour format A4
 * - getTicketStyles(): string       // Styles pour format ticket
 * - combinePrintStyles(format): string // Styles combinés
 * 
 * Classes CSS générées:
 * - .page              // Conteneur principal
 * - .header            // En-tête
 * - .company-info      // Info entreprise
 * - .title             // Titre du document
 * - .info-section      // Section d'infos
 * - .table             // Tableau
 * - .totals            // Totaux
 * - .footer            // Pied de page
 * - .signatures        // Signatures
 * - .statut-badge      // Badge statut
 * - .text-right        // Alignement droit
 * - .text-center       // Alignement centre
 * 
 * Variants pour ticket:
 * - .page.ticket
 * - .header.ticket
 * - .table.ticket
 * - etc.
 */

// ============================================
// 6. FLUX D'UTILISATION COMPLET
// ============================================

/*

ÉTAPE 1: Importer ce dont vous avez besoin
├─ import { printBL } from "@/lib/print-utils";
├─ import { BLPrintData } from "@/types/print";
└─ ou avec hook: import { usePrint } from "@/hooks/usePrint";

ÉTAPE 2: Préparer les données
├─ Récupérer BonLivraison depuis BD/API
├─ Transformer en BLPrintData
└─ Valider les champs obligatoires

ÉTAPE 3: Déclencher l'impression
├─ Appeler printBL(data) ou
├─ Appeler printBL(data, "TICKET")
└─ Ou utiliser hook usePrint pour plus de contrôle

ÉTAPE 4: Fenêtre s'ouvre automatiquement
├─ Utilisateur voit print dialog
└─ Print via Ctrl+P ou button

*/

// ============================================
// 7. EXEMPLES D'UTILISATION
// ============================================

// Example 1: Appel simple
import { printBL } from "@/lib/print-utils";

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
  printBL(data); // Format A4 par défaut
};

// Example 2: Avec sélection de format
const handlePrintWithFormat = (
  bonLivraison: BonLivraison,
  format: "A4" | "TICKET"
) => {
  const data: BLPrintData = { /* ... */ };
  printBL(data, format);
};

// Example 3: Avec hook et gestion d'erreur
import { usePrint } from "@/hooks/usePrint";

function PrintButton() {
  const { printHTML, isLoading, error } = usePrint();

  const handlePrint = () => {
    try {
      const data: BLPrintData = { /* ... */ };
      const html = generateBLPrintHTML(data);
      printHTML(html);
    } catch (err) {
      console.error("Print failed:", err);
    }
  };

  return (
    <>
      <Button onClick={handlePrint} disabled={isLoading}>
        {isLoading ? "Impression..." : "Imprimer"}
      </Button>
      {error && <Alert variant="destructive">{error}</Alert>}
    </>
  );
}

// ============================================
// 8. TROUBLESHOOTING
// ============================================

/*

❌ "Impossible d'ouvrir la fenêtre d'impression"
✅ Les pop-ups sont probablement bloqués
   - Vérifier les paramètres du navigateur
   - Ajouter une exception pour votre domaine
   - Tester sur un domaine de confiance

❌ "Les styles ne s'appliquent pas"
✅ Vérifier que combinePrintStyles() est importé
✅ Vérifier que PrintLayout enveloppe le template
✅ Tester dans une fenêtre d'impression réelle (Ctrl+P)

❌ "Les données n'apparaissent pas"
✅ Vérifier que les champs obligatoires sont présents
✅ Vérifier la transformation des données
✅ Regarder la console pour les erreurs React

❌ "Le format ticket est compressé"
✅ C'est normal, largeur max 80mm
✅ Les contenus non essentiels sont masqués
✅ Réduire les marges si nécessaire dans printStyles.ts

*/

// ============================================
// 9. CHECKLIST DE MIGRATION
// ============================================

/*

Pour chaque page à migrer:

□ Importer la fonction print et le type de données
  import { printBL } from "@/lib/print-utils";
  import { BLPrintData } from "@/types/print";

□ Remplacer l'ancienne fonction handlePrint
  Avant: 250+ lignes de code
  Après: 5-10 lignes

□ Transformer les données au bon type
  BonLivraison -> BLPrintData
  Facture -> FacturePrintData
  etc.

□ Tester l'impression en format A4
  Vérifier tous les éléments s'affichent

□ Tester l'impression en format TICKET
  Vérifier la mise en page compactée

□ Supprimer l'ancien code d'impression
  (300+ lignes de HTML/CSS)

□ Valider que rien n'est cassé
  Tests manuels de tous les documents

□ Commit avec message clair
  "refactor: utiliser système d'impression centralisé"

*/
