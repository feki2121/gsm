"use client";

import { useState, useEffect } from "react";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit, Trash2, Eye, Loader2, Truck, Home, Users, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/types";

interface Home {
  id: string;
  nom: string;
}

interface Chauffeur {
  id: string;
  nom: string;
  user: {
    email: string;
  };
}

interface Vehicule {
  id: string;
  immatricule: string;
  nom: string;
  description: string | null;
  homeId: string;
  home?: Home;
  chauffeurs: Chauffeur[];
  createdAt: string;
}

export default function VehiculesPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedVehicule, setSelectedVehicule] = useState<Vehicule | null>(null);
  const [formData, setFormData] = useState({
    immatricule: "",
    nom: "",
    description: "",
    homeId: "",
  });

  useEffect(() => {
    fetchVehicules();
    fetchHomes();
  }, []);

  const fetchVehicules = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/vehicules?limit=100");
      const data = await response.json();
      setVehicules(data.data || []);
    } catch (error) {
      console.error("Error fetching vehicules:", error);
      toast({ title: "Erreur", description: "Impossible de charger les véhicules", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/vehicules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Véhicule créé avec succès" });
      setIsDialogOpen(false);
      resetForm();
      fetchVehicules();
    } catch (error) {
      console.error("Error creating vehicule:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer le véhicule", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, nom: string, chauffeursCount: number) => {
    if (chauffeursCount > 0) {
      toast({
        title: "Impossible de supprimer",
        description: `Ce véhicule a ${chauffeursCount} chauffeur(s) assigné(s). Veuillez d'abord réassigner les chauffeurs.`,
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer le véhicule "${nom}" ?`)) return;

    try {
      const response = await fetch(`/api/vehicules/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast({ title: "Succès", description: "Véhicule supprimé avec succès" });
      fetchVehicules();
    } catch (error) {
      console.error("Error deleting vehicule:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de supprimer le véhicule", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      immatricule: "",
      nom: "",
      description: "",
      homeId: "",
    });
    setSelectedVehicule(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Véhicules" subtitle="Gestion des véhicules de livraison" />
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
        <Header title="Véhicules" subtitle="Gestion des véhicules de livraison" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-primary" />
                Liste des Véhicules
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Véhicule
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedVehicule ? "Modifier le Véhicule" : "Ajouter un Véhicule"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="immatricule">Immatriculation *</Label>
                      <Input
                        id="immatricule"
                        placeholder="123-TUN-456"
                        value={formData.immatricule}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom du véhicule *</Label>
                      <Input
                        id="nom"
                        placeholder="Camion 1, Fourgonnette, etc."
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        placeholder="Description optionnelle"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="homeId">Entrepôt associé *</Label>
                      <Select value={formData.homeId} onValueChange={(value) => setFormData({ ...formData, homeId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un entrepôt" />
                        </SelectTrigger>
                        <SelectContent>
                          {homes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedVehicule ? "Modifier" : "Créer"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Immatriculation</TableHead>
                      <TableHead>Nom</TableHead>
                      <TableHead>Entrepôt</TableHead>
                      <TableHead>Chauffeurs</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {vehicules.map((vehicule) => (
                      <TableRow key={vehicule.id}>
                        <TableCell className="font-mono font-medium">{vehicule.immatricule}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Truck className="h-4 w-4 text-muted-foreground" />
                            {vehicule.nom}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="flex w-fit items-center gap-1">
                            <Home className="h-3 w-3" />
                            {vehicule.home?.nom || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicule.chauffeurs.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {vehicule.chauffeurs.map((chauffeur) => (
                                <Badge key={chauffeur.id} variant="secondary" className="text-xs">
                                  {chauffeur.nom}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Aucun chauffeur</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                          {vehicule.description || "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {formatDate(new Date(vehicule.createdAt))}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(vehicule.id, vehicule.nom, vehicule.chauffeurs.length)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {vehicules.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Aucun véhicule trouvé
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}