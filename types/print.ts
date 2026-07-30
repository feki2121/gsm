/**
 * Types pour le système d'impression
 */

export type PrintFormat = "A4" | "TICKET";

export interface PrintLayoutProps {
    format: PrintFormat;
    children: React.ReactNode;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyVAT?: string;
}

export interface PrintHeaderProps {
    format: PrintFormat;
    title: string;
    reference?: string;
    date?: Date | string;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    companyVAT?: string;
    logoUrl?: string;
}

export interface PrintFooterProps {
    format: PrintFormat;
    companyName?: string;
    companyAddress?: string;
    companyPhone?: string;
    customMessage?: string;
}

export interface ClientAddress {
    id: string;
    adresse: string;
}
export interface BLPrintData {
    id: string;
    numero: string;
    date: Date | string;
    client?: {
        nom: string;
        mf?: string | null;
        cin?: string | null;
        telephone?: string | null;
        adresse?: string | null;
        addresses?: ClientAddress[];
        solde?: number;
        creditAutorise?: number | null;
        creditDisponible?: number;
        estAutoriseCredit?: boolean;
        estProspect?: boolean;
        estPasseParBL?: boolean;
    };
    statut: string;
    factureId?: string;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    resteCredit?: number;
    montantCredit?: number;
    remise?: number;
    lignes: Array<{
        product?: {
            reference: string;
            designation: string;
        };
        home?: {
            nom: string;
        };
        quantite: number;
        prixUnitaire: number;
        totalLigne?: number;
    }>;
}

export interface BEPrintData {
    id: string;
    numero: string;
    date: Date | string;
    fournisseur?: {
        nom: string;
        adresse?: string | null;
        telephone?: string | null;
    };
    type?: string;
    referenceDoc?: string;
    description?: string;
    statut: string;
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    lignes: Array<{
        product?: {
            id?: string;
            reference: string;
            designation: string;
            prixAchat?: number;
        };
        quantite: number;
        prixUnitaireHT: number;
        tva: number;
        totalHT?: number;
        totalTTC?: number;
    }>;
}

export interface FacturePrintData {
    id: string;
    numero: string;
    date: Date | string;
    client?: {
        nom: string;
        mf?: string | null;
        cin?: string | null;
        email?: string | null;
        telephone?: string | null;
        adresse?: string | null;
        addresses?: ClientAddress[];
        solde?: number;
        matriculeFiscale?: string | null;
        creditAutorise?: number | null;
        creditDisponible?: number;
        estAutoriseCredit?: boolean;
        estProspect?: boolean;
        estPasseParBL?: boolean;
    };
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    remise?: number; // Peut être en % ou en DT selon le mode
    totalHTBrut?: number;
    totalRemise?: number;
    useGlobalRemise?: boolean; // ✅ Indique si on utilise la remise globale en DT
    remiseGlobaleDT?: number;  // ✅ Valeur de la remise globale en DT
    lignes: Array<{
        product?: {
            reference: string;
            designation: string;
            prixUnitaire?: number;
        };
        home?: {
            nom: string;
        };
        quantite: number;
        prixUnitaire: number;      // PU HT après remise (base TVA)
        prixUnitaireBrut?: number; // PU HT avant remise
        remiseLigne?: number;      // Pourcentage de remise (0 si remise globale)
        montantRemise?: number;    // Montant de la remise
        tva: number;
        totalHT: number;
        totalHTBrut?: number;
        totalTVA?: number;
        totalTTC?: number;
    }>;
}

// /types/print.ts
export interface DevisPrintData {
    id: string;
    numero: string;
    date: Date;
    validite: Date;
    client?: {
        nom: string;
        adresse?: string;
        telephone?: string;
    };
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    remise?: number;
    remiseType?: string;
    totalHTBrut?: number;
    totalTTCBrut?: number;
    lignes: Array<{
        product?: {
            reference: string;
            designation: string;
            tva: number;
        };
        quantite: number;
        prixUnitaire: number;
        prixUnitaireHT?: number;
        totalTTC?: number;
        totalHT?: number;
    }>;
}

export interface BonSortiePrintData {
    id: string;
    numero: string;
    date: Date | string;
    destination: string;
    nomConducteur: string;
    matriculeVehicule: string;
    numCIN: string;
    adresseLivraison: string;
    observation?: string;
    client?: {
        nom: string;
    };
    destinataire?: string;
    motif: string;
    statut: string;
    totalHT: number;
    totalTTC: number;
    lignes: Array<{
        product?: {
            reference: string;
            designation: string;
        };
        quantite: number;
        prixUnitaireHT: number;
        prixUnitaireTTC: number;
    }>;
}

export interface UsePrintOptions {
    format?: PrintFormat;
    filename?: string;
    onBeforePrint?: () => void;
    onAfterPrint?: () => void;
}