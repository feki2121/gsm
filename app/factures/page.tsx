"use client";

import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from 'next/link';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger, } from '@/components/ui/alert-dialog';
import { formatCurrency, formatDate, StatutFacture, } from "@/lib/types";
import { Receipt, Edit, Trash2, Eye, Printer, RefreshCw, Loader2, } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateFacturePrintHTML, openPrintWindow } from "@/lib/print-utils-jsx";
import { FacturePrintData, PrintFormat } from "@/types/print";

interface ClientAddress {
  id: string;
  adresse: string;
  lieuDit?: string | null;
  codePostal?: string | null;
  ville?: string | null;
  estPrincipale: boolean;
  latitude?: number | null;
  longitude?: number | null;
}
interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  mf?: string | null;
  cin?: string | null;
  addresses?: ClientAddress[];
  solde?: number;
  creditAutorise?: number | null;
  creditDisponible?: number;
  estAutoriseCredit?: boolean;
  estProspect?: boolean;
  estPasseParBL?: boolean;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  tva: number;
  quantiteStock: number;
  stockLocations?: { homeId: string; quantite: number }[];
}

interface Category {
  id: string;
  nom: string;
}

interface Home {
  id: string;
  nom: string;
}

interface LigneFacture {
  id?: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  prixUnitaire: number;
  remiseLigne?: number;
  tva: number;
  isNewProduct?: boolean;
  newProduct?: {
    reference: string;
    designation: string;
    categoryId: string;
    prixAchat: number;
    prixVente: number;
    tva: number;
    seuilAlerte: number;
    homeId: string;
  };
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client?: Client;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise: number | null;
  statut: string;
  type: string;
  lignes: LigneFacture[];
  createdAt: string;
  updatedAt: string;
}

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [formData, setFormData] = useState({
    clientId: "",
    remise: "",
    lignes: [] as LigneFacture[],
  });
  // États pour la sélection avec emplacement
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedHome, setSelectedHome] = useState("");
  const [quantiteFacture, setQuantiteFacture] = useState<number>(1);

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    fetchFactures();
  }, [currentPage]);

  const fetchFactures = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/factures`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFactures(data.data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les factures",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };


const handlePrintFacture = (facture: Facture, format: PrintFormat = "A4") => {
    const clientAddress = facture.client?.addresses?.find(addr => addr.estPrincipale) || facture.client?.addresses?.[0];
  
  // ✅ Déterminer si on utilise la remise globale
  const hasIndividualRemises = facture.lignes.some(l => (l.remiseLigne || 0) > 0);
  const useGlobalRemise = !hasIndividualRemises && (facture.remise || 0) > 0;

  // ✅ Calculer les totaux par ligne avec remises en DT
  const lignesWithDetails = facture.lignes.map(ligne => {
    const quantite = ligne.quantite || 0;
    const prixUnitaireBrut = ligne.prixUnitaire || 0;
    
    // ✅ La remise est en DT (pas en pourcentage)
    const remiseLigneDT = useGlobalRemise ? 0 : (ligne.remiseLigne || 0);
    
    // ✅ Montant HT brut (sans remise)
    const totalHTBrut = quantite * prixUnitaireBrut;
    
    // ✅ Montant de la remise en DT
    const montantRemise = remiseLigneDT;
    
    // ✅ Montant HT après remise
    const totalHTApresRemise = Math.max(0, totalHTBrut - montantRemise);
    
    // ✅ Calcul de la TVA sur le HT après remise
    const tva = ligne.tva || 19;
    const totalTVA = totalHTApresRemise * (tva / 100);
    const totalTTC = totalHTApresRemise + totalTVA;

    // ✅ Prix unitaire après remise (pour l'affichage)
    const prixUnitaireApresRemise = quantite > 0 ? totalHTApresRemise / quantite : 0;

    return {
      product: ligne.product ? {
        reference: ligne.product.reference,
        designation: ligne.product.designation,
        prixUnitaire: ligne.product.prixVente,
      } : undefined,
      home: ligne.home ? {
        nom: ligne.home.nom,
      } : undefined,
      quantite: quantite,
      prixUnitaire: prixUnitaireApresRemise, // PU après remise
      prixUnitaireBrut: prixUnitaireBrut, // PU avant remise
      remiseLigne: remiseLigneDT, // ✅ En DT
      montantRemise: montantRemise, // ✅ En DT
      tva: tva,
      totalHT: totalHTApresRemise,
      totalHTBrut: totalHTBrut,
      totalTVA: totalTVA,
      totalTTC: totalTTC,
    };
  });

  // ✅ Calculer les totaux
  const totalHTBrut = lignesWithDetails.reduce((sum, l) => sum + (l.totalHTBrut || 0), 0);
  const totalRemiseLignes = lignesWithDetails.reduce((sum, l) => sum + (l.montantRemise || 0), 0);
  const totalHT = lignesWithDetails.reduce((sum, l) => sum + l.totalHT, 0);
  const totalTVA = lignesWithDetails.reduce((sum, l) => sum + (l.totalTVA || 0), 0);
  const totalTTC = lignesWithDetails.reduce((sum, l) => sum + (l.totalTTC || 0), 0);

  // ✅ Si on utilise la remise globale, appliquer la remise en DT
  let totalRemiseFinale = totalRemiseLignes;
  let totalHTFinal = totalHT;
  let totalTVAFinal = totalTVA;
  let totalTTCFinal = totalTTC;

  if (useGlobalRemise && facture.remise && facture.remise > 0) {
    totalRemiseFinale = facture.remise;
    totalHTFinal = Math.max(0, totalHT - totalRemiseFinale);
    
    if (totalHT > 0) {
      const ratioTVA = totalTVA / totalHT;
      totalTVAFinal = totalHTFinal * ratioTVA;
    } else {
      totalTVAFinal = 0;
    }
    totalTTCFinal = totalHTFinal + totalTVAFinal;
  }

  const printData: FacturePrintData = {
    id: facture.id,
    numero: facture.numero,
    date: facture.date,
    client: facture.client ? {
      nom: facture.client.nom,
      adresse: clientAddress?.adresse,
      addresses: clientAddress ? [clientAddress] : [],
      telephone: facture.client.telephone,
      email: facture.client.email || undefined,
      matriculeFiscale: facture.client.mf || undefined,
    } : undefined,
    totalHT: totalHTFinal,
    totalTVA: totalTVAFinal,
    totalTTC: facture.totalTTC || totalTTCFinal,
    remise: facture.remise || 0,
    totalHTBrut: totalHTBrut,
    totalRemise: totalRemiseFinale,
    useGlobalRemise: useGlobalRemise,
    remiseGlobaleDT: useGlobalRemise ? facture.remise || 0 : 0,
    lignes: lignesWithDetails,
  };

  // Générer le HTML et ouvrir la fenêtre d'impression
  const htmlContent = generateFacturePrintHTML(printData, format);

  const printWindow = window.open('', '_blank', 'width=800,height=600');

  if (printWindow) {
    printWindow.document.write(`<!DOCTYPE html>
    <html>
      <head>
        <title>Impression Facture - ${facture.numero}</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: Arial, sans-serif;
            background: #fff;
          }
          .print-copy {
            page-break-after: always;
            margin: 0;
            padding: 20px;
          }
          .copy-label {
            text-align: center;
            font-size: 12px;
            color: #666;
            margin-top: -10px;
            margin-bottom: 20px;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="page">
          ${htmlContent}
        </div>
      </body>
    </html>`);

    printWindow.document.close();
    printWindow.focus();

    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };

    setTimeout(() => {
      if (printWindow && !printWindow.closed) {
        printWindow.print();
        setTimeout(() => {
          if (!printWindow.closed) printWindow.close();
        }, 500);
      }
    }, 1000);
  } else {
    alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups pour ce site.');
  }
};


  
const handlePrintFactureTicket = (facture: Facture, format: PrintFormat = "TICKET") => {
    // ✅ Même logique que pour le format A4
    const hasIndividualRemises = facture.lignes.some(l => (l.remiseLigne || 0) > 0);
    const useGlobalRemise = !hasIndividualRemises && (facture.remise || 0) > 0;
    
    const lignesWithDetails = facture.lignes.map(ligne => {
        const quantite = ligne.quantite;
        const prixUnitaireBrut = ligne.prixUnitaire;
        const remiseLigne = useGlobalRemise ? 0 : (ligne.remiseLigne || 0);

        const prixUnitaireApresRemise = remiseLigne > 0
            ? prixUnitaireBrut * (1 - remiseLigne / 100)
            : prixUnitaireBrut;

        const totalHTBrut = quantite * prixUnitaireBrut;
        const totalHTApresRemise = quantite * prixUnitaireApresRemise;
        const montantRemise = totalHTBrut - totalHTApresRemise;
        const tva = ligne.tva || 19;
        const totalTVA = totalHTApresRemise * (tva / 100);
        const totalTTC = totalHTApresRemise + totalTVA;

        return {
            product: ligne.product ? {
                reference: ligne.product.reference,
                designation: ligne.product.designation,
                prixUnitaire: ligne.product.prixVente,
            } : undefined,
            home: ligne.home ? {
                nom: ligne.home.nom,
            } : undefined,
            quantite: quantite,
            prixUnitaire: prixUnitaireApresRemise,
            prixUnitaireBrut: prixUnitaireBrut,
            remiseLigne: remiseLigne,
            montantRemise: montantRemise,
            tva: tva,
            totalHT: totalHTApresRemise,
            totalHTBrut: totalHTBrut,
            totalTVA: totalTVA,
            totalTTC: totalTTC,
        };
    });

    const totalHTBrut = lignesWithDetails.reduce((sum, l) => sum + (l.totalHTBrut || 0), 0);
    const totalRemiseLignes = lignesWithDetails.reduce((sum, l) => sum + (l.montantRemise || 0), 0);
    const totalHT = lignesWithDetails.reduce((sum, l) => sum + l.totalHT, 0);
    const totalTVA = lignesWithDetails.reduce((sum, l) => sum + (l.totalTVA || 0), 0);
    const totalTTC = lignesWithDetails.reduce((sum, l) => sum + (l.totalTTC || 0), 0);

    let totalRemiseFinale = totalRemiseLignes;
    let totalHTFinal = totalHT;
    let totalTVAFinal = totalTVA;
    let totalTTCFinal = totalTTC;

    if (useGlobalRemise && facture.remise && facture.remise > 0) {
        totalRemiseFinale = facture.remise;
        totalHTFinal = totalHT - totalRemiseFinale;
        const ratioTVA = totalTVA / totalHT;
        totalTVAFinal = totalHTFinal * ratioTVA;
        totalTTCFinal = totalHTFinal + totalTVAFinal;
    }

    const printData: FacturePrintData = {
        id: facture.id,
        numero: facture.numero,
        date: facture.date,
        client: facture.client ? {
            nom: facture.client.nom,
            telephone: facture.client.telephone,
            email: facture.client.email || undefined,
            matriculeFiscale: facture.client.mf || undefined,
            addresses: facture.client.addresses || undefined,
        } : undefined,
        totalHT: totalHTFinal,
        totalTVA: totalTVAFinal,
        totalTTC: totalTTCFinal,
        remise: facture.remise || 0,
        totalHTBrut: totalHTBrut,
        totalRemise: totalRemiseFinale,
        useGlobalRemise: useGlobalRemise,
        remiseGlobaleDT: useGlobalRemise ? facture.remise || 0 : 0,
        lignes: lignesWithDetails,
    };

    const htmlContent = generateFacturePrintHTML(printData, format);
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`<!DOCTYPE html>
        <html>
       
        <head>
                <title>Impression BL - ${facture.numero}</title>
                <meta charset="UTF-8">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        font-family: Arial, sans-serif;
                        background: #fff;
                    }
                    .print-copy {
                        page-break-after: always;
                        margin: 0;
                        padding: 20px;
                    }
                    .copy-label {
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        margin-top: -10px;
                        margin-bottom: 20px;
                    }
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    }
                </style>
            </head>

        <body>
        <div class="page">
        ${htmlContent}
        </div>
        </body>
        </html>`);
      printWindow.document.close();
      printWindow.focus();

      printWindow.onload = () => {
        printWindow.print();
        printWindow.close();
      };

      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          setTimeout(() => {
            if (!printWindow.closed) printWindow.close();
          }, 500);
        }
      }, 1000);
    } else {
      alert('Impossible d\'ouvrir la fenêtre d\'impression. Veuillez autoriser les pop-ups pour ce site.');
    }
  };


  const columns = [
    {
      key: "numero",
      header: "Numéro",
      render: (item: Facture) => (
        <span className="font-mono text-sm font-medium">{item.numero}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (item: Facture) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span>
      ),
    },
    {
      key: "client.nom",
      header: "Client",
      render: (item: Facture) => (
        <span className="font-medium">{item.client?.nom || "N/A"}</span>
      ),
    },
    {
      key: "totalHT",
      header: "Total HT",
      render: (item: Facture) => (
        <span className="text-muted-foreground">{formatCurrency(item.totalHT)}</span>
      ),
    },
    {
      key: "totalTTC",
      header: "Total TTC",
      render: (item: Facture) => (
        <span className="font-semibold">{formatCurrency(item.totalTTC)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Facture) => (
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            className="h-8 w-8"
            variant="ghost"
            onClick={() => handlePrintFacture(item)}
            title="Imprimer facture"
          >
            <Printer className="h-4 w-4" />
          </Button>

          <Button
            size="icon"
            className="h-8 w-8"
            variant="ghost"
            onClick={() => handlePrintFactureTicket(item)}
            title="Imprimer ticket"
          >
            <Receipt className="h-4 w-4" />
          </Button>

          <Link href={`/factures/${item.id}/view`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link href={`/factures/${item.id}/edit`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
                <AlertDialogDescription>
                  Êtes-vous sûr de vouloir supprimer la facture {item.numero} ?
                  Cette action est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    const response = await fetch(`/api/factures/${item.id}`, {
                      method: 'DELETE',
                    });
                    if (response.ok) {
                      router.refresh();
                      toast({ title: 'Facture supprimée' });
                    }
                  }}
                >
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <div className="flex-1 pl-64">
          <Header title="Factures" subtitle="Gestion des factures clients" />
          <main className="p-6">
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 pl-64">
        <Header title="Factures" subtitle="Gestion des factures clients" />
        <main className="p-6">
          <div className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Liste des Factures
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" onClick={fetchFactures}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={factures}
                  columns={columns}
                  searchPlaceholder="Rechercher une facture..."
                  searchKey="numero"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}