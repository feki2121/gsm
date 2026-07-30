"use client";

import Select2 from "react-select";
import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  typeReglementLabels,
  statutReglementLabels,
  TypeReglement,
  StatutReglement,
} from "@/lib/types";
import { Plus, Wallet, Eye, Banknote, FileText, CalendarClock, CheckCircle, Loader2, Clock, CreditCard, Filter, RefreshCw, Search } from "lucide-react";
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

type OptionType = {
  value: string;
  label: string;
};

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface ReglementFournisseur {
  id: string;
  date: string;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  montant: number;
  typeReglement: TypeReglement;
  reference: string | null;
  statut: StatutReglement;
  echeance: string | null;
  banque: string | null;
  domiciliation: string | null;
  detailsMixte: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PaiementDetail {
  type: string;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  statut?: string;
}

interface PaymentItem {
  id: string;
  parentId: string;
  detailIndex?: number;
  type: string;
  montant: number;
  montantPaye?: number;
  reference: string | null;
  banque: string | null;
  echeance: string | null;
  statut: string;
  fournisseur?: Fournisseur;
  isDetail: boolean;
}

export default function ReglementsFournisseursPage() {
  const { sidebarClasses } = useSidebar();
  const [isMounted, setIsMounted] = useState(false);
  const [filterFournisseurOptions, setFilterFournisseurOptions] = useState<OptionType[]>([]);
  const [isLoadingFournisseursFilter, setIsLoadingFournisseursFilter] = useState(false);

  const [reglements, setReglements] = useState<ReglementFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paiementInProgress, setPaiementInProgress] = useState<string | null>(null);
  const [isPaiementDialogOpen, setIsPaiementDialogOpen] = useState(false);
  const [selectedPaiement, setSelectedPaiement] = useState<PaymentItem | null>(null);
  const [montantAPayer, setMontantAPayer] = useState(0);
  // Ajoutez ces états après les autres useState
  const [currentDetails, setCurrentDetails] = useState<any[]>([]);
  const [selectedDetailIndex, setSelectedDetailIndex] = useState<number>(0);
  const [selectedDetail, setSelectedDetail] = useState<any>(null);
  // État pour les paiements mixtes
  const [paiementsMixte, setPaiementsMixte] = useState<PaiementDetail[]>([
    { type: "ESPECE", montant: 0 }
  ]);
  const [montantTotal, setMontantTotal] = useState(0);

  const [activeFilters, setActiveFilters] = useState({
    dateDebut: '',
    dateFin: '',
    fournisseurNom: '',
    typeReglement: 'TOUS',
    statut: 'TOUS',
  });

  const [tempFilters, setTempFilters] = useState({
    dateDebut: '',
    dateFin: '',
    fournisseurNom: '',
    typeReglement: 'TOUS',
    statut: 'TOUS',
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [formData, setFormData] = useState({
    fournisseurId: "",
    typeReglement: "ESPECE",
    reference: "",
    banque: "",
    echeance: "",
  });
  useEffect(() => {
    setIsMounted(true);
  }, []);


  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const { toast } = useToast();

  // Charger les fournisseurs pour le filtre
  const loadFournisseursForFilter = async () => {
    setIsLoadingFournisseursFilter(true);
    try {
      const response = await fetch("/api/fournisseurs?limit=10000");
      const data = await response.json();
      const options = (data.data || []).map((f: Fournisseur) => ({
        value: f.nom,
        label: `${f.nom} - ${f.telephone}`
      }));
      setFilterFournisseurOptions(options);
    } catch (error) {
      console.error("Error loading fournisseurs for filter:", error);
    } finally {
      setIsLoadingFournisseursFilter(false);
    }
  };
  const fetchReglements = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', currentPage.toString());
      params.append('limit', '10000');

      if (activeFilters.dateDebut) params.append('dateDebut', activeFilters.dateDebut);
      if (activeFilters.dateFin) params.append('dateFin', activeFilters.dateFin);
      if (activeFilters.fournisseurNom) params.append('fournisseurNom', activeFilters.fournisseurNom);
      if (activeFilters.typeReglement && activeFilters.typeReglement !== 'TOUS') params.append('typeReglement', activeFilters.typeReglement);
      if (activeFilters.statut && activeFilters.statut !== 'TOUS') params.append('statut', activeFilters.statut);

      const response = await fetch(`/api/reglements-fournisseurs?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setReglements(data.data || []);
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
  }, [currentPage, activeFilters, toast]);

  // Effet pour charger les données quand la page ou les filtres actifs changent
  useEffect(() => {
    fetchReglements();
    loadFournisseursForFilter();
  }, []);
  useEffect(() => {
    if (!isLoading) {
      fetchReglements();
    }
  }, [activeFilters]);
  // Fonction pour appliquer les filtres
  const applyFilters = () => {
    console.log("Applying filters:", tempFilters); // Debug
    setActiveFilters({ ...tempFilters });
    setCurrentPage(1);
  };

  // Fonction pour réinitialiser les filtres
  const resetFilters = () => {
    const emptyFilters = {
      dateDebut: '',
      dateFin: '',
      fournisseurNom: '',
      typeReglement: 'TOUS',
      statut: 'TOUS',
    };
    setTempFilters(emptyFilters);
    setActiveFilters(emptyFilters);
    setCurrentPage(1);
  };

  // Fonction pour effacer un filtre spécifique
  const clearFilter = (filterName: keyof typeof tempFilters) => {
    const newTempFilters = { ...tempFilters };
    if (filterName === 'typeReglement' || filterName === 'statut') {
      newTempFilters[filterName] = 'TOUS';
    } else {
      newTempFilters[filterName] = '';
    }
    setTempFilters(newTempFilters);

    // Appliquer immédiatement pour les filtres rapides
    if (filterName !== 'fournisseurNom') {
      setActiveFilters(newTempFilters);
      setCurrentPage(1);
    }
  };

  // Nombre de filtres actifs
  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.dateDebut) count++;
    if (activeFilters.dateFin) count++;
    if (activeFilters.fournisseurNom) count++;
    if (activeFilters.typeReglement !== 'TOUS') count++;
    if (activeFilters.statut !== 'TOUS') count++;
    return count;
  };






  const [isLoadingFournisseurs, setIsLoadingFournisseurs] = useState(false);

  const fetchFournisseurs = async () => {
    setIsLoadingFournisseurs(true);
    try {
      const response = await fetch("/api/fournisseurs?limit=10000");
      console.log("Response status:", response.status);
      const data = await response.json();
      setFournisseurs(data.data || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
      setFournisseurs([]);
    } finally {
      setIsLoadingFournisseurs(false);
    }
  };

  // Version unifiée qui accepte à la fois ReglementFournisseur et PaymentItem
  const handleOpenPaiementDialog = (item: ReglementFournisseur | PaymentItem) => {
    // Vérifier si c'est un ReglementFournisseur (a la propriété typeReglement)
    if ('typeReglement' in item) {
      const reglement = item as ReglementFournisseur;

      // Pour les règlements MIXTE avec détails
      if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
        try {
          const details = JSON.parse(reglement.detailsMixte);
          // ← AJOUTER LE FILTRE POUR EXCLURE CREDIT
          const nonPayes = details.filter((d: any) => d.statut !== 'PAYE' && d.type !== 'CREDIT');

          if (nonPayes.length === 0) {
            toast({ title: "Information", description: "Tous les paiements sont déjà effectués", variant: "default" });
            return;
          }

          setSelectedPaiement({
            id: reglement.id,
            parentId: reglement.id,
            type: 'MIXTE',
            montant: reglement.montant,
            montantPaye: reglement.montant - nonPayes.reduce((sum: number, d: any) => sum + d.montant, 0),
            reference: reglement.reference,
            banque: reglement.banque,
            echeance: reglement.echeance,
            statut: reglement.statut,
            fournisseur: reglement.fournisseur,
            isDetail: false,
          });
          setCurrentDetails(nonPayes);
          setSelectedDetailIndex(0);
          setSelectedDetail(nonPayes[0]);
          setMontantAPayer(nonPayes[0].montant - (nonPayes[0].montantPaye || 0));
          setIsPaiementDialogOpen(true);
        } catch (error) {
          console.error("Error parsing details:", error);
          toast({ title: "Erreur", description: "Impossible de lire les détails du paiement", variant: "destructive" });
        }
      } else if (reglement.typeReglement !== 'CREDIT') {
        // Pour les paiements simples
        const paymentItem: PaymentItem = {
          id: reglement.id,
          parentId: reglement.id,
          type: reglement.typeReglement,
          montant: reglement.montant,
          montantPaye: reglement.statut === 'PAYE' ? reglement.montant : 0,
          reference: reglement.reference,
          banque: reglement.banque,
          echeance: reglement.echeance,
          statut: reglement.statut,
          fournisseur: reglement.fournisseur,
          isDetail: false,
        };
        setSelectedPaiement(paymentItem);
        setCurrentDetails([]);
        setMontantAPayer(paymentItem.montant - (paymentItem.montantPaye || 0));
        setIsPaiementDialogOpen(true);
      } else {
        toast({ title: "Information", description: "Les paiements par crédit ne peuvent pas être traités ici", variant: "default" });
      }
    } else {
      // C'est un PaymentItem (pour la section Paiements en Attente)
      const paymentItem = item as PaymentItem;
      if (paymentItem.type !== 'CREDIT') {
        setSelectedPaiement(paymentItem);
        setCurrentDetails([]);
        setMontantAPayer(paymentItem.montant - (paymentItem.montantPaye || 0));
        setIsPaiementDialogOpen(true);
      } else {
        toast({ title: "Information", description: "Les paiements par crédit ne peuvent pas être traités ici", variant: "default" });
      }
    }
  };

  const handlePaiementPartiel = async () => {
    if (!selectedPaiement) return;

    let parentId = selectedPaiement.parentId;
    let detailIndex = selectedPaiement.detailIndex;

    // Si on a sélectionné un détail dans la liste
    if (currentDetails.length > 0 && selectedDetail) {
      parentId = selectedPaiement.id;
      detailIndex = selectedDetailIndex;
    }

    setPaiementInProgress(selectedPaiement.id);

    try {
      const response = await fetch(`/api/reglements-fournisseurs/${parentId}/payer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detailIndex: detailIndex,
          montant: montantAPayer
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du paiement");
      }

      toast({ title: "Succès", description: "Paiement effectué avec succès" });
      setIsPaiementDialogOpen(false);
      setSelectedPaiement(null);
      setSelectedDetail(null);
      setCurrentDetails([]);
      setSelectedDetailIndex(0);
      setMontantAPayer(0);
      fetchReglements();
    } catch (error) {
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible d'effectuer le paiement", variant: "destructive" });
    } finally {
      setPaiementInProgress(null);
    }
  };

  // Fonctions pour les paiements mixtes
  const ajouterLignePaiement = () => {
    setPaiementsMixte([...paiementsMixte, { type: "CHEQUE", montant: 0 }]);
  };

  const supprimerLignePaiement = (index: number) => {
    const newPaiements = paiementsMixte.filter((_, i) => i !== index);
    setPaiementsMixte(newPaiements);
  };

  const updatePaiement = (index: number, field: keyof PaiementDetail, value: any) => {
    const newPaiements = [...paiementsMixte];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setPaiementsMixte(newPaiements);

    const total = newPaiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    setMontantTotal(total);
  };

  // Extraire tous les détails de paiement
  const getAllPaymentDetails = (): PaymentItem[] => {
    const details: PaymentItem[] = [];

    reglements.forEach(reg => {
      if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
        try {
          const parsed = JSON.parse(reg.detailsMixte);
          let mixteDetails: any[] = [];

          if (Array.isArray(parsed)) {
            mixteDetails = parsed;
          } else if (parsed && typeof parsed === 'object') {
            mixteDetails = Object.values(parsed);
          }

          if (mixteDetails && mixteDetails.length > 0) {
            mixteDetails.forEach((detail, idx) => {
              // ← AJOUTEZ CETTE CONDITION POUR EXCLURE CREDIT
              if (detail && detail.montant > 0 && detail.type !== 'CREDIT') {
                details.push({
                  id: `${reg.id}_${idx}`,
                  parentId: reg.id,
                  detailIndex: idx,
                  type: detail.type || 'AUTRE',
                  montant: detail.montant,
                  montantPaye: detail.montantPaye || 0,
                  reference: detail.reference || reg.reference,
                  banque: detail.banque || reg.banque,
                  echeance: detail.echeance || null,
                  statut: detail.statut || 'EN_ATTENTE',
                  fournisseur: reg.fournisseur,
                  isDetail: true,
                });
              }
            });
          }
        } catch (error) {
          console.error("Error parsing mixte details:", error);
        }
      } else if (reg.typeReglement !== 'CREDIT') { // ← AJOUTEZ CETTE CONDITION
        details.push({
          id: reg.id,
          parentId: reg.id,
          type: reg.typeReglement,
          montant: reg.montant,
          montantPaye: reg.statut === 'PAYE' ? reg.montant : 0,
          reference: reg.reference,
          banque: reg.banque,
          echeance: reg.echeance,
          statut: reg.statut,
          fournisseur: reg.fournisseur,
          isDetail: false,
        });
      }
    });

    return details;
  };
  // const getAllPaymentDetails = (): PaymentItem[] => {
  //   const details: PaymentItem[] = [];

  //   reglements.forEach(reg => {
  //     if (reg.typeReglement === 'MIXTE' && reg.detailsMixte) {
  //       try {
  //         const parsed = JSON.parse(reg.detailsMixte);
  //         let mixteDetails: any[] = [];

  //         if (Array.isArray(parsed)) {
  //           mixteDetails = parsed;
  //         } else if (parsed && typeof parsed === 'object') {
  //           mixteDetails = Object.values(parsed);
  //         }

  //         if (mixteDetails && mixteDetails.length > 0) {
  //           mixteDetails.forEach((detail, idx) => {
  //             if (detail && detail.montant > 0) {
  //               details.push({
  //                 id: `${reg.id}_${idx}`,
  //                 parentId: reg.id,
  //                 detailIndex: idx,
  //                 type: detail.type || 'AUTRE',
  //                 montant: detail.montant,
  //                 montantPaye: detail.montantPaye || 0,  // ← AJOUTEZ CETTE LIGNE
  //                 reference: detail.reference || reg.reference,
  //                 banque: detail.banque || reg.banque,
  //                 echeance: detail.echeance || null,
  //                 statut: detail.statut || 'EN_ATTENTE',
  //                 fournisseur: reg.fournisseur,
  //                 isDetail: true,
  //               });
  //             }
  //           });
  //         }
  //       } catch (error) {
  //         console.error("Error parsing mixte details:", error);
  //       }
  //     } else {
  //       details.push({
  //         id: reg.id,
  //         parentId: reg.id,
  //         type: reg.typeReglement,
  //         montant: reg.montant,
  //         montantPaye: reg.statut === 'PAYE' ? reg.montant : 0,  // ← AJOUTEZ CETTE LIGNE
  //         reference: reg.reference,
  //         banque: reg.banque,
  //         echeance: reg.echeance,
  //         statut: reg.statut,
  //         fournisseur: reg.fournisseur,
  //         isDetail: false,
  //       });
  //     }
  //   });

  //   return details;
  // };

  const allDetails = getAllPaymentDetails();

  const enAttenteDetails = allDetails.filter(d => d.statut !== 'PAYE' && d.type !== 'ESPECE');
  const payesDetails = allDetails.filter(d => d.statut === 'PAYE');

  const totalPaye = payesDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalEnAttente = enAttenteDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalGeneral = allDetails.reduce((sum, d) => sum + d.montant, 0);

  // Échéances
  const today = new Date();
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const echeancesUrgentes = enAttenteDetails.filter(
    (d) => d.echeance && new Date(d.echeance) <= in3Days
  );
  const echeancesProches = enAttenteDetails.filter(
    (d) => d.echeance && new Date(d.echeance) > in3Days && new Date(d.echeance) <= in7Days
  );


  const getDetailsMixteDisplay = (reglement: ReglementFournisseur) => {
    if (!reglement.detailsMixte) return null;

    try {
      const details = JSON.parse(reglement.detailsMixte);

      if (!Array.isArray(details)) return null;

      // Filtrer pour exclure les CREDIT
      const filteredDetails = details.filter((d: any) => d.type !== 'CREDIT');

      if (filteredDetails.length === 0) return null;

      return (
        <div className="text-xs space-y-1">
          {filteredDetails.map((d: any, idx: number) => {
            const montantPaye = d.montantPaye || 0;
            const reste = d.montant - montantPaye;
            const estPartiel = montantPaye > 0 && reste > 0;

            return (
              <div key={idx} className="flex gap-2 items-center flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {getTypeLabel(d.type)}
                </Badge>
                <span>{formatCurrency(d.montant)}</span>
                {montantPaye > 0 && (
                  <Badge className="bg-green-500 text-white text-xs">
                    Payé: {formatCurrency(montantPaye)}
                  </Badge>
                )}
                {estPartiel && (
                  <Badge className="bg-blue-500 text-white text-xs">
                    Reste: {formatCurrency(reste)}
                  </Badge>
                )}
                {d.statut === 'EN_ATTENTE' && montantPaye === 0 && (
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fournisseurId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fournisseur", variant: "destructive" });
      return;
    }

    const paiementsValides = paiementsMixte.filter(p => p.montant > 0);
    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un paiement", variant: "destructive" });
      return;
    }

    const total = paiementsValides.reduce((sum, p) => sum + p.montant, 0);

    // Paiement simple
    if (paiementsValides.length === 1) {
      const seulPaiement = paiementsValides[0];
      try {
        const response = await fetch("/api/reglements-fournisseurs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fournisseurId: formData.fournisseurId,
            montantTotal: total,
            typeReglement: seulPaiement.type,
            reference: seulPaiement.reference,
            banque: seulPaiement.banque,
            echeance: seulPaiement.echeance,
            statut: seulPaiement.type === "ESPECE" ? "PAYE" : "EN_ATTENTE",
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
      const response = await fetch("/api/reglements-fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fournisseurId: formData.fournisseurId,
          montantTotal: total,
          detailsMixte: paiementsValides,
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

  const handlePayer = async (id: string, detailIndex?: number, isDetail?: boolean, parentId?: string) => {
    const paiementId = isDetail ? `${parentId}_${detailIndex}` : id;
    setPaiementInProgress(paiementId);

    try {
      const body: any = {};
      if (detailIndex !== undefined) {
        body.detailIndex = detailIndex;
      }

      const response = await fetch(`/api/reglements-fournisseurs/${isDetail ? parentId : id}/payer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du paiement");
      }

      toast({ title: "Succès", description: "Paiement effectué avec succès" });
      fetchReglements();
    } catch (error) {
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible d'effectuer le paiement", variant: "destructive" });
    } finally {
      setPaiementInProgress(null);
    }
  };

  const resetForm = () => {
    setFormData({ fournisseurId: "", typeReglement: "ESPECE", reference: "", banque: "", echeance: "" });
    setPaiementsMixte([{ type: "ESPECE", montant: 0 }]);
    setMontantTotal(0);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "ESPECE": return <Banknote className="h-4 w-4" />;
      case "CHEQUE": return <FileText className="h-4 w-4" />;
      default: return <CalendarClock className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "ESPECE": return "Espèce";
      case "CHEQUE": return "Chèque";
      case "TRAITE_BANCAIRE": return "Traite bancaire";
      case "TRAITE_DOMICILE": return "Traite domiciliée";
      case "VIREMENT": return "Virement";
      default: return type;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case "PAYE": return "bg-green-500 text-white";
      case "REJETE": return "bg-red-500 text-white";
      default: return "bg-yellow-500 text-white";
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case "PAYE": return "Payé";
      case "EN_ATTENTE": return "En attente";
      case "REJETE": return "Rejeté";
      default: return statut;
    }
  };


  const renderPaiementCard = (item: PaymentItem, urgent = false) => {
    const reste = item.montant - (item.montantPaye || 0);
    const estPartiel = (item.montantPaye || 0) > 0 && reste > 0;

    return (
      <div key={item.id} className={cn("flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4", urgent ? "border-red-500/50 bg-red-500/5" : "border-border")}>
        <div className="flex items-center gap-4">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg", urgent ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary")}>
            {getTypeIcon(item.type)}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono font-medium">{item.reference || getTypeLabel(item.type)}</span>
              <Badge variant="outline">{getTypeLabel(item.type)}</Badge>
              {item.isDetail && <Badge variant="secondary" className="text-xs">Paiement mixte</Badge>}
              {estPartiel && <Badge className="bg-blue-500 text-white text-xs">Partiel</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">{item.fournisseur?.nom} {item.banque && `- ${item.banque}`}</p>
            {(item.montantPaye || 0) > 0 && (
              <p className="text-xs text-green-600 mt-1">Payé: {formatCurrency(item.montantPaye || 0)} / {formatCurrency(item.montant)}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
          {item.echeance && (
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Échéance</p>
              <p className={cn("font-medium", urgent && "text-red-500")}>{formatDate(new Date(item.echeance))}</p>
            </div>
          )}
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Montant</p>
            <p className="font-semibold text-red-600">-{formatCurrency(item.montant)}</p>
          </div>
          {item.statut !== "PAYE" && (
            <Badge className={getStatutColor(item.statut)}>{getStatutLabel(item.statut)}</Badge>
          )}
          {item.statut !== "PAYE" && (
            <Button size="sm" variant="outline" onClick={() => handleOpenPaiementDialog(item)} disabled={paiementInProgress === item.id}>
              {paiementInProgress === item.id ? (<><Loader2 className="mr-1 h-4 w-4 animate-spin" /> En cours...</>) : (<><CheckCircle className="mr-1 h-4 w-4" /> Payer</>)}
            </Button>
          )}
        </div>
      </div>
    );
  };

  const columns = [
    { key: "date", header: "Date", render: (item: ReglementFournisseur) => <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span> },
    { key: "fournisseur.nom", header: "Fournisseur", render: (item: ReglementFournisseur) => <span className="font-medium">{item.fournisseur?.nom}</span> },
    { key: "typeReglement", header: "Mode", render: (item: ReglementFournisseur) => <Badge variant="outline" className="flex w-fit items-center gap-1">{getTypeIcon(item.typeReglement)}{typeReglementLabels[item.typeReglement]}</Badge> },
    { key: "reference", header: "Référence", render: (item: ReglementFournisseur) => <span className="font-mono text-sm">{item.reference || "-"}</span> },
    // { key: "montant", header: "Montant", render: (item: ReglementFournisseur) => <span className="font-semibold text-red-600">-{formatCurrency(item.montant)}</span> },
    {
      key: "detailsMixte",
      header: "Détails",
      render: (item: ReglementFournisseur) => getDetailsMixteDisplay(item)  // ← Utilisez la fonction
    },
    // { key: "statut", header: "Statut", render: (item: ReglementFournisseur) => <Badge className={getStatutColor(item.statut)}>{statutReglementLabels[item.statut]}</Badge> },
    {
      key: "actions",
      header: "Actions",
      render: (item: ReglementFournisseur) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
          {/* {(item.statut === 'EN_ATTENTE' || item.statut === 'PARTIELLE') && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700"
              onClick={() => handleOpenPaiementDialog(item)}  // ← Passez l'item directement
              title="Payer"
            >
              <CheckCircle className="h-4 w-4" />
            </Button>
          )} */}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar /><div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Règlements Fournisseurs" subtitle="Gestion des décaissements fournisseurs" />
          <main className="p-4 md:p-6"><div className="flex justify-center items-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div></main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Règlements Fournisseurs" subtitle="Gestion des décaissements fournisseurs" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* <div className="grid gap-4 sm:grid-cols-4">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Règlements</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{allDetails.length}</div></CardContent></Card>
              <Card className="border-green-500/50"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Total Payé</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{formatCurrency(totalPaye)}</div></CardContent></Card>
              <Card className="border-yellow-500/50"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">À Payer</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalEnAttente)}</div><p className="text-sm text-muted-foreground">{enAttenteDetails.length} paiement(s)</p></CardContent></Card>
              <Card className="border-red-500/50"><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-muted-foreground">Échéances Urgentes</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{echeancesUrgentes.length}</div><p className="text-sm text-muted-foreground">Dans les 3 jours</p></CardContent></Card>
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
                    {/* <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFilterOpen(!isFilterOpen)}
                    >
                      {isFilterOpen ? 'Masquer' : 'Afficher'} les filtres
                    </Button> */}
                  </div>

                  {/* {isFilterOpen && ( */}
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

                      {/* Filtre par fournisseur */}
                      {/* Filtre par fournisseur */}
                      <div className="space-y-2">
                        <Label className="text-xs">Fournisseur</Label>
                        {isMounted && (
                          <Select2
                            options={filterFournisseurOptions}
                            value={
                              filterFournisseurOptions.find(option => option.value === tempFilters.fournisseurNom) || null
                            }
                            onChange={(selected: OptionType | null) =>
                              setTempFilters(prev => ({ ...prev, fournisseurNom: selected?.value || "" }))
                            }
                            placeholder="Sélectionner un fournisseur..."
                            isSearchable
                            isClearable
                            isLoading={isLoadingFournisseursFilter}
                            className="text-sm"
                            classNamePrefix="select"
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                        )}
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
                  {/* )} */}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent><DataTable data={reglements} columns={columns} searchPlaceholder="Rechercher..." searchKey="reference" /></CardContent>
            </Card>

            {/* Dialog pour choisir quel élément payer (similaire aux clients) */}
            <Dialog open={isPaiementDialogOpen} onOpenChange={(open) => {
              setIsPaiementDialogOpen(open);
              if (!open) {
                setSelectedPaiement(null);
                setSelectedDetail(null);
                setCurrentDetails([]);
                setSelectedDetailIndex(0);
                setMontantAPayer(0);
              }
            }}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Payer un règlement fournisseur</DialogTitle>
                  <DialogDescription>
                    Sélectionnez le mode de paiement et saisissez le montant à payer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Paiements en attente</Label>
                    {currentDetails.length === 0 ? (
                      selectedPaiement && selectedPaiement.type !== 'CREDIT' && (
                        <div className="border rounded-lg p-3 bg-gray-50">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(selectedPaiement.type)}
                              <span className="font-medium">{getTypeLabel(selectedPaiement.type)}</span>
                            </div>
                            <span className="font-semibold">{formatCurrency(selectedPaiement.montant)}</span>
                          </div>
                          {(selectedPaiement.montantPaye || 0) > 0 && (
                            <div className="mt-2 text-sm text-green-600">
                              Déjà payé: {formatCurrency(selectedPaiement.montantPaye || 0)}
                            </div>
                          )}
                        </div>
                      )
                    ) : (

                      <div className="space-y-2">
                        {currentDetails
                          .filter(detail => detail.type !== 'CREDIT')
                          .map((detail, idx) => {
                            const reste = detail.montant - (detail.montantPaye || 0);
                            const estPartiel = (detail.montantPaye || 0) > 0 && reste > 0;

                            // Utiliser l'index du map au lieu de findIndex
                            return (
                              <div
                                key={`${detail.type}_${idx}`} // Clé unique basée sur l'index
                                className={`border rounded-lg p-3 cursor-pointer transition-all ${selectedDetailIndex === idx  // ← Comparer avec l'index du map, pas avec originalIndex
                                  ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                  }`}
                                onClick={() => {
                                  setSelectedDetailIndex(idx); // ← Utiliser l'index du map
                                  setSelectedDetail(detail);
                                  setMontantAPayer(reste);
                                }}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    {detail.type === 'CHEQUE' && <FileText className="h-4 w-4 text-blue-500" />}
                                    {(detail.type === 'TRAITE_BANCAIRE' || detail.type === 'TRAITE_DOMICILE') && (
                                      <CalendarClock className="h-4 w-4 text-purple-500" />
                                    )}
                                    {detail.type === 'VIREMENT' && <CreditCard className="h-4 w-4 text-indigo-500" />}
                                    {detail.type === 'ESPECE' && <Banknote className="h-4 w-4 text-green-500" />}
                                    <span className="font-medium">{getTypeLabel(detail.type)}</span>
                                  </div>
                                  <span className="font-semibold text-lg">{formatCurrency(detail.montant)}</span>
                                </div>

                                {(detail.montantPaye || 0) > 0 && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Déjà payé: </span>
                                    <span className="text-green-600 font-medium">{formatCurrency(detail.montantPaye)}</span>
                                    <span className="text-muted-foreground mx-1">/</span>
                                    <span>{formatCurrency(detail.montant)}</span>
                                  </div>
                                )}

                                {estPartiel && (
                                  <div className="mt-2 text-sm">
                                    <span className="text-muted-foreground">Reste à payer: </span>
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
                                    <span className="font-medium">Échéance:</span> {formatDate(new Date(detail.echeance))}
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
                    {/* Message si aucun paiement disponible après filtrage */}
                    {currentDetails.filter(d => d.type !== 'CREDIT').length === 0 && currentDetails.length > 0 && (
                      <div className="text-center text-muted-foreground py-4">
                        Aucun paiement disponible (les crédits sont exclus)
                      </div>
                    )}
                  </div>

                  {/* Champ pour saisir le montant à payer */}
                  {((currentDetails.length > 0 && selectedDetail && selectedDetail.type !== 'CREDIT') ||
                    (currentDetails.length === 0 && selectedPaiement && selectedPaiement.type !== 'CREDIT')) && (
                      <div className="space-y-2 pt-2 border-t">
                        <Label>Montant à payer</Label>
                        <Input
                          type="number"
                          step="0.001"
                          value={montantAPayer}
                          onChange={(e) => setMontantAPayer(parseFloat(e.target.value) || 0)}
                          className="text-right font-medium"
                        />
                        <p className="text-xs text-muted-foreground">
                          Max: {formatCurrency(
                            currentDetails.length > 0 && selectedDetail
                              ? selectedDetail.montant - (selectedDetail.montantPaye || 0)
                              : (selectedPaiement?.montant || 0) - (selectedPaiement?.montantPaye || 0)
                          )}
                        </p>
                      </div>
                    )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsPaiementDialogOpen(false);
                      setSelectedPaiement(null);
                      setSelectedDetail(null);
                      setCurrentDetails([]);
                      setSelectedDetailIndex(0);
                      setMontantAPayer(0);
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handlePaiementPartiel}
                    disabled={montantAPayer <= 0}
                  >
                    Payer {montantAPayer > 0 ? formatCurrency(montantAPayer) : ''}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Section des paiements en attente */}
            {/* <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5 text-yellow-500" /> Paiements en Attente</CardTitle></CardHeader>
              <CardContent>{enAttenteDetails.length === 0 ? <p className="text-center text-muted-foreground py-8">Aucun paiement en attente</p> : <div className="space-y-4">{enAttenteDetails.map((item) => renderPaiementCard(item, echeancesUrgentes.includes(item)))}</div>}</CardContent>
            </Card> */}
          </div>
        </main>
      </div>
    </div>
  );
}