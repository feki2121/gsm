"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Client, formatCurrency } from "@/lib/types";
import { Plus, Users, Edit, Trash2, Eye, Phone, Mail, MapPin, Loader2, CheckCircle, XCircle, Map, Navigation, Copy, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { MapPicker } from "@/components/MapPicker";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Types pour l'API
interface ApiResponse {
  data: Client[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export default function ClientsPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });

  // Map Picker state
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Formulaire état
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    cin: "",
    mf: "",
    adresse: "",
    solde: 0,
    lieuDit: "",
    codePostal: "",
    ville: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });

  // Charger les clients depuis l'API
  const fetchClients = async (page = 1, limit = 10) => {
    setLoading(true);
    try {
      //  const response = await fetch('/api/clientsprospects/clients?seulementProspects=true');
      const response = await fetch('/api/clients?seulementProspects=true');

      if (!response.ok) throw new Error("Erreur lors du chargement des clients");

      const result: ApiResponse = await response.json();
      setClients(result.data);
      setPagination({
        page: result.pagination.page,
        limit: result.pagination.limit,
        total: result.pagination.total,
        pages: result.pagination.pages,
      });
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger la liste des clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Calculer les statistiques
  const totalCreances = clients.reduce((sum, c) => sum + (c.solde || 0), 0);
  const clientsAvecCreances = clients.filter((c) => (c.solde || 0) > 0).length;
  const clientsLocalises = clients.filter((c) => c.latitude && c.longitude).length;

  // Méthode 1: Utiliser la géolocalisation du navigateur
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive"
      });
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({ ...prev, latitude, longitude }));

        // Reverse geocoding pour obtenir l'adresse
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`);
          const data = await response.json();
          if (data.display_name) {
            const city = data.address?.city || data.address?.town || data.address?.village || '';
            const road = data.address?.road || data.address?.pedestrian || '';
            const houseNumber = data.address?.house_number || '';

            setFormData(prev => ({
              ...prev,
              // adresse: houseNumber ? `${road} ${houseNumber}` : road,
              ville: city,
              codePostal: data.address?.postcode || '',
            }));
          }
          toast({
            title: "Succès",
            description: `Position obtenue avec succès`,
            variant: "default"
          });
        } catch (error) {
          console.error("Reverse geocoding error:", error);
          toast({
            title: "Succès",
            description: "Position obtenue",
            variant: "default"
          });
        }
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'obtenir votre position",
          variant: "destructive"
        });
        setIsLocating(false);
      }
    );
  };

  // Méthode 2: Rechercher par adresse (géocodage)
  const handleGeocode = async () => {
    const adresseComplete = [
      formData.adresse,
      formData.lieuDit,
      formData.codePostal,
      formData.ville
    ].filter(Boolean).join(', ');

    if (!adresseComplete) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir une adresse",
        variant: "destructive"
      });
      return;
    }

    setIsLocating(true);
    try {
      const response = await fetch("/api/geocode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adresse: adresseComplete }),
      });

      const data = await response.json();

      if (response.ok) {
        setFormData(prev => ({
          ...prev,
          latitude: data.latitude,
          longitude: data.longitude,
        }));
        toast({
          title: "Succès",
          description: "Position trouvée sur la carte !",
          variant: "default"
        });
      } else {
        toast({
          title: "Erreur",
          description: data.error || "Adresse non trouvée",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Geocoding error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de géolocaliser l'adresse",
        variant: "destructive"
      });
    } finally {
      setIsLocating(false);
    }
  };

  // Gestion de la sélection depuis la carte
  const handleMapSelect = (lat: number, lng: number) => {
    // Mettre à jour le formulaire avec les nouvelles coordonnées
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));

    // Afficher un message de confirmation
    toast({
      title: "Position sélectionnée",
      description: `Latitude: ${lat.toFixed(6)}, Longitude: ${lng.toFixed(6)}`,
      variant: "default"
    });

    // Fermer la carte
    setShowMapPicker(false);
  };

  // Ajouter un client
  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/clientsprospects/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      const newClient = await response.json();
      setClients([newClient, ...clients]);
      setIsDialogOpen(false);
      resetForm();

      toast({
        title: "Succès",
        description: "Client ajouté avec succès",
      });

      fetchClients();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'ajouter le client",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un client
  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      const response = await fetch(`/api/clients/${clientToDelete.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      setClients(clients.filter((c) => c.id !== clientToDelete.id));
      setIsDeleteDialogOpen(false);
      setClientToDelete(null);

      toast({
        title: "Succès",
        description: "Client supprimé avec succès",
      });

      fetchClients();
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer le client",
        variant: "destructive",
      });
    }
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();

    // if (!formData.cin && !formData.mf) {
    //   toast({
    //     title: "Erreur",
    //     description: "Veuillez saisir au moins le CIN ou la MF",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    if (!selectedClient) return;

    setIsSubmitting(true);

    try {
      // Envoyer TOUS les champs pour la mise à jour complète
      const updateData = {
        nom: formData.nom,
        telephone: formData.telephone,
        email: formData.email || null,
        solde: formData.solde || 0,
        cin: formData.cin || null,
        mf: formData.mf || null,
        adresse: formData.adresse,
        lieuDit: formData.lieuDit,
        codePostal: formData.codePostal,
        ville: formData.ville,
        latitude: formData.latitude,
        longitude: formData.longitude,
      };

      const response = await fetch(`/api/clients/${selectedClient.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la modification");
      }

      const updatedClient = await response.json();

      // Mettre à jour la liste des clients
      setClients(clients.map((c) =>
        c.id === updatedClient.id ? updatedClient : c
      ));

      setIsDialogOpen(false);
      setSelectedClient(null);
      resetForm();

      toast({
        title: "Succès",
        description: "Client modifié avec succès",
      });

      // Rafraîchir la liste pour être sûr
      fetchClients(pagination.page);
    } catch (error) {
      console.error("Erreur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le client",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir le formulaire d'édition
  const openEditDialog = (client: Client) => {
    setSelectedClient(client);
    setFormData({
      nom: client.nom,
      telephone: client.telephone,
      email: client.email || "",
      cin: client.cin || "",
      mf: client.mf || "",
      adresse: client.adresse || "",
      solde: client.solde || 0,
      lieuDit: client.lieuDit || "",
      codePostal: client.codePostal || "",
      ville: client.ville || "",
      latitude: client.latitude || null,
      longitude: client.longitude || null,
    });
    setIsDialogOpen(true);
  };

  // Ouvrir la confirmation de suppression
  const openDeleteDialog = (client: Client) => {
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      nom: "",
      telephone: "",
      email: "",
      cin: "",
      mf: "",
      adresse: "",
      solde: 0,
      lieuDit: "",
      codePostal: "",
      ville: "",
      latitude: null,
      longitude: null,
    });
  };

  // Gérer les changements du formulaire
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: id === "solde" ? parseFloat(value) || 0 : value,
    }));
  };

  const copyCoordinates = () => {
    if (formData.latitude && formData.longitude) {
      const coords = `${formData.latitude}, ${formData.longitude}`;
      navigator.clipboard.writeText(coords);
      toast({ title: "Copié", description: "Coordonnées copiées dans le presse-papier" });
    }
  };

  // Ouvrir dans Google Maps
  const openInGoogleMaps = () => {
    if (formData.latitude && formData.longitude) {
      window.open(`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`, '_blank');
    }
  };

  // Colonnes du tableau
  const columns = [
    {
      key: "nom" as keyof Client,
      header: "Client",
      render: (item: Client) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <span className="text-sm font-semibold">
              {item.nom.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </span>
          </div>
          <div>
            <p className="font-medium">{item.nom}</p>
            {item.mf && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {item.mf}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "telephone" as keyof Client,
      header: "Téléphone",
      render: (item: Client) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{item.telephone}</span>
        </div>
      ),
    },
    {
      key: "adresse" as keyof Client,
      header: "Adresse",
      render: (item: Client) => (
        <div className="flex items-center gap-2 max-w-[200px]">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          {item.addresses && item.addresses.length > 0 ? (
            <div className="space-y-1">
              {item.addresses.find(a => a.estPrincipale) && (
                <span className="truncate text-muted-foreground">
                  {item.addresses.find(a => a.estPrincipale)?.adresse}
                </span>
              )}
              {item.addresses.filter(a => !a.estPrincipale).length > 0 && (
                <span className="text-xs text-muted-foreground block">
                  +{item.addresses.filter(a => !a.estPrincipale).length} autre(s)
                </span>
              )}
            </div>
          ) : (
            <span className="truncate text-muted-foreground">{item.adresse || "-"}</span>
          )}
        </div>
      ),
    },
    {
      key: "ville" as keyof Client,
      header: "Ville",
      render: (item: Client) => (
        <span className="text-sm">{item.ville || "-"}</span>
      ),
    },
    {
      key: "localise" as keyof Client,
      header: "Géo-localisé",
      render: (item: Client) => (
        <div className="flex items-center gap-2">
          {item.latitude && item.longitude ? (
            <Badge className="bg-green-500 text-white flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              Localisé
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-600 flex items-center gap-1">
              <XCircle className="h-3 w-3" />
              Non localisé
            </Badge>
          )}
        </div>
      ),
    },
    // {
    //   key: "solde" as keyof Client,
    //   header: "Solde (Créance)",
    //   render: (item: Client) => (
    //     <Badge
    //       variant="outline"
    //       className={cn(
    //         (item.solde || 0) > 0 ? "border-warning text-warning" : "border-success text-success"
    //       )}
    //     >
    //       {formatCurrency(item.solde || 0)}
    //     </Badge>
    //   ),
    // },
    {
      key: "actions",
      header: "Actions",
      render: (item: Client) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => window.location.href = `/clients/${item.id}`}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEditDialog(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => openDeleteDialog(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Clients" subtitle="Gestion des clients" />
          <main className="flex items-center justify-center h-[calc(100vh-73px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Clients" subtitle="Gestion des clients" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Statistiques Cards */}
            {/* <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Clients
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{pagination.total}</div>
                  <p className="text-xs text-muted-foreground">
                    Clients enregistrés
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Créances totales
                  </CardTitle>
                  <span className="text-warning">💰</span>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalCreances)}</div>
                  <p className="text-xs text-muted-foreground">
                    {clientsAvecCreances} clients avec créances
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Clients localisés
                  </CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clientsLocalises}</div>
                  <p className="text-xs text-muted-foreground">
                    Sur {pagination.total} clients
                  </p>
                </CardContent>
              </Card>
            </div> */}

            {/* Clients Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Liste des Clients Prospects
                </CardTitle>
                <Button onClick={() => {
                  resetForm();
                  setSelectedClient(null);
                  setIsDialogOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Nouveau Client Prospect
                </Button>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={clients}
                  columns={columns}
                  searchPlaceholder="Rechercher un client..."
                  searchKey="nom"
                />

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Page {pagination.page} sur {pagination.pages} ({pagination.total} clients)
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchClients(pagination.page - 1)}
                        disabled={pagination.page === 1}
                      >
                        Précédent
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchClients(pagination.page + 1)}
                        disabled={pagination.page === pagination.pages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Dialog Add/Edit Client - avec MapPicker intégré */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        setIsDialogOpen(open);
        if (!open) {
          resetForm();
          setShowMapPicker(false); // Reset map picker state when dialog closes
        }
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {!showMapPicker ? (
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? "Modifier le Client" : "Ajouter un Client"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">📝 Saisie manuelle</TabsTrigger>
                  <TabsTrigger value="gps">📍 Géolocalisation</TabsTrigger>
                </TabsList>

                {/* Onglet Saisie manuelle */}
                <TabsContent value="manual" className="space-y-4 pt-4">
                  <form onSubmit={selectedClient ? handleUpdateClient : handleAddClient} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom complet *</Label>
                        <Input
                          id="nom"
                          placeholder="Nom du client"
                          value={formData.nom}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone *</Label>
                        <Input
                          id="telephone"
                          placeholder="XX XXX XXX"
                          value={formData.telephone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cin">Cin</Label>
                        <Input
                          id="cin"
                          type="text"
                          placeholder="cin"
                          value={formData.cin}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mf">Mf</Label>
                        <Input
                          id="mf"
                          type="text"
                          placeholder="mf"
                          value={formData.mf}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ville">Ville</Label>
                        <Input
                          id="ville"
                          placeholder="Ville"
                          value={formData.ville}
                          onChange={handleInputChange}
                        />
                      </div>
                      {/* <div className="space-y-2">
                        <Label htmlFor="solde">Solde initial</Label>
                        <Input
                          id="solde"
                          type="number"
                          step="0.001"
                          placeholder="0.000"
                          value={formData.solde}
                          onChange={handleInputChange}
                        />
                      </div> */}
                    </div>

                    <div className="border-t pt-4">
                      <Label className="font-semibold mb-2 block">Adresse complète</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          {/* <Label htmlFor="adresse">Adresse (rue, numéro)</Label> */}
                          <Textarea
                            id="adresse"
                            placeholder="Adresse complète"
                            value={formData.adresse}
                            onChange={handleInputChange}
                            rows={2}
                          />
                        </div>

                      </div>
                    </div>

                    {/* Actions de géolocalisation */}
                    <div className="space-y-2">
                      <Label>Localisation</Label>
                      <div className="flex gap-2 flex-wrap">
                        {/* <Button 
                          type="button" 
                          variant="outline" 
                          onClick={handleGeocode} 
                          disabled={isLocating}
                        >
                          {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Map className="h-4 w-4 mr-2" />}
                          Trouver par adresse
                        </Button> */}
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowMapPicker(true)}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Choisir sur la carte
                        </Button>
                      </div>
                    </div>

                    {/* Affichage des coordonnées GPS */}
                    {(formData.latitude && formData.longitude) && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Coordonnées GPS sélectionnées
                          </p>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={copyCoordinates}>
                              <Copy className="h-3 w-3 mr-1" /> Copier
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={openInGoogleMaps}>
                              <Map className="h-3 w-3 mr-1" /> Voir la carte
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 font-mono">
                          Latitude: {formData.latitude} | Longitude: {formData.longitude}
                        </p>
                      </div>
                    )}

                    {/* Boutons de validation */}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsDialogOpen(false);
                        resetForm();
                      }}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedClient ? "Modifier" : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Onglet Géolocalisation */}
                <TabsContent value="gps" className="space-y-4 pt-4">
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-muted rounded-lg">
                      <Navigation className="h-12 w-12 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold text-lg">Obtenir ma position actuelle</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Utilisez la géolocalisation de votre navigateur pour obtenir vos coordonnées GPS
                      </p>
                      <Button
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="mt-4"
                      >
                        {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                        {isLocating ? "Recherche..." : "Obtenir ma position"}
                      </Button>
                    </div>

                    {formData.latitude && formData.longitude && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="font-medium text-green-700">Position obtenue !</p>
                        <p className="text-sm mt-1">Latitude: {formData.latitude}</p>
                        <p className="text-sm">Longitude: {formData.longitude}</p>
                        <div className="flex gap-2 mt-3">
                          <Button type="button" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`, '_blank')}>
                            Voir sur Google Maps
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => {
                            setFormData(prev => ({ ...prev, latitude: null, longitude: null }));
                          }}>
                            Effacer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

          ) : (
            // Map Picker intégré

            <div className="relative w-full" style={{ height: "100vh", maxHeight: "800px", minHeight: "600px" }}>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 left-0 z-10 m-2"
                onClick={() => setShowMapPicker(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <MapPicker
                initialLat={formData.latitude || 36.8065}
                initialLng={formData.longitude || 10.1815}
                onSelect={handleMapSelect}
                onClose={() => setShowMapPicker(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le client "{clientToDelete?.nom}" sera définitivement supprimé.
              {clientToDelete && (clientToDelete.solde || 0) > 0 && (
                <p className="mt-2 text-warning font-medium">
                  Attention : Ce client a une créance de {formatCurrency(clientToDelete.solde || 0)}.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}