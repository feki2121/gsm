import React from "react";
import { BLPrintData, PrintFormat } from "@/types/print";
import { PrintFooter } from "../PrintFooter";
import { formatCurrency } from "@/lib/types";

interface BLTemplateProps {
    data: BLPrintData;
    format?: PrintFormat;
    copieType?: 'SOCIETE' | 'CLIENT';
}

const DEFAULT_COMPANY = {
    name: "CHIHA GSM",
    address: "RTE ELAIN KM3, SFAX",
    phone: "24 807 784",
    vat: "1677720 S/A/C/000",
};

// Styles pour l'impression ticket (texte en gras)
const ticketGlobalStyles = `
    .ticket-print {
        font-family: 'Courier New', monospace;
        font-weight: bold !important;
        width: 100%;
        max-width: 300px;
        margin: 0 auto;
        padding: 10px;
    }
    .ticket-print * {
        font-weight: bold !important;
    }
    .ticket-print .header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }
    .ticket-print .logo-cell {
        width: 60px;
    }
    .ticket-print .title-cell {
        text-align: center;
    }
    .ticket-print .invoice-title {
        font-size: 12px;
        font-weight: bold;
        letter-spacing: 1px;
    }
    .ticket-print .invoice-number {
        font-size: 10px;
        font-weight: bold;
    }
    .ticket-print .invoice-date {
        font-size: 10px;
        font-weight: 900 !important;
        margin-top: 2px;
        color: #333;
    }
    .ticket-print .date-cell {
        width: 60px;
        text-align: right;
    }
    .ticket-print .date-block {
        font-size: 8px;
        font-weight: bold;
    }
    .ticket-print .parties-container {
        margin: 10px 0;
        font-size: 8px;
    }
    .ticket-print .party-title {
        font-weight: bold;
        font-size: 9px;
        margin-bottom: 3px;
    }
    .ticket-print .party-details {
    font-weight: bold;
        font-size: 8px;
        line-height: 1.3;
    }
    .ticket-print hr {
    font-weight: bold;
        margin: 8px 0;
        border: none;
        border-top: 1px dashed #000;
    }
    .ticket-print table {
        width: 100%;
        font-size: 8px;
        border-collapse: collapse;
    }
    .ticket-print th {
        font-weight: bold;
        text-align: left;
        padding: 4px 2px;
        border-bottom: 1px solid #000;
    }
    .ticket-print td {
    font-weight: bold;
        padding: 4px 2px;
        vertical-align: top;
    }
    .ticket-print .text-center {
        text-align: center;
    }
    .ticket-print .text-right {
        text-align: right;
    }
    .ticket-print .product-designation {
        word-wrap: break-word;
        white-space: normal;
        word-break: break-word;
        max-width: 120px;
        font-weight: bold;
    }
    .ticket-print .totals-container {
        margin-top: 10px;
        border-top: 1px dashed #000;
        padding-top: 8px;
        font-weight: bold;
    }
    .ticket-print .total-row {
        display: flex;
        justify-content: space-between;
        font-size: 9px;
        margin: 3px 0;
        font-weight: bold;
    }
    .ticket-print .total-row.final {
        font-size: 10px;
        margin-top: 5px;
        padding-top: 3px;
        border-top: 1px solid #000;
        font-weight: bold;
    }
    .ticket-print .signatures {
        margin-top: 15px;
        display: flex;
        justify-content: space-between;
        font-weight: bold;
    }
    .ticket-print .signature-block {
        text-align: center;
        width: 45%;
        font-weight: bold;
    }
    .ticket-print .signature-line {
        border-top: 1px solid #000;
        margin-bottom: 5px;
        padding-top: 15px;
        font-weight: bold;
    }
    .ticket-print .signature-label {
        font-size: 7px;
        font-weight: bold;
        font-weight: bold;
    }
    @media print {
        .ticket-print {
            margin: 0;
            padding: 5px;
        }
        .ticket-print .product-designation {
            word-wrap: break-word;
            white-space: normal;
        }
    }
`;

export const BLTemplate: React.FC<BLTemplateProps> = ({
    data,
    format = "A4",
    copieType = "SOCIETE",
}) => {
    const isTicket = format === "TICKET";

    const formattedDate = new Date(data.date).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    }).replace(/\//g, ' / ');

    const hideSociete = copieType === "CLIENT";


    const showCodeColumn = data.lignes.some(
        (ligne) => ligne.product?.category?.nom === "TELEPHONE"
    );
    const TicketContent = () => (
        <div className="ticket-print">
            <style>{ticketGlobalStyles}</style>

            {/* En-tête */}
            <div className="header">
                <div className="header-row">
                    <div className="logo-cell">
                        <img
                            src="/chiha.jpeg"
                            alt="Logo"
                            className="logo-img"
                            onError={(e) => (e.target as HTMLImageElement).style.display = 'none'}
                            style={{
                                width: "100px",
                                height: "100px",
                            }}
                        />
                    </div>
                    <div className="title-cell">
                        <div className="invoice-title">BON LIVRAISON</div>
                        <div className="invoice-number">{data.numero}</div>
                        <div className="invoice-date">{formattedDate}</div>
                    </div>
                    <div className="date-cell">
                    </div>
                </div>
            </div>

            {/* Section Émetteur / Destinataire */}
            <div className="parties-container">
                <div className="emitter">
                    <div className="party-title" style={{ fontSize: 15 }}>EMETTEUR:</div>
                    <div className="party-details" style={{ fontSize: 13 }}>
                        {DEFAULT_COMPANY.name}<br />
                        MF: {DEFAULT_COMPANY.vat}<br />
                        {DEFAULT_COMPANY.address}<br />
                        Tel: {DEFAULT_COMPANY.phone}
                    </div>
                </div>

                <div className="receiver" style={{ marginTop: "8px" }}>
                    <div className="party-title" style={{ fontSize: 15 }}>DESTINATAIRE:</div>
                    <div className="party-details" style={{ fontSize: 13 }}>
                        <strong>{data.client?.nom || "N/A"}</strong>
                        {data.client?.mf && <><br />MF: {data.client.mf}</>}
                        {data.client?.cin && <><br />CIN: {data.client.cin}</>}
                        {data.client?.telephone && <><br />Tel: {data.client.telephone}</>}
                        {data.client?.addresses && data.client.addresses.length > 0 && (
                            <>
                                <br />
                                Adresse :{data.client.addresses[0]?.adresse}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <hr />

            {/* Tableau des produits - avec support des désignations longues */}
            <table>
                <thead>
                    <tr>
                        <th style={{ width: '50%', fontSize: 13, fontWeight: '900 !important' }}>ARTICLE</th>
                        {showCodeColumn && <th style={{ width: '15%', fontSize: 13, fontWeight: '900 !important' }}>CODE</th>}
                        <th style={{ width: '15%', fontSize: 13, fontWeight: '900 !important' }} className="text-center">QTE</th>
                        <th style={{ width: '17%', fontSize: 13, fontWeight: '900 !important' }} className="text-right">PU</th>
                        <th style={{ width: '18%', fontSize: 13, fontWeight: '900 !important' }} className="text-right">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    {data.lignes.map((ligne, idx) => {
                        const designation = ligne.product?.designation || "-";

                        return (
                            <tr key={idx}>
                                <td className="product-designation" style={{ wordWrap: 'break-word', whiteSpace: 'normal', wordBreak: 'break-word', fontSize: 13 }}>
                                    {designation}
                                </td>
                                {showCodeColumn && (
                                    <td style={{ fontSize: 13 }}>
                                        {ligne.product?.category?.nom === "TELEPHONE" ? ligne.product?.code || "-" : ""}
                                    </td>
                                )}
                                <td className="text-center" style={{ fontSize: 13 }}>{ligne.quantite}</td>
                                <td className="text-right" style={{ fontSize: 13 }}>
                                    {ligne.prixUnitaire?.toFixed(3) || "0.000"}
                                </td>
                                <td className="text-right" style={{ fontSize: 13 }}>
                                    {ligne.totalLigne?.toFixed(3) || (ligne.quantite * (ligne.prixUnitaire || 0)).toFixed(3)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Totaux */}
            <div className="totals-container">
                <div className="total-row">
                    <span style={{ fontSize: 15 }}>TOTAL HT:</span>
                    <span style={{ fontSize: 15 }}>{formatCurrency(data.totalHT)}</span>
                </div>

                <div className="total-row">
                    <span style={{ fontSize: 15 }}>TOTAL TVA:</span>
                    <span style={{ fontSize: 15 }}>{formatCurrency(data.totalTVA)}</span>
                </div>

                {typeof data.remise === 'number' && data.remise > 0 && (
                    <div className="total-row">
                        <span style={{ fontSize: 15 }}>Remise ({data.remise}):</span>
                        <span style={{ fontSize: 15 }}>-{formatCurrency(data.remise)}</span>
                    </div>
                )}

                <div className="total-row final">
                    <span style={{ fontSize: 15 }}>TOTAL TTC:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '15px' }}>
                        {formatCurrency(data.totalTTC)}
                    </span>
                </div>

                {(data.montantCredit !== undefined && data.montantCredit > 0) && (
                    <div className="total-row">
                        <span style={{ fontSize: 15 }}>Crédit BL:</span>
                        <span style={{ fontSize: 15 }}>
                            {formatCurrency(data.montantCredit)}
                        </span>
                    </div>
                )}

                {(data.resteCredit !== undefined && data.resteCredit > 0) && (
                    <div className="total-row">
                        <span style={{ fontSize: 15 }}>Total Crédit:</span>
                        <span style={{ fontSize: 15 }}>
                            {formatCurrency(data.resteCredit)}
                        </span>
                    </div>
                )}
            </div>

            <div style={{ textAlign: 'center', fontSize: 13, fontWeight: 'bold', margin: '10px 0' }}>
                Merci pour votre confiance
            </div>

            {/* Signatures */}
            <div className="signatures">
                {hideSociete && (
                    <div className="signature-block">
                        {/* <div className="signature-line"></div> */}
                        <div className="signature-label" style={{ fontSize: 15 }}>Le client</div>
                    </div>
                )}

                {!hideSociete && (
                    <div className="signature-block">
                        {/* <div className="signature-line"></div> */}
                        <div className="signature-label" style={{ fontSize: 15 }}>Société</div>
                    </div>
                )}
            </div>
        </div>
    );

    // Version A4 standard (garde le style normal)
    const A4Content = () => (
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
                    <div className="invoice-title">BON DE LIVRAISON</div>
                    <div className="invoice-number">N° : {data.numero}</div>
                </div>
                <div className="date-block">
                    <span className="date-label">DATE :</span> {formattedDate}
                </div>
            </div>

            {/* Section Émetteur / Destinataire */}
            <div className="parties-container">
                {!hideSociete && (
                    <div className="emitter">
                        <div className="party-title">ÉMETTEUR :</div>
                        <div className="party-details">
                            <strong>{DEFAULT_COMPANY.name}</strong><br />
                            {DEFAULT_COMPANY.address}<br />
                            Tél: {DEFAULT_COMPANY.phone}<br />
                            T.V.A.: {DEFAULT_COMPANY.vat}
                        </div>
                    </div>
                )}

                <div className="receiver">
                    <div className="party-title">DESTINATAIRE :</div>
                    <div className="party-details">
                        <strong>{data.client?.nom || "N/A"}</strong>
                        {data.client?.mf && <><br />MF: {data.client.mf}</>}
                        {data.client?.cin && <><br />CIN: {data.client.cin}</>}
                        {data.client?.adresse && <><br />{data.client.adresse}</>}
                        {data.client?.addresses && data.client.addresses.length > 0 && (
                            <>
                                <br />
                                {data.client.addresses[0]?.adresse}
                            </>
                        )}
                        {data.client?.telephone && <><br />Tél: {data.client.telephone}</>}
                    </div>
                </div>
            </div>

            <hr />

            <table>
                <thead>
                    <tr>
                        <th>Désignation</th>
                        {showCodeColumn && <th>Code</th>}
                        <th className="text-center">Qté</th>
                        <th className="text-right">P.U</th>
                        <th className="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    {data.lignes.map((ligne, idx) => (
                        <tr key={idx}>
                            <td style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                {ligne.product?.designation || "-"}
                            </td>
                            {showCodeColumn && (
                                <td style={{ wordWrap: 'break-word', whiteSpace: 'normal' }}>
                                    {ligne.product?.category?.nom === "TELEPHONE" ? ligne.product?.code || "-" : ""}
                                </td>
                            )}
                            <td className="text-center">{ligne.quantite}</td>
                            <td className="text-right">{ligne.prixUnitaire?.toFixed(3) || "0.000"}</td>
                            <td className="text-right">
                                {(ligne.quantite * (ligne.prixUnitaire || 0)).toFixed(3)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="totals-container">
                <div className="totals-table">
                    <div className="total-row">
                        <span>Total HT :</span>
                        <span className="font-bold">{formatCurrency(data.totalHT)}</span>
                    </div>
                    <div className="total-row">
                        <span>Total TVA :</span>
                        <span className="font-bold">{formatCurrency(data.totalTVA)}</span>
                    </div>
                    {typeof data.remise === 'number' && data.remise > 0 && (
                        <div className="total-row">
                            <span>Remise ({data.remise}) :</span>
                            <span>-{formatCurrency(data.remise)}</span>
                        </div>
                    )}
                    <div className="total-row final">
                        <span>Total TTC :</span>
                        <span className="font-bold">{formatCurrency(data.totalTTC)}</span>
                    </div>
                </div>
            </div>

            <div style={{ textAlign: 'center', margin: '10px 0', fontWeight: 'bold' }}>
                Merci pour votre confiance
            </div>

            <div className="signatures">
                {hideSociete && (
                    <div className="signature-block">
                        <div className="signature-line"></div>
                        <div className="signature-label">Le client</div>
                    </div>
                )}
                {!hideSociete && (
                    <div className="signature-block">
                        <div className="signature-line"></div>
                        <div className="signature-label">Société</div>
                    </div>
                )}
            </div>
        </div>
    );

    return isTicket ? <TicketContent /> : <A4Content />;
};