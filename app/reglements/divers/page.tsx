"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  typeReglementLabels,
  categorieDepenseLabels,
  CategorieDepense,
  TypeReglement,
} from "@/lib/types";
import {
  Plus,
  Receipt,
  Eye,
  Fuel,
  Zap,
  Droplets,
  Phone,
  Wrench,
  FileText,
  HelpCircle,
  Trash2,
  Image as ImageIcon,
  Loader2,
  Filter,
  RefreshCw,
  Calendar,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface Depense {
  id: string;
  date: string;
  libelle: string;
  categorie: string;
  montant: number;
  modeReglement: string;
  reference: string | null;
  justificatif: string | null;
  imageUrl: string | null;
  chauffeur: {
    id: string;
    nom: string;
    user: { nom: string };
  } | null;
}

interface Chauffeur {
  id: string;
  nom: string;
  user: { nom: string };
}

export default function ReglementsDiversPage() {
  const { sidebarClasses } = useSidebar();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Filtres
  const [filterChauffeurId, setFilterChauffeurId] = useState<string>("");
  const [filterCategorie, setFilterCategorie] = useState<string>("");
  const [filterDateDebut, setFilterDateDebut] = useState<string>("");
  const [filterDateFin, setFilterDateFin] = useState<string>("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [libelleAutre, setLibelleAutre] = useState("");
  const [showChampLibelle, setShowChampLibelle] = useState(false);
  // Formulaire
  const [formData, setFormData] = useState({
    libelle: "",
    categorie: "",
    montant: "",
    modeReglement: "",
    reference: "",
    justificatif: "",
    date: new Date().toISOString().split('T')[0],
    chauffeurId: "",
  });

  const isAdmin = session?.user?.role === 'ADMIN';

  const fetchDepenses = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = "/api/reglements-divers";
      const params = new URLSearchParams();
      if (filterChauffeurId) params.append('chauffeurId', filterChauffeurId);
      if (filterCategorie) params.append('categorie', filterCategorie);
      if (filterDateDebut) params.append('dateDebut', filterDateDebut);
      if (filterDateFin) params.append('dateFin', filterDateFin);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url);
      const data = await response.json();
      setDepenses(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching depenses:", error);
      toast({ title: "Erreur", description: "Impossible de charger les dépenses", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [filterChauffeurId, filterCategorie, filterDateDebut, filterDateFin, toast]);

  const fetchChauffeurs = async () => {
    try {
      const response = await fetch("/api/chauffeurs?limit=100");
      const data = await response.json();
      setChauffeurs(data.data || []);
    } catch (error) {
      console.error("Error fetching chauffeurs:", error);
    }
  };

  useEffect(() => {
    fetchDepenses();
    if (isAdmin) {
      fetchChauffeurs();
    }
  }, [fetchDepenses, isAdmin]);
  useEffect(() => {
    if (formData.categorie === "AUTRE") {
      setShowChampLibelle(true);
      setFormData(prev => ({ ...prev, modeReglement: "ESPECE" }));
    } else {
      setShowChampLibelle(false);
      setLibelleAutre("");
    }
  }, [formData.categorie]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();

      // Déterminer le libellé
      let libelleFinal = "";
      if (formData.categorie === "AUTRE") {
        libelleFinal = libelleAutre;
      } else {
        // Libellé automatique pour les catégories normales
        libelleFinal = `${categorieDepenseLabels[formData.categorie as CategorieDepense] || formData.categorie}`;
      }

      formDataToSend.append('libelle', libelleFinal);
      formDataToSend.append('categorie', formData.categorie);
      formDataToSend.append('montant', formData.montant);
      formDataToSend.append('modeReglement', "ESPECE"); // Toujours ESPECE
      formDataToSend.append('reference', formData.reference);
      formDataToSend.append('justificatif', formData.justificatif);
      formDataToSend.append('date', formData.date);

      if (isAdmin && formData.chauffeurId) {
        formDataToSend.append('chauffeurId', formData.chauffeurId);
      }
      if (selectedFile) {
        formDataToSend.append('file', selectedFile);
      }

      const response = await fetch("/api/reglements-divers", {
        method: "POST",
        body: formDataToSend,
      });

      if (!response.ok) throw new Error("Erreur lors de la création");

      toast({ title: "Succès", description: "Dépense enregistrée avec succès" });
      setIsDialogOpen(false);
      resetForm();
      fetchDepenses();
    } catch (error) {
      console.error("Error creating depense:", error);
      toast({ title: "Erreur", description: "Impossible d'enregistrer la dépense", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) return;

    try {
      const response = await fetch(`/api/reglements-divers?id=${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Erreur lors de la suppression");
      toast({ title: "Succès", description: "Dépense supprimée" });
      fetchDepenses();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setFormData({
      libelle: "", // Gardé mais pas utilisé pour les catégories normales
      categorie: "",
      montant: "",
      modeReglement: "ESPECE", // Toujours ESPECE
      reference: "",
      justificatif: "",
      date: new Date().toISOString().split('T')[0],
      chauffeurId: "",
    });
    setSelectedFile(null);
    setPreviewUrl(null);
    setLibelleAutre("");
    setShowChampLibelle(false);
  };

  const resetFilters = () => {
    setFilterChauffeurId("");
    setFilterCategorie("");
    setFilterDateDebut("");
    setFilterDateFin("");
  };

  const getCategorieIcon = (categorie: string) => {
    switch (categorie) {
      case "ESSENCE": return <Fuel className="h-4 w-4" />;
      case "ELECTRICITE": return <Zap className="h-4 w-4" />;
      case "EAU": return <Droplets className="h-4 w-4" />;
      case "TELECOM": return <Phone className="h-4 w-4" />;
      case "REPARATION": return <Wrench className="h-4 w-4" />;
      case "FOURNITURE": return <FileText className="h-4 w-4" />;
      default: return <HelpCircle className="h-4 w-4" />;
    }
  };

  const getCategorieColor = (categorie: string) => {
    switch (categorie) {
      case "ESSENCE": return "bg-orange-500/10 text-orange-600";
      case "ELECTRICITE": return "bg-yellow-500/10 text-yellow-600";
      case "EAU": return "bg-blue-500/10 text-blue-600";
      case "TELECOM": return "bg-purple-500/10 text-purple-600";
      case "REPARATION": return "bg-red-500/10 text-red-600";
      case "FOURNITURE": return "bg-green-500/10 text-green-600";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  const columns = [
    {
      key: "date",
      header: "Date",
      render: (item: Depense) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span>
      ),
    },
    {
      key: "libelle",
      header: "Libellé",
      render: (item: Depense) => (
        <span className="font-medium">{item.libelle}</span>
      ),
    },
    {
      key: "categorie",
      header: "Catégorie",
      render: (item: Depense) => (
        <Badge variant="secondary" className={getCategorieColor(item.categorie)}>
          <span className="mr-1">{getCategorieIcon(item.categorie)}</span>
          {categorieDepenseLabels[item.categorie as CategorieDepense]}
        </Badge>
      ),
    },
    {
      key: "modeReglement",
      header: "Mode",
      render: (item: Depense) => (
        <Badge variant="outline">{typeReglementLabels[item.modeReglement as TypeReglement]}</Badge>
      ),
    },
    {
      key: "reference",
      header: "Référence",
      render: (item: Depense) => (
        <span className="font-mono text-sm">{item.reference || "-"}</span>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      render: (item: Depense) => (
        <span className="font-semibold text-destructive">{formatCurrency(item.montant)}</span>
      ),
    },
    {
      key: "image",
      header: "Justificatif",
      render: (item: Depense) => (
        item.imageUrl ? (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ImageIcon className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Justificatif de la dépense</DialogTitle>
              </DialogHeader>
              <div className="flex justify-center">
                <img src={item.imageUrl} alt="Justificatif" className="w-full rounded-lg object-contain max-h-[70vh]" />
              </div>
            </DialogContent>
          </Dialog>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: Depense) => (
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(item.id)}>
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      ),
    },
  ];

  const totalDepenses = depenses.reduce((sum, d) => sum + d.montant, 0);

  // Group by category
  const depensesByCategorie = Object.values(CategorieDepense)
    .map((cat) => ({
      categorie: cat,
      total: depenses.filter((d) => d.categorie === cat).reduce((sum, d) => sum + d.montant, 0),
      count: depenses.filter((d) => d.categorie === cat).length,
    }))
    .filter((d) => d.count > 0);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Dépenses Diverses" subtitle="Gestion des dépenses diverses" />
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
        <Header title="Dépenses Diverses" subtitle="Gestion des dépenses diverses" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid gap-4 lg:grid-cols-4">
              <Card className="border-destructive/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Dépenses
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(totalDepenses)}</div>
                  <p className="text-sm text-muted-foreground">{depenses.length} opérations</p>
                </CardContent>
              </Card>
              {depensesByCategorie.slice(0, 3).map((d) => (
                <Card key={d.categorie}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      {getCategorieIcon(d.categorie)}
                      {categorieDepenseLabels[d.categorie]}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(d.total)}</div>
                    <p className="text-sm text-muted-foreground">{d.count} opération(s)</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Barre d'actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex gap-2">
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="mr-2 h-4 w-4" />
                          Nouvelle Dépense
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Enregistrer une Dépense</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          {/* Champ Libellé - UNIQUEMENT pour la catégorie AUTRE */}
                          {showChampLibelle && (
                            <div className="space-y-2">
                              <Label htmlFor="libelleAutre">
                                Libellé *
                                <span className="text-xs text-muted-foreground ml-2">
                                  (Décrivez la dépense)
                                </span>
                              </Label>
                              <Input
                                id="libelleAutre"
                                value={libelleAutre}
                                onChange={(e) => setLibelleAutre(e.target.value)}
                                placeholder="Ex: Achat de fournitures de bureau, Réparation imprimante, etc."
                                required={formData.categorie === "AUTRE"}
                              />
                              <p className="text-xs text-muted-foreground">
                                Veuillez décrire précisément la dépense
                              </p>
                            </div>
                          )}

                          {/* Champ libellé caché pour les autres catégories - valeur par défaut */}
                          {!showChampLibelle && (
                            <input type="hidden" name="libelle" value={`Dépense ${categorieDepenseLabels[formData.categorie as CategorieDepense] || formData.categorie}`} />
                          )}
                          <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="categorie">Catégorie *</Label>
                              <Select value={formData.categorie} onValueChange={(value) => setFormData({ ...formData, categorie: value })}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ESSENCE">Essence</SelectItem>
                                  <SelectItem value="ELECTRICITE">Électricité</SelectItem>
                                  <SelectItem value="EAU">Eau</SelectItem>
                                  <SelectItem value="TELECOM">Télécom</SelectItem>
                                  <SelectItem value="REPARATION">Réparation</SelectItem>
                                  <SelectItem value="FOURNITURE">Fourniture</SelectItem>
                                  <SelectItem value="AUTRE">Autre</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="montant">Montant *</Label>
                              <Input
                                id="montant"
                                type="number"
                                step="0.001"
                                value={formData.montant}
                                onChange={(e) => setFormData({ ...formData, montant: e.target.value })}
                                placeholder="0.000"
                                required
                              />
                            </div>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {/* Mode de règlement - toujours ESPECE */}
                            <div className="space-y-2" style={{display: 'none'}}>
                              <Label htmlFor="modeReglement">Mode de règlement *</Label>
                              <Select
                                value="ESPECE"
                                onValueChange={() => { }} // Ne rien faire
                                disabled={true}
                              >
                                <SelectTrigger className="bg-gray-100 cursor-not-allowed">
                                  <SelectValue placeholder="Espèce" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ESPECE">Espèce</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2" style={{display: 'none'}}>
                              <Label htmlFor="date">Date</Label>
                              <Input
                                id="date"
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Fichier justificatif (optionnel)</Label>
                            <Input type="file" onChange={handleFileChange} accept="image/*,.pdf" />
                            {previewUrl && (
                              <div className="mt-2">
                                <img src={previewUrl} alt="Aperçu" className="h-32 w-auto rounded-lg object-cover" />
                              </div>
                            )}
                          </div>

                          {isAdmin && (
                            <div className="space-y-2" style={{display: 'none'}}>
                              <Label htmlFor="chauffeurId">Chauffeur (optionnel)</Label>
                              <Select
                                value={formData.chauffeurId || "none"}
                                onValueChange={(value) => setFormData({ ...formData, chauffeurId: value === "none" ? "" : value })}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un chauffeur" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Aucun chauffeur</SelectItem>
                                  {chauffeurs.map((chauffeur) => (
                                    <SelectItem key={chauffeur.id} value={chauffeur.id}>
                                      {chauffeur.nom}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              Enregistrer
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>

                    {isAdmin && (
                      <Button variant="outline" onClick={() => setIsFilterOpen(!isFilterOpen)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Filtres
                      </Button>
                    )}

                    <Button variant="ghost" onClick={fetchDepenses}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Filtres pour admin */}
                {isFilterOpen && isAdmin && (
                  <div className="mt-4 p-4 border rounded-lg grid gap-4 sm:grid-cols-4">
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
                      <Label className="text-xs">Catégorie</Label>

                      <Select value={filterCategorie || "all"} onValueChange={(value) => setFilterCategorie(value === "all" ? "" : value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes</SelectItem>
                          <SelectItem value="ESSENCE">Essence</SelectItem>
                          <SelectItem value="ELECTRICITE">Électricité</SelectItem>
                          <SelectItem value="EAU">Eau</SelectItem>
                          <SelectItem value="TELECOM">Télécom</SelectItem>
                          <SelectItem value="REPARATION">Réparation</SelectItem>
                          <SelectItem value="FOURNITURE">Fourniture</SelectItem>
                          <SelectItem value="AUTRE">Autre</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Date du</Label>
                      <Input type="date" value={filterDateDebut} onChange={(e) => setFilterDateDebut(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Date au</Label>
                      <Input type="date" value={filterDateFin} onChange={(e) => setFilterDateFin(e.target.value)} />
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

            {/* Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-primary" />
                  Liste des Dépenses Diverses
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={depenses}
                  columns={columns}
                  searchPlaceholder="Rechercher..."
                  searchKey="libelle"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}