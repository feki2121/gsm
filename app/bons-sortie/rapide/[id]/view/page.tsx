'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  Edit,
  Printer,
  Truck,
  User,
  Car,
  Calendar,
  MapPin,
  FileText,
  Building2,
  Phone,
  Mail,
  Hash,
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDate } from '@/lib/types';

interface BonSortieLigne {
  id: string;
  productId: string;
  homeId: string;
  quantite: number;
  prixUnitaireHT: number;
  prixUnitaireTTC: number;
  totalHT: number;
  totalTTC: number;
  product: {
    id: string;
    reference: string;
    designation: string;
  };
  home: {
    id: string;
    nom: string;
  };
}

interface BonSortie {
  id: string;
  numero: string;
  date: string;
  dateDebut: string;
  dateFin: string;
  destination: string;
  nomConducteur: string;
  matriculeVehicule: string;
  numCIN: string;
  clientId: string | null;
  destinataire: string | null;
  motif: string;
  adresseLivraison: string | null;
  observation: string | null;
  totalHT: number;
  totalTTC: number;
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
  } | null;
  lignes: BonSortieLigne[];
}

export default function ViewBonSortieRapidePage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [bonSortie, setBonSortie] = useState<BonSortie | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchBonSortie();
  }, [params.id]);

  const fetchBonSortie = async () => {
    try {
      const response = await fetch(`/api/bons-sortie/rapide/${params.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }
      const data = await response.json();
      setBonSortie(data);
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les détails du bon de sortie',
        variant: 'destructive',
      });
      router.push('/bons-sortie');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails du Bon de Sortie Rapide" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!bonSortie) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Détails du Bon de Sortie Rapide" />
        <main className="p-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Boutons d'action */}
            <div className="mb-6 flex justify-between items-center">
              <Link href="/bons-sortie">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la liste
                </Button>
              </Link>
            </div>

            {/* Informations Générales */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-primary" />
                  Informations Générales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date de création</p>
                    <p className="font-medium">{formatDate(new Date(bonSortie.date))}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Période</p>
                    <p className="font-medium">
                      Du {formatDate(new Date(bonSortie.dateDebut))} au {formatDate(new Date(bonSortie.dateFin))}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Destination</p>
                    <p className="font-medium flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {bonSortie.destination}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations du transport */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5 text-primary" />
                  Informations du transport
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Conducteur</p>
                    <p className="font-medium flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {bonSortie.nomConducteur}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Matricule</p>
                    <p className="font-medium flex items-center gap-1">
                      <Car className="h-4 w-4" />
                      {bonSortie.matriculeVehicule}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">N° CIN</p>
                    <p className="font-medium flex items-center gap-1">
                      <Hash className="h-4 w-4" />
                      {bonSortie.numCIN}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations client/destinataire */}
            {(bonSortie.client || bonSortie.destinataire) && (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Informations client / destinataire
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {bonSortie.client ? (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Client</p>
                        <p className="font-medium">{bonSortie.client.nom}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-4 w-4" />
                          {bonSortie.client.telephone}
                        </p>
                      </div>
                      {bonSortie.client.email && (
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {bonSortie.client.email}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Destinataire</p>
                      <p className="font-medium">{bonSortie.destinataire}</p>
                    </div>
                  )}
                  {bonSortie.adresseLivraison && (
                    <div className="mt-4 space-y-1">
                      <p className="text-sm text-muted-foreground">Adresse de livraison</p>
                      <p className="font-medium">{bonSortie.adresseLivraison}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Liste des produits */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Produits
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
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Quantité
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          P.U HT
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          P.U TTC
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Total HT
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-medium">
                          Total TTC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {bonSortie.lignes.map((ligne) => (
                        <tr key={ligne.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">
                            {ligne.product.designation}
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">
                            {ligne.quantite}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.prixUnitaireHT)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.prixUnitaireTTC)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.totalHT)}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            {formatCurrency(ligne.totalTTC)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold">
                          Total Général HT:
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatCurrency(bonSortie.totalHT)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-primary">
                          {formatCurrency(bonSortie.totalTTC)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Observation */}
            {bonSortie.observation && (
              <Card>
                <CardHeader>
                  <CardTitle>Observation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{bonSortie.observation}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}