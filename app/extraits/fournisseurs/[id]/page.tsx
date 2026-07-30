// app/extraits-fournisseurs/[id]/page.tsx
'use client';

import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Printer, Download, FileText, Calendar, CreditCard, Banknote, Building2, User, Package } from 'lucide-react';
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
import { Separator } from '@/components/ui/separator';

interface Transaction {
    id: string;
    date: Date;
    type: 'BON_ENTREE' | 'REGLEMENT' | 'CREDIT';
    numero?: string;
    description: string;
    debit: number;      // Montant dû au fournisseur (facture/BE)
    credit: number;     // Montant payé au fournisseur
    solde: number;
    statut?: string;
    reference?: string;
    typeReglement?: string;
    details?: string;
    numeroChequeTraite?: string; // Ajoutez cette ligne
    banque?: string;
}

interface Fournisseur {
    id: string;
    nom: string;
    telephone: string;
    email: string;
    adresse?: string;
    matriculeFiscale?: string;
    codePostal?: string;
    rib?: string;
}

interface ExtraitData {
    fournisseur: Fournisseur;
    transactions: Transaction[];
    totalDebit: number;
    totalCredit: number;
    soldeFinal: number;
    periode: {
        debut: string;
        fin: string;
    };
}

export default function ExtraitFournisseurPage() {
  const { sidebarClasses } = useSidebar();
    const params = useParams();
    const fournisseurId = params.id as string;
    const printRef = useRef<HTMLDivElement>(null);

    const [fournisseur, setFournisseur] = useState<Fournisseur | null>(null);
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
        if (fournisseurId) {
            fetchExtrait();
        }
    }, [fournisseurId, dateDebut, dateFin, showOnlyNonSoldes]);

    const fetchExtrait = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            params.append('dateDebut', dateDebut);
            params.append('dateFin', dateFin);
            if (showOnlyNonSoldes) params.append('showOnlyNonSoldes', 'true');

            const response = await fetch(`/api/fournisseurs/${fournisseurId}/extrait?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Erreur lors du chargement');
            }

            const data: ExtraitData = await response.json();

            setFournisseur(data.fournisseur);
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
        document.title = `Extrait de compte fournisseur - ${fournisseur?.nom || 'Fournisseur'}`;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="fr">
            <head>
                <title>Extrait de compte fournisseur - ${fournisseur?.nom}</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Arial, 'Helvetica Neue', sans-serif;
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
                        font-size: 14px;
                    }
                    
                    /* Correction principale : affichage horizontal des infos fournisseur */
                    .fournisseur-info {
                        margin-bottom: 25px;
                        padding: 20px;
                        background: #f8f9fa;
                        border-radius: 8px;
                        border-left: 4px solid #1a3a5f;
                    }
                    
                    .fournisseur-info .info-grid {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 15px 30px;
                    }
                    
                    .fournisseur-info .info-item {
                        display: flex;
                        align-items: flex-start;
                        gap: 10px;
                    }
                    
                    .fournisseur-info .info-label {
                        min-width: 120px;
                        font-weight: 600;
                        color: #555;
                        font-size: 13px;
                    }
                    
                    .fournisseur-info .info-value {
                        flex: 1;
                        font-size: 14px;
                        color: #333;
                    }
                    
                    .fournisseur-info .full-width {
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
                        th, td {
                            break-inside: avoid;
                        }
                        tr {
                            break-inside: avoid-page;
                        }
                    }
                </style>
            </head>
            <body>
                <!-- En-tête -->
                <div class="header">
                    <h1>EXTRAIT DE COMPTE FOURNISSEUR</h1>
                    <p>Période du ${format(new Date(dateDebut), 'dd/MM/yyyy')} au ${format(new Date(dateFin), 'dd/MM/yyyy')}</p>
                </div>

                <!-- Informations fournisseur en version horizontale -->
                <div class="fournisseur-info">
                    <div class="info-grid">
                        <div class="info-item">
                            <div class="info-label">Raison Sociale :</div>
                            <div class="info-value"><strong>${escapeHtml(fournisseur?.nom || '')}</strong></div>
                        </div>
                        ${fournisseur?.matriculeFiscale ? `
                        <div class="info-item">
                            <div class="info-label">Matricule Fiscale :</div>
                            <div class="info-value">${escapeHtml(fournisseur.matriculeFiscale)}</div>
                        </div>
                        ` : ''}
                        ${fournisseur?.telephone ? `
                        <div class="info-item">
                            <div class="info-label">Téléphone :</div>
                            <div class="info-value">${escapeHtml(fournisseur.telephone)}</div>
                        </div>
                        ` : ''}
                        ${fournisseur?.email ? `
                        <div class="info-item">
                            <div class="info-label">Email :</div>
                            <div class="info-value">${escapeHtml(fournisseur.email)}</div>
                        </div>
                        ` : ''}
                        ${fournisseur?.adresse ? `
                        <div class="info-item full-width">
                            <div class="info-label">Adresse :</div>
                            <div class="info-value">${escapeHtml(fournisseur.adresse)} ${fournisseur?.codePostal ? `- ${escapeHtml(fournisseur.codePostal)}` : ''}</div>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Tableau des transactions -->
                ${generateFournisseurPrintTable()}

                <!-- Totaux -->
                ${generateFournisseurPrintTotals()}

                <!-- Pied de page -->
                <div class="footer">
                    <p>Document généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
                    <p>Extrait de compte fournisseur</p>
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


    function generateFournisseurPrintTable() {
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
                `<br><small style="color: #666;">N°: ${escapeHtml(transaction.numeroChequeTraite)}</small>` : '';
            const banqueInfo = transaction.banque ?
                `<br><small style="color: #666;">Banque: ${escapeHtml(transaction.banque)}</small>` : '';

            tableRows += `
            <tr>
                <td class="text-center">${format(new Date(transaction.date), 'dd/MM/yyyy')}</td>
                <td>
                    <strong>${escapeHtml(transaction.numero || transaction.type)}</strong><br>
                    <span class="badge ${getFournisseurPrintBadgeClass(transaction.type)}">${getFournisseurPrintBadgeText(transaction.type)}</span>
                </td>
                <td>
                    ${transaction.typeReglement ? `${escapeHtml(transaction.typeReglement)}` : ''}
                    ${chequeTraiteInfo}
                    ${banqueInfo}
                </td>
                <td class="text-right" style="color: #dc2626;">
                    ${transaction.debit > 0 ? transaction.debit.toFixed(3) : '-'}
                </td>
                <td class="text-right" style="color: #16a34a;">
                    ${transaction.credit > 0 ? transaction.credit.toFixed(3) : '-'}
                </td>
                <td class="text-right"><strong>${transaction.solde.toFixed(3)}</strong></td>
            <tr>
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

    // Fonction pour générer les totaux fournisseur
    function generateFournisseurPrintTotals() {
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
                        ${soldeFinal > 0 ? 'Fournisseur débiteur' : soldeFinal < 0 ? 'Fournisseur créditeur' : 'Solde nul'}
                    </td>
                </tr>
            </table>
            <div style="clear: both;"></div>
        </div>
    `;
    }

    // Helper pour les badges d'impression fournisseur
    function getFournisseurPrintBadgeClass(type: string): string {
        switch (type) {
            case 'FACTURE':
            case 'BON_LIVRAISON':
                return 'badge-debit';
            case 'REGLEMENT':
                return 'badge-paiement';
            case 'CREDIT':
                return 'badge-credit';
            case 'AVOIR':
                return 'badge-credit';
            default:
                return '';
        }
    }

    function getFournisseurPrintBadgeText(type: string): string {
        switch (type) {
            case 'FACTURE':
                return 'Facture';
            case 'BON_LIVRAISON':
                return 'BL';
            case 'REGLEMENT':
                return 'Règlement';
            case 'CREDIT':
                return 'Crédit';
            case 'AVOIR':
                return 'Avoir';
            default:
                return type;
        }
    }

    // Fonction utilitaire pour échapper les caractères HTML (sécurité)
    function escapeHtml(text: string): string {
        if (!text) return '';
        const htmlEntities: Record<string, string> = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        };
        return text.replace(/[&<>"']/g, (char) => htmlEntities[char]);
    }

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'BON_ENTREE':
                return <Badge className="bg-orange-500">Bon d'entrée</Badge>;
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
            case 'BON_ENTREE':
                return <Package className="h-4 w-4" />;
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
                    <Header title="Extrait de compte fournisseur" subtitle="Consultation des mouvements" />
                    <main className="p-4 md:p-6">
                        <div className="flex justify-center items-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    </main>
                </div>
            </div>
        );
    }

    if (!fournisseur) {
        return (
            <div className="flex min-h-screen bg-background flex-col md:flex-row">
                <Sidebar />
                <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
                    <Header title="Extrait de compte fournisseur" subtitle="Consultation des mouvements" />
                    <main className="p-4 md:p-6">
                        <Card>
                            <CardContent className="py-8">
                                <div className="text-center text-red-600">
                                    <h2 className="text-2xl font-bold mb-2">Fournisseur non trouvé</h2>
                                    <p>Le fournisseur que vous recherchez n'existe pas.</p>
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
                <Header title="Extrait de compte fournisseur" subtitle="Consultation des mouvements" />
                <main className="p-4 md:p-6">
                    {/* Boutons de navigation */}
                    <div className="mb-6 flex justify-between items-center">
                        <Link href="/fournisseurs/solde">
                            <Button variant="outline" className="gap-2">
                                <ArrowLeft className="h-4 w-4" />
                                Retour aux fournisseurs
                            </Button>
                        </Link>
                        <div className="flex gap-2">
                            <Button onClick={handlePrint} className="gap-2">
                                <Printer className="h-4 w-4" />
                                Imprimer
                            </Button>
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
                            <h1 className="text-2xl font-bold">EXTRAIT DE COMPTE FOURNISSEUR</h1>
                            <p className="text-muted-foreground">
                                Période du {format(new Date(dateDebut), 'dd/MM/yyyy')} au {format(new Date(dateFin), 'dd/MM/yyyy')}
                            </p>
                        </div>

                        {/* Informations fournisseur */}
                        <Card className="mb-6">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5" />
                                    Informations fournisseur
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Raison Sociale</p>
                                        <p className="font-semibold">{fournisseur.nom}</p>
                                    </div>
                                    {fournisseur.matriculeFiscale && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Matricule Fiscale</p>
                                            <p className="font-mono">{fournisseur.matriculeFiscale}</p>
                                        </div>
                                    )}
                                    {fournisseur.telephone && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Téléphone</p>
                                            <p>{fournisseur.telephone}</p>
                                        </div>
                                    )}
                                    {fournisseur.email && (
                                        <div>
                                            <p className="text-sm text-muted-foreground">Email</p>
                                            <p>{fournisseur.email}</p>
                                        </div>
                                    )}
                                    {fournisseur.adresse && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-muted-foreground">Adresse</p>
                                            <p>{fournisseur.adresse} {fournisseur.codePostal && `- ${fournisseur.codePostal}`}</p>
                                        </div>
                                    )}
                                    {fournisseur.rib && (
                                        <div className="md:col-span-2">
                                            <p className="text-sm text-muted-foreground">RIB</p>
                                            <p className="font-mono text-sm">{fournisseur.rib}</p>
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
                                                                                Mode: {transaction.typeReglement}
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
                                                                    {/* Affichage de la banque */}
                                                                    {transaction.banque && (
                                                                        <div className="text-xs text-muted-foreground">
                                                                            <span>
                                                                                Banque: {transaction.banque}
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
                                                        <span className="font-semibold">Total Achats (Débits) :</span>
                                                        <span className="text-red-600 font-bold">{totalDebit.toFixed(3)} DT</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="font-semibold">Total Règlements (Crédits) :</span>
                                                        <span className="text-green-600 font-bold">{totalCredit.toFixed(3)} DT</span>
                                                    </div>
                                                    <Separator />
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-lg">Solde final :</span>
                                                        <span className={`font-bold text-lg ${soldeFinal > 0 ? 'text-red-600' : soldeFinal < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                                                            {soldeFinal.toFixed(3)} DT
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground text-center">
                                                        {soldeFinal > 0 ? 'Fournisseur créditeur (nous devons)' : soldeFinal < 0 ? 'Fournisseur débiteur (il nous doit)' : 'Solde nul'}
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
                            <p>Extrait de compte fournisseur</p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}