"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatCurrency } from "@/lib/types";
import { ArrowLeft, ArrowLeftRight, Printer, Package, Building2, Calendar, Hash, FileText, AlertCircle, List } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  category?: { nom: string };
}

interface TransfertItem {
  id: string;
  numero: string;
  date: string;
  quantite: number;
  motif: string | null;
  statut: string;
  product: Product;
  sourceHome: { id: string; nom: string; description?: string };
  destinationHome: { id: string; nom: string; description?: string };
}

interface GroupedTransfert {
  lotNumero: string;
  date: string;
  sourceHome: { id: string; nom: string; description?: string };
  destinationHome: { id: string; nom: string; description?: string };
  motif: string | null;
  statut: string;
  transferts: TransfertItem[];
  totalQuantite: number;
  totalValeur: number;
  validePar?: string;
  dateValidation?: string;
}

export default function TransfertDetailPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [transfert, setTransfert] = useState<GroupedTransfert | null>(null);
  const [loading, setLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const transfertId = params.id as string;

  useEffect(() => {
    if (transfertId) {
      fetchTransfert();
    }
  }, [transfertId]);

  const fetchTransfert = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/transferts/${transfertId}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      const data = await response.json();
      
      // Grouper les transferts par lot
      if (data.lotNumero || (data.transferts && data.transferts.length > 0)) {
        setTransfert(data);
      } else {
        // Format simple (un seul produit)
        setTransfert({
          lotNumero: data.numero,
          date: data.date,
          sourceHome: data.sourceHome,
          destinationHome: data.destinationHome,
          motif: data.motif,
          statut: data.statut,
          transferts: [data],
          totalQuantite: data.quantite,
          totalValeur: data.quantite * (data.product?.prixVente || 0),
          validePar: data.validePar,
          dateValidation: data.dateValidation,
        });
      }
    } catch (error) {
      console.error('Error fetching transfert:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails du transfert",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!transfert) return;

    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression. Vérifiez que les pop-ups ne sont pas bloqués.",
        variant: "destructive",
      });
      return;
    }

    const statutClass = transfert.statut === 'VALIDE' ? 'status-valide' : 
                        transfert.statut === 'ANNULE' ? 'status-annule' : 'status-attente';
    const statutText = transfert.statut === 'VALIDE' ? 'Validé' : 
                       transfert.statut === 'ANNULE' ? 'Annulé' : 'En attente';

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transfert #${transfert.lotNumero}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', Courier, monospace; padding: 20px; background: white; }
        .print-container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #000; }
        .company-name { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
        .company-details { font-size: 10px; margin-top: 5px; }
        .title { font-size: 22px; font-weight: 900; margin: 15px 0 5px; }
        .subtitle { font-size: 12px; }
        .info-card { margin: 20px 0; padding: 15px; border: 2px solid #000; }
        .info-row { display: flex; margin-bottom: 10px; font-size: 12px; }
        .info-label { width: 140px; font-weight: 900; }
        .info-value { flex: 1; }
        .section-title { font-size: 16px; font-weight: 900; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #000; }
        .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .details-table th, .details-table td { padding: 10px; text-align: left; border: 1px solid #000; }
        .details-table th { background-color: #f0f0f0; font-weight: 900; }
        .text-right { text-align: right; }
        .transfer-path { display: flex; align-items: center; justify-content: center; gap: 20px; margin: 20px 0; padding: 15px; background: #f5f5f5; }
        .transfer-path-item { text-align: center; }
        .transfer-path-label { font-size: 10px; color: #666; }
        .transfer-path-name { font-size: 14px; font-weight: 900; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 900; }
        .status-valide { background-color: #d4edda; color: #155724; border: 1px solid #155724; }
        .status-annule { background-color: #f8d7da; color: #721c24; border: 1px solid #721c24; }
        .status-attente { background-color: #fff3cd; color: #856404; border: 1px solid #856404; }
        .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; font-weight: 900; font-size: 14px; }
        .footer { margin-top: 40px; padding-top: 20px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-block { text-align: center; width: 40%; }
        .signature-line { border-top: 1px solid #000; margin-bottom: 8px; padding-top: 25px; }
        @media print { body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <div class="company-name">CHIHA GSM</div>
          <div class="company-details">RTE ELAIN KM3, SFAX | Tél: 24 807 784 | MF: 1677720 S/A/C/000</div>
          <div class="title">BON DE TRANSFERT DE STOCK</div>
          <div class="subtitle">Document de suivi des mouvements entre emplacements</div>
        </div>

        <div class="info-card">
          <div class="info-row"><div class="info-label">N° TRANSFERT</div><div class="info-value">${transfert.lotNumero}</div></div>
          <div class="info-row"><div class="info-label">DATE</div><div class="info-value">${formatDate(new Date(transfert.date))}</div></div>
          <div class="info-row"><div class="info-label">STATUT</div><div class="info-value"><span class="status-badge ${statutClass}">${statutText}</span></div></div>
          ${transfert.motif ? `<div class="info-row"><div class="info-label">MOTIF</div><div class="info-value">${transfert.motif}</div></div>` : ''}
          ${transfert.validePar ? `<div class="info-row"><div class="info-label">VALIDÉ PAR</div><div class="info-value">${transfert.validePar}</div></div>` : ''}
        </div>

        <div class="section-title">PARCOURS DU TRANSFERT</div>
        <div class="transfer-path">
          <div class="transfer-path-item"><div class="transfer-path-label">EMETTEUR</div><div class="transfer-path-name">${transfert.sourceHome?.nom}</div></div>
          <div style="font-size: 20px;">→</div>
          <div class="transfer-path-item"><div class="transfer-path-label">DESTINATAIRE</div><div class="transfer-path-name">${transfert.destinationHome?.nom}</div></div>
        </div>

        <div class="section-title">PRODUITS TRANSFÉRÉS (${transfert.transferts.length} produit(s))</div>
        <table class="details-table">
          <thead><tr><th>Réf.</th><th>Désignation</th><th class="text-right">Qté</th><th class="text-right">P.U</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            ${transfert.transferts.map(t => `
              <tr>
                <td>${t.product?.reference || '-'}</td>
                <td>${t.product?.designation || '-'}</td>
                <td class="text-right">${t.quantite}</td>
                <td class="text-right">${formatCurrency(t.product?.prixVente || 0)}</td>
                <td class="text-right">${formatCurrency(t.quantite * (t.product?.prixVente || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-row">
          <span>TOTAL GÉNÉRAL</span>
          <span>${formatCurrency(transfert.totalValeur)}</span>
        </div>

        <div class="signatures">
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">L'ÉMETTEUR</div></div>
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">LE DESTINATAIRE</div></div>
        </div>

        <div class="footer">Document généré automatiquement - CHIHA GSM</div>
      </div>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const getStatutBadge = (statut: string) => {
    switch (statut) {
      case 'VALIDE':
        return <Badge className="bg-green-600 hover:bg-green-700">Validé</Badge>;
      case 'EN_ATTENTE':
        return <Badge variant="secondary">En attente</Badge>;
      case 'ANNULE':
        return <Badge variant="destructive">Annulé</Badge>;
      default:
        return <Badge variant="outline">{statut}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détail du Transfert" subtitle="Consultation d'un transfert de stock" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span>Chargement...</span>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  if (!transfert) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détail du Transfert" subtitle="Consultation d'un transfert de stock" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-red-600">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold mb-2">Transfert non trouvé</h2>
                  <p>Le transfert que vous recherchez n'existe pas ou a été supprimé.</p>
                  <Button className="mt-4" onClick={() => router.push('/transferts')}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Retour à la liste
                  </Button>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title={`Transfert #${transfert.lotNumero}`} subtitle="Consultation d'un transfert de stock" />
        <main className="p-4 md:p-6">
          <div className="mb-6 flex justify-between items-center flex-wrap gap-2">
            <Link href="/transferts">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
            <Button variant="outline" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" />
              Imprimer
            </Button>
          </div>

          <div className="space-y-6">
            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Hash className="h-5 w-5" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Numéro de transfert</p>
                      <p className="font-mono text-lg font-bold">{transfert.lotNumero}</p>
                    </div>
                    {/* <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(new Date(transfert.date))}</span>
                      </div>
                    </div> */}
                    {/* {transfert.motif && (
                      <div>
                        <p className="text-sm text-muted-foreground">Motif</p>
                        <div className="flex items-start gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                          <span>{transfert.motif}</span>
                        </div>
                      </div>
                    )} */}
                  </div>
                  <div className="space-y-3">
                    {/* <div>
                      <p className="text-sm text-muted-foreground">Statut</p>
                      <div>{getStatutBadge(transfert.statut)}</div>
                    </div> */}
                    {/* {transfert.validePar && (
                      <div>
                        <p className="text-sm text-muted-foreground">Validé par</p>
                        <p>{transfert.validePar}</p>
                      </div>
                    )} */}
                    {transfert.dateValidation && (
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p>{formatDate(new Date(transfert.date))}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Parcours du transfert */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowLeftRight className="h-5 w-5" />
                  Parcours du transfert
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between gap-4 p-6 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg flex-wrap">
                  <div className="flex-1 text-center min-w-[150px]">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600" />
                      <span className="text-sm font-medium text-muted-foreground">ÉMETTEUR</span>
                    </div>
                    <p className="font-bold text-lg">{transfert.sourceHome?.nom}</p>
                    {transfert.sourceHome?.description && (
                      <p className="text-sm text-muted-foreground">{transfert.sourceHome.description}</p>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <ArrowLeftRight className="h-8 w-8 text-primary" />
                  </div>
                  <div className="flex-1 text-center min-w-[150px]">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-green-600" />
                      <span className="text-sm font-medium text-muted-foreground">DESTINATAIRE</span>
                    </div>
                    <p className="font-bold text-lg">{transfert.destinationHome?.nom}</p>
                    {transfert.destinationHome?.description && (
                      <p className="text-sm text-muted-foreground">{transfert.destinationHome.description}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des produits transférés */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <List className="h-5 w-5" />
                  Produits transférés ({transfert.transferts.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-semibold">Référence</th>
                        <th className="text-left p-3 font-semibold">Désignation</th>
                        <th className="text-right p-3 font-semibold">Quantité</th>
                        {/* <th className="text-right p-3 font-semibold">Prix unitaire</th>
                        <th className="text-right p-3 font-semibold">Total</th> */}
                      </tr>
                    </thead>
                    <tbody>
                      {transfert.transferts.map((t, idx) => (
                        <tr key={t.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-muted/20'}>
                          <td className="p-3 font-mono text-sm">{t.product?.reference || '-'}</td>
                          <td className="p-3">{t.product?.designation || '-'}</td>
                          <td className="p-3 text-right font-bold">{t.quantite} unité(s)</td>
                          {/* <td className="p-3 text-right">{formatCurrency(t.product?.prixVente || 0)}</td>
                          <td className="p-3 text-right font-bold">{formatCurrency(t.quantite * (t.product?.prixVente || 0))}</td> */}
                        </tr>
                      ))}
                    </tbody>
                    {/* <tfoot className="bg-muted/50 border-t-2">
                      <tr>
                        <td colSpan={4} className="p-3 text-right font-bold text-base">
                          TOTAL GÉNÉRAL :
                        </td>
                        <td className="p-3 text-right font-bold text-base">
                          {formatCurrency(transfert.totalValeur)}
                        </td>
                      </tr>
                    </tfoot> */}
                  </table>
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                  <span className="font-medium">Quantité totale transférée :</span>
                  <Badge variant="outline" className="bg-blue-100 text-blue-800 px-3 py-1">
                    {transfert.totalQuantite} unités
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}