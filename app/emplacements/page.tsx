"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/types";
import { Plus, Warehouse, Edit, Trash2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface StockLocation {
  id: string;
  homeId: string;
  productId: string;
  quantite: number;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  quantiteStock: number;
  stockLocations?: StockLocation[];
}

interface HomeWithProducts {
  id: string;
  nom: string;
  description: string | null;
  createdAt: string;
  updatedAt?: string;
  produits?: Product[];
  stockLocations?: StockLocation[];
}

export default function EmplacementsPage() {
  const { sidebarClasses } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [homes, setHomes] = useState<HomeWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHome, setSelectedHome] = useState<HomeWithProducts | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  
  const { toast } = useToast();

  useEffect(() => {
    fetchHomes();
  }, []);

  const fetchHomes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/homes?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emplacements",
        variant: "destructive",
      });
      setHomes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/homes", {
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

      const newHome = await response.json();
      setHomes(prev => [{ ...newHome, produits: [], stockLocations: [] }, ...prev]);
      
      toast({
        title: "Succès",
        description: "Emplacement créé avec succès",
      });
      
      setIsDialogOpen(false);
      setFormData({ nom: "", description: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer l'emplacement",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (home: HomeWithProducts) => {
    setSelectedHome(home);
    setFormData({
      nom: home.nom,
      description: home.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedHome) return;
    
    try {
      const response = await fetch(`/api/homes/${selectedHome.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la modification");
      }

      const updatedHome = await response.json();
      setHomes(prev => prev.map(home => 
        home.id === updatedHome.id ? updatedHome : home
      ));
      
      toast({
        title: "Succès",
        description: "Emplacement modifié avec succès",
      });
      
      setIsEditDialogOpen(false);
      setSelectedHome(null);
      setFormData({ nom: "", description: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier l'emplacement",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (homeId: string, homeName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer l'emplacement "${homeName}" ?`)) return;
    
    try {
      const response = await fetch(`/api/homes/${homeId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }
      
      setHomes(prev => prev.filter(home => home.id !== homeId));
      
      toast({
        title: "Succès",
        description: "Emplacement supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'emplacement",
        variant: "destructive",
      });
    }
  };

  // Calculer le nombre total de produits dans cet emplacement
  const getProductCount = (home: HomeWithProducts) => {
    return home.produits?.length || 0;
  };

  // Calculer le stock total dans cet emplacement via StockLocation
  const getTotalStock = (home: HomeWithProducts) => {
    if (home.stockLocations && home.stockLocations.length > 0) {
      return home.stockLocations.reduce((sum, loc) => sum + loc.quantite, 0);
    }
    // Fallback sur produits.quantiteStock
    return home.produits?.reduce((sum, p) => sum + (p.quantiteStock || 0), 0) || 0;
  };

  const columns = [
    {
      key: "nom" as const,
      header: "Nom",
      render: (item: HomeWithProducts) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Warehouse className="h-4 w-4" />
          </div>
          <span className="font-medium">{item.nom}</span>
        </div>
      ),
    },
    {
      key: "description" as const,
      header: "Description",
      render: (item: HomeWithProducts) => (
        <span className="text-muted-foreground">{item.description || "-"}</span>
      ),
    },
    // {
    //   key: "produits" as const,
    //   header: "Produits",
    //   render: (item: HomeWithProducts) => (
    //     <Badge variant="secondary">{getProductCount(item)} produits</Badge>
    //   ),
    // },
    {
      key: "stock" as const,
      header: "Stock Total",
      render: (item: HomeWithProducts) => (
        <Badge variant="outline">{getTotalStock(item)} unités</Badge>
      ),
    },
    {
      key: "createdAt" as const, 
      header: "Date création",
      render: (item: HomeWithProducts) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.createdAt))}</span>
      ),
    }, 
    {
      key: "actions" as const,
      header: "Actions",
      render: (item: HomeWithProducts) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8"
            onClick={() => handleEdit(item)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleDelete(item.id, item.nom)}
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
          <Header title="Emplacements" subtitle="Gestion des espaces de stockage" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Chargement des emplacements...</span>
                </div>
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
        <Header title="Emplacements" subtitle="Gestion des espaces de stockage" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Warehouse className="h-5 w-5 text-primary" />
                Liste des Emplacements
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvel Emplacement
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter un Emplacement</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input 
                        id="nom" 
                        placeholder="Nom de l'emplacement" 
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Description de l'emplacement"
                        value={formData.description}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                        Annuler
                      </Button>
                      <Button type="submit">Enregistrer</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <DataTable
                data={homes}
                columns={columns}
                searchPlaceholder="Rechercher un emplacement..."
                searchKey="nom"
              />
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Dialog d'édition */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier l'Emplacement</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input 
                id="nom" 
                placeholder="Nom de l'emplacement" 
                value={formData.nom}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Description de l'emplacement"
                value={formData.description}
                onChange={handleInputChange}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Mettre à jour</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 