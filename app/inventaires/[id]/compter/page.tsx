"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/types";
import { Save, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useToast } from "@/hooks/use-toast";

interface Home {
  id: string;
  nom: string;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
}

interface LigneInventaire {
  id: string;
  productId: string;
  product: Product;
  homeId: string;
  home: Home;
  quantiteTheorique: number;
  quantitePhysique: number;
  ecart: number;
  commentaire: string | null;
}

interface Inventaire {
  id: string;
  numero: string;
  date: string;
  dateDebut: string;
  dateFin: string;
  description: string | null;
  statut: string;
  lignes: LigneInventaire[];
}

export default function CompterInventairePage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [inventaire, setInventaire] = useState<Inventaire | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [modifiedLines, setModifiedLines] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");

  const inventaireId = params.id as string;

  // Filtrer les lignes par référence ou désignation
  const filteredLignes = inventaire?.lignes.filter(ligne => {
    const search = searchFilter.toLowerCase();
    return (
      ligne.product.reference.toLowerCase().includes(search) ||
      ligne.product.designation.toLowerCase().includes(search)
    );
  });

  useEffect(() => {
    if (inventaireId) {
      fetchInventaire();
      fetchUserRole();
    }
  }, [inventaireId]);

  const fetchUserRole = async () => {
    try {
      const response = await fetch(`/api/users/me`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || "ADMIN");
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("ADMIN");
    }
  };


  const fetchInventaire = async () => {
    if (!inventaireId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/inventaires/${inventaireId}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const inventaireData = data.data || data;

      if (!inventaireData || !inventaireData.lignes) {
        throw new Error("Données d'inventaire invalides");
      }

      setInventaire(inventaireData);
    } catch (error) {
      console.error("Error fetching inventaire:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'inventaire",
        variant: "destructive"
      });
      router.push('/inventaires');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantiteChange = (ligneId: string, quantitePhysique: number) => {
    setInventaire(prev => {
      if (!prev) return null;
      const newLignes = prev.lignes.map(ligne =>
        ligne.id === ligneId
          ? {
            ...ligne,
            quantitePhysique,
            ecart: quantitePhysique - ligne.quantiteTheorique
          }
          : ligne
      );
      return { ...prev, lignes: newLignes };
    });
    setModifiedLines(prev => new Set(prev).add(ligneId));
  };

  const handleCommentaireChange = (ligneId: string, commentaire: string) => {
    setInventaire(prev => {
      if (!prev) return null;
      const newLignes = prev.lignes.map(ligne =>
        ligne.id === ligneId ? { ...ligne, commentaire } : ligne
      );
      return { ...prev, lignes: newLignes };
    });
    setModifiedLines(prev => new Set(prev).add(ligneId));
  };

  const handleSaveAll = async () => {
    if (!inventaire) return;

    setIsSaving(true);
    let hasError = false;

    try {
      // Sauvegarder chaque ligne modifiée
      for (const ligneId of modifiedLines) {
        const ligne = inventaire.lignes.find(l => l.id === ligneId);
        if (!ligne) continue;

        const response = await fetch(`/api/inventaires/${inventaire.id}/lignes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ligneId: ligne.id,
            quantitePhysique: ligne.quantitePhysique,
            commentaire: ligne.commentaire || ""
          }),
        });

        if (!response.ok) {
          hasError = true;
          console.error(`Erreur pour la ligne ${ligneId}`);
        }
      }

      if (hasError) {
        toast({
          title: "Erreur",
          description: "Certaines quantités n'ont pas pu être sauvegardées",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Succès",
          description: "Toutes les quantités ont été sauvegardées"
        });
        setModifiedLines(new Set());
      }
    } catch (error) {
      console.error("Error saving:", error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les quantités",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleValidateInventory = async () => {
    if (!inventaire) return;

    // const hasUncounted = inventaire.lignes.some(l => l.quantitePhysique === 0);
    // if (hasUncounted) {
    //   toast({
    //     title: "Inventaire incomplet",
    //     description: "Veuillez comptabiliser tous les produits avant validation.",
    //     variant: "destructive",
    //   });
    //   return;
    // }

    const hasEcart = inventaire.lignes.some(l => l.ecart !== 0);

    if (hasEcart) {
      const confirmAdjust = confirm(
        "Des écarts ont été détectés. Voulez-vous ajuster automatiquement le stock ?\n\n" +
        "✓ Oui = Ajuster le stock selon les écarts\n" +
        "✗ Non = Valider l'inventaire sans modifier le stock"
      );

      const response = await fetch(`/api/inventaires/${inventaire.id}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ajusterStock: confirmAdjust }),
      });

      if (response.ok) {
        toast({
          title: "Succès",
          description: confirmAdjust
            ? "Inventaire validé et stock ajusté"
            : "Inventaire validé (stock non modifié)"
        });
        router.push('/inventaires');
      }
    } else {
      const response = await fetch(`/api/inventaires/${inventaire.id}/valider`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ajusterStock: false }),
      });

      if (response.ok) {
        toast({ title: "Succès", description: "Inventaire validé (aucun écart)" });
        router.push('/inventaires');
      }
    }
  };

  const getEcartBadge = (ecart: number) => {
    if (ecart === 0) return <Badge variant="outline" className="text-green-600">✓ Égal</Badge>;
    if (ecart > 0) return <Badge className="bg-blue-500 text-white">+{ecart}</Badge>;
    return <Badge className="bg-red-500 text-white">{ecart}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <div className="flex justify-center items-center h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  if (!inventaire) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <div className="p-6 text-center">Inventaire non trouvé</div>
        </div>
      </div>
    );
  }

  const totalProduits = inventaire.lignes.length;
  const produitsComptes = inventaire.lignes.filter(l => l.quantitePhysique !== 0).length;
  const progress = (produitsComptes / totalProduits) * 100;

  const totalSurplus = inventaire.lignes.filter(l => l.ecart > 0).reduce((sum, l) => sum + l.ecart, 0);
  const totalManquant = Math.abs(inventaire.lignes.filter(l => l.ecart < 0).reduce((sum, l) => sum + l.ecart, 0));

  // Calcul de la somme des écarts prix
  const totalEcartPrix = inventaire.lignes.reduce((sum, l) => sum + (l.ecart * l.product.prixVente), 0);
  const totalSurplusPrix = inventaire.lignes.filter(l => l.ecart > 0).reduce((sum, l) => sum + (l.ecart * l.product.prixVente), 0);
  const totalManquantPrix = Math.abs(inventaire.lignes.filter(l => l.ecart < 0).reduce((sum, l) => sum + (l.ecart * l.product.prixVente), 0));

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header
          title={`Comptage - ${inventaire.numero}`}
          subtitle={`${formatDate(new Date(inventaire.dateDebut))} - ${formatDate(new Date(inventaire.dateFin))}`}
        />
        <main className="p-4 md:p-6">
          <div className="space-y-6">

            <Link href="/inventaires">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
            {/* Barre de progression */}
            {/* <Card>
              <CardContent className="pt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Progression du comptage</span>
                  <span className="font-semibold">
                    {produitsComptes} / {totalProduits} produits comptés
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </CardContent>
            </Card> */}

            {/* Résumé des écarts */}
            {/* <div className="grid gap-4 sm:grid-cols-3">
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="text-2xl font-bold text-green-600">
                  {inventaire.lignes.filter(l => l.ecart === 0 && l.quantitePhysique !== 0).length}
                </div>
                <div className="text-sm text-green-600">Produits conformes</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="text-2xl font-bold text-blue-600">{totalSurplus}</div>
                <div className="text-sm text-blue-600">Unités en surplus</div>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <div className="text-2xl font-bold text-red-600">{totalManquant}</div>
                <div className="text-sm text-red-600">Unités manquantes</div>
              </div>
            </div> */}

            {/* Résumé des écarts prix */}
            {userRole === 'ADMIN' && (
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-2xl font-bold text-gray-600">
                    {totalEcartPrix.toFixed(3)}
                  </div>
                  <div className="text-sm text-gray-600">Total Écart Prix (DT)</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-600">
                    +{totalSurplusPrix.toFixed(3)}
                  </div>
                  <div className="text-sm text-green-600">Surplus (DT)</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-600">
                    -{totalManquantPrix.toFixed(3)}
                  </div>
                  <div className="text-sm text-red-600">Manquant (DT)</div>
                </div>
              </div>
            )}

            {/* Tableau des produits */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <CardTitle>Liste des produits</CardTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Input
                    placeholder="Filtrer par référence ou désignation..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="w-64 h-9"
                  />
                  <Button
                    variant="outline"
                    onClick={() => router.push('/inventaires')}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveAll}
                    disabled={isSaving || modifiedLines.size === 0}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? "Sauvegarde..." : `Sauvegarder (${modifiedLines.size})`}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Référence</TableHead>
                        {/* <TableHead>Entrepôt</TableHead> */}
                        {userRole === 'ADMIN' && <TableHead className="text-right">Stock théorique</TableHead>}
                        <TableHead className="text-right">Stock physique</TableHead>
                        {userRole === 'ADMIN' && <TableHead className="text-right">Écart</TableHead>}
                        {userRole === 'ADMIN' && <TableHead className="text-right">Écart Prix</TableHead>}
                        <TableHead>Commentaire</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLignes && filteredLignes.length > 0 ? (
                        filteredLignes.map((ligne) => (
                          <TableRow
                            key={ligne.id}
                            className={cn(
                              modifiedLines.has(ligne.id) && "bg-yellow-50",
                              ligne.ecart !== 0 && "bg-orange-50"
                            )}
                          >
                            <TableCell className="font-medium">{ligne.product.designation}</TableCell>
                            <TableCell>{ligne.product.reference}</TableCell>
                            {userRole === 'ADMIN' && <TableCell className="text-right">{ligne.quantiteTheorique}</TableCell>}
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                min="0"
                                value={ligne.quantitePhysique === 0 ? "" : String(ligne.quantitePhysique)}
                                onChange={(e) => handleQuantiteChange(ligne.id, parseInt(e.target.value) || 0)}
                                className="w-24 text-right"
                              />
                            </TableCell>
                            {userRole === 'ADMIN' && (
                              <TableCell className="text-right">
                                {getEcartBadge(ligne.ecart)}
                              </TableCell>
                            )}
                            {userRole === 'ADMIN' && (
                              <TableCell className="text-right">
                                <span className={cn(
                                  ligne.ecart * ligne.product.prixVente > 0 && "text-green-600 font-medium",
                                  ligne.ecart * ligne.product.prixVente < 0 && "text-red-600 font-medium",
                                  ligne.ecart * ligne.product.prixVente === 0 && "text-muted-foreground"
                                )}>
                                  {(ligne.ecart * ligne.product.prixVente).toFixed(3)} DT
                                </span>
                              </TableCell>
                            )}
                            <TableCell>
                              <Input
                                placeholder="Commentaire..."
                                value={ligne.commentaire || ""}
                                onChange={(e) => handleCommentaireChange(ligne.id, e.target.value)}
                                className="w-40"
                              />
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={userRole === 'ADMIN' ? 7 : 4} className="text-center py-8 text-muted-foreground">
                            {searchFilter ? "Aucun produit ne correspond au filtre" : "Aucun produit dans l'inventaire"}
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Bouton de validation finale */}
            {inventaire.statut === 'EN_COURS' && userRole === 'ADMIN' && (
              <div className="flex justify-center pt-4">
                <Button
                  size="lg"
                  onClick={handleValidateInventory}
                  className="bg-green-600 hover:bg-green-700 text-lg px-8 py-6"
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Valider l'inventaire
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}