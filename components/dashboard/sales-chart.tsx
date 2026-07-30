"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Loader2, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VentesData {
  name: string;
  ventes: number;
  recouvrement: number;
}

interface Stats {
  totalVentes: number;
  totalRecouvrement: number;
  tauxRecouvrement: number;
  nombreFactures: number;
  nombreReglements: number;
  ventesMoisCourant: number;
  recouvrementMoisCourant: number;
}

export function SalesChart() {
  const [data, setData] = useState<VentesData[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [moisDebut, setMoisDebut] = useState("1");
  const [moisFin, setMoisFin] = useState("12");
  const { toast } = useToast();

  const moisLabels = [
    { value: "1", label: "Janvier" },
    { value: "2", label: "Février" },
    { value: "3", label: "Mars" },
    { value: "4", label: "Avril" },
    { value: "5", label: "Mai" },
    { value: "6", label: "Juin" },
    { value: "7", label: "Juillet" },
    { value: "8", label: "Août" },
    { value: "9", label: "Septembre" },
    { value: "10", label: "Octobre" },
    { value: "11", label: "Novembre" },
    { value: "12", label: "Décembre" },
  ];

  const annees = [2023, 2024, 2025, 2026];

  useEffect(() => {
    fetchVentes();
  }, [annee, moisDebut, moisFin]);

  const fetchVentes = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/stats/ventes?year=${annee}&moisDebut=${moisDebut}&moisFin=${moisFin}`
      );
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const result = await response.json();
      setData(result.data || []);
      setStats(result.stats);
    } catch (error) {
      console.error("Error fetching ventes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les statistiques",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("fr-TN", {
      style: "currency",
      currency: "TND",
    }).format(value);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-4">
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          Évolution des Ventes
        </CardTitle>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Select value={annee.toString()} onValueChange={(v) => setAnnee(parseInt(v))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Année" />
              </SelectTrigger>
              <SelectContent>
                {annees.map((a) => (
                  <SelectItem key={a} value={a.toString()}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moisDebut} onValueChange={setMoisDebut}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Du mois" />
              </SelectTrigger>
              <SelectContent>
                {moisLabels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={moisFin} onValueChange={setMoisFin}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Au mois" />
              </SelectTrigger>
              <SelectContent>
                {moisLabels.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={fetchVentes}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-primary" />
              <span className="text-muted-foreground">Ventes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded bg-green-500" />
              <span className="text-muted-foreground">Recouvrement</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Ventes</p>
              <p className="text-lg font-bold">{formatCurrency(stats.totalVentes)}</p>
            </div>
            <div className="p-3 bg-green-500/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Total Recouvrement</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(stats.totalRecouvrement)}</p>
            </div>
            <div className="p-3 bg-blue-500/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Taux Recouvrement</p>
              <p className="text-lg font-bold text-blue-600">{stats.tauxRecouvrement}%</p>
            </div>
            <div className="p-3 bg-purple-500/5 rounded-lg">
              <p className="text-xs text-muted-foreground">Nombre Factures</p>
              <p className="text-lg font-bold">{stats.nombreFactures}</p>
            </div>
          </div>
        )}

        {/* Graphique */}
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorVentes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="oklch(0.55 0.2 250)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="oklch(0.55 0.2 250)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorRecouvrement" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="name"
                tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.9 0.01 240)" }}
                tickLine={{ stroke: "oklch(0.9 0.01 240)" }}
              />
              <YAxis
                tick={{ fill: "oklch(0.5 0.02 260)", fontSize: 12 }}
                axisLine={{ stroke: "oklch(0.9 0.01 240)" }}
                tickLine={{ stroke: "oklch(0.9 0.01 240)" }}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
                labelFormatter={(label) => `Mois de ${label}`}
                contentStyle={{
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
              />
              <Area
                type="monotone"
                dataKey="ventes"
                name="Ventes"
                stroke="oklch(0.55 0.2 250)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVentes)"
              />
              <Area
                type="monotone"
                dataKey="recouvrement"
                name="Recouvrement"
                stroke="#22c55e"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRecouvrement)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Indicateurs du mois courant */}
        {stats && (
          <div className="mt-4 pt-4 border-t flex justify-between text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span>Ventes ce mois: </span>
              <span className="font-semibold">{formatCurrency(stats.ventesMoisCourant)}</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span>Recouvrement ce mois: </span>
              <span className="font-semibold text-green-600">{formatCurrency(stats.recouvrementMoisCourant)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}