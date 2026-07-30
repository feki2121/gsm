"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Select2 from "react-select";

import {
  ReglementClient,
  formatCurrency,
  formatDate,
  typeReglementLabels,
  statutReglementLabels,
  TypeReglement,
  StatutReglement,
} from "@/lib/types";
import { Plus, CreditCard, Eye, Banknote, FileText, CalendarClock, CheckCircle, Search, RefreshCw, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Facture {
  id: string;
  numero: string;
  totalTTC: number;
  statut: string;
}

// Ajoutez cette interface après les imports
interface PaiementDetail {
  type: TypeReglement;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
}



export default function ReglementsClientsPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const [reglements, setReglements] = useState<ReglementClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [factures, setFactures] = useState<Facture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [formData, setFormData] = useState({
    clientId: "",
    montant: "",
    typeReglement: "ESPECE",
    reference: "",
    banque: "",
    echeance: "",
    factureIds: [] as string[],
    statut: "EN_ATTENTE",
  });
  // Ajoutez ces états après les autres useState
  const [activeFilters, setActiveFilters] = useState({
    dateDebut: '',
    dateFin: '',
    clientId: '',  // ← Changé: clientId au lieu de clientNom
    typeReglement: 'TOUS',
    statut: 'TOUS',
  });

  const [tempFilters, setTempFilters] = useState({
    dateDebut: '',
    dateFin: '',
    clientId: '',  // ← Changé: clientId au lieu de clientNom
    typeReglement: 'TOUS',
    statut: 'TOUS',
  });
  const [selectedFilterClient, setSelectedFilterClient] = useState<{ value: string; label: string } | null>(null);

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  // Dans le composant, ajoutez ces states
  const [paiementsMixte, setPaiementsMixte] = useState<PaiementDetail[]>([
    { type: TypeReglement.ESPECE, montant: 0 }
  ]);
  const [resteAPayer, setResteAPayer] = useState(0);
  const [montantTotal, setMontantTotal] = useState(0);
  const [selectedReglementId, setSelectedReglementId] = useState<string | null>(null);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number>(0);
  const [isEncaissementDialogOpen, setIsEncaissementDialogOpen] = useState(false);
  const [currentDetails, setCurrentDetails] = useState<any[]>([]);
  const [montantAEncaisser, setMontantAEncaisser] = useState<number>(0);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);

  // Dans votre composant
  const router = useRouter();
  // Nouvelle fonction pour ouvrir le dialogue de sélection

  useEffect(() => {
    fetchReglements();
    fetchClients();
    fetchFactures();
  }, [pagination.page, activeFilters]);
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

  // Ajoutez cet état pour gérer le client sélectionné
  const [selectedClientOption, setSelectedClientOption] = useState<{ value: string; label: string } | null>(null);
  const handleOpenEncaissement = async (reglement: ReglementClient) => {
    console.log("Opening encaissement for:", reglement);

    if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
      try {
        const details = JSON.parse(reglement.detailsMixte);
        console.log("Parsed details:", details);

        // Filtrer les éléments non ENTIÈREMENT encaissés (exclure espèces ET CREDIT)
        const nonEncaisse = details.filter((d: any) => {
          if (d.type === 'ESPECE') return false;
          if (d.type === 'CREDIT') return false; // ← EXCLURE CREDIT
          const reste = d.montant - (d.montantEncaisse || 0);
          return reste > 0;
        });

        console.log("Non encaisse:", nonEncaisse);

        if (nonEncaisse.length === 0) {
          toast({
            title: "Information",
            description: "Tous les paiements sont déjà encaissés",
            variant: "default",
          });
          return;
        }

        setSelectedReglementId(reglement.id);
        setCurrentDetails(nonEncaisse);
        setSelectedDetailIndex(0);
        setIsEncaissementDialogOpen(true);
      } catch (error) {
        console.error("Error parsing details:", error);
        toast({
          title: "Erreur",
          description: "Impossible de lire les détails du paiement",
          variant: "destructive",
        });
      }
    } else if (reglement.typeReglement !== 'CREDIT') { // ← EXCLURE CREDIT
      // Pour les paiements simples
      await encaisserReglement(reglement.id);
    } else {
      toast({
        title: "Information",
        description: "Les paiements par crédit ne peuvent pas être encaissés",
        variant: "default",
      });
    }
  };

  // Fonction d'encaissement avec sélection du type

  const encaisserAvecSelection = async () => {
    console.log("Encaissement avec selection - reglementId:", selectedReglementId, "detailIndex:", selectedDetailIndex, "montant:", montantAEncaisser);

    if (!selectedReglementId) {
      toast({
        title: "Erreur",
        description: "Aucun règlement sélectionné",
        variant: "destructive",
      });
      return;
    }

    if (montantAEncaisser <= 0) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir un montant à encaisser",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(`/api/reglements-clients/${selectedReglementId}/encaisser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detailIndex: selectedDetailIndex,
          montant: montantAEncaisser
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de l'encaissement");
      }

      toast({
        title: "Succès",
        description: result.message || "Paiement encaissé avec succès",
      });

      setIsEncaissementDialogOpen(false);
      setSelectedReglementId(null);
      setSelectedDetailIndex(0);
      setCurrentDetails([]);
      setMontantAEncaisser(0);
      setSelectedDetail(null);
      fetchReglements();
    } catch (error) {
      console.error("Error encaissant:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'encaisser",
        variant: "destructive",
      });
    }
  };

  // Fonction d'encaissement simple (pour les paiements non mixtes)

  // Fonction d'encaissement simple (pour les paiements non mixtes)
  const encaisserReglement = async (id: string) => {
    try {
      // Envoyer une requête sans body (juste POST)
      const response = await fetch(`/api/reglements-clients/${id}/encaisser`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // Body vide mais valide
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de l'encaissement");
      }

      toast({
        title: "Succès",
        description: data.message || "Règlement encaissé avec succès",
      });

      fetchReglements();
    } catch (error) {
      console.error("Error encaissant:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'encaisser",
        variant: "destructive",
      });
    }
  };

  const ajouterLignePaiement = () => {
    setPaiementsMixte([...paiementsMixte, { type: TypeReglement.CHEQUE, montant: 0 }]);
  };

  // Ajoutez cette fonction pour supprimer une ligne
  const supprimerLignePaiement = (index: number) => {
    const newPaiements = paiementsMixte.filter((_, i) => i !== index);
    setPaiementsMixte(newPaiements);
  };

  // Ajoutez cette fonction pour mettre à jour une ligne
  const updatePaiement = (index: number, field: keyof PaiementDetail, value: any) => {
    const newPaiements = [...paiementsMixte];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setPaiementsMixte(newPaiements);

    // Recalculer le total
    const total = newPaiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    setMontantTotal(total);
  };

  // Fonction pour afficher les détails d'un paiement mixte

  const getDetailsMixteDisplay = (reglement: ReglementClient) => {
    if (!reglement.detailsMixte) return null;

    try {
      const details = JSON.parse(reglement.detailsMixte);

      if (!Array.isArray(details)) return null;

      // FILTRER POUR EXCLURE CREDIT
      const filteredDetails = details.filter((d: any) => d.type !== 'CREDIT');

      if (filteredDetails.length === 0) return null;

      return (
        <div className="text-xs space-y-1">
          {filteredDetails.map((d: any, idx: number) => {
            const encaisse = d.montantEncaisse || 0;
            const reste = d.montant - encaisse;
            const estPartiel = encaisse > 0 && reste > 0;

            return (
              <div key={idx} className="flex gap-2 items-center flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {typeReglementLabels[d.type as TypeReglement] || d.type}
                </Badge>
                <span>{formatCurrency(d.montant)}</span>
                {encaisse > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">
                    Encaissé: {formatCurrency(encaisse)}
                  </Badge>
                )}
                {estPartiel && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    Reste: {formatCurrency(reste)}
                  </Badge>
                )}
                {d.statut === 'EN_ATTENTE' && encaisse === 0 && (
                  <Badge className="bg-yellow-500 text-white text-xs">En attente</Badge>
                )}
              </div>
            );
          })}
        </div>
      );
    } catch {
      return null;
    }
  };

  // useEffect(() => {
  //   fetchReglements();
  //   fetchClients();
  //   fetchFactures();
  // }, [currentPage]);


  const fetchReglements = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', pagination.page.toString());
      params.append('limit', pagination.limit.toString());

      if (activeFilters.dateDebut) params.append('dateDebut', activeFilters.dateDebut);
      if (activeFilters.dateFin) params.append('dateFin', activeFilters.dateFin);
      if (activeFilters.clientId) params.append('clientId', activeFilters.clientId); // ← Envoyer l'ID
      if (activeFilters.typeReglement && activeFilters.typeReglement !== 'TOUS') params.append('typeReglement', activeFilters.typeReglement);
      if (activeFilters.statut && activeFilters.statut !== 'TOUS') params.append('statut', activeFilters.statut);

      const response = await fetch(`/api/reglements-clients?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setReglements(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination.total,
        pages: data.pagination.pages,
      }));
    } catch (error) {
      console.error("Error fetching reglements:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les règlements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [pagination.page, activeFilters, toast]);


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

  const fetchFactures = async () => {
    try {
      const response = await fetch("/api/factures?limit=100&statut=IMPAYEE,PARTIELLE");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFactures(data.data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    // Filtrer les lignes avec montant > 0
    const paiementsValides = paiementsMixte.filter(p => p.montant > 0);

    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un paiement", variant: "destructive" });
      return;
    }

    const total = paiementsValides.reduce((sum, p) => sum + p.montant, 0);

    // Si un seul mode de paiement
    if (paiementsValides.length === 1) {
      const seulPaiement = paiementsValides[0];
      try {
        const response = await fetch("/api/reglements-clients", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: formData.clientId,
            montant: total,
            typeReglement: seulPaiement.type,
            reference: seulPaiement.reference,
            banque: seulPaiement.banque,
            echeance: seulPaiement.echeance,
            statut: seulPaiement.type === "ESPECE" ? "ENCAISSE" : "EN_ATTENTE",
            factureIds: formData.factureIds,
          }),
        });
        if (!response.ok) throw new Error();
        toast({ title: "Succès", description: "Règlement enregistré" });
        setIsDialogOpen(false);
        resetForm();
        fetchReglements();
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible d'enregistrer", variant: "destructive" });
      }
      return;
    }

    // Paiement mixte
    try {
      const response = await fetch("/api/reglements-clients/mixte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: formData.clientId,
          montantTotal: total,
          detailsMixte: paiementsValides,
          factureIds: formData.factureIds,
        }),
      });
      if (!response.ok) throw new Error();
      toast({ title: "Succès", description: "Paiement mixte enregistré" });
      setIsDialogOpen(false);
      resetForm();
      fetchReglements();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({ clientId: "", montant: "", typeReglement: "ESPECE", reference: "", banque: "", echeance: "", factureIds: [], statut: "EN_ATTENTE" });
    setPaiementsMixte([{ type: TypeReglement.ESPECE, montant: 0 }]);
    setMontantTotal(0);
  };

  const getTypeIcon = (type: TypeReglement) => {
    switch (type) {
      case TypeReglement.ESPECE:
        return <Banknote className="h-4 w-4" />;
      case TypeReglement.CHEQUE:
        return <FileText className="h-4 w-4" />;
      default:
        return <CalendarClock className="h-4 w-4" />;
    }
  };

  const getStatutColor = (statut: StatutReglement) => {
    switch (statut) {
      case StatutReglement.ENCAISSE:
      case StatutReglement.PAYE:
        return "bg-green-500 text-white";
      case StatutReglement.PARTIELLE:
        return "bg-blue-500 text-white";
      case StatutReglement.REJETE:
        return "bg-red-500 text-white";
      case StatutReglement.EN_ATTENTE:
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (item: ReglementClient) => (
        <span className="text-muted-foreground">{formatDate(item.date)}</span>
      ),
    },
    {
      key: "client.nom",
      header: "Client",
      render: (item: ReglementClient) => (
        <span className="font-medium">{item.client?.nom}</span>
      ),
    },
    {
      key: "nameSecondClient",
      header: "Payeur",
      render: (item: ReglementClient) => (
        <span className="font-mono text-sm">{item.nameSecondClient || "-"}</span>
      ),
    },
    {
      key: "typeReglement",
      header: "Mode",
      render: (item: ReglementClient) => (
        <Badge variant="outline" className="flex w-fit items-center gap-1">
          {getTypeIcon(item.typeReglement)}
          {typeReglementLabels[item.typeReglement]}
        </Badge>
      ),
    },
    {
      key: "reference",
      header: "Référence",
      render: (item: ReglementClient) => (
        <span className="font-mono text-sm">{item.reference || "-"}</span>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      render: (item: ReglementClient) => (
        <span className="font-semibold">{formatCurrency(item.montant)}</span>
      ),
    },
    // ✅ AJOUTEZ CETTE NOUVELLE COLONNE ICI
    {
      key: "detailsMixte",
      header: "Détails",
      render: (item: ReglementClient) => (
        item.typeReglement === 'MIXTE' ? getDetailsMixteDisplay(item) : <span className="text-muted-foreground">-</span>
      ),
    },
    // {
    //   key: "statut",
    //   header: "Statut",
    //   render: (item: ReglementClient) => (
    //     <Badge className={getStatutColor(item.statut)}>
    //       {statutReglementLabels[item.statut]}
    //     </Badge>
    //   ),
    // },

    {
      key: "actions",
      header: "Actions",
      render: (item: ReglementClient) => {
        // Vérifier s'il reste des paiements à encaisser
        let showEncaissementButton = false;

        if (item.typeReglement === 'MIXTE' && item.detailsMixte) {
          try {
            const details = JSON.parse(item.detailsMixte);
            // Chercher s'il reste des paiements non-ESPECE et non-CREDIT à encaisser
            showEncaissementButton = details.some((d: any) => {
              if (d.type === 'ESPECE') return false;
              if (d.type === 'CREDIT') return false; // ← EXCLURE CREDIT
              const reste = d.montant - (d.montantEncaisse || 0);
              return reste > 0;
            });
          } catch (e) {
            showEncaissementButton = false;
          }
        } else {
          // Pour les paiements simples
          showEncaissementButton = (item.statut === StatutReglement.EN_ATTENTE ||
            item.statut === StatutReglement.PARTIELLE) &&
            item.typeReglement !== 'CREDIT'; // ← EXCLURE CREDIT
        }

        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`/reglements/clients/${item.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {showEncaissementButton && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-green-600 hover:text-green-700"
                onClick={() => handleOpenEncaissement(item)}
                title="Encaisser"
              >
                <CheckCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        );
      },
    }
  ];

  const totalEncaisse = reglements
    .filter((r) => r.statut === StatutReglement.ENCAISSE)
    .reduce((sum, r) => sum + r.montant, 0);

  const totalEnAttente = reglements
    .filter((r) => r.statut === StatutReglement.EN_ATTENTE)
    .reduce((sum, r) => sum + r.montant, 0);

  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setPagination(prev => ({ ...prev, page: 1 }));
  };


  const resetFilters = () => {
    const emptyFilters = {
      dateDebut: '',
      dateFin: '',
      clientId: '',
      typeReglement: 'TOUS',
      statut: 'TOUS',
    };
    setTempFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setSelectedFilterClient(null);  // ← Réinitialiser le select du filtre
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleFilterClientChange = (selected: any) => {
    setSelectedFilterClient(selected);
    setTempFilters(prev => ({ ...prev, clientId: selected?.value || '' }));
  };


  // Nombre de filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.dateDebut) count++;
    if (activeFilters.dateFin) count++;
    if (activeFilters.clientId || activeFilters.clientId) count++;
    return count;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Règlements Clients" subtitle="Gestion des encaissements clients" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <Header title="Règlements Clients" subtitle="Gestion des encaissements clients" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Summary */}
            {/* <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Règlements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{reglements.length}</div>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Encaissé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalEncaisse)}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    En Attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {formatCurrency(totalEnAttente)}
                  </div>
                </CardContent>
              </Card>
            </div> */}

            {/* Barre de filtres */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtres
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      {/* Filtre par date début */}
                      <div className="space-y-2">
                        <Label className="text-xs">Date du</Label>
                        <Input
                          type="date"
                          value={tempFilters.dateDebut}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, dateDebut: e.target.value }))}
                        />
                      </div>

                      {/* Filtre par date fin */}
                      <div className="space-y-2">
                        <Label className="text-xs">Date au</Label>
                        <Input
                          type="date"
                          value={tempFilters.dateFin}
                          onChange={(e) => setTempFilters(prev => ({ ...prev, dateFin: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs">Client</Label>
                        <Select2
                          options={clients.map(client => ({
                            value: client.id,
                            label: `${client.nom} - ${client.telephone}`
                          }))}
                          value={selectedFilterClient}
                          onChange={handleFilterClientChange}
                          placeholder="Rechercher un client..."
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={selectStyles}
                          noOptionsMessage={() => "Aucun client trouvé"}
                        />
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={resetFilters}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Réinitialiser
                      </Button>
                      <Button onClick={applyFilters}>
                        <Search className="mr-2 h-4 w-4" />
                        Appliquer les filtres
                      </Button>
                      {getActiveFiltersCount() > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {getActiveFiltersCount()} filtre(s) actif(s)
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Liste des Règlements Clients
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    {/* <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau Règlement
                    </Button> */}
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Enregistrer un Règlement Client</DialogTitle>
                      {/* <DialogDescription>
                        Enregistrez un paiement client. Les paiements en espèces sont automatiquement
                        ajoutés à la caisse du jour.
                      </DialogDescription> */}
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="clientId">Client *</Label>
                          <Select
                            value={formData.clientId}
                            onValueChange={(value) => handleSelectChange("clientId", value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.nom} - {client.telephone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="montant">Total à payer</Label>
                          <Input
                            id="montant"
                            type="text"
                            value={formatCurrency(montantTotal)}
                            disabled
                            className="bg-gray-100"
                          />
                        </div>
                      </div>
                      {/* Section Paiement Mixte */}
                      <div className="space-y-4">
                        <Label>Détails du paiement</Label>
                        <div className="space-y-3">
                          {paiementsMixte.map((paiement, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-2">
                              <div className="flex justify-between items-center">
                                <span className="text-sm font-medium">Paiement #{index + 1}</span>
                                {paiementsMixte.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => supprimerLignePaiement(index)}
                                    className="text-red-600 h-6 w-6 p-0"
                                  >
                                    ✕
                                  </Button>
                                )}
                              </div>
                              <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                  <Label className="text-xs">Mode</Label>
                                  <Select
                                    value={paiement.type}
                                    onValueChange={(value) => updatePaiement(index, 'type', value as TypeReglement)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="ESPECE">Espèce</SelectItem>
                                      <SelectItem value="CHEQUE">Chèque</SelectItem>
                                      <SelectItem value="TRAITE_BANCAIRE">Traite bancaire</SelectItem>
                                      <SelectItem value="CREDIT">Crédit</SelectItem>
                                      <SelectItem value="VIREMENT">Virement</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label className="text-xs">Montant</Label>
                                  <Input
                                    type="number"
                                    step="0.001"
                                    placeholder="0.000"
                                    value={paiement.montant || ''}
                                    onChange={(e) => updatePaiement(index, 'montant', parseFloat(e.target.value) || 0)}
                                  />
                                </div>
                                {(paiement.type === 'CHEQUE' || paiement.type === 'TRAITE_BANCAIRE' || paiement.type === 'TRAITE_DOMICILE') && (
                                  <>
                                    <div>
                                      <Label className="text-xs">Référence</Label>
                                      <Input
                                        placeholder="Numéro"
                                        value={paiement.reference || ''}
                                        onChange={(e) => updatePaiement(index, 'reference', e.target.value)}
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Banque</Label>
                                      <Input
                                        placeholder="Banque"
                                        value={paiement.banque || ''}
                                        onChange={(e) => updatePaiement(index, 'banque', e.target.value)}
                                      />
                                    </div>
                                    {(paiement.type === 'TRAITE_BANCAIRE' || paiement.type === 'TRAITE_DOMICILE') && (
                                      <div>
                                        <Label className="text-xs">Échéance</Label>
                                        <Input
                                          type="date"
                                          value={paiement.echeance || ''}
                                          onChange={(e) => updatePaiement(index, 'echeance', e.target.value)}
                                        />
                                      </div>
                                    )}

                                  </>
                                )}
                                {paiement.type === 'VIREMENT' && (
                                  <div>
                                    <Label className="text-xs">Référence virement</Label>
                                    <Input
                                      placeholder="Référence"
                                      value={paiement.reference || ''}
                                      onChange={(e) => updatePaiement(index, 'reference', e.target.value)}
                                    />
                                  </div>
                                )}
                                {paiement.type === 'CREDIT' && (
                                  <div>
                                    <Label className="text-xs">Référence virement</Label>
                                    <Input
                                      placeholder="Référence"
                                      value={paiement.reference || ''}
                                      onChange={(e) => updatePaiement(index, 'reference', e.target.value)}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}

                          <Button type="button" variant="outline" size="sm" onClick={ajouterLignePaiement} className="w-full">
                            + Ajouter un autre mode de paiement
                          </Button>

                          {/* Total */}
                          <div className="pt-3 border-t">
                            <div className="flex justify-between font-semibold">
                              <span>Total à payer :</span>
                              <span>{formatCurrency(montantTotal)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      {(formData.typeReglement === "CHEQUE" ||
                        formData.typeReglement === "TRAITE_BANCAIRE" ||
                        formData.typeReglement === "TRAITE_DOMICILE") && (
                          <>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div className="space-y-2">
                                <Label htmlFor="banque">Banque</Label>
                                <Input
                                  id="banque"
                                  placeholder="Nom de la banque"
                                  value={formData.banque}
                                  onChange={handleInputChange}
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="echeance">Date d'échéance</Label>
                                <Input
                                  id="echeance"
                                  type="date"
                                  value={formData.echeance}
                                  onChange={handleInputChange}
                                />
                              </div>
                            </div>
                          </>
                        )}
                      <div className="space-y-2">
                        <Label>Factures associées (optionnel)</Label>
                        <Select
                          onValueChange={(value) => {
                            const newFactureIds = formData.factureIds.includes(value)
                              ? formData.factureIds.filter(id => id !== value)
                              : [...formData.factureIds, value];
                            handleSelectChange("factureIds", newFactureIds as any);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une facture" />
                          </SelectTrigger>
                          <SelectContent>
                            {factures.map((facture) => (
                              <SelectItem key={facture.id} value={facture.id}>
                                {facture.numero} - {formatCurrency(facture.totalTTC)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formData.factureIds.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm text-muted-foreground">
                              {formData.factureIds.length} facture(s) sélectionnée(s)
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button type="submit">Enregistrer</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={reglements}
                  columns={columns}
                  searchPlaceholder="Rechercher..."
                  searchKey="reference"
                />
                {/* Ajoutez cette section après le DataTable */}
                {reglements.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} sur {pagination.total} règlements
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        disabled={pagination.page === 1}
                      >
                        Précédent
                      </Button>
                      <span className="text-sm">
                        Page {pagination.page} / {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        disabled={pagination.page === pagination.pages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>

              {/* Dialog pour choisir quel élément encaisser */}

              <Dialog open={isEncaissementDialogOpen} onOpenChange={(open) => {
                console.log("Dialog state changing to:", open);
                setIsEncaissementDialogOpen(open);
                if (!open) {
                  setSelectedReglementId(null);
                  setSelectedDetailIndex(0);
                  setCurrentDetails([]);
                  setMontantAEncaisser(0);
                  setSelectedDetail(null);
                }
              }}>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Encaisser un paiement</DialogTitle>
                    <DialogDescription>
                      Sélectionnez le mode de paiement et saisissez le montant à encaisser
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Paiements en attente</Label>
                      {currentDetails.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground border rounded-lg">
                          Aucun paiement en attente
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {currentDetails.map((detail, idx) => {
                            const reste = detail.montant - (detail.montantEncaisse || 0);
                            const estPartiel = (detail.montantEncaisse || 0) > 0 && reste > 0;
                            return (
                              <div
                                key={idx}
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedDetailIndex === idx
                                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                onClick={() => {
                                  setSelectedDetailIndex(idx);
                                  setSelectedDetail(detail);
                                  setMontantAEncaisser(reste);
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    {detail.type === 'CHEQUE' && <FileText className="h-4 w-4 text-blue-500" />}
                                    {(detail.type === 'TRAITE_BANCAIRE' || detail.type === 'TRAITE_DOMICILE') && (
                                      <CalendarClock className="h-4 w-4 text-purple-500" />
                                    )}
                                    {detail.type === 'VIREMENT' && <CreditCard className="h-4 w-4 text-indigo-500" />}
                                    {detail.type === 'CREDIT' && <CreditCard className="h-4 w-4 text-orange-500" />}
                                    <span className="font-medium">
                                      {typeReglementLabels[detail.type as TypeReglement] || detail.type}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-lg">{formatCurrency(detail.montant)}</span>
                                </div>
                                {(detail.montantEncaisse || 0) > 0 && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Déjà encaissé: </span>
                                    <span className="text-green-600 font-medium">{formatCurrency(detail.montantEncaisse)}</span>
                                    <span className="text-muted-foreground mx-1">/</span>
                                    <span>{formatCurrency(detail.montant)}</span>
                                  </div>
                                )}
                                {estPartiel && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Reste à encaisser: </span>
                                    <span className="text-blue-600 font-medium">{formatCurrency(reste)}</span>
                                  </div>
                                )}
                                {detail.reference && (
                                  <p className="text-xs text-muted-foreground mt-2">
                                    <span className="font-medium">Réf:</span> {detail.reference}
                                  </p>
                                )}
                                {detail.echeance && (
                                  <p className="text-xs text-muted-foreground">
                                    <span className="font-medium">Échéance:</span> {formatDate(detail.echeance)}
                                  </p>
                                )}
                                {selectedDetailIndex === idx && (
                                  <div className="mt-2 text-xs text-green-600 font-medium">
                                    ✓ Sélectionné
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Champ pour saisir le montant à encaisser */}
                    {selectedDetail && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label>Montant à encaisser</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={montantAEncaisser}
                          onChange={(e) => setMontantAEncaisser(parseFloat(e.target.value) || 0)}
                          className="text-right font-medium"
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {formatCurrency(selectedDetail.montant - (selectedDetail.montantEncaisse || 0))}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsEncaissementDialogOpen(false);
                        setSelectedReglementId(null);
                        setSelectedDetailIndex(0);
                        setCurrentDetails([]);
                        setMontantAEncaisser(0);
                        setSelectedDetail(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={encaisserAvecSelection}
                      disabled={currentDetails.length === 0 || montantAEncaisser <= 0}
                    >
                      Encaisser {montantAEncaisser > 0 ? formatCurrency(montantAEncaisser) : ''}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}