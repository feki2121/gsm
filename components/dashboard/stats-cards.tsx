"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/types";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  AlertTriangle,
  CreditCard,
  Landmark,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  variant?: "default" | "success" | "warning" | "destructive";
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = "default",
}: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-lg",
            variant === "default" && "bg-primary/10 text-primary",
            variant === "success" && "bg-green-500/10 text-green-600",
            variant === "warning" && "bg-yellow-500/10 text-yellow-600",
            variant === "destructive" && "bg-red-500/10 text-red-600"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {(subtitle || trendValue) && (
          <div className="mt-1 flex items-center gap-2 text-sm">
            {trend && trendValue && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  trend === "up" && "text-green-600",
                  trend === "down" && "text-red-600"
                )}
              >
                {trend === "up" ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {trendValue}
              </span>
            )}
            {subtitle && (
              <span className="text-muted-foreground">{subtitle}</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface StatsData {
  caJour: number;
  caMois: number;
  totalCreances: number;
  totalDettes: number;
  soldeCaisse: number;
  nbClients: number;
  nbProduits: number;
  nbFacturesMois: number;
  produitsAlerte: any[];
  totalReglementsJour: number;
  tauxReglement: number;
  evolutionCAMois: number;
}

export function StatsCards() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/stats/cards");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i}>
            <CardContent className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={fetchStats}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualiser
        </Button>
      </div>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="CA du Jour"
          value={formatCurrency(stats.caJour)}
          subtitle={`Règlements: ${formatCurrency(stats.totalReglementsJour)}`}
          icon={DollarSign}
          variant="success"
          trend={stats.tauxReglement > 70 ? "up" : "down"}
          trendValue={`${Math.round(stats.tauxReglement)}% recouvré`}
        />
        
        <StatCard
          title="CA du Mois"
          value={formatCurrency(stats.caMois)}
          subtitle={`${stats.nbFacturesMois} factures`}
          icon={ShoppingCart}
          variant="default"
          trend={stats.evolutionCAMois >= 0 ? "up" : "down"}
          trendValue={`${Math.abs(stats.evolutionCAMois)}% vs mois dernier`}
        />
        
        <StatCard
          title="Créances Clients"
          value={formatCurrency(stats.totalCreances)}
          icon={CreditCard}
          variant="warning"
        />
        
        <StatCard
          title="Dettes Fournisseurs"
          value={formatCurrency(stats.totalDettes)}
          icon={CreditCard}
          variant="destructive"
        />
        
        <StatCard
          title="Solde Caisse"
          value={formatCurrency(stats.soldeCaisse)}
          icon={Landmark}
          variant="success"
        />
        
        <StatCard
          title="Clients"
          value={stats.nbClients}
          icon={Users}
          variant="default"
        />
        
        <StatCard
          title="Produits"
          value={stats.nbProduits}
          icon={ShoppingCart}
          variant="default"
        />
        
        <StatCard
          title="Alertes Stock"
          value={stats.produitsAlerte.length}
          subtitle="Produits sous seuil"
          icon={AlertTriangle}
          variant={stats.produitsAlerte.length > 0 ? "warning" : "default"}
        />
      </div>
    </div>
  );
}