"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, ImagePlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";

interface Category {
  id: string;
  nom: string;
}

export default function CreerProduitPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [productImage, setProductImage] = useState<string>("");

  const [formData, setFormData] = useState({
    reference: "",
    code: "",
    designation: "",
    categoryId: "",
    prixAchat: 0,
    prixAchatHT: 0,
    prixVente: 0,
    tva: 19,
    marge: 0,
    seuilAlerte: 5,
    plafondRemise: 0,
    imageUrl: "",
  });

  useEffect(() => {
    setIsMounted(true);
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      setProductImage(data.url);
      setFormData(prev => ({ ...prev, imageUrl: data.url }));
      toast({ title: "Succès", description: "Image téléchargée avec succès" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setProductImage("");
    setFormData(prev => ({ ...prev, imageUrl: "" }));
  };

  const handleHTChange = (value: number) => {
    const tva = formData.tva || 0;
    const ttc = value * (1 + tva / 100);

    setFormData(prev => ({
      ...prev,
      prixAchatHT: value,
      prixAchat: Number(ttc.toFixed(3)),
    }));
  };

  const handleTTCChange = (value: number) => {
    const tva = formData.tva || 0;
    const ht = tva > 0 ? value / (1 + tva / 100) : value;

    setFormData(prev => ({
      ...prev,
      prixAchat: value,
      prixAchatHT: Number(ht.toFixed(3)),
    }));
  };

  const handleTVAChange = (value: number) => {
    const ht = formData.prixAchatHT || 0;
    const ttc = ht * (1 + value / 100);

    setFormData(prev => ({
      ...prev,
      tva: value,
      prixAchat: Number(ttc.toFixed(3)),
    }));
  };

  const handleMargeChange = (value: number) => {
    const pa = formData.prixAchat;
    const pv = pa * (1 + value / 100);

    setFormData(prev => ({
      ...prev,
      marge: value,
      prixVente: Number(pv.toFixed(3)),
    }));
  };

  const handlePrixVenteChange = (value: number) => {
    const pa = formData.prixAchat;
    const marge = pa > 0 ? ((value - pa) / pa) * 100 : 0;

    setFormData(prev => ({
      ...prev,
      prixVente: value,
      marge: Number(marge.toFixed(2)),
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.reference || !formData.designation || !formData.categoryId) {
      toast({ 
        title: "Erreur", 
        description: "Veuillez remplir tous les champs obligatoires", 
        variant: "destructive" 
      });
      return;
    }

    if (formData.prixAchat <= 0) {
      toast({ 
        title: "Erreur", 
        description: "Le prix d'achat doit être supérieur à 0", 
        variant: "destructive" 
      });
      return;
    }

    if (formData.prixVente <= 0) {
      toast({ 
        title: "Erreur", 
        description: "Le prix de vente doit être supérieur à 0", 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Produit créé avec succès" });
      router.push('/produits');
    } catch (error) {
      console.error("Error creating product:", error);
      toast({ 
        title: "Erreur", 
        description: error instanceof Error ? error.message : "Impossible de créer le produit", 
        variant: "destructive" 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Nouveau Produit" subtitle="Créer un nouveau produit" />
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <Link href="/produits">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <Card>
              <CardHeader>
                <CardTitle>Informations du produit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Référence *</Label>
                    <Input
                      name="reference"
                      placeholder="REF-001"
                      value={formData.reference}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Code
                      <span className="text-muted-foreground ml-1 text-xs">
                        (laissez vide pour auto-génération)
                      </span>
                    </Label>
                    <Input
                      name="code"
                      placeholder="Auto-généré (ex: 2026-0001)"
                      value={formData.code}
                      onChange={handleInputChange}
                      className={!formData.code ? "border-green-300 focus:border-green-500" : ""}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Désignation *</Label>
                    <Input
                      name="designation"
                      placeholder="Nom du produit"
                      value={formData.designation}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prix d'achat (HT) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={formData.prixAchatHT === 0 ? "" : formData.prixAchatHT}
                      onChange={(e) => handleHTChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>TVA (%)</Label>
                    <select
                      value={formData.tva}
                      onChange={(e) => handleTVAChange(parseFloat(e.target.value) || 0)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value={19}>19%</option>
                      <option value={13}>13%</option>
                      <option value={7}>7%</option>
                      <option value={0}>0%</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label>Prix d'achat (TTC) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={formData.prixAchat === 0 ? "" : formData.prixAchat}
                      onChange={(e) => handleTTCChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Marge (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.marge === 0 ? "" : formData.marge}
                      onChange={(e) => handleMargeChange(parseFloat(e.target.value) || 0)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Prix de vente (TTC) *</Label>
                    <Input
                      type="number"
                      step="0.001"
                      placeholder="0.000"
                      value={formData.prixVente === 0 ? "" : formData.prixVente}
                      onChange={(e) => handlePrixVenteChange(parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Seuil d'alerte</Label>
                    <Input
                      type="number"
                      placeholder="5"
                      value={formData.seuilAlerte === 5 ? "" : formData.seuilAlerte}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        seuilAlerte: parseInt(e.target.value) || 5 
                      }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Quantité minimale avant alerte de stock
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Plafond de remise (DT)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="0"
                      value={formData.plafondRemise === 0 ? "" : formData.plafondRemise}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        plafondRemise: parseFloat(e.target.value) || 0 
                      }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Catégorie *</Label>
                    <Select value={formData.categoryId} onValueChange={(v) => setFormData(prev => ({ ...prev, categoryId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner une catégorie" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <Label>Image du produit</Label>
                    <div className="flex items-center gap-4">
                      {productImage ? (
                        <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                          <Image
                            src={productImage}
                            alt="Aperçu produit"
                            fill
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={removeImage}
                            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
                          <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Ajouter</p>
                          </div>
                          <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleImageSelect}
                            disabled={isUploading}
                          />
                        </label>
                      )}
                      {isUploading && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Upload en cours...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-2 mt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/products')}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Créer le produit
                  </>
                )}
              </Button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}