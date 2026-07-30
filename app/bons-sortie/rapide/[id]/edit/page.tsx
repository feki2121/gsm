'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Truck, User, Car, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/types';

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Home {
  id: string;
  nom: string;
}

interface Chauffeur {
  id: string;
  nom: string;
  telephone: string;
  cin?: string | null;
  vehicule?: {
    id: string;
    matricule: string;
  } | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
  stockDisponible: number;
  tva: number;
}

interface BonSortieLigne {
  id?: string;
  productId: string;
  quantite: number;
  prixUnitaireHT: number;
}

export default function EditBonSortieRapidePage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [homes, setHomes] = useState<Home[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [selectedHomeForRapide, setSelectedHomeForRapide] = useState('');
  const [stockProducts, setStockProducts] = useState<Product[]>([]);
  const [originalQuantities, setOriginalQuantities] = useState<Map<string, number>>(new Map());

  // États du formulaire
  const [selectedChauffeurId, setSelectedChauffeurId] = useState('');
  const [nomConducteur, setNomConducteur] = useState('');
  const [matriculeVehicule, setMatriculeVehicule] = useState('');
  const [numCIN, setNumCIN] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [destination, setDestination] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [adresseLivraison, setAdresseLivraison] = useState('');
  const [observation, setObservation] = useState('');

  useEffect(() => {
    fetchInitialData();
    fetchBonSortie();
  }, [params.id]);

  const fetchInitialData = async () => {
    try {
      const [homesRes, clientsRes, chauffeursRes] = await Promise.all([
        fetch('/api/homes?limit=100'),
        fetch('/api/clients?limit=100'),
        fetch('/api/chauffeurs?limit=100'),
      ]);

      const homesData = await homesRes.json();
      const clientsData = await clientsRes.json();
      const chauffeursResult = await chauffeursRes.json();

      setHomes(homesData.data || []);
      setClients(clientsData.data || []);

      let chauffeursList = [];
      if (chauffeursResult.success === true && Array.isArray(chauffeursResult.data)) {
        chauffeursList = chauffeursResult.data;
      } else if (Array.isArray(chauffeursResult)) {
        chauffeursList = chauffeursResult;
      } else if (chauffeursResult.data && Array.isArray(chauffeursResult.data)) {
        chauffeursList = chauffeursResult.data;
      }

      const validChauffeurs = chauffeursList.map((chauffeur: any) => ({
        id: chauffeur.id,
        nom: chauffeur.nom || '',
        telephone: chauffeur.telephone || '',
        cin: chauffeur.cin || '',
        vehicule: chauffeur.vehicule || null,
        userId: chauffeur.userId,
        user: chauffeur.user || null,
      }));

      setChauffeurs(validChauffeurs);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchBonSortie = async () => {
    try {
      const response = await fetch(`/api/bons-sortie/rapide/${params.id}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();

      // Remplir le formulaire avec les données existantes
      setSelectedHomeForRapide(data.lignes[0]?.homeId || '');
      setDestination(data.destination);
      setNomConducteur(data.nomConducteur);
      setMatriculeVehicule(data.matriculeVehicule);
      setNumCIN(data.numCIN);
      setDateDebut(data.dateDebut.split('T')[0]);
      setDateFin(data.dateFin.split('T')[0]);
      setSelectedClientId(data.clientId || '');
      setAdresseLivraison(data.adresseLivraison || '');
      setObservation(data.observation || '');

      // Sauvegarder les quantités originales
      const originalQtys = new Map();
      data.lignes.forEach((ligne: any) => {
        originalQtys.set(ligne.productId, ligne.quantite);
      });
      setOriginalQuantities(originalQtys);

      // Trouver le chauffeur correspondant
      const chauffeur = chauffeurs.find(
        (c) => c.nom === data.nomConducteur && c.vehicule?.matricule === data.matriculeVehicule
      );
      if (chauffeur) {
        setSelectedChauffeurId(chauffeur.id);
      }

      // Charger les produits de la station
      if (data.lignes[0]?.homeId) {
        await loadProductsByStation(data.lignes[0].homeId, data.lignes);
      }
    } catch (error) {
      console.error('Error fetching bon sortie:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger le bon de sortie',
        variant: 'destructive',
      });
      router.push('/bons-sortie');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadProductsByStation = async (homeId: string, existingLignes?: any[]) => {
    if (!homeId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/bs?limit=1000`);
      const data = await response.json();
      const allProducts = data.data || [];

      let productsInStation = allProducts
        .filter((product: any) => {
          const stockLocation = product.stockLocations?.find(
            (sl: any) => sl.homeId === homeId
          );
          return stockLocation && stockLocation.quantite > 0;
        })
        .map((product: any) => {
          const stockLocation = product.stockLocations.find(
            (sl: any) => sl.homeId === homeId
          );
          return {
            ...product,
            stockDisponible: stockLocation?.quantite || 0,
          };
        });

      // Si on a des lignes existantes, ajouter les produits même s'ils n'ont plus de stock
      if (existingLignes) {
        for (const ligne of existingLignes) {
          const exists = productsInStation.find((p: any) => p.id === ligne.productId);
          if (!exists) {
            const product = allProducts.find((p: any) => p.id === ligne.productId);
            if (product) {
              productsInStation.push({
                ...product,
                stockDisponible: 0,
                quantiteSortieOriginale: ligne.quantite,
              });
            }
          } else {
            // Ajouter la quantité originale pour référence
            exists.quantiteSortieOriginale = ligne.quantite;
          }
        }
      }

      setStockProducts(productsInStation);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les produits de la station',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedChauffeurId && selectedChauffeurId !== 'none') {
      const chauffeur = chauffeurs.find((c) => c.id === selectedChauffeurId);
      if (chauffeur) {
        setNomConducteur(chauffeur.nom);
        setMatriculeVehicule(chauffeur.vehicule?.matricule || '');
        setNumCIN(chauffeur.cin || '');
      }
    } else if (selectedChauffeurId === 'none') {
      setNomConducteur('');
      setMatriculeVehicule('');
      setNumCIN('');
    }
  }, [selectedChauffeurId, chauffeurs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedHomeForRapide) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner une station',
        variant: 'destructive',
      });
      return;
    }

    if (!destination) {
      toast({
        title: 'Erreur',
        description: 'Veuillez saisir la destination',
        variant: 'destructive',
      });
      return;
    }

    if (!nomConducteur || !matriculeVehicule || !numCIN) {
      toast({
        title: 'Erreur',
        description: 'Veuillez remplir toutes les informations du conducteur',
        variant: 'destructive',
      });
      return;
    }

    const produits = stockProducts
      .map((product) => {
        // Utiliser la quantité du produit actuel (modifiable dans l'interface)
        const quantiteSortie = (product as any).quantiteSortie || product.stockDisponible;
        return {
          productId: product.id,
          quantiteSortie: quantiteSortie,
          prixUnitaireHT: product.prixVente / 1.19,
        };
      })
      .filter((p) => p.quantiteSortie > 0);

    if (produits.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucun produit sélectionné',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`/api/bons-sortie/rapide/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          homeId: selectedHomeForRapide,
          destination,
          nomConducteur,
          matriculeVehicule,
          numCIN,
          dateDebut,
          dateFin,
          clientId: selectedClientId || null,
          destinataire: selectedClientId ? '' : '',
          adresseLivraison,
          observation,
          produits,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }

      toast({
        title: 'Succès',
        description: 'Bon de sortie rapide modifié avec succès',
      });

      router.push(`/bons-sortie`);
      router.refresh();
    } catch (error) {
      console.error('Error updating bon sortie:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de modifier le bon de sortie',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bons-sortie/rapide/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la suppression');
      }

      toast({
        title: 'Succès',
        description: 'Bon de sortie rapide supprimé avec succès',
      });

      router.push('/bons-sortie');
      router.refresh();
    } catch (error) {
      console.error('Error deleting bon sortie:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer le bon de sortie',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    setStockProducts((prev) =>
      prev.map((product) =>
        product.id === productId
          ? { ...product, quantiteSortie: Math.max(0, quantity) }
          : product
      )
    );
  };

  if (isLoadingData) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier le Bon de Sortie Rapide" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <Header title="Modifier le Bon de Sortie Rapide" subtitle="Modifier les informations du bon de sortie" />
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <Link href={`/bons-sortie`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <Trash2 className="h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Cela supprimera définitivement le bon de sortie
                      et toutes ses données associées.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Supprimer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Informations Générales */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    1. Informations Générales
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dateDebut">Date Début *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dateDebut"
                          type="date"
                          value={dateDebut}
                          onChange={(e) => setDateDebut(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dateFin">Date Fin *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="dateFin"
                          type="date"
                          value={dateFin}
                          onChange={(e) => setDateFin(e.target.value)}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="station">Station *</Label>
                      <Select
                        value={selectedHomeForRapide}
                        onValueChange={(value) => {
                          setSelectedHomeForRapide(value);
                          if (value) {
                            loadProductsByStation(value);
                          } else {
                            setStockProducts([]);
                          }
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choisir une station" />
                        </SelectTrigger>
                        <SelectContent>
                          {homes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="destination"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Lieu de destination"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 2. Informations du transport */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Car className="h-5 w-5 text-primary" />
                    2. Informations du transport
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="chauffeur">Chauffeur *</Label>
                      <Select value={selectedChauffeurId || 'none'} onValueChange={setSelectedChauffeurId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un chauffeur" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Sélectionner un chauffeur</SelectItem>
                          {chauffeurs.map((chauffeur) => (
                            <SelectItem key={chauffeur.id} value={chauffeur.id}>
                              {chauffeur.nom} - {chauffeur.telephone}
                              {chauffeur.vehicule && ` (${chauffeur.vehicule.matricule})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nomConducteur">Nom du Conducteur *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="nomConducteur"
                          value={nomConducteur}
                          onChange={(e) => setNomConducteur(e.target.value)}
                          placeholder="Nom complet"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="matriculeVehicule">Matricule du Véhicule *</Label>
                      <div className="relative">
                        <Car className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="matriculeVehicule"
                          value={matriculeVehicule}
                          onChange={(e) => setMatriculeVehicule(e.target.value)}
                          placeholder="Numéro d'immatriculation"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numCIN">N° CIN *</Label>
                      <Input
                        id="numCIN"
                        value={numCIN}
                        onChange={(e) => setNumCIN(e.target.value)}
                        placeholder="Carte d'identité nationale"
                        required
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 3. Produits disponibles dans la station */}
              {selectedHomeForRapide && (
                <Card>
                  <CardHeader>
                    <CardTitle>3. Produits disponibles dans la station</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : stockProducts.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Aucun produit disponible dans cette station
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-sm font-medium">
                                Désignation
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium">
                                Stock Actuel
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium">
                                P.U H.T
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium">
                                P.U T.T.C
                              </th>
                              <th className="px-4 py-3 text-right text-sm font-medium">
                                Total HT
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {stockProducts.map((product) => {
                              const originalQty = originalQuantities.get(product.id) || 0;
                              const currentQty = (product as any).quantiteSortie || product.stockDisponible;
                              const isModified = currentQty !== originalQty;
                              
                              return (
                                <tr key={product.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 text-sm">{product.designation}</td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                                    {product.stockDisponible}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    {formatCurrency(product.prixVente / 1.19)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    {formatCurrency(product.prixVente)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right font-semibold">
                                    {formatCurrency((product.prixVente / 1.19) * currentQty)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          <tfoot className="bg-gray-50">
                            <tr>
                              <td colSpan={5} className="px-4 py-3 text-right font-bold">
                                Total Général HT:
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-primary">
                                {formatCurrency(
                                  stockProducts.reduce(
                                    (sum, p) =>
                                      sum +
                                      (p.prixVente / 1.19) *
                                        ((p as any).quantiteSortie || p.stockDisponible),
                                    0
                                  )
                                )}
                               </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-4">
                <Link href={`/bons-sortie/rapide/${params.id}/view`}>
                  <Button type="button" variant="outline">
                    Annuler
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={isLoading || !selectedHomeForRapide || stockProducts.length === 0}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4" />
                  {isLoading ? 'Modification...' : 'Enregistrer les modifications'}
                </Button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}