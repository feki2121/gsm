// /**
//  * Utilitaires pour générer le HTML d'impression à partir des données
//  * et des templates React
//  */

// import React from "react";
// import ReactDOMServer from "react-dom/server";
// import { PrintLayout } from "@/components/print/PrintLayout";
// import {
//   BLTemplate,
//   FactureTemplate,
//   DevisTemplate,
//   BonSortieTemplate,
// } from "@/components/print/templates";
// import {
//   BLPrintData,
//   FacturePrintData,
//   DevisPrintData,
//   BonSortiePrintData,
//   PrintFormat,
// } from "@/types/print";

// /**
//  * Génère le HTML complet pour imprimer un BL
//  */
// export const generateBLPrintHTML = (
//   data: BLPrintData,
//   format: PrintFormat = "A4"
// ): string => {
//   const component = React.createElement(
//     PrintLayout,
//     { format },
//     React.createElement(BLTemplate, { data, format })
//   );
//   return ReactDOMServer.renderToStaticMarkup(component);
// };

// /**
//  * Génère le HTML complet pour imprimer une facture
//  */
// export const generateFacturePrintHTML = (
//   data: FacturePrintData,
//   format: PrintFormat = "A4"
// ): string => {
//   const component = React.createElement(
//     PrintLayout,
//     { format },
//     React.createElement(FactureTemplate, { data, format })
//   );
//   return ReactDOMServer.renderToStaticMarkup(component);
// };

// /**
//  * Génère le HTML complet pour imprimer un devis
//  */
// export const generateDevisPrintHTML = (
//   data: DevisPrintData,
//   format: PrintFormat = "A4"
// ): string => {
//   const component = React.createElement(
//     PrintLayout,
//     { format },
//     React.createElement(DevisTemplate, { data, format })
//   );
//   return ReactDOMServer.renderToStaticMarkup(component);
// };

// /**
//  * Génère le HTML complet pour imprimer un bon de sortie
//  */
// export const generateBonSortiePrintHTML = (
//   data: BonSortiePrintData,
//   format: PrintFormat = "A4"
// ): string => {
//   const component = React.createElement(
//     PrintLayout,
//     { format },
//     React.createElement(BonSortieTemplate, { data, format })
//   );
//   return ReactDOMServer.renderToStaticMarkup(component);
// };

// /**
//  * Ouvre une fenêtre d'impression avec le HTML fourni
//  */
// export const openPrintWindow = (
//   htmlContent: string,
//   filename?: string
// ): Window | null => {
//   // Utiliser des options plus permissives pour éviter le blocage
//   const features = [
//     "noopener",
//     "noreferrer",
//     "width=800",
//     "height=600",
//     "left=200",
//     "top=100",
//     "toolbar=yes",
//     "scrollbars=yes",
//     "resizable=yes"
//   ].join(",");
  
//   let printWindow: Window | null = null;
  
//   try {
//     // Essayer d'abord d'ouvrir avec un nom spécifique
//     printWindow = window.open("", "print_window", features);
    
//     // Si ça échoue à cause du blocage, essayer sans features
//     if (!printWindow) {
//       printWindow = window.open("", "_blank");
//     }
    
//     if (!printWindow) {
//       // Dernier recours: utiliser iframe
//       const iframe = document.createElement('iframe');
//       iframe.style.display = 'none';
//       iframe.style.position = 'absolute';
//       iframe.style.width = '0';
//       iframe.style.height = '0';
//       iframe.style.border = 'none';
//       document.body.appendChild(iframe);
//       printWindow = iframe.contentWindow;
      
//       if (!printWindow) {
//         throw new Error("Impossible d'ouvrir la fenêtre d'impression");
//       }
//     }

//     printWindow.document.write(htmlContent);
//     printWindow.document.close();

//     // Ajouter le titre si spécifié
//     if (filename && printWindow.document) {
//       printWindow.document.title = filename;
//     }

//     // Déclencher l'impression après chargement
//     if (printWindow.focus) {
//       printWindow.focus();
//     }
    
//     // Attendre que le contenu soit chargé
//     setTimeout(() => {
//       if (printWindow && !printWindow.closed) {
//         printWindow.print();
//       }
//     }, 100);
    
//   } catch (error) {
//     console.error("Erreur lors de l'écriture du contenu d'impression:", error);
//     if (printWindow && !printWindow.closed) {
//       printWindow.close();
//     }
//     // Afficher un message à l'utilisateur
//     alert("Impossible d'ouvrir l'impression. Veuillez vérifier que les pop-ups ne sont pas bloqués.");
//     return null;
//   }

//   return printWindow;
// };

// /**
//  * Fonction principale pour imprimer un BL
//  */
// export const printBL = (
//   data: BLPrintData,
//   format: PrintFormat = "A4"
// ): void => {
//   const htmlContent = generateBLPrintHTML(data, format);
//   openPrintWindow(htmlContent, `BL-${data.numero}`);
// };

// /**
//  * Fonction principale pour imprimer une facture
//  */
// export const printFacture = (
//   data: FacturePrintData,
//   format: PrintFormat = "A4"
// ): void => {
//   const htmlContent = generateFacturePrintHTML(data, format);
//   openPrintWindow(htmlContent, `Facture-${data.numero}`);
// };

// /**
//  * Fonction principale pour imprimer un devis
//  */
// export const printDevis = (
//   data: DevisPrintData,
//   format: PrintFormat = "A4"
// ): void => {
//   const htmlContent = generateDevisPrintHTML(data, format);
//   openPrintWindow(htmlContent, `Devis-${data.numero}`);
// };

// /**
//  * Fonction principale pour imprimer un bon de sortie
//  */
// export const printBonSortie = (
//   data: BonSortiePrintData,
//   format: PrintFormat = "A4"
// ): void => {
//   const htmlContent = generateBonSortiePrintHTML(data, format);
//   openPrintWindow(htmlContent, `BS-${data.numero}`);
// };