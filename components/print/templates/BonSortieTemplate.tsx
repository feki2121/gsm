import React from "react";
import { BonSortiePrintData, PrintFormat } from "@/types/print";
import { PrintFooter } from "../PrintFooter";
import { formatCurrency } from "@/lib/types";

interface BonSortieTemplateProps {
  data: BonSortiePrintData;
  format?: PrintFormat;
}

const DEFAULT_COMPANY = {
  name: "CHIHA GSM",
  address: "RTE ELAIN KM3, SFAX",
  phone: "24 807 784",
  vat: "1677720 S/A/C/000",
};

const getMotifLabel = (motif: string): string => {
  const labels: Record<string, string> = {
    VENTE: "Vente",
    TRANSFERT: "Transfert",
    DON: "Don",
    ECHANTILLON: "Échantillon",
    PERTE: "Perte",
    INVENTAIRE: "Inventaire",
    AUTRE: "Autre",
  };
  return labels[motif] || motif;
};

export const BonSortieTemplate: React.FC<BonSortieTemplateProps> = ({
  data,
  format = "A4",
}) => {
  const isTicket = format === "TICKET";

  // Formater la date
  const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).replace(/\//g, ' / ');

  return (
    <div className="invoice-aysud">
      {/* En-tête style AYSUD */}
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
          <div className="invoice-title">BON DE SORTIE</div>
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
          {/* Informations du motif */}
          <div className="party-details" style={{ marginTop: "10px" }}>
            <strong>Motif :</strong> {getMotifLabel(data.motif)}<br />
            {data.observation && (
              <>
                <strong>Observation :</strong> {data.observation}
              </>
            )}
          </div>
        </div>
        <div className="receiver">
          <div className="party-title">DESTINATAIRE :</div>
          <div className="party-details">
            <strong>{data.destinataire || data.client?.nom || "N/A"}</strong><br />
            Destination: {data.destination}<br />
            {data.adresseLivraison && <>Adresse: {data.adresseLivraison}<br /></>}
          </div>
          {/* Informations conducteur */}
          {!isTicket && (
            <div className="party-details" style={{ marginTop: "10px" }}>
              <strong>Conducteur :</strong> {data.nomConducteur}<br />
              <strong>Véhicule :</strong> {data.matriculeVehicule}<br />
              <strong>CIN :</strong> {data.numCIN}
            </div>
          )}
        </div>
      </div>

      <hr className={isTicket ? "ticket" : ""} />

      {/* Tableau des produits */}
      <table className={isTicket ? "ticket" : ""}>
        <thead>
          <tr>
            <th>Désignation</th>
            <th className="text-center">Qté</th>
            {!isTicket && (
              <>
                <th className="text-right">P.U. HT</th>
                <th className="text-right">P.U. TTC</th>
                <th className="text-right">Total HT</th>
              </>
            )}
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
              {!isTicket && (
                <>
                  <td className="text-right">
                    {ligne.prixUnitaireHT.toFixed(3)}
                   </td>
                  <td className="text-right">
                    {ligne.prixUnitaireTTC.toFixed(3)}
                   </td>
                  <td className="text-right">
                    {(ligne.quantite * ligne.prixUnitaireHT).toFixed(3)}
                   </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      {!isTicket && data.totalHT && (
        <div className={`totals-container ${isTicket ? "ticket" : ""}`}>
          <div className={`totals-table ${isTicket ? "ticket" : ""}`}>
            {data.totalHT && (
              <div className={`total-row ${isTicket ? "ticket" : ""}`}>
                <span>Total HT :</span>
                <span>{formatCurrency(data.totalHT)}</span>
              </div>
            )}
            {data.totalTTC && (
              <div className={`total-row final ${isTicket ? "ticket" : ""}`}>
                <span>Total TTC :</span>
                <span className="font-bold">{formatCurrency(data.totalTTC)}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signatures */}
      {!isTicket && (
        <div className="signatures">
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Magasinier</div>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Conducteur</div>
          </div>
          <div className="signature-block">
            <div className="signature-line"></div>
            <div className="signature-label">Pour CHIHA GSM</div>
          </div>
        </div>
      )}

      <PrintFooter format={format} />
    </div>
  );
};