"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/types";
import {
  AlertTriangle,
  Package,
  ShoppingCart,
  Loader2,
  TrendingDown,
  MapPin,
  Filter,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface AlerteProduit {
  id: string;
  reference: string;
  designation: string;
  category: string;
  home: string;
  prixVente: number;
  prixAchat?: number;
  quantiteStock: number;
  seuilAlerte: number;
  stockLocations?: {
    homeNom: string;
    quantite: number;
  }[];
}

interface StatsParCategorie {
  categorie: string;
  count: number;
  produits: AlerteProduit[];
}

interface StatsParEmplacement {
  emplacement: string;
  count: number;
  produits: AlerteProduit[];
}

export default function AlertesStockPage() {
  const { sidebarClasses } = useSidebar();
  const [alertes, setAlertes] = useState<AlerteProduit[]>([]);
  const [rupture, setRupture] = useState<AlerteProduit[]>([]);
  const [stockBas, setStockBas] = useState<AlerteProduit[]>([]);
  const [stats, setStats] = useState({
    totalProduits: 0,
    totalAlertes: 0,
    rupture: 0,
    stockBas: 0,
    valeurStockTotal: 0,
    valeurStockAlerte: 0,
  });
  const [statsParCategorie, setStatsParCategorie] = useState<StatsParCategorie[]>([]);
  const [statsParEmplacement, setStatsParEmplacement] = useState<StatsParEmplacement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterHome, setFilterHome] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [homes, setHomes] = useState<{ id: string; nom: string }[]>([]);
  const [categories, setCategories] = useState<{ id: string; nom: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlertes();
    fetchFilters();
  }, [filterHome, filterCategory]);


  const fetchAlertes = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterHome && filterHome !== "all") params.append('homeId', filterHome);
      if (filterCategory && filterCategory !== "all") params.append('categoryId', filterCategory);

      const response = await fetch(`/api/alertes-stock?${params.toString()}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();

      setAlertes(data.alertes || []);
      setRupture(data.rupture || []);
      setStockBas(data.stockBas || []);
      setStats(data.stats || {});
      setStatsParCategorie(data.statsParCategorie || []);
      setStatsParEmplacement(data.statsParEmplacement || []);
    } catch (error) {
      console.error("Error fetching alertes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les alertes stock",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Ajoutez cette fonction après les interfaces
  const getStockStatus = (quantite: number, seuil: number) => {
    if (quantite === 0) return { label: 'Rupture', color: 'bg-red-100 text-red-800 border-red-200' };
    if (quantite <= seuil / 2) return { label: 'Critique', color: 'bg-orange-100 text-orange-800 border-orange-200' };
    if (quantite <= seuil) return { label: 'Stock bas', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' };
    return { label: 'Normal', color: 'bg-green-100 text-green-800 border-green-200' };
  };

  const fetchFilters = async () => {
    try {
      const [homesRes, categoriesRes] = await Promise.all([
        fetch("/api/homes?limit=100"),
        fetch("/api/categories?limit=100"),
      ]);
      const homesData = await homesRes.json();
      const categoriesData = await categoriesRes.json();
      setHomes(homesData.data || []);
      setCategories(categoriesData.data || []);
    } catch (error) {
      console.error("Error fetching filters:", error);
    }
  };

  const resetFilters = () => {
    setFilterHome("all");
    setFilterCategory("all");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Alertes Stock" subtitle="Produits sous le seuil d'alerte" />
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
        <Header title="Alertes Stock" subtitle="Produits sous le seuil d'alerte" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Filters */}
            {/* <div className="flex flex-wrap gap-4 items-end">
              <div className="w-64">
                <label className="text-sm font-medium mb-1 block">Emplacement</label>
                <Select value={filterHome} onValueChange={setFilterHome}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tous les emplacements" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les emplacements</SelectItem>
                    {homes.map(home => (
                      <SelectItem key={home.id} value={home.id}>{home.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-64">
                <label className="text-sm font-medium mb-1 block">Catégorie</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes les catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les catégories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
              <Button variant="outline" onClick={fetchAlertes}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualiser
              </Button>
            </div> */}

            {/* Summary Cards - avec clarification */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Produits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalProduits}</div>
                  <p className="text-xs text-muted-foreground">avec stock FAC</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Rupture de Stock
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{stats.rupture}</div>
                  <p className="text-xs text-muted-foreground">stock FAC = 0</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Stock Bas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{stats.stockBas}</div>
                  <p className="text-xs text-muted-foreground">stock FAC ≤ seuil</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Alertes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalAlertes}</div>
                  <p className="text-xs text-muted-foreground">produits à réapprovisionner</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valeur Stock Alerte
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.valeurStockAlerte)}
                  </div>
                  <p className="text-xs text-muted-foreground">basée sur prix d'achat</p>
                </CardContent>
              </Card>
            </div>
            {/* Stats by Category */}
            {/* {statsParCategorie.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Alertes par Catégorie
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {statsParCategorie.map((stat) => (
                      <div key={stat.categorie} className="border rounded-lg p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{stat.categorie}</span>
                          <Badge variant="secondary">{stat.count} produit(s)</Badge>
                        </div>
                        <div className="space-y-1">
                          {stat.produits.slice(0, 3).map((p) => (
                            <div key={p.id} className="text-sm text-muted-foreground">
                              {p.designation} - Stock: {p.quantiteStock}/{p.seuilAlerte}
                            </div>
                          ))}
                          {stat.produits.length > 3 && (
                            <div className="text-xs text-muted-foreground">
                              +{stat.produits.length - 3} autres
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )} */}

            {/* Products List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  Produits en Alerte
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alertes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                      <Package className="h-8 w-8" />
                    </div>
                    <h3 className="mt-4 text-lg font-semibold">Aucune alerte</h3>
                    <p className="mt-2 text-muted-foreground">
                      Tous les produits sont au-dessus du seuil d&apos;alerte.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {alertes.map((produit) => (
                      <div
                        key={produit.id}
                        className={cn(
                          "flex flex-col lg:flex-row lg:items-center justify-between rounded-lg border p-4 gap-4",
                          produit.quantiteStock === 0
                            ? "border-red-500/50 bg-red-500/5"
                            : "border-yellow-500/50 bg-yellow-500/5"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={cn(
                              "flex h-12 w-12 items-center justify-center rounded-lg",
                              produit.quantiteStock === 0
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            )}
                          >
                            <Package className="h-6 w-6" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{produit.designation}</h4>
                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-mono">{produit.reference}</span>
                              <span>|</span>
                              <span>{produit.category || "N/A"}</span>
                              <span>|</span>
                              <div className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                <span>{produit.home || "N/A"}</span>
                              </div>
                            </div>
                            {/* Détail par emplacement si multi-emplacements */}
                            {produit.stockLocations && produit.stockLocations.length > 1 && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {produit.stockLocations.map((loc, idx) => (
                                  <Badge key={idx} variant="outline" className="text-xs">
                                    {loc.homeNom}: {loc.quantite} unités
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Prix vente</p>
                            <p className="font-semibold">{formatCurrency(produit.prixVente)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-muted-foreground">Stock / Seuil</p>
                            <Badge
                              variant="outline"
                              className={cn(
                                produit.quantiteStock === 0
                                  ? "border-red-500 text-red-500"
                                  : "border-yellow-500 text-yellow-500"
                              )}
                            >
                              {produit.quantiteStock} / {produit.seuilAlerte}
                            </Badge>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => window.open(`/factures-fournisseurs`, '_blank')}>
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            Commander
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rupture Section */}
            {rupture.length > 0 && (
              <Card className="border-red-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-5 w-5" />
                    Rupture de Stock ({rupture.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {rupture.map((produit) => (
                      <div key={produit.id} className="border border-red-500/30 rounded-lg p-3 bg-red-500/5">
                        <div className="font-medium">{produit.designation}</div>
                        <div className="text-sm text-muted-foreground">{produit.reference}</div>
                        <div className="text-sm mt-1">{produit.category}</div>
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => window.open(`/factures-fournisseurs`, '_blank')}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Commander
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Stock Bas Section */}
            {stockBas.length > 0 && (
              <Card className="border-yellow-500/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-yellow-600">
                    <TrendingDown className="h-5 w-5" />
                    Stock Bas ({stockBas.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {stockBas.map((produit) => (
                      <div key={produit.id} className="border border-yellow-500/30 rounded-lg p-3 bg-yellow-500/5">
                        <div className="font-medium">{produit.designation}</div>
                        <div className="text-sm text-muted-foreground">{produit.reference}</div>
                        <div className="flex justify-between mt-2">
                          <span className="text-sm">Stock: {produit.quantiteStock}</span>
                          <span className="text-sm">Seuil: {produit.seuilAlerte}</span>
                        </div>
                        <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => window.open(`/bons-entree/creer`, '_blank')}>
                          <ShoppingCart className="mr-2 h-4 w-4" />
                          Réapprovisionner
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}