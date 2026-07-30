// app/clients/statistiques/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { useSidebar } from "@/hooks/useSidebar";
import { Sidebar } from "@/components/layout/sidebartest";
import { Header } from "@/components/layout/header";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { formatCurrency, formatDate } from "@/lib/types";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Icons
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingBag,
  BarChart3,
  Calendar,
  Search,
  Download,
  Eye,
  ArrowUpDown,
  Loader2,
  PieChart,
  Activity,
  Award,
  Crown,
  Wallet,
  Lock,
} from "lucide-react";

// Recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface ClientStats {
  clientId: string;
  clientNom: string;
  clientTelephone: string;
  clientEmail: string | null;
  clientVille: string | null;
  totalBL: number;
  caTotal: number;
  caHT: number;
  caTVA: number;
  recette: number;
  achat: number;
  margeBrute: number;
  margeNette: number;
  tauxMargeBrute: number;
  tauxMargeNette: number;
  panierMoyen: number;
  dernierAchat: string | null;
  firstAchat: string | null;
  totalMouvements: number;
  topProducts: Array<{
    productId: string;
    designation: string;
    quantite: number;
    total: number;
  }>;
  bls: Array<{
    id: string;
    numero: string;
    date: string;
    montantTotal: number;
    montantHT: number;
    margeBrute: number;
    margeNette: number;
  }>;
}

interface FilterState {
  dateDebut: string;
  dateFin: string;
  clientId: string;
  searchTerm: string;
  sortBy: keyof ClientStats | "clientNom";
  sortOrder: "asc" | "desc";
}

const COLORS = ["#3b82f6", "#8b5cf6", "#06b6d4", "#22c55e", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6"];

export default function StatistiquesClientsPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<ClientStats[]>([]);
  const [clients, setClients] = useState<{ id: string; nom: string }[]>([]);
  const [selectedClientDetail, setSelectedClientDetail] = useState<ClientStats | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    dateDebut: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0],
    dateFin: new Date().toISOString().split("T")[0],
    clientId: "all",
    searchTerm: "",
    sortBy: "recette",
    sortOrder: "desc",
  });

  useEffect(() => {
    if (isAdmin) {
      fetchClients();
      fetchStats();
    } else {
      setIsLoading(false);
    }
  }, [filters.dateDebut, filters.dateFin, filters.clientId, isAdmin]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=1000");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        dateDebut: filters.dateDebut,
        dateFin: filters.dateFin,
        ...(filters.clientId !== "all" && { clientId: filters.clientId }),
      });
      const response = await fetch(`/api/clients/statistiques?${params}`);
      const data = await response.json();
      setStats(data.data || []);
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

  const filteredAndSortedStats = useMemo(() => {
    let result = [...stats];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      result = result.filter(
        (s) =>
          s.clientNom.toLowerCase().includes(term) ||
          s.clientTelephone.includes(term) ||
          (s.clientEmail?.toLowerCase().includes(term) || false)
      );
    }

    result.sort((a, b) => {
      const aVal = a[filters.sortBy as keyof ClientStats] ?? 0;
      const bVal = b[filters.sortBy as keyof ClientStats] ?? 0;
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === "asc" ? cmp : -cmp;
    });

    return result;
  }, [stats, filters.searchTerm, filters.sortBy, filters.sortOrder]);

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => ({
        clients: acc.clients + 1,
        ca: acc.ca + s.caTotal,
        recette: acc.recette + s.recette,
        achat: acc.achat + s.achat,
        margeBrute: acc.margeBrute + s.margeBrute,
        margeNette: acc.margeNette + s.margeNette,
        bls: acc.bls + s.totalBL,
      }),
      { clients: 0, ca: 0, recette: 0, achat: 0, margeBrute: 0, margeNette: 0, bls: 0 }
    );
  }, [stats]);

  const topClients = useMemo(() => {
    return [...stats].sort((a, b) => b.recette - a.recette).slice(0, 5);
  }, [stats]);

  const handleViewDetails = (client: ClientStats) => {
    setSelectedClientDetail(client);
    setIsDetailOpen(true);
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const headers = [
        "Client",
        "Téléphone",
        "Email",
        "Ville",
        "Nombre BL",
        "CA Total",
        "Recette",
        "Achat (CV)",
        "Marge Brute",
        "Marge Nette",
        "Taux Marge Brute",
        "Taux Marge Nette",
        "Panier Moyen",
      ];
      const rows = filteredAndSortedStats.map((s) => [
        s.clientNom,
        s.clientTelephone,
        s.clientEmail || "",
        s.clientVille || "",
        s.totalBL,
        s.caTotal.toFixed(3),
        s.recette.toFixed(3),
        s.achat.toFixed(3),
        s.margeBrute.toFixed(3),
        s.margeNette.toFixed(3),
        (s.tauxMargeBrute * 100).toFixed(2) + "%",
        (s.tauxMargeNette * 100).toFixed(2) + "%",
        s.panierMoyen.toFixed(3),
      ]);

      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.join(",")),
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statistiques_clients_${filters.dateDebut}_${filters.dateFin}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast({ title: "Succès", description: "Export CSV effectué avec succès" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Erreur lors de l'export",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  // 🔒 Si l'utilisateur n'est pas admin, afficher la page d'accès restreint
  if (!isAdmin) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Statistiques Clients" subtitle="Analyse de rentabilité" />
          <main className="p-4 md:p-6">
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
              <div className="w-24 h-24 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="h-12 w-12 text-amber-600" />
              </div>
              <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-muted">
                <p className="text-sm text-muted-foreground">
                  🔒 <span className="font-medium">Bienvenue sur notre ERP</span> - 
                  Kallel Tech Company
                </p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Statistiques Clients" subtitle="Analyse de rentabilité" />
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
        <Header title="Statistiques Clients" subtitle="Analyse de rentabilité" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Filtres */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-end gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <Label className="text-xs">Du</Label>
                      <Input
                        type="date"
                        value={filters.dateDebut}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, dateDebut: e.target.value }))
                        }
                        className="w-auto"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Au</Label>
                      <Input
                        type="date"
                        value={filters.dateFin}
                        min={filters.dateDebut}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, dateFin: e.target.value }))
                        }
                        className="w-auto"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Client</Label>
                    <Select
                      value={filters.clientId}
                      onValueChange={(value) =>
                        setFilters((prev) => ({ ...prev, clientId: value }))
                      }
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Tous les clients" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tous les clients</SelectItem>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex-1 min-w-[200px]">
                    <Label className="text-xs">Rechercher</Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Nom, téléphone, email..."
                        value={filters.searchTerm}
                        onChange={(e) =>
                          setFilters((prev) => ({ ...prev, searchTerm: e.target.value }))
                        }
                        className="pl-8"
                      />
                    </div>
                  </div>

                  <Button variant="outline" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Exporter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* KPI Cards - Alignées avec la caisse */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
              <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-100">Clients actifs</p>
                      <p className="text-3xl font-bold">{totals.clients}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-emerald-100">RECETTE (CA)</p>
                      <p className="text-2xl font-bold">{formatCurrency(totals.recette)}</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-emerald-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-100">ACHAT (CV)</p>
                      <p className="text-2xl font-bold">{formatCurrency(totals.achat)}</p>
                    </div>
                    <TrendingDown className="h-8 w-8 text-purple-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-amber-100">MARGE BRUTE</p>
                      <p className="text-2xl font-bold">{formatCurrency(totals.margeBrute)}</p>
                    </div>
                    <Activity className="h-8 w-8 text-amber-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-rose-500 to-rose-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-rose-100">MARGE NETTE</p>
                      <p className="text-2xl font-bold">{formatCurrency(totals.margeNette)}</p>
                    </div>
                    <Wallet className="h-8 w-8 text-rose-200" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-indigo-100">Total BL</p>
                      <p className="text-3xl font-bold">{totals.bls}</p>
                    </div>
                    <ShoppingBag className="h-8 w-8 text-indigo-200" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clients & Graphiques */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Top 5 Clients */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Crown className="h-5 w-5 text-amber-500" />
                    Top 5 Clients (par Recette)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {topClients.map((client, index) => (
                      <div
                        key={client.clientId}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition cursor-pointer"
                        onClick={() => handleViewDetails(client)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-white",
                              index === 0
                                ? "bg-amber-500"
                                : index === 1
                                ? "bg-gray-400"
                                : index === 2
                                ? "bg-amber-700"
                                : "bg-blue-500"
                            )}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{client.clientNom}</p>
                            <p className="text-xs text-muted-foreground">
                              {client.totalBL} BL · Recette: {formatCurrency(client.recette)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">
                            {formatCurrency(client.margeNette)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(client.tauxMargeNette * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    ))}
                    {topClients.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun client avec des ventes
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Distribution Recette par client */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5 text-blue-500" />
                    Répartition de la Recette
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={topClients}
                          dataKey="recette"
                          nameKey="clientNom"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={({ name, percent }) =>
                            `${name}: ${(percent * 100).toFixed(1)}%`
                          }
                          labelLine={true}
                        >
                          {topClients.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={COLORS[index % COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => formatCurrency(value)}
                        />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tableau des clients */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Liste des clients
                    <Badge variant="secondary" className="ml-2">
                      {filteredAndSortedStats.length}
                    </Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: "clientNom",
                          sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                        }))
                      }
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead
                          className="cursor-pointer hover:text-primary"
                          onClick={() =>
                            setFilters((prev) => ({
                              ...prev,
                              sortBy: "clientNom",
                              sortOrder: prev.sortOrder === "asc" ? "desc" : "asc",
                            }))
                          }
                        >
                          Client
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setFilters(prev => ({ ...prev, sortBy: "recette", sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
                          Recette
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setFilters(prev => ({ ...prev, sortBy: "achat", sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
                          Achat (CV)
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setFilters(prev => ({ ...prev, sortBy: "margeBrute", sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
                          Marge Brute
                        </TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setFilters(prev => ({ ...prev, sortBy: "margeNette", sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
                          Marge Nette
                        </TableHead>
                        <TableHead className="text-right">Taux MN</TableHead>
                        <TableHead className="text-right cursor-pointer hover:text-primary" onClick={() => setFilters(prev => ({ ...prev, sortBy: "totalBL", sortOrder: prev.sortOrder === "asc" ? "desc" : "asc" }))}>
                          BL
                        </TableHead>
                        <TableHead className="text-right">Panier Moy.</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAndSortedStats.map((client) => (
                        <TableRow key={client.clientId}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{client.clientNom}</p>
                              <p className="text-xs text-muted-foreground">
                                {client.clientTelephone}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-blue-600">
                            {formatCurrency(client.recette)}
                          </TableCell>
                          <TableCell className="text-right text-purple-600">
                            {formatCurrency(client.achat)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-600">
                            {formatCurrency(client.margeBrute)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-semibold",
                              client.margeNette >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {formatCurrency(client.margeNette)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right",
                              client.tauxMargeNette >= 0 ? "text-green-600" : "text-red-600"
                            )}
                          >
                            {(client.tauxMargeNette * 100).toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right">{client.totalBL}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(client.panierMoyen)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDetails(client)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredAndSortedStats.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Aucun client trouvé
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Dialog Détails Client */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedClientDetail && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  <span>{selectedClientDetail.clientNom}</span>
                  <Badge variant="outline" className="text-sm">
                    {selectedClientDetail.totalBL} BL
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Infos client */}
                <div className="grid gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{selectedClientDetail.clientTelephone}</p>
                  </div>
                  {selectedClientDetail.clientEmail && (
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedClientDetail.clientEmail}</p>
                    </div>
                  )}
                  {selectedClientDetail.clientVille && (
                    <div>
                      <p className="text-sm text-muted-foreground">Ville</p>
                      <p className="font-medium">{selectedClientDetail.clientVille}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground">Dernier achat</p>
                    <p className="font-medium">
                      {selectedClientDetail.dernierAchat
                        ? formatDate(new Date(selectedClientDetail.dernierAchat))
                        : "Aucun"}
                    </p>
                  </div>
                </div>

                {/* KPI client */}
                <div className="grid gap-4 sm:grid-cols-5">
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Recette</p>
                      <p className="text-xl font-bold text-blue-600">
                        {formatCurrency(selectedClientDetail.recette)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Achat (CV)</p>
                      <p className="text-xl font-bold text-purple-600">
                        {formatCurrency(selectedClientDetail.achat)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Marge Brute</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {formatCurrency(selectedClientDetail.margeBrute)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Marge Nette</p>
                      <p
                        className={cn(
                          "text-xl font-bold",
                          selectedClientDetail.margeNette >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {formatCurrency(selectedClientDetail.margeNette)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <p className="text-sm text-muted-foreground">Panier Moyen</p>
                      <p className="text-xl font-bold text-amber-600">
                        {formatCurrency(selectedClientDetail.panierMoyen)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Évolution des marges */}
                {selectedClientDetail.bls.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Évolution des Marges par BL
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={selectedClientDetail.bls
                              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                              .map((bl) => ({
                                date: formatDate(new Date(bl.date)),
                                margeBrute: bl.margeBrute,
                                margeNette: bl.margeNette,
                              }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis tickFormatter={(v) => formatCurrency(v)} />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                            />
                            <Legend />
                            <Bar dataKey="margeBrute" fill="#8b5cf6" name="Marge Brute" />
                            <Bar dataKey="margeNette" fill="#22c55e" name="Marge Nette" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top produits */}
                {selectedClientDetail.topProducts.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">
                        Top produits achetés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={selectedClientDetail.topProducts.slice(0, 10)}
                            layout="vertical"
                            margin={{ left: 100 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} />
                            <YAxis
                              type="category"
                              dataKey="designation"
                              width={100}
                              tick={{ fontSize: 11 }}
                            />
                            <Tooltip
                              formatter={(value: number) => formatCurrency(value)}
                            />
                            <Bar dataKey="total" fill="#3b82f6" name="Total" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Historique des BL */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">
                      Historique des BL
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>N° BL</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                            <TableHead className="text-right">HT</TableHead>
                            <TableHead className="text-right">Marge Brute</TableHead>
                            <TableHead className="text-right">Marge Nette</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedClientDetail.bls
                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                            .slice(0, 20)
                            .map((bl) => (
                              <TableRow key={bl.id}>
                                <TableCell className="font-mono text-sm">
                                  {bl.numero}
                                </TableCell>
                                <TableCell>{formatDate(new Date(bl.date))}</TableCell>
                                <TableCell className="text-right font-semibold">
                                  {formatCurrency(bl.montantTotal)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatCurrency(bl.montantHT)}
                                </TableCell>
                                <TableCell className="text-right text-emerald-600">
                                  {formatCurrency(bl.margeBrute)}
                                </TableCell>
                                <TableCell
                                  className={cn(
                                    "text-right font-semibold",
                                    bl.margeNette >= 0 ? "text-green-600" : "text-red-600"
                                  )}
                                >
                                  {formatCurrency(bl.margeNette)}
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}