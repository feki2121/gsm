"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDateTime } from "@/lib/types";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import {
  Banknote,
  FileText,
  CalendarClock,
  CreditCard,
  Wallet,
  Printer,
  RefreshCw,
  Calendar,
  TrendingUp,
  TrendingDown,
  LayoutGrid,
  CheckCircle,
  Clock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MouvementCaisse {
  id: string;
  date: string;
  type: "ENCAISSEMENT" | "DECAISSEMENT" | "DECAISSEMENTVIRTUEL" | "ENCAISSEMENTVIRTUEL" | "ENCAISSEMENTCREDIT";
  modeReglement: string;
  montant: number;
  reference: string | null;
  libelle: string;
  numeroDoc?: string | null;
  banque?: string | null;
  nameSecondClient?: string | null;
  dateEcheance?: string | null;
}

interface Caisse {
  id: string;
  date: string;
  soldeOuverture: number;
  totalEncaissements: number;
  totalDecaissements: number;
  soldeTheorique: number;
  soldeReel: number | null;
  ecart: number | null;
  statut: "OUVERTE" | "CLOTUREE";
}

interface Chauffeur {
  id: string;
  nom: string;
}

// ─── Mode config ──────────────────────────────────────────────────────────────

const MODES = [
  {
    key: "ALL",
    label: "Tous les mouvements",
    shortLabel: "Tous",
    Icon: LayoutGrid,
    accentHex: "#888780",
  },
  {
    key: "ESPECE",
    label: "Espèces",
    shortLabel: "Espèces",
    Icon: Banknote,
    accentHex: "#1D9E75",
  },
  {
    key: "CHEQUE",
    label: "Chèques",
    shortLabel: "Chèques",
    Icon: FileText,
    accentHex: "#378ADD",
  },
  {
    key: "TRAITE_BANCAIRE",
    label: "Traites bancaires",
    shortLabel: "Traites bank.",
    Icon: CalendarClock,
    accentHex: "#7F77DD",
  },
  {
    key: "VIREMENT",
    label: "Virements",
    shortLabel: "Virements",
    Icon: CreditCard,
    accentHex: "#BA7517",
  },
  {
    key: "CREDIT",
    label: "Crédit",
    shortLabel: "Crédit",
    Icon: CreditCard,
    accentHex: "#D4537E",
  },
  {
    key: "CREDITESPECE",
    label: "Crédit en espèces",
    shortLabel: "Recouvrement",
    Icon: CreditCard,
    accentHex: "#D4537E",
  },
] as const;

type ModeKey = (typeof MODES)[number]["key"];

const ticketStyles = `
  @media print {
    @page {
      size: 48mm auto;
      margin: 2mm;
    }
    
    body {
      margin: 0;
      padding: 0;
      font-family: 'Courier New', monospace;
    }
  }
  
  .ticket-print {
    width: 48mm;
    max-width: 48mm;
    margin: 0 auto;
    font-size: 9px;
    font-family: 'Courier New', monospace;
    line-height: 1.2;
  }
  
  .ticket-print .header {
    text-align: center;
    margin-bottom: 5px;
    padding-bottom: 3px;
    border-bottom: 1px dashed #000;
  }
  
  .ticket-print .logo-img {
    max-width: 10mm;
    width: 10mm;
    height: auto;
    margin: 0 auto;
    display: block;
  }
  
  .ticket-print .title {
    font-size: 10px;
    font-weight: bold;
    margin: 3px 0;
    letter-spacing: 1px;
  }
  
  .ticket-print .date {
    font-size: 7px;
    margin: 2px 0;
  }
  
  .ticket-print .period {
    font-size: 7px;
    margin: 2px 0;
    border-top: 1px dotted #000;
    padding-top: 2px;
  }
  
  .ticket-print .separator {
    border-top: 1px dashed #000;
    margin: 4px 0;
  }
  
  .ticket-print .section-title {
    font-weight: bold;
    margin: 4px 0 2px 0;
    font-size: 8px;
    text-align: center;
    background: #f0f0f0;
    padding: 2px;
  }
  
  .ticket-print .mode-item {
    display: flex;
    justify-content: space-between;
    padding: 2px 0;
    font-size: 8px;
  }
  
  .ticket-print .mode-name {
    font-weight: normal;
  }
  
  .ticket-print .mode-amount {
    font-weight: bold;
  }
  
  .ticket-print .total-item {
    display: flex;
    justify-content: space-between;
    padding: 3px 0;
    font-size: 9px;
  }
  
  .ticket-print .total-item.final {
    font-weight: bold;
    border-top: 1px dotted #000;
    margin-top: 3px;
    padding-top: 4px;
    font-size: 10px;
  }
  
  .ticket-print .footer {
    text-align: center;
    margin-top: 8px;
    padding-top: 4px;
    border-top: 1px dashed #000;
    font-size: 7px;
  }
  
  .ticket-print .signature-line {
    border-top: 1px dotted #000;
    width: 80%;
    margin: 6px auto 2px auto;
  }
  
  .ticket-print .signature-label {
    font-size: 6px;
    text-align: center;
  }
  .ticket-print .footer-info {
    font-size: 7px;
    margin: 2px 0;
    font-weight: bold;
    color: #1D9E75;
  }
`;

const MODES_BANCAIRES = ["CHEQUE", "TRAITE_BANCAIRE", "TRAITE_DOMICILE"];

function showBancaireCols(mode: ModeKey) {
  return MODES_BANCAIRES.includes(mode);
}

function buildTicketHtml(
  mouvements: MouvementCaisse[],
  modeLabel: string,
  dateDebut: string,
  dateFin: string,
  caisseData?: Caisse | null,
  chauffeurNom?: string | null,
  chauffeurPhone?: string | null

) {
  const summary = computeModeSummary(mouvements);

  const recette =
    summary.ESPECE.total +
    summary.CHEQUE.total +
    summary.TRAITE_BANCAIRE.total +
    summary.VIREMENT.total +
    summary.CREDIT.total;

  const totalEspece = summary.ESPECE.total + summary.CREDITESPECE.total;

  const dateRange =
    dateDebut === dateFin
      ? new Date(dateDebut).toLocaleDateString("fr-TN")
      : `Du ${new Date(dateDebut).toLocaleDateString("fr-TN")} au ${new Date(dateFin).toLocaleDateString("fr-TN")}`;

  const now = new Date().toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Ticket Caisse</title>
<style>${ticketStyles}</style>
</head>
<body>
<div class="ticket-print">
  
  <div class="header">
    <img src="/chiha.jpeg" alt="Logo" class="logo-img" style="max-width: 8mm;" onerror="this.style.display='none'" />
    <div class="title">CHIHA GSM</div>
    <div class="date">${now}</div>
    <div class="period">${dateRange}</div>
  </div>
  
  <div class="section-title">${modeLabel}</div>
  
  ${summary.ESPECE.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">💰 Espèces</span>
    <span class="mode-amount">${formatCurrency(summary.ESPECE.total)}</span>
  </div>
  ` : ''}
  
  ${summary.CHEQUE.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">📄 Chèques (${summary.CHEQUE.count})</span>
    <span class="mode-amount">${formatCurrency(summary.CHEQUE.total)}</span>
  </div>
  ` : ''}
  
  ${summary.TRAITE_BANCAIRE.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">📅 Traites (${summary.TRAITE_BANCAIRE.count})</span>
    <span class="mode-amount">${formatCurrency(summary.TRAITE_BANCAIRE.total)}</span>
  </div>
  ` : ''}
  
  ${summary.VIREMENT.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">🏦 Virements (${summary.VIREMENT.count})</span>
    <span class="mode-amount">${formatCurrency(summary.VIREMENT.total)}</span>
  </div>
  ` : ''}
  
  ${summary.CREDIT.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">💳 Crédit (${summary.CREDIT.count})</span>
    <span class="mode-amount">${formatCurrency(summary.CREDIT.total)}</span>
  </div>
  ` : ''}
  
  ${summary.CREDITESPECE.total > 0 ? `
  <div class="mode-item">
    <span class="mode-name">💵 Recouvrement (${summary.CREDITESPECE.count})</span>
    <span class="mode-amount">${formatCurrency(summary.CREDITESPECE.total)}</span>
  </div>
  ` : ''}
  
  <div class="separator"></div>
   <div class="total-item final">
    <span>💰 TOTAL ESPÈCES</span>
    <span>${formatCurrency(totalEspece)}</span>
  </div>
  
  <div class="total-item final">
    <span>💰 TOTAL RECETTE</span>
    <span>${formatCurrency(recette)}</span>
  </div>
  
  ${caisseData ? `
  <div class="separator"></div>
  
  <div class="total-item final">
    <span>📊 STATUT</span>
    <span>${caisseData?.statut === 'OUVERTE' ? 'OUVERTE' : 'CLÔTURÉE'}</span>
  </div>
  ` : ''}
  
  <div class="footer">
    ${chauffeurNom ? `<div class="footer-info">👤 ${chauffeurNom}</div>` : ''}
    ${chauffeurPhone ? `<div class="footer-info">📱 ${chauffeurPhone}</div>` : ''}
    <div class="signature-line"></div>
    <div class="signature-label">Signature</div>
  </div>

  
</div>
<script>
  window.onload = () => {
    setTimeout(() => window.print(), 100);
  };
</script>
</body>
</html>`;
}


function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("fr-TN");
}

function fmtDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("fr-TN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getModeConfig(key: string) {
  return MODES.find((m) => m.key === key) ?? MODES[0];
}

function filterMovements(mouvements: MouvementCaisse[], mode: ModeKey) {
  let visible = mouvements.filter((m) => m.type !== "DECAISSEMENTVIRTUEL" && m.type !== "DECAISSEMENT");

  if (mode === "ALL") return visible;

  const filterRules: Record<ModeKey, (m: MouvementCaisse) => boolean> = {
    ALL: () => true,
    ESPECE: (m) => m.modeReglement === "ESPECE" && m.type === "ENCAISSEMENT",
    CHEQUE: (m) => m.modeReglement === "CHEQUE" && m.type === "ENCAISSEMENT",
    TRAITE_BANCAIRE: (m) => m.modeReglement === "TRAITE_BANCAIRE" && m.type === "ENCAISSEMENT",
    VIREMENT: (m) => m.modeReglement === "VIREMENT" && m.type === "ENCAISSEMENT",
    CREDIT: (m) => m.type === "ENCAISSEMENTVIRTUEL",
    CREDITESPECE: (m) => m.type === "ENCAISSEMENTCREDIT",
  };

  return visible.filter(filterRules[mode]);
}

function computeSummary(mouvements: MouvementCaisse[]) {
  const enc = mouvements
    .filter((m) => m.type === "ENCAISSEMENT")
    .reduce((s, m) => s + m.montant, 0);

  const credits = mouvements
    .filter((m) => m.type === "ENCAISSEMENTVIRTUEL")
    .reduce((s, m) => s + m.montant, 0);

  const creditsEspeces = mouvements
    .filter((m) => m.type === "ENCAISSEMENTCREDIT")
    .reduce((s, m) => s + m.montant, 0);

  const dec = mouvements
    .filter((m) => m.type === "DECAISSEMENT")
    .reduce((s, m) => s + m.montant, 0);

  const recette = enc + credits;

  return {
    enc,
    credits,
    creditsEspeces,
    dec,
    recette,
    net: enc + credits + creditsEspeces - dec,
  };
}

function computeModeSummary(mouvements: MouvementCaisse[]) {
  const byMode = {
    ESPECE: { total: 0, count: 0 },
    CHEQUE: { total: 0, count: 0 },
    TRAITE_BANCAIRE: { total: 0, count: 0 },
    VIREMENT: { total: 0, count: 0 },
    CREDIT: { total: 0, count: 0 }, // ENCAISSEMENTVIRTUEL
    CREDITESPECE: { total: 0, count: 0 }, // ENCAISSEMENTCREDIT
  };

  for (const m of mouvements) {
    const amount = m.montant;

    if (m.modeReglement === "ESPECE") {
      byMode.ESPECE.total += amount;
      byMode.ESPECE.count++;
    }

    if (m.modeReglement === "CHEQUE") {
      byMode.CHEQUE.total += amount;
      byMode.CHEQUE.count++;
    }

    if (m.modeReglement === "TRAITE_BANCAIRE") {
      byMode.TRAITE_BANCAIRE.total += amount;
      byMode.TRAITE_BANCAIRE.count++;
    }

    if (m.modeReglement === "VIREMENT") {
      byMode.VIREMENT.total += amount;
      byMode.VIREMENT.count++;
    }

    if (m.type === "ENCAISSEMENTVIRTUEL") {
      byMode.CREDIT.total += amount;
      byMode.CREDIT.count++;
    }

    if (m.type === "ENCAISSEMENTCREDIT") {
      byMode.CREDITESPECE.total += amount;
      byMode.CREDITESPECE.count++;
    }
  }

  return byMode;
}

function buildPrintHtml(
  mouvements: MouvementCaisse[],
  modeLabel: string,
  dateDebut: string,
  dateFin: string
) {
  const summary = computeModeSummary(mouvements);
  const recette =
    summary.ESPECE.total +
    summary.CHEQUE.total +
    summary.TRAITE_BANCAIRE.total +
    summary.VIREMENT.total +
    summary.CREDIT.total;
  const dateRange =
    dateDebut === dateFin
      ? `Le ${new Date(dateDebut).toLocaleDateString("fr-TN")}`
      : `Du ${new Date(dateDebut).toLocaleDateString("fr-TN")} au ${new Date(
        dateFin
      ).toLocaleDateString("fr-TN")}`;

  const block = (label: string, data: { total: number; count: number }) => `
    <div class="card">
      <div class="label">${label}</div>
      <div class="value">${formatCurrency(data.total)}</div>
      <div class="sub">${data.count} mvt${data.count > 1 ? "s" : ""}</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<title>Résumé Caisse</title>

<style>
  body { font-family: Arial; padding: 24px; }

  .header {
    display:flex;
    justify-content:space-between;
    border-bottom:2px solid #000;
    padding-bottom:12px;
    margin-bottom:20px;
  }

  .title { text-align:right; }

  .grid {
    display:grid;
    grid-template-columns:repeat(2, 1fr);
    gap:14px;
  }

  .card {
    border:1px solid #ddd;
    border-radius:10px;
    padding:12px;
  }

  .label { font-size:12px; color:#666; }
  .value { font-size:20px; font-weight:700; margin-top:4px; }
  .sub { font-size:11px; color:#999; margin-top:2px; }

</style>
</head>

<body>

<div class="header">
  <div>
    <div><b>CHIHA GSM</b></div>
    <div style="font-size:11px;color:#666">
      SFAX - Tél: 24 807 784
    </div>
  </div>

  <div class="title">
    <div><b>Résumé Caisse</b></div>
    <div style="font-size:12px">${modeLabel}</div>
    <div style="font-size:11px;color:#666">${dateRange}</div>
  </div>
</div>

<div class="grid">

${block("Recette", {
    total: recette,
    count:
      summary.ESPECE.count +
      summary.CHEQUE.count +
      summary.TRAITE_BANCAIRE.count +
      summary.VIREMENT.count +
      summary.CREDIT.count,
  })}

  ${block("Espèces", summary.ESPECE)}

  ${block("Chèques", summary.CHEQUE)}

  ${block("Traites bank.", summary.TRAITE_BANCAIRE)}

  ${block("Virements", summary.VIREMENT)}

  ${block("Crédit", summary.CREDIT)}

  ${block("Recouvrement", summary.CREDITESPECE)}

</div>

<script>
  window.onload = () => window.print();
</script>

</body>
</html>`;
}

function openPrint(html: string) {
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CaisseHistoriquePage() {
  const { sidebarClasses } = useSidebar();
  const { data: session } = useSession();
  const { toast } = useToast();

  // ── Mouvements state ──────────────────────────────────────────────────────
  const [mouvements, setMouvements] = useState<MouvementCaisse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateDebut, setDateDebut] = useState(new Date().toISOString().split("T")[0]);
  const [dateFin, setDateFin] = useState(new Date().toISOString().split("T")[0]);
  const [activeMode, setActiveMode] = useState<ModeKey>("ALL");

  // ── Admin state ───────────────────────────────────────────────────────────
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [selectedChauffeurId, setSelectedChauffeurId] = useState<string>("");

  // ── Caisse / clôture state ────────────────────────────────────────────────
  const [caisse, setCaisse] = useState<Caisse | null>(null);
  const [isClotureDialogOpen, setIsClotureDialogOpen] = useState(false);
  const [soldeReel, setSoldeReel] = useState("");
  const [isClosing, setIsClosing] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  // Charger les chauffeurs pour l'admin
  useEffect(() => {
    if (isAdmin) {
      fetchChauffeurs();
    }
  }, [isAdmin]);

  const fetchChauffeurs = async () => {
    try {
      const response = await fetch("/api/chauffeurs?limit=100");
      const data = await response.json();
      setChauffeurs(data.data || []);
    } catch (error) {
      console.error("Error fetching chauffeurs:", error);
    }
  };

  async function fetchData() {
    setIsLoading(true);
    try {
      let url = `/api/caisse?dateDebut=${dateDebut}&dateFin=${dateFin}`;

      // Ajouter le filtre chauffeur si sélectionné
      if (isAdmin && selectedChauffeurId) {
        url += `&chauffeurId=${selectedChauffeurId}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      setCaisse({
        id: data.id,
        date: data.date,
        soldeOuverture: data.soldeOuverture ?? 0,
        totalEncaissements: data.totalEncaissements ?? 0,
        totalDecaissements: data.totalDecaissements ?? 0,
        soldeTheorique: data.soldeTheorique ?? 0,
        soldeReel: data.soldeReel ?? null,
        ecart: data.ecart ?? null,
        statut: data.statut ?? "OUVERTE",
      });
      setMouvements(data.mouvementsAffichage || data.mouvements || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les mouvements", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [dateDebut, dateFin, selectedChauffeurId]);

  const filtered = filterMovements(mouvements, activeMode);
  const summary = computeSummary(filtered);
  const activeModeConfig = getModeConfig(activeMode);

  // ── Clôture ───────────────────────────────────────────────────────────────
  async function handleCloture(e: React.FormEvent) {
    e.preventDefault();

    console.log('=== CLOTURE DEBUG ===');
    console.log('soldeReel:', soldeReel);

    if (!soldeReel || parseFloat(soldeReel) < 0) {
      toast({ title: "Erreur", description: "Veuillez saisir un solde réel valide", variant: "destructive" });
      return;
    }

    setIsClosing(true);
    try {
      // Plus besoin d'envoyer la date !
      const res = await fetch("/api/caisse/cloture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soldeReel: parseFloat(soldeReel)
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Erreur lors de la clôture");
      }

      toast({ title: "Succès", description: "Caisse clôturée avec succès" });
      setIsClotureDialogOpen(false);
      setSoldeReel("");
      fetchData();
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Impossible de clôturer",
        variant: "destructive"
      });
    } finally {
      setIsClosing(false);
    }
  }

  function handlePrint() {
    const modeLabel = activeMode === "ALL" ? "Tous les modes" : activeModeConfig.label;
    const html = buildPrintHtml(filtered, modeLabel, dateDebut, dateFin);
    openPrint(html);
  }

  function handlePrintTicket() {
    const modeLabel = activeMode === "ALL" ? "" : activeModeConfig.label;

    // Récupérer les infos de l'utilisateur connecté
    const userName = session?.user?.name || session?.user?.username || "Utilisateur";
    const userPhone = session?.user?.phone || null;

    // Si c'est un admin et qu'il a sélectionné un chauffeur, utiliser le nom du chauffeur
    let chauffeurNom = userName;
    let chauffeurPhone = userPhone;

    if (isAdmin && selectedChauffeurId && selectedChauffeurId !== "none") {
      const chauffeur = chauffeurs.find(c => c.id === selectedChauffeurId);
      if (chauffeur) {
        chauffeurNom = chauffeur.nom;
      }
    }
    const html = buildTicketHtml(filtered, modeLabel, dateDebut, dateFin, caisse, chauffeurNom, chauffeurPhone);
    openPrint(html);
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Historique de Caisse" subtitle="Mouvements par mode de règlement" />

        <main className="p-4 md:p-6 space-y-6">

          {/* ── Toolbar ── */}
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex flex-wrap items-center gap-4">

                {/* Dates */}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Label className="text-sm">Du</Label>
                  <Input type="date" value={dateDebut}
                    onChange={(e) => setDateDebut(e.target.value)}
                    className="w-auto h-8 text-sm" />
                  <Label className="text-sm">Au</Label>
                  <Input type="date" value={dateFin} min={dateDebut}
                    onChange={(e) => setDateFin(e.target.value)}
                    className="w-auto h-8 text-sm" />
                </div>

                <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
                  <RefreshCw className={cn("h-4 w-4 mr-1.5", isLoading && "animate-spin")} />
                  Actualiser
                </Button>

                {/* Filtre chauffeur pour admin */}
                {isAdmin && (
                  <div className="flex items-center gap-2 ml-4">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <Label>Chauffeur</Label>
                    <Select
                      value={selectedChauffeurId || "none"}
                      onValueChange={(value) => setSelectedChauffeurId(value === "none" ? "" : value)}
                    >
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Caisse Admin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Caisse Admin</SelectItem>
                        {chauffeurs.map((chauffeur) => (
                          <SelectItem key={chauffeur.id} value={chauffeur.id}>
                            {chauffeur.nom}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="ml-auto flex items-center gap-2">
                  {/* Statut badge */}
                  {caisse && (
                    <div className="flex items-center gap-1.5">
                      {caisse.statut === "OUVERTE"
                        ? <Clock className="h-4 w-4 text-green-500" />
                        : <CheckCircle className="h-4 w-4 text-red-500" />}
                      <Badge className={caisse.statut === "OUVERTE" ? "bg-green-500 text-white" : "bg-red-500 text-white"}>
                        {caisse.statut === "OUVERTE" ? "Ouverte" : "Clôturée"}
                      </Badge>
                    </div>
                  )}

                  {/* Clôturer */}
                  {caisse?.statut === "OUVERTE" && (
                    <Dialog open={isClotureDialogOpen} onOpenChange={setIsClotureDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <CheckCircle className="h-4 w-4 mr-1.5" />
                          Clôturer la caisse
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Clôturer la Caisse</DialogTitle>
                          <DialogDescription>Vérifiez le solde réel avant de clôturer</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleCloture}>
                          <div className="space-y-4 py-4">
                            <div className="bg-muted p-4 rounded-lg">
                              <div className="flex justify-between text-sm">
                                <span>Solde théorique :</span>
                                <span className="font-bold">{formatCurrency(caisse.soldeTheorique)}</span>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Solde réel compté *</Label>
                              <Input type="number" step="0.001" placeholder="0.000"
                                value={soldeReel}
                                onChange={(e) => setSoldeReel(e.target.value)}
                                required />
                            </div>
                            {soldeReel && caisse.soldeTheorique !== parseFloat(soldeReel) && (
                              <div className="bg-yellow-500/10 border border-yellow-500 p-3 rounded-lg">
                                <p className="text-sm text-yellow-600">
                                  Écart : {formatCurrency(parseFloat(soldeReel) - caisse.soldeTheorique)}
                                </p>
                              </div>
                            )}
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsClotureDialogOpen(false)}>
                              Annuler
                            </Button>
                            <Button type="submit" variant="destructive" disabled={isClosing}>
                              {isClosing ? "Clôture…" : "Confirmer la clôture"}
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  )}

                  {/* Boutons d'impression */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrint}
                      disabled={filtered.length === 0}
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Imprimer A4
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrintTicket}
                      disabled={filtered.length === 0}
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                    >
                      <Printer className="h-4 w-4 mr-1.5" />
                      Ticket
                    </Button>
                  </div>

                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary mini-cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {MODES.filter((m) => m.key !== "ALL").map((mode) => {
              const mv = filterMovements(mouvements, mode.key as ModeKey);
              const summaryData = computeSummary(mv);
              const hasData = mv.length > 0;
              const Icon = mode.Icon;

              let montantAffiche = 0;
              if (mode.key === "CREDIT") {
                montantAffiche = summaryData.credits;
              } else if (mode.key === "CREDITESPECE") {
                montantAffiche = summaryData.creditsEspeces;
              } else {
                montantAffiche = summaryData.enc;
              }

              return (
                <button key={mode.key}
                  onClick={() => hasData && setActiveMode(mode.key as ModeKey)}
                  disabled={!hasData}
                  style={activeMode === mode.key
                    ? { borderColor: mode.accentHex, boxShadow: `0 0 0 1px ${mode.accentHex}` }
                    : {}}
                  className={cn(
                    "rounded-xl border bg-card p-3 text-left transition-all",
                    hasData ? "cursor-pointer hover:border-foreground/30" : "opacity-40 cursor-not-allowed"
                  )}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Icon className="h-3.5 w-3.5" style={{ color: mode.accentHex }} />
                    <span className="text-xs font-medium text-muted-foreground">{mode.shortLabel}</span>
                  </div>
                  <p className="text-sm font-bold tabular-nums" style={{ color: mode.accentHex }}>
                    {formatCurrency(montantAffiche)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {mv.length} mvt{mv.length !== 1 ? "s" : ""}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Mode pills */}
          <div className="flex flex-wrap gap-2">
            {MODES.filter((m) => {
              if (m.key === "ALL") return true;
              const mv = filterMovements(mouvements, m.key as ModeKey);
              return mv.length > 0;
            }).map((mode) => {
              const Icon = mode.Icon;
              const isActive = activeMode === mode.key;
              const mv = filterMovements(mouvements, mode.key as ModeKey);
              return (
                <button key={mode.key}
                  onClick={() => setActiveMode(mode.key as ModeKey)}
                  style={isActive ? {
                    backgroundColor: mode.key === "ALL" ? "#f1f0eb" : mode.accentHex,
                    color: mode.key === "ALL" ? "#2c2c2a" : "#fff",
                    borderColor: mode.key === "ALL" ? "#d3d1c7" : mode.accentHex,
                  } : {}}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-all",
                    isActive ? "shadow-sm" : "bg-muted/40 text-muted-foreground hover:bg-muted border-border"
                  )}>
                  <Icon className="h-3.5 w-3.5" />
                  {mode.shortLabel}
                  <span className={cn(
                    "ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                    isActive
                      ? mode.key === "ALL" ? "bg-black/10 text-inherit" : "bg-white/25 text-white"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {mv.length}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Table section */}
          <div className="rounded-xl border overflow-hidden">

            {/* Section header */}
            <div className="flex items-center justify-between px-5 py-4"
              style={{
                backgroundColor: activeMode === "ALL" ? "hsl(var(--muted)/0.4)" : `${activeModeConfig.accentHex}12`,
                borderBottom: `2px solid ${activeMode === "ALL" ? "hsl(var(--border))" : `${activeModeConfig.accentHex}40`}`,
              }}>
              <div className="flex items-center gap-3">
                {(() => {
                  const Icon = activeModeConfig.Icon;
                  return (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: activeMode === "ALL" ? "hsl(var(--background))" : `${activeModeConfig.accentHex}20` }}>
                      <Icon className="h-4 w-4"
                        style={{ color: activeMode === "ALL" ? "hsl(var(--muted-foreground))" : activeModeConfig.accentHex }} />
                    </div>
                  );
                })()}
                <div>
                  <h2 className="text-sm font-semibold">{activeModeConfig.label}</h2>
                  <p className="text-xs text-muted-foreground">
                    {filtered.length} mouvement{filtered.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Table body */}
            {isLoading ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" /> Chargement…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
                <Wallet className="h-8 w-8 opacity-30" />
                <p className="text-sm">Aucun mouvement pour cette sélection</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-36">Date / Heure</TableHead>
                      {activeMode === "ALL" && (
                        <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-32">Mode</TableHead>
                      )}
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Libellé</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Payeur</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">N° Doc</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Banque</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground w-28">Échéance</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground text-right w-32">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m, i) => {
                      const modeConf = getModeConfig(m.modeReglement);
                      const isEnc = m.type === "ENCAISSEMENT";
                      const isCreditsEspeces = m.type === "ENCAISSEMENTCREDIT";
                      const rowBanc = MODES_BANCAIRES.includes(m.modeReglement);
                      return (
                        <TableRow key={m.id}
                          className={cn("transition-colors", i % 2 === 0 ? "bg-background" : "bg-muted/20")}>

                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {fmtDateTime(m.date)}
                          </TableCell>

                          {activeMode === "ALL" && (
                            <TableCell>
                              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                  backgroundColor: m.type === "ENCAISSEMENTVIRTUEL"
                                    ? "#D4537E20"
                                    : m.type === "ENCAISSEMENTCREDIT"
                                      ? "#1D9E7520"
                                      : `${modeConf.accentHex}18`,
                                  color: m.type === "ENCAISSEMENTVIRTUEL"
                                    ? "#D4537E"
                                    : m.type === "ENCAISSEMENTCREDIT"
                                      ? "#1D9E75"
                                      : modeConf.accentHex
                                }}>
                                {m.type === "ENCAISSEMENTVIRTUEL" && <CreditCard className="h-2.5 w-2.5" />}
                                {m.type === "ENCAISSEMENTCREDIT" && <Banknote className="h-2.5 w-2.5" />}
                                {m.type === "ENCAISSEMENT" && m.modeReglement !== "CREDIT" && <modeConf.Icon className="h-2.5 w-2.5" />}
                                {m.type === "ENCAISSEMENTVIRTUEL" && "Crédit"}
                                {m.type === "ENCAISSEMENTCREDIT" && "Recouvrement"}
                                {m.type === "ENCAISSEMENT" && m.modeReglement !== "CREDIT" && modeConf.shortLabel}
                              </span>
                            </TableCell>
                          )}

                          <TableCell className="text-sm max-w-[200px] truncate">{m.libelle}</TableCell>

                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {rowBanc ? (m.nameSecondClient || "–") : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {rowBanc ? (m.numeroDoc || "–") : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rowBanc ? (m.banque || "–") : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {rowBanc ? fmtDate(m.dateEcheance) : <span className="text-muted-foreground/30">—</span>}
                          </TableCell>

                          <TableCell className={cn(
                            "text-right text-sm font-semibold tabular-nums",
                            (isEnc || isCreditsEspeces) ? "text-emerald-600" : "text-red-500"
                          )}>
                            {(isEnc || isCreditsEspeces) ? "+" : "+"}{formatCurrency(m.montant)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}