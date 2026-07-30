"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/types";
import { Printer, Edit, ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateDevisPrintHTML, openPrintWindow } from "@/lib/print-utils-jsx";
import { DevisPrintData, PrintFormat } from "@/types/print";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Devis {
  id: string;
  numero: string;
  date: string;
  clientId: string;
  client: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
    adresse: string | null;
  };
  totalHT: number;
  totalTTC: number;
  validite: string;
  statut: string;
  remise?: number;
  remiseType?: string;
  lignes: Array<{
    id: string;
    productId: string;
    product: {
      id: string;
      reference: string;
      designation: string;
      prixVente: number; // Prix HT
      tva: number;
    };
    quantite: number;
    prixUnitaire: number; // Prix TTC
    tva: number;
  }>;
}

const statutColors: Record<string, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-800",
  ACCEPTE: "bg-green-100 text-green-800",
  REFUSE: "bg-red-100 text-red-800",
  TRANSFORME_EN_FACTURE: "bg-blue-100 text-blue-800",
};

const statutLabels: Record<string, string> = {
  EN_ATTENTE: "En attente",
  ACCEPTE: "Accepté",
  REFUSE: "Refusé",
  TRANSFORME_EN_FACTURE: "Transformé en facture",
};

export default function ViewDevisPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [devis, setDevis] = useState<Devis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchDevis();
  }, [params.id]);

  const fetchDevis = async () => {
    try {
      const response = await fetch(`/api/devis/${params.id}`);
      if (!response.ok) throw new Error("Devis non trouvé");
      const data = await response.json();
      setDevis(data);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger le devis",
        variant: "destructive",
      });
      router.push("/devis");
    } finally {
      setLoading(false);
    }
  };

  // Calcul du prix HT à partir du prix TTC
  const getPrixHT = (prixTTC: number, tva: number) => {
    return prixTTC / (1 + tva / 100);
  };

  // Calcul du total HT pour une ligne
  const getLigneTotalHT = (ligne: Devis['lignes'][0]) => {
    const prixHT = getPrixHT(ligne.prixUnitaire, ligne.tva);
    return ligne.quantite * prixHT;
  };

  // Calcul du total TTC pour une ligne
  const getLigneTotalTTC = (ligne: Devis['lignes'][0]) => {
    return ligne.quantite * ligne.prixUnitaire;
  };

  // Calcul du total HT du devis (déjà dans devis.totalHT, mais on recalcule pour être sûr)
  const calculateTotalHT = () => {
    if (!devis) return 0;
    return devis.lignes.reduce((sum, l) => sum + getLigneTotalHT(l), 0);
  };

  // Calcul du total TTC avant remise
  const calculateTotalTTCBrut = () => {
    if (!devis) return 0;
    return devis.lignes.reduce((sum, l) => sum + getLigneTotalTTC(l), 0);
  };

  // Calcul de la TVA totale avant remise
  const calculateTotalTVABrut = () => {
    if (!devis) return 0;
    return devis.lignes.reduce((sum, l) => {
      const ht = getLigneTotalHT(l);
      return sum + (ht * l.tva / 100);
    }, 0);
  };

  // Application de la remise
  const applyRemise = (montant: number) => {
    if (!devis) return montant;
    const remise = devis.remise || 0;
    const remiseType = devis.remiseType || "PERCENT";
    
    if (remiseType === "PERCENT") {
      return montant * (1 - remise / 100);
    } else {
      return Math.max(0, montant - remise);
    }
  };

  // Calcul du total HT après remise
  const getTotalHTAfterRemise = () => {
    return applyRemise(calculateTotalHT());
  };

  // Calcul du total TTC après remise
  const getTotalTTCAfterRemise = () => {
    return applyRemise(calculateTotalTTCBrut());
  };

  // Calcul de la TVA après remise
  const getTotalTVAAfterRemise = () => {
    const totalHTBrut = calculateTotalHT();
    const totalTVABrut = calculateTotalTVABrut();
    const remise = devis?.remise || 0;
    const remiseType = devis?.remiseType || "PERCENT";
    
    if (remiseType === "PERCENT") {
      return totalTVABrut * (1 - remise / 100);
    } else {
      const ratio = totalHTBrut > 0 ? Math.max(0, (totalHTBrut - remise) / totalHTBrut) : 0;
      return totalTVABrut * ratio;
    }
  };

  const handlePrint = () => {
    if (!devis) return;

    // Calcul des totaux pour l'impression
    const totalHT = getTotalHTAfterRemise();
    const totalTTC = getTotalTTCAfterRemise();
    const totalTVA = getTotalTVAAfterRemise();

    const printData: DevisPrintData = {
      id: devis.id,
      numero: devis.numero,
      date: new Date(devis.date),
      validite: new Date(devis.validite),
      client: {
        nom: devis.client.nom,
        adresse: devis.client.adresse || undefined,
        telephone: devis.client.telephone || undefined,
      },
      totalHT: totalHT,
      totalTVA: totalTVA,
      totalTTC: totalTTC,
      lignes: devis.lignes.map(ligne => ({
        product: {
          reference: ligne.product.reference,
          designation: ligne.product.designation,
          tva: ligne.tva,
        },
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire, // Prix TTC
        prixUnitaireHT: getPrixHT(ligne.prixUnitaire, ligne.tva), // Prix HT pour l'affichage
      })),
    };

    const htmlContent = generateDevisPrintHTML(printData, "A4");
    openPrintWindow(htmlContent, `Devis-${devis.numero}`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/devis/${devis?.id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({
        title: "Succès",
        description: "Devis supprimé avec succès",
      });
      router.push("/devis");
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le devis",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails du devis" subtitle="Consultation" />
          <main className="flex items-center justify-center h-[calc(100vh-73px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  if (!devis) return null;

  const totalHTBrut = calculateTotalHT();
  const totalTTCBrut = calculateTotalTTCBrut();
  const totalTVABrut = calculateTotalTVABrut();
  const totalHTApresRemise = getTotalHTAfterRemise();
  const totalTTCApresRemise = getTotalTTCAfterRemise();
  const totalTVAApresRemise = getTotalTVAAfterRemise();
  const hasRemise = (devis.remise || 0) > 0;

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Détails du devis" subtitle={`Devis N° ${devis.numero}`} />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Actions */}
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={() => router.push("/devis")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour à la liste
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimer
                </Button>
                {devis.statut === "EN_ATTENTE" && (
                  <Button
                    variant="outline"
                    onClick={() => router.push(`/devis/${devis.id}/edit`)}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </div>
            </div>

            {/* Informations générales */}
            <Card>
              <CardHeader>
                <CardTitle>Informations générales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Numéro</p>
                    <p className="font-medium">{devis.numero}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Statut</p>
                    <Badge className={statutColors[devis.statut]}>
                      {statutLabels[devis.statut]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p>{formatDate(new Date(devis.date))}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Validité</p>
                    <p>{formatDate(new Date(devis.validite))}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <p className="text-sm text-muted-foreground">Client</p>
                    <p className="font-medium">{devis.client.nom}</p>
                    <p className="text-sm text-muted-foreground">{devis.client.telephone}</p>
                    {devis.client.email && (
                      <p className="text-sm text-muted-foreground">{devis.client.email}</p>
                    )}
                    {devis.client.adresse && (
                      <p className="text-sm text-muted-foreground">{devis.client.adresse}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Produits */}
            <Card>
              <CardHeader>
                <CardTitle>Produits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Désignation</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix Unitaire (TTC)</TableHead>
                        <TableHead>TVA</TableHead>
                        <TableHead>Total TTC</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {devis.lignes.map((ligne) => (
                        <TableRow key={ligne.id}>
                          <TableCell>{ligne.product.designation}</TableCell>
                          <TableCell>{ligne.product.reference}</TableCell>
                          <TableCell>{ligne.quantite}</TableCell>
                          <TableCell>{formatCurrency(ligne.prixUnitaire)}</TableCell>
                          <TableCell>{ligne.tva}%</TableCell>
                          <TableCell>
                            {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Totaux détaillés */}
                <div className="mt-4 flex flex-col items-end gap-2">
                  {hasRemise && (
                    <>
                      <div className="flex justify-between w-96 text-muted-foreground">
                        <span>Sous-total HT:</span>
                        <span>{formatCurrency(totalHTBrut)}</span>
                      </div>
                      <div className="flex justify-between w-96 text-muted-foreground">
                        <span>Sous-total TTC:</span>
                        <span>{formatCurrency(totalTTCBrut)}</span>
                      </div>
                      <div className="flex justify-between w-96 text-muted-foreground">
                        <span>TVA (sur sous-total):</span>
                        <span>{formatCurrency(totalTVABrut)}</span>
                      </div>
                      <div className="flex justify-between w-96 text-orange-600">
                        <span>Remise ({devis.remiseType === "PERCENT" ? `${devis.remise}%` : `${formatCurrency(devis.remise || 0)}`}):</span>
                        <span>- {formatCurrency(totalTTCBrut - totalTTCApresRemise)}</span>
                      </div>
                      <div className="border-t w-96"></div>
                    </>
                  )}
                  
                  <div className="flex justify-between w-96">
                    <span>Total HT après remise:</span>
                    <span className="font-semibold">{formatCurrency(totalHTApresRemise)}</span>
                  </div>
                  <div className="flex justify-between w-96">
                    <span>TVA:</span>
                    <span className="font-semibold">{formatCurrency(totalTVAApresRemise)}</span>
                  </div>
                  <div className="flex justify-between w-96 text-lg font-bold border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{formatCurrency(totalTTCApresRemise)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le devis N° {devis.numero} sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}