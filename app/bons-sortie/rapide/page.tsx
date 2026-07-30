"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Truck, User, Car, Calendar, MapPin } from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/types";

// Types
interface Client {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
}

interface Home {
    id: string;
    nom: string;
}

interface Chauffeur {
    id: string;
    nom: string;
    telephone: string;
    cin?: string | null;
    vehicule?: {
        id: string;
        matricule: string;
    } | null;
}

interface Product {
    id: string;
    reference: string;
    designation: string;
    prixVente: number;
    stockDisponible: number;
    tva: number;
}

export default function SortieRapidePage() {
  const { sidebarClasses } = useSidebar();
    const router = useRouter();
    const { toast } = useToast();

    // États
    const [homes, setHomes] = useState<Home[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedHomeForRapide, setSelectedHomeForRapide] = useState("");
    const [stockProducts, setStockProducts] = useState<Product[]>([]);

    // États du formulaire
    const [selectedChauffeurId, setSelectedChauffeurId] = useState("");
    const [nomConducteur, setNomConducteur] = useState("");
    const [matriculeVehicule, setMatriculeVehicule] = useState("");
    const [numCIN, setNumCIN] = useState("");
    const [selectedClientId, setSelectedClientId] = useState("");
    const [destination, setDestination] = useState("Toute la tunisie");
    const [dateDebut, setDateDebut] = useState(new Date().toISOString().split('T')[0]);
    const [dateFin, setDateFin] = useState(new Date().toISOString().split('T')[0]);
    const [adresseLivraison, setAdresseLivraison] = useState("");
    const [observation, setObservation] = useState("");

    useEffect(() => {
        fetchHomes();
        fetchClients();
        fetchChauffeurs();
    }, []);

    // Effet pour remplir automatiquement les infos du chauffeur
    useEffect(() => {
        if (selectedChauffeurId && selectedChauffeurId !== "none") {
            const chauffeur = chauffeurs.find(c => c.id === selectedChauffeurId);
            if (chauffeur) {
                setNomConducteur(chauffeur.nom);
                setMatriculeVehicule(chauffeur.vehicule?.matricule || "");
                setNumCIN(chauffeur.cin || "");
            }
        } else if (selectedChauffeurId === "none") {
            setNomConducteur("");
            setMatriculeVehicule("");
            setNumCIN("");
        }
    }, [selectedChauffeurId, chauffeurs]);

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
                description: "Impossible de charger les stations",
                variant: "destructive",
            });
        }
    };

    const fetchClients = async () => {
        try {
            const response = await fetch("/api/clients?limit=100");
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const data = await response.json();
            setClients(data.data || []);
        } catch (error) {
            console.error("Error fetching clients:", error);
            setClients([]);
        }
    };

    const fetchChauffeurs = async () => {
        try {
            const response = await fetch("/api/chauffeurs?limit=100");
            if (!response.ok) throw new Error("Erreur lors du chargement");
            const result = await response.json();

            // Extraction des données selon le format
            let chauffeursList = [];
            if (result.success === true && Array.isArray(result.data)) {
                chauffeursList = result.data;
            } else if (Array.isArray(result)) {
                chauffeursList = result;
            } else if (result.data && Array.isArray(result.data)) {
                chauffeursList = result.data;
            }

            // Vérifier que chaque chauffeur a les propriétés nécessaires
            const validChauffeurs = chauffeursList.map((chauffeur: any) => ({
                id: chauffeur.id,
                nom: chauffeur.nom || "",
                telephone: chauffeur.telephone || "",
                cin: chauffeur.cin || "",
                vehicule: chauffeur.vehicule || null,
                userId: chauffeur.userId,
                user: chauffeur.user || null
            }));

            setChauffeurs(validChauffeurs);
        } catch (error) {
            console.error("Error fetching chauffeurs:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les chauffeurs",
                variant: "destructive",
            });
            setChauffeurs([]);
        }
    };

    const loadProductsByStation = async (homeId: string) => {
        if (!homeId) return;

        setIsLoading(true);
        try {
            const response = await fetch(`/api/products/bs?limit=1000`);
            const data = await response.json();
            const allProducts = data.data || [];

            const productsInStation = allProducts.filter((product: any) => {
                const stockLocation = product.stockLocations?.find(
                    (sl: any) => sl.homeId === homeId
                );
                return stockLocation && stockLocation.quantite > 0;
            }).map((product: any) => {
                const stockLocation = product.stockLocations.find(
                    (sl: any) => sl.homeId === homeId
                );
                return {
                    ...product,
                    stockDisponible: stockLocation?.quantite || 0,
                };
            });

            setStockProducts(productsInStation);
        } catch (error) {
            console.error("Error loading products:", error);
            toast({
                title: "Erreur",
                description: "Impossible de charger les produits de la station",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedHomeForRapide) {
            toast({
                title: "Erreur",
                description: "Veuillez sélectionner une station",
                variant: "destructive",
            });
            return;
        }

        if (!destination) {
            toast({
                title: "Erreur",
                description: "Veuillez saisir la destination",
                variant: "destructive",
            });
            return;
        }

        if (!nomConducteur || !matriculeVehicule || !numCIN) {
            toast({
                title: "Erreur",
                description: "Veuillez remplir toutes les informations du conducteur",
                variant: "destructive",
            });
            return;
        }

        // Préparer les produits à sortir (tous les produits de la station)
        const produits = stockProducts.map(product => ({
            productId: product.id,
            quantiteSortie: product.stockDisponible,
            prixUnitaireHT: product.prixVente / 1.19
        })).filter(p => p.quantiteSortie > 0);

        if (produits.length === 0) {
            toast({
                title: "Erreur",
                description: "Aucun produit disponible dans cette station",
                variant: "destructive",
            });
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch("/api/bons-sortie/rapide", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    homeId: selectedHomeForRapide,
                    destination,
                    nomConducteur,
                    matriculeVehicule,
                    numCIN,
                    dateDebut,
                    dateFin,
                    clientId: selectedClientId || null,
                    destinataire: selectedClientId ? "" : "",
                    adresseLivraison,
                    observation,
                    produits
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erreur lors de la création");
            }

            toast({
                title: "Succès",
                description: "Bon de sortie rapide créé avec succès",
            });

            router.push("/bons-sortie");
            router.refresh();
        } catch (error) {
            console.error("Error creating bon sortie:", error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible de créer le bon de sortie",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-background flex-col md:flex-row">
            <Sidebar />
            <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                <Header title="Sortie Rapide par Station" subtitle="Sortie de tous les stocks d'une station" />
                <main className="p-4 md:p-6">
                    <div className="max-w-7xl mx-auto">
                        {/* Bouton retour */}
                        <div className="mb-6">
                            <Link href="/bons-sortie">
                                <Button variant="outline" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Retour à la liste
                                </Button>
                            </Link>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* 1. Informations Générales */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Truck className="h-5 w-5 text-primary" />
                                        1. Informations Générales
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        {/* Date Début */}
                                        <div className="space-y-2">
                                            <Label htmlFor="dateDebut">Date Début *</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="dateDebut"
                                                    type="date"
                                                    value={dateDebut}
                                                    onChange={(e) => setDateDebut(e.target.value)}
                                                    className="pl-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Date Fin */}
                                        <div className="space-y-2">
                                            <Label htmlFor="dateFin">Date Fin *</Label>
                                            <div className="relative">
                                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="dateFin"
                                                    type="date"
                                                    value={dateFin}
                                                    onChange={(e) => setDateFin(e.target.value)}
                                                    className="pl-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        {/* Station */}
                                        <div className="space-y-2">
                                            <Label htmlFor="station">Station *</Label>
                                            <Select
                                                value={selectedHomeForRapide || "none"}
                                                onValueChange={(value) => {
                                                    const homeId = value === "none" ? "" : value;
                                                    setSelectedHomeForRapide(homeId);
                                                    if (homeId) {
                                                        loadProductsByStation(homeId);
                                                    } else {
                                                        setStockProducts([]);
                                                    }
                                                }}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Choisir une station" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sélectionner une station</SelectItem>
                                                    {homes.map((home) => (
                                                        <SelectItem key={home.id} value={home.id}>
                                                            {home.nom}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Destination */}
                                        <div className="space-y-2">
                                            <Label htmlFor="destination">Destination *</Label>
                                            <div className="relative">
                                                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="destination"
                                                    value={destination}
                                                    onChange={(e) => setDestination(e.target.value)}
                                                    placeholder="Lieu de destination"
                                                    className="pl-9"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 2. Informations du transport */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Car className="h-5 w-5 text-primary" />
                                        2. Informations du transport
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div className="space-y-2">
                                            <Label htmlFor="chauffeur">Chauffeur *</Label>
                                            <Select value={selectedChauffeurId || "none"} onValueChange={setSelectedChauffeurId}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Sélectionner un chauffeur" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sélectionner un chauffeur</SelectItem>
                                                    {chauffeurs.map((chauffeur) => (
                                                        <SelectItem key={chauffeur.id} value={chauffeur.id}>
                                                            {chauffeur.nom} - {chauffeur.telephone}
                                                            {chauffeur.vehicule && ` (${chauffeur.vehicule.matricule})`}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="nomConducteur">Nom du Conducteur *</Label>
                                            <div className="relative">
                                                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="nomConducteur"
                                                    value={nomConducteur}
                                                    onChange={(e) => setNomConducteur(e.target.value)}
                                                    placeholder="Nom complet"
                                                    className="pl-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="matriculeVehicule">Matricule du Véhicule *</Label>
                                            <div className="relative">
                                                <Car className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    id="matriculeVehicule"
                                                    value={matriculeVehicule}
                                                    onChange={(e) => setMatriculeVehicule(e.target.value)}
                                                    placeholder="Numéro d'immatriculation"
                                                    className="pl-9"
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="numCIN">N° CIN *</Label>
                                            <Input
                                                id="numCIN"
                                                value={numCIN}
                                                onChange={(e) => setNumCIN(e.target.value)}
                                                placeholder="Carte d'identité nationale"
                                                required
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 3. Produits disponibles dans la station */}
                            {selectedHomeForRapide && (
                                <Card>
                                    <CardHeader>
                                        <CardTitle>3. Produits disponibles dans la station</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <div className="flex justify-center py-8">
                                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                            </div>
                                        ) : stockProducts.length === 0 ? (
                                            <div className="text-center py-8 text-gray-500">
                                                Aucun produit disponible dans cette station
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            {/* <th className="px-4 py-3 text-left text-sm font-medium">Référence</th> */}
                                                            <th className="px-4 py-3 text-left text-sm font-medium">Désignation</th>
                                                            <th className="px-4 py-3 text-right text-sm font-medium">Stock Disponible</th>
                                                            <th className="px-4 py-3 text-right text-sm font-medium">P.U H.T</th>
                                                            <th className="px-4 py-3 text-right text-sm font-medium">P.U T.T.C</th>

                                                            <th className="px-4 py-3 text-right text-sm font-medium">Total HT</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200">
                                                        {stockProducts.map((product) => (
                                                            <tr key={product.id} className="hover:bg-gray-50">
                                                                {/* <td className="px-4 py-3 text-sm">{product.reference}</td> */}
                                                                <td className="px-4 py-3 text-sm">{product.designation}</td>
                                                                <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                                                                    {product.stockDisponible}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-right">
                                                                    {formatCurrency(product.prixVente / (1 + product.tva / 100))}
                                                                </td>

                                                                <td className="px-4 py-3 text-sm text-right">
                                                                    {formatCurrency(product.prixVente)}
                                                                </td>
                                                                <td className="px-4 py-3 text-sm text-right font-semibold">
                                                                    {formatCurrency((product.prixVente / 1.19) * product.stockDisponible)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                    <tfoot className="bg-gray-50">
                                                        <tr>
                                                            <td colSpan={4} className="px-4 py-3 text-right font-bold">
                                                                Total Général HT:
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-bold text-primary">
                                                                {formatCurrency(
                                                                    stockProducts.reduce(
                                                                        (sum, p) => sum + (p.prixVente / 1.19) * p.stockDisponible,
                                                                        0
                                                                    )
                                                                )}
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Actions */}
                            <div className="flex justify-end gap-4">
                                <Link href="/bons-sortie">
                                    <Button type="button" variant="outline">
                                        Annuler
                                    </Button>
                                </Link>
                                <Button
                                    type="submit"
                                    disabled={isLoading || !selectedHomeForRapide || stockProducts.length === 0}
                                    className="gap-2 bg-blue-600 hover:bg-blue-700"
                                >
                                    <Save className="h-4 w-4" />
                                    {isLoading ? "Création..." : "Créer le Bon de Sortie Rapide"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </main>
            </div>
        </div>
    );
}