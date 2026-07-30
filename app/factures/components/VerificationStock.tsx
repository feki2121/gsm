"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertTriangle, CheckCircle, Info, Package } from "lucide-react";

interface VerificationStockProps {
  produits: Array<{ productId: string; quantite: number }>;
  onVerificationChange?: (estValide: boolean, details?: any) => void;
}

export function VerificationStock({ produits, onVerificationChange }: VerificationStockProps) {
  const [verification, setVerification] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const verifierStock = async () => {
    if (!produits || produits.length === 0) {
      if (onVerificationChange) onVerificationChange(true);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/factures/verifier-stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produits }),
      });
      
      if (!response.ok) throw new Error("Erreur lors de la vérification");
      
      const data = await response.json();
      setVerification(data);
      if (onVerificationChange) {
        onVerificationChange(data.totalIndisponible === 0, data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
      if (onVerificationChange) onVerificationChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    verifierStock();
  }, [JSON.stringify(produits)]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground p-3 bg-muted/30 rounded-lg">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Vérification du stock FAC en cours...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!verification) return null;

  const estValide = verification.totalIndisponible === 0;

  return (
    <div className="space-y-3">
      <Alert 
        variant={estValide ? "default" : "destructive"} 
        className={estValide ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"}
      >
        {estValide ? (
          <CheckCircle className="h-4 w-4 text-green-500" />
        ) : (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        <AlertDescription className={estValide ? "text-green-700" : "text-red-700 whitespace-pre-line"}>
          {verification.message}
        </AlertDescription>
      </Alert>

      {/* Détail par produit */}
      <div className="space-y-2 mt-4">
        <p className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Détail par produit (stock provenant des factures fournisseurs uniquement) :
        </p>
        
        {verification.verification.map((prod: any) => (
          <div 
            key={prod.productId} 
            className={cn(
              "border rounded-lg p-3",
              prod.estDisponible ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium">{prod.designation}</p>
                <p className="text-sm text-muted-foreground">{prod.reference}</p>
              </div>
              <Badge variant={prod.estDisponible ? "default" : "destructive"}>
                {prod.estDisponible ? "Stock suffisant" : "Stock insuffisant"}
              </Badge>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Demandé:</span>
                <span className="ml-2 font-semibold">{prod.quantiteDemandee}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Stock FAC disponible:</span>
                <span className={cn(
                  "ml-2 font-semibold",
                  prod.estDisponible ? "text-green-600" : "text-red-600"
                )}>
                  {prod.stockFACDisponible}
                </span>
              </div>
            </div>

            {!prod.estDisponible && (
              <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                ⚠️ Il manque {prod.quantiteManquante} unité(s) pour ce produit.
                Stock disponible: {prod.stockFACDisponible} sur {prod.quantiteDemandee} demandé(s).
              </div>
            )}

            {/* Informations sur les autres types de stock (non utilisables pour facturation) */}
            {prod.autresStocks && prod.autresStocks.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <p className="text-xs text-muted-foreground mb-1">
                  ℹ️ Stock disponible provenant d'autres types (non utilisable pour facturation client) :
                </p>
                <div className="flex gap-2">
                  {prod.autresStocks.map((stock: any) => (
                    <Badge key={stock.type} variant="outline" className="text-xs">
                      {stock.type}: {stock.quantite}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {prod.estDisponible && (
              <div className="mt-2 text-xs text-green-600">
                ✓ Stock FAC suffisant: {prod.stockFACDisponible} disponible(s)
              </div>
            )}
          </div>
        ))
        }
      </div>
    </div>
  );
}

// Ajouter cn si pas déjà importé
import { cn } from "@/lib/utils";