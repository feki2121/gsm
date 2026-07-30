"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate, typeReglementLabels } from "@/lib/types";
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    Calendar,
    Banknote,
    FileText,
    CalendarClock,
    CreditCard,
    Loader2,
    Users
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface MouvementCaisse {
    id: string;
    date: string;
    type: 'ENCAISSEMENT' | 'DECAISSEMENT' | 'DECAISSEMENTVIRTUEL' | 'ENCAISSEMENTVIRTUEL' | 'ENCAISSEMENTCREDIT';
    modeReglement: string;
    montant: number;
    reference: string | null;
    libelle: string;
    createdAt: string;
}

interface Caisse {
    id: string;
    date: string;
    soldeOuverture: number;
    totalEncaissements: number;
    totalDecaissements: number;
    soldeTheorique: number;
    soldeReel: number | null;
    ecart: number | null;
    statut: 'OUVERTE' | 'CLOTUREE';
}

interface Chauffeur {
    id: string;
    nom: string;
}
interface StatistiquesCaisse {
    // Chèques
    totalCheque: number;
    nombreCheque: number;
    // Traites
    totalTraite: number;
    nombreTraite: number;
    // Virements
    totalVirement: number;
    nombreVirement: number;
    // Espèces ventes
    totalEspeceVente: number;
    // Espèces crédit
    totalEspeceCredit: number;
    // Recette (chiffre d'affaire)
    recette: number;
    // CV = Total Décaissements (prix d'achat)
    totalCV: number;
    // FIXE = Total Décaissements (pour l'instant, à ajuster selon votre logique)
    totalFixe: number;
    // NET = Encaissements - Décaissements
    totalNet: number;
    totalBrut: number;
}



export default function CaissePage() {
  const { sidebarClasses } = useSidebar();
    const { data: session } = useSession();
    const { toast } = useToast();
    const [caisse, setCaisse] = useState<Caisse | null>(null);
    const [mouvements, setMouvements] = useState<MouvementCaisse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const getTodayTunisia = () => {
        const now = new Date();
        // Décaler pour UTC+1 (Tunisie)
        const tunisiaTime = new Date(now.getTime() + (60 * 60 * 1000));
        return tunisiaTime.toISOString().split('T')[0];
    };
    // const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
    // const [dateDebut, setDateDebut] = useState<string>(new Date().toISOString().split('T')[0]);
    // const [dateFin, setDateFin] = useState<string>(new Date().toISOString().split('T')[0]);

    const [dateDebut, setDateDebut] = useState<string>(getTodayTunisia());
    const [dateFin, setDateFin] = useState<string>(getTodayTunisia());
    const [isClosingDialogOpen, setIsClosingDialogOpen] = useState(false);
    const [soldeReel, setSoldeReel] = useState<number>(0);
    const [isClosing, setIsClosing] = useState(false);

    // États pour l'admin
    const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
    const [selectedChauffeurId, setSelectedChauffeurId] = useState<string>("");
    const [viewMode, setViewMode] = useState<'single' | 'all'>('single');
    const [allCaisses, setAllCaisses] = useState<any[]>([]);
    const [statistiques, setStatistiques] = useState<StatistiquesCaisse>({
        totalCheque: 0,
        nombreCheque: 0,
        totalTraite: 0,
        nombreTraite: 0,
        totalVirement: 0,
        nombreVirement: 0,
        totalEspeceVente: 0,
        totalEspeceCredit: 0,
        recette: 0,
        totalCV: 0,
        totalFixe: 0,
        totalNet: 0,
        totalBrut: 0,
    });
    const isAdmin = session?.user?.role === 'ADMIN';

    useEffect(() => {
        fetchCaisse();
        if (isAdmin) {
            fetchChauffeurs();
        }
        // }, [selectedDate, selectedChauffeurId, viewMode]);
    }, [dateDebut, dateFin, selectedChauffeurId, viewMode]);

    const fetchChauffeurs = async () => {
        try {
            const response = await fetch("/api/chauffeurs?limit=100");
            const data = await response.json();
            setChauffeurs(data.data || []);
        } catch (error) {
            console.error("Error fetching chauffeurs:", error);
        }
    };


    const fetchCaisse = async () => {
        setIsLoading(true);
        try {
            // let url = `/api/caisse?date=${selectedDate}`;
            let url = `/api/caisse?dateDebut=${dateDebut}&dateFin=${dateFin}`;

            if (isAdmin && viewMode === 'all') {
                url += `&all=true`;
            } else if (isAdmin && selectedChauffeurId) {
                url += `&chauffeurId=${selectedChauffeurId}`;
            }

            const response = await fetch(url);
            const data = await response.json();

            if (data.type === 'all') {
                setAllCaisses(data.caisses);
                setCaisse(null);
                setMouvements([]);

                // Calculer les stats pour toutes les caisses
                const tousMouvements = data.caisses.flatMap((c: any) => c.mouvements || []);
                const stats = calculerStatistiques(tousMouvements);
                setStatistiques(stats);
            } else {
                setCaisse(data);

                // Tous les mouvements (avec virtuels) → pour les stats CV
                const tousLesMouvements = data.mouvements || [];

                // Sans virtuels → pour le tableau historique
                const mouvementsAffichage = (data.mouvementsAffichage || []).filter(
                    (m: MouvementCaisse) => m.type !== 'DECAISSEMENTVIRTUEL'
                );

                setMouvements(mouvementsAffichage);  // tableau : sans virtuels

                // Stats calculées sur TOUS les mouvements (virtuels inclus pour CV)
                const stats = calculerStatistiques(tousLesMouvements);
                setStatistiques(stats);
                setAllCaisses([]);
            }
        } catch (error) {
            console.error("Error fetching caisse:", error);
            toast({ title: "Erreur", description: "Impossible de charger l'état de caisse", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const getModeIcon = (mode: string) => {
        switch (mode) {
            case 'ESPECE': return <Banknote className="h-4 w-4" />;
            case 'CHEQUE': return <FileText className="h-4 w-4" />;
            case 'TRAITE_BANCAIRE':
            case 'TRAITE_DOMICILE': return <CalendarClock className="h-4 w-4" />;
            case 'VIREMENT':
            case 'CREDIT': return <CreditCard className="h-4 w-4" />;
            default: return <Wallet className="h-4 w-4" />;
        }
    };


    const calculerStatistiques = (mouvements: MouvementCaisse[]) => {
        // Initialisation
        let stats: StatistiquesCaisse = {
            totalCheque: 0,
            nombreCheque: 0,
            totalTraite: 0,
            nombreTraite: 0,
            totalVirement: 0,
            nombreVirement: 0,
            totalEspeceVente: 0,
            totalEspeceCredit: 0,
            recette: 0,
            totalCV: 0,
            totalFixe: 0,
            totalNet: 0,
            totalBrut: 0,
        };

        // Parcourir tous les mouvements
        for (const mouvement of mouvements) {
            const mode = mouvement.modeReglement;
            const montant = mouvement.montant;
            const libelle = mouvement.libelle?.toLowerCase() || '';

            if (mouvement.type === 'ENCAISSEMENTCREDIT') {
                stats.totalEspeceCredit += montant;
            }

            if (mouvement.type === 'ENCAISSEMENT' || mouvement.type === 'ENCAISSEMENTVIRTUEL') {
                // RECETTE = tous les encaissements (chiffre d'affaire)
                stats.recette += montant;

                if (mouvement.type === 'ENCAISSEMENT') {
                    // Détail par mode de règlement pour les encaissements
                    switch (mode) {
                        case 'CHEQUE':
                            stats.totalCheque += montant;
                            stats.nombreCheque++;
                            break;
                        case 'TRAITE_BANCAIRE':
                        case 'TRAITE_DOMICILE':
                            stats.totalTraite += montant;
                            stats.nombreTraite++;
                            break;
                        case 'VIREMENT':
                            stats.totalVirement += montant;
                            stats.nombreVirement++;
                            break;
                        case 'ESPECE':
                            if (libelle.includes('vente') || libelle.includes('facture') || libelle.includes('bl')) {
                                stats.totalEspeceVente += montant;
                            } else if (libelle.includes('crédit') || libelle.includes('credit')) {
                                stats.totalEspeceCredit += montant;
                            } else {
                                stats.totalEspeceVente += montant;
                            }
                            break;
                        // case 'CREDIT':
                        //     stats.totalEspeceCredit += montant;
                        //     break;
                    }
                }
            } else if (mouvement.type === 'DECAISSEMENTVIRTUEL') {
                // TOTAL CV = somme des décaissements virtuels (prix d'achat)
                stats.totalCV += montant;
            }
        }

        // TOTAL FIXE = somme des décaissements réels (dépenses)
        stats.totalFixe = mouvements
            .filter(m => m.type === 'DECAISSEMENT')
            .reduce((sum, m) => sum + m.montant, 0);

        // TOTAL NET = RECETTE - TOTAL CV (prix d'achat) - TOTAL FIXE (dépenses)
        stats.totalNet = stats.recette - stats.totalCV - stats.totalFixe;
        stats.totalBrut = stats.recette - stats.totalCV;

        return stats;
    };

    if (isLoading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="État de Caisse" subtitle="Gestion des encaissements et décaissements" />
                    <main className="p-4 md:p-6">
                        <div className="flex justify-center items-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    const totalEncaissements = caisse?.totalEncaissements || 0;
    const totalDecaissements = caisse?.totalDecaissements || 0;
    const soldeTheorique = caisse?.soldeTheorique || 0;

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="État de Caisse" subtitle="Gestion des encaissements et décaissements" />
                <main className="p-4 md:p-6">
                    <div className="space-y-6">
                        {/* Sélecteur de date et filtres */}
                        <Card>
                            <CardContent className="pt-6">
                                <div className="flex flex-wrap items-center gap-4">
                                    {/* Remplacez le bloc date unique par : */}
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-5 w-5 text-muted-foreground" />
                                        <Label>Du</Label>
                                        <Input
                                            type="date"
                                            value={dateDebut}
                                            onChange={(e) => setDateDebut(e.target.value)}
                                            className="w-auto"
                                        />
                                        <Label>Au</Label>
                                        <Input
                                            type="date"
                                            value={dateFin}
                                            min={dateDebut}
                                            onChange={(e) => setDateFin(e.target.value)}
                                            className="w-auto"
                                        />
                                    </div>

                                    <Button variant="outline" onClick={fetchCaisse}>
                                        Actualiser
                                    </Button>

                                    {/* Filtres pour admin */}
                                    {isAdmin && (
                                        <>
                                            <div className="flex items-center gap-2 ml-4">
                                                <Label>Mode</Label>
                                                <Button
                                                    variant={viewMode === 'single' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setViewMode('single')}
                                                >
                                                    Caisse unique
                                                </Button>
                                                <Button
                                                    variant={viewMode === 'all' ? 'default' : 'outline'}
                                                    size="sm"
                                                    onClick={() => setViewMode('all')}
                                                >
                                                    Toutes les caisses
                                                </Button>
                                            </div>

                                            {viewMode === 'single' && (
                                                <div className="flex items-center gap-2">
                                                    <Users className="h-4 w-4 text-muted-foreground" />
                                                    <Label>Chauffeur</Label>
                                                    <Select
                                                        value={selectedChauffeurId || "none"}
                                                        onValueChange={(value) => setSelectedChauffeurId(value === "none" ? "" : value)}
                                                    >
                                                        <SelectTrigger className="w-[200px]">
                                                            <SelectValue placeholder="Caisse Admin" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="none">Caisse Admin</SelectItem>
                                                            {chauffeurs.map((chauffeur) => (
                                                                <SelectItem key={chauffeur.id} value={chauffeur.id}>
                                                                    {chauffeur.nom}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ajoutez ce bloc avant la grid des caisses */}
                        {viewMode === 'all' && isAdmin && (
                            <>
                                {/* Cartes récapitulatives pour toutes les caisses */}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                    <Card className="bg-blue-50 border-blue-200">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">Total CHÈQUES</p>
                                                <p className="text-2xl font-bold text-blue-600">{formatCurrency(statistiques.totalCheque)}</p>
                                                <p className="text-xs text-muted-foreground">{statistiques.nombreCheque} chèque(s)</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-purple-50 border-purple-200">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">Total TRAITES</p>
                                                <p className="text-2xl font-bold text-purple-600">{formatCurrency(statistiques.totalTraite)}</p>
                                                <p className="text-xs text-muted-foreground">{statistiques.nombreTraite} traite(s)</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-indigo-50 border-indigo-200">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">Total VIREMENTS</p>
                                                <p className="text-2xl font-bold text-indigo-600">{formatCurrency(statistiques.totalVirement)}</p>
                                                <p className="text-xs text-muted-foreground">{statistiques.nombreVirement} virement(s)</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-emerald-50 border-emerald-200">
                                        <CardContent className="pt-6">
                                            <div className="text-center">
                                                <p className="text-sm text-muted-foreground">RECETTE TOTALE</p>
                                                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(statistiques.recette)}</p>
                                                <p className="text-xs text-muted-foreground">Chiffre d'affaire total</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </>
                        )}

                        {/* Affichage mode "toutes les caisses" */}
                        {viewMode === 'all' && isAdmin && (
                            <div className="space-y-4">
                                <h2 className="text-xl font-semibold">Toutes les caisses du {formatDate(new Date(dateDebut))} au {formatDate(new Date(dateFin))}</h2>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    {allCaisses.map((c) => (
                                        <Card key={c.id}>
                                            <CardHeader>
                                                <CardTitle className="flex justify-between items-center">
                                                    <span>{c.chauffeurNom}</span>
                                                    <Badge className={c.statut === 'OUVERTE' ? 'bg-green-500' : 'bg-red-500'}>
                                                        {c.statut === 'OUVERTE' ? 'Ouverte' : 'Clôturée'}
                                                    </Badge>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Encaissements:</span>
                                                        <span className="text-green-600 font-semibold">{formatCurrency(c.totalEncaissements)}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-muted-foreground">Décaissements:</span>
                                                        <span className="text-red-600 font-semibold">{formatCurrency(c.totalDecaissements)}</span>
                                                    </div>
                                                    <div className="flex justify-between pt-2 border-t">
                                                        <span className="font-medium">Solde:</span>
                                                        <span className="font-bold text-blue-600">{formatCurrency(c.soldeTheorique)}</span>
                                                    </div>
                                                    {c.ecart !== null && (
                                                        <div className="flex justify-between text-sm">
                                                            <span className="text-muted-foreground">Écart:</span>
                                                            <span className={cn("font-medium", c.ecart >= 0 ? "text-green-600" : "text-red-600")}>
                                                                {formatCurrency(c.ecart)}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                                {allCaisses.length === 0 && (
                                    <p className="text-center text-muted-foreground py-8">Aucune caisse trouvée pour cette date</p>
                                )}
                            </div>
                        )}

                        {/* Affichage mode "caisse unique" */}
                        {viewMode === 'single' && (
                            <>
                                {/* Cartes statistiques détaillées (Chèques, Traites, Virements, Espèces) */}
                                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                                    {/* CHÈQUES */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <FileText className="h-4 w-4 text-blue-500" />
                                                CHÈQUES
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-blue-600">
                                                {formatCurrency(statistiques.totalCheque)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {statistiques.nombreCheque} chèque(s)
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* TRAITES */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <CalendarClock className="h-4 w-4 text-purple-500" />
                                                TRAITES
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-purple-600">
                                                {formatCurrency(statistiques.totalTraite)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {statistiques.nombreTraite} traite(s)
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* VIREMENTS */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-indigo-500" />
                                                VIREMENTS
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-indigo-600">
                                                {formatCurrency(statistiques.totalVirement)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {statistiques.nombreVirement} virement(s)
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* ESPÈCES VENTES */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <Banknote className="h-4 w-4 text-green-500" />
                                                ESPÈCES (Ventes)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-green-600">
                                                {formatCurrency(statistiques.totalEspeceVente)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Espèces des ventes
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {/* ESPÈCES CRÉDIT */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                <CreditCard className="h-4 w-4 text-orange-500" />
                                                Recouvrement
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold text-orange-600">
                                                {formatCurrency(statistiques.totalEspeceCredit)}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Espèces des règlements crédit
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Ligne RECETTE + CV + FIXE + NET */}
                                <div className="grid gap-4 sm:grid-cols-5">
                                    {/* RECETTE (Chiffre d'affaire) */}
                                    <Card className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4" />
                                                RECETTE (CA)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {formatCurrency(statistiques.recette)}
                                            </div>
                                            <p className="text-xs text-blue-100 mt-1">
                                                Total des encaissements
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {isAdmin && (
                                        // TOTAL CV (Prix d'achat)
                                        <Card className="bg-gradient-to-r from-purple-500 to-purple-600 text-white">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <TrendingDown className="h-4 w-4" />
                                                    ACHAT (CV)
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {formatCurrency(statistiques.totalCV)}
                                                </div>
                                                <p className="text-xs text-purple-100 mt-1">
                                                    Prix d'achat des produits vendus
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {/* TOTAL FIXE (Décaissements réels) */}
                                    <Card className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Wallet className="h-4 w-4" />
                                                DÉPENSES (CF)
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-2xl font-bold">
                                                {formatCurrency(statistiques.totalFixe)}
                                            </div>
                                            <p className="text-xs text-orange-100 mt-1">
                                                Total des décaissements réels
                                            </p>
                                        </CardContent>
                                    </Card>

                                    {isAdmin && (
                                        <Card className="bg-gradient-to-r from-orange-500 to-amber-600 text-white">
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Wallet className="h-4 w-4" />
                                                    MARGE BRUT
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {formatCurrency(statistiques.totalBrut)}
                                                </div>
                                                <p className="text-xs opacity-90 mt-1">
                                                    {statistiques.totalNet >= 0 ? "Bénéfice" : "Perte"} (Recette - CV)
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                    {isAdmin && (
                                        <Card className={cn(
                                            "bg-gradient-to-r",
                                            statistiques.totalNet >= 0 ? "from-emerald-500 to-teal-600 text-white" : "from-rose-500 to-red-600 text-white"
                                        )}>
                                            <CardHeader className="pb-2">
                                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                    <Wallet className="h-4 w-4" />
                                                    TOTAL NET
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent>
                                                <div className="text-2xl font-bold">
                                                    {formatCurrency(statistiques.totalNet)}
                                                </div>
                                                <p className="text-xs opacity-90 mt-1">
                                                    {statistiques.totalNet >= 0 ? "Bénéfice" : "Perte"} (Recette - CV - Fixe)
                                                </p>
                                            </CardContent>
                                        </Card>
                                    )}
                                </div>

                                {/* Liste des mouvements */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Historique des mouvements</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {mouvements.length === 0 ? (
                                            <p className="text-center text-muted-foreground py-8">Aucun mouvement enregistré</p>
                                        ) : (
                                            <div className="border rounded-lg overflow-x-auto">
                                                <Table>
                                                    <TableHeader>
                                                        <TableRow>
                                                            <TableHead>Date</TableHead>
                                                            <TableHead>Type</TableHead>
                                                            <TableHead>Mode</TableHead>
                                                            <TableHead>Référence</TableHead>
                                                            <TableHead>Libellé</TableHead>
                                                            <TableHead className="text-right">Montant</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {mouvements.map((mouvement) => (
                                                            <TableRow key={mouvement.id}>
                                                                <TableCell className="text-muted-foreground">
                                                                    {formatDate(new Date(mouvement.date))}
                                                                </TableCell>

                                                                <TableCell>
                                                                    {mouvement.type === 'ENCAISSEMENT' ? (
                                                                        <Badge className="bg-green-500 text-white">
                                                                            Encaissement
                                                                        </Badge>
                                                                    ) : mouvement.type === 'ENCAISSEMENTVIRTUEL' ? (
                                                                        <Badge className="bg-green-500 text-white">
                                                                            Encaissement
                                                                        </Badge>
                                                                    ) : mouvement.type === 'DECAISSEMENT' ? (
                                                                        <Badge className="bg-red-500 text-white">
                                                                            Décaissement
                                                                        </Badge>
                                                                    ) : <Badge className="bg-gray-500 text-white">
                                                                        Recouvrement
                                                                    </Badge>}
                                                                </TableCell>

                                                                <TableCell>
                                                                    <div className="flex items-center gap-2">
                                                                        {getModeIcon(mouvement.modeReglement)}
                                                                        <span>
                                                                            {typeReglementLabels[
                                                                                mouvement.modeReglement as keyof typeof typeReglementLabels
                                                                            ] || mouvement.modeReglement}
                                                                        </span>
                                                                    </div>
                                                                </TableCell>

                                                                <TableCell className="font-mono text-sm">
                                                                    {mouvement.reference || "-"}
                                                                </TableCell>

                                                                <TableCell>{mouvement.libelle}</TableCell>

                                                                <TableCell
                                                                    className={cn(
                                                                        "text-right font-semibold",
                                                                        mouvement.type === "ENCAISSEMENT" && "text-green-600",
                                                                        mouvement.type === "ENCAISSEMENTVIRTUEL" && "text-blue-600",
                                                                        mouvement.type === "DECAISSEMENT" && "text-red-600"
                                                                    )}
                                                                >
                                                                    {(mouvement.type === "ENCAISSEMENT" ||
                                                                        mouvement.type === "ENCAISSEMENTVIRTUEL")
                                                                        ? "+"
                                                                        : "+"}
                                                                    {formatCurrency(mouvement.montant)}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </>
                        )}
                    </div>
                </main>
            </div >
        </div >
    );
}