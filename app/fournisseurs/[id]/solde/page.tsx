'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Info, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  adresse: string;
  solde: number;
}

interface CreditAPayer {
  id: string;
  date: string;
  montant: number;
  reference: string;
  statut: string;
  typeReglement: string;
  isFromMixte: boolean;
  bonsEntree: Array<{
    bonEntree: {
      id: string;
      numero: string;
      date: string;
      totalTTC: number;
    };
  }>;
}

interface Paiement {
  id: string;
  date: string;
  montant: number;
  typeReglement: string;
  reference: string;
  statut: string;
  banque: string;
  bonsEntree: Array<{
    beId: string;
    beNumero: string;
    montantApplique: number;
  }>;
}

interface BonEntree {
  id: string;
  numero: string;
  date: string;
  totalTTC: number;
  type: string;
  statut: string;
}

export default function SoldeFournisseurPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const fournisseurId = params.id as string;

  const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);
  const [creditsAPayer, setCreditsAPayer] = useState<CreditAPayer[]>([]);
  const [bonsEntree, setBonsEntree] = useState<BonEntree[]>([]);
  const [historique, setHistorique] = useState<Paiement[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [montantPaiement, setMontantPaiement] = useState(0);
  const [reference, setReference] = useState('');
  const [datePaiement, setDatePaiement] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (fournisseurId) {
      fetchSoldeFournisseur();
    }
  }, [fournisseurId]);

  const fetchSoldeFournisseur = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/fournisseurs/${fournisseurId}/solde`);

      if (!response.ok) {
        throw new Error('Erreur lors du chargement');
      }

      const data = await response.json();

      setFournisseur(data.fournisseur || null);
      setCreditsAPayer(data.creditsAPayer || []);
      setBonsEntree(data.bonsEntree || []);
      setHistorique(data.historiquePaiements || []);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: 'Erreur',
        description: 'Impossible de charger les données du fournisseur',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPayment = async () => {
    if (montantPaiement <= 0) {
      toast({
        title: 'Erreur',
        description: 'Le montant doit être supérieur à 0',
        variant: 'destructive',
      });
      return;
    }

    if (fournisseur && montantPaiement > fournisseur.solde) {
      toast({
        title: 'Erreur',
        description: `Le montant (${montantPaiement.toFixed(2)} DT) dépasse le solde dû (${fournisseur.solde.toFixed(2)} DT)`,
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch(`/api/fournisseurs/${fournisseurId}/solde/payment-simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montant: montantPaiement,
          reference: reference,
          datePaiement: datePaiement
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast({
        title: 'Succès',
        description: 'Paiement fournisseur enregistré avec succès',
      });

      setOpenDialog(false);
      setMontantPaiement(0);
      setReference('');
      setDatePaiement(format(new Date(), 'yyyy-MM-dd'));

      fetchSoldeFournisseur();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const getStatutBadge = (statut: string) => {
    const colors: Record<string, string> = {
      'EN_ATTENTE': 'bg-yellow-500',
      'PAYE': 'bg-green-500',
      'PARTIELLE': 'bg-orange-500',
      'ENCAISSE': 'bg-blue-500'
    };
    const labels: Record<string, string> = {
      'EN_ATTENTE': 'En attente',
      'PAYE': 'Payé',
      'PARTIELLE': 'Partielle',
      'ENCAISSE': 'Encaissé'
    };
    return <Badge className={colors[statut] || 'bg-gray-500'}>{labels[statut] || statut}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Solde Fournisseur" subtitle="Chargement..." />
          <div className="flex justify-center items-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p>Chargement des données...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!fournisseur) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Solde Fournisseur" subtitle="Fournisseur non trouvé" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="py-8">
                <div className="text-center text-red-600">
                  <h2 className="text-2xl font-bold mb-2">Fournisseur non trouvé</h2>
                  <p>Le fournisseur que vous recherchez n'existe pas ou a été supprimé.</p>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title={`Solde : ${fournisseur.nom}`} subtitle="Gestion des crédits et paiements fournisseurs" />
        <main className="p-4 md:p-6">
          {/* Bouton retour */}
          <div className="mb-6">
            <Link href="/fournisseurs/solde">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
          </div>

          {/* En-tête avec solde */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{fournisseur.nom}</h1>
            <p className="text-gray-600 mb-4">
              {fournisseur.telephone} {fournisseur.email && `| ${fournisseur.email}`}
            </p>

            {/* Info sur la logique de crédit */}
          
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <Card className="bg-red-50 border-red-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Solde Restant dû</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-red-600">
                    {fournisseur.solde?.toFixed(2) || '0.00'} DT
                  </div>
                  <p className="text-xs text-red-500 mt-1">Montant des crédits à payer</p>
                </CardContent>
              </Card>
              {/* <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">Total des BE</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-600">
                    {bonsEntree.reduce((sum, be) => sum + (be.totalTTC || 0), 0).toFixed(2)} DT
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Total des bons d'entrée</p>
                </CardContent>
              </Card> */}
            </div>
          </div>

          <Tabs defaultValue="historique" className="space-y-4">
            <TabsContent value="credits">
              {/* <Card>
                <CardHeader>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <CardTitle>Crédits à payer</CardTitle>
                      <CardDescription>
                        Tous les paiements effectués par CREDIT lors de la création des BE
                      </CardDescription>
                    </div>
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                          Payer un crédit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Paiement fournisseur</DialogTitle>
                          <DialogDescription>
                            Entrez le montant à payer (Espèces) pour diminuer le solde du fournisseur
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Montant à payer</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 500"
                              min={0}
                              max={fournisseur.solde}
                              step={0.01}
                              value={montantPaiement || ''}
                              onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)}
                              className="text-lg font-bold"
                            />
                            <p className="text-sm text-gray-500">
                              Solde restant dû: {fournisseur.solde.toFixed(2)} DT
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Référence (Optionnel)</Label>
                            <Input
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="N° de reçu, référence paiement"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Date de paiement</Label>
                            <Input
                              type="date"
                              value={datePaiement}
                              onChange={(e) => setDatePaiement(e.target.value)}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            Annuler
                          </Button>
                          <Button
                            onClick={handleSubmitPayment}
                            disabled={montantPaiement <= 0 || montantPaiement > fournisseur.solde}
                          >
                            Enregistrer le paiement
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                <CardContent>
                  {creditsAPayer && creditsAPayer.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date du crédit</TableHead>
                          <TableHead>BE associé</TableHead>
                          <TableHead>Montant à payer</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditsAPayer.map((credit: any) => (
                          <TableRow key={credit.id}>
                            <TableCell>
                              {credit.date ? format(new Date(credit.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell>
                              {credit.bonsEntree?.map((be: any) => be.bonEntree?.numero).join(', ') || '-'}
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              {credit.montant?.toFixed(2) || '0.00'} DT
                            </TableCell>
                            <TableCell>{credit.reference || '-'}</TableCell>
                            <TableCell>
                              {credit.isFromMixte ? 'Mixte' : 'Direct'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun crédit à payer pour ce fournisseur
                    </div>
                  )}
                </CardContent>
              </Card> */}
            </TabsContent>

            <TabsContent value="bons">
              {/* <Card>
                <CardHeader>
                  <CardTitle>Bons d'Entrée</CardTitle>
                  <CardDescription>
                    Liste de tous les BE du fournisseur
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {bonsEntree && bonsEntree.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>N° BE</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Total TTC</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bonsEntree.map((be) => (
                          <TableRow key={be.id}>
                            <TableCell className="font-medium">{be.numero}</TableCell>
                            <TableCell>
                              {be.date ? format(new Date(be.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell>{be.type}</TableCell>
                            <TableCell>{be.totalTTC?.toFixed(2) || '0.00'} DT</TableCell>
                            <TableCell>{getStatutBadge(be.statut)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun bon d'entrée trouvé pour ce fournisseur
                    </div>
                  )}
                </CardContent>
              </Card> */}
            </TabsContent>

            <TabsContent value="historique">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                      <CardTitle>Historique des Paiements</CardTitle>
                    </div>
                    <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                      <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700">
                          Payer un crédit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md">
                        <DialogHeader>
                          <DialogTitle>Paiement fournisseur</DialogTitle>
                          <DialogDescription>
                            Entrez le montant à payer (Espèces) pour diminuer le solde du fournisseur
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Montant à payer</Label>
                            <Input
                              type="number"
                              placeholder="Ex: 500"
                              min={0}
                              max={fournisseur.solde}
                              step={0.01}
                              value={montantPaiement || ''}
                              onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)}
                              className="text-lg font-bold"
                            />
                            <p className="text-sm text-gray-500">
                              Solde restant dû: {fournisseur.solde.toFixed(2)} DT
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Référence (Optionnel)</Label>
                            <Input
                              value={reference}
                              onChange={(e) => setReference(e.target.value)}
                              placeholder="N° de reçu, référence paiement"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Date de paiement</Label>
                            <Input
                              type="date"
                              value={datePaiement}
                              onChange={(e) => setDatePaiement(e.target.value)}
                            />
                          </div>
                        </div>

                        <DialogFooter>
                          <Button variant="outline" onClick={() => setOpenDialog(false)}>
                            Annuler
                          </Button>
                          <Button
                            onClick={handleSubmitPayment}
                            disabled={montantPaiement <= 0 || montantPaiement > fournisseur.solde}
                          >
                            Enregistrer le paiement
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardHeader>
                {/* <CardContent>
                  {creditsAPayer && creditsAPayer.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date du crédit</TableHead>
                          <TableHead>BE associé</TableHead>
                          <TableHead>Montant à payer</TableHead>
                          <TableHead>Référence</TableHead>
                          <TableHead>Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creditsAPayer.map((credit: any) => (
                          <TableRow key={credit.id}>
                            <TableCell>
                              {credit.date ? format(new Date(credit.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell>
                              {credit.bonsEntree?.map((be: any) => be.bonEntree?.numero).join(', ') || '-'}
                            </TableCell>
                            <TableCell className="font-bold text-red-600">
                              {credit.montant?.toFixed(2) || '0.00'} DT
                            </TableCell>
                            <TableCell>{credit.reference || '-'}</TableCell>
                            <TableCell>
                              {credit.isFromMixte ? 'Mixte' : 'Direct'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun crédit à payer pour ce fournisseur
                    </div>
                  )}
                </CardContent> */}
              </Card>
              <Card>
                <CardHeader>
                  {/* <CardTitle>Historique des Paiements</CardTitle> */}
                  <CardDescription>
                    Tous les paiements effectués pour ce fournisseur
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historique && historique.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Montant</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Référence</TableHead>
                          {/* <TableHead>BE concernés</TableHead> */}
                          {/* <TableHead>Statut</TableHead> */}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {historique.map((paiement) => (
                          <TableRow key={paiement.id}>
                            <TableCell>
                              {paiement.date ? format(new Date(paiement.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                            </TableCell>
                            <TableCell className="font-bold text-green-600">
                              {paiement.montant?.toFixed(2) || '0.00'} DT
                            </TableCell>
                            <TableCell>{paiement.typeReglement}</TableCell>
                            <TableCell>{paiement.reference || '-'}</TableCell>
                            {/* <TableCell>
                              <div className="space-y-1">
                                {paiement.bonsEntree && paiement.bonsEntree.map((be) => (
                                  <div key={be.beId} className="text-sm">
                                    {be.beNumero}: {be.montantApplique?.toFixed(2) || '0.00'} DT
                                  </div>
                                ))}
                              </div>
                            </TableCell> */}
                            {/* <TableCell>{getStatutBadge(paiement.statut)}</TableCell> */}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Aucun historique de paiement trouvé
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}