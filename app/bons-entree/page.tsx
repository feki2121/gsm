"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, Eye, FileText, Trash2, Loader2, Package, Truck, FileCheck, Edit } from "lucide-react";
import {
  Dialog,
} from "@/components/ui/dialog";
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
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { BEPrintData, PrintFormat } from "@/types/print";
import { generateBEPrintHTML } from "@/lib/print-utils-jsx";
import { BonEntreeViewModal } from "@/components/bons-entree/BonEntreeViewModal";

interface Fournisseur {
  id: string;
  nom: string;
  telephone?: string;
  adresse?: string;
}

interface BonEntree {
  id: string;
  numero: string;
  date: string;
  type: string;
  fournisseur: Fournisseur | null;
  referenceDoc: string | null;
  totalHT: number;
  totalTTC: number;
  totalTVA: number;
  statut: string;
  lignes: any[];
}

export default function BonsEntreePage() {
  const { sidebarClasses } = useSidebar();
  const [bons, setBons] = useState<BonEntree[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedBEId, setSelectedBEId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingBE, setDeletingBE] = useState<BonEntree | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchBons();
  }, [currentPage]);

  const fetchBons = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bons-entree?page=${currentPage}&limit=10000`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setBons(data.data || []);
    } catch (error) {
      console.error("Error fetching bons:", error);
      toast({ title: "Erreur", description: "Impossible de charger les bons d'entrée", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrintBonEntree = (bonEntree: BonEntree, format: PrintFormat = "A4") => {
    const printData: BEPrintData = {
      id: bonEntree.id,
      numero: bonEntree.numero,
      date: bonEntree.date,
      fournisseur: bonEntree.fournisseur ? {
        nom: bonEntree.fournisseur.nom,
        adresse: bonEntree.fournisseur.adresse || null,
        telephone: bonEntree.fournisseur.telephone || null,
      } : undefined,
      type: bonEntree.type,
      referenceDoc: bonEntree.referenceDoc || undefined,
      statut: bonEntree.statut,
      totalHT: bonEntree.totalHT || 0,
      totalTVA: bonEntree.totalTVA || 0,
      totalTTC: bonEntree.totalTTC || 0,
      lignes: bonEntree.lignes.map(ligne => ({
        product: ligne.product ? {
          reference: ligne.product.reference,
          designation: ligne.product.designation,
        } : undefined,
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT || ligne.product?.prixAchat || 0,
        tva: ligne.tva || 19,
        totalHT: (ligne.quantite * (ligne.prixUnitaireHT || ligne.product?.prixAchat || 0)),
        totalTTC: (ligne.quantite * (ligne.prixUnitaireHT || ligne.product?.prixAchat || 0)) * (1 + (ligne.tva || 19) / 100)
      })),
    };

    const htmlBonEntree = generateBEPrintHTML(printData, format);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impression BE - ${bonEntree.numero}</title>
            <meta charset="UTF-8">
          </head>
          <body>
            ${htmlBonEntree}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 1000);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

const handleDelete = async () => {
  if (!deletingBE) return;

  setIsDeleting(true);
  try {
    const response = await fetch(`/api/bons-entree/${deletingBE.id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      toast({
        title: "Suppression impossible",
        description: data.error || "Erreur lors de la suppression",
        variant: "destructive",
      });
      return; // Ne pas fermer le dialogue si erreur
    }

    toast({
      title: "Succès",
      description: "Bon d'entrée supprimé avec succès",
    });

    setDeleteDialogOpen(false);
    setDeletingBE(null);
    fetchBons(); // Rafraîchir la liste
  } catch (error) {
    console.error("Error deleting bon entree:", error);
    toast({
      title: "Erreur",
      description: "Une erreur inattendue s'est produite",
      variant: "destructive",
    });
  } finally {
    setIsDeleting(false);
  }
};

  const getTypeBadge = (type: string) => {
    const styles = {
      FAC: "bg-blue-500 text-white",
      BL: "bg-green-500 text-white",
      BS: "bg-yellow-500 text-white",
      AUCUN: "bg-gray-500 text-white",
    };
    const icons = {
      FAC: <FileText className="h-3 w-3 mr-1" />,
      BL: <Truck className="h-3 w-3 mr-1" />,
      BS: <Package className="h-3 w-3 mr-1" />,
      AUCUN: <FileCheck className="h-3 w-3 mr-1" />,
    };
    const labels = { FAC: "Facture", BL: "Bon Livraison", BS: "Bon Sortie", AUCUN: "Aucun" };

    return (
      <Badge className={styles[type as keyof typeof styles]}>
        {icons[type as keyof typeof icons]}
        {labels[type as keyof typeof labels]}
      </Badge>
    );
  };

  const columns = [
    { key: "numero", header: "N° BE", render: (item: BonEntree) => <span className="font-mono">{item.numero}</span> },
    { key: "date", header: "Date", render: (item: BonEntree) => <span>{formatDate(new Date(item.date))}</span> },
    { key: "type", header: "Type", render: (item: BonEntree) => getTypeBadge(item.type) },
    { key: "fournisseur.nom", header: "Fournisseur", render: (item: BonEntree) => <span>{item.fournisseur?.nom || "-"}</span> },
    { key: "totalTTC", header: "Total TTC", render: (item: BonEntree) => <span className="font-semibold">{formatCurrency(item.totalTTC)}</span> },
    {
      key: "actions",
      header: "Actions",
      render: (item: BonEntree) => {
        return (
          <div className="flex gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => handlePrintBonEntree(item)}
              title="Imprimer"
            >
              <FileText className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => {
                setSelectedBEId(item.id);
                setViewModalOpen(true);
              }}
              title="Voir détails"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => router.push(`/bons-entree/modifier/${item.id}`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="text-red-600 hover:text-red-700"
              onClick={() => {
                setDeletingBE(item);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Bons d'Entrée" subtitle="Gestion des entrées de stock par type" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Bons d'Entrée" subtitle="Gestion des entrées de stock par type" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Liste des Bons d'Entrée
                </CardTitle>
                <Button onClick={() => router.push('/bons-entree/creer')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Bon d'Entrée
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={bons}
                  columns={columns}
                  searchPlaceholder="Rechercher un bon d'entrée..."
                  searchKey="numero"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal de visualisation */}
      <BonEntreeViewModal
        open={viewModalOpen}
        onOpenChange={setViewModalOpen}
        bonEntreeId={selectedBEId}
      />

      {/* Dialogue de confirmation suppression */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le bon d'entrée</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer le bon d'entrée <strong>{deletingBE?.numero}</strong> ?
              <br />
              <span className="text-destructive text-sm mt-2 block">
                ⚠️ Cette action est irréversible et ne peut être effectuée que sur les brouillons.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                "Supprimer"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}