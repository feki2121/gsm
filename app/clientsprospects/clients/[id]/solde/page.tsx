'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
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
import { Info } from 'lucide-react';

interface BL {
    id: string;
    numero: string;
    date: string;
    montantTotal: number;
    montantPaye: number;
    montantRestant: number;
    statut: string;
    reglements: any[];
}

interface Paiement {
    id: string;
    date: string;
    montant: number;
    typeReglement: string;
    reference: string;
    statut: string;
    banque: string;
    bls: Array<{
        blId: string;
        blNumero: string;
        montantApplique: number;
    }>;
}

interface Client {
    id: string;
    nom: string;
    telephone: string;
    email: string;
    solde: number;
    creditAutorise: number;
    creditDisponible: number;
    estAutoriseCredit: boolean;
}

export default function SoldeClientPage() {
  const { sidebarClasses } = useSidebar();
    const params = useParams();
    const clientId = params.id as string;

    const [client, setClient] = useState<Client | null>(null);
    const [bls, setBls] = useState<BL[]>([]);
    const [creditsAPayer, setCreditsAPayer] = useState<any[]>([]);
    const [historique, setHistorique] = useState<Paiement[]>([]);
    const [loading, setLoading] = useState(true);
    const [openDialog, setOpenDialog] = useState(false);
    const [montantPaiement, setMontantPaiement] = useState(0);
    const [reference, setReference] = useState('');
    const [datePaiement, setDatePaiement] = useState(format(new Date(), 'yyyy-MM-dd'));

    useEffect(() => {
        if (clientId) {
            fetchSoldeClient();
        }
    }, [clientId]);

    const fetchSoldeClient = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/clients/${clientId}/solde`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement');
            }

            const data = await response.json();

            setClient(data.client || null);
            setBls(data.bonsLivraison || []);
            setCreditsAPayer(data.creditsAPayer || []);
            setHistorique(data.historiquePaiements || []);
        } catch (error) {
            console.error('Erreur:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger les données du client',
                variant: 'destructive',
            });
            setBls([]);
            setCreditsAPayer([]);
            setHistorique([]);
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

        if (client && montantPaiement > client.solde) {
            toast({
                title: 'Erreur',
                description: `Le montant (${montantPaiement.toFixed(2)} DT) dépasse le solde dû (${client.solde.toFixed(2)} DT)`,
                variant: 'destructive',
            });
            return;
        }

        try {
            const response = await fetch(`/api/clients/${clientId}/solde/payment-simple`, {
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
                description: 'Paiement enregistré avec succès',
            });

            setOpenDialog(false);
            setMontantPaiement(0);
            setReference('');
            setDatePaiement(format(new Date(), 'yyyy-MM-dd'));

            fetchSoldeClient();
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
            'LIVRE': 'bg-green-500',
            'ANNULE': 'bg-red-500',
            'ENCAISSE': 'bg-blue-500',
            'PAYE': 'bg-green-500',
            'PARTIELLE': 'bg-orange-500'
        };
        const labels: Record<string, string> = {
            'EN_ATTENTE': 'En attente',
            'LIVRE': 'Livré',
            'ANNULE': 'Annulé',
            'ENCAISSE': 'Encaissé',
            'PAYE': 'Payé',
            'PARTIELLE': 'Partielle'
        };
        return <Badge className={colors[statut] || 'bg-gray-500'}>{labels[statut] || statut}</Badge>;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                    <p>Chargement des données...</p>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Solde Client" subtitle="Gestion des paiements" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center text-red-600">
                                    <h2 className="text-2xl font-bold mb-2">Client non trouvé</h2>
                                    <p>Le client que vous recherchez n'existe pas ou a été supprimé.</p>
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
                <Header title={`Solde : ${client.nom}`} subtitle="Gestion des crédits et paiements" />
                <main className="p-4 md:p-6">
                    <div className="mb-6">
                        <Link href="/clients/solde">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour à la liste
                            </Button>
                        </Link>
                    </div>
                    {/* En-tête avec solde */}
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">{client.nom}</h1>
                        <p className="text-gray-600 mb-4">
                            {client.telephone} {client.email && `| ${client.email}`}
                        </p>


                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                            <Card className="bg-red-50 border-red-200">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-red-700">Solde Restant dû</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold text-red-600">
                                        {client.solde?.toFixed(2) || '0.00'} DT
                                    </div>
                                    {/* <p className="text-xs text-red-500 mt-1">Montant des crédits à payer</p> */}
                                </CardContent>
                            </Card>
                            {/* <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Crédit Autorisé</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-blue-600">
                                        {client.creditAutorise?.toFixed(2) || '0.00'} DT
                                    </div>
                                </CardContent>
                            </Card> */}
                            {/* <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-gray-500">Crédit Disponible</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">
                                        {client.creditDisponible?.toFixed(2) || '0.00'} DT
                                    </div>
                                </CardContent>
                            </Card> */}
                        </div>
                    </div>

                    <Tabs defaultValue="historique" className="space-y-4">
                        <TabsContent value="credits">
                            <Card>
                                <CardHeader>
                                    {/* <div className="flex justify-between items-center flex-wrap gap-4">
                                        <div>
                                            <CardTitle>Crédits à payer</CardTitle>
                                            <CardDescription>
                                                Tous les paiements effectués par CREDIT lors de la création des BL
                                            </CardDescription>
                                        </div>
                                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-green-600 hover:bg-green-700">
                                                    Encaisser un paiement
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Encaissement d'un paiement</DialogTitle>
                                                    <DialogDescription>
                                                        Entrez le montant encaissé (Espèces) pour diminuer le solde du client
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Montant encaissé (Espèces)</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="Ex: 500"
                                                            min={0}
                                                            max={client.solde}
                                                            step={0.01}
                                                            value={montantPaiement || ''}
                                                            onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)}
                                                            className="text-lg font-bold"
                                                        />
                                                        <p className="text-sm text-gray-500">
                                                            Solde restant dû: {client.solde.toFixed(2)} DT
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
                                                        <Label>Date d'encaissement</Label>
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
                                                        disabled={montantPaiement <= 0 || montantPaiement > client.solde}
                                                    >
                                                        Enregistrer l'encaissement
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div> */}
                                </CardHeader>
                                <CardContent>
                                    {creditsAPayer && creditsAPayer.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date du crédit</TableHead>
                                                    <TableHead>BL associé</TableHead>
                                                    <TableHead>Montant à payer</TableHead>
                                                    <TableHead>Référence</TableHead>
                                                    <TableHead>Statut</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {creditsAPayer.map((credit: any) => (
                                                    <TableRow key={credit.id}>
                                                        <TableCell>
                                                            {credit.date ? format(new Date(credit.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                                                        </TableCell>
                                                        <TableCell>
                                                            {credit.bonLivraisons?.map((bl: any) => bl.bonLivraison?.numero).join(', ') || '-'}
                                                        </TableCell>
                                                        <TableCell className="font-bold text-red-600">
                                                            {credit.montant?.toFixed(2) || '0.00'} DT
                                                        </TableCell>
                                                        <TableCell>{credit.reference || '-'}</TableCell>
                                                        <TableCell>
                                                            <Badge className="bg-yellow-500">
                                                                À payer
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            Aucun crédit à payer pour ce client
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="bls">
                            {/* <Card>
                                <CardHeader>
                                    <CardTitle>Bons de Livraison</CardTitle>
                                    <CardDescription>
                                        Liste de tous les BL du client
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {bls && bls.length > 0 ? (
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>N° BL</TableHead>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead>Total TTC</TableHead>
                                                    <TableHead>Statut</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {bls.map((bl) => (
                                                    <TableRow key={bl.id}>
                                                        <TableCell className="font-medium">{bl.numero}</TableCell>
                                                        <TableCell>
                                                            {bl.date ? format(new Date(bl.date), 'dd/MM/yyyy', { locale: fr }) : '-'}
                                                        </TableCell>
                                                        <TableCell>{bl.montantTotal?.toFixed(2) || '0.00'} DT</TableCell>
                                                        <TableCell>{getStatutBadge(bl.statut)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            Aucun bon de livraison trouvé pour ce client
                                        </div>
                                    )}
                                </CardContent>
                            </Card> */}
                        </TabsContent>

                        <TabsContent value="historique">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                        <div>
                                            <CardTitle></CardTitle>
                                        </div>
                                        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
                                            <DialogTrigger asChild>
                                                <Button className="bg-green-600 hover:bg-green-700">
                                                    Encaisser un paiement
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle>Encaissement d'un paiement</DialogTitle>
                                                    <DialogDescription>
                                                        Entrez le montant encaissé (Espèces) pour diminuer le solde du client
                                                    </DialogDescription>
                                                </DialogHeader>

                                                <div className="space-y-4 py-4">
                                                    <div className="space-y-2">
                                                        <Label>Montant encaissé (Espèces)</Label>
                                                        <Input
                                                            type="number"
                                                            placeholder="Ex: 500"
                                                            min={0}
                                                            max={client.solde}
                                                            step={0.01}
                                                            value={montantPaiement || ''}
                                                            onChange={(e) => setMontantPaiement(parseFloat(e.target.value) || 0)}
                                                            className="text-lg font-bold"
                                                        />
                                                        <p className="text-sm text-gray-500">
                                                            Solde restant dû: {client.solde.toFixed(2)} DT
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
                                                        <Label>Date d'encaissement</Label>
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
                                                        disabled={montantPaiement <= 0 || montantPaiement > client.solde}
                                                    >
                                                        Enregistrer l'encaissement
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>Historique des Paiements</CardTitle>
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
                                                    {/* <TableHead>BL concernés</TableHead> */}
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
                                                                {paiement.bls && paiement.bls.map((bl) => (
                                                                    <div key={bl.blId} className="text-sm">
                                                                        {bl.blNumero}: {bl.montantApplique?.toFixed(2) || '0.00'} DT
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