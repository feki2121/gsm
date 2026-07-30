'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, Edit, Printer, FileText, Building2, 
  Calendar, Hash, CreditCard, DollarSign, Package 
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface LigneFacture {
  id: string;
  productId: string;
  homeId: string | null;
  quantite: number;
  prixUnitaire: number;
  tva: number;
  product: {
    id: string;
    reference: string;
    designation: string;
  };
  home: {
    id: string;
    nom: string;
  } | null;
}

interface BonLivraisonRef {
  id: string;
  numero: string;
  date: string;
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
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    adresse: string | null;
  };
  lignes: LigneFacture[];
  bonLivraisonRef: BonLivraisonRef | null;
}

export default function ViewFacturePage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchFacture();
  }, [params.id]);

  const fetchFacture = async () => {
    try {
      const response = await fetch(`/api/factures/${params.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      const data = await response.json();
      setFacture(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails de la facture',
        variant: 'destructive',
      });
      router.push('/factures');
    } finally {
      setIsLoading(false);
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
 

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails de la facture" />
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
        <Header title="Détails de la facture" />
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Boutons d'action */}
            <div className="mb-6 flex justify-between items-center">
              <Link href="/factures">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la liste
                </Button>
              </Link>
            </div>

            {/* En-tête avec numéro et statut */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-2xl font-bold">Facture</h2>
                    <p className="text-muted-foreground">N° {facture.numero}</p>
                    {facture.bonLivraisonRef && (
                      <p className="text-sm text-muted-foreground mt-1">
                        BL associé: {facture.bonLivraisonRef.numero}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations client */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nom du client</p>
                    <p className="font-medium">{facture.client.nom}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Téléphone</p>
                    <p className="font-medium">{facture.client.telephone}</p>
                  </div>
                  {facture.client.email && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{facture.client.email}</p>
                    </div>
                  )}
                  {facture.client.adresse && (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Adresse</p>
                      <p className="font-medium">{facture.client.adresse}</p>
                    </div>
                  )}
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date d'émission</p>
                    <p className="font-medium flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(new Date(facture.date))}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Liste des produits */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Produits facturés
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium">
                          Désignation
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-medium">
                          Quantité
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          P.U HT
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          TVA (%)
                        </th>
                        {/* <th className="px-4 py-3 text-right text-sm font-medium">
                          Total HT
                        </th> */}
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Total TTC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {facture.lignes.map((ligne) => (
                        <tr key={ligne.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {ligne.product.designation}
                            {ligne.home && (
                              <span className="text-xs text-muted-foreground block">
                                Station: {ligne.home.nom}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-center font-semibold">
                            {ligne.quantite}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.prixUnitaire)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {ligne.tva}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                          </td>
                          {/* <td className="px-4 py-3 text-sm text-right font-semibold">
                            {formatCurrency(ligne.quantite * ligne.prixUnitaire * (1 + ligne.tva / 100))}
                          </td> */}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold">
                          Total HT:
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatCurrency(facture.totalHT + 1)}
                        </td>
                        <td></td>
                      </tr>
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold">
                          TVA:
                        </td>
                        <td className="px-4 py-3 text-right font-bold">
                          {formatCurrency(facture.totalTVA)}
                        </td>
                        <td></td>
                      </tr>
                      {facture.remise > 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-3 text-right font-bold text-red-600">
                            Remise ({facture.remise}%):
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-red-600">
                            -{formatCurrency((facture.totalHT + facture.totalTVA) * facture.remise / 100)}
                          </td>
                          <td></td>
                        </tr>
                      )}
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={4} className="px-4 py-3 text-right text-lg font-bold">
                          Total TTC:
                        </td>
                        <td className="px-4 py-3 text-right text-lg font-bold text-primary">
                          {formatCurrency(facture.totalTTC)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}