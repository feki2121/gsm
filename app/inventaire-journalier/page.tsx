"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    formatCurrency,
    formatDate,
} from "@/lib/types";
import {
    Calendar,
    Package,
    TrendingUp,
    FileText,
    Truck,
    RefreshCw,
    Loader2,
    Download,
    Printer,
    ChevronLeft,
    ChevronRight,
    Filter,
    X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface VenteProduit {
    productId: string;
    reference: string;
    designation: string;
    code: string;
    category: string;
    prixVente: number;
    quantiteTotale: number;
    totalHT: number;
    totalTTC: number;
    emplacements: {
        homeId: string;
        homeNom: string;
        quantite: number;
    }[];
    bonsLivraison: {  // ← Garder uniquement les BL
        numero: string;
        client: string;
        date: string;
        statut?: string;
    }[];
}

interface InventaireJournalier {
    date: string;
    dateFormatted: string;
    totalVentes: {
        quantiteTotale: number;
        totalHT: number;
        totalTTC: number;
        nombreBonsLivraison: number;
        nombreFactures: number;
        nombreBonsSortie: number;
    };
    ventes: VenteProduit[];
}

interface Home {
    id: string;
    nom: string;
}

export default function InventaireJournalierPage() {
  const { sidebarClasses } = useSidebar();
    const [data, setData] = useState<InventaireJournalier | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [selectedProduct, setSelectedProduct] = useState<VenteProduit | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [homes, setHomes] = useState<Home[]>([]);
    const [selectedHome, setSelectedHome] = useState<string>("all");
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        fetchInventaire();
        fetchHomes();
    }, [selectedDate]);

    const fetchHomes = async () => {
        try {
            const response = await fetch("/api/homes?limit=100");
            const data = await response.json();
            setHomes(data.data || []);
        } catch (error) {
            console.error("Error fetching homes:", error);
        }
    };

    const fetchInventaire = async () => {
        setIsLoading(true);
        try {
            const dateStr = selectedDate.toISOString().split('T')[0];
            const response = await fetch(`/api/inventaire-journalier?date=${dateStr}`);
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const result = await response.json();
            setData(result);
        } catch (error) {
            console.error("Error fetching inventaire:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger l'inventaire journalier",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const changeDate = (days: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + days);
        setSelectedDate(newDate);
    };

    const today = new Date();
    const isToday = selectedDate.toDateString() === today.toDateString();

    // Filtrer les ventes par emplacement
    const filteredVentes = data?.ventes.filter(vente => {
        if (selectedHome === "all") return true;
        return vente.emplacements.some(emp => emp.homeId === selectedHome);
    }) || [];

    // Calculer les totaux filtrés
    const filteredTotals = {
        quantiteTotale: filteredVentes.reduce((sum, v) => sum + v.quantiteTotale, 0),
        totalHT: filteredVentes.reduce((sum, v) => sum + v.totalHT, 0),
        totalTTC: filteredVentes.reduce((sum, v) => sum + v.totalTTC, 0),
    };

    const resetFilter = () => {
        setSelectedHome("all");
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Inventaire Journalier" subtitle="Suivi des ventes quotidiennes" />
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
                <Header title="Inventaire Journalier" subtitle="Suivi des ventes quotidiennes par produit" />
                <main className="p-4 md:p-6">
                    <div className="space-y-6">
                        {/* Date Selector and Filters */}
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-4 flex-wrap">
                                <Button variant="outline" size="icon" onClick={() => changeDate(-1)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-2">
                                    <Calendar className="h-5 w-5 text-muted-foreground" />
                                    <input
                                        type="date"
                                        value={selectedDate.toISOString().split('T')[0]}
                                        onChange={(e) => setSelectedDate(new Date(e.target.value))}
                                        className="px-3 py-2 text-lg font-semibold border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                                        style={{ fontFamily: 'inherit' }}
                                    />
                                    {isToday && (
                                        <Badge className="bg-blue-500 text-white">Aujourd'hui</Badge>
                                    )}
                                </div>

                                <Button variant="outline" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setSelectedDate(new Date())}>
                                    Aujourd'hui
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={fetchInventaire}>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Actualiser
                                </Button>
                            </div>
                        </div>

                        {/* Filtre par emplacement - Panel déroulant */}
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-end gap-4">
                                        <div className="flex-1">
                                            <Label className="text-sm">Filtrer par emplacement</Label>
                                            <Select value={selectedHome} onValueChange={setSelectedHome}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Tous les emplacements" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">📦 Tous les emplacements</SelectItem>
                                                    {homes.map(home => (
                                                        <SelectItem key={home.id} value={home.id}>
                                                            🏠 {home.nom}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {selectedHome !== "all" && (
                                            <Button variant="ghost" size="sm" onClick={resetFilter}>
                                                <X className="h-4 w-4 mr-1" />
                                                Réinitialiser
                                            </Button>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>

                        {/* Products Table */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Package className="h-5 w-5 text-primary" />
                                    Produits Vendus
                                    {selectedHome !== "all" && (
                                        <Badge variant="secondary" className="ml-2">
                                            Filtré par emplacement
                                        </Badge>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {filteredVentes.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        {selectedHome !== "all" 
                                            ? "Aucun produit vendu dans cet emplacement pour cette date"
                                            : "Aucune vente enregistrée pour cette date"}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="border-b">
                                                    <th className="text-left py-3 px-4 font-medium">Référence</th>
                                                    <th className="text-left py-3 px-4 font-medium">Code</th>
                                                    <th className="text-left py-3 px-4 font-medium">Désignation</th>
                                                    <th className="text-left py-3 px-4 font-medium">Catégorie</th>
                                                    <th className="text-right py-3 px-4 font-medium">Qté Vendue</th>
                                                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredVentes.map((vente) => (
                                                    <tr key={vente.productId} className="border-b hover:bg-muted/50">
                                                        <td className="py-3 px-4 font-mono text-sm">{vente.reference}</td>
                                                        <td className="py-3 px-4 font-mono text-sm">{vente.code}</td>
                                                        <td className="py-3 px-4 font-medium">{vente.designation}</td>
                                                        <td className="py-3 px-4">
                                                            <Badge variant="outline">{vente.category}</Badge>
                                                        </td>
                                                        <td className="py-3 px-4 text-right font-semibold text-blue-600">
                                                            {vente.quantiteTotale}
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedProduct(vente);
                                                                    setIsDetailsOpen(true);
                                                                }}
                                                            >
                                                                Détails
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Product Details Dialog */}
                        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Détails du produit</DialogTitle>
                                    <DialogDescription>
                                        {selectedProduct?.reference} - {selectedProduct?.designation}
                                    </DialogDescription>
                                </DialogHeader>
                                {selectedProduct && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-muted rounded-lg">
                                                <p className="text-sm text-muted-foreground">Quantité vendue</p>
                                                <p className="text-2xl font-bold text-blue-600">{selectedProduct.quantiteTotale}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <h4 className="font-semibold mb-2">Ventes par emplacement</h4>
                                            <div className="space-y-2">
                                                {selectedProduct.emplacements.map((emp, idx) => (
                                                    <div key={idx} className="flex justify-between p-2 bg-muted/50 rounded">
                                                        <span>{emp.homeNom}</span>
                                                        <span className="font-semibold">{emp.quantite} unités</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </DialogContent>
                        </Dialog>
                    </div>
                </main>
            </div>
        </div>
    );
}