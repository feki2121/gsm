// components/templates/FactureTemplate.tsx

import React from "react";
import { FacturePrintData, PrintFormat } from "@/types/print";
import { PrintFooter } from "../PrintFooter";
import { formatCurrency } from "@/lib/types";

interface FactureTemplateProps {
  data: FacturePrintData;
  format?: PrintFormat;
}

const DEFAULT_COMPANY = {
  name: "KALLAL TECH COMPANY",
  address: "RTE ELAIN KM3, SFAX",
  phone: "24 807 784",
  vat: "1677720 S/A/C/000",
};

// Styles pour le format ticket 48mm
const ticketStyles = `
    @media print {
        @page {
            size: 48mm auto;
            margin: 2mm;
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
        font-size: 9px;
        font-family: 'Courier New', monospace;
        line-height: 1.2;
    }
    
    .ticket-print .header {
        text-align: center;
        margin-bottom: 3px;
        padding-bottom: 3px;
        border-bottom: 1px dashed #000;
    }
    
    .ticket-print .logo-img {
        max-width: 7mm;
        width: 7mm;
        height: auto;
        margin: 0 auto;
        display: block;
    }
    
    .ticket-print .invoice-title {
        font-size: 7px;
        font-weight: bold;
        margin: 2px 0;
        letter-spacing: 0.5px;
    }
    
    .ticket-print .invoice-number {
        font-size: 6px;
        font-weight: bold;
        margin: 1px 0;
    }
    
    .ticket-print .date-block {
        font-size: 3px;
        margin-top: 2px;
    }
    
    .ticket-print .parties-container {
        margin: 3px 0;
        font-size: 6px;
    }
    
    .ticket-print .party-title {
        font-weight: bold;
        margin: 2px 0 1px 0;
        font-size: 7px;
    }
    
    .ticket-print .party-details {
        line-height: 1.2;
        word-wrap: break-word;
        font-size: 6px;
    }
    
    .ticket-print hr {
        margin: 3px 0;
        border: none;
        border-top: 1px dashed #000;
    }
    
    .ticket-print table {
        width: 100%;
        border-collapse: collapse;
        font-size: 7px;
    }
    
    .ticket-print th {
        text-align: left;
        padding: 2px 1px;
        border-bottom: 1px dotted #000;
        font-weight: bold;
        font-size: 7px;
    }
    
    .ticket-print td {
        padding: 2px 1px;
        vertical-align: top;
        font-size: 7px;
    }
    
    .ticket-print .text-center {
        text-align: center;
    }
    
    .ticket-print .text-right {
        text-align: right;
    }
    
    .ticket-print .totals-container {
        margin-top: 5px;
        padding-top: 3px;
        border-top: 1px dashed #000;
    }
    
    .ticket-print .total-row {
        display: flex;
        justify-content: space-between;
        padding: 1px 0;
        font-size: 7px;
    }
    
    .ticket-print .total-row.final {
        font-weight: bold;
        margin-top: 2px;
        padding-top: 2px;
        border-top: 1px dotted #000;
        font-size: 8px;
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
        border-top: 1px dotted #000;
        width: 100%;
        margin: 3px 0;
    }
    
    .ticket-print .signature-label {
        font-size: 6px;
    }
`;

// Styles A4
const a4Styles = `
    .invoice-aysud {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
        font-size: 12px;
        font-family: Arial, sans-serif;
    }
    
    .invoice-aysud .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #000;
    }
    
    .invoice-aysud .logo-container {
        flex: 0 0 120px;
    }
    
    .invoice-aysud .logo-img {
        max-width: 120px;
        width: 120px;
        height: auto;
    }
    
    .invoice-aysud .title-container {
        flex: 1;
        text-align: center;
    }
    
    .invoice-aysud .invoice-title {
        font-size: 24px;
        font-weight: bold;
    }
    
    .invoice-aysud .invoice-number {
        font-size: 16px;
        font-weight: bold;
        margin-top: 5px;
    }
    
    .invoice-aysud .date-block {
        font-size: 12px;
        font-weight: bold;
    }
    
    .invoice-aysud .parties-container {
        display: flex;
        justify-content: space-between;
        margin-bottom: 20px;
    }
    
    .invoice-aysud .emitter,
    .invoice-aysud .receiver {
        flex: 1;
    }
    
    .invoice-aysud .party-title {
        font-weight: bold;
        font-size: 14px;
        margin-bottom: 5px;
    }
    
    .invoice-aysud .party-details {
        font-size: 12px;
        line-height: 1.5;
    }
    
    .invoice-aysud hr {
        margin: 15px 0;
        border: none;
        border-top: 1px solid #000;
    }
    
    .invoice-aysud table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 15px;
    }
    
    .invoice-aysud th {
        background-color: #f5f5f5;
        font-weight: bold;
        padding: 8px 6px;
        border: 1px solid #ddd;
        text-align: left;
        font-size: 11px;
    }
    
    .invoice-aysud td {
        padding: 6px;
        border: 1px solid #ddd;
        font-size: 11px;
    }
    
    .invoice-aysud .text-center {
        text-align: center;
    }
    
    .invoice-aysud .text-right {
        text-align: right;
    }
    
    .invoice-aysud .totals-container {
        display: flex;
        justify-content: flex-end;
    }
    
    .invoice-aysud .totals-table {
        width: 350px;
    }
    
    .invoice-aysud .total-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 12px;
    }
    
    .invoice-aysud .total-row.final {
        font-weight: bold;
        font-size: 14px;
        border-top: 2px solid #000;
        margin-top: 5px;
        padding-top: 8px;
    }
    
    .invoice-aysud .signatures {
        display: flex;
        justify-content: space-between;
        margin-top: 40px;
    }
    
    .invoice-aysud .signature-block {
        width: 45%;
    }
    
    .invoice-aysud .signature-line {
        border-top: 1px solid #000;
        width: 100%;
        margin: 10px 0;
    }
    
    .invoice-aysud .signature-label {
        font-size: 12px;
        text-align: center;
    }
`;

// ✅ Définir TicketContent en dehors du composant principal
const TicketContent = ({ data }: { data: FacturePrintData }) => {
  const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, ' / ');

  return (
    <div className="ticket-print">
      <style>{ticketStyles}</style>

      {/* En-tête */}
      <div className="header">
        <div className="logo-container">
          <img
            src="/chiha.jpeg"
            alt="Logo"
            className="logo-img"
            style={{
              maxWidth: "7mm",
              width: "7mm",
              height: "auto"
            }}
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
        <div className="invoice-title">FACTURE:</div>
        <div className="invoice-number">{data.numero}</div>
        <div className="date-block">{formattedDate}</div>
      </div>

      {/* Section Émetteur / Destinataire */}
      <div className="parties-container">
        <div className="emitter">
          <div className="party-title">EMETTEUR:</div>
          <div className="party-details">
            {DEFAULT_COMPANY.name}<br />
            {DEFAULT_COMPANY.address}<br />
            Tel:{DEFAULT_COMPANY.phone}
          </div>
        </div>
        <div className="receiver" style={{ marginTop: "3px" }}>
          <div className="party-title">DESTINATAIRE:</div>
          <div className="party-details">
            <strong>{data.client?.nom || "N/A"}</strong>
            {data.client?.telephone && <><br />Tel:{data.client.telephone}</>}
          </div>
        </div>
      </div>

      <hr />

      {/* Tableau des produits */}
      <table>
        <thead>
          <tr>
            <th>Article</th>
            <th className="text-center">Qté</th>
            <th className="text-right">PU</th>
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((ligne, idx) => {
            const designation = ligne.product?.designation || "-";
            const shortDesignation = designation.length > 20
              ? designation.substring(0, 18) + ".."
              : designation;

            return (
              <tr key={idx}>
                <td style={{ wordBreak: "break-word" }}>
                  {shortDesignation}
                  {ligne.product?.reference && (
                    <span style={{ fontSize: "5px", display: "block", color: "#666" }}>
                      {ligne.product.reference}
                    </span>
                  )}
                </td>
                <td className="text-center">{ligne.quantite}</td>
                <td className="text-right">
                  {ligne.prixUnitaire.toFixed(3)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="totals-container">
        <div className="total-row">
          <span>Total HT:</span>
          <span>{formatCurrency(data.totalHT)}</span>
        </div>
        <div className="total-row">
          <span>TVA:</span>
          <span>{formatCurrency(data.totalTVA)}</span>
        </div>
        {/* ✅ Afficher la remise selon le mode */}
        {data.useGlobalRemise && data.remiseGlobaleDT && data.remiseGlobaleDT > 0 && (
          <div className="total-row" style={{ color: 'green' }}>
            <span>Remise globale:</span>
            <span>-{formatCurrency(data.remiseGlobaleDT)}</span>
          </div>
        )}
        {!data.useGlobalRemise && (data.totalRemise || 0) > 0 && (
          <div className="total-row" style={{ color: 'green' }}>
            <span>Remise totale:</span>
            <span>-{formatCurrency(data.totalRemise || 0)}</span>
          </div>
        )}
        <div className="total-row">
          <span>Timbre:</span>
          <span>{formatCurrency(1)}</span>
        </div>
        <div className="total-row final">
          <span>TOTAL TTC:</span>
          <span style={{ fontWeight: "bold", fontSize: "8px" }}>
            {formatCurrency(data.totalTTC)}
          </span>
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures">
        <div className="signature-block">
          <div className="signature-line"></div>
          <div className="signature-label">Le client</div>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <div className="signature-label">Société</div>
        </div>
      </div>
    </div>
  );
};

// ✅ Définir A4Content en dehors du composant principal
const A4Content = ({ data }: { data: FacturePrintData }) => {
  const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, ' / ');

  return (
    <div className="invoice-aysud">
      <style>{a4Styles}</style>

      <div className="header">
        <div className="logo-container">
          <img
            src="/chiha.jpeg"
            alt="Logo"
            className="logo-img"
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
        <div className="title-container">
          <div className="invoice-title">FACTURE</div>
          <div className="invoice-number">N° : {data.numero}</div>
        </div>
        <div className="date-block">
          <span className="date-label">DATE :</span> {formattedDate}
        </div>
      </div>

      <div className="parties-container">
        <div className="emitter">
          <div className="party-title">ÉMETTEUR :</div>
          <div className="party-details">
            <strong>{DEFAULT_COMPANY.name}</strong><br />
            {DEFAULT_COMPANY.address}<br />
            Tél: {DEFAULT_COMPANY.phone}<br />
            T.V.A.: {DEFAULT_COMPANY.vat}
          </div>
        </div>
        <div className="receiver">
          <div className="party-title">DESTINATAIRE :</div>
          <div className="party-details">
            <strong>{data.client?.nom || "N/A"}</strong>
            <br />

            {data.client?.matriculeFiscale && (
              <>
                Matricule: {data.client.matriculeFiscale}
                <br />
              </>
            )}

            {data.client?.addresses && data.client.addresses.length > 0 && (
              <>
                Adresse: {data.client.addresses[0]?.adresse}
                <br />
              </>
            )}

            {data.client?.telephone && (
              <>
                Tél: {data.client.telephone}
                <br />
              </>
            )}

            {data.client?.email && (
              <>
                {data.client.email}
                <br />
              </>
            )}
          </div>
        </div>
      </div>

      <hr />

      <table>
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Désignation</th>
            <th className="text-center">Qté</th>
            {!data.useGlobalRemise ? (
              <>
                <th className="text-right">PU HT<br />(avant rem.)</th>
                <th className="text-right">Remise<br />(DT)</th>
                <th className="text-right">PU HT<br />(base TVA)</th>
              </>
            ) : (
              <th className="text-right">PU HT</th>
            )}
            <th className="text-right">TVA %</th>
            <th className="text-right">TVA</th>
            <th className="text-right">Total HT</th>
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((ligne, idx) => {
            // ✅ Calcul du prix unitaire après remise
            const puApresRemise = ligne.quantite > 0
              ? (ligne.totalHT || 0) / ligne.quantite
              : 0;

            return (
              <tr key={idx}>
                <td>{ligne.product?.reference || "-"}</td>
                <td>{ligne.product?.designation || "-"}</td>
                <td className="text-center">{ligne.quantite}</td>
                {!data.useGlobalRemise ? (
                  // ✅ Mode remises individuelles en DT
                  <>
                    <td className="text-right">
                      {(ligne.prixUnitaireBrut || ligne.prixUnitaire || 0).toFixed(3)}
                    </td>
                    <td className="text-right">
                      {(ligne.remiseLigne ?? 0) > 0 ? (
                        <>
                          <span style={{ color: 'red' }}>
                            -{formatCurrency(ligne.remiseLigne || 0)}
                          </span>
                        </>
                      ) : '-'}
                    </td>
                    <td className="text-right">
                      {puApresRemise.toFixed(3)}
                    </td>
                  </>
                ) : (
                  <td className="text-right">
                    {(ligne.prixUnitaire || 0).toFixed(3)}
                  </td>
                )}
                <td className="text-right">{ligne.tva}%</td>
                <td className="text-right">{formatCurrency(ligne.totalTVA || 0)}</td>
                <td className="text-right">{formatCurrency(ligne.totalHT || 0)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="totals-container">
        <div className="totals-table">
          <div className="total-row">
            <span>Total HT avant remise :</span>
            <span>{formatCurrency(data.totalHTBrut || 0)}</span>
          </div>
          <div className="total-row" style={{ color: 'red' }}>
            <span>Total remise :</span>
            <span>-{formatCurrency(data.totalRemise || 0)}</span>
          </div>
          <div className="total-row">
            <span>Total HT après remise (base TVA) :</span>
            <span>{formatCurrency(data.totalHT)}</span>
          </div>
          <div className="total-row">
            <span>Total TVA :</span>
            <span>{formatCurrency(data.totalTVA)}</span>
          </div>
          <div className="total-row">
            <span>Timbre fiscal :</span>
            <span>{formatCurrency(1)}</span>
          </div>
          <div className="total-row final">
            <span>Total TTC :</span>
            <span className="font-bold">{formatCurrency(data.totalTTC)}</span>
          </div>
          <div className="total-row final" style={{ borderTop: '2px double #000', marginTop: '5px' }}>
            <span style={{ fontSize: '1.1em' }}>Net à payer :</span>
            <span style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#000' }}>
              {formatCurrency(data.totalTTC)}
            </span>
          </div>
        </div>
      </div>

      <div className="signatures">
        <div className="signature-block">
          <div className="signature-line"></div>
          <div className="signature-label">Société</div>
        </div>
        <div className="signature-block">
          <div className="signature-line"></div>
          <div className="signature-label">Le client</div>
        </div>
      </div>

      <PrintFooter format="A4" />
    </div>
  );
};

// Composant principal
export const FactureTemplate: React.FC<FactureTemplateProps> = ({
  data,
  format = "A4",
}) => {
  const isTicket = format === "TICKET";

  return isTicket ? <TicketContent data={data} /> : <A4Content data={data} />;
};