"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Save, ArrowLeftRight, Building2, Package, CheckSquare, Square, Badge, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/types";
import Link from "next/link";

interface ProductStock {
  productId: string;
  productReference: string;
  productDesignation: string;
  stockLocationId: string;
  quantite: number;
  prixVente: number;
}

interface Home {
  id: string;
  nom: string;
  description?: string;
}

interface SelectedProduct {
  id: string;
  productId: string;
  reference: string;
  designation: string;
  sourceHomeId: string;
  sourceHomeName: string;
  destinationHomeId: string;
  destinationHomeName: string;
  quantite: number;
  stockDisponible: number;
  prixVente: number;
}

export default function CreerTransfertPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [homes, setHomes] = useState<Home[]>([]);
  const [selectedSourceHome, setSelectedSourceHome] = useState("");
  const [selectedDestinationHome, setSelectedDestinationHome] = useState("");
  const [products, setProducts] = useState<ProductStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [motif, setMotif] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [quantities, setQuantities] = useState<Map<string, number | undefined>>(new Map());
  const [selectAll, setSelectAll] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  // Filtrer les produits par référence ou désignation
  const filteredProducts = products.filter(product => {
    const search = searchFilter.toLowerCase();
    return (
      product.productReference.toLowerCase().includes(search) ||
      product.productDesignation.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    fetchHomes();
  }, []);

  useEffect(() => {
    if (selectedSourceHome) {
      fetchProductsByHome();
    } else {
      setProducts([]);
    }
  }, [selectedSourceHome]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emplacements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsByHome = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/stock-locations?homeId=${selectedSourceHome}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setProducts(data.data || []);

      // Réinitialiser les sélections
      setSelectedProducts(new Set());
      setQuantities(new Map());
      setSelectAll(false);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Ajoutez cette fonction dans votre composant
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    // Empêcher la soumission du formulaire quand on appuie sur Enter
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };


  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedProducts(new Set());
      setSelectAll(false);
    } else {
      const allProductIds = new Set(products.map(p => p.productId));
      setSelectedProducts(allProductIds);
      setSelectAll(true);

      // Initialiser les quantités à la valeur maximale pour chaque produit
      const newQuantities = new Map(quantities);
      products.forEach(product => {
        if (!newQuantities.has(product.productId)) {
          newQuantities.set(product.productId, product.quantite);
        }
      });
      setQuantities(newQuantities);
    }
  };

  const handleSelectProduct = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
    } else {
      newSelected.add(productId);
      // Initialiser la quantité si elle n'existe pas
      const product = products.find(p => p.productId === productId);
      if (product && !quantities.has(productId)) {
        const newQuantities = new Map(quantities);
        newQuantities.set(productId, product.quantite);
        setQuantities(newQuantities);
      }
    }
    setSelectedProducts(newSelected);
    setSelectAll(newSelected.size === products.length && products.length > 0);
  };

  const handleQuantityChange = (productId: string, value: string) => {
    if (value === '' || value === '0') {
      // Si l'utilisateur efface tout, mettre undefined
      const newQuantities = new Map(quantities);
      newQuantities.set(productId, undefined);
      setQuantities(newQuantities);
      return;
    }

    const numericValue = parseInt(value);
    if (isNaN(numericValue) || numericValue < 1) return;

    const product = products.find(p => p.productId === productId);
    if (product) {
      const maxQuantity = product.quantite;
      const newQuantity = Math.min(numericValue, maxQuantity);
      const newQuantities = new Map(quantities);
      newQuantities.set(productId, newQuantity);
      setQuantities(newQuantities);
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSourceHome) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un emplacement source", variant: "destructive" });
      return;
    }

    if (!selectedDestinationHome) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un emplacement destination", variant: "destructive" });
      return;
    }

    if (selectedSourceHome === selectedDestinationHome) {
      toast({ title: "Erreur", description: "La source et la destination ne peuvent pas être identiques", variant: "destructive" });
      return;
    }

    if (selectedProducts.size === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner au moins un produit à transférer", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Construire la liste des produits à transférer
    const produits = [];
    for (const productId of selectedProducts) {
      const product = products.find(p => p.productId === productId);
      const quantite = quantities.get(productId) || 0;

      if (product && quantite > 0) {
        produits.push({
          productId: product.productId,
          quantite: quantite,
        });
      }
    }

    if (produits.length === 0) {
      toast({ title: "Erreur", description: "Aucun produit valide à transférer", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      // Envoyer un seul appel API avec tous les produits
      const response = await fetch("/api/transferts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceHomeId: selectedSourceHome,
          destinationHomeId: selectedDestinationHome,
          produits: produits,
          motif: motif,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors du transfert");
      }

      const result = await response.json();

      toast({
        title: "Succès",
        description: `Transfert #${result.lotNumero} créé avec succès (${result.totalProduits} produit(s))`,
      });

      router.push('/transferts');
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'effectuer le transfert",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getAvailableDestinations = () => {
    return homes.filter(home => home.id !== selectedSourceHome);
  };

  const sourceHome = homes.find(h => h.id === selectedSourceHome);
  const destinationHome = homes.find(h => h.id === selectedDestinationHome);

  if (loading && homes.length === 0) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Nouveau Transfert" subtitle="Créer un transfert de stock" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-8">
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
        <Header title="Nouveau Transfert" subtitle="Créer un transfert de stock entre emplacements" />
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <Link href="/transferts">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
          </div>
          <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>

            <div className="space-y-6">
              {/* Sélection des emplacements */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Sélection des emplacements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Emplacement source *</Label>
                      <Select value={selectedSourceHome} onValueChange={setSelectedSourceHome}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'emplacement source" />
                        </SelectTrigger>
                        <SelectContent>
                          {homes.map(home => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Emplacement destination *</Label>
                      <Select
                        value={selectedDestinationHome}
                        onValueChange={setSelectedDestinationHome}
                        disabled={!selectedSourceHome}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner l'emplacement destination" />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableDestinations().map(home => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {selectedSourceHome && selectedDestinationHome && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-center justify-center gap-2">
                      <span className="font-medium">{sourceHome?.nom}</span>
                      <ArrowLeftRight className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">{destinationHome?.nom}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Motif du transfert */}
              <Card>
                <CardHeader>
                  <CardTitle>Motif du transfert</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Raison du transfert (optionnel)"
                    value={motif}
                    onChange={(e) => setMotif(e.target.value)}
                    rows={2}
                  />
                </CardContent>
              </Card>

              {/* Liste des produits */}
              {selectedSourceHome && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Produits disponibles dans {sourceHome?.nom}
                    </CardTitle>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Filtrer par référence ou désignation..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="w-64"
                      />
                    </div>
                    {filteredProducts.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleSelectAll}
                      >
                        {selectAll ? (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Désélectionner tout
                          </>
                        ) : (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Sélectionner tout
                          </>
                        )}
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      </div>
                    ) : filteredProducts.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchFilter ? "Aucun produit ne correspond au filtre" : "Aucun produit disponible dans cet emplacement"}
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">
                                <Checkbox
                                  checked={selectAll}
                                  onCheckedChange={handleSelectAll}
                                />
                              </TableHead>
                              <TableHead>Référence</TableHead>
                              <TableHead>Désignation</TableHead>
                              {/* <TableHead className="text-right">Stock disponible</TableHead> */}
                              {/* <TableHead className="text-right">Prix unitaire</TableHead> */}
                              <TableHead className="text-right">Quantité à transférer</TableHead>
                              {/* <TableHead className="text-right">Total</TableHead> */}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredProducts.map((product) => {
                              const isSelected = selectedProducts.has(product.productId);
                              const quantity = quantities.get(product.productId) || product.quantite;
                              const total = quantity * product.prixVente;

                              return (
                                <TableRow key={product.productId} className={isSelected ? "bg-blue-50/30" : ""}>
                                  <TableCell>
                                    <Checkbox
                                      checked={isSelected}
                                      onCheckedChange={() => handleSelectProduct(product.productId)}
                                    />
                                  </TableCell>
                                  <TableCell className="font-mono text-sm">
                                    {product.productReference}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {product.productDesignation}
                                  </TableCell>
                                  {/* <TableCell className="text-right">
                                    <Badge variant="outline" className="bg-blue-50">
                                      {product.quantite} unités
                                    </Badge>
                                  </TableCell> */}
                                  {/* <TableCell className="text-right">
                                    {formatCurrency(product.prixVente)}
                                  </TableCell> */}
                                  <TableCell className="text-right">
                                    <Input
                                      type="number"
                                      min="1"
                                      max={product.quantite}
                                      value={quantities.get(product.productId) ?? ''} 
                                      onChange={(e) => handleQuantityChange(product.productId, e.target.value)}
                                      className="w-24 text-right"
                                      disabled={!isSelected}
                                    />
                                  </TableCell>
                                  {/* <TableCell className="text-right font-medium">
                                    {formatCurrency(total)}
                                  </TableCell> */}
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/transferts')}>
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || selectedProducts.size === 0 || !selectedDestinationHome}
                  className="min-w-[200px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Transfert en cours...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Effectuer le transfert ({selectedProducts.size} produit(s))
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}