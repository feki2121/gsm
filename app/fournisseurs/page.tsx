'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fournisseur, formatCurrency } from "@/lib/types";
import { Plus, Truck, Edit, Trash2, Eye, Phone, Mail, MapPin, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

export default function FournisseursPage() {
  const { sidebarClasses } = useSidebar();
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState<Fournisseur | null>(null);
  const [viewingFournisseur, setViewingFournisseur] = useState<Fournisseur | null>(null);
  const [deletingFournisseur, setDeletingFournisseur] = useState<Fournisseur | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const fetchFournisseurs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/fournisseurs?limit=10000");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFournisseurs(data.data || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les fournisseurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const resetForm = () => {
    setFormData({ nom: "", telephone: "", email: "", adresse: "" });
    setEditingFournisseur(null);
  };

  const openEditDialog = (fournisseur: Fournisseur) => {
    setEditingFournisseur(fournisseur);
    setFormData({
      nom: fournisseur.nom,
      telephone: fournisseur.telephone,
      email: fournisseur.email || "",
      adresse: fournisseur.adresse || "",
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.telephone) {
      toast({
        title: "Erreur",
        description: "Le nom et le téléphone sont requis",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = editingFournisseur 
        ? `/api/fournisseurs/${editingFournisseur.id}`
        : "/api/fournisseurs";
      
      const method = editingFournisseur ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Erreur lors de ${editingFournisseur ? 'la modification' : 'la création'}`);
      }

      toast({
        title: "Succès",
        description: editingFournisseur 
          ? "Fournisseur modifié avec succès" 
          : "Fournisseur ajouté avec succès",
      });

      setIsDialogOpen(false);
      resetForm();
      fetchFournisseurs();
    } catch (error) {
      console.error("Error saving fournisseur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : `Impossible de ${editingFournisseur ? 'modifier' : 'ajouter'} le fournisseur`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };


const handleDelete = async (id: string, nom: string) => {
  if (!confirm(`Êtes-vous sûr de vouloir supprimer le fournisseur "${nom}" ?`)) {
    return;
  }

  try {
    const response = await fetch(`/api/fournisseurs/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      // Afficher l'erreur dans un toast, pas dans la console
      let errorMessage = data.error || "Erreur lors de la suppression";
      
      if (data.details) {
        errorMessage = `${errorMessage}\n${data.details}`;
      }
      
      toast({
        title: "Suppression impossible",
        description: errorMessage,
        variant: "destructive",
      });
      return; // Important: on sort sans throw
    }

    // Succès
    toast({
      title: "Succès",
      description: data.message || "Fournisseur supprimé avec succès",
    });

    // Rafraîchir la liste
    fetchFournisseurs();
    
  } catch (error) {
    console.error("Error deleting fournisseur:", error);
    toast({
      title: "Erreur",
      description: "Une erreur inattendue s'est produite",
      variant: "destructive",
    });
  }
};

  const columns = [
    {
      key: "nom" as keyof Fournisseur,
      header: "Fournisseur",
      render: (item: Fournisseur) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <p className="font-medium">{item.nom}</p>
            {item.email && (
              <p className="text-sm text-muted-foreground">{item.email}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "telephone" as keyof Fournisseur,
      header: "Téléphone",
      render: (item: Fournisseur) => (
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{item.telephone}</span>
        </div>
      ),
    },
    {
      key: "adresse" as keyof Fournisseur,
      header: "Adresse",
      render: (item: Fournisseur) => (
        <div className="flex items-center gap-2 max-w-[200px]">
          <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-muted-foreground">{item.adresse || "-"}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Fournisseur) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => setViewingFournisseur(item)}
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
            onClick={() => setDeletingFournisseur(item)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalDettes = fournisseurs.reduce((sum, f) => sum + (f.solde || 0), 0);
  const fournisseursAvecDettes = fournisseurs.filter((f) => (f.solde || 0) > 0).length;

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Fournisseurs" subtitle="Gestion des fournisseurs" />
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
        <Header title="Fournisseurs" subtitle="Gestion des fournisseurs" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Summary */}
            {/* <div className="grid gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Fournisseurs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fournisseurs.length}</div>
                </CardContent>
              </Card>
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Dettes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDettes)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Fournisseurs avec Dettes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fournisseursAvecDettes}</div>
                </CardContent>
              </Card>
            </div> */}

            {/* Fournisseurs Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Liste des Fournisseurs
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  if (!open) resetForm();
                  setIsDialogOpen(open);
                }}>
                  <DialogTrigger asChild>
                    <Button onClick={() => resetForm()}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau Fournisseur
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {editingFournisseur ? "Modifier le Fournisseur" : "Ajouter un Fournisseur"}
                      </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom de l&apos;entreprise *</Label>
                        <Input 
                          id="nom" 
                          placeholder="Nom du fournisseur" 
                          value={formData.nom}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
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
                          <Label htmlFor="email">Email</Label>
                          <Input 
                            id="email" 
                            type="email" 
                            placeholder="email@example.com" 
                            value={formData.email}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="adresse">Adresse</Label>
                        <Textarea 
                          id="adresse" 
                          placeholder="Adresse complète" 
                          value={formData.adresse}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setIsDialogOpen(false)}
                        >
                          Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {editingFournisseur ? "Modification..." : "Enregistrement..."}
                            </>
                          ) : (
                            editingFournisseur ? "Modifier" : "Enregistrer"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={fournisseurs}
                  columns={columns}
                  searchPlaceholder="Rechercher un fournisseur..."
                  searchKey="nom"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Modal de visualisation */}
      <Dialog open={!!viewingFournisseur} onOpenChange={() => setViewingFournisseur(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Détails du Fournisseur</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setViewingFournisseur(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          {viewingFournisseur && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Truck className="h-10 w-10" />
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="border-b pb-2">
                  <p className="text-sm text-muted-foreground">Nom de l'entreprise</p>
                  <p className="font-medium">{viewingFournisseur.nom}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-muted-foreground">Téléphone</p>
                  <p className="font-medium">{viewingFournisseur.telephone}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{viewingFournisseur.email || "-"}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-muted-foreground">Adresse</p>
                  <p className="font-medium">{viewingFournisseur.adresse || "-"}</p>
                </div>
                
                <div className="border-b pb-2">
                  <p className="text-sm text-muted-foreground">Solde (Dette)</p>
                  <p className={cn(
                    "font-medium",
                    (viewingFournisseur.solde || 0) > 0 ? "text-destructive" : "text-green-600"
                  )}>
                    {formatCurrency(viewingFournisseur.solde || 0)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialogue de confirmation de suppression */}
      <AlertDialog open={!!deletingFournisseur} onOpenChange={() => setDeletingFournisseur(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action ne peut pas être annulée. Cela supprimera définitivement le fournisseur
              <span className="font-semibold text-foreground"> "{deletingFournisseur?.nom}"</span>
              {deletingFournisseur && (deletingFournisseur.solde || 0) > 0 && (
                <span className="block mt-2 text-destructive">
                  ⚠️ Attention : Ce fournisseur a une dette de {formatCurrency(deletingFournisseur.solde || 0)}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleDelete(deletingFournisseur?.id || "", deletingFournisseur?.nom || "")} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}