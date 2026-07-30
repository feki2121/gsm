"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Facture, formatCurrency, formatDate, statutFactureLabels, StatutFacture } from "@/lib/types";
import { ArrowRight, FileText } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface RecentInvoicesProps {
  factures: Facture[];
}

export function RecentInvoices({ factures }: RecentInvoicesProps) {
  const getStatutBadgeVariant = (statut: StatutFacture) => {
    switch (statut) {
      case StatutFacture.PAYEE:
        return "default";
      case StatutFacture.IMPAYEE:
        return "destructive";
      case StatutFacture.PARTIELLE:
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Factures Récentes
        </CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/factures" className="flex items-center gap-1">
            Voir tout
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {factures.slice(0, 5).map((facture) => (
            <div
              key={facture.id}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">{facture.numero}</p>
                  <p className="text-sm text-muted-foreground">
                    {facture.client?.nom} - {formatDate(facture.date)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Badge
                  variant={getStatutBadgeVariant(facture.statut)}
                  className={cn(
                    facture.statut === StatutFacture.PAYEE && "bg-success text-success-foreground",
                    facture.statut === StatutFacture.PARTIELLE && "bg-warning text-warning-foreground"
                  )}
                >
                  {statutFactureLabels[facture.statut]}
                </Badge>
                <span className="min-w-[100px] text-right font-semibold">
                  {formatCurrency(facture.totalTTC)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
