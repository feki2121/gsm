'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  ArrowLeft, 
  Calendar, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Landmark, 
  Receipt, 
  Truck,
  User,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from '@/components/layout/header';

interface ReglementDetails {
  id: string;
  date: string;
  montant: number;
  typeReglement: string;
  reference: string | null;
  statut: string;
  echeance: string | null;
  banque: string | null;
  domiciliation: string | null;
  imageUrl?: string | null;
  detailsMixte: Array<{
    type: string;
    montant: number;
    montantEncaisse?: number;
    reference?: string;
    banque?: string;
    domiciliation?: string;
    echeance?: string;
    statut?: string;
    imageUrl?: string;
  }> | null;
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
  };
  chauffeur: {
    id: string;
    nom: string;
    user: {
      nom: string;
    };
  } | null;
  factures: Array<{
    montantApplique: number;
    facture: {
      id: string;
      numero: string;
      totalTTC: number;
      date: string;
    };
  }>;
  bonLivraisons: Array<{
    montant: number;
    bonLivraison: {
      id: string;
      numero: string;
      montantTotal: number;
      date: string;
      client: {
        nom: string;
      };
    };
  }>;
}

const statutConfig = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PARTIELLE: { label: 'Partiel', color: 'bg-blue-100 text-blue-800', icon: AlertCircle },
  ENCAISSE: { label: 'Encaissé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  PAYE: { label: 'Payé', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJETE: { label: 'Rejeté', color: 'bg-red-100 text-red-800', icon: XCircle },
  RENOUVELE: { label: 'Renouvelé', color: 'bg-orange-100 text-orange-800', icon: RefreshCw }
};

const typeReglementLabels: Record<string, string> = {
  ESPECE: 'Espèces',
  CHEQUE: 'Chèque',
  TRAITE_DOMICILE: 'Traite domiciliée',
  TRAITE_BANCAIRE: 'Traite bancaire',
  VIREMENT: 'Virement',
  CREDIT: 'Crédit',
  MIXTE: 'Mixte'
};

export default function ReglementDetailsPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const [reglement, setReglement] = useState<ReglementDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReglement();
  }, [params.id]);

  const fetchReglement = async () => {
    try {
      const response = await fetch(`/api/reglements-clients/${params.id}`);
      if (!response.ok) {
        throw new Error('Erreur lors du chargement du règlement');
      }
      const data = await response.json();
      setReglement(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  const getStatutConfig = (statut: string) => {
    return statutConfig[statut as keyof typeof statutConfig] || { 
      label: statut, 
      color: 'bg-gray-100 text-gray-800', 
      icon: AlertCircle 
    };
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-TN', { 
      style: 'currency', 
      currency: 'TND' 
    }).format(montant);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Non spécifiée';
    return format(new Date(date), 'dd MMMM yyyy', { locale: fr });
  };

  const renderDetailsByType = () => {
    if (!reglement) return null;

    switch (reglement.typeReglement) {
      case 'CHEQUE':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Landmark className="h-5 w-5" />
                Détails du chèque
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de chèque</p>
                  <p className="font-medium">{reglement.reference || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Banque</p>
                  <p className="font-medium">{reglement.banque || 'Non spécifiée'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domiciliation</p>
                  <p className="font-medium">{reglement.domiciliation || 'Non spécifiée'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'échéance</p>
                  <p className="font-medium">{formatDate(reglement.echeance)}</p>
                </div>
                {reglement.imageUrl && (
                  <div className="col-span-2 flex justify-center mt-2">
                    <img src={reglement.imageUrl} alt="Justificatif" className="w-full rounded-lg object-contain max-h-[70vh]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'TRAITE_DOMICILE':
      case 'TRAITE_BANCAIRE':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Détails de la traite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Numéro de traite</p>
                  <p className="font-medium">{reglement.reference || 'Non spécifié'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Banque</p>
                  <p className="font-medium">{reglement.banque || 'Non spécifiée'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Domiciliation</p>
                  <p className="font-medium">{reglement.domiciliation || 'Non spécifiée'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date d'échéance</p>
                  <p className="font-medium">{formatDate(reglement.echeance)}</p>
                </div>
                {reglement.imageUrl && (
                  <div className="col-span-2 flex justify-center mt-2">
                    <img src={reglement.imageUrl} alt="Justificatif" className="w-full rounded-lg object-contain max-h-[70vh]" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );

      case 'MIXTE':
        const detailsArray = reglement.detailsMixte && Array.isArray(reglement.detailsMixte) 
          ? reglement.detailsMixte 
          : reglement.detailsMixte && typeof reglement.detailsMixte === 'object' && !Array.isArray(reglement.detailsMixte)
          ? Object.entries(reglement.detailsMixte).map(([type, montant]) => ({ type, montant, montantEncaisse: 0 }))
          : [];

        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Détails du règlement mixte
              </CardTitle>
              <CardDescription>
                Répartition du paiement par mode de règlement
              </CardDescription>
            </CardHeader>
            <CardContent>
              {detailsArray.length > 0 ? (
                <div className="space-y-4">
                  {detailsArray.map((detail: any, index: number) => {
                    const encaisse = detail.montantEncaisse || 0;
                    const reste = detail.montant - encaisse;
                    const estPartiel = encaisse > 0 && reste > 0;
                    
                    return (
                      <div key={index} className="border rounded-lg p-4 space-y-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            {detail.type === 'CHEQUE' && <Landmark className="h-4 w-4 text-blue-500" />}
                            {(detail.type === 'TRAITE_BANCAIRE' || detail.type === 'TRAITE_DOMICILE') && 
                              <Receipt className="h-4 w-4 text-purple-500" />
                            }
                            {detail.type === 'ESPECE' && <DollarSign className="h-4 w-4 text-green-500" />}
                            {detail.type === 'VIREMENT' && <CreditCard className="h-4 w-4 text-indigo-500" />}
                            {detail.type === 'CREDIT' && <Calendar className="h-4 w-4 text-orange-500" />}
                            <span className="font-semibold text-lg">
                              {typeReglementLabels[detail.type] || detail.type}
                            </span>
                          </div>
                          <span className="font-bold text-xl">{formatMontant(detail.montant)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mt-2 pt-2 border-t text-sm">
                          {detail.reference && (
                            <div>
                              <p className="text-muted-foreground">Référence</p>
                              <p className="font-medium">{detail.reference}</p>
                            </div>
                          )}
                          {detail.banque && (
                            <div>
                              <p className="text-muted-foreground">Banque</p>
                              <p className="font-medium">{detail.banque}</p>
                            </div>
                          )}
                          {detail.domiciliation && (
                            <div>
                              <p className="text-muted-foreground">Domiciliation</p>
                              <p className="font-medium">{detail.domiciliation}</p>
                            </div>
                          )}
                          {detail.echeance && (
                            <div>
                              <p className="text-muted-foreground">Échéance</p>
                              <p className="font-medium">{formatDate(detail.echeance)}</p>
                            </div>
                          )}
                        </div>
                        
                        {(encaisse > 0 || detail.statut) && (
                          <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                            {encaisse > 0 && (
                              <Badge className="bg-green-100 text-green-800">
                                Encaissé: {formatMontant(encaisse)}
                              </Badge>
                            )}
                            {estPartiel && (
                              <Badge className="bg-blue-100 text-blue-800">
                                Reste: {formatMontant(reste)}
                              </Badge>
                            )}
                            {detail.statut === 'EN_ATTENTE' && encaisse === 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800">En attente</Badge>
                            )}
                          </div>
                        )}
                        
                        {detail.imageUrl && (
                          <div className="mt-2">
                            <img 
                              src={detail.imageUrl} 
                              alt={`Justificatif ${detail.type}`} 
                              className="w-full rounded-lg object-contain max-h-[200px]"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  <Separator />
                  
                  <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-lg">Total général</span>
                    <span className="font-bold text-2xl text-primary">{formatMontant(reglement.montant)}</span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  Aucun détail disponible pour ce règlement mixte
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Détails du paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {reglement.reference && (
                <div>
                  <p className="text-sm text-muted-foreground">Référence</p>
                  <p className="font-medium">{reglement.reference}</p>
                </div>
              )}
              {reglement.banque && (
                <div>
                  <p className="text-sm text-muted-foreground">Banque</p>
                  <p className="font-medium">{reglement.banque}</p>
                </div>
              )}
              {reglement.domiciliation && (
                <div>
                  <p className="text-sm text-muted-foreground">Domiciliation</p>
                  <p className="font-medium">{reglement.domiciliation}</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails du règlement" subtitle="Chargement..." />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (error || !reglement) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails du règlement" subtitle="Erreur" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <XCircle className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Erreur</h2>
                <p className="text-muted-foreground mb-4">{error || 'Règlement non trouvé'}</p>
                <Button onClick={() => router.back()}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour
                </Button>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  const statutInfo = getStatutConfig(reglement.statut);
  const StatutIcon = statutInfo.icon;

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header 
          title="Détails du règlement" 
          subtitle={`Règlement client - ${reglement.client.nom}`} 
        />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Header avec bouton retour */}
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour à la liste
              </Button>
              <Badge className={`${statutInfo.color} flex items-center gap-2 px-3 py-1`}>
                <StatutIcon className="h-3 w-3" />
                {statutInfo.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Informations principales */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Receipt className="h-5 w-5" />
                      Informations générales
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Montant</p>
                            <p className="text-2xl font-bold">{formatMontant(reglement.montant)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Mode de règlement</p>
                            <p className="font-medium">{typeReglementLabels[reglement.typeReglement] || reglement.typeReglement}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Date de règlement</p>
                            <p className="font-medium">{formatDate(reglement.date)}</p>
                          </div>
                        </div>
                        {reglement.echeance && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="text-sm text-muted-foreground">Date d'échéance</p>
                              <p className="font-medium">{formatDate(reglement.echeance)}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Détails spécifiques selon le type */}
                {renderDetailsByType()}
              </div>

              {/* Informations client et chauffeur */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Client
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Nom</p>
                      <p className="font-medium">{reglement.client.nom}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{reglement.client.telephone}</p>
                    </div>
                    {reglement.client.email && (
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{reglement.client.email}</p>
                      </div>
                    )}
                    <Button 
                      variant="outline" 
                      className="w-full mt-2"
                      onClick={() => router.push(`/clients/${reglement.client.id}`)}
                    >
                      Voir le client
                    </Button>
                  </CardContent>
                </Card>

                {reglement.chauffeur && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Truck className="h-5 w-5" />
                        Chauffeur
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Nom</p>
                        <p className="font-medium">{reglement.chauffeur.user.nom}</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Factures associées */}
            {reglement.factures.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Factures associées
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° Facture</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant total</TableHead>
                        <TableHead>Montant appliqué</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reglement.factures.map((item) => (
                        <TableRow key={item.facture.id}>
                          <TableCell className="font-medium">{item.facture.numero}</TableCell>
                          <TableCell>{formatDate(item.facture.date)}</TableCell>
                          <TableCell>{formatMontant(item.facture.totalTTC)}</TableCell>
                          <TableCell>{formatMontant(item.montantApplique)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/factures/${item.facture.id}`)}
                            >
                              Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Bons de livraison associés */}
            {reglement.bonLivraisons.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5" />
                    Bons de livraison associés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>N° BL</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Montant total</TableHead>
                        <TableHead>Montant payé</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reglement.bonLivraisons.map((item) => (
                        <TableRow key={item.bonLivraison.id}>
                          <TableCell className="font-medium">{item.bonLivraison.numero}</TableCell>
                          <TableCell>{formatDate(item.bonLivraison.date)}</TableCell>
                          <TableCell>{formatMontant(item.bonLivraison.montantTotal)}</TableCell>
                          <TableCell>{formatMontant(item.montant)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => router.push(`/bons-livraison/${item.bonLivraison.id}`)}
                            >
                              Voir
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

// Ajouter l'icône RefreshCw manquante
function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}