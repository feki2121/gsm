"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/types";
import { Loader2, Plus, Trash2, Save, Package, X, CreditCard, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import Select2 from "react-select";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Fournisseur {
  id: string;
  nom: string;
}

interface Product {
  id: string;
  reference: string;
  code: string;
  designation: string;
  prixAchat: number;
  prixAchatHT: number;
  prixVente: number;
  prixVenteHT: number;
  tva: number
}

interface Category {
  id: string;
  nom: string;
}

interface LigneBonEntree {
  id: string;
  productId: string;
  productDesignation?: string;
  quantite: number;
  prixUnitaireTTC: number;
  prixUnitaireHT: number;
  prixVente: number;
  prixVenteHT: number;
  tva: number;
  isNewProduct?: boolean;
  newProduct?: {
    reference: string;
    code: string;
    designation: string;
    categoryId: string;
    prixVente: number;
    prixVenteHT: number;
    seuilAlerte: number;
    plafondRemise: number;
    imageUrl?: string;
  };
  generatedCode?: string;
}

interface PaiementDetail {
  type: string;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  imageUrl?: string | null;
}

type OptionType = {
  value: string;
  label: string;
  isDisabled?: boolean
};


export default function CreerBonEntreePage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const { toast } = useToast();
  const [isMounted, setIsMounted] = useState(false);
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReglementDialogOpen, setIsReglementDialogOpen] = useState(false);
  const [hasFodec, setHasFodec] = useState(false);
  const [isFournisseurDialogOpen, setIsFournisseurDialogOpen] = useState(false);
  const [isSubmittingFournisseur, setIsSubmittingFournisseur] = useState(false);
  const [fournisseurFormData, setFournisseurFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
  });
  const [isUploading, setIsUploading] = useState(false);
  const [productImage, setProductImage] = useState<string>("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [paymentImages, setPaymentImages] = useState<{ [key: number]: string }>({});
  // État pour les paiements
  const [paiements, setPaiements] = useState<PaiementDetail[]>([
    { type: "ESPECE", montant: 0, reference: "", banque: "", echeance: "", imageUrl: "" }
  ]);
  const [montantTotalPaiements, setMontantTotalPaiements] = useState(0);
  const [formData, setFormData] = useState({
    fournisseurId: "",
    date: new Date().toISOString().split('T')[0],
    type: "AUCUN",
    referenceDoc: "",
    description: "",
    prixAchat: "",
    prixAchatHT: "",
    prixVente: "",
    prixVenteHT: "",
    tva: 19,
  });


  const [lignes, setLignes] = useState<LigneBonEntree[]>([
    { id: `ligne-${Date.now()}`, productId: "", quantite: 1, prixUnitaireTTC: 0, prixUnitaireHT: 0, prixVente: 0, prixVenteHT: 0, tva: 19 }
  ]);

  const options: OptionType[] = products.map((p) => ({
    value: p.id,
    label: p.designation,
  }));

  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [newProductData, setNewProductData] = useState({
    reference: "",
    code: "",
    designation: "",
    categoryId: "",
    prixVente: 0,
    prixVenteHT: 0,
    marge: 0,
    prixAchat: 0,
    prixAchatHT: 0,
    tva: 19,
    seuilAlerte: 5,
    plafondRemise: 0,
    imageUrl: "",
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchFournisseurs();
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (showNewProductForm && !newProductData.code) {
      const timer = setTimeout(() => {
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [products, showNewProductForm, newProductData.code]);
  const fetchFournisseurs = async () => {
    try {
      const response = await fetch("/api/fournisseurs?limit=100");
      const data = await response.json();
      setFournisseurs(data.data || []);
    } catch (error) {
      console.error("Error fetching fournisseurs:", error);
    }
  };

const roundTo3Decimals = (value: number): number => {
  return Number(value.toFixed(3));
};

  const fetchProducts = async () => {
    try {
      const response = await fetch("/api/products?limit=1000");
      const data = await response.json();
      setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const addLigne = () => {
    setLignes([...lignes, {
      id: `ligne-${Date.now()}-${Math.random()}`,
      productId: "",
      quantite: 1,
      prixUnitaireTTC: 0,
      prixUnitaireHT: 0,
      prixVente: 0,
      prixVenteHT: 0,
      tva: 19
    }]);
  };

  const handlePaymentImageUpload = async (index: number, file: File) => {
    if (!file) return;

    setUploadingImages(prev => ({ ...prev, [index]: true }));

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      setPaymentImages(prev => ({ ...prev, [index]: data.url }));
      toast({ title: "Succès", description: "Image téléchargée avec succès" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'image",
        variant: "destructive"
      });
    } finally {
      setUploadingImages(prev => ({ ...prev, [index]: false }));
    }
  };

  const handlePaymentImageSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePaymentImageUpload(index, file);
    }
  };

  const removePaymentImage = (index: number) => {
    setPaymentImages(prev => {
      const newImages = { ...prev };
      delete newImages[index];
      return newImages;
    });
  };

  const handleImageUpload = async (file: File) => {
    if (!file) return;

    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'upload');
      }

      setProductImage(data.url);
      toast({ title: "Succès", description: "Image téléchargée avec succès" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de télécharger l'image",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      handleImageUpload(file);
    }
  };

  const removeImage = () => {
    setProductImage("");
    setImageFile(null);
  };

  const previewAutoCode = () => {
    const currentYear = new Date().getFullYear();
    const existingCodes = products
      .filter(p => p.code && p.code.startsWith(`${currentYear}-`))
      .map(p => p.code);

    if (newProductData.code && newProductData.code.trim() !== "") {
      const codeExists = products.some(p => p.code === newProductData.code);
      if (!codeExists) {
        return newProductData.code;
      }
    }

    let nextNumber = 1;
    if (existingCodes.length > 0) {
      const numbers = existingCodes
        .map(code => parseInt(code.split('-')[1]))
        .filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    return `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  };

  // Ajoutez cette fonction après previewAutoCode
  const getFinalCodeForLine = (ligne: LigneBonEntree) => {
    if (ligne.newProduct?.code && ligne.newProduct.code.trim() !== "") {
      return ligne.newProduct.code;
    }
    // Si pas de code saisi, générer un aperçu basé sur les produits existants
    const currentYear = new Date().getFullYear();
    const existingCodes = products
      .filter(p => p.code && p.code.startsWith(`${currentYear}-`))
      .map(p => p.code);

    let nextNumber = 1;
    if (existingCodes.length > 0) {
      const numbers = existingCodes
        .map(code => parseInt(code.split('-')[1]))
        .filter(n => !isNaN(n));
      if (numbers.length > 0) {
        nextNumber = Math.max(...numbers) + 1;
      }
    }

    return `${currentYear}-${String(nextNumber).padStart(4, '0')}`;
  };

  //   const handleTTCChange = (value: number) => {
  //   const tva = newProductData.tva || 0;

  //   const ht = tva > 0 ? value / (1 + tva / 100) : value;

  //   setNewProductData({
  //     ...newProductData,
  //     prixAchat: value,
  //     prixAchatHT: Number(ht.toFixed(3)),
  //   });
  // };
  const handleHTChange = (value: number) => {
    const tva = newProductData.tva || 0;

    const ttc = value * (1 + tva / 100);

    setNewProductData({
      ...newProductData,
      prixAchatHT: value,
      prixAchat: roundTo3Decimals(ttc),
    });
  };

  const handleTTCChange = (value: number) => {
    const tva = newProductData.tva || 0;

    const ht = tva > 0 ? value / (1 + tva / 100) : value;

    setNewProductData({
      ...newProductData,
      prixAchat: value,
      prixAchatHT: roundTo3Decimals(ht),
    });
  };


  const handleHTChangeVente = (value: number) => {
    const tva = newProductData.tva || 0;

    const ttc = value * (1 + tva / 100);

    setNewProductData({
      ...newProductData,
      prixVenteHT: value,
      prixVente: roundTo3Decimals(ttc),
    });
  };

  const handleTTCChangeVente = (value: number) => {
    const tva = newProductData.tva || 0;

    const ht = tva > 0 ? value / (1 + tva / 100) : value;

    setNewProductData({
      ...newProductData,
      prixVente: value,
      prixVenteHT: roundTo3Decimals(ht),
    });
  };


  const handleTVAChange = (value: number) => {
    const ht = newProductData.prixAchatHT || 0;

    const ttc = ht * (1 + value / 100);

    setNewProductData({
      ...newProductData,
      tva: value,
      prixAchat: roundTo3Decimals(ttc),
    });
  };

  const handleMargeChange = (value: number) => {
    const pa = newProductData.prixAchatHT;
    const pv = pa * (1 + value / 100);

    setNewProductData({
      ...newProductData,
      marge: value,
      prixVenteHT: roundTo3Decimals(pv),
    });
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };
const updateLigne = (index: number, field: keyof LigneBonEntree, value: any) => {
  const newLignes = [...lignes];
  newLignes[index] = { ...newLignes[index], [field]: value };

  if (field === 'productId' && value) {
    const product = products.find(p => p.id === value);
    if (product) {
      newLignes[index].prixUnitaireTTC = roundTo3Decimals(product.prixAchat);
      newLignes[index].prixUnitaireHT = roundTo3Decimals(product.prixAchatHT ?? 0);
      newLignes[index].productDesignation = product.designation;
      newLignes[index].prixVente = roundTo3Decimals(product.prixVente);
      newLignes[index].prixVenteHT = roundTo3Decimals(product.prixVenteHT);
      newLignes[index].tva = product.tva;
    }
  }

  // Si on change le prix HT, mettre à jour le prix TTC
  if (field === 'prixUnitaireHT') {
    const tva = newLignes[index].tva || 0;
    const ttc = value * (1 + tva / 100);
    newLignes[index].prixUnitaireTTC = roundTo3Decimals(ttc); // 👈 Utiliser roundTo3Decimals
  }

  // Si on change le prix TTC, mettre à jour le prix HT
  if (field === 'prixUnitaireTTC') {
    const tva = newLignes[index].tva || 0;
    const ht = tva > 0 ? value / (1 + tva / 100) : value;
    newLignes[index].prixUnitaireHT = roundTo3Decimals(ht); // 👈 Utiliser roundTo3Decimals
  }

  // Si on change la TVA, mettre à jour le prix TTC
  if (field === 'tva') {
    const ht = newLignes[index].prixUnitaireHT || 0;
    const ttc = ht * (1 + value / 100);
    newLignes[index].prixUnitaireTTC = roundTo3Decimals(ttc); // 👈 Utiliser roundTo3Decimals
  }

  setLignes(newLignes);
};

const calculateTotalHT = () => {
  const total = lignes.reduce((sum, l) => sum + (l.quantite * l.prixUnitaireTTC), 0);
  return roundTo3Decimals(total); // 👈 Ajouter roundTo3Decimals
};

  const calculateTotalTTCSansFodec = () => {
    return calculateTotalHT() + calculateTotalTVA();
  };

  const calculateFodec = () => {
    if (!hasFodec) return 0;
    const totalHT = calculateTotalHT() - calculateTotalTVA()
    // FODEC = 1% du montant HT
    return totalHT * 0.01;
  };

const calculateTotalTVA = () => {
  const total = lignes.reduce((sum, l) => {
    const ht = l.quantite * l.prixUnitaireHT;
    return sum + (ht * l.tva / 100);
  }, 0);
  return roundTo3Decimals(total); // 👈 Ajouter roundTo3Decimals
};

  const ajouterLignePaiement = () => {
    setPaiements([...paiements, { type: "CHEQUE", montant: 0, reference: "", banque: "", echeance: "", imageUrl: "" }]);
  };

  const supprimerLignePaiement = (index: number) => {
    if (paiements.length > 1) {
      setPaiements(paiements.filter((_, i) => i !== index));
      setPaymentImages(prev => {
        const newImages = { ...prev };
        delete newImages[index];
        return newImages;
      });
    }
  };

  const updatePaiement = (index: number, field: string, value: any) => {
    const newPaiements = [...paiements];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setPaiements(newPaiements);

    const total = newPaiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    setMontantTotalPaiements(total);
  };

  const handleCreateNewProduct = () => {
    if (!newProductData.reference || !newProductData.designation || !newProductData.categoryId) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }

    // 👉 Générer un code temporaire pour l'affichage (avec un timestamp unique)
    const tempCode = newProductData.code || `temp-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    const newLigne: LigneBonEntree = {
      id: `new-${Date.now()}`,
      productId: "",
      quantite: 1,


      prixUnitaireTTC: roundTo3Decimals(newProductData.prixAchat),  // ✅ Arrondi
    prixUnitaireHT: roundTo3Decimals(newProductData.prixAchatHT ?? 0),  // ✅ Arrondi
    prixVente: roundTo3Decimals(newProductData.prixVente),  // ✅ Arrondi
    prixVenteHT: roundTo3Decimals(newProductData.prixVenteHT),  // ✅ Arrondi
    tva: roundTo3Decimals(newProductData.tva), 
     
      isNewProduct: true,
      newProduct: {
        ...newProductData,
        code: newProductData.code,
        imageUrl: productImage
      },
      generatedCode: tempCode,
    };

    setLignes([...lignes, newLigne]);
    setShowNewProductForm(false);
    setNewProductData({ reference: "", code: "", designation: "", categoryId: "", prixVente: 0, marge: 0, prixAchat: 0, prixAchatHT: 0, tva: 19, seuilAlerte: 5, imageUrl: "", plafondRemise: 0, prixVenteHT: 0 });
    setProductImage("");
    setImageFile(null);
    toast({ title: "Succès", description: "Produit ajouté au bon d'entrée" });
  };

  const handleOpenReglement = () => {
    setIsReglementDialogOpen(true);
  };

  const handleCloseReglement = () => {
    setIsReglementDialogOpen(false);
  };

  const handleValidateReglement = () => {
    // Vérifier si au moins un paiement valide existe
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const totalTTC = (calculateTotalHT() + calculateFodec());

    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un paiement", variant: "destructive" });
      return;
    }

    if (totalPaiements !== totalTTC) {
      toast({ title: "Erreur", description: `Le total des paiements (${formatCurrency(totalPaiements)}) ne correspond pas au total TTC (${formatCurrency(totalTTC)})`, variant: "destructive" });
      return;
    }

    // Associer les images aux paiements
    const paiementsAvecImages = paiements.map((paiement, index) => ({
      ...paiement,
      imageUrl: paymentImages[index] || null
    }));

    setPaiements(paiementsAvecImages);
    setIsReglementDialogOpen(false);
    toast({ title: "Succès", description: "Règlement configuré avec succès" });
  };

  const handleCreateFournisseur = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fournisseurFormData.nom || !fournisseurFormData.telephone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingFournisseur(true);

    try {
      const response = await fetch("/api/fournisseurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fournisseurFormData),
      });

      const result = await response.json();

      console.log("Réponse API complète:", result); // Pour déboguer

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      await fetchFournisseurs();

      let newFournisseurId = null;

      if (result.data?.id) {
        newFournisseurId = result.data.id;
      } else if (result.id) {
        newFournisseurId = result.id;
      } else if (result.fournisseur?.id) {
        newFournisseurId = result.fournisseur.id;
      } else if (result.data?.fournisseur?.id) {
        newFournisseurId = result.data.fournisseur.id;
      }

      if (newFournisseurId) {
        setFormData({ ...formData, fournisseurId: newFournisseurId });
      } else {
        console.warn("Impossible de trouver l'ID du nouveau fournisseur", result);
      }

      toast({ title: "Succès", description: "Fournisseur ajouté avec succès" });
      setIsFournisseurDialogOpen(false);

      setFournisseurFormData({
        nom: "",
        telephone: "",
        email: "",
        adresse: "",
      });
    } catch (error) {
      console.error("Error creating fournisseur:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le fournisseur",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingFournisseur(false);
    }
  };

  const handleFournisseurInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setFournisseurFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fournisseurId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un fournisseur", variant: "destructive" });
      return;
    }

    const lignesValides = lignes.filter(l => (l.productId || l.isNewProduct) && l.quantite > 0);
    if (lignesValides.length === 0) {
      toast({ title: "Erreur", description: "Ajoutez au moins un produit", variant: "destructive" });
      return;
    }

    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const totalTTC = calculateTotalHT() + calculateFodec();
    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez configurer le règlement fournisseur avant de créer le bon d'entrée", variant: "destructive" });
      return;
    }

    if (totalPaiements !== totalTTC) {
      toast({ title: "Erreur", description: `Le total des paiements (${formatCurrency(totalPaiements)}) ne correspond pas au total TTC (${formatCurrency(totalTTC)})`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        fournisseurId: formData.fournisseurId,
        date: formData.date,
        type: formData.type,
        referenceDoc: formData.referenceDoc,
        description: formData.description,
        lignes: lignesValides.map(l => ({
          productId: l.productId,
          quantite: l.quantite,
          prixUnitaireTTC: roundTo3Decimals(l.prixUnitaireTTC),
          prixUnitaireHT: roundTo3Decimals(l.prixUnitaireHT),
          prixVente: roundTo3Decimals(l.prixVente),
          prixVenteHT: roundTo3Decimals(l.prixVenteHT),
          tva: roundTo3Decimals(l.tva),
          newProduct: l.isNewProduct ? l.newProduct : undefined,
        })),
        paiements: paiementsValides.map(p => ({
          type: p.type,
          montant: p.montant,
          reference: p.reference,
          banque: p.banque,
          echeance: p.echeance,
          imageUrl: p.imageUrl,
        })),
      };

      const response = await fetch("/api/bons-entree", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      toast({ title: "Succès", description: "Bon d'entrée créé et stock mis à jour" });
      router.push('/bons-entree');
    } catch (error) {
      console.error("Error creating bon entree:", error);
      toast({ title: "Erreur", description: error instanceof Error ? error.message : "Impossible de créer le bon d'entrée", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReglementValid = () => {
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiements = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const totalTTC = calculateTotalHT() + calculateFodec();
    return paiementsValides.length > 0 && totalPaiements === totalTTC;
  };

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Nouveau Bon d'Entrée" subtitle="Créer un bon d'entrée pour ajouter du stock" />
        <main className="p-4 md:p-6">
          <Link href="/bons-entree">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Retour à la liste
            </Button>
          </Link>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type de Bon d'Entrée *</Label>
                      <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner le type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FAC">Facture Fournisseur</SelectItem>
                          <SelectItem value="BL">Bon de Livraison</SelectItem>
                          <SelectItem value="BS">Bon de Sortie</SelectItem>
                          <SelectItem value="AUCUN">Bon d'entrée</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} />
                    </div>

                    <div className="space-y-2">
                      <Label>Fournisseur *</Label>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          {isMounted && (
                            <Select2
                              options={
                                fournisseurs.length === 0
                                  ? [{ value: "", label: "Aucun fournisseur disponible" }]
                                  : fournisseurs.map(f => ({
                                    value: f.id,
                                    label: f.nom
                                  }))
                              }
                              value={
                                fournisseurs
                                  .map(f => ({ value: f.id, label: f.nom }))
                                  .find(o => o.value === formData.fournisseurId) || null
                              }
                              onChange={(selected: OptionType | null) =>
                                setFormData({
                                  ...formData,
                                  fournisseurId: selected?.value || ""
                                })
                              }
                              placeholder="Sélectionner un fournisseur"
                              isSearchable
                              isClearable
                              className="text-sm"
                              classNamePrefix="select"
                              menuPortalTarget={document.body}
                              styles={{
                                menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                              }}
                            />
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setIsFournisseurDialogOpen(true)}
                          className="h-9 px-3"
                          title="Ajouter un fournisseur"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Référence Document</Label>
                      <Input
                        placeholder="BL-001, FACT-001, ..."
                        value={formData.referenceDoc}
                        onChange={(e) => setFormData({ ...formData, referenceDoc: e.target.value })}
                      />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="Description du bon d'entrée"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Produits */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produits</CardTitle>
                  <Button type="button" variant="outline" size="sm" onClick={addLigne}>
                    <Plus className="h-4 w-4 mr-1" /> Ajouter ligne
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">

                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[220px]">Désignation</TableHead>
                            <TableHead className="w-[120px]">Référence</TableHead>
                            <TableHead className="w-[120px]">Code</TableHead>
                            <TableHead className="w-[80px]">Quantité</TableHead>
                            <TableHead className="w-[110px]">Prix Achat (HT)</TableHead>
                            <TableHead className="w-[70px]">TVA</TableHead>
                            <TableHead className="w-[110px]">Prix Achat (TTC)</TableHead>
                            <TableHead className="w-[110px]">Prix Vente (TTC)</TableHead>
                            <TableHead className="w-[100px]">Total TTC</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne, idx) => (
                            <TableRow key={ligne.id}>
                              <TableCell className="min-w-[220px]">
                                {ligne.isNewProduct ? (
                                  <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                    {ligne.newProduct?.designation}
                                  </div>
                                ) : isMounted && (
                                  <Select2<OptionType>
                                    options={options}
                                    value={options.find(o => o.value === ligne.productId) || null}
                                    onChange={(selected: OptionType | null) =>
                                      updateLigne(idx, "productId", selected?.value || "")
                                    }
                                    placeholder="Sélectionner produit"
                                    isSearchable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={{
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                  />
                                )}
                              </TableCell>

                              <TableCell className="w-[120px]">
                                {ligne.isNewProduct ? (
                                  <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                    {ligne.newProduct?.reference}
                                  </div>
                                ) : isMounted && (
                                  <Select2<OptionType>
                                    options={products.map(p => ({
                                      value: p.id,
                                      label: p.reference
                                    }))}
                                    value={
                                      products
                                        .map(p => ({ value: p.id, label: p.reference }))
                                        .find(o => o.value === ligne.productId) || null
                                    }
                                    onChange={(selected: OptionType | null) =>
                                      updateLigne(idx, "productId", selected?.value || "")
                                    }
                                    placeholder="Sélectionner référence"
                                    isSearchable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={{
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                  />
                                )}
                              </TableCell>

                              <TableCell className="w-[120px]">
                                {ligne.isNewProduct ? (
                                  <div className="text-sm text-green-600 border rounded p-2 bg-green-50">
                                    {ligne.newProduct?.code ? (
                                      <span className="font-mono">{ligne.newProduct.code}</span>
                                    ) : (
                                      <span className="italic text-green-500">
                                        {getFinalCodeForLine(ligne)}
                                      </span>
                                    )}
                                  </div>
                                ) : isMounted && (
                                  <Select2<OptionType>
                                    options={products.map(p => ({
                                      value: p.id,
                                      label: p.code
                                    }))}
                                    value={
                                      products
                                        .map(p => ({ value: p.id, label: p.code }))
                                        .find(o => o.value === ligne.productId) || null
                                    }
                                    onChange={(selected: OptionType | null) =>
                                      updateLigne(idx, "productId", selected?.value || "")
                                    }
                                    placeholder="Sélectionner code"
                                    isSearchable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={{
                                      menuPortal: (base) => ({ ...base, zIndex: 9999 }),
                                    }}
                                  />
                                )}
                              </TableCell>

                              <TableCell className="w-[80px]">
                                <Input
                                  type="number"
                                  min="1"
                                  value={ligne.quantite}
                                  onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>

                              <TableCell className="w-[110px]">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={ligne.prixUnitaireHT}
                                  onChange={(e) => updateLigne(idx, 'prixUnitaireHT', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>

                              <TableCell className="w-[70px]">
                                <Input
                                  type="number"
                                  step="1"
                                  value={ligne.tva}
                                  onChange={(e) => updateLigne(idx, 'tva', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>

                              <TableCell className="w-[110px]">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={ligne.prixUnitaireTTC}
                                  onChange={(e) => updateLigne(idx, 'prixUnitaireTTC', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>

                              <TableCell className="w-[110px]">
                                <Input
                                  type="number"
                                  step="0.001"
                                  value={ligne.prixVente}
                                  onChange={(e) => updateLigne(idx, 'prixVente', parseFloat(e.target.value) || 0)}
                                  className="w-full"
                                />
                              </TableCell>

                              <TableCell className="w-[100px] font-medium">
                                {formatCurrency(roundTo3Decimals(ligne.quantite * ligne.prixUnitaireTTC))}
                              </TableCell>

                              <TableCell className="w-[50px]">
                                {lignes.length > 1 && (
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600"
                                    onClick={() => removeLigne(idx)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    <Button type="button" variant="secondary" size="sm" onClick={() => setShowNewProductForm(!showNewProductForm)} className="w-full">
                      <Package className="h-4 w-4 mr-2" /> Créer un nouveau produit
                    </Button>

                    {showNewProductForm && (
                      <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                        <div className="flex justify-between items-center">
                          <h3 className="font-medium">Nouveau produit</h3>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewProductForm(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Référence *</Label>
                            <Input
                              placeholder="REF-001"
                              value={newProductData.reference}
                              onChange={(e) => setNewProductData({ ...newProductData, reference: e.target.value })}
                            />
                          </div>


                          <div className="space-y-1">
                            <Label className="text-xs">
                              Code
                              <span className="text-muted-foreground ml-1 text-xs">
                                (laissez vide pour auto-génération)
                              </span>
                            </Label>
                            <Input
                              placeholder="Auto-généré (ex: 2026-0001)"
                              value={newProductData.code}
                              onChange={(e) => setNewProductData({ ...newProductData, code: e.target.value })}
                              className={!newProductData.code ? "border-green-300 focus:border-green-500" : ""}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Désignation *</Label>
                            <Input
                              placeholder="Nom du produit"
                              value={newProductData.designation}
                              onChange={(e) => setNewProductData({ ...newProductData, designation: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="prixAchatHT">Prix d'achat (HT) *</Label>
                            <Input
                              name="prixAchatHT"
                              type="number"
                              step="0.001"
                              placeholder="0.000"
                              value={newProductData.prixAchatHT === 0 ? "" : newProductData.prixAchatHT}
                              onChange={(e) =>
                                handleHTChange(parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label htmlFor="tva">TVA (%)</Label>
                            <select
                              name="tva"
                              value={newProductData.tva}
                              onChange={(e) =>
                                handleTVAChange(parseFloat(e.target.value) || 0)
                              }
                              // onChange={(e) => setNewProductData({ ...newProductData, tva: parseFloat(e.target.value) || 0 })}
                              className="w-full border rounded-lg px-3 py-2"
                            >
                              <option value={19}>19%</option>
                              <option value={13}>13%</option>
                              <option value={7}>7%</option>
                              <option value={0}>0%</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="prixAchat">Prix d'achat (TTC) *</Label>
                            <Input
                              name="prixAchat"
                              type="number"
                              step="0.001"
                              placeholder="0.000"
                              value={newProductData.prixAchat === 0 ? "" : newProductData.prixAchat}
                              // onChange={(e) =>
                              //   handlePrixAchatChange(parseFloat(e.target.value) || 0)
                              // }
                              onChange={(e) =>
                                handleTTCChange(parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Marge (%)</Label>
                            <Input
                              type="number"
                              name="marge"
                              value={newProductData.marge === 0 ? "" : newProductData.marge}
                              onChange={(e) =>
                                handleMargeChange(parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Prix de vente (HT) *</Label>
                            <Input
                              type="number"
                              name="prixVenteHT"
                              step="0.001"
                              value={newProductData.prixVenteHT === 0 ? "" : newProductData.prixVenteHT}
                              onChange={(e) =>
                                handleHTChangeVente(parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Prix de vente (TTC) *</Label>
                            <Input
                              type="number"
                              name="prixVente"
                              step="0.001"
                              value={newProductData.prixVente === 0 ? "" : newProductData.prixVente}
                              onChange={(e) =>
                                handleTTCChangeVente(parseFloat(e.target.value) || 0)
                              }
                              required
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Seuil alerte</Label>
                            <Input
                              type="number"
                              value={newProductData.seuilAlerte === 0 ? "" : newProductData.seuilAlerte}
                              onChange={(e) => setNewProductData({ ...newProductData, seuilAlerte: parseInt(e.target.value) || 5 })}
                            />
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs">Plafond de remise (DT)</Label>
                            <Input
                              type="number"
                              step="0.1"
                              name="plafondRemise"
                              value={newProductData.plafondRemise === 0 ? "" : newProductData.plafondRemise}
                              onChange={(e) => setNewProductData({
                                ...newProductData,
                                plafondRemise: parseFloat(e.target.value) || 0
                              })}
                              placeholder="0"
                            />
                            {/* <p className="text-xs text-muted-foreground">
                              Remise maximale autorisée pour ce produit (en pourcentage)
                            </p> */}
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Catégorie *</Label>
                            <Select value={newProductData.categoryId} onValueChange={(v) => setNewProductData({ ...newProductData, categoryId: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Choisir" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map(c => (
                                  <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Champ pour l'image */}
                          <div className="sm:col-span-2 space-y-2">
                            <Label className="text-xs">Image du produit</Label>
                            <div className="flex items-center gap-4">
                              {productImage ? (
                                <div className="relative w-24 h-24 border rounded-lg overflow-hidden">
                                  <Image
                                    src={productImage}
                                    alt="Aperçu produit"
                                    fill
                                    className="object-cover"
                                  />
                                  <button
                                    type="button"
                                    onClick={removeImage}
                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex flex-col items-center justify-center w-24 h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">Ajouter</p>
                                  </div>
                                  <input
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    disabled={isUploading}
                                  />
                                </label>
                              )}
                              {isUploading && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                  Upload en cours...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>


                        <Button type="button" onClick={handleCreateNewProduct} className="w-full">
                          <Plus className="h-4 w-4 mr-2" /> Ajouter ce produit au bon d'entrée
                        </Button>
                      </div>
                    )}

                    {/* Totaux */}
                    <div className="pt-4 border-t">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex justify-between w-80">
                          <span>Total HT:</span>
                          <span className="font-semibold">{formatCurrency(calculateTotalHT() - calculateTotalTVA())}</span>
                        </div>
                        {!hasFodec && (

                          <div className="flex justify-between w-80">
                            <span>TVA:</span>
                            <span className="font-semibold">{formatCurrency(calculateTotalTVA())}</span>
                          </div>
                        )}
                        {hasFodec && (
                          <div className="flex justify-between w-80">
                            <span>TVA:</span>
                            <span className="font-semibold">{formatCurrency((calculateTotalHT() - calculateTotalTVA() + calculateFodec()) * 0.19)}</span>
                          </div>
                        )}


                        {/* Ligne FODEC avec checkbox */}
                        {/* <div className="flex justify-between w-80 items-center">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              id="fodec"
                              checked={hasFodec}
                              onChange={(e) => setHasFodec(e.target.checked)}
                              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="fodec" className="text-sm cursor-pointer">
                              FODEC (1%)
                            </Label>
                          </div>
                          <span className="font-semibold">
                            {hasFodec ? formatCurrency(calculateFodec()) : "0,000 DT"}
                          </span>
                        </div> */}

                        <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                          <span>Total TTC:</span>
                          <span>{formatCurrency(calculateTotalHT() + calculateFodec())}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/bons-entree')}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenReglement}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Règlement
                  {isReglementValid() && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                  )}
                </Button>
                <Button type="submit" disabled={isSubmitting || !isReglementValid()}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Créer le bon d'entrée
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Dialog d'ajout de fournisseur */}
      <Dialog open={isFournisseurDialogOpen} onOpenChange={setIsFournisseurDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajouter un Fournisseur</DialogTitle>
            <DialogDescription>
              Remplissez les informations du nouveau fournisseur
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFournisseur} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nom">Nom de l'entreprise *</Label>
              <Input
                id="nom"
                placeholder="Nom du fournisseur"
                value={fournisseurFormData.nom}
                onChange={handleFournisseurInputChange}
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telephone">Téléphone *</Label>
                <Input
                  id="telephone"
                  placeholder="XX XXX XXX"
                  value={fournisseurFormData.telephone}
                  onChange={handleFournisseurInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={fournisseurFormData.email}
                  onChange={handleFournisseurInputChange}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adresse">Adresse</Label>
              <Textarea
                id="adresse"
                placeholder="Adresse complète"
                value={fournisseurFormData.adresse}
                onChange={handleFournisseurInputChange}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsFournisseurDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmittingFournisseur}>
                {isSubmittingFournisseur ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de règlement */}
      <Dialog open={isReglementDialogOpen} onOpenChange={setIsReglementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Règlement fournisseur</DialogTitle>

          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total TTC à payer : <span className="font-bold text-foreground">{formatCurrency(calculateTotalHT() + calculateFodec())}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={ajouterLignePaiement}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {paiements.map((paiement, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Paiement #{index + 1}</span>
                    {paiements.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => supprimerLignePaiement(index)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label className="text-xs">Mode</Label>
                      <Select value={paiement.type} onValueChange={(value) => updatePaiement(index, 'type', value)}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ESPECE">Espèce</SelectItem>
                          <SelectItem value="CHEQUE">Chèque</SelectItem>
                          <SelectItem value="TRAITE_BANCAIRE">Traite bancaire</SelectItem>
                          <SelectItem value="VIREMENT">Virement</SelectItem>
                          <SelectItem value="CREDIT">Crédit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Montant</Label>
                      <Input
                        type="number"
                        step="0.001"
                        value={paiement.montant || ''}
                        onChange={(e) => updatePaiement(index, 'montant', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    {(paiement.type === 'CHEQUE' || paiement.type === 'TRAITE_BANCAIRE') && (
                      <>
                        <div>
                          <Label className="text-xs">Référence</Label>
                          <Input value={paiement.reference || ''} onChange={(e) => updatePaiement(index, 'reference', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Banque</Label>
                          <Input value={paiement.banque || ''} onChange={(e) => updatePaiement(index, 'banque', e.target.value)} />
                        </div>

                        {(paiement.type === 'CHEQUE' || paiement.type === 'TRAITE_BANCAIRE') && (
                          <div>
                            <Label className="text-xs">Échéance</Label>
                            <Input type="date" value={paiement.echeance || ''} onChange={(e) => updatePaiement(index, 'echeance', e.target.value)} />
                          </div>
                        )}
                        <div className="sm:col-span-2">
                          <Label className="text-xs">Image du {paiement.type === 'CHEQUE' ? 'chèque' : 'traite'}</Label>
                          <div className="flex items-center gap-4 mt-1">
                            {paymentImages[index] ? (
                              <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                                <Image
                                  src={paymentImages[index]}
                                  alt={`${paiement.type} ${paiement.reference || ''}`}
                                  fill
                                  className="object-cover"
                                />
                                <button
                                  type="button"
                                  onClick={() => removePaymentImage(index)}
                                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                  <ImagePlus className="w-8 h-8 mb-2 text-muted-foreground" />
                                  <p className="text-xs text-muted-foreground text-center">
                                    Ajouter image
                                  </p>
                                </div>
                                <input
                                  type="file"
                                  className="hidden"
                                  accept="image/*"
                                  onChange={(e) => handlePaymentImageSelect(index, e)}
                                  disabled={uploadingImages[index]}
                                />
                              </label>
                            )}
                            {uploadingImages[index] && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Upload en cours...
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    {paiement.type === 'VIREMENT' && (
                      <div>
                        <Label className="text-xs">Référence virement</Label>
                        <Input value={paiement.reference || ''} onChange={(e) => updatePaiement(index, 'reference', e.target.value)} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total TTC :</span>
                <span className="text-lg font-bold">{formatCurrency(calculateTotalHT() + calculateFodec())}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-1">
                <span>Total paiements :</span>
                <span className={montantTotalPaiements === (calculateTotalHT() + calculateFodec()) ? "text-green-600 font-semibold" : montantTotalPaiements > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                  {montantTotalPaiements > 0 ? formatCurrency(montantTotalPaiements) : "0.000 DT"}
                </span>
              </div>
              {montantTotalPaiements !== (calculateTotalHT() + calculateFodec()) && montantTotalPaiements > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Différence : {formatCurrency(Math.abs((calculateTotalHT() + calculateFodec()) - montantTotalPaiements))}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseReglement}>
              Annuler
            </Button>
            <Button type="button" onClick={handleValidateReglement}>
              Valider le règlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}