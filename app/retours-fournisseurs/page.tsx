"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, RotateCcw, Eye, Edit, Trash2, Loader2, X, PlusCircle, ArrowLeft, Package, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RetourViewModal } from "@/components/retours-fournisseurs/RetourViewModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixAchat: number;
  quantiteStock: number;
}

interface LigneBonEntree {
  id: string;
  productId: string;
  quantite: number;
  quantiteRetournee: number;
  quantiteDisponible: number;
  prixUnitaireHT: number;
  product?: Product;
}

interface BonEntree {
  id: string;
  numero: string;
  date: string;
  totalHT: number;
  totalTTC: number;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  lignes: LigneBonEntree[];
}

interface LigneRetour {
  productId: string;
  product?: Product;
  quantite: number;
  quantiteMax: number;
  prixUnitaire: number;
  ligneBEId?: string;
  ligneBonEntreeId?: string; 
  ancienneQuantiteBE: number;
  nouvelleQuantiteBE: number;
  totalLigne: number;
}

interface RetourFournisseur {
  id: string;
  numero: string;
  date: string;
  fournisseurId: string;
  fournisseur?: Fournisseur;
  bonEntreeId: string;
  bonEntree?: BonEntree;
  montant: number;
  motif: string;
  lignes: LigneRetour[];
  createdAt: string;
}

export default function RetoursFournisseursPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const [retours, setRetours] = useState<RetourFournisseur[]>([]);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [bonsEntree, setBonsEntree] = useState<BonEntree[]>([]);
  const [selectedBE, setSelectedBE] = useState<BonEntree | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Formulaire
  const [selectedFournisseurId, setSelectedFournisseurId] = useState("");
  const [selectedBEId, setSelectedBEId] = useState("");
  const [motif, setMotif] = useState("");
  const [lignes, setLignes] = useState<LigneRetour[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRetour, setDeletingRetour] = useState<RetourFournisseur | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [selectedRetourId, setSelectedRetourId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRetour, setEditingRetour] = useState<RetourFournisseur | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRetours();
    fetchFournisseurs();
  }, [currentPage]);

  useEffect(() => {
    if (selectedFournisseurId) {
      fetchBonsEntreeByFournisseur(selectedFournisseurId);
    } else {
      setBonsEntree([]);
      setSelectedBEId("");
      setSelectedBE(null);
    }
  }, [selectedFournisseurId]);

  useEffect(() => {
    if (selectedBEId && bonsEntree.length > 0) {
      const be = bonsEntree.find(b => b.id === selectedBEId);
      setSelectedBE(be || null);
      if (be) {
        initializeLignesFromBE(be);
      }
    } else {
      setSelectedBE(null);
      setLignes([]);
    }
  }, [selectedBEId, bonsEntree]);

  const fetchRetours = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/retours-fournisseurs?page=${currentPage}&limit=10`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setRetours(data.data || []);
    } catch (error) {
      console.error("Error fetching retours:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les retours fournisseurs",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFournisseurs = async () => {
    try {
      const response = await fetch("/api/fournisseurs?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setFournisseurs(data.data || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
    }
  };

  const fetchBonsEntreeByFournisseur = async (fournisseurId: string) => {
    if (!fournisseurId) {
      setBonsEntree([]);
      return;
    }

    try {
      const response = await fetch(`/api/bons-entree/retour?fournisseurId=${fournisseurId}&limit=100`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();

      const besAvecStock = data.data.filter((be: BonEntree) => {
        if (!be.lignes || be.lignes.length === 0) return false;

        return be.lignes.some((ligne: LigneBonEntree) => {
          const quantiteRetournee = ligne.quantiteRetournee || 0;
          return (ligne.quantite - quantiteRetournee) > 0;
        });
      });

      setBonsEntree(besAvecStock);
    } catch (error) {
      console.error("Error fetching BE:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les bons d'entrée",
        variant: "destructive",
      });
    }
  };

  const initializeLignesFromBE = (be: BonEntree) => {
    const nouvellesLignes = be.lignes.map(ligne => {
      const quantiteRetournee = ligne.quantiteRetournee || 0;
      const quantiteDisponible = ligne.quantite - quantiteRetournee;

      return {
        productId: ligne.productId,
        product: ligne.product,
        quantite: 0,
        quantiteMax: quantiteDisponible,
        prixUnitaire: ligne.prixUnitaireHT,
        ligneBEId: ligne.id,
        ancienneQuantiteBE: ligne.quantite,
        nouvelleQuantiteBE: ligne.quantite,
        totalLigne: 0,
      };
    }).filter(l => l.quantiteMax > 0);

    setLignes(nouvellesLignes);
  };

  const updateLigneQuantite = (index: number, quantite: number) => {
    const newLignes = [...lignes];
    const quantiteMax = newLignes[index].quantiteMax;

    if (quantite > quantiteMax) {
      toast({
        title: "Attention",
        description: `La quantité retournée ne peut pas dépasser ${quantiteMax}`,
        variant: "destructive",
      });
      return;
    }

    const nouvelleQuantiteBE = newLignes[index].ancienneQuantiteBE - quantite;

    newLignes[index] = {
      ...newLignes[index],
      quantite,
      nouvelleQuantiteBE,
      totalLigne: quantite * newLignes[index].prixUnitaire,
    };
    setLignes(newLignes);
  };

  const calculateTotal = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFournisseurId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fournisseur", variant: "destructive" });
      return;
    }

    if (!selectedBEId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un bon d'entrée", variant: "destructive" });
      return;
    }

    const lignesValides = lignes.filter(l => l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Sélectionnez au moins un produit à retourner", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/retours-fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fournisseurId: selectedFournisseurId,
          bonEntreeId: selectedBEId,
          motif: motif,
          produits: lignesValides.map(l => ({
            productId: l.productId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
          })),
          montant: calculateTotal(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Retour fournisseur enregistré avec succès" });
      resetForm();
      fetchRetours();
    } catch (error) {
      console.error("Error creating retour:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible d'enregistrer le retour", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingRetour) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/retours-fournisseurs/${deletingRetour.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Erreur",
          description: data.error || "Erreur lors de la suppression",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Succès",
        description: "Retour fournisseur supprimé avec succès",
      });

      setDeleteDialogOpen(false);
      setDeletingRetour(null);
      fetchRetours();
    } catch (error) {
      console.error("Error deleting retour:", error);
      toast({
        title: "Erreur",
        description: "Une erreur inattendue s'est produite",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setSelectedFournisseurId("");
    setSelectedBEId("");
    setSelectedBE(null);
    setMotif("");
    setLignes([]);
    setShowForm(false);
  };

  const columns = [
    {
      key: "numero",
      header: "N° Retour",
      render: (item: RetourFournisseur) => (
        <span className="font-mono text-sm font-medium">{item.numero}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (item: RetourFournisseur) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span>
      ),
    },
    {
      key: "fournisseur.nom",
      header: "Fournisseur",
      render: (item: RetourFournisseur) => (
        <span className="font-medium">{item.fournisseur?.nom || "N/A"}</span>
      ),
    },
    {
      key: "bonEntree",
      header: "BE associé",
      render: (item: RetourFournisseur) => (
        <span className="font-mono text-sm">{item.bonEntree?.numero || "-"}</span>
      ),
    },
    {
      key: "lignes",
      header: "Produits retournés",
      render: (item: RetourFournisseur) => (
        <div className="flex flex-wrap gap-1">
          {item.lignes.map((ligne, idx) => (
            <Badge key={idx} variant="secondary" className="text-xs">
              {ligne.product?.designation || ligne.productId} x{ligne.quantite}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "montant",
      header: "Montant",
      render: (item: RetourFournisseur) => (
        <span className="font-semibold text-green-600">{formatCurrency(item.montant)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: RetourFournisseur) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setSelectedRetourId(item.id);
              setViewModalOpen(true);
            }}
            title="Voir détails"
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setEditingRetour(item);
              setIsEditing(true);
              // Pré-remplir le formulaire avec les données existantes
              setSelectedFournisseurId(item.fournisseurId);
              setSelectedBEId(item.bonEntreeId);
              setMotif(item.motif || "");
              // Charger les lignes existantes
              const lignesRetour = item.lignes.map(l => ({
                productId: l.productId,
                product: l.product,
                quantite: l.quantite,
                quantiteMax: l.quantite, // On permet de modifier la quantité
                prixUnitaire: l.prixUnitaire,
                ligneBEId: l?.ligneBonEntreeId,
                ancienneQuantiteBE: l.quantite,
                nouvelleQuantiteBE: 0,
                totalLigne: l.quantite * l.prixUnitaire,
              }));
              setLignes(lignesRetour);
              setShowForm(true);
            }}
            title="Modifier"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => {
              setDeletingRetour(item);
              setDeleteDialogOpen(true);
            }}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalRetours = retours.reduce((sum, r) => sum + r.montant, 0);

  if (isLoading && !showForm) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Retours Fournisseurs" subtitle="Gestion des retours aux fournisseurs" />
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
        <Header title="Retours Fournisseurs" subtitle="Gestion des retours aux fournisseurs" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {!showForm ? (
              <>
                {/* Retours Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-primary" />
                      Liste des Retours Fournisseurs
                    </CardTitle>
                    <Button onClick={() => setShowForm(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouveau Retour
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <DataTable
                      data={retours}
                      columns={columns}
                      searchPlaceholder="Rechercher un retour..."
                      searchKey="numero"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <>
                {/* Bouton retour */}
                <div className="flex items-center justify-between">
                  <Button variant="outline" onClick={resetForm}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la liste
                  </Button>
                </div>

                {/* Formulaire de retour */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-primary" />
                      Nouveau Retour Fournisseur
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Le retour va réduire les quantités du bon d'entrée et ajuster automatiquement le stock.
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Sélection du fournisseur */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="fournisseur">Fournisseur *</Label>
                          <Select
                            value={selectedFournisseurId}
                            onValueChange={(value) => {
                              setSelectedFournisseurId(value);
                              setSelectedBEId("");
                              setSelectedBE(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un fournisseur" />
                            </SelectTrigger>
                            <SelectContent>
                              {fournisseurs.map((four) => (
                                <SelectItem key={four.id} value={four.id}>
                                  {four.nom} - {four.telephone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sélection du BE */}
                        <div className="space-y-2">
                          <Label htmlFor="bonEntree">Bon d'Entrée *</Label>
                          <Select
                            value={selectedBEId}
                            onValueChange={setSelectedBEId}
                            disabled={!selectedFournisseurId || bonsEntree.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedFournisseurId
                                  ? "Sélectionnez d'abord un fournisseur"
                                  : bonsEntree.length === 0
                                    ? "Aucun BE disponible pour ce fournisseur"
                                    : "Sélectionner un BE"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {bonsEntree.map((be) => (
                                <SelectItem key={be.id} value={be.id}>
                                  {be.numero} - {formatCurrency(be.totalTTC)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Informations du BE sélectionné */}
                      {selectedBE && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h3 className="font-semibold mb-2">Détails du Bon d'Entrée</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><span className="font-medium">N° BE:</span> {selectedBE.numero}</p>
                              <p><span className="font-medium">Date:</span> {formatDate(new Date(selectedBE.date))}</p>
                            </div>
                            <div>
                              <p><span className="font-medium">Total HT:</span> {formatCurrency(selectedBE.totalHT)}</p>
                              <p><span className="font-medium">Total TTC:</span> {formatCurrency(selectedBE.totalTTC)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Produits à retourner */}
                      {lignes.length > 0 && (
                        <div className="space-y-3">
                          <Label>Produits à retourner *</Label>
                          <div className="rounded-lg border border-border overflow-hidden">
                            <table className="w-full">
                              <thead className="bg-muted">
                                <tr>
                                  <th className="text-left p-3 text-sm font-medium">Produit</th>
                                  <th className="text-center p-3 text-sm font-medium">Quantité actuelle</th>
                                  <th className="text-center p-3 text-sm font-medium">Quantité retournée</th>
                                  <th className="text-center p-3 text-sm font-medium">Nouvelle quantité</th>
                                  <th className="text-right p-3 text-sm font-medium">Prix unitaire (HT)</th>
                                  <th className="text-right p-3 text-sm font-medium">Total retour</th>
                                </tr>
                              </thead>
                              <tbody>
                                {lignes.map((ligne, index) => (
                                  <tr key={ligne.productId} className="border-t">
                                    <td className="p-3">
                                      <div>
                                        <p className="font-medium">{ligne.product?.designation}</p>
                                        <p className="text-xs text-muted-foreground">{ligne.product?.reference}</p>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className="font-medium">{ligne.ancienneQuantiteBE}</span>
                                    </td>
                                    <td className="p-3">
                                      <Input
                                        type="number"
                                        value={ligne.quantite}
                                        onChange={(e) => updateLigneQuantite(index, parseInt(e.target.value) || 0)}
                                        min="0"
                                        max={ligne.quantiteMax}
                                        className="w-24 text-center"
                                      />
                                      <p className="text-xs text-muted-foreground mt-1 text-center">
                                        Max: {ligne.quantiteMax}
                                      </p>
                                    </td>
                                    <td className="p-3 text-center">
                                      <span className={`font-medium ${ligne.nouvelleQuantiteBE === 0 ? 'text-red-600' : ''}`}>
                                        {ligne.nouvelleQuantiteBE}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      {formatCurrency(ligne.prixUnitaire)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-green-600">
                                      {formatCurrency(ligne.totalLigne)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-muted/50 border-t">
                                <tr>
                                  <td colSpan={5} className="p-3 text-right font-bold">
                                    Total à déduire (HT):
                                  </td>
                                  <td className="p-3 text-right font-bold text-green-600 text-lg">
                                    {formatCurrency(calculateTotal())}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={5} className="p-3 text-right text-sm text-muted-foreground">
                                    Nouveau montant du BE après retour (HT) :
                                  </td>
                                  <td className="p-3 text-right font-medium">
                                    {selectedBE && formatCurrency(selectedBE.totalHT - calculateTotal())}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Motif du retour */}
                      <div className="space-y-2">
                        <Label htmlFor="motif">Motif du retour</Label>
                        <Textarea
                          id="motif"
                          placeholder="Raison du retour (produit défectueux, erreur de livraison, etc.)"
                          value={motif}
                          onChange={(e) => setMotif(e.target.value)}
                          rows={3}
                        />
                      </div>

                      {/* Boutons d'action */}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Annuler
                        </Button>
                        <Button
                          type="submit"
                          disabled={isSubmitting || lignes.filter(l => l.quantite > 0).length === 0}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Enregistrement...</>
                          ) : (
                            "Enregistrer le retour"
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}
            <RetourViewModal
              open={viewModalOpen}
              onOpenChange={setViewModalOpen}
              retourId={selectedRetourId}
            />

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le retour fournisseur</AlertDialogTitle>
                  <AlertDialogDescription>
                    Êtes-vous sûr de vouloir supprimer le retour{" "}
                    <strong>{deletingRetour?.numero}</strong> ?
                    <br />
                    <span className="text-destructive text-sm mt-2 block">
                      ⚠️ Cette action est irréversible et va restaurer les quantités
                      originales dans le bon d'entrée et le stock.
                    </span>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Suppression...
                      </>
                    ) : (
                      "Supprimer"
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </main>
      </div>
    </div>
  );
}