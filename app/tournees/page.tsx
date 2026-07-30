"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Truck,
  MapPin,
  Plus,
  Loader2,
  Calendar,
  Phone,
  Navigation2,
  CheckCircle,
  MessageSquare,
  Filter,
  RefreshCw,
  Users
} from "lucide-react";
import { formatDate } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import dynamic from 'next/dynamic';

const TourneeMap = dynamic(() => import('@/components/TourneeMap'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-96 bg-muted rounded-lg">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
});

interface Mission {
  id: string;
  ordre: number;
  action: 'VISITE' | 'VALIDATION' | 'A_REVISITER';
  statut: 'EN_ATTENTE' | 'REALISEE' | 'REPORTEE' | 'ANNULEE';
  commentaire: string | null;
  distance: number | null;
  latitude: number | null;
  longitude: number | null;
  dateRealisation: string | null;
  actionHistory?: ActionHistoryEntry[] | null;
  client: {
    id: string;
    nom: string;
    telephone: string;
  };
  adresse: {
    id: string;
    adresse: string;
    ville: string;
    latitude?: number | null;
    longitude?: number | null;
  };
}

interface Tournee {
  id: string;
  numero: string;
  date: string;
  ville: string;
  statut: 'EN_COURS' | 'TERMINEE' | 'ANNULEE';
  chauffeur: {
    id: string;
    nom: string;
    user: { nom: string };
  };
  missions: Mission[];
}

interface ActionHistoryEntry {
  id: string;
  date: string;
  oldAction: string;
  newAction: string;
  oldStatut: string;
  newStatut: string;
  userId?: string;
  userName?: string;
  commentaire?: string;
}

interface Chauffeur {
  id: string;
  nom: string;
  user: { nom: string };
}

export default function TourneesPage() {
  const { sidebarClasses } = useSidebar();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [tournees, setTournees] = useState<Tournee[]>([]);
  const [selectedTournee, setSelectedTournee] = useState<Tournee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [ville, setVille] = useState("");
  const [villesDisponibles, setVillesDisponibles] = useState<string[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [chauffeurPosition, setChauffeurPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [missionAction, setMissionAction] = useState<string>("");
  const [missionCommentaire, setMissionCommentaire] = useState("");
  const [isMissionDialogOpen, setIsMissionDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [highlightedMission, setHighlightedMission] = useState<string | null>(null);
  const [showHistoryForMission, setShowHistoryForMission] = useState<string | null>(null);
  // Filtres
  const [filterChauffeurId, setFilterChauffeurId] = useState<string>("");
  const [filterStatut, setFilterStatut] = useState<string>("");
  const [filterVille, setFilterVille] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  useEffect(() => {
    fetchTournees();
    fetchVillesDisponibles();
    if (isAdmin) {
      fetchChauffeurs();
    }
  }, [filterChauffeurId, filterStatut, filterVille]);

  const fetchTournees = async () => {
    setIsLoading(true);
    try {
      let url = "/api/tournees";
      const params = new URLSearchParams();
      if (filterChauffeurId) params.append('chauffeurId', filterChauffeurId);
      if (filterStatut) params.append('statut', filterStatut);
      if (filterVille) params.append('ville', filterVille);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      const tourneesData = Array.isArray(data) ? data : [];
      setTournees(tourneesData);
      if (tourneesData.length > 0 && !selectedTournee) {
        setSelectedTournee(tourneesData[0]);
      }
    } catch (error) {
      console.error("Error fetching tournees:", error);
      toast({ title: "Erreur", description: "Impossible de charger les tournées", variant: "destructive" });
      setTournees([]);
    } finally {
      setIsLoading(false);
    }
  };
  const openMissionDialog = (mission: Mission) => {
    setSelectedMission(mission);
    setMissionAction(mission.action);
    setMissionCommentaire(mission.commentaire || "");
    setIsMissionDialogOpen(true);
  };

  const fetchVillesDisponibles = async () => {
    try {
      const response = await fetch("/api/clients/villes");
      const data = await response.json();
      setVillesDisponibles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching villes:", error);
    }
  };

  const fetchChauffeurs = async () => {
    try {
      const response = await fetch("/api/chauffeurs?limit=100");
      const data = await response.json();
      setChauffeurs(data.data || []);
    } catch (error) {
      console.error("Error fetching chauffeurs:", error);
    }
  };

  const getChauffeurLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Géolocalisation non supportée"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) => reject(error),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const handleCreateTournee = async () => {
    if (!ville) {
      toast({ title: "Erreur", description: "Veuillez sélectionner une ville", variant: "destructive" });
      return;
    }

    setIsCreating(true);
    try {
      let position = null;
      try {
        position = await getChauffeurLocation();
        setChauffeurPosition(position);
      } catch (error) {
        console.warn("Impossible d'obtenir la position:", error);
      }

      const response = await fetch("/api/tournees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ville, positionChauffeur: position }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: `Tournée créée avec succès` });
      setIsDialogOpen(false);
      setVille("");
      fetchTournees();
    } catch (error) {
      console.error("Error creating tournee:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer la tournée", variant: "destructive" });
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateMission = async () => {
    if (!selectedMission) return;

    setIsUpdating(true);

    // Sauvegarder l'ancienne mission pour l'historique
    const oldMission = { ...selectedMission };
    const newStatut = missionAction === 'A_REVISITER' ? 'REPORTEE' : 'REALISEE';

    // Créer l'entrée d'historique
    const historyEntry = createHistoryEntry(
      oldMission,
      missionAction,
      newStatut,
      missionCommentaire
    );

    // Récupérer l'historique existant
    const existingHistory = (selectedMission.actionHistory as ActionHistoryEntry[]) || [];
    const updatedHistory = [...existingHistory, historyEntry];

    // Mise à jour locale immédiate
    updateMissionLocally(selectedMission.id, {
      action: missionAction as any,
      commentaire: missionCommentaire,
      statut: newStatut as any,
      dateRealisation: newStatut === 'REALISEE' ? new Date().toISOString() : selectedMission.dateRealisation,
      actionHistory: updatedHistory
    });

    // Animation de la mission mise à jour
    setHighlightedMission(selectedMission.id);
    setTimeout(() => setHighlightedMission(null), 500);

    try {
      const response = await fetch("/api/tournees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId: selectedMission.id,
          action: missionAction,
          commentaire: missionCommentaire,
          statut: newStatut,
          actionHistory: updatedHistory,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la mise à jour");
      }

      toast({
        title: "Succès",
        description: `Mission ${getActionLabel(missionAction)} - ${newStatut === 'REALISEE' ? 'réalisée' : 'reportée'}`
      });
      setIsMissionDialogOpen(false);
      setSelectedMission(null);
      setMissionAction("");
      setMissionCommentaire("");

      // Rafraîchir en arrière-plan pour confirmer
      fetchTournees();
    } catch (error) {
      // Restaurer l'ancien état en cas d'erreur
      updateMissionLocally(selectedMission.id, {
        action: oldMission.action as any,
        commentaire: oldMission.commentaire || "",
        statut: oldMission.statut as any,
        dateRealisation: oldMission.dateRealisation,
        actionHistory: oldMission.actionHistory
      });
      console.error("Error updating mission:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de mettre à jour la mission",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      VISITE: "Visite",
      VALIDATION: "Validation",
      A_REVISITER: "À revisiter",
    };
    return labels[action] || action;
  };

  const generateHistoryId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Fonction pour créer une entrée d'historique
  const createHistoryEntry = (
    oldMission: Mission,
    newAction: string,
    newStatut: string,
    commentaire: string
  ): ActionHistoryEntry => {
    return {
      id: generateHistoryId(),
      date: new Date().toISOString(),
      oldAction: oldMission.action,
      newAction: newAction,
      oldStatut: oldMission.statut,
      newStatut: newStatut,
      userId: session?.user?.id,
      userName: session?.user?.nom || session?.user?.email,
      commentaire: commentaire
    };
  };

  const updateMissionLocally = (missionId: string, updates: Partial<Mission>) => {
    if (!selectedTournee) return;

    // Mettre à jour la mission dans la tournée sélectionnée
    const updatedMissions = selectedTournee.missions.map(mission =>
      mission.id === missionId ? { ...mission, ...updates } : mission
    );

    setSelectedTournee({
      ...selectedTournee,
      missions: updatedMissions
    });

    // Mettre à jour la liste des tournées
    setTournees(prevTournees =>
      prevTournees.map(tournee =>
        tournee.id === selectedTournee.id
          ? { ...tournee, missions: updatedMissions }
          : tournee
      )
    );
  };

  const getActionBadge = (action: string) => {
    const styles: Record<string, string> = {
      VISITE: "bg-blue-500",
      VALIDATION: "bg-purple-500",
      A_REVISITER: "bg-orange-500",
    };
    return <Badge className={styles[action] || "bg-gray-500"}>{getActionLabel(action)}</Badge>;
  };

  // Fonction pour afficher l'historique d'une mission
  const toggleHistory = (missionId: string) => {
    setShowHistoryForMission(showHistoryForMission === missionId ? null : missionId);
  };

  // Fonction pour formater l'heure
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };
  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      EN_ATTENTE: "bg-yellow-500",
      REALISEE: "bg-green-500",
      REPORTEE: "bg-orange-500",
      ANNULEE: "bg-red-500",
      EN_COURS: "bg-blue-500",
      TERMINEE: "bg-green-500",
    };
    const labels: Record<string, string> = {
      EN_ATTENTE: "En attente",
      REALISEE: "Réalisée",
      REPORTEE: "Reportée",
      ANNULEE: "Annulée",
      EN_COURS: "En cours",
      TERMINEE: "Terminée",
    };
    return <Badge className={styles[statut] || "bg-gray-500"}>{labels[statut] || statut}</Badge>;
  };

  const resetFilters = () => {
    setFilterChauffeurId("");
    setFilterStatut("");
    setFilterVille("");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Gestion des Tournées" subtitle="Planification et suivi" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-8">
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
        <Header title="Gestion des Tournées" subtitle="Planification et suivi" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Barre d'actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Nouvelle tournée
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Créer une nouvelle tournée</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Sélectionner une ville</Label>
                            <Select value={ville} onValueChange={setVille}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir une ville" />
                              </SelectTrigger>
                              <SelectContent>
                                {villesDisponibles.map((v) => (
                                  <SelectItem key={v} value={v}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* <div className="text-sm text-muted-foreground">
                            <p>📌 Les clients seront triés par distance depuis votre position.</p>
                            <p>📍 Assurez-vous d'activer la géolocalisation pour optimiser l'ordre.</p>
                          </div> */}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                          <Button onClick={handleCreateTournee} disabled={isCreating}>
                            {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Créer la tournée
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {isAdmin && (
                      <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Filtres
                      </Button>
                    )}

                    <Button variant="ghost" onClick={fetchTournees}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filtres pour admin */}
                {isFilterOpen && isAdmin && (
                  <div className="mt-4 p-4 border rounded-lg grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Chauffeur</Label>
                      <Select value={filterChauffeurId || "all"} onValueChange={(value) => setFilterChauffeurId(value === "all" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les chauffeurs" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les chauffeurs</SelectItem>
                          {chauffeurs.map((chauffeur) => (
                            <SelectItem key={chauffeur.id} value={chauffeur.id}>
                              {chauffeur.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Statut</Label>
                      <Select value={filterStatut || "all"} onValueChange={(value) => setFilterStatut(value === "all" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Tous les statuts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tous les statuts</SelectItem>
                          <SelectItem value="EN_COURS">En cours</SelectItem>
                          <SelectItem value="TERMINEE">Terminée</SelectItem>
                          <SelectItem value="ANNULEE">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Ville</Label>
                      <Select value={filterVille || "all"} onValueChange={(value) => setFilterVille(value === "all" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes les villes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les villes</SelectItem>
                          {villesDisponibles.map((v) => (
                            <SelectItem key={v} value={v}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button variant="outline" size="sm" onClick={resetFilters}>
                        Réinitialiser
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Liste des tournées */}
            {tournees.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Truck className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Aucune tournée</h3>
                  <p className="text-muted-foreground mb-4">Créez votre première tournée pour commencer</p>
                  <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Créer une tournée
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {/* Liste des tournées */}
                <Card className="lg:col-span-1">
                  <CardHeader>
                    <CardTitle>Mes tournées ({tournees.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-[600px] overflow-y-auto">
                      {tournees.map((tournee) => {
                        const missionsRealisees = tournee.missions.filter(m => m.statut === 'REALISEE').length;
                        const progression = (missionsRealisees / tournee.missions.length) * 100;
                        return (
                          <div
                            key={tournee.id}
                            className={`p-3 rounded-lg cursor-pointer transition-all border ${selectedTournee?.id === tournee.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                              }`}
                            onClick={() => setSelectedTournee(tournee)}
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{tournee.numero}</p>
                                <p className="text-sm text-muted-foreground">{tournee.ville}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(new Date(tournee.date))}
                                </p>
                                {isAdmin && (
                                  <p className="text-xs text-primary mt-1">
                                    Chauffeur: {tournee.chauffeur?.nom || tournee.chauffeur?.user?.nom}
                                  </p>
                                )}
                              </div>
                              {/* {getStatutBadge(tournee.statut)} */}
                            </div>
                            <div className="mt-2">
                              <div className="flex justify-between text-xs mb-1">
                                <span>Progression</span>
                                <span>{Math.round(progression)}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-1.5">
                                <div className="bg-primary h-1.5 rounded-full" style={{ width: `${progression}%` }} />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {missionsRealisees}/{tournee.missions.length} missions
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Détails de la tournée sélectionnée */}
                {selectedTournee && (
                  <Card className="lg:col-span-2">
                    <CardHeader>
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <CardTitle className="flex items-center gap-2">
                          <Truck className="h-5 w-5" />
                          {selectedTournee.numero} - {selectedTournee.ville}
                        </CardTitle>
                        {getStatutBadge(selectedTournee.statut)}
                      </div>
                      {isAdmin && (
                        <p className="text-sm text-muted-foreground">
                          Chauffeur: {selectedTournee.chauffeur?.nom || selectedTournee.chauffeur?.user?.nom}
                        </p>
                      )}
                      <div className="mt-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progression</span>
                          <span>{Math.round((selectedTournee.missions.filter(m => m.statut === 'REALISEE').length / selectedTournee.missions.length) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full transition-all"
                            style={{ width: `${(selectedTournee.missions.filter(m => m.statut === 'REALISEE').length / selectedTournee.missions.length) * 100}%` }}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Tabs defaultValue="missions" className="space-y-4">
                        <TabsList>
                          <TabsTrigger value="missions">📋 Missions ({selectedTournee.missions.length})</TabsTrigger>
                          <TabsTrigger value="map">🗺️ Carte</TabsTrigger>
                        </TabsList>

                        <TabsContent value="missions">
                          <div className="space-y-3 max-h-[500px] overflow-y-auto">
                            {selectedTournee.missions.map((mission) => {
                              const history = (mission.actionHistory as ActionHistoryEntry[]) || [];
                              const hasHistory = history.length > 0;
                              const isHistoryOpen = showHistoryForMission === mission.id;

                              return (
                                <div
                                  key={mission.id}
                                  className={`p-4 rounded-lg border transition-all duration-300 ${highlightedMission === mission.id ? 'bg-green-50 border-green-300' : ''
                                    } ${mission.statut === 'EN_ATTENTE' ? 'bg-white' : 'bg-muted/30'
                                    }`}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                                        <span className="font-semibold text-lg">#{mission.ordre}</span>
                                        <Badge className={
                                          mission.action === 'VISITE' ? 'bg-blue-500' :
                                            mission.action === 'VALIDATION' ? 'bg-purple-500' :
                                              'bg-orange-500'
                                        }>
                                          {getActionLabel(mission.action)}
                                        </Badge>
                                        {/* <Badge className={
                                          mission.statut === 'EN_ATTENTE' ? 'bg-yellow-500' :
                                            mission.statut === 'REALISEE' ? 'bg-green-500' :
                                              mission.statut === 'REPORTEE' ? 'bg-orange-500' :
                                                'bg-red-500'
                                        }>
                                          {mission.statut === 'EN_ATTENTE' ? 'En attente' :
                                            mission.statut === 'REALISEE' ? 'Réalisée' :
                                              mission.statut === 'REPORTEE' ? 'Reportée' : 'Annulée'}
                                        </Badge> */}
                                        {mission.distance && (
                                          <Badge variant="outline" className="text-xs">
                                            📍 {mission.distance.toFixed(1)} km
                                          </Badge>
                                        )}
                                      </div>

                                      <p className="font-medium">{mission.client.nom}</p>

                                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                        <Phone className="h-3 w-3" />
                                        <span>{mission.client.telephone}</span>
                                      </div>

                                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                                        <MapPin className="h-3 w-3" />
                                        <span>{mission.adresse.adresse}, {mission.adresse.ville}</span>
                                      </div>

                                      {mission.commentaire && (
                                        <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                                          <MessageSquare className="h-3 w-3 inline mr-1" />
                                          {mission.commentaire}
                                        </div>
                                      )}

                                      {/* Affichage de l'action actuelle avec date */}
                                      {mission.dateRealisation && (
                                        <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                                          <Calendar className="h-3 w-3" />
                                          <span>Traité le: {formatDate(new Date(mission.dateRealisation))}</span>
                                          <span>à {formatTime(mission.dateRealisation)}</span>
                                        </div>
                                      )}

                                      {/* Bouton pour afficher l'historique */}
                                      {hasHistory && (
                                        <button
                                          onClick={() => toggleHistory(mission.id)}
                                          className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                                        >
                                          <RefreshCw className="h-3 w-3" />
                                          {isHistoryOpen ? 'Masquer' : `Afficher l'historique (${history.length})`}
                                        </button>
                                      )}

                                      {/* Affichage de l'historique */}
                                      {isHistoryOpen && (
                                        <div className="mt-2 space-y-1 border-l-2 border-muted pl-3">
                                          <p className="text-xs font-semibold text-muted-foreground mb-1">Historique des changements :</p>
                                          {history.map((entry, idx) => (
                                            <div key={entry.id} className="text-xs text-muted-foreground py-1">
                                              <div className="flex items-center gap-1 mt-0.5">
                                                <span className="line-through text-red-500">{getActionLabel(entry.oldAction)}</span>
                                                <span>→</span>
                                                <span className="text-green-600">{getActionLabel(entry.newAction)}</span>
                                                {/* <span className="mx-1 text-gray-300">|</span>
                                                <span className="line-through text-red-500">
                                                  {entry.oldStatut === 'EN_ATTENTE' ? 'En attente' :
                                                    entry.oldStatut === 'REALISEE' ? 'Réalisée' :
                                                      entry.oldStatut === 'REPORTEE' ? 'Reportée' : 'Annulée'}
                                                </span> */}
                                                {/* <span>→</span>
                                                <span className="text-green-600">
                                                  {entry.newStatut === 'REALISEE' ? 'Réalisée' :
                                                    entry.newStatut === 'REPORTEE' ? 'Reportée' : entry.newStatut}
                                                </span> */}
                                              </div>
                                              {entry.commentaire && (
                                                <p className="text-muted-foreground/70 mt-0.5 italic">
                                                  "{entry.commentaire}"
                                                </p>
                                              )}
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>

                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            if (mission.latitude && mission.longitude) {
                                              window.open(`https://www.google.com/maps/dir/${chauffeurPosition?.lat || ''},${chauffeurPosition?.lng || ''}/${mission.latitude},${mission.longitude}`, '_blank');
                                            } else if (mission.adresse?.latitude && mission.adresse?.longitude) {
                                              window.open(`https://www.google.com/maps/dir/${chauffeurPosition?.lat || ''},${chauffeurPosition?.lng || ''}/${mission.adresse.latitude},${mission.adresse.longitude}`, '_blank');
                                            }
                                          }}
                                        >
                                          <Navigation2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          size="sm"
                                          onClick={() => openMissionDialog(mission)}
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Traiter
                                        </Button>
                                      </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </TabsContent>

                        <TabsContent value="map">
                          <div className="h-96">
                            <TourneeMap
                              chauffeurPosition={chauffeurPosition}
                              livraisons={selectedTournee.missions.map(m => ({
                                id: m.id,
                                client: m.client,
                                adresse: m.adresse,
                                latitude: m.latitude,
                                longitude: m.longitude,
                                ordre: m.ordre,
                              }))}
                              currentIndex={0}
                              onSelectLivraison={() => { }}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Dialog de mise à jour de mission */}
      <Dialog open={isMissionDialogOpen} onOpenChange={setIsMissionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mettre à jour la mission</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Action réalisée</Label>
              <Select value={missionAction} onValueChange={setMissionAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VISITE">Visite simple</SelectItem>
                  <SelectItem value="VALIDATION">Validation client</SelectItem>
                  <SelectItem value="A_REVISITER">À revisiter plus tard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Commentaire (optionnel)</Label>
              <Textarea
                value={missionCommentaire}
                onChange={(e) => setMissionCommentaire(e.target.value)}
                placeholder="Ajouter un commentaire..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsMissionDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleUpdateMission} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Enregistrer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}