'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { Badge } from '@/components/ui/badge';
import { formatCurrency, formatDate } from '@/lib/types';
import { Loader2, Plus, Trash2, Save, ArrowLeft, Trash2 as TrashIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
  adresse: string | null;
}

interface Product {
  id: string;
  reference: string;
  designation: string;
  prixVente: number;
}

interface LigneFacture {
  id?: string;
  productId: string;
  product?: Product;
  homeId: string | null;
  quantite: number;
  prixUnitaire: number;
  tva: number;
}

interface Facture {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  remise: number;
  statut: string;
  type: string;
  bonLivraisonId: string | null;
  client: Client;
  lignes: LigneFacture[];
}

export default function EditFacturePage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  
  const [facture, setFacture] = useState<Facture | null>(null);
  const [numero, setNumero] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [factureDate, setFactureDate] = useState('');
  const [remise, setRemise] = useState<number>(0);
  const [statut, setStatut] = useState('IMPAYEE');
  const [lignes, setLignes] = useState<LigneFacture[]>([]);

  useEffect(() => {
    fetchFacture();
    fetchClients();
    fetchProducts();
  }, [params.id]);

  const fetchFacture = async () => {
    try {
      const response = await fetch(`/api/factures/${params.id}`);
      if (!response.ok) throw new Error('Erreur lors du chargement');
      const data = await response.json();
      setFacture(data);
      setNumero(data.numero);
      setSelectedClientId(data.clientId);
      setFactureDate(data.date.split('T')[0]);
      setRemise(data.remise);
      setStatut(data.statut);
      setLignes(data.lignes.map((l: any) => ({
        id: l.id,
        productId: l.productId,
        product: l.product,
        homeId: l.homeId,
        quantite: l.quantite,
        prixUnitaire: l.prixUnitaire,
        tva: l.tva,
      })));
    } catch (error) {
      console.error('Error fetching facture:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger la facture',
        variant: 'destructive',
      });
      router.push('/factures');
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients?limit=100');
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products?limit=1000');
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return 'bg-green-100 text-green-800';
      case 'IMPAYEE':
        return 'bg-red-100 text-red-800';
      case 'PARTIELLE':
        return 'bg-yellow-100 text-yellow-800';
      case 'ANNULEE':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'PAYEE':
        return 'Payée';
      case 'IMPAYEE':
        return 'Impayée';
      case 'PARTIELLE':
        return 'Paiement partiel';
      case 'ANNULEE':
        return 'Annulée';
      default:
        return statut;
    }
  };

  const addLigne = () => {
    setLignes([
      ...lignes,
      {
        id: `new-${Date.now()}`,
        productId: '',
        homeId: null,
        quantite: 1,
        prixUnitaire: 0,
        tva: 19,
      },
    ]);
  };

  const updateLigne = (index: number, field: keyof LigneFacture, value: any) => {
    const newLignes = [...lignes];
    newLignes[index] = { ...newLignes[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newLignes[index].prixUnitaire = product.prixVente;
        newLignes[index].product = product;
      }
    }
    
    setLignes(newLignes);
  };

  const removeLigne = (index: number) => {
    setLignes(lignes.filter((_, i) => i !== index));
  };

  const calculateTotalHT = () => {
    return lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaire), 0);
  };

  const calculateTotalTVA = () => {
    return lignes.reduce((sum, l) => {
      const ht = l.quantite * l.prixUnitaire;
      return sum + (ht * l.tva / 100);
    }, 0);
  };

  const calculateTotalTTC = () => {
    const total = calculateTotalHT() + calculateTotalTVA();
    return total * (1 - remise / 100);
  };

  const handleSubmit = async () => {
    if (!selectedClientId) {
      toast({
        title: 'Erreur',
        description: 'Veuillez sélectionner un client',
        variant: 'destructive',
      });
      return;
    }

    if (lignes.length === 0) {
      toast({
        title: 'Erreur',
        description: 'Aucun produit à facturer',
        variant: 'destructive',
      });
      return;
    }

    for (const ligne of lignes) {
      if (!ligne.productId) {
        toast({
          title: 'Erreur',
          description: 'Veuillez sélectionner un produit pour chaque ligne',
          variant: 'destructive',
        });
        return;
      }
    }

    setIsLoading(true);

    try {
      const totalHT = calculateTotalHT();
      const totalTVA = calculateTotalTVA();
      const totalTTC = calculateTotalTTC();

      const response = await fetch(`/api/factures/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          numero,
          clientId: selectedClientId,
          date: factureDate,
          totalHT,
          totalTVA,
          totalTTC,
          remise,
          statut,
          type: facture?.type || 'DIRECTE',
          lignes: lignes.map(ligne => ({
            productId: ligne.productId,
            homeId: ligne.homeId,
            quantite: ligne.quantite,
            prixUnitaire: ligne.prixUnitaire,
            tva: ligne.tva,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la modification');
      }

      toast({
        title: 'Succès',
        description: 'Facture modifiée avec succès',
      });

      router.push(`/factures/${params.id}/view`);
      router.refresh();
    } catch (error) {
      console.error('Error updating facture:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de modifier la facture',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/factures/${params.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }

      toast({
        title: 'Succès',
        description: 'Facture supprimée avec succès',
      });

      router.push('/factures');
      router.refresh();
    } catch (error) {
      console.error('Error deleting facture:', error);
      toast({
        title: 'Erreur',
        description: error instanceof Error ? error.message : 'Impossible de supprimer la facture',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier la facture" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!facture) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Modifier la facture" subtitle={`Facture N° ${numero}`} />
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-6 flex justify-between items-center">
              <Link href={`/factures`}>
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2">
                    <TrashIcon className="h-4 w-4" />
                    Supprimer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action est irréversible. Cela supprimera définitivement la facture
                      et ajustera le solde client en conséquence.
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

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Détails de la facture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                    <div className="space-y-2">
                      <Label>Numéro facture *</Label>
                      <Input
                        value={numero}
                        onChange={(e) => setNumero(e.target.value)}
                        placeholder="FAC-2024-001"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Client *</Label>
                      <Select value={selectedClientId} onValueChange={setSelectedClientId}>
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
                      <Label>Statut</Label>
                      <Select value={statut} onValueChange={setStatut}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un statut" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IMPAYEE">Impayée</SelectItem>
                          <SelectItem value="PARTIELLE">Paiement partiel</SelectItem>
                          <SelectItem value="PAYEE">Payée</SelectItem>
                          <SelectItem value="ANNULEE">Annulée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Remise (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={remise}
                        onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  {/* Tableau des produits */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Produits à facturer</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                        <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                      </Button>
                    </div>

                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead className="text-center">Qté</TableHead>
                            <TableHead className="text-right">PU (HT)</TableHead>
                            <TableHead className="text-right">TVA (%)</TableHead>
                            <TableHead className="text-right">Total (HT)</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne, idx) => (
                            <TableRow key={ligne.id}>
                              <TableCell>
                                <Select
                                  value={ligne.productId}
                                  onValueChange={(value) => updateLigne(idx, 'productId', value)}
                                >
                                  <SelectTrigger className="w-64">
                                    <SelectValue placeholder="Sélectionner un produit" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {products.map(product => (
                                      <SelectItem key={product.id} value={product.id}>
                                        {product.reference} - {product.designation}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell className="text-center">
                                <Input
                                  type="number"
                                  min="1"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                  className="w-24 text-center"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={ligne.prixUnitaire}
                                  onChange={(e) => updateLigne(idx, 'prixUnitaire', parseFloat(e.target.value) || 0)}
                                  className="w-32 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <Input
                                  type="number"
                                  step="1"
                                  value={ligne.tva}
                                  onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium">
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

                    {/* Totaux - exactement comme dans le view */}
                    <div className="flex flex-col items-end gap-2 pt-4 border-t">
                      <div className="flex justify-between w-64">
                        <span>Total HT:</span>
                        <span className="font-semibold">{formatCurrency(calculateTotalHT() - calculateTotalTVA())}</span>
                      </div>
                      <div className="flex justify-between w-64">
                        <span>TVA ({calculateTotalHT() > 0 ? ((calculateTotalTVA() / calculateTotalHT()) * 100).toFixed(0) : 0}%):</span>
                        <span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span>
                      </div>
                      {remise > 0 && (
                        <div className="flex justify-between w-64 text-red-600">
                          <span>Remise ({remise}%):</span>
                          <span className="font-semibold">
                            -{formatCurrency((calculateTotalHT() + calculateTotalTVA()) * remise / 100)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between w-64 text-lg font-bold border-t pt-2">
                        <span>Total TTC:</span>
                        <span className="text-primary">{formatCurrency(calculateTotalHT())}</span>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.push(`/factures/${params.id}/view`)}
                      >
                        Annuler
                      </Button>
                      <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedClientId || lignes.length === 0}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Modification...
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
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  ); 
}