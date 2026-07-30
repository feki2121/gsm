'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, Truck, Edit, Trash2, Eye, FileText, Printer, Receipt, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Filter, CheckSquare, Square, } from "lucide-react";
import { useRouter } from "next/navigation";
import Select2 from "react-select";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { generateBLPrintHTML } from "@/lib/print-utils-jsx";
import { BLPrintData, PrintFormat } from "@/types/print";

// Types
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

interface Home {
  id: string;
  nom: string;
  description: string | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  prixVenteHT: number;
  quantiteStock: number;
  stockLocations?: Array<{
    homeId: string;
    quantite: number;
  }>;
}

interface LigneBL {
  id?: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  prixVente?: number;
}

interface BonLivraison {
  id: string;
  numero: string;
  date: Date;
  clientId: string;
  client?: Client;
  factureId: string | null;
  statut: string;
  lignes: LigneBL[];
  montantTotal: number;
  montantHT: number;
  montantTVA: number;
  resteCredit: number;
  montantCredit: number;
  remise?: number;
  montantHTAvantRemise: number;
  totalHT: number;
  chauffeur?: {
    id: string;
    nom: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

enum StatutBL {
  EN_ATTENTE = "EN_ATTENTE",
  LIVRE = "LIVRE",
  ANNULE = "ANNULE"
}

const statutBLLabels: Record<StatutBL, string> = {
  [StatutBL.EN_ATTENTE]: "En attente",
  [StatutBL.LIVRE]: "Livré",
  [StatutBL.ANNULE]: "Annulé"
};

export default function BonsLivraisonPage() {
  const { sidebarClasses } = useSidebar();
  const [bonsLivraison, setBonsLivraison] = useState<BonLivraison[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedBLs, setSelectedBLs] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const isFirstLoad = useRef(true);
  const isSettingDates = useRef(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState<string | null>(null);

  // États pour les filtres (valeurs temporaires)
  const [tempDateDebut, setTempDateDebut] = useState<Date | undefined>();
  const [tempDateFin, setTempDateFin] = useState<Date | undefined>();
  const [tempClientId, setTempClientId] = useState<string>("all");
  const [tempHome, setTempHome] = useState<string>("all");
  const [tempSelectedFilterClient, setTempSelectedFilterClient] = useState<{ value: string; label: string } | null>(null);
  const [userRole, setUserRole] = useState<string>("");

  // États pour les filtres actifs (appliqués)
  const [activeDateDebut, setActiveDateDebut] = useState<Date | undefined>();
  const [activeDateFin, setActiveDateFin] = useState<Date | undefined>();
  const [activeClientId, setActiveClientId] = useState<string>("all");
  const [activeHome, setActiveHome] = useState<string>("all");

  // Styles pour le select
  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      '&:hover': { borderColor: 'hsl(var(--primary))' },
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
      minHeight: '36px',
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
  };

  const fetchUserRole = async () => {
    try {
      const response = await fetch(`/api/users/me`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || "ADMIN");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("ADMIN");
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setIsMounted(true);
    fetchClients();
    fetchProducts();
    fetchFactures();
    fetchHomes();
    fetchUserRole();
  }, []);


  useEffect(() => {
    if (userRole && userRole !== "ADMIN" && !isSettingDates.current) {
      isSettingDates.current = true;
      const today = new Date();
      setActiveDateDebut(today);
      setActiveDateFin(today);
      setTempDateDebut(today);
      setTempDateFin(today);
      setTimeout(() => {
        isSettingDates.current = false;
      }, 100);
    }
  }, [userRole]);

  useEffect(() => {
    if (!userRole) return;

    if (userRole !== "ADMIN") {
      const today = new Date();
      if (!activeDateDebut || activeDateDebut.toDateString() !== today.toDateString()) {
        return;
      }
    }

    fetchBonsLivraison();
  }, [currentPage, activeDateDebut, activeDateFin, activeClientId, activeHome, userRole]); // ← Dépendances correctes



  const fetchBonsLivraison = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '100');

      let dateDebut = activeDateDebut;
      let dateFin = activeDateFin;

      if (userRole && userRole !== "ADMIN") {
        const today = new Date();
        dateDebut = today;
        dateFin = today;
      }

      if (dateDebut) {
        const year = dateDebut.getFullYear();
        const month = String(dateDebut.getMonth() + 1).padStart(2, '0');
        const day = String(dateDebut.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        params.append('dateDebut', dateStr);
      }
      if (dateFin) {
        const year = dateFin.getFullYear();
        const month = String(dateFin.getMonth() + 1).padStart(2, '0');
        const day = String(dateFin.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;
        params.append('dateFin', dateStr);
      }
      if (activeClientId && activeClientId !== 'all') {
        params.append('clientId', activeClientId);
      }
      if (activeHome && activeHome !== 'all') {
        params.append('homeId', activeHome);
      }

      const response = await fetch(`/api/bon-livraisons?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setBonsLivraison(data.data || []);
    } catch (error) {
      console.error("Error fetching bons livraison:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bons de livraison",
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
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
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
    }
  };

  const fetchFactures = async () => {
    try {
      const response = await fetch("/api/factures?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFactures(data.data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const handleSendWhatsApp = async (bonLivraison: BonLivraison) => {
    if (!bonLivraison.client?.telephone) {
      toast({
        title: "Erreur",
        description: "Ce client n'a pas de numéro de téléphone",
        variant: "destructive",
      });
      return;
    }

    // Vérifier si le BL est en mode crédit
    const isCredit = bonLivraison.montantCredit && bonLivraison.montantCredit > 0;
    if (!isCredit) {
      toast({
        title: "Information",
        description: "Ce bon de livraison n'est pas en mode crédit. WhatsApp ne sera pas envoyé.",
        variant: "default",
      });
      return;
    }

    setIsSendingWhatsApp(bonLivraison.id);

    try {
      const response = await fetch(`/api/bon-livraisons/${bonLivraison.id}/whatsapp`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la génération du message WhatsApp');
      }

      // Ouvrir WhatsApp dans un nouvel onglet
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, '_blank');
        toast({
          title: "Succès",
          description: "Message WhatsApp ouvert dans un nouvel onglet",
        });
      } else {
        throw new Error('URL WhatsApp non générée');
      }

    } catch (error) {
      console.error('Error sending WhatsApp:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'envoyer le message WhatsApp",
        variant: "destructive",
      });
    } finally {
      setIsSendingWhatsApp(null);
    }
  };


  const applyFilters = () => {
    console.log('Application des filtres:');
    console.log('tempDateDebut:', tempDateDebut);
    console.log('tempDateFin:', tempDateFin);
    console.log('tempClientId:', tempClientId);
    console.log('tempHome:', tempHome);

    setActiveDateDebut(tempDateDebut);
    setActiveDateFin(tempDateFin);
    setActiveClientId(tempClientId);
    setActiveHome(tempHome);
    setCurrentPage(1);
  };

  // Réinitialiser les filtres
  const resetFilters = () => {
    setTempDateDebut(undefined);
    setTempDateFin(undefined);
    setTempClientId("all");
    setTempHome("all");
    setTempSelectedFilterClient(null);
    setActiveDateDebut(undefined);
    setActiveDateFin(undefined);
    setActiveClientId("all");
    setActiveHome("all");
    setCurrentPage(1);
  };

  // Filtrer les BLs pour l'affichage (après les filtres actifs)
  const filteredBons = bonsLivraison;

  const toggleBLSelection = (blId: string) => {
    const bl = bonsLivraison.find(b => b.id === blId);
    if (bl?.factureId) {
      toast({
        title: "Action impossible",
        description: "Ce bon de livraison est déjà lié à une facture",
        variant: "destructive",
      });
      return;
    }
    setSelectedBLs(prev =>
      prev.includes(blId)
        ? prev.filter(id => id !== blId)
        : [...prev, blId]
    );
  };

  const toggleAllBLs = () => {
    const selectableBLs = filteredBons.filter(bl => !bl.factureId);
    if (selectedBLs.length === selectableBLs.length && selectableBLs.length > 0) {
      setSelectedBLs([]);
    } else {
      setSelectedBLs(selectableBLs.map(bl => bl.id));
    }
  };

  const handleCreateFactureFromSelectedBLs = () => {
    if (selectedBLs.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un bon de livraison",
        variant: "destructive",
      });
      return;
    }
    const selectedBLData = bonsLivraison.filter(bl => selectedBLs.includes(bl.id));
    localStorage.setItem('selectedBLsForFacture', JSON.stringify(selectedBLData));
    window.location.href = '/factures/creer-depuis-bl';
  };

  const handleDeleteBL = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce bon de livraison ?")) return;
    try {
      const response = await fetch(`/api/bon-livraisons/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete");
      toast({ title: "Succès", description: "Bon de livraison supprimé avec succès" });
      fetchBonsLivraison();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const handlePrintBL = (bonLivraison: BonLivraison, format: PrintFormat = "A4") => {
    const clientAddress = bonLivraison.client?.addresses?.find(addr => addr.estPrincipale) || bonLivraison.client?.addresses?.[0];

    const printData: BLPrintData = {
      id: bonLivraison.id,
      numero: bonLivraison.numero,
      date: bonLivraison.date,
      client: bonLivraison.client ? {
        nom: bonLivraison.client.nom,
        mf: bonLivraison.client.mf || undefined,
        cin: bonLivraison.client.cin || undefined,
        adresse: clientAddress?.adresse,
        addresses: clientAddress ? [clientAddress] : [],
        telephone: bonLivraison.client.telephone,
      } : undefined,
      statut: bonLivraison.statut,
      factureId: bonLivraison.factureId || undefined,
      lignes: bonLivraison.lignes.map(ligne => {
        // 🔥 Correction : Si prixVente est null, undefined ou 0, utiliser le prix du produit
        const prixVente = (ligne as any).prixVente !== null &&
          (ligne as any).prixVente !== undefined &&
          (ligne as any).prixVente !== 0
          ? (ligne as any).prixVente
          : ligne.product?.prixVente ?? 0;

        return {
          product: ligne.product ? {
            reference: ligne.product.reference,
            designation: ligne.product.designation,
          } : undefined,
          home: ligne.home ? { nom: ligne.home.nom } : undefined,
          quantite: ligne.quantite,
          prixUnitaire: prixVente,
          totalLigne: ligne.quantite * prixVente,
        };
      }),
      totalHT: bonLivraison.montantHT || 0,
      totalTVA: bonLivraison.montantTVA || 0,
      totalTTC: bonLivraison.montantTotal || 0,
      resteCredit: bonLivraison.resteCredit || 0,
      montantCredit: bonLivraison.montantCredit || 0,
      remise: bonLivraison.remise,
    };

    const htmlSociete = generateBLPrintHTML(printData, format, 'SOCIETE');
    const htmlClient = generateBLPrintHTML(printData, format, 'CLIENT');

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Impression BL - ${bonLivraison.numero}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; }
          .print-copy { page-break-after: always; margin: 0; padding: 20px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="print-copy">${htmlSociete}</div>
        <div class="print-copy">${htmlClient}</div>
        <script>
          window.onload = () => {
            setTimeout(() => { window.print(); setTimeout(() => window.close(), 1000); }, 500);
          };
        </script>
      </body>
      </html>
    `);
      printWindow.document.close();
    }
  };

  const handlePrintTicket = (bonLivraison: BonLivraison, copieType: 'SOCIETE' | 'CLIENT') => {
    const clientAddress = bonLivraison.client?.addresses?.find(addr => addr.estPrincipale) || bonLivraison.client?.addresses?.[0];

    const printData: BLPrintData = {
      id: bonLivraison.id,
      numero: bonLivraison.numero,
      date: bonLivraison.date,
      client: bonLivraison.client ? {
        nom: bonLivraison.client.nom,
        mf: bonLivraison.client.mf || undefined,
        cin: bonLivraison.client.cin || undefined,
        addresses: clientAddress ? [clientAddress] : [],
        telephone: bonLivraison.client.telephone,
      } : undefined,
      statut: bonLivraison.statut,
      factureId: bonLivraison.factureId || undefined,
      lignes: bonLivraison.lignes.map(ligne => {
        // 🔥 Correction : Si prixVente est null, undefined ou 0, utiliser le prix du produit
        const prixVente = (ligne as any).prixVente !== null &&
          (ligne as any).prixVente !== undefined &&
          (ligne as any).prixVente !== 0
          ? (ligne as any).prixVente
          : ligne.product?.prixVente ?? 0;

        return {
          product: ligne.product ? {
            reference: ligne.product.reference,
            designation: ligne.product.designation,
          } : undefined,
          home: ligne.home ? { nom: ligne.home.nom } : undefined,
          quantite: ligne.quantite,
          prixUnitaire: prixVente,
          totalLigne: ligne.quantite * prixVente,
        };
      }),
      totalHT: bonLivraison.montantHT || 0,
      totalTVA: bonLivraison.montantTVA || 0,
      totalTTC: bonLivraison.montantTotal || 0,
      resteCredit: bonLivraison.resteCredit || 0,
      montantCredit: bonLivraison.montantCredit || 0,
      remise: bonLivraison.remise,
    };

    const html = generateBLPrintHTML(printData, "TICKET", copieType);
    const title = copieType === 'SOCIETE' ? 'Société' : 'Client';

    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (printWindow) {
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket BL ${title} - ${bonLivraison.numero}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 10px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        ${html}
        <script>
          window.onload = () => {
            setTimeout(() => { window.print(); setTimeout(() => window.close(), 500); }, 500);
          };
        </script>
      </body>
      </html>
    `);
      printWindow.document.close();
    }
  };

  const handlePrintTicket2 = (bonLivraison: BonLivraison, copieType: 'SOCIETE' | 'CLIENT') => {
    const clientAddress = bonLivraison.client?.addresses?.find(addr => addr.estPrincipale) || bonLivraison.client?.addresses?.[0];

    const printData: BLPrintData = {
      id: bonLivraison.id,
      numero: bonLivraison.numero,
      date: bonLivraison.date,
      client: bonLivraison.client ? {
        nom: bonLivraison.client.nom,
        mf: bonLivraison.client.mf || undefined,
        cin: bonLivraison.client.cin || undefined,
        addresses: clientAddress ? [clientAddress] : [],
        telephone: bonLivraison.client.telephone,
      } : undefined,
      statut: bonLivraison.statut,
      factureId: bonLivraison.factureId || undefined,
      lignes: bonLivraison.lignes.map(ligne => {
        // 🔥 Correction : Si prixVente est null, undefined ou 0, utiliser le prix du produit
        const prixVente = (ligne as any).prixVente !== null &&
          (ligne as any).prixVente !== undefined &&
          (ligne as any).prixVente !== 0
          ? (ligne as any).prixVente
          : ligne.product?.prixVente ?? 0;

        return {
          product: ligne.product ? {
            reference: ligne.product.reference,
            designation: ligne.product.designation,
          } : undefined,
          home: ligne.home ? { nom: ligne.home.nom } : undefined,
          quantite: ligne.quantite,
          prixUnitaire: prixVente,
          totalLigne: ligne.quantite * prixVente,
        };
      }),
      totalHT: bonLivraison.montantHT || 0,
      totalTVA: bonLivraison.montantTVA || 0,
      totalTTC: bonLivraison.montantTotal || 0,
      resteCredit: bonLivraison.resteCredit || 0,
      montantCredit: bonLivraison.montantCredit || 0,
      remise: bonLivraison.remise,
    };

    const html = generateBLPrintHTML(printData, "TICKET", copieType);
    const title = copieType === 'SOCIETE' ? 'Société' : 'Client';

    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Ticket BL ${title} - ${bonLivraison.numero}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; background: #fff; margin: 0; padding: 10px; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `);
      newWindow.document.close();
    }
  };

  const columns = [
    {
      key: "select" as const,
      header: "",
      render: (item: BonLivraison) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={selectedBLs.includes(item.id)}
            onCheckedChange={() => toggleBLSelection(item.id)}
            disabled={item.statut !== StatutBL.LIVRE || !!item.factureId}
          />
        </div>
      ),
    },
    { key: "numero" as const, header: "Numéro", render: (item: BonLivraison) => <span className="font-mono text-sm font-medium">{item.numero}</span> },
    { key: "date" as const, header: "Date", render: (item: BonLivraison) => <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span> },
    { key: "client" as const, header: "Client", render: (item: BonLivraison) => <span className="font-medium">{item.client?.nom || "N/A"}</span> },
    { key: "articles" as const, header: "Articles", render: (item: BonLivraison) => <Badge variant="secondary">{item.lignes.length} article(s)</Badge> },
    { key: "factureId" as const, header: "Facture", render: (item: BonLivraison) => <span className={cn("text-sm", item.factureId ? "text-primary" : "text-muted-foreground")}>{item.factureId ? "Liée" : "Non liée"}</span> },
    { key: "totalttc" as const, header: "Total TTC", render: (item: BonLivraison) => <span className="font-medium">{formatCurrency(item.montantTotal)}</span> },
    { key: "chauffeur" as const, header: "Chauffeur", render: (item: BonLivraison) => <span className="text-sm">{item.chauffeur?.nom || "Admin"}</span> },

    {
      key: "whatsapp" as const,
      header: "WhatsApp",
      render: (item: BonLivraison) => {
        // Vérifier si le BL est en mode crédit
        const isCredit = item.montantCredit && item.montantCredit > 0;

        return (
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "gap-2 h-8",
              isCredit ? "bg-green-50 hover:bg-green-100 border-green-200" : "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
              if (isCredit) {
                handleSendWhatsApp(item);
              } else {
                toast({
                  title: "Information",
                  description: "WhatsApp disponible uniquement pour les BL en mode crédit",
                });
              }
            }}
            disabled={isSendingWhatsApp === item.id || !isCredit}
            title={isCredit ? "Envoyer le message WhatsApp" : "BL non crédit"}
          >
            {isSendingWhatsApp === item.id ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
            ) : (
              <MessageCircle className={cn("h-4 w-4", isCredit ? "text-green-600" : "text-gray-400")} />
            )}
            {isCredit && <span className="text-xs">WhatsApp</span>}
          </Button>
        );
      },
    },
    {
      key: "impression" as const,
      header: "Impression",
      render: (item: BonLivraison) => (
        <div className="flex items-center gap-1">
          {/* Bouton A4 - 2 copies */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePrintBL(item)}
            title="Imprimer format A4 (2 copies)"
          >
            <Printer className="h-4 w-4" />
          </Button>
          {/* Bouton Ticket Société */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-blue-50 hover:bg-blue-100"
              onClick={() => handlePrintTicket(item, 'SOCIETE')}
              title="Ticket - Copie Société"
            >
              <Receipt className="h-4 w-4 text-blue-600" />
            </Button>
          {/* Bouton Ticket Client */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-green-50 hover:bg-green-100"
              onClick={() => handlePrintTicket(item, 'CLIENT')}
              title="Ticket - Copie Client"
            >
              <Receipt className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-blue-50 hover:bg-blue-100"
              onClick={() => handlePrintTicket2(item, 'SOCIETE')}
              title="Ticket - Copie Société"
            >
              <Receipt className="h-4 w-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 bg-green-50 hover:bg-green-100"
              onClick={() => handlePrintTicket2(item, 'CLIENT')}
              title="Ticket - Copie Client"
            >
              <Receipt className="h-4 w-4 text-green-600" />
            </Button>
        </div>
      ),
    },
    {
      key: "actions" as const,
      header: "Actions",
      render: (item: BonLivraison) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => router.push(`/bons-livraison/${item.id}`)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          {userRole === "ADMIN" && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/bons-livraison/${item.id}/edit`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
          {userRole === "ADMIN" && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDeleteBL(item.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Bons de Livraison" subtitle="Gestion des bons de livraison" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {userRole === "ADMIN" && (
              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      Filtres
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={resetFilters}>
                      Réinitialiser
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Date du */}
                    <div className="space-y-2">
                      <Label>Date du</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempDateDebut ? formatDate(tempDateDebut) : <span>Sélectionner</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={tempDateDebut}
                            onSelect={(date) => {
                              console.log('Date début sélectionnée:', date);
                              setTempDateDebut(date);
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Date au */}
                    <div className="space-y-2">
                      <Label>Date au</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempDateFin ? formatDate(tempDateFin) : <span>Sélectionner</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={tempDateFin} onSelect={setTempDateFin} initialFocus />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Client */}
                    <div className="space-y-2">
                      <Label>Client</Label>
                      {isMounted && (
                        <Select2
                          options={[
                            { value: "all", label: "Tous les clients" },
                            ...clients.map(client => ({ value: client.id, label: `${client.nom} - ${client.telephone}` }))
                          ]}
                          value={tempSelectedFilterClient || { value: "all", label: "Tous les clients" }}
                          onChange={(selected: any) => {
                            setTempSelectedFilterClient(selected);
                            setTempClientId(selected?.value || "all");
                          }}
                          placeholder="Rechercher un client..."
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                          styles={selectStyles}
                        />
                      )}
                    </div>

                    {/* Entrepôt */}
                    <div className="space-y-2">
                      <Label>Entrepôt</Label>
                      <Select value={tempHome} onValueChange={setTempHome}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les entrepôts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les entrepôts</SelectItem>
                          {homes.map(home => (
                            <SelectItem key={home.id} value={home.id}>{home.nom}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Bouton Appliquer */}
                  <div className="flex justify-end mt-4 gap-2">
                    <Button onClick={applyFilters}>
                      Appliquer les filtres
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Filtres */}


            {/* BL Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Liste des Bons de Livraison
                </CardTitle>
                <Button onClick={() => router.push('/bons-livraison/creer')}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau BL
                </Button>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-center mb-4">
                      {userRole === "ADMIN" && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={toggleAllBLs} disabled={filteredBons.length === 0}>
                              {selectedBLs.length === filteredBons.filter(bl => !bl.factureId).length && filteredBons.length > 0 ? (
                                <CheckSquare className="h-4 w-4 mr-2" />
                              ) : (
                                <Square className="h-4 w-4 mr-2" />
                              )}
                              {selectedBLs.length === filteredBons.filter(bl => !bl.factureId).length && filteredBons.length > 0
                                ? "Désélectionner tout"
                                : "Sélectionner tout"}
                            </Button>
                            {selectedBLs.length > 0 && (
                              <Button size="sm" onClick={handleCreateFactureFromSelectedBLs} className="bg-blue-600 hover:bg-blue-700">
                                <FileText className="h-4 w-4 mr-2" />
                                Créer facture ({selectedBLs.length} BL)
                              </Button>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {selectedBLs.length} BL sélectionné(s)
                          </div>
                        </div>
                      )}
                    </div>
                    <DataTable data={filteredBons} columns={columns} searchPlaceholder="Rechercher un BL..." searchKey="numero" />
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}