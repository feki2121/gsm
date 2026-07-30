"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/types";
import { Loader2, ArrowLeft, History, TrendingUp, TrendingDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

interface PrixHistorique {
  id: string;
  prixAchat: number;
  prixAchatHT: number;
  prixVente: number;
  tva: number;
  dateApplication: string;
  bonEntreeNumero: string | null;
  bonEntree: {
    numero: string;
    date: string;
    fournisseur: {
      nom: string;
    } | null;
  } | null;
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
  imageUrl?: string;
}

export default function HistoriquePrixPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [historique, setHistorique] = useState<PrixHistorique[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistorique();
  }, [productId]);

  const fetchHistorique = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/products/${productId}/historique-prix`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setProduct(data.product);
      setHistorique(data.historique || []);
    } catch (error) {
      console.error("Error fetching price history:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'historique des prix",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getPriceVariation = (current: number, previous: number) => {
    if (previous === 0) return null;
    const variation = ((current - previous) / previous) * 100;
    return variation;
  };

  const getLastPrice = (index: number) => {
    if (index === 0) return null;
    return historique[index - 1]?.prixVente || null;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Historique des prix" subtitle="Chargement..." />
          <main className="flex items-center justify-center h-[calc(100vh-73px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Historique des prix" subtitle="Produit non trouvé" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-muted-foreground">Produit non trouvé</p>
                <Button onClick={() => router.push('/produits')} className="mt-4">
                  Retour à la liste
                </Button>
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
        <Header 
          title={`Historique des prix - ${product.designation}`} 
          subtitle="Suivi de l'évolution des prix" 
        />
        <main className="p-4 md:p-6">
          {/* Bouton retour */}
          <div className="mb-6">
            <Link href="/produits">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste des produits
              </Button>
            </Link>
          </div>

          <div className="space-y-6">
            {/* Informations produit */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Informations produit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Référence</p>
                    <p className="font-medium">{product.reference}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Code</p>
                    <p className="font-medium">{product.code || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Désignation</p>
                    <p className="font-medium">{product.designation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prix actuels */}
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  💰 Prix actuels
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-4">
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-blue-600">Prix Achat HT</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(product.prixAchatHT || 0)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-blue-600">Prix Achat TTC</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(product.prixAchat)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-blue-600">Prix Vente TTC</p>
                    <p className="text-2xl font-bold text-blue-800">{formatCurrency(product.prixVente)}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-blue-600">TVA</p>
                    <p className="text-2xl font-bold text-blue-800">{product.tva}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Historique complet */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5 text-primary" />
                  Historique des modifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {historique.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Aucun historique de prix pour ce produit
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Bon d'entrée</th>
                          <th className="px-4 py-3 text-right">Prix Achat HT</th>
                          <th className="px-4 py-3 text-right">Prix Achat TTC</th>
                          <th className="px-4 py-3 text-right">Prix Vente TTC</th>
                          <th className="px-4 py-3 text-center">TVA</th>
                          <th className="px-4 py-3 text-center">Variation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historique.map((item, index) => {
                          const previousPrice = getLastPrice(index);
                          const variation = previousPrice ? getPriceVariation(item.prixVente, previousPrice) : null;
                          const isIncrease = variation && variation > 0;
                          const isDecrease = variation && variation < 0;

                          return (
                            <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="font-medium">
                                  {new Date(item.dateApplication).toLocaleDateString('fr-FR')}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(item.dateApplication).toLocaleTimeString('fr-FR')}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                {item.bonEntreeNumero ? (
                                  <>
                                    <Link 
                                      href={`/bons-entree/${item.bonEntree?.numero}`}
                                      className="font-medium text-primary hover:underline"
                                    >
                                      {item.bonEntreeNumero}
                                    </Link>
                                    {item.bonEntree?.fournisseur && (
                                      <div className="text-xs text-muted-foreground">
                                        Fournisseur: {item.bonEntree.fournisseur.nom}
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground italic">Création initiale</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(item.prixAchatHT)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {formatCurrency(item.prixAchat)}
                              </td>
                              <td className="px-4 py-3 text-right font-semibold">
                                {formatCurrency(item.prixVente)}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <Badge variant="outline">{item.tva}%</Badge>
                              </td>
                              <td className="px-4 py-3 text-center">
                                {variation !== null ? (
                                  <Badge
                                    className={cn(
                                      "gap-1",
                                      isIncrease ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                                    )}
                                  >
                                    {isIncrease ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                    {variation > 0 ? "+" : ""}{variation.toFixed(1)}%
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="gap-1">
                                    <span>Premier prix</span>
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Statistiques supplémentaires */}
            {historique.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    📈 Statistiques d'évolution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-sm text-green-600">Prix initial</p>
                      <p className="text-xl font-bold text-green-700">
                        {formatCurrency(historique[historique.length - 1]?.prixVente || 0)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-600">Prix actuel</p>
                      <p className="text-xl font-bold text-blue-700">
                        {formatCurrency(historique[0]?.prixVente || 0)}
                      </p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-sm text-purple-600">Évolution totale</p>
                      <p className="text-xl font-bold text-purple-700">
                        {(() => {
                          const firstPrice = historique[historique.length - 1]?.prixVente || 0;
                          const lastPrice = historique[0]?.prixVente || 0;
                          const evolution = ((lastPrice - firstPrice) / firstPrice) * 100;
                          const isPositive = evolution > 0;
                          return (
                            <span className={isPositive ? "text-red-600" : "text-green-600"}>
                              {isPositive ? "+" : ""}{evolution.toFixed(1)}%
                            </span>
                          );
                        })()}
                      </p>
                    </div>
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