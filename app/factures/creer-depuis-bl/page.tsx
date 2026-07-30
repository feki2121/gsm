"use client";

import { useEffect, useState, useMemo } from "react";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/types";
import { Loader2, Trash2, Save, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { VerificationStock } from "../components/VerificationStock";
import Link from "next/link";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse: string;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  prixVenteHT: number;
  tva?: number
}

interface LigneFacture {
  id: string;
  productId: string;
  product?: Product;
  homeId: string;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  ligneRemise: number; // en DT
  blId: string;
  blNumero: string;
}

interface BonLivraison {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client?: Client;
  remise?: number; // en DT
  lignes: Array<{
    id: string;
    productId: string;
    product?: Product;
    homeId: string;
    quantite: number;
    prixVente?: number;
    prixVenteHT?: number;
    tva?: number;
    ligneRemise?: number; // en DT
  }>;
}

export default function CreerFactureDepuisBL() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [bonsLivraison, setBonsLivraison] = useState<BonLivraison[]>([]);
  const [lignesFacture, setLignesFacture] = useState<LigneFacture[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [factureDate, setFactureDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [stockVerification, setStockVerification] = useState<any>(null);
  const [remiseGlobaleModifiable, setRemiseGlobaleModifiable] = useState<number>(0);

  // ✅ Déterminer si on utilise la remise globale
  const useGlobal = useMemo(() => {
    // Vérifier les taux de TVA
    const uniqueTvaRates = new Set(lignesFacture.map(l => Number(l.tva || 0)));
    const hasDifferentRates = uniqueTvaRates.size > 1;

    if (hasDifferentRates) return false;

    // Vérifier si des remises individuelles existent
    const hasIndividualRemises = lignesFacture.some(l => Number(l.ligneRemise || 0) > 0);

    return !hasIndividualRemises;
  }, [lignesFacture]);

  // ✅ Calcul détaillé par ligne
  const detailsParLigne = useMemo(() => {
    return lignesFacture.map(ligne => {
      const quantite = ligne.quantite || 0;
      const prixHT = ligne.prixUnitaire || 0;
      const tva = (ligne.tva || 0) / 100;
      const montantHTBrut = quantite * prixHT;

      let montantRemiseLigne = 0;
      let montantHT = montantHTBrut;

      if (useGlobal) {
        // ✅ Mode remise globale: répartition proportionnelle
        const totalHTBrut = lignesFacture.reduce((sum, l) => sum + (l.quantite || 0) * (l.prixUnitaire || 0), 0);
        if (totalHTBrut > 0 && remiseGlobaleModifiable > 0) {
          montantRemiseLigne = (montantHTBrut / totalHTBrut) * remiseGlobaleModifiable;
          montantHT = Math.max(0, montantHTBrut - montantRemiseLigne);
        }
      } else {
        // ✅ Mode remises individuelles: remise en DT
        montantRemiseLigne = Math.min(ligne.ligneRemise || 0, montantHTBrut);
        montantHT = Math.max(0, montantHTBrut - montantRemiseLigne);
      }

      const montantTVA = montantHT * tva;
      const montantTTC = montantHT + montantTVA;

      return {
        ...ligne,
        montantHTBrut,
        montantRemiseLigne,
        montantHT,
        montantTVA,
        montantTTC,
        tauxTVA: tva,
      };
    });
  }, [lignesFacture, remiseGlobaleModifiable, useGlobal]);

  // ✅ Totaux avec remise globale
  const totauxAvecRemiseGlobale = useMemo(() => {
    const totalHTBrut = detailsParLigne.reduce((sum, d) => sum + d.montantHTBrut, 0);
    const totalRemise = detailsParLigne.reduce((sum, d) => sum + d.montantRemiseLigne, 0);
    const totalHT = detailsParLigne.reduce((sum, d) => sum + d.montantHT, 0);
    const totalTVA = detailsParLigne.reduce((sum, d) => sum + d.montantTVA, 0);
    const totalTTC = detailsParLigne.reduce((sum, d) => sum + d.montantTTC, 0);

    // Grouper par taux de TVA
    const parTauxTVA = detailsParLigne.reduce((acc, d) => {
      const key = Math.round(d.tauxTVA * 100);
      if (!acc[key]) {
        acc[key] = {
          taux: key,
          totalHT: 0,
          totalTVA: 0,
          totalTTC: 0,
        };
      }
      acc[key].totalHT += d.montantHT;
      acc[key].totalTVA += d.montantTVA;
      acc[key].totalTTC += d.montantTTC;
      return acc;
    }, {} as Record<number, { taux: number; totalHT: number; totalTVA: number; totalTTC: number }>);

    return {
      totalHTBrut,
      totalRemise,
      totalHT,
      totalTVA,
      totalTTC,
      parTauxTVA,
    };
  }, [detailsParLigne]);

  // ✅ Totaux avec remises individuelles
  const totauxAvecRemisesIndividuelles = useMemo(() => {
    let totalHTBrut = 0;
    let totalRemise = 0;
    let totalHT = 0;
    let totalTVA = 0;
    let totalTTC = 0;

    detailsParLigne.forEach(d => {
      totalHTBrut += d.montantHTBrut;
      totalRemise += d.montantRemiseLigne;
      totalHT += d.montantHT;
      totalTVA += d.montantTVA;
      totalTTC += d.montantTTC;
    });

    return {
      totalHTBrut,
      totalRemise,
      totalHT,
      totalTVA,
      totalTTC,
    };
  }, [detailsParLigne]);

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?limit=100");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  };

  useEffect(() => {
    const storedBLs = localStorage.getItem('selectedBLsForFacture');
    if (!storedBLs) {
      toast({
        title: "Erreur",
        description: "Aucun bon de livraison sélectionné",
        variant: "destructive",
      });
      router.push('/bons-livraison');
      return;
    }

    const bls: BonLivraison[] = JSON.parse(storedBLs);
    console.log('🔍 BLs chargés:', JSON.stringify(bls, null, 2));

    setBonsLivraison(bls);

    // ✅ Récupérer la remise globale en DT
    const totalRemiseDT = bls.reduce((sum, bl) => sum + (bl.remise || 0), 0);
    setRemiseGlobaleModifiable(totalRemiseDT);
    console.log('💰 Remise globale en DT:', totalRemiseDT);

    // Extraire tous les clients des BLs
    const uniqueClients = [...new Map(bls.map(bl => [bl.clientId, bl.client])).values()];
    if (uniqueClients.length === 1) {
      setSelectedClientId(uniqueClients[0]?.id || "");
      setSelectedClient(uniqueClients[0] || null);
    }

    // ✅ Construire les lignes de facture en agrégeant par produit
    const lignesMap = new Map<string, LigneFacture>();

    // Vérifier si des remises individuelles existent
    const hasIndividualRemises = bls.some(b =>
      b.lignes.some(l => (l.ligneRemise || 0) > 0)
    );

    // Si des remises individuelles existent ou plusieurs taux de TVA, on utilise les remises individuelles
    const uniqueTvaRates = new Set();
    bls.forEach(b => {
      b.lignes.forEach(l => {
        if (l.product?.tva !== undefined) {
          uniqueTvaRates.add(l.product.tva);
        }
      });
    });
    const useGlobalRemise = uniqueTvaRates.size <= 1 && !hasIndividualRemises;

    for (const bl of bls) {
      for (const ligne of bl.lignes) {
        const productId = ligne.productId;
        const key = productId; // ✅ Clé uniquement par productId

        // Si on utilise la remise globale, on met remiseLigne = 0
        // Sinon on prend la remise de la ligne (en DT)
        const remiseLigne = useGlobalRemise ? 0 : (ligne.ligneRemise || 0);

        // Récupérer le prix correctement
        const prixUnitaire = ligne.prixVenteHT !== undefined && ligne.prixVenteHT !== null && ligne.prixVenteHT !== 0
          ? ligne.prixVenteHT
          : (ligne.product?.prixVenteHT ?? 0);

        const tva = ligne.product?.tva ?? 19;

        if (lignesMap.has(key)) {
          // ✅ Agréger : additionner les quantités et les remises
          const existing = lignesMap.get(key)!;
          existing.quantite += ligne.quantite;
          existing.ligneRemise += remiseLigne;
          // Ajouter le numéro de BL
          if (!existing.blNumero.includes(bl.numero)) {
            existing.blNumero = `${existing.blNumero}, ${bl.numero}`;
          }
          existing.blId = `${existing.blId},${bl.id}`;
        } else {
          // ✅ Nouvelle ligne
          lignesMap.set(key, {
            id: `${bl.id}-${ligne.id}`,
            productId: ligne.productId,
            product: ligne.product,
            homeId: ligne.homeId,
            quantite: ligne.quantite,
            prixUnitaire: prixUnitaire,
            tva: tva,
            blId: bl.id,
            blNumero: bl.numero,
            ligneRemise: remiseLigne,
          });
        }
      }
    }

    const allLignes = Array.from(lignesMap.values());
    console.log('📊 Lignes finales aggrégées:', allLignes);
    setLignesFacture(allLignes);

    fetchClients();
  }, []);

  const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
    const newLignes = [...lignesFacture];
    newLignes[index] = { ...newLignes[index], [field]: value };
    setLignesFacture(newLignes);
  };

  const removeLigne = (index: number) => {
    setLignesFacture(lignesFacture.filter((_, i) => i !== index));
  };

  // ✅ Fonctions de calcul pour la soumission
  const calculateTotalHT = () => {
    if (useGlobal) {
      return totauxAvecRemiseGlobale.totalHT;
    }
    return totauxAvecRemisesIndividuelles.totalHT;
  };

  const calculateTotalTVA = () => {
    if (useGlobal) {
      return totauxAvecRemiseGlobale.totalTVA;
    }
    return totauxAvecRemisesIndividuelles.totalTVA;
  };

  const calculateTotalTTC = () => {
    if (useGlobal) {
      return totauxAvecRemiseGlobale.totalTTC;
    }
    return totauxAvecRemisesIndividuelles.totalTTC;
  };

  const getTotalRemise = () => {
    if (useGlobal) {
      return totauxAvecRemiseGlobale.totalRemise;
    }
    return totauxAvecRemisesIndividuelles.totalRemise;
  };

  const getParTauxTVA = () => {
    if (useGlobal) {
      return totauxAvecRemiseGlobale.parTauxTVA;
    }
    return {};
  };

const handleSubmit = async () => {
  if (!selectedClientId) {
    toast({
      title: "Erreur",
      description: "Veuillez sélectionner un client",
      variant: "destructive",
    });
    return;
  }

  if (lignesFacture.length === 0) {
    toast({
      title: "Erreur",
      description: "Aucun produit à facturer",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    const totalHT = calculateTotalHT();
    const totalTVA = calculateTotalTVA();
    const totalTTC = calculateTotalTTC() + 1;
    const totalRemise = getTotalRemise();

    // ✅ Récupérer le prochain numéro de facture
    const numeroResponse = await fetch("/api/factures/next-number");
    if (!numeroResponse.ok) {
      const errorData = await numeroResponse.json();
      throw new Error(errorData.error || "Impossible de générer le numéro de facture");
    }
    const { numero } = await numeroResponse.json();
    console.log("📝 Numéro de facture généré:", numero);

    const response = await fetch("/api/factures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numero: numero, // ✅ Utiliser le numéro formaté "2026/134"
        clientId: selectedClientId,
        date: factureDate,
        totalHT,
        totalTVA,
        totalTTC,
        remise: totalRemise,
        statut: "IMPAYEE",
        type: "DIRECTE",
        lignes: lignesFacture.map(ligne => ({
          productId: ligne.productId,
          homeId: ligne.homeId,
          quantite: ligne.quantite,
          prixUnitaire: ligne.prixUnitaire,
          tva: ligne.tva,
          remiseLigne: ligne.ligneRemise || 0,
        })),
        bonsLivraisonIds: [
          ...new Set(
            lignesFacture
              .flatMap(l => l.blId.split(','))
              .filter(Boolean)
          ),
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Erreur lors de la création");
    }

    toast({
      title: "Succès",
      description: `Facture ${numero} créée avec succès`,
    });

    localStorage.removeItem('selectedBLsForFacture');
    router.push('/factures');
  } catch (error) {
    console.error("Error creating facture:", error);
    toast({
      title: "Erreur",
      description: error instanceof Error ? error.message : "Impossible de créer la facture",
      variant: "destructive",
    });
  } finally {
    setIsLoading(false);
  }
};

  // Préparer les données pour la vérification de stock
  const produitsPourVerification = () => {
    const produitsMap = new Map<string, number>();

    lignesFacture.forEach(ligne => {
      const existing = produitsMap.get(ligne.productId) || 0;
      produitsMap.set(ligne.productId, existing + ligne.quantite);
    });

    return Array.from(produitsMap.entries()).map(([productId, quantite]) => ({
      productId,
      quantite
    }));
  };

  // ✅ Plus besoin de la fonction agregerLignesParProduit car on agrège déjà à l'initialisation

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header title="Créer une facture" subtitle="À partir des bons de livraison sélectionnés" />
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <Link href="/bons-livraison">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Détails de la facture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="space-y-2">
                    <Label>Client *</Label>
                    <Select value={selectedClientId} onValueChange={(value) => {
                      setSelectedClientId(value);
                      setSelectedClient(clients.find(c => c.id === value) || null);
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.nom} - {client.telephone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Date facture</Label>
                    <Input
                      type="date"
                      value={factureDate}
                      onChange={(e) => setFactureDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{useGlobal ? "Remise globale (DT)" : "Remises individuelles (DT)"}</Label>
                    {useGlobal ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.001"
                          min="0"
                          value={remiseGlobaleModifiable}
                          onChange={(e) => {
                            const value = parseFloat(e.target.value) || 0;
                            setRemiseGlobaleModifiable(value);
                          }}
                          className="w-32"
                          placeholder="0.000"
                        />
                        <span className="text-sm text-muted-foreground">DT</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const totalRemiseDT = bonsLivraison.reduce((sum, bl) => sum + (bl.remise || 0), 0);
                            setRemiseGlobaleModifiable(totalRemiseDT);
                          }}
                        >
                          Réinitialiser
                        </Button>
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
                        Remises appliquées ligne par ligne en DT
                      </div>
                    )}
                    {lignesFacture.some((ligne) => (ligne.ligneRemise || 0) > 0) && !useGlobal && (
                      <p className="text-xs text-muted-foreground">
                        ⚠️ Des remises individuelles sont définies par ligne
                      </p>
                    )}
                    {useGlobal && remiseGlobaleModifiable > 0 && (
                      <p className="text-xs text-green-600">
                        ✓ Remise globale de {formatCurrency(remiseGlobaleModifiable)} appliquée
                      </p>
                    )}
                    {!useGlobal && lignesFacture.length > 0 && (
                      <p className="text-xs text-blue-600">
                        ℹ️ Remise globale désactivée car plusieurs taux de TVA ou remises individuelles existent
                      </p>
                    )}
                  </div>
                </div>

                {selectedClientId && produitsPourVerification().length > 0 && (
                  <div className="mb-6">
                    <VerificationStock
                      produits={produitsPourVerification()}
                      onVerificationChange={(estValide) => {
                        if (!estValide) {
                          console.log("Stock FAC insuffisant pour certains produits");
                        }
                      }}
                    />
                  </div>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Produits à facturer</Label>
                    {!useGlobal && (
                      <span className="text-sm text-muted-foreground">
                        Remise en DT par ligne
                      </span>
                    )}
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>BL source</TableHead>
                          <TableHead>Produit</TableHead>
                          <TableHead>Qté</TableHead>
                          <TableHead>TVA (%)</TableHead>
                          {!useGlobal && (
                            <TableHead>Remise (DT)</TableHead>
                          )}
                          <TableHead>PU (HT)</TableHead>
                          <TableHead>Total HT</TableHead>
                          <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lignesFacture.map((ligne, idx) => (
                          <TableRow key={ligne.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {ligne.blNumero}
                            </TableCell>
                            <TableCell>
                              <Input
                                value={ligne.product?.designation || ""}
                                placeholder="Produit"
                                disabled
                                className="w-40"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={ligne.quantite}
                                onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                className="w-20"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="1"
                                min="0"
                                max="100"
                                value={ligne.tva}
                                onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)}
                                className="w-20"
                              />
                            </TableCell>
                            {!useGlobal && (
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={ligne.ligneRemise}
                                  onChange={(e) => updateLigne(idx, 'ligneRemise', parseFloat(e.target.value) || 0)}
                                  className="w-24"
                                  placeholder="0.000"
                                />
                              </TableCell>
                            )}
                            <TableCell>
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={ligne.prixUnitaire}
                                onChange={(e) => updateLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                className="w-28"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600"
                                onClick={() => removeLigne(idx)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Totaux */}
                  <div className="flex flex-col items-end gap-2 pt-4 border-t">
                    {(() => {
                      const timbreFiscal = 1;

                      if (useGlobal) {
                        // ✅ Mode remise globale
                        const { parTauxTVA, totalRemise, totalHT, totalTVA, totalTTC } = totauxAvecRemiseGlobale;

                        return (
                          <>
                            {totalRemise > 0 && (
                              <div className="flex justify-between w-64 text-green-600">
                                <span>Remise globale :</span>
                                <span className="font-semibold">- {formatCurrency(totalRemise)}</span>
                              </div>
                            )}

                            {/* Détail par taux de TVA */}
                            {Object.values(parTauxTVA).map((item) => (
                              <div key={item.taux} className="w-64 border-t pt-1 mt-1">
                                <div className="text-sm text-muted-foreground mb-1">
                                  Taux TVA {item.taux}%
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>HT :</span>
                                  <span>{formatCurrency(item.totalHT)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span>TVA :</span>
                                  <span>{formatCurrency(item.totalTVA)}</span>
                                </div>
                                <div className="flex justify-between text-sm font-medium">
                                  <span>TTC :</span>
                                  <span>{formatCurrency(item.totalTTC)}</span>
                                </div>
                              </div>
                            ))}

                            <div className="flex justify-between w-64 border-t pt-2 mt-2">
                              <span>Total HT :</span>
                              <span className="font-semibold">{formatCurrency(totalHT)}</span>
                            </div>
                            <div className="flex justify-between w-64">
                              <span>Total TVA :</span>
                              <span className="font-semibold">{formatCurrency(totalTVA)}</span>
                            </div>
                            <div className="flex justify-between w-64">
                              <span>Timbre fiscal :</span>
                              <span className="font-semibold">{formatCurrency(timbreFiscal)}</span>
                            </div>
                            <div className="flex justify-between w-64 text-lg font-bold border-t pt-2">
                              <span>Total TTC :</span>
                              <span>{formatCurrency(totalTTC + timbreFiscal)}</span>
                            </div>
                          </>
                        );
                      } else {
                        // ✅ Mode remises individuelles
                        const { totalRemise, totalHT, totalTVA, totalTTC } = totauxAvecRemisesIndividuelles;

                        return (
                          <>
                            {totalRemise > 0 && (
                              <div className="flex justify-between w-64 text-green-600">
                                <span>Remise totale :</span>
                                <span className="font-semibold">- {formatCurrency(totalRemise)}</span>
                              </div>
                            )}
                            <div className="flex justify-between w-64">
                              <span>Total HT :</span>
                              <span className="font-semibold">{formatCurrency(totalHT)}</span>
                            </div>
                            <div className="flex justify-between w-64">
                              <span>Total TVA :</span>
                              <span className="font-semibold">{formatCurrency(totalTVA)}</span>
                            </div>
                            <div className="flex justify-between w-64">
                              <span>Timbre fiscal :</span>
                              <span className="font-semibold">{formatCurrency(timbreFiscal)}</span>
                            </div>
                            <div className="flex justify-between w-64 text-lg font-bold border-t pt-2">
                              <span>Total TTC :</span>
                              <span>{formatCurrency(totalTTC + timbreFiscal)}</span>
                            </div>
                          </>
                        );
                      }
                    })()}
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push('/bons-livraison')}
                    >
                      Annuler
                    </Button>
                    <Button
                      onClick={handleSubmit}
                      disabled={isLoading || !selectedClientId || lignesFacture.length === 0}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Création...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Créer la facture
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}