"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/types";
import { 
  AlertTriangle, 
  ArrowRight, 
  Package, 
  CalendarClock, 
  Loader2,
  Building2,
  MapPin
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface ProduitAlerte {
  id: string;
  reference: string;
  designation: string;
  quantiteStock: number;
  seuilAlerte: number;
  prixVente: number;
  category: string;
  home: string;
  stockLocations?: {
    homeNom: string;
    quantite: number;
  }[];
}

interface TraiteProche {
  id: string;
  reference: string;
  montant: number;
  echeance: Date;
  client: {
    id: string;
    nom: string;
    telephone: string;
  };
  typeReglement: string;
}

interface FactureImpayee {
  id: string;
  numero: string;
  totalTTC: number;
  date: Date;
  client: {
    id: string;
    nom: string;
  };
}

interface AlertesStats {
  totalProduitsAlerte: number;
  totalTraitesProches: number;
  totalFacturesImpayees: number;
  produitsRupture: number;
  produitsStockBas: number;
}

export function AlertsPanel() {
  const [produitsAlerte, setProduitsAlerte] = useState<ProduitAlerte[]>([]);
  const [traitesProches, setTraitesProches] = useState<TraiteProche[]>([]);
  const [facturesImpayees, setFacturesImpayees] = useState<FactureImpayee[]>([]);
  const [stats, setStats] = useState<AlertesStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAlertes();
  }, []);

  const fetchAlertes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stats/alertes");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setProduitsAlerte(data.produitsAlerte || []);
      setTraitesProches(data.traitesProches || []);
      setFacturesImpayees(data.facturesImpayees || []);
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching alertes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les alertes",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatutColor = (quantite: number, seuil: number) => {
    if (quantite === 0) return "border-red-500 text-red-500 bg-red-500/5";
    return "border-yellow-500 text-yellow-500 bg-yellow-500/5";
  };

  const getEcheanceColor = (echeance: Date) => {
    const today = new Date();
    const in3Days = new Date();
    in3Days.setDate(today.getDate() + 3);
    
    if (echeance <= in3Days) return "text-red-600";
    return "text-yellow-600";
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stock Alerts */}
      <Card className="border-yellow-500/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Alertes Stock
            {stats && stats.totalProduitsAlerte > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.totalProduitsAlerte}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/stock/alertes" className="flex items-center gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {produitsAlerte.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune alerte de stock</p>
          ) : (
            <div className="space-y-3">
              {/* Stats rapides */}
              <div className="flex gap-2 mb-3">
                {stats && stats.produitsRupture > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    Rupture: {stats.produitsRupture}
                  </Badge>
                )}
                {stats && stats.produitsStockBas > 0 && (
                  <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                    Stock bas: {stats.produitsStockBas}
                  </Badge>
                )}
              </div>
              
              {produitsAlerte.slice(0, 4).map((produit) => (
                <div
                  key={produit.id}
                  className={`flex flex-col gap-2 rounded-lg p-3 ${getStatutColor(produit.quantiteStock, produit.seuilAlerte)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-inherit">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{produit.designation}</p>
                        <p className="text-xs text-muted-foreground">{produit.reference}</p>
                      </div>
                    </div>
                    <Badge variant="outline" className={produit.quantiteStock === 0 ? "border-red-500 text-red-500" : "border-yellow-500 text-yellow-500"}>
                      {produit.quantiteStock} / {produit.seuilAlerte}
                    </Badge>
                  </div>
                  {/* Afficher les emplacements si multi-stock */}
                  {produit.stockLocations && produit.stockLocations.length > 1 && (
                    <div className="flex gap-2 text-xs pl-11">
                      {produit.stockLocations.map((loc, idx) => (
                        <span key={idx} className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {loc.homeNom}: {loc.quantite}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {produitsAlerte.length > 4 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{produitsAlerte.length - 4} autres produits en alerte
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming Traites */}
      <Card className="border-blue-500/50">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-5 w-5 text-blue-500" />
            Échéances Proches
            {stats && stats.totalTraitesProches > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.totalTraitesProches}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/recouvrement-clients" className="flex items-center gap-1">
              Voir tout
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {traitesProches.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune échéance proche</p>
          ) : (
            <div className="space-y-3">
              {traitesProches.slice(0, 4).map((traite) => (
                <div
                  key={traite.id}
                  className="flex items-center justify-between rounded-lg bg-blue-500/5 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-blue-500/10 text-blue-500">
                      <CalendarClock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{traite.client?.nom}</p>
                      <p className="text-xs text-muted-foreground">
                        {traite.reference || 'Sans référence'} - {traite.echeance && formatDate(new Date(traite.echeance))}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-blue-600">
                      {formatCurrency(traite.montant)}
                    </span>
                    <p className={`text-xs ${getEcheanceColor(new Date(traite.echeance))}`}>
                      {Math.ceil((new Date(traite.echeance).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} jours
                    </p>
                  </div>
                </div>
              ))}
              {traitesProches.length > 4 && (
                <p className="text-xs text-center text-muted-foreground">
                  +{traitesProches.length - 4} autres échéances
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Overdue Invoices (optionnel) */}
      {facturesImpayees.length > 0 && (
        <Card className="border-red-500/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Factures Impayées +30j
              <Badge variant="destructive" className="ml-2">
                {facturesImpayees.length}
              </Badge>
            </CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/factures" className="flex items-center gap-1">
                Voir tout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {facturesImpayees.slice(0, 3).map((facture) => (
                <div
                  key={facture.id}
                  className="flex items-center justify-between rounded-lg bg-red-500/5 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{facture.client?.nom}</p>
                    <p className="text-xs text-muted-foreground">
                      Facture: {facture.numero} - {formatDate(new Date(facture.date))}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-red-600">
                    {formatCurrency(facture.totalTTC)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}