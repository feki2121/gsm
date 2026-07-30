import React from "react";
import { BEPrintData, PrintFormat } from "@/types/print";
import { formatCurrency } from "@/lib/types";

interface BETemplateProps {
    data: BEPrintData;
    format?: PrintFormat;
    copieType?: 'SOCIETE' | 'FOURNISSEUR';
}

const DEFAULT_COMPANY = {
    name: "KALLAL TECH COMPANY",
    address: "RTE ELAIN KM3, SFAX",
    phone: "24 807 784",
    vat: "1677720 S/A/C/000",
};

// Styles pour le format A4
const a4Styles = `
    .invoice-aysud {
        max-width: 210mm;
        margin: 0 auto;
        padding: 10mm;
        font-family: Arial, sans-serif;
        font-size: 12px;
        background: white;
    }
    .invoice-aysud .header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #333;
    }
    .invoice-aysud .logo-container {
        width: 80px;
    }
    .invoice-aysud .logo-img {
        max-width: 100%;
        height: auto;
    }
    .invoice-aysud .title-container {
        text-align: center;
    }
    .invoice-aysud .invoice-title {
        font-size: 18px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 2px;
    }
    .invoice-aysud .invoice-number {
        font-size: 14px;
        font-weight: bold;
        margin-top: 5px;
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
        margin-bottom: 20px;
        gap: 20px;
    }
    .invoice-aysud .emitter,
    .invoice-aysud .receiver {
        flex: 1;
        padding: 10px;
        background: #f8f8f8;
        border-radius: 5px;
    }
    .invoice-aysud .party-title {
        font-weight: bold;
        margin-bottom: 8px;
        font-size: 13px;
        border-bottom: 1px solid #ddd;
        padding-bottom: 3px;
    }
    .invoice-aysud .party-details {
        font-size: 11px;
        line-height: 1.4;
    }
    .invoice-aysud hr {
        margin: 15px 0;
        border: none;
        border-top: 1px solid #ddd;
    }
    .invoice-aysud table {
        width: 100%;
        border-collapse: collapse;
        margin: 15px 0;
    }
    .invoice-aysud th {
        background: #f0f0f0;
        padding: 10px;
        text-align: left;
        font-weight: bold;
        border-bottom: 2px solid #ddd;
    }
    .invoice-aysud td {
        padding: 8px 10px;
        border-bottom: 1px solid #eee;
    }
    .invoice-aysud .text-center {
        text-align: center;
    }
    .invoice-aysud .text-right {
        text-align: right;
    }
    .invoice-aysud .totals-container {
        margin-top: 20px;
        display: flex;
        justify-content: flex-end;
    }
    .invoice-aysud .totals-table {
        width: 300px;
    }
    .invoice-aysud .total-row {
        display: flex;
        justify-content: space-between;
        padding: 5px 0;
    }
    .invoice-aysud .total-row.final {
        font-weight: bold;
        font-size: 14px;
        border-top: 2px solid #333;
        margin-top: 5px;
        padding-top: 10px;
    }
    .invoice-aysud .signatures {
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
    }
    .invoice-aysud .signature-block {
        text-align: center;
        width: 200px;
    }
    .invoice-aysud .signature-line {
        border-top: 1px solid #333;
        margin: 10px 0;
        padding-top: 5px;
    }
    .invoice-aysud .font-bold {
        font-weight: bold;
    }
    @media print {
        .invoice-aysud {
            padding: 0;
            margin: 0;
        }
        body {
            margin: 0;
            padding: 0;
        }
    }
`;

// Styles pour le format ticket
const ticketStyles = `
    @media print {
        @page {
            size: 58mm auto;
            margin: 2mm;
        }
        body {
            margin: 0;
            padding: 0;
        }
    }
    .ticket-print {
        width: 54mm;
        max-width: 54mm;
        margin: 0 auto;
        font-family: 'Courier New', monospace;
        font-size: 8px;
        line-height: 1.3;
    }
    .ticket-print .header {
        text-align: center;
        margin-bottom: 5px;
        padding-bottom: 5px;
        border-bottom: 1px dashed #000;
    }
    .ticket-print .logo-img {
        max-width: 30px;
        height: auto;
    }
    .ticket-print .invoice-title {
        font-size: 10px;
        font-weight: bold;
        margin: 3px 0;
    }
    .ticket-print .invoice-number {
        font-size: 9px;
        font-weight: bold;
    }
    .ticket-print .parties-container {
        margin: 5px 0;
    }
    .ticket-print .party-title {
        font-weight: bold;
        margin: 3px 0 2px 0;
        font-size: 8px;
    }
    .ticket-print .party-details {
        font-size: 7px;
        word-wrap: break-word;
    }
    .ticket-print hr {
        margin: 5px 0;
        border: none;
        border-top: 1px dashed #000;
    }
    .ticket-print table {
        width: 100%;
        border-collapse: collapse;
    }
    .ticket-print th {
        text-align: left;
        padding: 3px 1px;
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
        margin-top: 8px;
        padding-top: 5px;
        border-top: 1px dashed #000;
    }
    .ticket-print .total-row {
        display: flex;
        justify-content: space-between;
        padding: 2px 0;
    }
    .ticket-print .total-row.final {
        font-weight: bold;
        margin-top: 3px;
        padding-top: 3px;
        border-top: 1px dotted #000;
        font-size: 9px;
    }
    .ticket-print .signatures {
        margin-top: 15px;
        display: flex;
        justify-content: space-between;
    }
    .ticket-print .signature-block {
        text-align: center;
        width: 45%;
    }
    .ticket-print .signature-line {
        border-top: 1px dotted #000;
        margin: 5px 0;
    }
    .ticket-print .signature-label {
        font-size: 6px;
    }
    .ticket-print .font-bold {
        font-weight: bold;
    }
`;

export const BETemplate: React.FC<BETemplateProps> = ({
    data,
    format = "A4",
    copieType = "SOCIETE",
}) => {
    const isTicket = format === "TICKET";
    const hideSociete = copieType === "FOURNISSEUR";
    const hideFournisseur = copieType === "SOCIETE";

    // Formater la date
    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });

    // Calculer les totaux par ligne si non fournis
    const lignesWithTotals = data.lignes.map(ligne => ({
        ...ligne,
        totalHT: ligne.totalHT || (ligne.quantite * ligne.prixUnitaireHT),
        totalTTC: ligne.totalTTC || (ligne.quantite * ligne.prixUnitaireHT * (1 + (ligne.tva || 19) / 100))
    }));

    // Version ticket
    const TicketContent = () => (
        <div className="ticket-print">
            <style>{ticketStyles}</style>

            {/* En-tête */}
            <div className="header">
                <img src="/chiha.jpeg" alt="Logo" className="logo-img" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                <div className="invoice-title">BON D'ENTREE</div>
                <div className="invoice-number">N°: {data.numero}</div>
                <div className="date-block">{formattedDate}</div>
                {data.type && <div>Type: {data.type}</div>}
                {data.referenceDoc && <div>Réf: {data.referenceDoc}</div>}
            </div>

            {/* Informations fournisseur */}
            <div className="parties-container">
                {!hideSociete && (
                    <div>
                        <div className="party-title">SOCIETE:</div>
                        <div className="party-details">
                            {DEFAULT_COMPANY.name}<br />
                            {DEFAULT_COMPANY.address}
                        </div>
                    </div>
                )}
                {!hideFournisseur && data.fournisseur && (
                    <div style={{ marginTop: "5px" }}>
                        <div className="party-title">FOURNISSEUR:</div>
                        <div className="party-details">
                            <strong>{data.fournisseur.nom}</strong>
                            {data.fournisseur.telephone && <><br />Tel: {data.fournisseur.telephone}</>}
                        </div>
                    </div>
                )}
            </div>

            <hr />

            {/* Tableau des produits */}
            <table>
                <thead>
                    <tr>
                        <th>Article</th>
                        <th className="text-center">Qté</th>
                        <th className="text-right">PU HT</th>
                    </tr>
                </thead>
                <tbody>
                    {lignesWithTotals.map((ligne, idx) => {
                        const designation = ligne.product?.designation || "-";
                        const shortDesignation = designation.length > 25 ? designation.substring(0, 23) + ".." : designation;
                        return (
                            <tr key={idx}>
                                <td style={{ wordBreak: "break-word" }}>{shortDesignation}</td>
                                <td className="text-center">{ligne.quantite}</td>
                                <td className="text-right">{ligne.prixUnitaireHT.toFixed(3)}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totaux */}
            <div className="totals-container">
                <div className="total-row">
                    <span>TOTAL HT:</span>
                    <span>{formatCurrency(data.totalHT)}</span>
                </div>
                <div className="total-row">
                    <span>TVA:</span>
                    <span>{formatCurrency(data.totalTVA)}</span>
                </div>
                <div className="total-row final">
                    <span>TOTAL TTC:</span>
                    <span className="font-bold">{formatCurrency(data.totalTTC)}</span>
                </div>
            </div>

            {/* Signatures */}
            <div className="signatures">
                <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-label">Fournisseur</div>
                </div>
                <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-label">Société</div>
                </div>
            </div>
        </div>
    );

    // Version A4
    const A4Content = () => (
        <div className="invoice-aysud">
            <style>{a4Styles}</style>

            {/* En-tête */}
            <div className="header">
                <div className="logo-container">
                    <img src="/chiha.jpeg" alt="Logo" className="logo-img" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                </div>
                <div className="title-container">
                    <div className="invoice-title">BON D'ENTREE</div>
                    <div className="invoice-number">N° : {data.numero}</div>
                </div>
                <div className="date-block">
                    <span className="date-label">DATE :</span> {formattedDate}
                </div>
            </div>

            {/* Informations fournisseur et société */}
            <div className="parties-container">
                {!hideSociete && (
                    <div className="emitter">
                        <div className="party-title">SOCIETE :</div>
                        <div className="party-details">
                            <strong>{DEFAULT_COMPANY.name}</strong><br />
                            {DEFAULT_COMPANY.address}<br />
                            Tél: {DEFAULT_COMPANY.phone}<br />
                            T.V.A.: {DEFAULT_COMPANY.vat}
                        </div>
                    </div>
                )}

                {!hideFournisseur && data.fournisseur && (
                    <div className="receiver">
                        <div className="party-title">FOURNISSEUR :</div>
                        <div className="party-details">
                            <strong>{data.fournisseur.nom}</strong><br />
                            {data.fournisseur.adresse && <>{data.fournisseur.adresse}<br /></>}
                            {data.fournisseur.telephone && <>Tél: {data.fournisseur.telephone}<br /></>}
                        </div>
                    </div>
                )}
            </div>

            {/* Informations complémentaires */}
            <hr />
            <div style={{ marginBottom: "15px", fontSize: "11px" }}>
                <strong>Type de document:</strong> {data.type || "AUCUN"}<br />
                {data.referenceDoc && <><strong>Référence document:</strong> {data.referenceDoc}<br /></>}
                {data.description && <><strong>Description:</strong> {data.description}<br /></>}
            </div>

            {/* Tableau des produits */}
            <table>
                <thead>
                    <tr>
                        <th>Désignation</th>
                        <th className="text-center">Qté</th>
                        <th className="text-right">P.U HT</th>
                        <th className="text-right">TVA</th>
                        <th className="text-right">Total HT</th>
                        <th className="text-right">Total TTC</th>
                    </tr>
                </thead>
                <tbody>
                    {lignesWithTotals.map((ligne, idx) => (
                        <tr key={idx}>
                            <td>
                                {ligne.product?.designation || "-"}
                                {ligne.product?.reference && (
                                    <div style={{ fontSize: "10px", color: "#666" }}>
                                        Réf: {ligne.product.reference}
                                    </div>
                                )}
                            </td>
                            <td className="text-center">{ligne.quantite}</td>
                            <td className="text-right">{ligne.prixUnitaireHT.toFixed(3)}</td>
                            <td className="text-right">{ligne.tva || 19}%</td>
                            <td className="text-right">{formatCurrency(ligne.totalHT)}</td>
                            <td className="text-right">{formatCurrency(ligne.totalTTC)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Totaux */}
            <div className="totals-container">
                <div className="totals-table">
                    <div className="total-row">
                        <span>TOTAL HT :</span>
                        <span>{formatCurrency(data.totalHT)}</span>
                    </div>
                    <div className="total-row">
                        <span>TVA :</span>
                        <span>{formatCurrency(data.totalTVA)}</span>
                    </div>
                    {/* Afficher le timbre si data.type == "FAC" */}
                    {data.type === "FAC" && (
                        <div className="total-row text-blue-600 border-b border-dashed border-blue-200">
                            <span>Timbre fiscal :</span>
                            <span>{formatCurrency(1)}</span>
                        </div>
                    )}
                    <div className="total-row final border-t-2 border-primary pt-2 mt-1">
                        <span className="font-bold text-lg">TOTAL TTC :</span>
                        <span className="font-bold text-lg">{formatCurrency(data.totalTTC)}</span>
                    </div>
                </div>
            </div>

            {/* Signatures */}
            <div className="signatures">
                <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-label">Le Fournisseur</div>
                </div>
                <div className="signature-block">
                    <div className="signature-line"></div>
                    <div className="signature-label">La Société</div>
                </div>
            </div>
        </div>
    );

    return isTicket ? <TicketContent /> : <A4Content />;
};