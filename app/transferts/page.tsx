"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/types";
import { Plus, ArrowLeftRight, Truck, Loader2, Printer, Eye, Package, ChevronDown, ChevronUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
}

interface TransfertItem {
  id: string;
  numero: string;
  date: string;
  quantite: number;
  motif: string;
  statut: string;
  product: Product;
  sourceHome: { id: string; nom: string };
  destinationHome: { id: string; nom: string };
}

interface GroupedTransfert {
  id: string;
  lotNumero: string;
  date: string;
  sourceHome: { id: string; nom: string };
  destinationHome: { id: string; nom: string };
  motif: string;
  statut: string;
  transferts: TransfertItem[];
  totalQuantite: number;
  products: { product: Product; quantite: number }[];
}

export default function TransfertsPage() {
  const { sidebarClasses } = useSidebar();
  const { data: session } = useSession();

  const [transferts, setTransferts] = useState<GroupedTransfert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { toast } = useToast();
  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchTransferts();
  }, []);

  const fetchTransferts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/transferts?limit=10000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setTransferts(data.data || []);
    } catch (error) {
      console.error("Error fetching transferts:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les transferts",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (lotNumero: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(lotNumero)) {
      newExpanded.delete(lotNumero);
    } else {
      newExpanded.add(lotNumero);
    }
    setExpandedRows(newExpanded);
  };

  const handlePrintLot = (transfert: GroupedTransfert) => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');

    if (!printWindow) {
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir la fenêtre d'impression.",
        variant: "destructive",
      });
      return;
    }

    const totalGeneral = transfert.transferts.reduce((sum, t) => sum + (t.quantite * (t.product?.prixVente || 0)), 0);

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Transfert groupé #${transfert.lotNumero}</title>
      <meta charset="UTF-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Courier New', monospace; padding: 20px; background: white; }
        .print-container { max-width: 800px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #000; }
        .company-name { font-size: 18px; font-weight: 900; letter-spacing: 2px; }
        .title { font-size: 22px; font-weight: 900; margin: 15px 0 5px; }
        .info-card { margin: 20px 0; padding: 15px; border: 2px solid #000; }
        .info-row { display: flex; margin-bottom: 10px; font-size: 12px; }
        .info-label { width: 140px; font-weight: 900; }
        .info-value { flex: 1; }
        .section-title { font-size: 16px; font-weight: 900; margin: 20px 0 10px; padding-bottom: 5px; border-bottom: 2px solid #000; }
        .details-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .details-table th, .details-table td { padding: 10px; text-align: left; border: 1px solid #000; }
        .details-table th { background-color: #f0f0f0; font-weight: 900; }
        .text-right { text-align: right; }
        .total-row { display: flex; justify-content: space-between; margin-top: 15px; padding-top: 10px; border-top: 2px solid #000; font-weight: 900; font-size: 14px; }
        .footer { margin-top: 40px; padding-top: 20px; text-align: center; font-size: 10px; border-top: 1px solid #ccc; }
        .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-block { text-align: center; width: 40%; }
        .signature-line { border-top: 1px solid #000; margin-bottom: 8px; padding-top: 25px; }
        @media print { body { padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="print-container">
        <div class="header">
          <div class="company-name">KALLEL TECH COMPANY</div>
          <div class="title">BON DE TRANSFERT GROUPÉ</div>
        </div>

        <div class="info-card">
          <div class="info-row"><div class="info-label">N° TRANSFERT</div><div class="info-value">${transfert.lotNumero}</div></div>
          <div class="info-row"><div class="info-label">DATE</div><div class="info-value">${formatDate(new Date(transfert.date))}</div></div>
          <div class="info-row"><div class="info-label">MOTIF</div><div class="info-value">${transfert.motif || 'Transfert de stock'}</div></div>
          <div class="info-row"><div class="info-label">EMETTEUR</div><div class="info-value">${transfert.sourceHome?.nom}</div></div>
          <div class="info-row"><div class="info-label">DESTINATAIRE</div><div class="info-value">${transfert.destinationHome?.nom}</div></div>
        </div>

        <div class="section-title">PRODUITS TRANSFÉRÉS</div>
        <table class="details-table">
          <thead><tr><th>Réf.</th><th>Désignation</th><th class="text-right">Qté</th><th class="text-right">P.U</th><th class="text-right">Total</th></tr></thead>
          <tbody>
            ${transfert.transferts.map(t => `
              <tr>
                <td>${t.product?.reference || '-'}</td>
                <td>${t.product?.designation || '-'}</td>
                <td class="text-right">${t.quantite}</td>
                <td class="text-right">${formatCurrency(t.product?.prixVente || 0)}</td>
                <td class="text-right">${formatCurrency((t.quantite) * (t.product?.prixVente || 0))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total-row">
          <span>TOTAL GÉNÉRAL</span>
          <span>${formatCurrency(totalGeneral)}</span>
        </div>

        <div class="signatures">
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">L'ÉMETTEUR</div></div>
          <div class="signature-block"><div class="signature-line"></div><div class="signature-label">LE DESTINATAIRE</div></div>
        </div>

        <div class="footer">Document généré automatiquement - KALLEL TECH COMPANY</div>
      </div>
    </body>
    </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const columns = [
    {
      key: "expand" as const,
      header: "",
      render: (item: GroupedTransfert) => (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => toggleExpand(item.lotNumero)}
        >
          {expandedRows.has(item.lotNumero) ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
      ),
    },
    {
      key: "lotNumero" as const,
      header: "N° Transfert",
      render: (item: GroupedTransfert) => (
        <div>
          <p className="font-mono text-sm font-medium">{item.lotNumero}</p>
          <p className="text-xs text-muted-foreground">{formatDate(new Date(item.date))}</p>
        </div>
      ),
    },
    {
      key: "transfert",
      header: "Transfert",
      render: (item: GroupedTransfert) => (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50">{item.sourceHome?.nom}</Badge>
          <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
          <Badge variant="outline" className="bg-green-50">{item.destinationHome?.nom}</Badge>
        </div>
      ),
    },
    {
      key: "products",
      header: "Produits",
      render: (item: GroupedTransfert) => (
        <div>
          <p className="font-medium">{item.transferts.length} produit(s)</p>
          <p className="text-xs text-muted-foreground">
            {item.transferts.slice(0, 2).map(t => t.product?.designation).join(', ')}
            {item.transferts.length > 2 && ` +${item.transferts.length - 2}`}
          </p>
        </div>
      ),
    },
    {
      key: "totalQuantite",
      header: "Quantité totale",
      render: (item: GroupedTransfert) => (
        <Badge variant="outline">{item.totalQuantite} unités</Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: GroupedTransfert) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/transferts/${item.lotNumero}`)}
            title="Voir les détails du transfert"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePrintLot(item)}
            title="Imprimer le transfert groupé"
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Transferts" subtitle="Gestion des transferts entre emplacements" />
          <main className="p-4 md:p-6">
            <Card><CardContent className="p-8"><div className="flex justify-center items-center gap-2"><Loader2 className="h-6 w-6 animate-spin text-primary" /><span>Chargement...</span></div></CardContent></Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Transferts" subtitle="Gestion des transferts entre emplacements" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Truck className="h-5 w-5 text-primary" />Historique des Transferts</CardTitle>
              {isAdmin && (
                <Button onClick={() => router.push('/transferts/creer')}><Plus className="mr-2 h-4 w-4" />Nouveau transfert</Button>
              )}
            </CardHeader>
            <CardContent>
              <DataTable data={transferts} columns={columns} searchPlaceholder="Rechercher un transfert..." searchKey="lotNumero" />

              {/* Détails expansibles */}
              {expandedRows.size > 0 && transferts.map(transfert => expandedRows.has(transfert.lotNumero) && (
                <div key={`detail-${transfert.lotNumero}`} className="mt-4 p-4 bg-muted/30 rounded-lg border">
                  <h4 className="font-semibold mb-3">Détail des produits transférés</h4>
                  <table className="w-full text-sm">
                    <thead className="border-b">
                      <tr><th className="text-left py-2">Produit</th><th className="text-center py-2">Quantité</th><th className="text-right py-2">Prix unitaire</th><th className="text-right py-2">Total</th></tr>
                    </thead>
                    <tbody>
                      {transfert.transferts.map(t => (
                        <tr key={t.id} className="border-b">
                          <td className="py-2">{t.product?.designation} <span className="text-xs text-muted-foreground">({t.product?.reference})</span></td>
                          <td className="text-center py-2">{t.quantite}</td>
                          <td className="text-right py-2">{formatCurrency(t.product?.prixVente || 0)}</td>
                          <td className="text-right py-2 font-medium">{formatCurrency(t.quantite * (t.product?.prixVente || 0))}</td>
                        </tr>
                      ))}
                      <tr className="bg-muted/50 font-bold">
                        <td colSpan={3} className="py-2 text-right">TOTAL :</td>
                        <td className="text-right py-2">{formatCurrency(transfert.transferts.reduce((sum, t) => sum + (t.quantite * (t.product?.prixVente || 0)), 0))}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}