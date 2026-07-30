"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/types";
import { Loader2, Plus, Trash2, Save, ArrowLeft, CreditCard, X, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Select2 from "react-select";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Fournisseur {
  id: string;
  nom: string;
}

interface Product {
  id: string;
  reference: string;
  code: string;
  designation: string;
  prixAchat: number;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
}

interface LigneBonEntree {
  id: string;
  productId: string;
  productDesignation?: string;
  reference?: string;
  code?: string;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  prixVente: number;
  tva: number;
  totalTTC: number;
}

interface PaiementDetail {
  type: string;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  imageUrl?: string | null;
}

type OptionType = {
  value: string;
  label: string;
};

export default function ModifierBonEntreePage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [bonEntreeId, setBonEntreeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // États pour les règlements
  const [isReglementDialogOpen, setIsReglementDialogOpen] = useState(false);
  const [paiements, setPaiements] = useState<PaiementDetail[]>([
    { type: "ESPECE", montant: 0, reference: "", banque: "", echeance: "", imageUrl: "" }
  ]);
  const [montantTotalPaiements, setMontantTotalPaiements] = useState(0);
  const [paymentImages, setPaymentImages] = useState<{ [key: number]: string }>({});
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});

  const [formData, setFormData] = useState({
    fournisseurId: "",
    date: new Date().toISOString().split('T')[0],
    type: "AUCUN",
    referenceDoc: "",
    description: "",
  });
  const [lignes, setLignes] = useState<LigneBonEntree[]>([]);
  const [bonTotalTTC, setBonTotalTTC] = useState<number>(0);

  const roundTo3Decimals = (value: number) => Number(value.toFixed(3));

  useEffect(() => {
    setIsMounted(true);

    const init = async () => {
      try {
        const resolvedParams = await params;
        const id = resolvedParams.id as string;
        console.log("ID récupéré:", id);
        setBonEntreeId(id);

        if (id) {
          await Promise.all([
            fetchFournisseurs(),
            fetchProducts(),
            fetchBonEntree(id)
          ]);
        }
      } catch (err) {
        console.error("Initialization error:", err);
        setError("Erreur lors du chargement de la page");
        toast({
          title: "Erreur",
          description: "Impossible de charger la page de modification",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [params, toast]);

  const fetchFournisseurs = async () => {
    try {
      const response = await fetch("/api/fournisseurs?limit=100");
      const data = await response.json();
      setFournisseurs(data.data || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=1000");
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchBonEntree = async (id: string) => {
    try {
      const response = await fetch(`/api/bons-entree/${id}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erreur lors du chargement");
      }

      const data = await response.json();
      console.log("BE chargé:", data);

      setFormData({
        fournisseurId: data.fournisseur?.id || data.fournisseurId || "",
        date: data.date ? new Date(data.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        type: data.type || "AUCUN",
        referenceDoc: data.referenceDoc || "",
        description: data.description || "",
      });

      const lignesData = data.lignes.map((ligne: any, index: number) => ({
        id: `ligne-${index}-${Date.now()}`,
        productId: ligne.productId,
        productDesignation: ligne.product?.designation || "",
        reference: ligne.product?.reference || "",
        code: ligne.product?.code || "",
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        prixUnitaireTTC: ligne.prixUnitaireTTC ?? roundTo3Decimals(ligne.prixUnitaireHT * (1 + (ligne.tva || 19) / 100)),
        prixVente: ligne.prixVente ?? (ligne.product?.prixVente || 0),
        tva: ligne.tva || 19,
        totalTTC: ligne.totalTTC ?? roundTo3Decimals(ligne.quantite * (ligne.prixUnitaireTTC ?? ligne.prixUnitaireHT * (1 + (ligne.tva || 19) / 100))),
      }));

      setLignes(lignesData);
      setBonTotalTTC(roundTo3Decimals(data.totalTTC ?? lignesData.reduce((sum: number, l: any) => sum + (l.totalTTC || 0), 0)));

      // Charger les règlements existants
      if (data.reglements && data.reglements.length > 0) {
        const reglementsData = data.reglements.map((reg: any, index: number) => {
          const reglement = reg.reglement;
          // Essayer de parser detailsMixte si c'est un paiement mixte
          let paiementsList = [];
          if (reglement.typeReglement === 'MIXTE' && reglement.detailsMixte) {
            try {
              paiementsList = JSON.parse(reglement.detailsMixte);
            } catch (e) {
              paiementsList = [{
                type: reglement.typeReglement,
                montant: reglement.montant,
                reference: reglement.reference,
                banque: reglement.banque,
                echeance: reglement.echeance,
                imageUrl: reglement.imageUrl,
              }];
            }
          } else {
            paiementsList = [{
              type: reglement.typeReglement,
              montant: reglement.montant,
              reference: reglement.reference,
              banque: reglement.banque,
              echeance: reglement.echeance,
              imageUrl: reglement.imageUrl,
            }];
          }
          return paiementsList;
        }).flat();

        if (reglementsData.length > 0) {
          setPaiements(reglementsData);
          // Restaurer les images
          reglementsData.forEach((p: PaiementDetail, idx: number) => {
            if (p.imageUrl) {
              setPaymentImages(prev => ({ ...prev, [idx]: p.imageUrl! }));
            }
          });
          const total = reglementsData.reduce((sum: number, p: PaiementDetail) => sum + (p.montant || 0), 0);
          setMontantTotalPaiements(total);
        }
      }
    } catch (error) {
      console.error("Error fetching bon entree:", error);
      setError(error instanceof Error ? error.message : "Erreur lors du chargement");
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de charger le bon d'entrée",
        variant: "destructive",
      });
    }
  };

  const addLigne = () => {
    setLignes([
      ...lignes,
      {
        id: `ligne-${Date.now()}-${Math.random()}`,
        productId: "",
        productDesignation: "",
        reference: "",
        code: "",
        quantite: 1,
        prixUnitaireHT: 0,
        prixUnitaireTTC: 0,
        prixVente: 0,
        totalTTC: 0,
        tva: 19,
      },
    ]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneBonEntree, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };

    if (field === "productId" && value) {
      const product = products.find((p) => p.id === value);
      if (product) {
        newLignes[index].productDesignation = product.designation;
        newLignes[index].reference = product.reference;
        newLignes[index].code = product.code;
        newLignes[index].prixUnitaireHT = product.prixAchatHT || 0;
        newLignes[index].prixUnitaireTTC = product.prixAchat || 0;
        newLignes[index].prixVente = roundTo3Decimals(product.prixVente);
        newLignes[index].tva = product.tva;
        newLignes[index].totalTTC = roundTo3Decimals(newLignes[index].quantite * newLignes[index].prixUnitaireTTC);
      }
    }

    if (field === "quantite") {
      newLignes[index].totalTTC = roundTo3Decimals(newLignes[index].quantite * newLignes[index].prixUnitaireTTC);
    }

    if (field === "prixUnitaireHT") {
      const tva = newLignes[index].tva;
      newLignes[index].prixUnitaireTTC = roundTo3Decimals(value * (1 + tva / 100));
      newLignes[index].totalTTC = roundTo3Decimals(newLignes[index].quantite * newLignes[index].prixUnitaireTTC);
    }

    if (field === "prixUnitaireTTC") {
      newLignes[index].prixUnitaireTTC = value;
      newLignes[index].totalTTC = roundTo3Decimals(newLignes[index].quantite * value);
    }

    if (field === "tva") {
      const ht = newLignes[index].prixUnitaireHT;
      newLignes[index].prixUnitaireTTC = roundTo3Decimals(ht * (1 + value / 100));
      newLignes[index].totalTTC = roundTo3Decimals(newLignes[index].quantite * newLignes[index].prixUnitaireTTC);
    }

    if (field !== "quantite" && field !== "prixUnitaireHT" && field !== "prixUnitaireTTC" && field !== "tva") {
      newLignes[index] = { ...newLignes[index], [field]: value };
    }

    const updatedBonTotalTTC = roundTo3Decimals(newLignes.reduce((sum, l) => sum + (l.totalTTC || 0), 0));
    setLignes(newLignes);
    setBonTotalTTC(updatedBonTotalTTC);
  };

  const calculateTotalHT = () => {
    return lignes.reduce((sum, l) => sum + l.quantite * l.prixUnitaireHT, 0);
  };

  const calculateTotalTVA = () => {
    return lignes.reduce((sum, l) => {
      const ht = l.quantite * l.prixUnitaireHT;
      return sum + ht * (l.tva / 100);
    }, 0);
  };

  const calculateTotalTTC = () => {
    return roundTo3Decimals(lignes.reduce((sum, l) => sum + (l.totalTTC ?? l.quantite * l.prixUnitaireTTC), 0));
  };

  // Fonctions pour les paiements
  const ajouterLignePaiement = () => {
    setPaiements([...paiements, { type: "CHEQUE", montant: 0, reference: "", banque: "", echeance: "", imageUrl: "" }]);
  };

  const supprimerLignePaiement = (index: number) => {
    if (paiements.length > 1) {
      setPaiements(paiements.filter((_, i) => i !== index));
      setPaymentImages(prev => {
        const newImages = { ...prev };
        delete newImages[index];
        return newImages;
      });
    }
  };

  const updatePaiement = (index: number, field: string, value: any) => {
    const newPaiements = [...paiements];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setPaiements(newPaiements);

    const total = newPaiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    setMontantTotalPaiements(total);
  };

  const handlePaymentImageUpload = async (index: number, file: File) => {
    if (!file) return;

    setUploadingImages(prev => ({ ...prev, [index]: true }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      setPaymentImages(prev => ({ ...prev, [index]: data.url }));
      updatePaiement(index, 'imageUrl', data.url);
      toast({ title: "Succès", description: "Image téléchargée avec succès" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'image",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePaymentImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePaymentImageUpload(index, file);
    }
  };

  const removePaymentImage = (index: number) => {
    setPaymentImages(prev => {
      const newImages = { ...prev };
      delete newImages[index];
      return newImages;
    });
    updatePaiement(index, 'imageUrl', null);
  };

  const handleOpenReglement = () => {
    setIsReglementDialogOpen(true);
  };

  const handleCloseReglement = () => {
    setIsReglementDialogOpen(false);
  };

  const handleValidateReglement = () => {
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const totalTTC = calculateTotalTTC();

    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un paiement", variant: "destructive" });
      return;
    }

    if (Math.abs(totalPaiements - totalTTC) > 0.001) {
      toast({ title: "Erreur", description: `Le total des paiements (${formatCurrency(totalPaiements)}) ne correspond pas au total TTC (${formatCurrency(totalTTC)})`, variant: "destructive" });
      return;
    }

    setIsReglementDialogOpen(false);
    toast({ title: "Succès", description: "Règlement configuré avec succès" });
  };

  const isReglementValid = () => {
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const totalTTC = calculateTotalTTC();
    return paiementsValides.length > 0 && Math.abs(totalPaiements - totalTTC) < 0.001;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fournisseurId) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner un fournisseur",
        variant: "destructive",
      });
      return;
    }

    const lignesValides = lignes.filter((l) => l.productId && l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({
        title: "Erreur",
        description: "Ajoutez au moins un produit",
        variant: "destructive",
      });
      return;
    }

    if (!isReglementValid()) {
      toast({
        title: "Erreur",
        description: "Veuillez configurer le règlement (total paiements = total TTC)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fournisseurId: formData.fournisseurId,
        date: formData.date,
        type: formData.type,
        referenceDoc: formData.referenceDoc,
        description: formData.description,
        lignes: lignesValides.map((l) => ({
          productId: l.productId,
          quantite: l.quantite,
          prixUnitaireHT: l.prixUnitaireHT,
          prixUnitaireTTC: l.prixUnitaireTTC,
          prixVente: l.prixVente,
          tva: l.tva,
        })),
        paiements: paiements.filter(p => p.montant > 0).map(p => ({
          type: p.type,
          montant: p.montant,
          reference: p.reference,
          banque: p.banque,
          echeance: p.echeance,
          imageUrl: p.imageUrl,
        })),
      };

      const response = await fetch(`/api/bons-entree/${bonEntreeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la modification");
      }

      toast({
        title: "Succès",
        description: "Bon d'entrée modifié avec succès",
      });

      router.push("/bons-entree");
    } catch (error) {
      console.error("Error updating bon entree:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le bon d'entrée",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: OptionType[] = products.map((p) => ({
    value: p.id,
    label: `${p.reference} - ${p.designation}`,
  }));

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier Bon d'Entrée" subtitle="Modifier un bon d'entrée existant" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier Bon d'Entrée" subtitle="Modifier un bon d'entrée existant" />
          <main className="p-4 md:p-6">
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{error}</p>
              <Button onClick={() => router.push("/bons-entree")}>
                Retour à la liste
              </Button>
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
        <Header title="Modifier Bon d'Entrée" subtitle="Modifier un bon d'entrée existant" />
        <main className="p-4 md:p-6">
          <Button variant="outline" className="gap-2 mb-6" onClick={() => router.push("/bons-entree")}>
            <ArrowLeft className="h-4 w-4" />
            Retour à la liste
          </Button>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type de Bon d'Entrée *</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FAC">Facture Fournisseur</SelectItem>
                          <SelectItem value="BL">Bon de Livraison</SelectItem>
                          <SelectItem value="BS">Bon de Sortie</SelectItem>
                          <SelectItem value="AUCUN">Bon d'entrée simple</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Fournisseur *</Label>
                      {isMounted && (
                        <Select2
                          options={fournisseurs.map((f) => ({ value: f.id, label: f.nom }))}
                          value={fournisseurs.find((f) => f.id === formData.fournisseurId) ? { value: formData.fournisseurId, label: fournisseurs.find((f) => f.id === formData.fournisseurId)?.nom || "" } : null}
                          onChange={(selected: OptionType | null) => setFormData({ ...formData, fournisseurId: selected?.value || "" })}
                          placeholder="Sélectionner un fournisseur"
                          isSearchable
                          className="text-sm"
                          menuPortalTarget={document.body}
                        />
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Référence Document</Label>
                      <Input
                        placeholder="BL-001, FACT-001, ..."
                        value={formData.referenceDoc}
                        onChange={(e) => setFormData({ ...formData, referenceDoc: e.target.value })}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Description du bon d'entrée"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produits</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[220px]">Désignation</TableHead>
                            <TableHead className="w-[120px]">Référence</TableHead>
                            <TableHead className="w-[120px]">Code</TableHead>
                            <TableHead className="w-[80px]">Quantité</TableHead>
                            <TableHead className="w-[110px]">Prix Achat (HT)</TableHead>
                            <TableHead className="w-[70px]">TVA</TableHead>
                            <TableHead className="w-[110px]">Prix Achat (TTC)</TableHead>
                            <TableHead className="w-[110px]">Prix Vente (TTC)</TableHead>
                            <TableHead className="w-[100px]">Total TTC</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne, idx) => (
                            <TableRow key={ligne.id}>
                              <TableCell className="min-w-[220px]">
                                <Select2
                                  options={options}
                                  value={options.find((o) => o.value === ligne.productId) || null}
                                  onChange={(selected: OptionType | null) => updateLigne(idx, "productId", selected?.value || "")}
                                  placeholder="Sélectionner un produit"
                                  isSearchable
                                  className="text-sm"
                                  menuPortalTarget={document.body}
                                />
                              </TableCell>
                              <TableCell className="w-[120px] text-right">
                                {ligne.reference || "-"}
                              </TableCell>
                              <TableCell className="w-[120px] text-right">
                                {ligne.code || "-"}
                              </TableCell>
                              <TableCell className="w-[80px] text-right">
                                <Input
                                  type="number"
                                  min="1"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(idx, "quantite", parseInt(e.target.value) || 0)}
                                  className="w-24 text-right"
                                />
                              </TableCell>
                              <TableCell className="w-[110px] text-right">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={ligne.prixUnitaireHT}
                                  onChange={(e) => updateLigne(idx, "prixUnitaireHT", parseFloat(e.target.value) || 0)}
                                  className="w-full text-right"
                                />
                              </TableCell>
                              <TableCell className="w-[70px] text-right">
                                <Input
                                  type="number"
                                  step="1"
                                  value={ligne.tva}
                                  onChange={(e) => updateLigne(idx, "tva", parseFloat(e.target.value) || 0)}
                                  className="w-full text-right"
                                />
                              </TableCell>
                              <TableCell className="w-[110px] text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  lang="fr"
                                  value={ligne.prixUnitaireTTC === 0 ? "" : String(ligne.prixUnitaireTTC)}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    updateLigne(idx, 'prixUnitaireTTC', parseFloat(value) || 0);
                                  }}
                                  className="w-full text-right"
                                />
                              </TableCell>
                              <TableCell className="w-[110px] text-right">
                                <Input
                                  type="number"
                                  step="0.01"
                                  inputMode="decimal"
                                  lang="fr"
                                  value={ligne.prixVente === 0 ? "" : String(ligne.prixVente)}
                                  onChange={(e) => {
                                    const value = e.target.value.replace(',', '.');
                                    updateLigne(idx, 'prixVente', parseFloat(value) || 0);
                                  }}
                                  className="w-full text-right"
                                />
                              </TableCell>
                              <TableCell className="w-[100px] text-right font-medium">
                                {formatCurrency(ligne.totalTTC ?? 0)}
                              </TableCell>
                              <TableCell>
                                {lignes.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => removeLigne(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Totaux */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-between w-80">
                          <span>Total HT:</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalHT())}</span>
                        </div>
                        <div className="flex justify-between w-80">
                          <span>TVA:</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span>
                        </div>
                        <div className="flex justify-between w-80 text-lg font-bold border-t pt-2">
                          <span>Total TTC:</span>
                          <span>{formatCurrency(bonTotalTTC)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push("/bons-entree")}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenReglement}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Règlement
                  {isReglementValid() && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting || !isReglementValid()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Modification...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Dialog de règlement */}
      <Dialog open={isReglementDialogOpen} onOpenChange={setIsReglementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Règlement fournisseur</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total TTC à payer : <span className="font-bold text-foreground">{formatCurrency(calculateTotalTTC())}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={ajouterLignePaiement}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {paiements.map((paiement, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Paiement #{index + 1}</span>
                    {paiements.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => supprimerLignePaiement(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Mode</Label>
                      <Select value={paiement.type} onValueChange={(value) => updatePaiement(index, 'type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ESPECE">Espèce</SelectItem>
                          <SelectItem value="CHEQUE">Chèque</SelectItem>
                          <SelectItem value="TRAITE_BANCAIRE">Traite bancaire</SelectItem>
                          <SelectItem value="VIREMENT">Virement</SelectItem>
                          <SelectItem value="CREDIT">Crédit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Montant</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={paiement.montant || ''}
                        onChange={(e) => updatePaiement(index, 'montant', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {(paiement.type === 'CHEQUE' || paiement.type === 'TRAITE_BANCAIRE') && (
                      <>
                        <div>
                          <Label className="text-xs">Référence</Label>
                          <Input value={paiement.reference || ''} onChange={(e) => updatePaiement(index, 'reference', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Banque</Label>
                          <Input value={paiement.banque || ''} onChange={(e) => updatePaiement(index, 'banque', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Échéance</Label>
                          <Input type="date" value={paiement.echeance || ''} onChange={(e) => updatePaiement(index, 'echeance', e.target.value)} />
                        </div>
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Image du {paiement.type === 'CHEQUE' ? 'chèque' : 'traite'}</Label>
                          <div className="flex items-center gap-4 mt-1">
                            {paymentImages[index] ? (
                              <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                <Image
                                  src={paymentImages[index]}
                                  alt={`${paiement.type} ${paiement.reference || ''}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePaymentImage(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground text-center">
                                    Ajouter image
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handlePaymentImageSelect(index, e)}
                                  disabled={uploadingImages[index]}
                                />
                              </label>
                            )}
                            {uploadingImages[index] && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Upload en cours...
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {paiement.type === 'VIREMENT' && (
                      <div>
                        <Label className="text-xs">Référence virement</Label>
                        <Input value={paiement.reference || ''} onChange={(e) => updatePaiement(index, 'reference', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total TTC :</span>
                <span className="text-lg font-bold">{formatCurrency(calculateTotalTTC())}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span>Total paiements :</span>
                <span className={montantTotalPaiements === calculateTotalTTC() ? "text-green-600 font-semibold" : montantTotalPaiements > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                  {montantTotalPaiements > 0 ? formatCurrency(montantTotalPaiements) : "0.000 DT"}
                </span>
              </div>
              {Math.abs(montantTotalPaiements - calculateTotalTTC()) > 0.001 && montantTotalPaiements > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Différence : {formatCurrency(Math.abs(calculateTotalTTC() - montantTotalPaiements))}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseReglement}>
              Annuler
            </Button>
            <Button type="button" onClick={handleValidateReglement}>
              Valider le règlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}