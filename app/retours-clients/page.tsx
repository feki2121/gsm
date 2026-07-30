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
import { Plus, RotateCcw, Eye, Trash2, Loader2, X, PlusCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  quantiteStock: number;
}

interface LigneBL {
  id: string;
  productId: string;
  quantite: number;
  quantiteRetournee: number;
  quantiteDisponible: number;
  product?: Product;
}

interface BonLivraison {
  id: string;
  numero: string;
  date: string;
  montantTotal: number;
  montantPaye: number;
  montantRestant: number;
  clientId: string;
  client?: Client;
  lignes: LigneBL[];
}

interface LigneRetour {
  productId: string;
  product?: Product;
  quantite: number;
  quantiteMax: number;
  prixUnitaire: number;
  ligneBLId?: string;
  ancienneQuantiteBL: number;
  nouvelleQuantiteBL: number;
  totalLigne: number;
}

interface RetourClient {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client?: Client;
  bonLivraisonId: string;
  bonLivraison?: BonLivraison;
  montant: number;
  lignes: LigneRetour[];
  createdAt: string;
}

export default function RetoursClientsPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const [retours, setRetours] = useState<RetourClient[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [bonsLivraison, setBonsLivraison] = useState<BonLivraison[]>([]);
  const [selectedBL, setSelectedBL] = useState<BonLivraison | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Formulaire
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBLId, setSelectedBLId] = useState("");
  const [lignes, setLignes] = useState<LigneRetour[]>([]);
  const [showForm, setShowForm] = useState(false);
  
  const { toast } = useToast();

  useEffect(() => {
    fetchRetours();
    fetchClients();
  }, [currentPage]);

  useEffect(() => {
    if (selectedClientId) {
      fetchBonsLivraisonByClient(selectedClientId);
    } else {
      setBonsLivraison([]);
      setSelectedBLId("");
      setSelectedBL(null);
    }
  }, [selectedClientId]);

  useEffect(() => {
    if (selectedBLId && bonsLivraison.length > 0) {
      const bl = bonsLivraison.find(b => b.id === selectedBLId);
      setSelectedBL(bl || null);
      if (bl) {
        initializeLignesFromBL(bl);
      }
    } else {
      setSelectedBL(null);
      setLignes([]);
    }
  }, [selectedBLId, bonsLivraison]);

  const fetchRetours = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/retours-clients?page=${currentPage}&limit=10`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setRetours(data.data || []);
    } catch (error) {
      console.error("Error fetching retours:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les retours clients",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

const fetchBonsLivraisonByClient = async (clientId: string) => {
  if (!clientId) {
    setBonsLivraison([]);
    return;
  }
  
  try {
    const response = await fetch(`/api/bon-livraisons/retour?clientId=${clientId}&limit=100`);
    if (!response.ok) throw new Error("Erreur lors du chargement");
    const data = await response.json();
    
    // Filtrer les BL qui ont encore des produits non entièrement retournés
    const blsAvecStock = data.data.filter((bl: BonLivraison) => {
      // Vérifier si le BL a des lignes avec des quantités disponibles
      if (!bl.lignes || bl.lignes.length === 0) return false;
      
      const aDuStock = bl.lignes.some((ligne: LigneBL) => {
        const quantiteRetournee = ligne.quantiteRetournee || 0;
        const quantiteDisponible = ligne.quantite - quantiteRetournee;
        return quantiteDisponible > 0;
      });
      
      return aDuStock;
    });
    
    setBonsLivraison(blsAvecStock);
  } catch (error) {
    console.error("Error fetching BL:", error);
    toast({
      title: "Erreur",
      description: "Impossible de charger les bons de livraison",
      variant: "destructive",
    });
  }
};

  const initializeLignesFromBL = (bl: BonLivraison) => {
    const nouvellesLignes = bl.lignes.map(ligne => {
      const quantiteRetournee = ligne.quantiteRetournee || 0;
      const quantiteDisponible = ligne.quantite - quantiteRetournee;
      
      return {
        productId: ligne.productId,
        product: ligne.product,
        quantite: 0,
        quantiteMax: quantiteDisponible,
        prixUnitaire: ligne.product?.prixVente || 0,
        ligneBLId: ligne.id,
        ancienneQuantiteBL: ligne.quantite,
        nouvelleQuantiteBL: ligne.quantite,
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
    
    const nouvelleQuantiteBL = newLignes[index].ancienneQuantiteBL - quantite;
    
    newLignes[index] = { 
      ...newLignes[index], 
      quantite,
      nouvelleQuantiteBL,
      totalLigne: quantite * newLignes[index].prixUnitaire,
    };
    setLignes(newLignes);
  };

  const calculateTotal = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    if (!selectedBLId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un bon de livraison", variant: "destructive" });
      return;
    }

    const lignesValides = lignes.filter(l => l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Sélectionnez au moins un produit à retourner", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/retours-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          bonLivraisonId: selectedBLId,
          lignes: lignesValides.map(l => ({
            productId: l.productId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire,
            ligneBLId: l.ligneBLId,
          })),
          montant: calculateTotal(),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Retour enregistré avec succès" });
      resetForm();
      fetchRetours();
    } catch (error) {
      console.error("Error creating retour:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible d'enregistrer le retour", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, numero: string) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le retour ${numero} ? Cette action est irréversible.`)) return;

    try {
      const response = await fetch(`/api/retours-clients/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast({ title: "Succès", description: "Retour supprimé avec succès" });
      fetchRetours();
    } catch (error) {
      console.error("Error deleting retour:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de supprimer le retour", variant: "destructive" });
    }
  };

  const resetForm = () => {
    setSelectedClientId("");
    setSelectedBLId("");
    setSelectedBL(null);
    setLignes([]);
    setShowForm(false);
  };

  const columns = [
    {
      key: "numero",
      header: "N° Retour",
      render: (item: RetourClient) => (
        <span className="font-mono text-sm font-medium">{item.numero}</span>
      ),
    },
    {
      key: "date",
      header: "Date",
      render: (item: RetourClient) => (
        <span className="text-muted-foreground">{formatDate(new Date(item.date))}</span>
      ),
    },
    {
      key: "client.nom",
      header: "Client",
      render: (item: RetourClient) => (
        <span className="font-medium">{item.client?.nom || "N/A"}</span>
      ),
    },
    {
      key: "bonLivraison",
      header: "BL associé",
      render: (item: RetourClient) => (
        <span className="font-mono text-sm">{item.bonLivraison?.numero || "-"}</span>
      ),
    },
    {
      key: "lignes",
      header: "Produits retournés",
      render: (item: RetourClient) => (
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
      render: (item: RetourClient) => (
        <span className="font-semibold text-orange-600">{formatCurrency(item.montant)}</span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (item: RetourClient) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:text-red-700"
            onClick={() => handleDelete(item.id, item.numero)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const totalRetours = retours.reduce((sum, r) => sum + r.montant, 0);
  const totalArticles = retours.reduce((sum, r) => sum + r.lignes.reduce((s, l) => s + l.quantite, 0), 0);

  if (isLoading && !showForm) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Retours Clients" subtitle="Gestion des retours clients" />
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
        <Header title="Retours Clients" subtitle="Gestion des retours clients" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {!showForm ? (
              <>
                {/* Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Retours
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{retours.length}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-orange-500/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Montant Total
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRetours)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Articles Retournés
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{totalArticles}</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Retours Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <RotateCcw className="h-5 w-5 text-primary" />
                      Liste des Retours Clients
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
                      Nouveau Retour Client
                    </CardTitle>
                    {/* <p className="text-sm text-muted-foreground">
                      Le retour va réduire les quantités du bon de livraison et ajuster automatiquement le stock.
                    </p> */}
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Sélection du client */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="client">Client *</Label>
                          <Select
                            value={selectedClientId}
                            onValueChange={(value) => {
                              setSelectedClientId(value);
                              setSelectedBLId("");
                              setSelectedBL(null);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Sélectionner un client" />
                            </SelectTrigger>
                            <SelectContent>
                              {clients.map((client) => (
                                <SelectItem key={client.id} value={client.id}>
                                  {client.nom} - {client.telephone}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Sélection du BL */}
                        <div className="space-y-2">
                          <Label htmlFor="bonLivraison">Bon de Livraison *</Label>
                          <Select
                            value={selectedBLId}
                            onValueChange={setSelectedBLId}
                            disabled={!selectedClientId || bonsLivraison.length === 0}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={
                                !selectedClientId 
                                  ? "Sélectionnez d'abord un client"
                                  : bonsLivraison.length === 0
                                    ? "Aucun BL disponible pour ce client"
                                    : "Sélectionner un BL"
                              } />
                            </SelectTrigger>
                            <SelectContent>
                              {bonsLivraison.map((bl) => (
                                <SelectItem key={bl.id} value={bl.id}>
                                  {bl.numero} - {formatCurrency(bl.montantTotal)} - Reste: {formatCurrency(bl.montantRestant)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Informations du BL sélectionné */}
                      {/* {selectedBL && (
                        <div className="p-4 bg-muted rounded-lg">
                          <h3 className="font-semibold mb-2">Détails du Bon de Livraison</h3>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><span className="font-medium">N° BL:</span> {selectedBL.numero}</p>
                              <p><span className="font-medium">Date:</span> {formatDate(new Date(selectedBL.date))}</p>
                            </div>
                            <div>
                              <p><span className="font-medium">Montant total actuel:</span> {formatCurrency(selectedBL.montantTotal)}</p>
                              <p><span className="font-medium">Montant payé:</span> {formatCurrency(selectedBL.montantPaye)}</p>
                              <p><span className="font-medium">Montant restant:</span> {formatCurrency(selectedBL.montantRestant)}</p>
                            </div>
                          </div>
                        </div>
                      )} */}

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
                                  <th className="text-right p-3 text-sm font-medium">Prix unitaire</th>
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
                                      <span className="font-medium">{ligne.ancienneQuantiteBL}</span>
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
                                      <span className={`font-medium ${ligne.nouvelleQuantiteBL === 0 ? 'text-red-600' : ''}`}>
                                        {ligne.nouvelleQuantiteBL}
                                      </span>
                                    </td>
                                    <td className="p-3 text-right">
                                      {formatCurrency(ligne.prixUnitaire)}
                                    </td>
                                    <td className="p-3 text-right font-medium text-orange-600">
                                      {formatCurrency(ligne.totalLigne)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="bg-muted/50 border-t">
                                <tr>
                                  <td colSpan={5} className="p-3 text-right font-bold">
                                    Total à créditer :
                                  </td>
                                  <td className="p-3 text-right font-bold text-orange-600 text-lg">
                                    {formatCurrency(calculateTotal())}
                                  </td>
                                </tr>
                                <tr>
                                  <td colSpan={5} className="p-3 text-right text-sm text-muted-foreground">
                                    Nouveau montant du BL après retour :
                                  </td>
                                  <td className="p-3 text-right font-medium">
                                    {selectedBL && formatCurrency(selectedBL.montantTotal - calculateTotal())}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Boutons d'action */}
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={resetForm}>
                          Annuler
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={isSubmitting || lignes.filter(l => l.quantite > 0).length === 0}
                          className="bg-orange-600 hover:bg-orange-700"
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
          </div>
        </main>
      </div>
    </div>
  );
}