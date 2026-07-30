'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Loader2, MessageCircle } from 'lucide-react';
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
import { cn } from "@/lib/utils";

interface PaiementWithWhatsApp extends Paiement {
    isSendingWhatsApp?: boolean;
}
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openSoldeInitialDialog, setOpenSoldeInitialDialog] = useState(false);
    const [montantInitial, setMontantInitial] = useState(0);
    const [referenceInitial, setReferenceInitial] = useState('');
    const [isSubmittingInitial, setIsSubmittingInitial] = useState(false);
    const [sendingWhatsAppId, setSendingWhatsAppId] = useState<string | null>(null);

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

    const handleSubmitSoldeInitial = async () => {
        if (isSubmittingInitial) return;

        if (montantInitial <= 0) {
            toast({
                title: 'Erreur',
                description: 'Le montant doit être supérieur à 0',
                variant: 'destructive',
            });
            return;
        }

        setIsSubmittingInitial(true);

        try {
            const response = await fetch(`/api/clients/${clientId}/solde/initial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    montantInitial: montantInitial,
                    reference: referenceInitial,
                    datePaiement: format(new Date(), 'yyyy-MM-dd')
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error);
            }

            const data = await response.json();

            // Mise à jour IMMÉDIATE du solde dans le state client
            if (client) {
                setClient({
                    ...client,
                    solde: data.nouveauSolde
                });
            }

            toast({
                title: 'Succès',
                description: `${montantInitial.toFixed(2)} DT ajouté au solde du client. Nouveau solde: ${data.nouveauSolde.toFixed(2)} DT`,
            });

            // Réinitialiser le formulaire et fermer le dialogue
            setOpenSoldeInitialDialog(false);
            setMontantInitial(0);
            setReferenceInitial('');

            // Recharger les données
            await fetchSoldeClient();

        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmittingInitial(false);
        }
    };

    const handleSubmitPayment = async () => {
        if (isSubmitting) return;

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

        setIsSubmitting(true);

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

            const data = await response.json();

            // Mise à jour IMMÉDIATE du solde dans le state client
            if (client) {
                const nouveauSolde = data.soldeRestant !== undefined
                    ? data.soldeRestant
                    : client.solde - montantPaiement;

                setClient({
                    ...client,
                    solde: nouveauSolde
                });
            }

            toast({
                title: 'Succès',
                description: `Paiement de ${montantPaiement.toFixed(2)} DT enregistré avec succès. Nouveau solde: ${data.soldeRestant?.toFixed(2) || (client!.solde - montantPaiement).toFixed(2)} DT`,
            });

            // Ouvrir WhatsApp si l'URL est disponible
            if (data.whatsappUrl) {
                window.open(data.whatsappUrl, '_blank');
            }

            // Réinitialiser le formulaire et fermer le dialogue
            setOpenDialog(false);
            setMontantPaiement(0);
            setReference('');
            setDatePaiement(format(new Date(), 'yyyy-MM-dd'));

            // Recharger toutes les données pour être sûr (optionnel mais recommandé)
            await fetchSoldeClient();

        } catch (error: any) {
            toast({
                title: 'Erreur',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendWhatsApp = async (paiement: Paiement) => {
        if (!client?.telephone) {
            toast({
                title: "Erreur",
                description: "Ce client n'a pas de numéro de téléphone",
                variant: "destructive",
            });
            return;
        }

        setSendingWhatsAppId(paiement.id);

        try {
            const response = await fetch(`/api/reglements-clients/${paiement.id}/whatsapp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Erreur lors de la génération du message WhatsApp');
            }

            if (data.whatsappUrl) {
                window.open(data.whatsappUrl, '_blank');
                toast({
                    title: "Succès",
                    description: "Message WhatsApp ouvert dans un nouvel onglet",
                });
            } else {
                throw new Error('URL WhatsApp non générée');
            }

        } catch (error) {
            console.error('Error sending WhatsApp:', error);
            toast({
                title: "Erreur",
                description: error instanceof Error ? error.message : "Impossible d'envoyer le message WhatsApp",
                variant: "destructive",
            });
        } finally {
            setSendingWhatsAppId(null);
        }
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
                                </CardContent>
                            </Card>
                        </div>
                    </div>

                    <Tabs defaultValue="historique" className="space-y-4">
                        <TabsContent value="credits">
                        </TabsContent>

                        <TabsContent value="historique">
                            <div className="flex justify-between items-center flex-wrap gap-4">
                                <CardTitle></CardTitle>
                            </div>
                            <div className="flex gap-2">
                                {/* Bouton Solde Initial */}
                                <Dialog open={openSoldeInitialDialog} onOpenChange={setOpenSoldeInitialDialog}>
                                    <DialogTrigger asChild>
                                        <Button className="bg-blue-600 hover:bg-blue-700">
                                            Solde Initial
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>Ajouter un solde initial</DialogTitle>
                                            <DialogDescription>
                                                Ajoutez un montant au solde du client (crédit initial)
                                            </DialogDescription>
                                        </DialogHeader>

                                        <div className="space-y-4 py-4">
                                            <div className="space-y-2">
                                                <Label>Montant à ajouter</Label>
                                                <Input
                                                    type="number"
                                                    placeholder="Ex: 1000"
                                                    min={0}
                                                    step={0.01}
                                                    value={montantInitial || ''}
                                                    onChange={(e) => setMontantInitial(parseFloat(e.target.value) || 0)}
                                                    className="text-lg font-bold"
                                                    disabled={isSubmittingInitial}
                                                />
                                                <p className="text-sm text-gray-500">
                                                    Solde actuel: {client?.solde?.toFixed(2) || '0.00'} DT
                                                </p>
                                                <p className="text-sm text-blue-600">
                                                    Nouveau solde: {(client?.solde || 0) + montantInitial} DT
                                                </p>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Référence (Optionnel)</Label>
                                                <Input
                                                    value={referenceInitial}
                                                    onChange={(e) => setReferenceInitial(e.target.value)}
                                                    placeholder="Ex: Crédit initial"
                                                    disabled={isSubmittingInitial}
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() => setOpenSoldeInitialDialog(false)}
                                                disabled={isSubmittingInitial}
                                            >
                                                Annuler
                                            </Button>
                                            <Button
                                                onClick={handleSubmitSoldeInitial}
                                                disabled={montantInitial <= 0 || isSubmittingInitial}
                                                className="gap-2"
                                            >
                                                {isSubmittingInitial ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Ajout...
                                                    </>
                                                ) : (
                                                    'Ajouter au solde'
                                                )}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>

                                {/* Bouton Encaisser existant */}
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
                                                    disabled={isSubmitting}
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
                                                    disabled={isSubmitting}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Date d'encaissement</Label>
                                                <Input
                                                    type="date"
                                                    value={datePaiement}
                                                    onChange={(e) => setDatePaiement(e.target.value)}
                                                    disabled={isSubmitting}
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button
                                                variant="outline"
                                                onClick={() => setOpenDialog(false)}
                                                disabled={isSubmitting}
                                            >
                                                Annuler
                                            </Button>
                                            <Button
                                                onClick={handleSubmitPayment}
                                                disabled={montantPaiement <= 0 || montantPaiement > client.solde || isSubmitting}
                                                className="gap-2"
                                            >
                                                {isSubmitting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Enregistrement...
                                                    </>
                                                ) : (
                                                    'Enregistrer l\'encaissement'
                                                )}
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
                                                    <TableHead className="text-center">WhatsApp</TableHead>
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
                                                        <TableCell>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className={cn(
                                                                    "gap-2 h-8",
                                                                    client?.telephone
                                                                        ? "bg-green-50 hover:bg-green-100 border-green-200"
                                                                        : "opacity-50 cursor-not-allowed"
                                                                )}
                                                                onClick={() => {
                                                                    if (client?.telephone) {
                                                                        handleSendWhatsApp(paiement);
                                                                    } else {
                                                                        toast({
                                                                            title: "Information",
                                                                            description: "Ce client n'a pas de numéro de téléphone",
                                                                        });
                                                                    }
                                                                }}
                                                                disabled={sendingWhatsAppId === paiement.id || !client?.telephone}
                                                                title={client?.telephone ? "Envoyer le message WhatsApp" : "Client sans téléphone"}
                                                            >
                                                                {sendingWhatsAppId === paiement.id ? (
                                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600" />
                                                                ) : (
                                                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                                                )}
                                                                <span className="text-xs">WhatsApp</span>
                                                            </Button>
                                                        </TableCell>
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