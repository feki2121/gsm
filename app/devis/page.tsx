// app/devis/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, FileText, Edit, Trash2, Eye, Printer, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { generateDevisPrintHTML, openPrintWindow } from "@/lib/print-utils-jsx";
import { DevisPrintData, PrintFormat } from "@/types/print";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Types
interface Client {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
}

interface Product {
  prixUnitaire: any;
  quantite: any;
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  tva: number;
}

interface LigneDevis {
  id?: string;
  productId: string;
  product?: Product;
  quantite: number;
  prixUnitaire: number;
  tva?: number;
}

interface Devis {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTTC: number;
  totalTVA: number;
  remise: number;
  remiseType: string;
  validite: Date;
  statut: string;
  lignes: LigneDevis[];
  createdAt: Date;
  updatedAt: Date;
}

enum StatutDevis {
  EN_ATTENTE = "EN_ATTENTE",
  ACCEPTE = "ACCEPTE",
  REFUSE = "REFUSE",
  TRANSFORME_EN_FACTURE = "TRANSFORME_EN_FACTURE"
}

const statutDevisLabels: Record<StatutDevis, string> = {
  [StatutDevis.EN_ATTENTE]: "En attente",
  [StatutDevis.ACCEPTE]: "Accepté",
  [StatutDevis.REFUSE]: "Refusé",
  [StatutDevis.TRANSFORME_EN_FACTURE]: "Transformé en facture"
};

export default function DevisPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();

  const [devis, setDevis] = useState<Devis[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [validite, setValidite] = useState("");
  const [lignes, setLignes] = useState<LigneDevis[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantite, setQuantite] = useState<number>(1);
  const { toast } = useToast();
  const [devisToDelete, setDevisToDelete] = useState<Devis | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // Fetch data on component mount
  useEffect(() => {
    fetchDevis();
    fetchClients();
    fetchProducts();
  }, [currentPage]);

  const fetchDevis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/devis?page=${currentPage}&limit=10`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setDevis(data.data || []);
    } catch (error) {
      console.error("Error fetching devis:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les devis",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      const clientsList = data.data || [];
      setClients(clientsList);

      if (clientsList.length === 0) {
        toast({
          title: "Information",
          description: "Aucun client trouvé. Veuillez d'abord créer des clients.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des clients",
        variant: "destructive",
      });
      setClients([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=100");
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

  const calculateTotalHT = () => {
    return lignes.reduce(
      (sum, l) =>
        sum +
        Math.abs(
          l.quantite *
          ((l.prixUnitaire * (l.product?.tva ?? 0)) / 100) -
          l.prixUnitaire
        ),
      0
    );
  };

  const calculateTotalTVA = () => {
    return lignes.reduce(
      (sum, l) =>
        sum +
        (l.quantite * l.prixUnitaire * (l.product?.tva ?? 0)) / 100,
      0
    );
  };

  const calculateTotalTTC = () => {
    const totalHT = calculateTotalHT();
    const totalTVA = calculateTotalTVA();
    return totalHT + totalTVA;
  };


const handlePrint = (devi: Devis, format: PrintFormat = "A4") => {
  // Calcul du prix HT à partir du prix TTC
  const getPrixHT = (prixTTC: number, tva: number) => {
    return prixTTC / (1 + tva / 100);
  };

  // Calcul des totaux
  let totalHTBrut = 0;
  let totalTTCBrut = 0;
  let totalTVABrut = 0;

  const lignesFormatted = devi.lignes?.map(ligne => {
    const prixTTC = ligne.prixUnitaire || 0;
    const tva = ligne.tva || 19;
    const prixHT = getPrixHT(prixTTC, tva);
    const totalHTLigne = ligne.quantite * prixHT;
    const totalTTCLigne = ligne.quantite * prixTTC;
    
    totalHTBrut += totalHTLigne;
    totalTTCBrut += totalTTCLigne;
    totalTVABrut += totalHTLigne * tva / 100;

    return {
      product: ligne.product ? {
        reference: ligne.product.reference,
        designation: ligne.product.designation,
        tva: tva,
      } : undefined,
      quantite: ligne.quantite || 0,
      prixUnitaire: prixTTC,
      prixUnitaireHT: prixHT,
    };
  }) || [];

  // Application de la remise
  const remise = devi.remise || 0;
  const remiseType = devi.remiseType || "PERCENT";
  
  let totalHT = totalHTBrut;
  let totalTTC = totalTTCBrut;
  let totalTVA = totalTVABrut;

  if (remise > 0) {
    if (remiseType === "PERCENT") {
      totalHT = totalHTBrut * (1 - remise / 100);
      totalTTC = totalTTCBrut * (1 - remise / 100);
      totalTVA = totalTVABrut * (1 - remise / 100);
    } else {
      // Remise en montant fixe (appliquée sur le TTC)
      totalTTC = Math.max(0, totalTTCBrut - remise);
      const ratio = totalTTCBrut > 0 ? totalTTC / totalTTCBrut : 0;
      totalHT = totalHTBrut * ratio;
      totalTVA = totalTVABrut * ratio;
    }
  }

  const printData: DevisPrintData = {
    id: devi.id,
    numero: devi.numero,
    date: devi.date,
    validite: devi.validite,
    client: devi.client ? {
      nom: devi.client.nom,
      adresse: devi.client.adresse || undefined,
      telephone: devi.client.telephone || undefined,
    } : undefined,
    totalHT: totalHT,
    totalTVA: totalTVA,
    totalTTC: totalTTC,
    remise: remise,
    remiseType: remiseType,
    lignes: lignesFormatted,
  };

  console.log("Print data prepared:", printData);

  const htmlContent = generateDevisPrintHTML(printData, format);
  openPrintWindow(htmlContent, `Devis-${devi.numero}`);
};

  const handleDeleteDevis = async () => {
    if (!devisToDelete) return;

    setDeleting(true);
    try {
      const response = await fetch(`/api/devis/${devisToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete devis");
      }

      toast({
        title: "Succès",
        description: "Devis supprimé avec succès",
      });

      fetchDevis();
      setShowDeleteDialog(false);
      setDevisToDelete(null);
    } catch (error) {
      console.error("Error deleting devis:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le devis",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const columns = [
    {
      key: "numero" as keyof Devis,
      header: "Numéro",
      render: (item: Devis) => (
        <span className="font-mono text-sm font-medium">{item.numero}</span>
      ),
    },
    {
      key: "date" as keyof Devis,
      header: "Date",
      render: (item: Devis) => (
        <span className="text-muted-foreground">{formatDate(item.date)}</span>
      ),
    },
    {
      key: "client.nom",
      header: "Client",
      render: (item: Devis) => (
        <span className="font-medium">{item.client?.nom || "N/A"}</span>
      ),
    },
    // {
    //   key: "totalHT" as keyof Devis,
    //   header: "Total HT",
    //   render: (item: Devis) => (
    //     <span className="text-muted-foreground">{formatCurrency(item.totalHT)}</span>
    //   ),
    // },
    {
      key: "totalTTC" as keyof Devis,
      header: "Total TTC",
      render: (item: Devis) => (
        <span className="font-semibold">{formatCurrency(item.totalHT)}</span>
      ),
    },
    {
      key: "validite" as keyof Devis,
      header: "Validité",
      render: (item: Devis) => {
        const isExpired = new Date(item.validite) < new Date();
        return (
          <span className={cn("text-sm", isExpired && "text-red-500")}>
            {formatDate(item.validite)}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Devis) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/devis/${item.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {item.statut === StatutDevis.EN_ATTENTE && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => handlePrint(item)}
                title="Imprimer"
              >
                <Printer className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => router.push(`/devis/${item.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => {
              setDevisToDelete(item);
              setShowDeleteDialog(true);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Devis" subtitle="Gestion des devis clients" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            <Card>

              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Liste des Devis
                </CardTitle>
                <Button onClick={() => router.push('/devis/creer')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Devis
                </Button>
              </CardHeader>


              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <DataTable
                    data={devis}
                    columns={columns}
                    searchPlaceholder="Rechercher un devis..."
                    searchKey="numero"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis N° {devisToDelete?.numero} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDevis} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}