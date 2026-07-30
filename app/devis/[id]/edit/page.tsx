"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/types";
import { Loader2, Plus, Trash2, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Select2 from "react-select";
import Link from "next/link";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Product {
  id: string;
  reference: string;
  code: string;
  designation: string;
  prixVente: number; // Prix HT
  tva: number;
}

interface LigneDevis {
  id?: string;
  productId: string;
  productDesignation?: string;
  productReference?: string;
  productCode?: string;
  quantite: number;
  prixUnitaire: number; // Prix TTC
  tva: number;
}

type OptionType = {
  value: string;
  label: string;
};

export default function EditDevisPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remise, setRemise] = useState(0);
  const [remiseType, setRemiseType] = useState<"PERCENT" | "FIXED">("PERCENT");
  
  const [selectedClientId, setSelectedClientId] = useState("");
  const [validite, setValidite] = useState("");
  const [statut, setStatut] = useState("EN_ATTENTE");
  const [lignes, setLignes] = useState<LigneDevis[]>([]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [devisRes, clientsRes, productsRes] = await Promise.all([
        fetch(`/api/devis/${params.id}`),
        fetch("/api/clients?limit=100"),
        fetch("/api/products?limit=1000"),
      ]);

      if (!devisRes.ok) throw new Error("Devis non trouvé");
      
      const devis = await devisRes.json();
      const clientsData = await clientsRes.json();
      const productsData = await productsRes.json();

      setClients(clientsData.data || []);
      setProducts(productsData.data || []);
      
      // Remplir le formulaire
      setSelectedClientId(devis.clientId);
      setValidite(devis.validite.split('T')[0]);
      setStatut(devis.statut || "EN_ATTENTE");
      setRemise(devis.remise || 0);
      setRemiseType(devis.remiseType || "PERCENT");
      
      // Remplir les lignes
      const lignesFormatted = devis.lignes.map((ligne: any) => ({
        id: ligne.id,
        productId: ligne.productId,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire, // Déjà TTC
        tva: ligne.tva,
        productDesignation: ligne.product?.designation,
        productReference: ligne.product?.reference,
        productCode: ligne.product?.code,
      }));
      setLignes(lignesFormatted);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
      router.push("/devis");
    } finally {
      setLoading(false);
    }
  };

  const addLigne = () => {
    setLignes([...lignes, {
      id: `ligne-${Date.now()}`,
      productId: "",
      quantite: 1,
      prixUnitaire: 0,
      tva: 19
    }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneDevis, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };

    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        // Convertir le prix HT en TTC
        const prixTTC = product.prixVente * (1 + product.tva / 100);
        newLignes[index].prixUnitaire = prixTTC;
        newLignes[index].productDesignation = product.designation;
        newLignes[index].productReference = product.reference;
        newLignes[index].productCode = product.code;
        newLignes[index].tva = product.tva;
      }
    }

    setLignes(newLignes);
  };

  // Calcul du prix HT à partir du prix TTC
  const getPrixHT = (prixTTC: number, tva: number) => {
    return prixTTC / (1 + tva / 100);
  };

  // Calcul du total HT avant remise (à partir des prix HT)
  const calculateTotalHTBrut = () => {
    return lignes.reduce((sum, l) => {
      const prixHT = getPrixHT(l.prixUnitaire, l.tva);
      return sum + (l.quantite * prixHT);
    }, 0);
  };

  // Calcul du total HT après remise
  const calculateTotalHT = () => {
    const totalBrut = calculateTotalHTBrut();
    if (remiseType === "PERCENT") {
      return totalBrut * (1 - remise / 100);
    } else {
      return Math.max(0, totalBrut - remise);
    }
  };

  // Calcul de la TVA après remise
  const calculateTotalTVA = () => {
    const totalBrut = calculateTotalHTBrut();
    const tvaAmount = lignes.reduce((sum, l) => {
      const prixHT = getPrixHT(l.prixUnitaire, l.tva);
      const ht = l.quantite * prixHT;
      return sum + (ht * l.tva / 100);
    }, 0);
    
    if (remiseType === "PERCENT") {
      return tvaAmount * (1 - remise / 100);
    } else {
      const ratio = totalBrut > 0 ? Math.max(0, (totalBrut - remise) / totalBrut) : 0;
      return tvaAmount * ratio;
    }
  };

  // Calcul du total TTC après remise
  const calculateTotalTTC = () => {
    return calculateTotalHT() + calculateTotalTVA();
  };

  // Calcul du total TTC brut (avant remise) pour affichage
  const calculateTotalTTCBrut = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    const lignesValides = lignes.filter(l => l.productId && l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un produit", variant: "destructive" });
      return;
    }

    if (!validite) {
      toast({ title: "Erreur", description: "Veuillez spécifier une date de validité", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/devis/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: selectedClientId,
          totalHT: calculateTotalHT(),
          totalTTC: calculateTotalTTC(),
          validite,
          statut,
          remise,
          remiseType,
          lignes: lignesValides.map(l => ({
            productId: l.productId,
            quantite: l.quantite,
            prixUnitaire: l.prixUnitaire, // Prix TTC
            tva: l.tva,
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la modification");
      }

      toast({ title: "Succès", description: "Devis modifié avec succès" });
      router.push(`/devis/${params.id}`);
    } catch (error) {
      console.error("Error updating devis:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de modifier le devis", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const options: OptionType[] = products.map((p) => ({
    value: p.id,
    label: p.designation,
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier le devis" subtitle="Chargement..." />
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
        <Header title="Modifier le Devis" subtitle="Modifier un devis existant" />
        <main className="p-4 md:p-6">
          <div className="mb-4">
            <Link href={`/devis`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour au devis
              </Button>
            </Link>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      {isMounted && (
                        <Select2
                          options={clients.map(c => ({
                            value: c.id,
                            label: `${c.nom} - ${c.telephone}`
                          }))}
                          value={
                            clients
                              .map(c => ({ value: c.id, label: `${c.nom} - ${c.telephone}` }))
                              .find(o => o.value === selectedClientId) || null
                          }
                          onChange={(selected: OptionType | null) =>
                            setSelectedClientId(selected?.value || "")
                          }
                          placeholder="Sélectionner un client"
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={{
                            menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                          }}
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Date de validité *</Label>
                      <Input
                        type="date"
                        value={validite}
                        onChange={(e) => setValidite(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Statut</Label>
                      <Select value={statut} onValueChange={setStatut}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EN_ATTENTE">En attente</SelectItem>
                          <SelectItem value="ACCEPTE">Accepté</SelectItem>
                          <SelectItem value="REFUSE">Refusé</SelectItem>
                          <SelectItem value="TRANSFORME_EN_FACTURE">Transformé en facture</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produits</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix Unitaire (TTC)</TableHead>
                            <TableHead>TVA</TableHead>
                            <TableHead>Total TTC</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne, idx) => (
                            <TableRow key={ligne.id}>
                              <TableCell className="min-w-[220px]">
                                {isMounted && (
                                  <Select2<OptionType>
                                    options={options}
                                    value={options.find(o => o.value === ligne.productId) || null}
                                    onChange={(selected: OptionType | null) =>
                                      updateLigne(idx, "productId", selected?.value || "")
                                    }
                                    placeholder="Sélectionner produit"
                                    isSearchable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={{
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                  />
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={ligne.prixUnitaire}
                                  onChange={(e) => updateLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                  className="w-32"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="1"
                                  value={ligne.tva}
                                  onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)}
                                  className="w-20"
                                />
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                              </TableCell>
                              <TableCell>
                                {lignes.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => removeLigne(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    
                    {/* Totaux avec remise */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-between w-80">
                          <span>Total TTC (avant remise):</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalTTCBrut())}</span>
                        </div>
                        
                        <div className="flex justify-between w-80">
                          <span>Total HT (avant remise):</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalHTBrut())}</span>
                        </div>

                        {/* Section Remise */}
                        <div className="flex justify-between w-80 items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Label className="text-sm">Remise</Label>
                            <Select value={remiseType} onValueChange={(v: "PERCENT" | "FIXED") => setRemiseType(v)}>
                              <SelectTrigger className="w-24 h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="PERCENT">%</SelectItem>
                                <SelectItem value="FIXED">DT</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.001"
                              value={remise}
                              onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                              className="w-32 text-right"
                              placeholder="0"
                            />
                            <span className="text-sm text-muted-foreground">
                              {remiseType === "PERCENT" ? "%" : "DT"}
                            </span>
                          </div>
                        </div>

                        <div className="flex justify-between w-80">
                          <span>Total HT après remise:</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalHT())}</span>
                        </div>
                        
                        <div className="flex justify-between w-80">
                          <span>TVA:</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span>
                        </div>

                        <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                          <span>Total TTC après remise:</span>
                          <span>{formatCurrency(calculateTotalTTC())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/devis/${params.id}`)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isSubmitting || lignes.length === 0}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}