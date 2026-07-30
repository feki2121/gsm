/**
 * Utilitaires pour générer le HTML d'impression à partir des données
 * et des templates React
 */

import React from "react";
import ReactDOMServer from "react-dom/server";
import { PrintLayout } from "@/components/print/PrintLayout";
import {
  BLTemplate,
  FactureTemplate,
  DevisTemplate,
  BonSortieTemplate,
} from "@/components/print/templates";
import {
  BLPrintData,
  FacturePrintData,
  DevisPrintData,
  BonSortiePrintData,
  PrintFormat,
  BEPrintData,
} from "@/types/print";
import { BETemplate } from "@/components/print/templates/BETemplate";
import { CatalogueTemplate } from "@/components/print/templates/CatalogueTemplate";
import { CatalogueTemplateTest } from "@/components/print/templates/CatalogueTemplateTest";

/**
 * Génère le HTML complet pour imprimer un BL
 */

export const generateCatalogueHTMLTest = (products: any[]): string => {
  const component = (
    <CatalogueTemplateTest
      products={products}
      title="LISTE DE PRIX"
    />
  );
  
  return ReactDOMServer.renderToStaticMarkup(component);
};
export const generateCatalogueHTML = (products: any[]): string => {
  const component = (
    <CatalogueTemplate 
      products={products}
      title="LISTE DE PRIX"
    />
  );
  
  return ReactDOMServer.renderToStaticMarkup(component);
};
export const generateBLPrintHTML = (
  data: BLPrintData,
  format: PrintFormat = "A4",
  copieType?: 'SOCIETE' | 'CLIENT'
  ): string => {
  const component = (
    <PrintLayout format={format}>
      <BLTemplate data={data} format={format} copieType={copieType} />
    </PrintLayout>
  );
  return ReactDOMServer.renderToStaticMarkup(component);
};

export const generateBEPrintHTML = (
  data: BEPrintData,
  format: PrintFormat = "A4",
  copieType?: 'SOCIETE' | 'FOURNISSEUR'
): string => {
  const component = (
    <PrintLayout format={format}>
      <BETemplate data={data} format={format} copieType={copieType} />
    </PrintLayout>
  );
  return ReactDOMServer.renderToStaticMarkup(component);
};


/**
 * Génère le HTML complet pour imprimer une facture
 */
export const generateFacturePrintHTML = (
  data: FacturePrintData,
  format: PrintFormat = "A4"
): string => {
  const component = (
    <PrintLayout format={format}>
      <FactureTemplate data={data} format={format} />
    </PrintLayout>
  );
  return ReactDOMServer.renderToStaticMarkup(component);
};

/**
 * Génère le HTML complet pour imprimer un devis
 */
export const generateDevisPrintHTML = (
  data: DevisPrintData,
  format: PrintFormat = "A4"
): string => {
  const component = (
    <PrintLayout format={format}>
      <DevisTemplate data={data} format={format} />
    </PrintLayout>
  );
  return ReactDOMServer.renderToStaticMarkup(component);
};

/**
 * Génère le HTML complet pour imprimer un bon de sortie
 */
export const generateBonSortiePrintHTML = (
  data: BonSortiePrintData,
  format: PrintFormat = "A4"
): string => {
  const component = (
    <PrintLayout format={format}>
      <BonSortieTemplate data={data} format={format} />
    </PrintLayout>
  );
  return ReactDOMServer.renderToStaticMarkup(component);
};

/**
 * Ouvre une fenêtre d'impression avec le HTML fourni
 */
export const openPrintWindow = (
  htmlContent: string,
  filename?: string
): Window | null => {
  const features = [
    "noopener",
    "noreferrer",
    "width=800",
    "height=600",
    "left=200",
    "top=100",
    "toolbar=yes",
    "scrollbars=yes",
    "resizable=yes"
  ].join(",");
  
  let printWindow: Window | null = null;
  
  try {
    printWindow = window.open("", "print_window", features);
    
    if (!printWindow) {
      printWindow = window.open("", "_blank");
    }
    
    if (!printWindow) {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      document.body.appendChild(iframe);
      printWindow = iframe.contentWindow;
      
      if (!printWindow) {
        throw new Error("Impossible d'ouvrir la fenêtre d'impression");
      }
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    if (filename && printWindow.document) {
      printWindow.document.title = filename;
    }

    if (printWindow.focus) {
      printWindow.focus();
    }
    
    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.print();
      }
    }, 100);
    
  } catch (error) {
    console.error("Erreur lors de l'écriture du contenu d'impression:", error);
    if (printWindow && !printWindow.closed) {
      printWindow.close();
    }
    alert("Impossible d'ouvrir l'impression. Veuillez vérifier que les pop-ups ne sont pas bloqués.");
    return null;
  }

  return printWindow;
};

export const printBL = (data: BLPrintData, format: PrintFormat = "A4"): void => {
  const htmlContent = generateBLPrintHTML(data, format);
  openPrintWindow(htmlContent, `BL-${data.numero}`);
};

export const printFacture = (data: FacturePrintData, format: PrintFormat = "A4"): void => {
  const htmlContent = generateFacturePrintHTML(data, format);
  openPrintWindow(htmlContent, `Facture-${data.numero}`);
};

export const printDevis = (data: DevisPrintData, format: PrintFormat = "A4"): void => {
  const htmlContent = generateDevisPrintHTML(data, format);
  openPrintWindow(htmlContent, `Devis-${data.numero}`);
};

export const printBonSortie = (data: BonSortiePrintData, format: PrintFormat = "A4"): void => {
  const htmlContent = generateBonSortiePrintHTML(data, format);
  openPrintWindow(htmlContent, `BS-${data.numero}`);
};