"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/types";
import { FileText, Printer, X, Package, Truck, FileCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BEPrintData, PrintFormat } from "@/types/print";
import { generateBEPrintHTML } from "@/lib/print-utils-jsx";

interface BonEntreeDetail {
  id: string;
  numero: string;
  date: string;
  type: string;
  referenceDoc: string | null;
  description: string | null;
  statut: string;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  fournisseur: {
    id: string;
    nom: string;
    telephone?: string;
    adresse?: string;
  } | null;
  lignes: Array<{
    id: string;
    quantite: number;
    prixUnitaireHT: number;
    tva: number;
    totalHT: number;
    totalTTC: number;
    product: {
      id: string;
      reference: string;
      designation: string;
    };
  }>;
  reglements?: Array<{
    id: string;
    reglement: {
      montant: number;
      typeReglement: string;
      statut: string;
      reference?: string;
    };
  }>;
}

interface BonEntreeViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bonEntreeId: string | null;
}

export function BonEntreeViewModal({ open, onOpenChange, bonEntreeId }: BonEntreeViewModalProps) {
  const [bonEntree, setBonEntree] = useState<BonEntreeDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && bonEntreeId) {
      fetchBonEntree();
    }
  }, [open, bonEntreeId]);

  const fetchBonEntree = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/bons-entree/${bonEntreeId}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setBonEntree(data);
    } catch (error) {
      console.error("Error fetching bon entree:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      FAC: <FileText className="h-4 w-4" />,
      BL: <Truck className="h-4 w-4" />,
      BS: <Package className="h-4 w-4" />,
      AUCUN: <FileCheck className="h-4 w-4" />,
    };
    return icons[type as keyof typeof icons] || <FileCheck className="h-4 w-4" />;
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      FAC: "Facture Fournisseur",
      BL: "Bon de Livraison",
      BS: "Bon de Sortie",
      AUCUN: "Bon d'entrée",
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getStatutBadge = (statut: string) => {
    const styles = {
      BROUILLON: "bg-yellow-500 text-white",
      VALIDE: "bg-green-500 text-white",
      ANNULE: "bg-red-500 text-white",
    };
    return (
      <Badge className={styles[statut as keyof typeof styles] || "bg-gray-500"}>
        {statut}
      </Badge>
    );
  };

  const handlePrint = () => {
    if (!bonEntree) return;

    const printData: BEPrintData = {
      id: bonEntree.id,
      numero: bonEntree.numero,
      date: bonEntree.date,
      fournisseur: bonEntree.fournisseur ? {
        nom: bonEntree.fournisseur.nom,
        adresse: bonEntree.fournisseur.adresse || null,
        telephone: bonEntree.fournisseur.telephone || null,
      } : undefined,
      type: bonEntree.type,
      referenceDoc: bonEntree.referenceDoc || undefined,
      statut: bonEntree.statut,
      totalHT: bonEntree.totalHT,
      totalTVA: bonEntree.totalTVA,
      totalTTC: bonEntree.totalTTC,
      lignes: bonEntree.lignes.map(ligne => ({
        product: {
          reference: ligne.product.reference,
          designation: ligne.product.designation,
        },
        quantite: ligne.quantite,
        prixUnitaireHT: ligne.prixUnitaireHT,
        tva: ligne.tva,
        totalHT: ligne.totalHT,
        totalTTC: ligne.totalTTC,
      })),
    };

    const html = generateBEPrintHTML(printData, "A4");
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Impression BE - ${bonEntree.numero}</title>
            <meta charset="UTF-8">
          </head>
          <body>
            ${html}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 1000);
                }, 500);
              };
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {getTypeIcon(bonEntree?.type || "AUCUN")}
              Bon d'Entrée - {bonEntree?.numero}
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : bonEntree ? (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">N° Bon d'Entrée</p>
                <p className="font-medium">{bonEntree.numero}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(new Date(bonEntree.date))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Type</p>
                <p className="font-medium">{getTypeLabel(bonEntree.type)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                {getStatutBadge(bonEntree.statut)}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fournisseur</p>
                <p className="font-medium">{bonEntree.fournisseur?.nom || "-"}</p>
                {bonEntree.fournisseur?.telephone && (
                  <p className="text-sm text-muted-foreground">{bonEntree.fournisseur.telephone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Référence Document</p>
                <p className="font-medium">{bonEntree.referenceDoc || "-"}</p>
              </div>
              {bonEntree.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{bonEntree.description}</p>
                </div>
              )}
            </div>

            {/* Lignes du BE */}
            <div>
              <h3 className="font-medium mb-3">Produits</h3>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-right">Qté</TableHead>
                      <TableHead className="text-right">Prix HT</TableHead>
                      <TableHead className="text-right">TVA</TableHead>
                      <TableHead className="text-right">Total HT</TableHead>
                      <TableHead className="text-right">Total TTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bonEntree.lignes.map((ligne) => (
                      <TableRow key={ligne.id}>
                        <TableCell>{ligne.product.reference}</TableCell>
                        <TableCell>{ligne.product.designation}</TableCell>
                        <TableCell className="text-right">{ligne.quantite}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ligne.prixUnitaireHT)}</TableCell>
                        <TableCell className="text-right">{ligne.tva}%</TableCell>
                        <TableCell className="text-right">{formatCurrency(ligne.totalHT)}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(ligne.totalTTC)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totaux */}
              <div className="mt-4 flex flex-col items-end">
                <div className="w-80 space-y-1">
                  <div className="flex justify-between">
                    <span>Total HT:</span>
                    <span>{formatCurrency(bonEntree.totalHT)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TVA:</span>
                    <span>{formatCurrency(bonEntree.totalTVA)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t pt-2">
                    <span>Total TTC:</span>
                    <span>{formatCurrency(bonEntree.totalTTC)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Règlements */}
            {bonEntree.reglements && bonEntree.reglements.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">Règlements</h3>
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Montant</TableHead>
                        <TableHead>Référence</TableHead>
                        <TableHead>Statut</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bonEntree.reglements.map((reg) => (
                        <TableRow key={reg.id}>
                          <TableCell>{reg.reglement.typeReglement}</TableCell>
                          <TableCell>{formatCurrency(reg.reglement.montant)}</TableCell>
                          <TableCell>{reg.reglement.reference || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={reg.reglement.statut === "PAYE" ? "default" : "secondary"}>
                              {reg.reglement.statut}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Aucune donnée disponible
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}