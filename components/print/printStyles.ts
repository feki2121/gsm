/**
 * Styles CSS communs pour l'impression
 */

export const commonPrintStyles = `
  @media print {
    body { margin: 0; padding: 0; }
    .no-print { display: none; }
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: Arial, sans-serif;
  }
`;

export const getA4Styles = () => `
  ${commonPrintStyles}
  
  .page {
    max-width: 210mm;
    height: 297mm;
    margin: 0 auto;
    background: white;
    padding: 20px;
  }
  
  @media print {
    .page {
      margin: 0;
      padding: 20px;
      max-width: 100%;
      height: 100%;
    }
  }
`;

export const getTicketStyles = () => `
  ${commonPrintStyles}
  
  .page {
    max-width: 80mm;
    margin: 0 auto;
    background: white;
    padding: 10px;
  }
  
  @media print {
    .page {
      margin: 0;
      padding: 10px;
      max-width: 100%;
    }
  }
`;

export const headerStyles = `
  .header {
    text-align: center;
    margin-bottom: 20px;
    padding-bottom: 15px;
    border-bottom: 2px solid #000;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  
  .header.ticket {
    flex-direction: column;
    justify-content: center;
  }
  
  .logo-container {
    flex: 0 0 auto;
  }
  
  .logo {
    max-height: 60px;
    max-width: 100px;
  }
  
  .header.ticket .logo {
    max-height: 40px;
    max-width: 60px;
  }
  
  .company-info {
    flex: 1;
    text-align: center;
  }
  
  .header.ticket .company-info {
    margin: 5px 0;
  }
  
  .company-name {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 3px;
  }
  
  .header.ticket .company-name {
    font-size: 12px;
  }
  
  .company-details {
    font-size: 11px;
    color: #555;
    margin: 1px 0;
  }
  
  .header.ticket .company-details {
    font-size: 8px;
  }
`;

// Ajoutez dans le fichier printStyles.ts

export const contentStyles = `
  .title {
    font-size: 18px;
    font-weight: bold;
    text-align: center;
    margin: 20px 0;
  }
  
  .title.ticket {
    font-size: 12px;
    margin: 10px 0;
  }
  
  .info-section {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border: 1px solid #e0e0e0;
  }
  
  .info-section.ticket {
    flex-direction: column;
    margin-bottom: 10px;
    padding: 10px;
    background: transparent;
  }
  
  .info-block {
    flex: 1;
    padding: 0 10px;
  }
  
  .info-block:first-child {
    padding-left: 0;
  }
  
  .info-block:last-child {
    padding-right: 0;
  }
  
  .info-section.ticket .info-block {
    padding: 5px 0;
  }
  
  .info-label {
    font-size: 10px;
    font-weight: 600;
    margin-bottom: 4px;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .info-label.ticket {
    font-size: 8px;
    margin-bottom: 2px;
  }
  
  .info-value {
    font-size: 13px;
    margin-bottom: 12px;
    color: #333;
  }
  
  .info-value.highlight {
    font-size: 16px;
    font-weight: bold;
    color: #2d6a4f;
  }
  
  .info-value.client-name {
    font-size: 15px;
    font-weight: 600;
    color: #1a1a2e;
  }
  
  .info-value.ticket {
    font-size: 9px;
    margin-bottom: 4px;
  }
  
  .info-section.ticket .info-value.highlight {
    font-size: 12px;
  }
`;

export const tableStyles = `
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
  }
  
  table.ticket {
    margin: 10px 0;
    font-size: 9px;
  }
  
  th, td {
    border: 1px solid #ddd;
    padding: 8px;
    text-align: left;
  }
  
  table.ticket th, table.ticket td {
    padding: 4px 2px;
    font-size: 8px;
  }
  
  th {
    background-color: #f5f5f5;
    font-weight: bold;
    font-size: 11px;
  }
  
  table.ticket th {
    font-size: 9px;
  }
  
  .text-right {
    text-align: right;
  }
  
  .text-center {
    text-align: center;
  }
`;

export const totalsStyles = `
  .totals {
    margin-top: 20px;
    text-align: right;
    padding: 10px;
    border-top: 2px solid #ddd;
  }
  
  .totals.ticket {
    margin-top: 10px;
    padding: 5px;
  }
  
  .total-row {
    margin: 4px 0;
    font-size: 12px;
  }
  
  .total-row.ticket {
    font-size: 9px;
    margin: 2px 0;
  }
  
  .total-row.main {
    font-size: 14px;
    font-weight: bold;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid #999;
  }
  
  .total-row.main.ticket {
    font-size: 11px;
  }
`;

export const footerStyles = `
  .footer {
    margin-top: 40px;
    text-align: center;
    font-size: 9px;
    color: #999;
    padding-top: 15px;
    border-top: 1px solid #ddd;
  }
  
  .footer.ticket {
    margin-top: 15px;
    padding-top: 8px;
    font-size: 7px;
  }
`;

export const signaturesStyles = `
  .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
  }
  
  .signatures.ticket {
    display: none;
  }
  
  .signature-block {
    width: 180px;
    text-align: center;
  }
  
  .signature-line {
    border-top: 1px solid #000;
    margin-bottom: 5px;
    height: 40px;
  }
  
  .signature-label {
    font-size: 9px;
  }
`;

export const statusBadgeStyles = `
  .statut-badge {
    display: inline-block;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 10px;
    font-weight: bold;
  }
  
  .statut-badge.ticket {
    font-size: 8px;
    padding: 2px 4px;
  }
  
  .statut-livre {
    background-color: #22c55e;
    color: white;
  }
  
  .statut-en_attente, .statut-brouillon {
    background-color: #eab308;
    color: white;
  }
  
  .statut-annule, .statut-invalide {
    background-color: #ef4444;
    color: white;
  }
  
  .statut-valide, .statut-accepte {
    background-color: #3b82f6;
    color: white;
  }
`;

export const combinePrintStyles = (format: "A4" | "TICKET" = "A4") => {
  const baseStyles = format === "A4" ? getA4Styles() : getTicketStyles();
  return `
    ${baseStyles}
    ${headerStyles}
    ${contentStyles}
    ${tableStyles}
    ${totalsStyles}
    ${footerStyles}
    ${signaturesStyles}
    ${statusBadgeStyles}
    ${invoiceAYSUDStyles}
    
    @media print {
      .no-print { display: none; }
      button { display: none; }
      a { text-decoration: none; color: #000; }
    }
  `;
};


// Ajoutez ces nouveaux styles à la fin du fichier printStyles.ts

// Nouveaux styles pour facture style AYSUD
// Nouveaux styles pour facture style AYSUD
export const invoiceAYSUDStyles = `
  /* Styles spécifiques pour la facture style AYSUD */
  .invoice-aysud .header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 20px;
  }
  
  .invoice-aysud .logo-img {
    height: 100px;
    width: auto;
    max-height: 100px;
    max-width: 150px;
  }
  
  .invoice-aysud .title-container {
    text-align: center;
  }
  
  .invoice-aysud .invoice-title {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .invoice-aysud .invoice-number {
    font-size: 16px;
  }
  
  .invoice-aysud .date-block {
    text-align: right;
  }
  
  .invoice-aysud .date-label {
    font-weight: bold;
  }
  
  .invoice-aysud .parties-container {
    display: flex;
    justify-content: space-between;
    margin-bottom: 30px;
    border-top: 2px solid #000000;
    border-bottom: 2px solid #000000;
    padding: 20px 0;
  }
  
  .invoice-aysud .parties-container.ticket {
    flex-direction: column;
    padding: 10px 0;
  }
  
  .invoice-aysud .emitter, 
  .invoice-aysud .receiver {
    flex: 1;
  }
  
  .invoice-aysud .emitter {
    padding-right: 20px;
  }
  
  .invoice-aysud .receiver {
    padding-left: 20px;
    border-left: 2px solid #000000;
  }
  
  .invoice-aysud .parties-container.ticket .emitter,
  .invoice-aysud .parties-container.ticket .receiver {
    padding: 5px 0;
    border-left: none;
    border-bottom: 1px solid #e0e0e0;
  }
  
  .invoice-aysud .party-title {
    font-weight: bold;
    margin-bottom: 10px;
    font-size: 14px;
  }
  
  .invoice-aysud .party-details {
    font-size: 12px;
    line-height: 1.5;
  }
  
  .invoice-aysud hr {
    border: none;
    border-top: 1px solid #000000;
    margin: 20px 0;
  }
  
  .invoice-aysud table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 12px;
  }
  
  .invoice-aysud table.ticket {
    font-size: 9px;
  }
  
  .invoice-aysud th {
    text-align: left;
    padding: 8px 4px;
    font-weight: bold;
    border-bottom: 1px solid #000000;
  }
  
  /* SOLUTION ALTERNATIVE : Pas de largeurs fixes, le tableau s'adapte */
  .invoice-aysud th,
  .invoice-aysud td {
    padding: 8px 8px;
  }
  
  /* Aligner les colonnes numériques à droite */
  .invoice-aysud th:nth-child(2),
  .invoice-aysud td:nth-child(2) {
    text-align: center;
  }
  
  .invoice-aysud th:nth-child(3),
  .invoice-aysud td:nth-child(3),
  .invoice-aysud th:nth-child(4),
  .invoice-aysud td:nth-child(4) {
    text-align: right;
  }
  
  .invoice-aysud td {
    border-bottom: 1px solid #e0e0e0;
  }
  
  .invoice-aysud .totals-container {
    display: flex;
    justify-content: flex-end;
    margin: 20px 0;
  }
  
  .invoice-aysud .totals-table {
    width: 250px;
  }
  
  .invoice-aysud .totals-table.ticket {
    width: 100%;
  }
  
  .invoice-aysud .total-row {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    font-size: 12px;
  }
  
  .invoice-aysud .total-row.ticket {
    font-size: 9px;
  }
  
  .invoice-aysud .total-row.final {
    font-weight: bold;
    border-top: 1px solid #000000;
    padding-top: 8px;
    margin-top: 5px;
  }
  
  .invoice-aysud .signatures {
    display: flex;
    justify-content: space-between;
    margin-top: 40px;
  }
  
  .invoice-aysud .signatures.ticket {
    display: none;
  }
  
  .invoice-aysud .signature-block {
    width: 180px;
    text-align: center;
  }
  
  .invoice-aysud .signature-line {
    border-top: 1px solid #000;
    margin-bottom: 5px;
    height: 40px;
  }
  
  .invoice-aysud .signature-label {
    font-size: 9px;
  }
  
  /* Styles pour l'impression */
.invoice-aysud .total-row.muted {
  color: #666;
  font-size: 12px;
}

.invoice-aysud .total-row.discount {
  color: #e67e22;
  font-weight: 500;
}

.invoice-aysud .separator {
  border-top: 1px dashed #ccc;
  margin: 5px 0;
}

.invoice-aysud .total-row.muted span:first-child,
.invoice-aysud .total-row.discount span:first-child {
  font-weight: normal;
}

/* Pour le format ticket */
.invoice-aysud .total-row.ticket {
  font-size: 12px;
}

.invoice-aysud .total-row.final.ticket {
  font-size: 14px;
}


 @media print {
        @page {
            size: 48mm auto;
            margin: 1.5mm;
        }
        
        body {
            margin: 0;
            padding: 0;
            font-family: Arial, Helvetica, sans-serif;
        }
    }
    
    .ticket-print {
        width: 48mm;
        max-width: 48mm;
        margin: 0 auto;
        font-size: 8px;
        font-family: Arial, Helvetica, sans-serif;
        font-weight: 500;
        line-height: 1.25;
    }
    
    /* Nouvel en-tête sur une ligne */
    .ticket-print .header {
        margin-bottom: 4px;
        padding-bottom: 3px;
        border-bottom: 1.5px solid #000;
    }
    
    .ticket-print .header-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 4px;
    }
    
    .ticket-print .logo-cell {
        flex-shrink: 0;
        width: 20%;
        text-align: left;
    }
    
    .ticket-print .logo-img {
        max-width: 8mm;
        width: 100%;
        height: auto;
        display: block;
    }
    
    .ticket-print .title-cell {
        flex: 1;
        text-align: center;
    }
    
    .ticket-print .invoice-title {
        font-size: 7px;
        font-weight: 900;
        letter-spacing: 0.5px;
        white-space: nowrap;
    }
    
    .ticket-print .invoice-number {
        font-size: 9px;
        font-weight: 900;
        margin-top: 1px;
        padding: 1px 2px;
        background: #e0e0e0;
        display: inline-block;
        white-space: nowrap;
    }
    
    .ticket-print .date-cell {
        flex-shrink: 0;
        width: 25%;
        text-align: right;
    }
    
    .ticket-print .date-block {
        font-size: 6px;
        font-weight: 700;
        white-space: nowrap;
    }
    
    /* Parties prenantes */
    .ticket-print .parties-container {
        margin: 4px 0;
        font-size: 7px;
    }
    
    .ticket-print .party-title {
        font-weight: 900;
        font-size: 7px;
        margin: 2px 0;
        text-transform: uppercase;
    }
    
    .ticket-print .party-details {
        line-height: 1.2;
        font-size: 7px;
        font-weight: 600;
    }
    
    /* Tableau compact */
    .ticket-print table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7px;
    }
    
    .ticket-print th {
        text-align: left;
        padding: 3px 2px;
        border-bottom: 1px solid #000;
        font-weight: 900;
        font-size: 7px;
    }
    
    .ticket-print td {
        padding: 3px 2px;
        font-size: 7px;
        font-weight: 500;
        border-bottom: 0.5px solid #ccc;
    }
    
    .ticket-print .text-center {
        text-align: center;
        font-weight: 700;
    }
    
    .ticket-print .text-right {
        text-align: right;
        font-weight: 700;
    }
    
    /* Totaux très visibles */
    .ticket-print .totals-container {
        margin-top: 5px;
        padding: 4px 2px;
        border-top: 2px solid #000;
        background: #fafafa;
    }
    
    .ticket-print .total-row {
        display: flex;
        justify-content: space-between;
        padding: 2px 0;
        font-size: 8px;
        font-weight: 700;
    }
    
    .ticket-print .total-row.final {
        font-weight: 900;
        font-size: 9px;
        margin-top: 4px;
        padding-top: 4px;
        border-top: 1px solid #000;
    }
    
    /* Mise en évidence du crédit restant */
    .ticket-print .total-row:last-child {
        background: #ffffcc;
        padding: 3px 2px;
        margin-top: 3px;
        border: 1px solid #000;
        font-weight: 900;
    }
    
    .ticket-print hr {
        margin: 3px 0;
        border: none;
        border-top: 1px solid #000;
    }
    
    .ticket-print .signatures {
        margin-top: 8px;
        display: flex;
        justify-content: space-between;
    }
    
    .ticket-print .signature-block {
        text-align: center;
        width: 45%;
    }
    
    .ticket-print .signature-line {
        border-top: 1px solid #000;
        width: 100%;
        margin: 4px 0;
    }
    
    .ticket-print .signature-label {
        font-size: 7px;
        font-weight: 600;
    }
`;

// Modifiez la fonction combinePrintStyles pour inclure les nouveaux styles
