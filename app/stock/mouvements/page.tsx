"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TypeMouvementStock, formatDate, typeMouvementStockLabels } from "@/lib/types";
import { Plus, ArrowLeftRight, ArrowUpCircle, ArrowDownCircle, RotateCcw, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
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

interface Product {
  id: string;
  reference: string;
  designation: string;
  quantiteStock: number;
  category?: { nom: string };
  home?: { id: string; nom: string };
  stockLocations?: {
    id: string;
    productId: string;
    homeId: string;
    quantite: number;
    home: {
      id: string;
      nom: string;
    };
  }[];
}

interface StockMovement {
  id: string;
  productId: string;
  type: TypeMouvementStock;
  quantite: number;
  motif: string;
  date: string | Date;
  product?: Product;
}

export default function MouvementsStockPage() {
  const { sidebarClasses } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    productId: "",
    homeId: "",
    type: "",
    quantite: "",
    motif: "",
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchMovements(),
        fetchProducts(),
      ]);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMovements = async () => {
    try {
      const response = await fetch("/api/stock-movements?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setMovements(data.data || []);
    } catch (error) {
      console.error("Error fetching movements:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les mouvements de stock",
        variant: "destructive",
      });
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement des produits");
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    if (field === "productId") {
      const selected = products.find((p) => p.id === value);
      const defaultHomeId = selected?.stockLocations?.find((loc) => loc.quantite > 0)?.homeId || "";
      setFormData((prev) => ({
        ...prev,
        productId: value,
        homeId: defaultHomeId,
      }));
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const availableSourceLocations = selectedProduct?.stockLocations?.filter((loc) => loc.quantite > 0) || [];
  const selectedSourceLocation = availableSourceLocations.find((loc) => loc.homeId === formData.homeId) || availableSourceLocations[0];
  const selectedSourceStock = selectedSourceLocation?.quantite || selectedProduct?.quantiteStock || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const selectedProduct = products.find(p => p.id === formData.productId);
      const sourceHomeId = formData.homeId || selectedProduct?.home?.id || "";
      const quantite = parseInt(formData.quantite);

      if (!selectedProduct) {
        throw new Error("Veuillez sélectionner un produit");
      }

      if (formData.type === "SORTIE") {
        if (!sourceHomeId) {
          throw new Error("Veuillez sélectionner un emplacement source");
        }

        if (quantite > selectedSourceStock) {
          toast({
            title: "Erreur",
            description: `Stock insuffisant. Stock actuel: ${selectedSourceStock}`,
            variant: "destructive",
          });
          return;
        }
      }

      const response = await fetch("/api/stock-movements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: formData.productId,
          homeId: sourceHomeId,
          type: formData.type,
          quantite,
          motif: formData.motif,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const newMovement = await response.json();
      setMovements(prev => [newMovement, ...prev]);
      
      toast({
        title: "Succès",
        description: "Mouvement de stock enregistré avec succès",
      });
      
      setIsDialogOpen(false);
      setFormData({
        productId: "",
        homeId: "",
        type: "",
        quantite: "",
        motif: "",
      });
      
      // Recharger les produits pour mettre à jour les stocks
      await fetchProducts();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'enregistrer le mouvement",
        variant: "destructive",
      });
    }
  };

  const getTypeIcon = (type: TypeMouvementStock) => {
    switch (type) {
      case TypeMouvementStock.ENTREE:
        return <ArrowUpCircle className="h-4 w-4" />;
      case TypeMouvementStock.SORTIE:
        return <ArrowDownCircle className="h-4 w-4" />;
      case TypeMouvementStock.AJUSTEMENT:
        return <RotateCcw className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: TypeMouvementStock) => {
    switch (type) {
      case TypeMouvementStock.ENTREE:
        return "border-success text-success";
      case TypeMouvementStock.SORTIE:
        return "border-destructive text-destructive";
      case TypeMouvementStock.AJUSTEMENT:
        return "border-warning text-warning";
    }
  };

  const columns = [
    {
      key: "date" as const,
      header: "Date",
      render: (item: StockMovement) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span>
      ),
    },
    {
      key: "product",
      header: "Produit",
      render: (item: StockMovement) => (
        <div>
          <p className="font-medium">{item.product?.designation}</p>
          <p className="text-sm text-muted-foreground">{item.product?.reference}</p>
        </div>
      ),
    },
    {
      key: "type" as const,
      header: "Type",
      render: (item: StockMovement) => (
        <Badge
          variant="outline"
          className={cn("flex w-fit items-center gap-1", getTypeColor(item.type))}
        >
          {getTypeIcon(item.type)}
          {typeMouvementStockLabels[item.type]}
        </Badge>
      ),
    },
    {
      key: "quantite" as const,
      header: "Quantité",
      render: (item: StockMovement) => (
        <span
          className={cn(
            "font-semibold",
            item.type === TypeMouvementStock.ENTREE && "text-success",
            item.type === TypeMouvementStock.SORTIE && "text-destructive"
          )}
        >
          {item.type === TypeMouvementStock.ENTREE ? "+" : item.type === TypeMouvementStock.SORTIE ? "-" : "→"}
          {item.quantite}
        </span>
      ),
    },
    {
      key: "motif" as const,
      header: "Motif",
      render: (item: StockMovement) => (
        <span className="text-muted-foreground">{item.motif}</span>
      ),
    },
    {
      key: "stock_apres" as const,
      header: "Stock Après",
      render: (item: StockMovement) => (
        <Badge variant="outline">{item.product?.quantiteStock || 0} unités</Badge>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Mouvements de Stock" subtitle="Historique des entrées et sorties" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Chargement des mouvements...</span>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Mouvements de Stock" subtitle="Historique des entrées et sorties" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <ArrowLeftRight className="h-5 w-5 text-primary" />
                Historique des Mouvements
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Mouvement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Ajouter un Mouvement de Stock</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="productId">Produit *</Label>
                      <Select 
                        value={formData.productId} 
                        onValueChange={(value) => handleSelectChange("productId", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un produit" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((prod) => (
                            <SelectItem key={prod.id} value={prod.id}>
                              {prod.designation} ({prod.reference}) - Stock total: {prod.quantiteStock}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {selectedProduct && (
                      <div className="space-y-2">
                        <Label htmlFor="homeId">Emplacement source *</Label>
                        <Select
                          value={formData.homeId}
                          onValueChange={(value) => handleSelectChange("homeId", value)}
                          required={availableSourceLocations.length > 0}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un emplacement source" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableSourceLocations.length > 0 ? (
                              availableSourceLocations.map((loc) => (
                                <SelectItem key={loc.id} value={loc.homeId}>
                                  {loc.home.nom} — {loc.quantite} unités
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="" disabled>
                                Aucun stock disponible
                              </SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="type">Type de mouvement *</Label>
                      <Select 
                        value={formData.type} 
                        onValueChange={(value) => handleSelectChange("type", value)}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENTREE">📥 Entrée</SelectItem>
                          <SelectItem value="SORTIE">📤 Sortie</SelectItem>
                          <SelectItem value="AJUSTEMENT">🔄 Ajustement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantite">Quantité *</Label>
                      <Input 
                        id="quantite" 
                        type="number" 
                        placeholder="0" 
                        value={formData.quantite}
                        onChange={handleInputChange}
                        required
                        min="1"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="motif">Motif *</Label>
                      <Textarea 
                        id="motif" 
                        placeholder="Raison du mouvement" 
                        value={formData.motif}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    {selectedProduct && (
                      <p className="text-xs text-muted-foreground">
                        Stock disponible à la source: {selectedSourceStock} unités
                      </p>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
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
                data={movements}
                columns={columns}
                searchPlaceholder="Rechercher par motif..."
                searchKey="motif"
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}