// app/extraits-clients/[id]/page.tsx
'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Printer, Download, FileText, Calendar, CreditCard, Banknote, Building2, User } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';

interface Transaction {
    id: string;
    date: Date;
    type: 'FACTURE' | 'BON_LIVRAISON' | 'REGLEMENT' | 'CREDIT';
    numero?: string;
    description: string;
    debit: number;
    credit: number;
    solde: number;
    statut?: string;
    reference?: string;
    typeReglement?: string;
    numeroChequeTraite?: string;
}

interface Client {
    id: string;
    nom: string;
    telephone: string;
    email: string;
    adresse?: string;
    matriculeFiscale?: string;
    codePostal?: string;
}

interface ExtraitData {
    client: Client;
    transactions: Transaction[];
    totalDebit: number;
    totalCredit: number;
    soldeFinal: number;
    periode: {
        debut: string;
        fin: string;
    };
}

export default function ExtraitClientPage() {
  const { sidebarClasses } = useSidebar();
    const params = useParams();
    const clientId = params.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    const [client, setClient] = useState<Client | null>(null);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [totalDebit, setTotalDebit] = useState(0);
    const [totalCredit, setTotalCredit] = useState(0);
    const [soldeFinal, setSoldeFinal] = useState(0);

    // Filtres
    const [dateDebut, setDateDebut] = useState(
        format(new Date(new Date().getFullYear(), new Date().getMonth(), 1), 'yyyy-MM-dd')
    );
    const [dateFin, setDateFin] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [typePeriode, setTypePeriode] = useState('mois');
    const [showOnlyNonSoldes, setShowOnlyNonSoldes] = useState(false);

    useEffect(() => {
        if (clientId) {
            fetchExtrait();
        }
    }, [clientId, dateDebut, dateFin, showOnlyNonSoldes]);

    const fetchExtrait = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('dateDebut', dateDebut);
            params.append('dateFin', dateFin);
            if (showOnlyNonSoldes) params.append('showOnlyNonSoldes', 'true');

            const response = await fetch(`/api/clients/${clientId}/extrait?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement');
            }

            const data: ExtraitData = await response.json();

            setClient(data.client);
            setTransactions(data.transactions);
            setTotalDebit(data.totalDebit);
            setTotalCredit(data.totalCredit);
            setSoldeFinal(data.soldeFinal);
        } catch (error) {
            console.error('Erreur:', error);
            toast({
                title: 'Erreur',
                description: 'Impossible de charger l\'extrait de compte',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePeriodeChange = (value: string) => {
        setTypePeriode(value);
        const today = new Date();
        let debut = new Date();

        switch (value) {
            case 'mois':
                debut = new Date(today.getFullYear(), today.getMonth(), 1);
                break;
            case 'trimestre':
                const trimestre = Math.floor(today.getMonth() / 3);
                debut = new Date(today.getFullYear(), trimestre * 3, 1);
                break;
            case 'semestre':
                const semestre = Math.floor(today.getMonth() / 6);
                debut = new Date(today.getFullYear(), semestre * 6, 1);
                break;
            case 'annee':
                debut = new Date(today.getFullYear(), 0, 1);
                break;
            default:
                return;
        }

        setDateDebut(format(debut, 'yyyy-MM-dd'));
        setDateFin(format(today, 'yyyy-MM-dd'));
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const originalTitle = document.title;
        document.title = `Extrait de compte - ${client?.nom || 'Client'}`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Extrait de compte - ${client?.nom}</title>
                <meta charset="utf-8">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: Arial, sans-serif;
                        margin: 0;
                        padding: 20px;
                        color: #333;
                        line-height: 1.5;
                    }
                    
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        padding-bottom: 20px;
                        border-bottom: 2px solid #1a3a5f;
                    }
                    
                    .header h1 {
                        margin: 0 0 8px 0;
                        font-size: 24px;
                        color: #1a3a5f;
                    }
                    
                    .header p {
                        margin: 5px 0;
                        color: #666;
                    }
                    
                    /* Correction principale : affichage horizontal des infos client */
                    .client-info {
                        margin-bottom: 25px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid #1a3a5f;
                    }
                    
                    .client-info .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px 30px;
                    }
                    
                    .client-info .info-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    
                    .client-info .info-label {
                        min-width: 120px;
                        font-weight: 600;
                        color: #555;
                        font-size: 13px;
                    }
                    
                    .client-info .info-value {
                        flex: 1;
                        font-size: 14px;
                        color: #333;
                    }
                    
                    .client-info .full-width {
                        grid-column: span 2;
                    }
                    
                    .periode {
                        text-align: center;
                        margin-bottom: 25px;
                        padding: 10px;
                        background: #e9ecef;
                        border-radius: 6px;
                        font-weight: 600;
                        color: #1a3a5f;
                    }
                    
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 25px;
                        font-size: 13px;
                    }
                    
                    th, td {
                        border: 1px solid #dee2e6;
                        padding: 10px;
                        text-align: left;
                        vertical-align: top;
                    }
                    
                    th {
                        background-color: #f2f2f2;
                        font-weight: 600;
                        color: #1a3a5f;
                    }
                    
                    .text-right {
                        text-align: right;
                    }
                    
                    .text-center {
                        text-align: center;
                    }
                    
                    .badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 4px;
                        font-size: 11px;
                        font-weight: bold;
                    }
                    
                    .badge-credit { background: #ffeb3b; color: #333; }
                    .badge-debit { background: #ff9800; color: #fff; }
                    .badge-paiement { background: #4caf50; color: #fff; }
                    
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #dee2e6;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                    }
                    
                    .totaux {
                        margin-top: 20px;
                        padding: 15px;
                        background: #f9f9f9;
                        border-radius: 6px;
                    }
                    
                    .totaux table {
                        width: auto;
                        float: right;
                        margin-bottom: 0;
                    }
                    
                    @media print {
                        body {
                            margin: 0;
                            padding: 0;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- En-tête -->
                <div class="header">
                    <h1>EXTRAIT DE COMPTE</h1>
                    <p>Période du ${format(new Date(dateDebut), 'dd/MM/yyyy')} au ${format(new Date(dateFin), 'dd/MM/yyyy')}</p>
                </div>

                <!-- Informations client en version horizontale -->
                <div class="client-info">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Raison Sociale :</div>
                            <div class="info-value"><strong>${client?.nom || ''}</strong></div>
                        </div>
                        ${client?.matriculeFiscale ? `
                        <div class="info-item">
                            <div class="info-label">Matricule Fiscale :</div>
                            <div class="info-value">${client.matriculeFiscale}</div>
                        </div>
                        ` : ''}
                        ${client?.telephone ? `
                        <div class="info-item">
                            <div class="info-label">Téléphone :</div>
                            <div class="info-value">${client.telephone}</div>
                        </div>
                        ` : ''}
                        ${client?.email ? `
                        <div class="info-item">
                            <div class="info-label">Email :</div>
                            <div class="info-value">${client.email}</div>
                        </div>
                        ` : ''}
                        ${client?.adresse ? `
                        <div class="info-item full-width">
                            <div class="info-label">Adresse :</div>
                            <div class="info-value">${client.adresse} ${client.codePostal ? `- ${client.codePostal}` : ''}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Tableau des transactions -->
                ${generatePrintTable()}

                <!-- Totaux -->
                ${generatePrintTotals()}

                <!-- Pied de page -->
                <div class="footer">
                    <p>Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
                    <p>Extrait de compte</p>
                </div>
            </body>
            </html>
        `);
            printWindow.document.close();
            printWindow.print();
            printWindow.close();
        }

        document.title = originalTitle;
    };

    // Fonction pour générer le tableau des transactions
    function generatePrintTable() {
        if (transactions.length === 0) {
            return `
            <div style="text-align: center; padding: 40px; color: #666;">
                <p>Aucune transaction trouvée pour la période sélectionnée</p>
            </div>
        `;
        }

        let tableRows = '';
        transactions.forEach((transaction, index) => {
            // Formatage du numéro de chèque/traite
            const chequeTraiteInfo = transaction.numeroChequeTraite ?
                `<br><small style="color: #666;">N°: ${transaction.numeroChequeTraite}</small>` : '';

            tableRows += `
            <tr>
                <td class="text-center">${format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                <td>
                    <strong>${transaction.numero || transaction.type}</strong><br>
                    <span class="badge ${getPrintBadgeClass(transaction.type)}">${getPrintBadgeText(transaction.type)}</span>
                </td>
                <td>
                    ${transaction.typeReglement || ''}
                    ${chequeTraiteInfo}
                </td>
                <td class="text-right" style="color: #dc2626;">
                    ${transaction.debit > 0 ? transaction.debit.toFixed(3) : '-'}
                </td>
                <td class="text-right" style="color: #16a34a;">
                    ${transaction.credit > 0 ? transaction.credit.toFixed(3) : '-'}
                </td>
                <td class="text-right"><strong>${transaction.solde.toFixed(3)}</strong></td>
            </tr>
        `;
        });

        return `
        <table>
            <thead>
                <tr>
                    <th class="text-center">Date</th>
                    <th>Document</th>
                    <th>Type</th>
                    <th class="text-right">Débit (DT)</th>
                    <th class="text-right">Crédit (DT)</th>
                    <th class="text-right">Solde (DT)</th>
                </tr>
            </thead>
            <tbody>
                ${tableRows}
            </tbody>
        </table>
    `;
    }

    // Fonction pour générer les totaux
    function generatePrintTotals() {
        return `
        <div class="totaux">
            <table>
                <tr>
                    <td><strong>Total Débits :</strong></td>
                    <td class="text-right" style="color: #dc2626;"><strong>${totalDebit.toFixed(3)} DT</strong></td>
                </tr>
                <tr>
                    <td><strong>Total Crédits :</strong></td>
                    <td class="text-right" style="color: #16a34a;"><strong>${totalCredit.toFixed(3)} DT</strong></td>
                </tr>
                <tr style="border-top: 2px solid #333;">
                    <td><strong style="font-size: 16px;">Solde final :</strong></td>
                    <td class="text-right"><strong style="font-size: 16px; ${soldeFinal >= 0 ? 'color: #dc2626;' : 'color: #16a34a;'}">${soldeFinal.toFixed(3)} DT</strong></td>
                </tr>
                <tr>
                    <td colspan="2" class="text-center" style="font-size: 12px; color: #666; padding-top: 10px;">
                        ${soldeFinal > 0 ? 'Client débiteur' : soldeFinal < 0 ? 'Client créditeur' : 'Solde nul'}
                    </td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>
    `;
    }

    // Helper pour les badges d'impression
    function getPrintBadgeClass(type: string): string {
        switch (type) {
            case 'FACTURE':
            case 'BON_LIVRAISON':
                return 'badge-debit';
            case 'REGLEMENT':
                return 'badge-paiement';
            case 'CREDIT':
                return 'badge-credit';
            default:
                return '';
        }
    }

    function getPrintBadgeText(type: string): string {
        switch (type) {
            case 'FACTURE':
                return 'Facture';
            case 'BON_LIVRAISON':
                return 'BL';
            case 'REGLEMENT':
                return 'Règlement';
            case 'CREDIT':
                return 'Crédit';
            default:
                return type;
        }
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'FACTURE':
            case 'BON_LIVRAISON':
                return <Badge className="bg-orange-500">BL</Badge>;
            case 'REGLEMENT':
                return <Badge className="bg-green-500">Règlement</Badge>;
            case 'CREDIT':
                return <Badge className="bg-yellow-500">Crédit</Badge>;
            default:
                return <Badge>{type}</Badge>;
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'FACTURE':
            case 'BON_LIVRAISON':
                return <FileText className="h-4 w-4" />;
            case 'REGLEMENT':
                return <CreditCard className="h-4 w-4" />;
            case 'CREDIT':
                return <Banknote className="h-4 w-4" />;
            default:
                return null;
        }
    };

    if (loading) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Extrait de compte" subtitle="Consultation des mouvements" />
                    <main className="p-4 md:p-6">
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!client) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Extrait de compte" subtitle="Consultation des mouvements" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center text-red-600">
                                    <h2 className="text-2xl font-bold mb-2">Client non trouvé</h2>
                                    <p>Le client que vous recherchez n'existe pas.</p>
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
                <Header title="Extrait de compte" subtitle="Consultation des mouvements clients" />
                <main className="p-4 md:p-6">
                    {/* Boutons de navigation */}
                    <div className="mb-6 flex justify-between items-center">
                        <Link href="/clients/solde">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour aux clients
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button onClick={handlePrint} className="gap-2">
                                <Printer className="h-4 w-4" />
                                Imprimer
                            </Button>
                            {/* <Button variant="outline" className="gap-2" onClick={() => window.print()}>
                                <Download className="h-4 w-4" />
                                PDF
                            </Button> */}
                        </div>
                    </div>

                    {/* Filtres */}
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-lg">Filtres</CardTitle>
                            <CardDescription>Définissez la période pour l'extrait de compte</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                                <div className="space-y-2">
                                    <Label>Période prédéfinie</Label>
                                    <Select value={typePeriode} onValueChange={handlePeriodeChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="mois">Mois en cours</SelectItem>
                                            <SelectItem value="trimestre">Trimestre en cours</SelectItem>
                                            <SelectItem value="semestre">Semestre en cours</SelectItem>
                                            <SelectItem value="annee">Année en cours</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Date du</Label>
                                    <Input
                                        type="date"
                                        value={dateDebut}
                                        onChange={(e) => setDateDebut(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Date au</Label>
                                    <Input
                                        type="date"
                                        value={dateFin}
                                        onChange={(e) => setDateFin(e.target.value)}
                                    />
                                </div>
                                {/* <div className="space-y-2">
                                    <Label className="opacity-0">Filtre</Label>
                                    <div className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id="nonSolde"
                                            checked={showOnlyNonSoldes}
                                            onChange={(e) => setShowOnlyNonSoldes(e.target.checked)}
                                            className="rounded border-gray-300"
                                        />
                                        <Label htmlFor="nonSolde" className="text-sm font-normal cursor-pointer">
                                            Afficher uniquement les documents non soldés
                                        </Label>
                                    </div>
                                </div> */}
                            </div>
                            <div className="flex justify-end mt-4">
                                <Button onClick={fetchExtrait}>
                                    Appliquer les filtres
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Contenu à imprimer */}
                    <div ref={printRef}>
                        {/* En-tête */}
                        <div className="text-center mb-8">
                            <h1 className="text-2xl font-bold">EXTRAIT DE COMPTE</h1>
                            <p className="text-muted-foreground">
                                Période du {format(new Date(dateDebut), 'dd/MM/yyyy')} au {format(new Date(dateFin), 'dd/MM/yyyy')}
                            </p>
                        </div>

                        {/* Informations client */}
                        <Card className="mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5" />
                                    Informations client
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Raison Sociale</p>
                                        <p className="font-semibold">{client.nom}</p>
                                    </div>
                                    {client.matriculeFiscale && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Matricule Fiscale</p>
                                            <p className="font-mono">{client.matriculeFiscale}</p>
                                        </div>
                                    )}
                                    {client.telephone && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Téléphone</p>
                                            <p>{client.telephone}</p>
                                        </div>
                                    )}
                                    {client.email && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p>{client.email}</p>
                                        </div>
                                    )}
                                    {client.adresse && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-muted-foreground">Adresse</p>
                                            <p>{client.adresse} {client.codePostal && `- ${client.codePostal}`}</p>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tableau des mouvements */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Calendar className="h-5 w-5" />
                                    Mouvements du compte
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {transactions.length > 0 ? (
                                    <>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead className="w-[100px]">Date</TableHead>
                                                        <TableHead className="w-[120px]">Document</TableHead>
                                                        <TableHead className="w-[120px]">Type</TableHead>
                                                        <TableHead className="text-right w-[120px]">Débit (DT)</TableHead>
                                                        <TableHead className="text-right w-[120px]">Crédit (DT)</TableHead>
                                                        <TableHead className="text-right w-[120px]">Solde (DT)</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {transactions.map((transaction, index) => (
                                                        <TableRow key={`${transaction.id}-${index}`}>
                                                            <TableCell className="font-mono">
                                                                {format(new Date(transaction.date), 'dd/MM/yyyy')}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="flex items-center gap-2">
                                                                    {getTypeIcon(transaction.type)}
                                                                    <span className="font-medium">
                                                                        {transaction.numero || transaction.type}
                                                                    </span>
                                                                </div>
                                                                {getTypeBadge(transaction.type)}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2">
                                                                        {transaction.typeReglement && (
                                                                            <span className="font-medium">
                                                                                {transaction.typeReglement}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    {/* Affichage du numéro de chèque/traite */}
                                                                    {transaction.numeroChequeTraite && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            <span className="font-mono">
                                                                                N°: {transaction.numeroChequeTraite}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-red-600">
                                                                {transaction.debit > 0 ? transaction.debit.toFixed(3) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-medium text-green-600">
                                                                {transaction.credit > 0 ? transaction.credit.toFixed(3) : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right font-bold">
                                                                {transaction.solde.toFixed(3)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {/* Totaux */}
                                        <div className="mt-6 border-t pt-4">
                                            <div className="flex justify-end">
                                                <div className="w-80 space-y-2">
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold">Total Débits :</span>
                                                        <span className="text-red-600 font-bold">{totalDebit.toFixed(3)} DT</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold">Total Crédits :</span>
                                                        <span className="text-green-600 font-bold">{totalCredit.toFixed(3)} DT</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-lg">Solde final :</span>
                                                        <span className={`font-bold text-lg ${soldeFinal >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {soldeFinal.toFixed(3)} DT
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-center">
                                                        {soldeFinal > 0 ? 'Client débiteur' : soldeFinal < 0 ? 'Client créditeur' : 'Solde nul'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>Aucune transaction trouvée pour la période sélectionnée</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Pied de page */}
                        <div className="text-center text-xs text-muted-foreground mt-8 pt-4 border-t">
                            <p>Document généré le {format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
                            <p>Extrait de compte</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}