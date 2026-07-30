import React from "react";
import { DevisPrintData, PrintFormat } from "@/types/print";
import { PrintFooter } from "../PrintFooter";
import { formatCurrency } from "@/lib/types";

interface DevisTemplateProps {
  data: DevisPrintData;
  format?: PrintFormat;
}

const DEFAULT_COMPANY = {
  name: "KALLAL TECH COMPANY",
  address: "01. Teniour chihia 3000 - SFAX",
  phone: "25 535 035",
  vat: "1860077 Q/A/M/000",
};

export const DevisTemplate: React.FC<DevisTemplateProps> = ({
  data,
  format = "A4",
}) => {
  const isTicket = format === "TICKET";
  const hasRemise = (data.remise || 0) > 0;

  // Formater la date
  const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, ' / ');

  // Calcul du total HT avant remise pour affichage
  const totalHTBrut = data.lignes.reduce((sum, l) => 
    sum + (l.quantite * (l.prixUnitaireHT || (l.prixUnitaire / (1 + (l.product?.tva || 19) / 100)))), 0
  );
  
  const totalTTCBrut = data.lignes.reduce((sum, l) => 
    sum + (l.quantite * l.prixUnitaire), 0
  );

  const getRemiseText = () => {
    if (!hasRemise) return null;
    if (data.remiseType === "PERCENT") {
      return `Remise ${data.remise}%`;
    } else {
      return `Remise ${formatCurrency(data.remise || 0)}`;
    }
  };

  const getMontantRemise = () => {
    if (!hasRemise) return 0;
    if (data.remiseType === "PERCENT") {
      return totalTTCBrut * (data.remise || 0) / 100;
    } else {
      return data.remise || 0;
    }
  };

  return (
    <div className="invoice-aysud">
      {/* En-tête style AYSUD */}
      <div className="header">
        <div className="logo-container">
          <img 
            src="/ktc.png" 
            alt="Logo" 
            className="logo-img" 
            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
          />
        </div>
        <div className="title-container">
          <div className="invoice-title">DEVIS</div>
          <div className="invoice-number">N° : {data.numero}</div>
        </div>
        <div className="date-block">
          <span className="date-label">DATE :</span> {formattedDate}
        </div>
      </div>

      {/* Section Émetteur / Destinataire */}
      <div className={`parties-container ${isTicket ? "ticket" : ""}`}>
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
            <strong>{data.client?.nom || "N/A"}</strong><br />
            {data.client?.adresse && <>{data.client.adresse}<br /></>}
            {data.client?.telephone && <>Tél: {data.client.telephone}<br /></>}
          </div>
        </div>
      </div>

      <hr className={isTicket ? "ticket" : ""} />

      {/* Tableau des produits */}
      <table className={isTicket ? "ticket" : ""}>
        <thead>
          <tr>
            <th>Désignation</th>
            <th className="text-center">Qté</th>
            <th className="text-right">P.U. TTC</th>
            {!isTicket && <th className="text-right">Total TTC</th>}
          </tr>
        </thead>
        <tbody>
          {data.lignes.map((ligne, idx) => (
            <tr key={idx}>
              <td>
                {ligne.product?.designation || "-"}
                {ligne.product?.reference && !isTicket && (
                  <span style={{ fontSize: "10px", color: "#666", display: "block" }}>
                    Réf: {ligne.product.reference}
                  </span>
                )}
              </td>
              <td className="text-center">{ligne.quantite}</td>
              <td className="text-right">
                {ligne.prixUnitaire.toFixed(3)}
              </td>
              {!isTicket && (
                <td className="text-right">
                  {(ligne.quantite * ligne.prixUnitaire).toFixed(3)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className={`totals-container ${isTicket ? "ticket" : ""}`}>
        <div className={`totals-table ${isTicket ? "ticket" : ""}`}>
          
          {/* Affichage des sous-totaux si remise */}
          {hasRemise && !isTicket && (
            <>
              <div className="total-row muted">
                <span>Sous-total HT :</span>
                <span>{formatCurrency(totalHTBrut)}</span>
              </div>
              <div className="total-row muted">
                <span>Sous-total TTC :</span>
                <span>{formatCurrency(totalTTCBrut)}</span>
              </div>
            </>
          )}

          {/* Ligne de remise */}
          {hasRemise && (
            <div className="total-row discount">
              <span>{getRemiseText()} :</span>
              <span>- {formatCurrency(getMontantRemise())}</span>
            </div>
          )}

          {/* Séparateur si remise */}
          {hasRemise && !isTicket && <div className="separator"></div>}

          {/* Totaux finaux */}
          <div className={`total-row ${isTicket ? "ticket" : ""}`}>
            <span>Total HT :</span>
            <span>{formatCurrency(data.totalHT)}</span>
          </div>
          <div className={`total-row ${isTicket ? "ticket" : ""}`}>
            <span>TVA ({data.lignes[0]?.product?.tva || 19}%) :</span>
            <span>{formatCurrency(data.totalTVA)}</span>
          </div>
          <div className={`total-row final ${isTicket ? "ticket" : ""}`}>
            <span>Total TTC :</span>
            <span className="font-bold">{formatCurrency(data.totalTTC)}</span>
          </div>
        </div>
      </div>

      {/* Signatures */}
      {!isTicket && (
        <div className="signatures">
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Le client</div>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Pour KALLAL TECH COMPANY</div>
          </div>
        </div>
      )}

      <PrintFooter format={format} />
    </div>
  );
};