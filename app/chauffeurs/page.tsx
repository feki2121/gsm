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
import { Plus, Edit, Trash2, Eye, Loader2, Truck, User, Mail, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/types";

interface Vehicule {
  id: string;
  immatricule: string;
  nom: string;
}

interface Chauffeur {
  id: string;
  nom: string;
  telephone: string;
  userId: string;
  vehiculeId: string | null;
  vehicule?: Vehicule;
  user: {
    email: string;
  };
  createdAt: string;
}

export default function ChauffeursPage() {
  const { sidebarClasses } = useSidebar();
  const { toast } = useToast();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedChauffeur, setSelectedChauffeur] = useState<Chauffeur | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    telephone: "",
    password: "",
    vehiculeId: "",
  });

  useEffect(() => {
    fetchChauffeurs();
    fetchVehicules();
  }, []);

  const fetchChauffeurs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/chauffeurs?limit=100");
      const data = await response.json();
      setChauffeurs(data.data || []);
    } catch (error) {
      console.error("Error fetching chauffeurs:", error);
      toast({ title: "Erreur", description: "Impossible de charger les chauffeurs", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchVehicules = async () => {
    try {
      const response = await fetch("/api/vehicules");
      const data = await response.json();
      setVehicules(data.data || []);
    } catch (error) {
      console.error("Error fetching vehicules:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/chauffeurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Chauffeur créé avec succès" });
      setIsDialogOpen(false);
      resetForm();
      fetchChauffeurs();
    } catch (error) {
      console.error("Error creating chauffeur:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer le chauffeur", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce chauffeur ?")) return;

    try {
      const response = await fetch(`/api/chauffeurs/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({ title: "Succès", description: "Chauffeur supprimé avec succès" });
      fetchChauffeurs();
    } catch (error) {
      console.error("Error deleting chauffeur:", error);
      toast({ title: "Erreur", description: "Impossible de supprimer le chauffeur", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      nom: "",
      email: "",
      telephone: "",
      password: "",
      vehiculeId: "",
    });
    setSelectedChauffeur(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Chauffeurs" subtitle="Gestion des chauffeurs" />
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
        <Header title="Chauffeurs" subtitle="Gestion des chauffeurs" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Liste des Chauffeurs
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  {/* <Button onClick={resetForm}>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouveau Chauffeur
                  </Button> */}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {selectedChauffeur ? "Modifier le Chauffeur" : "Ajouter un Chauffeur"}
                    </DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom complet *</Label>
                      <Input
                        id="nom"
                        placeholder="Nom du chauffeur"
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
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
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe *</Label>
                      <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="vehiculeId">Véhicule assigné</Label>
                      <Select value={formData.vehiculeId} onValueChange={(value) => setFormData({ ...formData, vehiculeId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un véhicule" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Aucun véhicule</SelectItem>
                          {vehicules.map((vehicule) => (
                            <SelectItem key={vehicule.id} value={vehicule.id}>
                              {vehicule.nom} - {vehicule.immatricule}
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
                        {selectedChauffeur ? "Modifier" : "Créer"}
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
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Véhicule</TableHead>
                      <TableHead>Date d'ajout</TableHead>
                      {/* <TableHead className="w-[100px]">Actions</TableHead> */}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chauffeurs.map((chauffeur) => (
                      <TableRow key={chauffeur.id}>
                        <TableCell className="font-medium">{chauffeur.nom}</TableCell>
                        <TableCell>{chauffeur.user.email}</TableCell>
                        <TableCell>{chauffeur.telephone}</TableCell>
                        <TableCell>
                          {chauffeur.vehicule ? (
                            <Badge variant="outline" className="flex w-fit items-center gap-1">
                              <Truck className="h-3 w-3" />
                              {chauffeur.vehicule.nom}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Non assigné</span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(new Date(chauffeur.createdAt))}
                        </TableCell>
                        {/* <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600 hover:text-red-700"
                              onClick={() => handleDelete(chauffeur.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell> */}
                      </TableRow>
                    ))}
                    {chauffeurs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          Aucun chauffeur trouvé
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