"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, CheckCircle, Truck, Printer, XCircle, Link, Trash2, Edit, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogContent, AlertDialogTrigger } from "@/components/ui/alert-dialog";

// Types
interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  quantiteStock: number;
}

interface Home {
  id: string;
  nom: string;
  stockLocations?: StockLocation[];
}

interface StockLocation {
  id: string;
  productId: string;
  homeId: string;
  quantite: number;
}

interface LigneBonSortie {
  id?: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  remise: number;
  totalHT: number;
  totalTTC: number;
  stockDisponible?: number;
}

interface BonSortie {
  id: string;
  numero: string;
  date: Date;
  dateDebut: Date;
  dateFin: Date;
  destination: string;
  nomConducteur: string;
  matriculeVehicule: string;
  adresseLivraison: string;
  observation: string;
  numCIN: string;
  clientId: string | null;
  client?: Client | null;
  destinataire: string;
  motif: string;
  statut: string;
  totalHT: number;
  totalTTC: number;
  lignes: LigneBonSortie[];
}

export default function BonsSortiePage() {
  const { sidebarClasses } = useSidebar();
  const [bonsSortie, setBonsSortie] = useState<BonSortie[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedHome, setSelectedHome] = useState("");
  const [quantite, setQuantite] = useState<number>(1);
  const [stockDisponible, setStockDisponible] = useState<number>(0);


  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchBonsSortie();
    fetchClients();
    fetchProducts();
    fetchHomes();
  }, [currentPage]);

  useEffect(() => {
    if (selectedProduct && selectedHome) {
      checkStockDisponible();
    }
  }, [selectedProduct, selectedHome]);

  const fetchBonsSortie = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bons-sortie?page=${currentPage}&limit=10000`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setBonsSortie(data.data || []);
    } catch (error) {
      console.error("Error fetching bons sortie:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bons de sortie",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=10000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      setClients([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=10000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=10000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les stations",
        variant: "destructive",
      });
    }
  };

  const checkStockDisponible = async () => {
    try {
      const response = await fetch(`/api/stock-locations?productId=${selectedProduct}&homeId=${selectedHome}`);
      const data = await response.json();
      const stock = data.quantite || 0;
      setStockDisponible(stock);

      if (stock === 0) {
        toast({
          title: "Attention",
          description: "Ce produit n'est pas disponible dans cette station",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error checking stock:", error);
      setStockDisponible(0);
    }
  };

  const handlePrintBonSortie = (bonSortie: BonSortie) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
  <!DOCTYPE html>
  <html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Bon de Sortie ${bonSortie.numero}</title>

    <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        background: #f3f4f6;
        margin: 0;
        padding: 30px;
        color: #111827;
      }

      .page {
        max-width: 1000px;
        margin: auto;
        background: white;
        border-radius: 16px;
        padding: 40px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.08);
      }

      /* ================= NEW HEADER ================= */
      .top-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        border-bottom: 3px solid #111827;
        padding-bottom: 20px;
        margin-bottom: 30px;
      }

      .header-left {
        flex: 1;
      }

      .logo {
        width: 110px;
        object-fit: contain;
      }

      .header-center {
        flex: 1;
        text-align: center;
      }

      .doc-title {
        font-size: 28px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 10px;
      }

      .doc-number {
        display: inline-block;
        padding: 8px 16px;
        background: #111827;
        color: white;
        border-radius: 999px;
        font-size: 13px;
        font-weight: 700;
      }

      .header-right {
        flex: 1;
        text-align: right;
      }

      .company-name {
        font-size: 20px;
        font-weight: 800;
        color: #111827;
        margin-bottom: 5px;
      }

      .company-details {
        font-size: 12px;
        color: #6b7280;
        margin: 2px 0;
      }

      /* ================= EXISTING STYLES (UNCHANGED) ================= */

      .section {
        margin-top: 30px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
        overflow: hidden;
      }

      .section-header {
        background: #f9fafb;
        padding: 14px 20px;
        font-size: 15px;
        font-weight: 700;
        border-bottom: 1px solid #e5e7eb;
      }

      .section-content {
        padding: 20px;
      }

      .transport-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 20px;
      }

      .label {
        font-size: 11px;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .value {
        font-size: 14px;
        font-weight: 500;
        color: #111827;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 30px;
        overflow: hidden;
        border-radius: 12px;
      }

      thead {
        background: #111827;
        color: white;
      }

      th {
        padding: 14px 12px;
        font-size: 13px;
        text-align: left;
        font-weight: 600;
      }

      td {
        padding: 14px 12px;
        border-bottom: 1px solid #e5e7eb;
        font-size: 13px;
      }

      tbody tr:nth-child(even) {
        background: #f9fafb;
      }

      .text-center {
        text-align: center;
      }

      .text-right {
        text-align: right;
      }

      .signatures {
        margin-top: 70px;
        display: flex;
        justify-content: space-between;
        gap: 30px;
      }

      .signature-box {
        flex: 1;
        text-align: center;
      }

      .signature-line {
        border-top: 1px solid #111827;
        margin-top: 60px;
        padding-top: 10px;
        font-size: 12px;
        font-weight: 600;
      }

      @media print {
        body {
          background: white;
          padding: 0;
        }

        .page {
          box-shadow: none;
          border-radius: 0;
          padding: 20px;
        }
      }
    </style>
  </head>

  <body>
    <div class="page">

      <!-- ================= NEW HEADER ================= -->
      <div class="top-header">

        <!-- LEFT LOGO -->
        <div class="header-left">
          <img 
            src="ktc.png" 
            class="logo"
            onerror="this.style.display='none'"
          />
        </div>

        <!-- CENTER TITLE -->
        <div class="header-center">
          <div class="doc-title">
            BON DE SORTIE
          </div>

          <div class="doc-number">
            N° ${bonSortie.numero}
          </div>
        </div>

        <!-- RIGHT COMPANY -->
        <div class="header-right">
          <div class="company-name">
            CHIHA GSM
          </div>

          <div class="company-details">
            Vente en Gros Produits Divers
          </div>

          <div class="company-details">
            RTE ELAIN KM3, SFAX
          </div>

          <div class="company-details">
            Tél : 24 807 784
          </div>

          <div class="company-details">
            TVA : 1677720 S/A/C/000
          </div>
        </div>

      </div>

      <!-- ================= TRANSPORT (UNCHANGED) ================= -->
      <div class="section">
        <div class="section-header">
          Informations Transport
        </div>

        <div class="section-content">
          <div class="transport-grid">

            <div>
              <div class="label">Conducteur</div>
              <div class="value">
                ${bonSortie.nomConducteur || 'N/A'}
              </div>
            </div>

            <div>
              <div class="label">CIN</div>
              <div class="value">
                ${bonSortie.numCIN || 'N/A'}
              </div>
            </div>

            <div>
              <div class="label">Véhicule</div>
              <div class="value">
                ${bonSortie.matriculeVehicule || 'N/A'}
              </div>
            </div>

            <div>
              <div class="label">Date Début</div>
              <div class="value">
                ${new Date(bonSortie.dateDebut).toLocaleDateString('fr-TN')}
              </div>
            </div>

            <div>
              <div class="label">Date Fin</div>
              <div class="value">
                ${new Date(bonSortie.dateFin).toLocaleDateString('fr-TN')}
              </div>
            </div>

          </div>
        </div>
      </div>

      <!-- ================= TABLE (UNCHANGED) ================= -->
      <table>
        <thead>
          <tr>
            <th>Réf.</th>
            <th>Désignation</th>
            <th class="text-center">Qté</th>
            <th class="text-right">P.U HT</th>
            <th class="text-right">P.U TTC</th>
            <th class="text-right">Total HT</th>
          </tr>
        </thead>

        <tbody>
          ${bonSortie.lignes.map(ligne => `
            <tr>
              <td>${ligne.product?.reference || '-'}</td>
              <td>${ligne.product?.designation || '-'}</td>
              <td class="text-center">${ligne.quantite}</td>
              <td class="text-right">${ligne.prixUnitaireHT.toFixed(3)}</td>
              <td class="text-right">${ligne.prixUnitaireTTC.toFixed(3)}</td>
              <td class="text-right">${ligne.totalHT.toFixed(3)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- ================= SIGNATURES (UNCHANGED) ================= -->
      <div class="signatures">

        <div class="signature-box">
          <div class="signature-line">
            Conducteur
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-line">
            Destinataire
          </div>
        </div>

        <div class="signature-box">
          <div class="signature-line">
            Pour CHIHA GSM
          </div>
        </div>

      </div>

    </div>

    <script>
      window.onload = () => window.print();
    </script>

  </body>
  </html>
  `);

    printWindow.document.close();
  };

  const columns = [
    {
      key: "numero" as keyof BonSortie,
      header: "N° Bon",
      render: (item: BonSortie) => (
        <span className="font-mono text-sm font-medium">{item.numero}</span>
      ),
    },
    {
      key: "date" as keyof BonSortie,
      header: "Date",
      render: (item: BonSortie) => (
        <span className="text-muted-foreground">{formatDate(item.date)}</span>
      ),
    },
    {
      key: "destination" as keyof BonSortie,
      header: "Destination",
      render: (item: BonSortie) => (
        <span className="text-muted-foreground">{item.destination}</span>
      ),
    },
    {
      key: "nomConducteur" as keyof BonSortie,
      header: "Conducteur",
      render: (item: BonSortie) => (
        <span className="text-muted-foreground">{item.nomConducteur}</span>
      ),
    },
    {
      key: "totalTTC" as keyof BonSortie,
      header: "Total HT",
      render: (item: BonSortie) => (
        <span className="font-semibold">{formatCurrency(item.totalHT)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: BonSortie) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/bons-sortie/rapide/${item.id}/view`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/bons-sortie/rapide/${item.id}/edit`)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              {/* Contenu de la confirmation de suppression */}
            </AlertDialogContent>
          </AlertDialog>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePrintBonSortie(item)}
          >
            <Printer className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Bons de Sortie" subtitle="Gestion des sorties de stock par station" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Bons Sortie Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Liste des Bons de Sortie
                </CardTitle>
                <div className="flex gap-2">
                  <Button onClick={() => router.push('/bons-sortie/rapide')}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Bon Sorite
                  </Button>
                </div>

              </CardHeader>

              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DataTable
                    data={bonsSortie}
                    columns={columns}
                    searchPlaceholder="Rechercher un bon de sortie..."
                    searchKey="numero"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}