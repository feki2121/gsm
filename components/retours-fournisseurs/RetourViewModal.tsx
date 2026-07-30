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
import { Printer, X, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface RetourDetail {
  id: string;
  numero: string;
  date: string;
  motif: string | null;
  montant: number;
  fournisseur: {
    id: string;
    nom: string;
    telephone: string;
    email: string | null;
  } | null;
  bonEntree: {
    id: string;
    numero: string;
    date: string;
    totalHT: number;
    totalTTC: number;
  } | null;
  lignes: Array<{
    id: string;
    quantite: number;
    prixUnitaire: number;
    product: {
      id: string;
      reference: string;
      designation: string;
    };
  }>;
}

interface RetourViewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  retourId: string | null;
}

export function RetourViewModal({ open, onOpenChange, retourId }: RetourViewModalProps) {
  const [retour, setRetour] = useState<RetourDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && retourId) {
      fetchRetour();
    }
  }, [open, retourId]);

  const fetchRetour = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/retours-fournisseurs/${retourId}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setRetour(data);
    } catch (error) {
      console.error("Error fetching retour:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    if (!retour) return;
    
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Retour Fournisseur - ${retour.numero}</title>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; margin: 40px; }
              .header { text-align: center; margin-bottom: 30px; }
              .info { margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; }
              .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="header">
              <h2>RETOUR FOURNISSEUR</h2>
              <h3>N° ${retour.numero}</h3>
            </div>
            <div class="info">
              <p><strong>Date:</strong> ${formatDate(new Date(retour.date))}</p>
              <p><strong>Fournisseur:</strong> ${retour.fournisseur?.nom || "N/A"}</p>
              <p><strong>Bon d'entrée associé:</strong> ${retour.bonEntree?.numero || "N/A"}</p>
              <p><strong>Motif:</strong> ${retour.motif || "-"}</p>
            </div>
            <table>
              <thead>
                <tr><th>Référence</th><th>Désignation</th><th>Qté</th><th>Prix unitaire</th><th>Total</th></tr>
              </thead>
              <tbody>
                ${retour.lignes.map(ligne => `
                  <tr>
                    <td>${ligne.product.reference}</td>
                    <td>${ligne.product.designation}</td>
                    <td>${ligne.quantite}</td>
                    <td>${formatCurrency(ligne.prixUnitaire)}</td>
                    <td>${formatCurrency(ligne.quantite * ligne.prixUnitaire)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total">
              Montant total à déduire : ${formatCurrency(retour.montant)}
            </div>
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
              <RotateCcw className="h-5 w-5 text-primary" />
              Retour Fournisseur - {retour?.numero}
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
        ) : retour ? (
          <div className="space-y-6">
            {/* Informations générales */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">N° Retour</p>
                <p className="font-medium font-mono">{retour.numero}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{formatDate(new Date(retour.date))}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fournisseur</p>
                <p className="font-medium">{retour.fournisseur?.nom || "N/A"}</p>
                {retour.fournisseur?.telephone && (
                  <p className="text-sm text-muted-foreground">{retour.fournisseur.telephone}</p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bon d'entrée associé</p>
                <p className="font-medium font-mono">{retour.bonEntree?.numero || "N/A"}</p>
              </div>
              {retour.motif && (
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Motif</p>
                  <p className="font-medium">{retour.motif}</p>
                </div>
              )}
            </div>

            {/* Produits retournés */}
            <div>
              <h3 className="font-medium mb-3">Produits retournés</h3>
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Référence</TableHead>
                      <TableHead>Désignation</TableHead>
                      <TableHead className="text-right">Quantité</TableHead>
                      <TableHead className="text-right">Prix unitaire</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {retour.lignes.map((ligne) => (
                      <TableRow key={ligne.id}>
                        <TableCell>{ligne.product.reference}</TableCell>
                        <TableCell>{ligne.product.designation}</TableCell>
                        <TableCell className="text-right">{ligne.quantite}</TableCell>
                        <TableCell className="text-right">{formatCurrency(ligne.prixUnitaire)}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(ligne.quantite * ligne.prixUnitaire)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Total */}
              <div className="mt-4 flex flex-col items-end">
                <div className="w-80 flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total à déduire:</span>
                  <span className="text-green-600">{formatCurrency(retour.montant)}</span>
                </div>
              </div>
            </div>
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