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
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/types";
import { Plus, Package, Loader2, ClipboardList, Home as HomeIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Home {
  id: string;
  nom: string;
}

interface LigneInventaire {
  id: string;
  productId: string;
  product?: {
    id: string;
    designation: string;
    reference: string;
  };
  homeId: string;
  home?: {
    id: string;
    nom: string;
  };
  quantiteTheorique: number;
  quantitePhysique: number;
  ecart: number;
}

interface Inventaire {
  id: string;
  numero: string;
  date: string;
  dateDebut: string;
  dateFin: string;
  description: string | null;
  statut: string;
  homeIds: string[];  // IDs des entrepôts concernés
  homes?: Home[];     // Entrepôts concernés (inclus via API)
  lignes: LigneInventaire[];
}

export default function InventairesPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [inventaires, setInventaires] = useState<Inventaire[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userRole, setUserRole] = useState<string>("");
  const [defaultHomeId, setDefaultHomeId] = useState<string>("");
  const [accessibleHomes, setAccessibleHomes] = useState<Home[]>([]);
  const [formData, setFormData] = useState({
    dateDebut: new Date().toISOString().split("T")[0],
    dateFin: new Date().toISOString().split("T")[0],
    description: "",
    selectedHomes: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAccessibleHomes = async () => {
    try {
      const response = await fetch("/api/homes/accessibles");
      if (response.ok) {
        const data = await response.json();
        setAccessibleHomes(data.data || []);
      } else {
        setAccessibleHomes(homes);
      }
    } catch (error) {
      console.error("Error fetching accessible homes:", error);
      setAccessibleHomes(homes);
    }
  };

  // Récupérer le rôle de l'utilisateur
  const fetchUserRole = async () => {
    try {
      const response = await fetch(`/api/users/me`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || "ADMIN");
        // Récupérer le homeId pour les chauffeurs
        if (data.role === "CHAUFFEUR" && data.chauffeur?.vehicule?.homeId) {
          setDefaultHomeId(data.chauffeur.vehicule.homeId);
        }
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("ADMIN");
    }
  };

  useEffect(() => {
    fetchInventaires();
    fetchHomes();
    fetchUserRole();
  }, []);

  useEffect(() => {
    if (homes.length > 0) {
      fetchAccessibleHomes();
    }
  }, [homes]);

  const fetchInventaires = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/inventaires");
      const data = await response.json();
      setInventaires(data.data || []);
    } catch (error) {
      console.error("Error fetching inventaires:", error);
      toast({ title: "Erreur", description: "Impossible de charger les inventaires", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      setIsLoading(false);
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };

  const handleCreateInventaire = async (e: React.FormEvent) => {
    setIsSubmitting(true);

    e.preventDefault();

    // Validation pour les chauffeurs
    if (userRole === "CHAUFFEUR") {
      if (!defaultHomeId) {
        toast({
          title: "Erreur",
          description: "Vous n'êtes pas assigné à un emplacement valide",
          variant: "destructive"
        });
        return;
      }

      // Pour les chauffeurs, on utilise automatiquement leur emplacement assigné
      try {
        const response = await fetch("/api/inventaires", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dateDebut: formData.dateDebut,
            dateFin: formData.dateDebut,
            description: formData.description,
            homes: [defaultHomeId], // Utiliser l'emplacement du chauffeur
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Erreur lors de la création");
        }

        toast({ title: "Succès", description: "Inventaire créé avec succès" });
        setIsDialogOpen(false);
        setFormData({ dateDebut: new Date().toISOString().split("T")[0], dateFin: new Date().toISOString().split("T")[0], description: "", selectedHomes: [] });
        fetchInventaires();
      } catch (error) {
        console.error("Error creating inventaire:", error);
        toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer l'inventaire", variant: "destructive" });
      }
      return;
    }

    // Pour les admins: validation normale
    if (formData.selectedHomes.length === 0) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un entrepôt", variant: "destructive" });
      return;
    }

    try {
      const response = await fetch("/api/inventaires", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateDebut: formData.dateDebut,
          dateFin: formData.dateDebut,
          description: formData.description,
          homes: formData.selectedHomes,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Inventaire créé avec succès" });
      setIsDialogOpen(false);
      setFormData({ dateDebut: new Date().toISOString().split("T")[0], dateFin: new Date().toISOString().split("T")[0], description: "", selectedHomes: [] });
      fetchInventaires();
    } catch (error) {
      console.error("Error creating inventaire:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer l'inventaire", variant: "destructive" });
    }
  };

  const getStatutBadge = (statut: string) => {
    const styles: Record<string, string> = {
      BROUILLON: "bg-gray-500",
      EN_COURS: "bg-yellow-500",
      VALIDE: "bg-green-500",
      CLOTURE: "bg-blue-500",
    };
    const labels: Record<string, string> = {
      BROUILLON: "Brouillon",
      EN_COURS: "En cours",
      VALIDE: "Validé",
      CLOTURE: "Clôturé",
    };
    return <Badge className={styles[statut] || "bg-gray-500"}>{labels[statut] || statut}</Badge>;
  };

  const getEcartBadge = (ecart: number) => {
    if (ecart === 0) return <Badge variant="outline" className="text-green-600">✓ Égal</Badge>;
    if (ecart > 0) return <Badge className="bg-blue-500">+{ecart} (Surplus)</Badge>;
    return <Badge className="bg-red-500">{ecart} (Manquant)</Badge>;
  };

  // Fonction pour afficher les entrepôts d'un inventaire
  const renderHomes = (item: Inventaire) => {
    // Si l'API retourne les homes directement
    if (item.homes && item.homes.length > 0) {
      return (
        <div className="flex flex-wrap gap-1">
          {item.homes.map(home => (
            <Badge key={home.id} variant="secondary" className="text-xs">
              <HomeIcon className="h-3 w-3 mr-1" />
              {home.nom}
            </Badge>
          ))}
        </div>
      );
    }

    // Fallback: utiliser les homeIds et les mapper avec la liste des homes
    if (item.homeIds && item.homeIds.length > 0) {
      const inventaireHomes = homes.filter(h => item.homeIds.includes(h.id));
      if (inventaireHomes.length > 0) {
        return (
          <div className="flex flex-wrap gap-1">
            {inventaireHomes.map(home => (
              <Badge key={home.id} variant="secondary" className="text-xs">
                <HomeIcon className="h-3 w-3 mr-1" />
                {home.nom}
              </Badge>
            ))}
          </div>
        );
      }
    }

    return <span className="text-muted-foreground text-sm">-</span>;
  };

  const columns = [
    {
      key: "numero",
      header: "N° Inventaire",
      render: (item: Inventaire) => <span className="font-mono">{item.numero}</span>
    },
    {
      key: "date",
      header: "Date",
      render: (item: Inventaire) => <span>{formatDate(new Date(item.date))}</span>
    },
    // {
    //   key: "dateDebut",
    //   header: "Période",
    //   render: (item: Inventaire) => (
    //     <span>{formatDate(new Date(item.dateDebut))} - {formatDate(new Date(item.dateFin))}</span>
    //   )
    // },
    {
      key: "entrepots",
      header: "Entrepôt(s)",
      render: (item: Inventaire) => renderHomes(item)
    },
    {
      key: "statut",
      header: "Statut",
      render: (item: Inventaire) => getStatutBadge(item.statut)
    },
    // {
    //   key: "ecarts",
    //   header: "Écarts",
    //   render: (item: Inventaire) => {
    //     const totalSurplus = item.lignes.filter(l => l.ecart > 0).reduce((sum, l) => sum + l.ecart, 0);
    //     const totalManquant = item.lignes.filter(l => l.ecart < 0).reduce((sum, l) => sum + Math.abs(l.ecart), 0);
    //     if (totalSurplus === 0 && totalManquant === 0) {
    //       return <span className="text-green-600">✓ Aucun écart</span>;
    //     }
    //     return (
    //       <div className="flex gap-2">
    //         {totalSurplus > 0 && <Badge className="bg-blue-500">+{totalSurplus}</Badge>}
    //         {totalManquant > 0 && <Badge className="bg-red-500">-{totalManquant}</Badge>}
    //       </div>
    //     );
    //   },
    // },
    {
      key: "actions",
      header: "Actions",
      render: (item: Inventaire) => (
        <div className="flex gap-2">
          {item.statut === 'EN_COURS' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/inventaires/${item.id}/compter`)}
            >
              <ClipboardList className="h-4 w-4 mr-1" /> Compter
            </Button>
          )}
          {item.statut === 'VALIDE' && (
            <Badge className="bg-green-500">Validé</Badge>
          )}
          {item.statut === 'CLOTURE' && (
            <Badge className="bg-blue-500">Clôturé</Badge>
          )}
        </div>
      ),
    },
  ];

  const totalEcart = inventaires.reduce((sum, inv) => {
    const surplus = inv.lignes.filter(l => l.ecart > 0).reduce((s, l) => s + l.ecart, 0);
    const manquant = inv.lignes.filter(l => l.ecart < 0).reduce((s, l) => s + Math.abs(l.ecart), 0);
    return sum + surplus + manquant;
  }, 0);

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Inventaire" subtitle="Gestion des inventaires et écarts de stock" />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Inventaires</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{inventaires.length}</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">En Cours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {inventaires.filter(i => i.statut === "EN_COURS").length}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Validés</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {inventaires.filter(i => i.statut === "VALIDE").length}
                  </div>
                </CardContent>
              </Card>
              {/* <Card className="border-blue-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Total Écarts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{totalEcart}</div>
                </CardContent>
              </Card> */}
            </div>

            {/* Inventaire Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Liste des Inventaires
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Nouvel Inventaire
                    </Button>
                  </DialogTrigger>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un Inventaire</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateInventaire} className="space-y-4">
                      {userRole === "CHAUFFEUR" ? (
                        <>
                          <div className="bg-muted/30 p-4 rounded-lg border">
                            <div className="flex items-center gap-2 mb-2">
                              <HomeIcon className="h-5 w-5 text-primary" />
                              <span className="font-medium">Emplacement assigné</span>
                            </div>
                            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded-md">
                              <HomeIcon className="h-4 w-4 text-primary" />
                              <span>{homes.find(h => h.id === defaultHomeId)?.nom || "Chargement..."}</span>
                              <Badge variant="default" className="ml-auto text-xs bg-primary">
                                Inventaire automatique
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              L'inventaire sera créé automatiquement pour votre emplacement assigné.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Description (optionnelle)</Label>
                            <Input
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Notes supplémentaires..."
                            />
                          </div>
                        </>
                      ) : (
                        // Interface normale pour les admins
                        <>
                          <div className="space-y-2">
                            <Label>Entrepôt à inventorier *</Label>
                            <div className="space-y-2 border rounded-lg p-3 max-h-40 overflow-y-auto">
                              <div className="space-y-2">
                                {homes.map(home => (
                                  <label
                                    key={home.id}
                                    className={`flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors ${formData.selectedHomes[0] === home.id
                                      ? 'bg-primary/10 border border-primary/20'
                                      : 'hover:bg-muted/50'
                                      }`}
                                  >
                                    <input
                                      type="radio"
                                      name="selectedHome"
                                      value={home.id}
                                      checked={formData.selectedHomes[0] === home.id}
                                      onChange={() => {
                                        setFormData({
                                          ...formData,
                                          selectedHomes: [home.id]
                                        });
                                      }}
                                      className="text-primary"
                                    />
                                    <HomeIcon className="h-4 w-4 text-muted-foreground" />
                                    <span>{home.nom}</span>
                                    {formData.selectedHomes[0] === home.id && (
                                      <Badge variant="default" className="ml-auto text-xs bg-primary">
                                        Sélectionné
                                      </Badge>
                                    )}
                                  </label>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Description (optionnelle)</Label>
                            <Input
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Notes supplémentaires..."
                            />
                          </div>
                        </>
                      )}

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Création...
                            </>
                          ) : (
                            "Créer l'inventaire"
                          )}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center items-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <DataTable data={inventaires} columns={columns} searchPlaceholder="Rechercher par numéro..." searchKey="numero" />
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

// Composant DataTable
function DataTable({ data, columns, searchPlaceholder, searchKey }: any) {
  const [search, setSearch] = useState("");
  const filteredData = data.filter((item: any) =>
    item[searchKey]?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <Input
        placeholder={searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted">
            <tr>
              {columns.map((col: any) => (
                <th key={col.key} className="p-3 text-left font-medium">{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item: any) => (
              <tr key={item.id} className="border-t hover:bg-muted/50">
                {columns.map((col: any) => (
                  <td key={col.key} className="p-3">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {filteredData.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">Aucun résultat</div>
        )}
      </div>
    </div>
  );
}