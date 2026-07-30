"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Plus, Edit, Trash2, MapPin, Star, Phone, Mail, Navigation, CheckCircle, Copy, Map, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MapPicker } from "@/components/MapPicker";
import { formatCurrency } from "@/lib/types";
import Link from "next/link";

interface ClientAddress {
    id: string;
    adresse: string;
    lieuDit: string | null;
    codePostal: string | null;
    ville: string | null;
    latitude: number | null;
    longitude: number | null;
    estPrincipale: boolean;
}

interface Client {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    solde: number;
    cin?: string | null;
    mf?: string | null;
    addresses: ClientAddress[];
}


export default function ClientDetailPage() {
  const { sidebarClasses } = useSidebar();
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const [client, setClient] = useState<Client | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
    const [showMapPicker, setShowMapPicker] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    const [addressForm, setAddressForm] = useState({
        adresse: "",
        lieuDit: "",
        codePostal: "",
        ville: "",
        latitude: null as number | null,
        longitude: null as number | null,
        estPrincipale: false,
    });

    useEffect(() => {
        fetchClient();
    }, [params.id]);

const fetchClient = async () => {
  try {
    const response = await fetch(`/api/clients/${params.id}`);
    if (!response.ok) throw new Error("Erreur lors du chargement");
    const data = await response.json();
    
    // S'assurer que addresses est un tableau
    setClient({
      ...data,
      addresses: data.addresses || []
    });
  } catch (error) {
    console.error("Error:", error);
    toast({ 
      title: "Erreur", 
      description: "Impossible de charger le client", 
      variant: "destructive" 
    });
  } finally {
    setLoading(false);
  }
};

    const handleAddAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/clients/${params.id}/addresses`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addressForm),
            });

            if (!response.ok) throw new Error("Erreur lors de l'ajout");

            toast({ title: "Succès", description: "Adresse ajoutée avec succès" });
            setIsAddressDialogOpen(false);
            resetAddressForm();
            fetchClient();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible d'ajouter l'adresse", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateAddress = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAddress) return;
        setIsSubmitting(true);

        try {
            const response = await fetch(`/api/clients/${params.id}/addresses?addressId=${selectedAddress.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(addressForm),
            });

            if (!response.ok) throw new Error("Erreur lors de la modification");

            toast({ title: "Succès", description: "Adresse modifiée avec succès" });
            setIsAddressDialogOpen(false);
            resetAddressForm();
            fetchClient();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de modifier l'adresse", variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAddress = async (addressId: string) => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer cette adresse ?")) return;

        try {
            const response = await fetch(`/api/clients/${params.id}/addresses?addressId=${addressId}`, {
                method: "DELETE",
            });

            if (!response.ok) throw new Error("Erreur lors de la suppression");

            toast({ title: "Succès", description: "Adresse supprimée avec succès" });
            fetchClient();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de supprimer l'adresse", variant: "destructive" });
        }
    };

    const handleSetPrincipal = async (addressId: string) => {
        try {
            const response = await fetch(`/api/clients/${params.id}/addresses?addressId=${addressId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ estPrincipale: true }),
            });

            if (!response.ok) throw new Error("Erreur lors de la mise à jour");

            toast({ title: "Succès", description: "Adresse principale mise à jour" });
            fetchClient();
        } catch (error) {
            toast({ title: "Erreur", description: "Impossible de définir l'adresse principale", variant: "destructive" });
        }
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast({ title: "Erreur", description: "Géolocalisation non supportée", variant: "destructive" });
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setAddressForm(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                }));
                toast({ title: "Succès", description: "Position obtenue" });
                setIsLocating(false);
            },
            (error) => {
                toast({ title: "Erreur", description: "Impossible d'obtenir la position", variant: "destructive" });
                setIsLocating(false);
            }
        );
    };

    const handleMapSelect = (lat: number, lng: number) => {
        setAddressForm(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setShowMapPicker(false);
        toast({ title: "Position sélectionnée", description: `Lat: ${lat}, Lng: ${lng}` });
    };

    const openEditDialog = (address: ClientAddress) => {
        setSelectedAddress(address);
        setAddressForm({
            adresse: address.adresse,
            lieuDit: address.lieuDit || "",
            codePostal: address.codePostal || "",
            ville: address.ville || "",
            latitude: address.latitude,
            longitude: address.longitude,
            estPrincipale: address.estPrincipale,
        });
        setIsAddressDialogOpen(true);
    };

    const resetAddressForm = () => {
        setAddressForm({
            adresse: "",
            lieuDit: "",
            codePostal: "",
            ville: "",
            latitude: null,
            longitude: null,
            estPrincipale: false,
        });
        setSelectedAddress(null);
        setShowMapPicker(false);
    };

    if (loading) {
        return (

            <div className="flex min-h-screen bg-background flex-col md:flex-row">


                <Sidebar />

                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Client" subtitle="Détails du client" />
                    <main className="flex items-center justify-center h-[calc(100vh-73px)]">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </main>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Client" subtitle="Détails du client" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground">Client non trouvé</p>
                                <Button onClick={() => router.push('/clients')} className="mt-4">
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
                <Header title={client.nom} subtitle="Détails du client" />
                <main className="p-4 md:p-6">
                    <div className="space-y-6">
                         <div className="mb-6">
                            <Link href="/clients">
                                <Button variant="outline" className="gap-2">
                                    <ArrowLeft className="h-4 w-4" />
                                    Retour à la liste
                                </Button>
                            </Link>
                        </div>

                        {/* Informations générales */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Informations générales</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <Label className="text-muted-foreground">Nom complet</Label>
                                        <p className="font-medium">{client.nom}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Téléphone</Label>
                                        <p className="flex items-center gap-2">
                                            <Phone className="h-4 w-4" />
                                            {client.telephone}
                                        </p>
                                    </div>
                                    {/* {client.email && (
                                        <div>
                                            <Label className="text-muted-foreground">Email</Label>
                                            <p className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                {client.email}
                                            </p>
                                        </div>
                                    )} */}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Adresses */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle className="flex items-center gap-2">
                                    <MapPin className="h-5 w-5" />
                                    Adresses
                                </CardTitle>
                                <Dialog open={isAddressDialogOpen} onOpenChange={(open) => {
                                    setIsAddressDialogOpen(open);
                                    if (!open) resetAddressForm();
                                }}>
                                    <DialogTrigger asChild>
                                        <Button size="sm">
                                            <Plus className="h-4 w-4 mr-1" />
                                            Ajouter une adresse
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-4xl p-0 overflow-hidden">
                                        {!showMapPicker ? (
                                            <div className="p-6 max-h-[90vh] overflow-y-auto">
                                                <DialogHeader>
                                                    <DialogTitle>
                                                        {selectedAddress ? "Modifier l'adresse" : "Ajouter une adresse"}
                                                    </DialogTitle>
                                                </DialogHeader>
                                                <form onSubmit={selectedAddress ? handleUpdateAddress : handleAddAddress} className="space-y-4 mt-4">
                                                    <div className="space-y-2">
                                                        <Label htmlFor="adresse">Adresse *</Label>
                                                        <Textarea
                                                            id="adresse"
                                                            value={addressForm.adresse}
                                                            onChange={(e) => setAddressForm(prev => ({ ...prev, adresse: e.target.value }))}
                                                            required
                                                        />
                                                    </div>
                                                    <div className="grid gap-4 sm:grid-cols-2">
                                                        {/* <div className="space-y-2">
                                                            <Label htmlFor="lieuDit">Lieu dit / Quartier</Label>
                                                            <Input
                                                                id="lieuDit"
                                                                value={addressForm.lieuDit}
                                                                onChange={(e) => setAddressForm(prev => ({ ...prev, lieuDit: e.target.value }))}
                                                            />
                                                        </div> */}
                                                        {/* <div className="space-y-2">
                                                            <Label htmlFor="codePostal">Code postal</Label>
                                                            <Input
                                                                id="codePostal"
                                                                value={addressForm.codePostal}
                                                                onChange={(e) => setAddressForm(prev => ({ ...prev, codePostal: e.target.value }))}
                                                            />
                                                        </div> */}
                                                        <div className="space-y-2">
                                                            <Label htmlFor="ville">Ville</Label>
                                                            <Input
                                                                id="ville"
                                                                value={addressForm.ville}
                                                                onChange={(e) => setAddressForm(prev => ({ ...prev, ville: e.target.value }))}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2">
                                                        <Label>Localisation</Label>
                                                        <div className="flex gap-2">
                                                            <Button type="button" variant="outline" onClick={handleGetCurrentLocation} disabled={isLocating}>
                                                                {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                                                                Ma position
                                                            </Button>
                                                            <Button type="button" variant="outline" onClick={() => setShowMapPicker(true)}>
                                                                <MapPin className="h-4 w-4 mr-2" />
                                                                Choisir sur la carte
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {addressForm.latitude && addressForm.longitude && (
                                                        <div className="p-3 bg-green-50 rounded-lg">
                                                            <p className="text-sm font-medium text-green-700">Coordonnées GPS</p>
                                                            <p className="text-xs font-mono">
                                                                Lat: {addressForm.latitude} | Lng: {addressForm.longitude}
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            id="estPrincipale"
                                                            checked={addressForm.estPrincipale}
                                                            onChange={(e) => setAddressForm(prev => ({ ...prev, estPrincipale: e.target.checked }))}
                                                            className="h-4 w-4 rounded border-gray-300"
                                                        />
                                                        <Label htmlFor="estPrincipale">Définir comme adresse principale</Label>
                                                    </div>

                                                    <div className="flex justify-end gap-2">
                                                        <Button type="button" variant="outline" onClick={() => setIsAddressDialogOpen(false)}>
                                                            Annuler
                                                        </Button>
                                                        <Button type="submit" disabled={isSubmitting}>
                                                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                            {selectedAddress ? "Modifier" : "Ajouter"}
                                                        </Button>
                                                    </div>
                                                </form>
                                            </div>
                                        ) : (
                                            <div className="relative w-full" style={{ height: "700px" }}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="absolute top-2 left-2 z-10 bg-white shadow-md"
                                                    onClick={() => setShowMapPicker(false)}
                                                >
                                                    <ArrowLeft className="h-4 w-4 mr-2" />
                                                    Retour
                                                </Button>
                                                <MapPicker
                                                    initialLat={addressForm.latitude || 36.8065}
                                                    initialLng={addressForm.longitude || 10.1815}
                                                    onSelect={handleMapSelect}
                                                    onClose={() => setShowMapPicker(false)}
                                                />
                                            </div>
                                        )}
                                    </DialogContent>
                                </Dialog>
                            </CardHeader>
                            <CardContent>
                                {client.addresses.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Aucune adresse enregistrée</p>
                                ) : (
                                    <div className="space-y-3">
                                        {client.addresses.map((address) => (
                                            <div
                                                key={address.id}
                                                className={`border rounded-lg p-4 ${address.estPrincipale ? "border-primary bg-primary/5" : ""}`}
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                                            <p className="font-medium">{address.adresse}</p>
                                                            {address.estPrincipale && (
                                                                <Badge className="bg-primary">Principale</Badge>
                                                            )}
                                                        </div>
                                                        {(address.lieuDit || address.codePostal || address.ville) && (
                                                            <p className="text-sm text-muted-foreground ml-6">
                                                                {[address.lieuDit, address.codePostal, address.ville].filter(Boolean).join(" - ")}
                                                            </p>
                                                        )}
                                                        {address.latitude && address.longitude && (
                                                            <p className="text-xs text-muted-foreground ml-6 mt-1 font-mono">
                                                                📍 {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-1">
                                                        {!address.estPrincipale && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleSetPrincipal(address.id)}
                                                                title="Définir comme adresse principale"
                                                            >
                                                                <Star className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8"
                                                            onClick={() => openEditDialog(address)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-destructive"
                                                            onClick={() => handleDeleteAddress(address.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>


                    </div>
                </main>
            </div>
        </div>
    );
}