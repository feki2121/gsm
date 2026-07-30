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
import { Plus, FolderTree, Edit, Trash2, Loader2 } from "lucide-react";
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

// Type étendu pour inclure les produits
interface CategoryWithProducts {
  id: string;
  nom: string;
  description: string | null;
  createdAt: Date | string;
  updatedAt?: Date | string;
  produits?: Array<{ id: string; reference: string; designation: string }>;
}

// Ou utilisez le type Prisma avec Include
// import { Category } from '@prisma/client'
// type CategoryWithProducts = Category & { produits: Product[] }

export default function CategoriesPage() {
  const { sidebarClasses } = useSidebar();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<CategoryWithProducts | null>(null);
  const [formData, setFormData] = useState({
    nom: "",
    description: "",
  });
  
  const { toast } = useToast();

  // Charger les catégories
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/categories?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      // L'API retourne { data: [], pagination: {} }
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      });
      setCategories([]);
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
      const response = await fetch("/api/categories", {
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

      const newCategory = await response.json();
      setCategories(prev => [{ ...newCategory, produits: [] }, ...prev]);
      
      toast({
        title: "Succès",
        description: "Catégorie créée avec succès",
      });
      
      setIsDialogOpen(false);
      setFormData({ nom: "", description: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (category: CategoryWithProducts) => {
    setSelectedCategory(category);
    setFormData({
      nom: category.nom,
      description: category.description || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCategory) return;
    
    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
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

      const updatedCategory = await response.json();
      setCategories(prev => prev.map(cat => 
        cat.id === updatedCategory.id ? updatedCategory : cat
      ));
      
      toast({
        title: "Succès",
        description: "Catégorie modifiée avec succès",
      });
      
      setIsEditDialogOpen(false);
      setSelectedCategory(null);
      setFormData({ nom: "", description: "" });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier la catégorie",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (categoryId: string, categoryName: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${categoryName}" ?`)) return;
    
    try {
      const response = await fetch(`/api/categories/${categoryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }
      
      setCategories(prev => prev.filter(cat => cat.id !== categoryId));
      
      toast({
        title: "Succès",
        description: "Catégorie supprimée avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la catégorie",
        variant: "destructive",
      });
    }
  };

  const getProductCount = (category: CategoryWithProducts) => {
    return category.produits?.length || 0;
  };

  const columns = [
    {
      key: "nom" as const,
      header: "Nom",
      render: (item: CategoryWithProducts) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FolderTree className="h-4 w-4" />
          </div>
          <span className="font-medium">{item.nom}</span>
        </div>
      ),
    },
    {
      key: "description" as const,
      header: "Description",
      render: (item: CategoryWithProducts) => (
        <span className="text-muted-foreground">{item.description || "-"}</span>
      ),
    },
    // {
    //   key: "produits" as const,
    //   header: "Produits",
    //   render: (item: CategoryWithProducts) => (
    //     <Badge variant="secondary">{getProductCount(item)} produits</Badge>
    //   ),
    // },
    {
      key: "createdAt" as const,
      header: "Date création",
      render: (item: CategoryWithProducts) => (
        <span className="text-muted-foreground">{formatDate(new Date (item.createdAt))}</span>
      ),
    },
    {
      key: "actions" as const,
      header: "Actions",
      render: (item: CategoryWithProducts) => (
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
          <Header title="Catégories" subtitle="Gestion des catégories de produits" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Chargement des catégories...</span>
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
        <Header title="Catégories" subtitle="Gestion des catégories de produits" />
        <main className="p-4 md:p-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                Liste des Catégories
              </CardTitle>
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Nouvelle Catégorie
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Ajouter une Catégorie</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input 
                        id="nom" 
                        placeholder="Nom de la catégorie" 
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea 
                        id="description" 
                        placeholder="Description de la catégorie"
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
                data={categories}
                columns={columns}
                searchPlaceholder="Rechercher une catégorie..."
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
            <DialogTitle>Modifier la Catégorie</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom *</Label>
              <Input 
                id="nom" 
                placeholder="Nom de la catégorie" 
                value={formData.nom}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea 
                id="description" 
                placeholder="Description de la catégorie"
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