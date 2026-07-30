"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatCurrency,
  formatDate,
  typeReglementLabels,
  statutReglementLabels,
  TypeReglement,
  StatutReglement,
} from "@/lib/types";
import {
  CalendarClock,
  CheckCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Calendar,
  RefreshCw,
  Loader2,
  Banknote,
  FileText,
  CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface Client {
  id: string;
  nom: string;
  telephone: string;
  email: string | null;
}

interface Reglement {
  id: string;
  date: string;
  clientId: string;
  client?: Client;
  montant: number;
  typeReglement: TypeReglement;
  reference: string | null;
  statut: StatutReglement;
  echeance: string | null;
  banque: string | null;
  domiciliation: string | null;
  detailsMixte: string | null;
  createdAt: string;
  updatedAt: string;
}

// Interface pour les détails des paiements mixtes
interface DetailMixte {
  type: string;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  statut?: string;
}

// Interface pour les éléments affichés
interface PaymentItem {
  id: string;
  parentId: string;
  detailIndex?: number;
  type: string;
  montant: number;
  reference: string | null;
  banque: string | null;
  echeance: string | null;
  statut: string;
  client?: Client;
  isDetail: boolean;
  originalReglement?: Reglement;
}

export default function RecouvrementClientsPage() {
  const { sidebarClasses } = useSidebar();
  const [reglements, setReglements] = useState<Reglement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [encaissementInProgress, setEncaissementInProgress] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReglements();
  }, []);

  const fetchReglements = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/recouvrement/reglements");
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setReglements(data);
    } catch (error) {
      console.error("Error fetching reglements:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les règlements",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEncaisser = async (id: string, detailIndex?: number, isDetail?: boolean, parentId?: string) => {
    const encaissementId = isDetail ? `${parentId}_${detailIndex}` : id;
    setEncaissementInProgress(encaissementId);

    try {
      const body: any = {};
      if (detailIndex !== undefined) {
        body.detailIndex = detailIndex;
      }

      const response = await fetch(`/api/recouvrement/reglements/${isDetail ? parentId : id}/encaisser`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de l'encaissement");
      }

      const result = await response.json();

      toast({
        title: "Succès",
        description: result.message || "Paiement encaissé avec succès",
      });

      fetchReglements();
    } catch (error) {
      console.error("Error encaissant:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible d'encaisser",
        variant: "destructive",
      });
    } finally {
      setEncaissementInProgress(null);
    }
  };

  // Fonction pour extraire tous les détails de paiement (incluant les mixtes)
  const getAllPaymentDetails = (): PaymentItem[] => {
    const details: PaymentItem[] = [];

    reglements.forEach(reg => {
      if (reg.typeReglement === TypeReglement.MIXTE && reg.detailsMixte) {
        try {
          const parsed = JSON.parse(reg.detailsMixte);
          let mixteDetails: DetailMixte[] = [];

          if (Array.isArray(parsed)) {
            mixteDetails = parsed;
          } else if (parsed && typeof parsed === 'object') {
            mixteDetails = Object.values(parsed);
          }

          if (mixteDetails && mixteDetails.length > 0) {
            mixteDetails.forEach((detail, idx) => {
              if (detail && detail.montant > 0) {
                details.push({
                  id: `${reg.id}_${idx}`,
                  parentId: reg.id,
                  detailIndex: idx,
                  type: detail.type || 'AUTRE',
                  montant: detail.montant,
                  reference: detail.reference || reg.reference,
                  banque: detail.banque || reg.banque,
                  echeance: detail.echeance || null,
                  statut: detail.statut || (detail.type === 'ESPECE' ? 'ENCAISSE' : 'EN_ATTENTE'),
                  client: reg.client,
                  isDetail: true,
                  originalReglement: reg,
                });
              }
            });
          }
        } catch (error) {
          console.error("Error parsing mixte details for reg:", reg.id, error);
        }
      } else {
        details.push({
          id: reg.id,
          parentId: reg.id,
          type: reg.typeReglement,
          montant: reg.montant,
          reference: reg.reference,
          banque: reg.banque,
          echeance: reg.echeance,
          statut: reg.statut,
          client: reg.client,
          isDetail: false,
          originalReglement: reg,
        });
      }
    });

    return details;
  };

  const allDetails = getAllPaymentDetails();

  // Filtrer par type
  const especesDetails = allDetails.filter(d => d.type === TypeReglement.ESPECE);
  const chequesDetails = allDetails.filter(d => d.type === TypeReglement.CHEQUE);
  const traitesDetails = allDetails.filter(d =>
    d.type === TypeReglement.TRAITE_BANCAIRE || d.type === TypeReglement.TRAITE_DOMICILE
  );
  const virementsDetails = allDetails.filter(d => d.type === TypeReglement.VIREMENT);

  // En attente uniquement (exclure espèces déjà encaissées)
  const enAttenteDetails = allDetails.filter(d => d.statut !== 'ENCAISSE' && d.type !== 'ESPECE');

  // Statistiques basées sur les détails
  const totalEspeces = especesDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalCheques = chequesDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalTraites = traitesDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalVirements = virementsDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalGeneral = allDetails.reduce((sum, d) => sum + d.montant, 0);
  const totalEncaisse = allDetails.filter(d => d.statut === 'ENCAISSE').reduce((sum, d) => sum + d.montant, 0);
  const totalEnAttente = enAttenteDetails.reduce((sum, d) => sum + d.montant, 0);

  // Échéances
  const today = new Date();
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

  const echeancesUrgentes = enAttenteDetails.filter(
    (d) => d.echeance && new Date(d.echeance) <= in3Days
  );
  const echeancesProches = enAttenteDetails.filter(
    (d) => d.echeance && new Date(d.echeance) > in3Days && new Date(d.echeance) <= in7Days
  );

  const tauxRecouvrement = totalGeneral > 0
    ? Math.round((totalEncaisse / totalGeneral) * 100)
    : 0;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case TypeReglement.ESPECE:
        return <Banknote className="h-4 w-4" />;
      case TypeReglement.CHEQUE:
        return <FileText className="h-4 w-4" />;
      case TypeReglement.TRAITE_BANCAIRE:
      case TypeReglement.TRAITE_DOMICILE:
        return <CalendarClock className="h-4 w-4" />;
      case TypeReglement.VIREMENT:
        return <CreditCard className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case TypeReglement.ESPECE:
        return "Espèce";
      case TypeReglement.CHEQUE:
        return "Chèque";
      case TypeReglement.TRAITE_BANCAIRE:
        return "Traite bancaire";
      case TypeReglement.TRAITE_DOMICILE:
        return "Traite domiciliée";
      case TypeReglement.VIREMENT:
        return "Virement";
      default:
        return type;
    }
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'ENCAISSE':
        return "bg-green-500 text-white";
      case 'REJETE':
        return "bg-red-500 text-white";
      default:
        return "bg-yellow-500 text-white";
    }
  };

  const getStatutLabel = (statut: string) => {
    switch (statut) {
      case 'ENCAISSE':
        return "Encaissé";
      case 'EN_ATTENTE':
        return "En attente";
      case 'REJETE':
        return "Rejeté";
      case 'PAYE':
        return "Payé";
      default:
        return statut;
    }
  };

  const renderPaiementCard = (item: PaymentItem, urgent = false) => (
    <div
      key={item.id}
      className={cn(
        "flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-lg border p-4 gap-4",
        urgent ? "border-red-500/50 bg-red-500/5" : "border-border"
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg",
            urgent ? "bg-red-500/10 text-red-500" : "bg-primary/10 text-primary"
          )}
        >
          {getTypeIcon(item.type)}
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-medium">
              {item.reference || getTypeLabel(item.type)}
            </span>
            <Badge variant="outline">
              {getTypeLabel(item.type)}
            </Badge>
            {item.isDetail && (
              <Badge variant="secondary" className="text-xs">
                Paiement mixte
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {item.client?.nom} {item.banque && `- ${item.banque}`}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
        {item.echeance && (
          <div className="text-left sm:text-right">
            <p className="text-xs text-muted-foreground">Échéance</p>
            <p className={cn("font-medium", urgent && "text-red-500")}>
              {formatDate(new Date(item.echeance))}
            </p>
          </div>
        )}
        <div className="text-left sm:text-right">
          <p className="text-xs text-muted-foreground">Montant</p>
          <p className="font-semibold">{formatCurrency(item.montant)}</p>
        </div>
        {item.statut !== 'ENCAISSE' && (
          <Badge className={getStatutColor(item.statut)}>
            {getStatutLabel(item.statut)}
          </Badge>
        )}
        {item.statut === 'EN_ATTENTE' && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleEncaisser(
              item.id,
              item.detailIndex,
              item.isDetail,
              item.isDetail ? item.parentId : undefined
            )}
            disabled={encaissementInProgress === (item.isDetail ? `${item.parentId}_${item.detailIndex}` : item.id)}
            className="whitespace-nowrap"
          >
            {encaissementInProgress === (item.isDetail ? `${item.parentId}_${item.detailIndex}` : item.id) ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                En cours...
              </>
            ) : (
              <>
                <CheckCircle className="mr-1 h-4 w-4" />
                Encaisser
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header
            title="Recouvrement Clients"
            subtitle="Suivi des créances et paiements clients"
          />
          <main className="p-4 md:p-6">
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header
          title="Recouvrement Clients"
          subtitle="Suivi des créances et paiements clients"
        />
        <main className="p-4 md:p-6">
          <div className="space-y-6">
            {/* Dashboard Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Créances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(totalGeneral)}</div>
                  <p className="text-xs text-muted-foreground">{allDetails.length} paiement(s)</p>
                </CardContent>
              </Card>
              <Card className="border-green-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Encaissé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEncaisse)}</div>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    En Attente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">{formatCurrency(totalEnAttente)}</div>
                  <p className="text-sm text-muted-foreground">{enAttenteDetails.length} paiement(s)</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <AlertTriangle className="h-4 w-4" />
                    Échéances Urgentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{echeancesUrgentes.length}</div>
                  <p className="text-sm text-muted-foreground">Dans les 3 jours</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <BarChart3 className="h-4 w-4" />
                    Taux Recouvrement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{tauxRecouvrement}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Breakdown by type - CORRIGÉ */}
            <div className="grid gap-4 sm:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Espèces</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(totalEspeces)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Chèques</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(totalCheques)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarClock className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">Traites</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(totalTraites)}</span>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-indigo-600" />
                      <span className="text-sm">Virements</span>
                    </div>
                    <span className="font-semibold">{formatCurrency(totalVirements)}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="en-attente">
              <TabsList className="flex flex-wrap">
                <TabsTrigger value="en-attente" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  En Attente ({enAttenteDetails.length})
                </TabsTrigger>
                <TabsTrigger value="urgentes" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Urgentes ({echeancesUrgentes.length})
                </TabsTrigger>
                <TabsTrigger value="echeances-proches" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Échéances Proches ({echeancesProches.length})
                </TabsTrigger>
                <TabsTrigger value="traites" className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" />
                  Traites ({traitesDetails.length})
                </TabsTrigger>
                <TabsTrigger value="cheques" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Chèques ({chequesDetails.length})
                </TabsTrigger>
                <TabsTrigger value="virements" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Virements ({virementsDetails.length})
                </TabsTrigger>
                <TabsTrigger value="historique" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Historique
                </TabsTrigger>
              </TabsList>

              <TabsContent value="en-attente" className="mt-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-500" />
                      Paiements en Attente
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={fetchReglements}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Actualiser
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {enAttenteDetails.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun paiement en attente
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {enAttenteDetails.map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="urgentes" className="mt-4">
                <Card className="border-red-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-600">
                      <AlertTriangle className="h-5 w-5" />
                      Échéances Urgentes (3 jours)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {echeancesUrgentes.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune échéance urgente
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {echeancesUrgentes.map((item) => renderPaiementCard(item, true))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="echeances-proches" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-yellow-600" />
                      Échéances Proches (7 jours)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {echeancesProches.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune échéance proche
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {echeancesProches.map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="traites" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarClock className="h-5 w-5 text-primary" />
                      Traites Bancaires et Domiciliées
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {traitesDetails.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucune traite
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {traitesDetails.map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cheques" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-primary" />
                      Chèques
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {chequesDetails.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun chèque
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {chequesDetails.map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="virements" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-primary" />
                      Virements Bancaires
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {virementsDetails.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun virement
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {virementsDetails.map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="historique" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" />
                      Historique des Paiements Encaissés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {allDetails.filter(d => d.statut === 'ENCAISSE').length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Aucun paiement encaissé
                      </p>
                    ) : (
                      <div className="space-y-4">
                        {allDetails
                          .filter(d => d.statut === 'ENCAISSE')
                          .map((item) => renderPaiementCard(item))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}