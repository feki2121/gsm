"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, Truck, Eye, FileText, Trash2, Loader2, X, PlusCircle, Home, Package } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixAchat: number;
  prixVente: number;
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
  productId: string;
  productDesignation?: string;
  homeId: string;
  quantite: number;
  prixUnitaireHT: number;
  tva: number;
  isNewProduct?: boolean;
  newProduct?: {
    reference: string;
    designation: string;
    categoryId: string;
    prixVente: number;
    seuilAlerte: number;
  };
}

interface FactureFournisseur {
  id: string;
  numero: string;
  date: string;
  fournisseur: Fournisseur;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise: number;
  statut: string;
  lignes: any[];
}

export default function FacturesFournisseursPage() {
  const { sidebarClasses } = useSidebar();
  const [factures, setFactures] = useState<FactureFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  const [formData, setFormData] = useState({
    fournisseurId: "",
    date: new Date().toISOString().split('T')[0],
    remise: "0",
  });
  
  const [lignes, setLignes] = useState<LigneFacture[]>([
    { productId: "", homeId: "", quantite: 1, prixUnitaireHT: 0, tva: 19 }
  ]);
  
  // État pour le nouveau produit
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductData, setNewProductData] = useState({
    reference: "",
    designation: "",
    categoryId: "",
    prixVente: 0,
    seuilAlerte: 5,
  });

  const { toast } = useToast();

  useEffect(() => {
    fetchFactures();
    fetchFournisseurs();
    fetchProducts();
    fetchCategories();
    fetchHomes();
  }, [currentPage]);

  const fetchFactures = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/factures-fournisseurs?page=${currentPage}&limit=10`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFactures(data.data || []);
    } catch (error) {
      console.error("Error fetching factures:", error);
      toast({ title: "Erreur", description: "Impossible de charger les factures", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

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

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const addLigne = () => {
    setLignes([...lignes, { productId: "", homeId: "", quantite: 1, prixUnitaireHT: 0, tva: 19 }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLignes[index].prixUnitaireHT = product.prixAchat;
        newLignes[index].productDesignation = product.designation;
      }
    }
    
    setLignes(newLignes);
  };

  const calculateTotalHT = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireHT), 0);
  };

  const calculateTotalTVA = () => {
    return lignes.reduce((sum, l) => {
      const ht = l.quantite * l.prixUnitaireHT;
      return sum + (ht * l.tva / 100);
    }, 0);
  };

  const calculateTotalTTC = () => {
    const totalHT = calculateTotalHT();
    const totalTVA = calculateTotalTVA();
    const remise = parseFloat(formData.remise) || 0;
    return (totalHT + totalTVA) * (1 - remise / 100);
  };

  const handleCreateNewProduct = () => {
    if (!newProductData.reference || !newProductData.designation || !newProductData.categoryId) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    
    // Ajouter une ligne spéciale pour le nouveau produit
    const newLigne: LigneFacture = {
      productId: "",
      homeId: "",
      quantite: 1,
      prixUnitaireHT: 0,
      tva: 19,
      isNewProduct: true,
      newProduct: { ...newProductData },
    };
    
    setLignes([...lignes, newLigne]);
    setShowNewProductForm(false);
    setNewProductData({ reference: "", designation: "", categoryId: "", prixVente: 0, seuilAlerte: 5 });
    
    toast({ title: "Succès", description: "Produit ajouté à la facture" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.fournisseurId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fournisseur", variant: "destructive" });
      return;
    }
    
    const lignesValides = lignes.filter(l => (l.productId || l.isNewProduct) && l.homeId && l.quantite > 0);
    
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un produit", variant: "destructive" });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/factures-fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fournisseurId: formData.fournisseurId,
          date: formData.date,
          remise: parseFloat(formData.remise),
          lignes: lignesValides.map(l => ({
            productId: l.productId,
            homeId: l.homeId,
            quantite: l.quantite,
            prixUnitaireHT: l.prixUnitaireHT,
            tva: l.tva,
            newProduct: l.isNewProduct ? l.newProduct : undefined,
          })),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }
      
      toast({ title: "Succès", description: "Facture créée et stock mis à jour" });
      setIsDialogOpen(false);
      resetForm();
      fetchFactures();
    } catch (error) {
      console.error("Error creating facture:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer la facture", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({ fournisseurId: "", date: new Date().toISOString().split('T')[0], remise: "0" });
    setLignes([{ productId: "", homeId: "", quantite: 1, prixUnitaireHT: 0, tva: 19 }]);
    setShowNewProductForm(false);
    setNewProductData({ reference: "", designation: "", categoryId: "", prixVente: 0, seuilAlerte: 5 });
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      PAYEE: "bg-green-500 text-white",
      PARTIELLE: "bg-yellow-500 text-white",
      IMPAYEE: "bg-red-500 text-white",
    };
    const labels = { PAYEE: "Payée", PARTIELLE: "Partielle", IMPAYEE: "Impayée" };
    return <Badge className={styles[statut as keyof typeof styles]}>{labels[statut as keyof typeof labels]}</Badge>;
  };

  const columns = [
    { key: "numero", header: "N° Facture", render: (item: FactureFournisseur) => <span className="font-mono">{item.numero}</span> },
    { key: "date", header: "Date", render: (item: FactureFournisseur) => <span>{formatDate(new Date(item.date))}</span> },
    { key: "fournisseur.nom", header: "Fournisseur", render: (item: FactureFournisseur) => <span className="font-medium">{item.fournisseur?.nom}</span> },
    { key: "totalHT", header: "Total HT", render: (item: FactureFournisseur) => <span>{formatCurrency(item.totalHT)}</span> },
    { key: "totalTTC", header: "Total TTC", render: (item: FactureFournisseur) => <span className="font-semibold">{formatCurrency(item.totalTTC)}</span> },
    { key: "statut", header: "Statut", render: (item: FactureFournisseur) => getStatutBadge(item.statut) },
    {
      key: "actions",
      header: "Actions",
      render: (item: FactureFournisseur) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="text-red-600"><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  const totalFactures = factures.length;
  const totalImpaye = factures.filter(f => f.statut === 'IMPAYEE').reduce((sum, f) => sum + f.totalTTC, 0);

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Factures Fournisseurs" subtitle="Gestion des achats et entrées de stock" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Total Factures</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{totalFactures}</div></CardContent></Card>
              <Card className="border-red-500/50"><CardHeader className="pb-2"><CardTitle className="text-sm">Total Impayé</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-red-600">{formatCurrency(totalImpaye)}</div></CardContent></Card>
              <Card><CardHeader className="pb-2"><CardTitle className="text-sm">Montant Total Achats</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{formatCurrency(factures.reduce((sum, f) => sum + f.totalTTC, 0))}</div></CardContent></Card>
            </div>

            {/* Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Liste des Factures Fournisseurs</CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  {/* <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nouvelle Facture</Button></DialogTrigger> */}
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Nouvelle Facture Fournisseur</DialogTitle><DialogDescription>Créez une facture d'achat. Les stocks seront automatiquement ajoutés aux emplacements sélectionnés.</DialogDescription></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><Label>Fournisseur *</Label><Select value={formData.fournisseurId} onValueChange={(v) => setFormData({ ...formData, fournisseurId: v })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{fournisseurs.map(f => (<SelectItem key={f.id} value={f.id}>{f.nom}</SelectItem>))}</SelectContent></Select></div>
                        <div><Label>Date facture</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} /></div>
                        <div><Label>Remise (%)</Label><Input type="number" step="0.1" value={formData.remise} onChange={(e) => setFormData({ ...formData, remise: e.target.value })} /></div>
                      </div>

                      {/* Lignes produits */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center"><Label>Produits</Label><Button type="button" variant="outline" size="sm" onClick={addLigne}><Plus className="h-4 w-4 mr-1" /> Ajouter produit</Button></div>
                        
                        {lignes.map((ligne, idx) => (
                          <div key={idx} className="border rounded-lg p-3 space-y-2">
                            <div className="flex justify-between"><span className="text-sm font-medium">Produit #{idx + 1}</span>{lignes.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => removeLigne(idx)} className="text-red-600">✕</Button>}</div>
                            <div className="grid gap-3 sm:grid-cols-4">
                              <div className="col-span-2">
                                <Label className="text-xs">Produit</Label>
                                {ligne.isNewProduct ? (
                                  <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                    Nouveau: {ligne.newProduct?.designation} ({ligne.newProduct?.reference})
                                  </div>
                                ) : (
                                  <Select value={ligne.productId} onValueChange={(v) => updateLigne(idx, 'productId', v)}>
                                    <SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                                    <SelectContent>
                                      {products.map(p => (<SelectItem key={p.id} value={p.id}>{p.reference} - {p.designation}</SelectItem>))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                              <div><Label className="text-xs">Emplacement *</Label><Select value={ligne.homeId} onValueChange={(v) => updateLigne(idx, 'homeId', v)}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{homes.map(h => (<SelectItem key={h.id} value={h.id}>{h.nom}</SelectItem>))}</SelectContent></Select></div>
                              <div><Label className="text-xs">Quantité</Label><Input type="number" min="1" value={ligne.quantite} onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)} /></div>
                              <div><Label className="text-xs">Prix HT</Label><Input type="number" step="0.001" value={ligne.prixUnitaireHT} onChange={(e) => updateLigne(idx, 'prixUnitaireHT', parseFloat(e.target.value) || 0)} /></div>
                              <div><Label className="text-xs">TVA %</Label><Input type="number" step="1" value={ligne.tva} onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)} /></div>
                            </div>
                          </div>
                        ))}
                        
                        {/* Bouton nouveau produit */}
                        <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewProductForm(!showNewProductForm)} className="w-full"><Package className="h-4 w-4 mr-2" /> Créer un nouveau produit</Button>
                        
                        {showNewProductForm && (
                          <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
                            <div className="flex justify-between"><span className="font-medium">Nouveau produit</span><Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProductForm(false)}>✕</Button></div>
                            <div className="grid gap-3 sm:grid-cols-2">
                              <div><Label className="text-xs">Référence *</Label><Input placeholder="REF-001" value={newProductData.reference} onChange={(e) => setNewProductData({ ...newProductData, reference: e.target.value })} /></div>
                              <div><Label className="text-xs">Désignation *</Label><Input placeholder="Nom du produit" value={newProductData.designation} onChange={(e) => setNewProductData({ ...newProductData, designation: e.target.value })} /></div>
                              <div><Label className="text-xs">Catégorie *</Label><Select value={newProductData.categoryId} onValueChange={(v) => setNewProductData({ ...newProductData, categoryId: v })}><SelectTrigger><SelectValue placeholder="Choisir" /></SelectTrigger><SelectContent>{categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>))}</SelectContent></Select></div>
                              <div><Label className="text-xs">Prix de vente</Label><Input type="number" step="0.001" value={newProductData.prixVente} onChange={(e) => setNewProductData({ ...newProductData, prixVente: parseFloat(e.target.value) || 0 })} /></div>
                              <div><Label className="text-xs">Seuil alerte</Label><Input type="number" value={newProductData.seuilAlerte} onChange={(e) => setNewProductData({ ...newProductData, seuilAlerte: parseInt(e.target.value) || 5 })} /></div>
                            </div>
                            <Button type="button" onClick={handleCreateNewProduct} className="w-full"><PlusCircle className="h-4 w-4 mr-2" /> Ajouter ce produit à la facture</Button>
                          </div>
                        )}
                        
                        {/* Totaux */}
                        <div className="pt-3 border-t">
                          <div className="flex justify-end gap-4 text-sm"><span>Total HT:</span><span className="font-semibold">{formatCurrency(calculateTotalHT())}</span></div>
                          <div className="flex justify-end gap-4 text-sm"><span>TVA:</span><span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span></div>
                          <div className="flex justify-end gap-4 text-lg font-bold"><span>Total TTC:</span><span>{formatCurrency(calculateTotalTTC())}</span></div>
                        </div>
                      </div>
                      
                      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button><Button type="submit" disabled={isSubmitting}>{isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Création...</> : "Créer la facture"}</Button></div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent><DataTable data={factures} columns={columns} searchPlaceholder="Rechercher..." searchKey="numero" /></CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}