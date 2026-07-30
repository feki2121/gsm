"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Navigation,
  MapPin,
  Loader2,
  Target,
  Car,
  Clock,
  Phone,
  Mail,
  Building2,
  Route,
  Compass,
  LocateFixed,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/types";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  adresse: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  solde: number;
}

interface ClientWithDistance extends Client {
  distance: number;
  distanceText: string;
  duration: string;
}

interface CityGroup {
  ville: string;
  clients: ClientWithDistance[];
  count: number;
}

export default function ChauffeurTourneePage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [cityGroups, setCityGroups] = useState<CityGroup[]>([]);
  const [filteredClients, setFilteredClients] = useState<ClientWithDistance[]>([]);
  const [selectedClient, setSelectedClient] = useState<ClientWithDistance | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"distance" | "nom">("distance");

  useEffect(() => {
    fetchClients();
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (clients.length > 0 && currentPosition) {
      calculateDistancesAndGroup();
    }
  }, [clients, currentPosition]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=1000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive",
      });
      setLocationLoading(false);
      return;
    }

    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationLoading(false);
        toast({
          title: "Position obtenue",
          description: "Votre position actuelle a été localisée",
        });
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'obtenir votre position",
          variant: "destructive",
        });
        setLocationLoading(false);
      }
    );
  };

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const getDistanceText = (distance: number): string => {
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m`;
    }
    return `${distance.toFixed(1)} km`;
  };

  const getDurationEstimate = (distance: number): string => {
    // Estimation: 30 km/h en ville, 60 km/h sur route
    const minutes = Math.round(distance * 2.5); // ~2.5 minutes par km
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  };

  const calculateDistancesAndGroup = () => {
    if (!currentPosition) return;

    // Calculer la distance pour chaque client
    const clientsWithDistance: ClientWithDistance[] = clients
      .filter(client => client.latitude && client.longitude && client.ville)
      .map(client => {
        const distance = calculateDistance(
          currentPosition.lat,
          currentPosition.lng,
          client.latitude!,
          client.longitude!
        );
        return {
          ...client,
          distance,
          distanceText: getDistanceText(distance),
          duration: getDurationEstimate(distance),
        };
      });

    // Grouper par ville
    const groups = new Map<string, ClientWithDistance[]>();
    clientsWithDistance.forEach(client => {
      const ville = client.ville!;
      if (!groups.has(ville)) {
        groups.set(ville, []);
      }
      groups.get(ville)!.push(client);
    });

    // Créer les groupes avec tri par distance
    const cityGroupsList: CityGroup[] = Array.from(groups.entries()).map(([ville, clientsList]) => ({
      ville,
      clients: clientsList.sort((a, b) => a.distance - b.distance),
      count: clientsList.length,
    })).sort((a, b) => a.ville.localeCompare(b.ville));

    setCityGroups(cityGroupsList);
  };

  const handleCitySelect = (ville: string) => {
    setSelectedCity(ville);
    const group = cityGroups.find(g => g.ville === ville);
    if (group) {
      let sortedClients = [...group.clients];
      if (sortBy === "distance") {
        sortedClients.sort((a, b) => a.distance - b.distance);
      } else {
        sortedClients.sort((a, b) => a.nom.localeCompare(b.nom));
      }
      setFilteredClients(sortedClients);
    }
  };

  const openInMaps = (client: ClientWithDistance) => {
    if (!client.latitude || !client.longitude) {
      toast({
        title: "Erreur",
        description: "Ce client n'a pas de coordonnées GPS",
        variant: "destructive",
      });
      return;
    }

    const url = `https://www.google.com/maps/dir/${currentPosition?.lat},${currentPosition?.lng}/${client.latitude},${client.longitude}`;
    window.open(url, "_blank");
  };

  const openClientLocationInMaps = (client: ClientWithDistance) => {
    if (!client.latitude || !client.longitude) {
      toast({
        title: "Erreur",
        description: "Ce client n'a pas de coordonnées GPS",
        variant: "destructive",
      });
      return;
    }
    const url = `https://www.google.com/maps?q=${client.latitude},${client.longitude}`;
    window.open(url, "_blank");
  };

  const handleSortChange = (value: string) => {
    setSortBy(value as "distance" | "nom");
    if (selectedCity) {
      const group = cityGroups.find(g => g.ville === selectedCity);
      if (group) {
        let sortedClients = [...group.clients];
        if (value === "distance") {
          sortedClients.sort((a, b) => a.distance - b.distance);
        } else {
          sortedClients.sort((a, b) => a.nom.localeCompare(b.nom));
        }
        setFilteredClients(sortedClients);
      }
    }
  };

  if (loading || locationLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Tournée Chauffeur" subtitle="Planification des livraisons" />
          <main className="flex items-center justify-center h-[calc(100vh-73px)]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locationLoading ? "Recherche de votre position..." : "Chargement des clients..."}
              </p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!currentPosition) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Tournée Chauffeur" subtitle="Planification des livraisons" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8 text-center">
                <LocateFixed className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Position non disponible</h3>
                <p className="text-muted-foreground mb-4">
                  Activez la géolocalisation pour voir les clients proches de vous
                </p>
                <Button onClick={getCurrentLocation}>
                  <Navigation className="h-4 w-4 mr-2" />
                  Obtenir ma position
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
          title="Tournée Chauffeur" 
          subtitle={`Position actuelle: ${currentPosition.lat.toFixed(4)}, ${currentPosition.lng.toFixed(4)}`}
        />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Position actuelle */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Car className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Votre position actuelle</p>
                      <p className="font-mono text-sm">
                        Lat: {currentPosition.lat.toFixed(6)} | Lng: {currentPosition.lng.toFixed(6)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={getCurrentLocation}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rafraîchir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sélection de la ville */}
            {!selectedCity ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Sélectionnez une ville
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                    {cityGroups.map((group) => (
                      <Button
                        key={group.ville}
                        variant="outline"
                        className="h-auto py-4 flex flex-col gap-2"
                        onClick={() => handleCitySelect(group.ville)}
                      >
                        <Building2 className="h-6 w-6 text-primary" />
                        <span className="font-semibold">{group.ville}</span>
                        <Badge variant="secondary">{group.count} client(s)</Badge>
                      </Button>
                    ))}
                  </div>
                  {cityGroups.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      Aucun client avec coordonnées GPS trouvé
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Header de la ville sélectionnée */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Clients à {selectedCity}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Select value={sortBy} onValueChange={handleSortChange}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Trier par" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="distance">📏 Distance</SelectItem>
                          <SelectItem value="nom">📝 Nom</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button variant="outline" onClick={() => setSelectedCity("")}>
                        ← Changer de ville
                      </Button>
                    </div>
                  </CardHeader>
                </Card>

                {/* Liste des clients */}
                <div className="space-y-3">
                  {filteredClients.map((client) => (
                    <Card key={client.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <MapPin className="h-4 w-4 text-primary" />
                              <h3 className="font-semibold text-lg">{client.nom}</h3>
                              {client.solde > 0 && (
                                <Badge variant="destructive" className="text-xs">
                                  Solde: {formatCurrency(client.solde)}
                                </Badge>
                              )}
                            </div>
                            <div className="grid gap-1 text-sm text-muted-foreground">
                              {client.adresse && (
                                <p className="flex items-center gap-2">
                                  <span>📍</span> {client.adresse}
                                </p>
                              )}
                              {client.telephone && (
                                <p className="flex items-center gap-2">
                                  <Phone className="h-3 w-3" /> {client.telephone}
                                </p>
                              )}
                              {client.email && (
                                <p className="flex items-center gap-2">
                                  <Mail className="h-3 w-3" /> {client.email}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <div className="text-right">
                              <Badge className="bg-blue-500 text-white">
                                <Compass className="h-3 w-3 mr-1" />
                                {client.distanceText}
                              </Badge>
                              <p className="text-xs text-muted-foreground mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {client.duration}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedClient(client);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                Détails
                              </Button>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => openInMaps(client)}
                              >
                                <Route className="h-4 w-4 mr-1" />
                                Itinéraire
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {/* Dialog Détails Client */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Détails du client</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Client</p>
                <p className="font-semibold text-lg">{selectedClient.nom}</p>
              </div>
              <div className="grid gap-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Téléphone</span>
                  <span>{selectedClient.telephone}</span>
                </div>
                {selectedClient.email && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Email</span>
                    <span>{selectedClient.email}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adresse</span>
                  <span className="text-right">{selectedClient.adresse || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ville</span>
                  <span>{selectedClient.ville}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Distance</span>
                  <span className="font-semibold text-blue-600">{selectedClient.distanceText}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Durée estimée</span>
                  <span>{selectedClient.duration}</span>
                </div>
                {selectedClient.solde > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Solde</span>
                    <span className="text-red-600 font-semibold">{formatCurrency(selectedClient.solde)}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => openClientLocationInMaps(selectedClient)}
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Voir sur la carte
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    openInMaps(selectedClient);
                    setIsDetailsOpen(false);
                  }}
                >
                  <Route className="h-4 w-4 mr-2" />
                  Itinéraire
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Ajoutez l'import manquant
import { RefreshCw } from "lucide-react";