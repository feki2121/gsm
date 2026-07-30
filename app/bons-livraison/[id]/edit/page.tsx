"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
import { formatCurrency, TypeReglement } from "@/lib/types";
import { Loader2, Plus, Trash2, Save, X, CreditCard, ArrowLeft, MapPin, Navigation, CheckCircle, Copy, Map } from "lucide-react";
import { ImagePlus } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MapPicker } from "@/components/MapPicker";
import Link from "next/link";
import Select2 from "react-select";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Client {
  id: string;
  nom: string;
  adresse: string | null;
  telephone: string;
  email: string | null;
  cin?: string | null;
  mf?: string | null;
  ville?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface Home {
  id: string;
  nom: string;
  description: string | null;
}

interface Product {
  id: string;
  reference: string;
  code: string;
  designation: string;
  prixVente: number;
  tva: number;
  quantiteStock: number;
  stockLocations?: Array<{
    homeId: string;
    quantite: number;
  }>;
}

interface LigneBL {
  id: string;
  productId: string;
  product?: Product;
  homeId: string;
  home?: Home;
  quantite: number;
  prixVente?: number;
}

interface PaiementDetail {
  type: TypeReglement;
  montant: number;
  reference?: string;
  banque?: string;
  echeance?: string;
  imageUrl?: string | null;
  nameSecondClient?: string;
}

enum StatutBL {
  EN_ATTENTE = "EN_ATTENTE",
  LIVRE = "LIVRE",
  ANNULE = "ANNULE"
}

export default function EditBonLivraisonPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [factures, setFactures] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isReglementDialogOpen, setIsReglementDialogOpen] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<{ [key: number]: boolean }>({});
  const [paymentImages, setPaymentImages] = useState<{ [key: number]: string }>({});
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedFactureId, setSelectedFactureId] = useState("");
  const [remise, setRemise] = useState<number>(0);
  const [typeRemise, setTypeRemise] = useState<'pourcentage' | 'montant'>('montant');
  const [lignes, setLignes] = useState<LigneBL[]>([]);
  const { data: session } = useSession();
  const [userRole, setUserRole] = useState<string>("");
  const [accessibleHomes, setAccessibleHomes] = useState<Home[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [searchType, setSearchType] = useState<'designation' | 'reference' | 'code'>('designation');
  const [statut, setStatut] = useState<string>("LIVRE");

  // États pour le règlement
  const [paiements, setPaiements] = useState<PaiementDetail[]>([]);

  // États pour le modal client
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [isSubmittingClient, setIsSubmittingClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [defaultHomeId, setDefaultHomeId] = useState<string>("");
  const [isLoadingDefaultHome, setIsLoadingDefaultHome] = useState(false);
  const [clientFormData, setClientFormData] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    ville: "",
    latitude: null as number | null,
    longitude: null as number | null,
    cin: "",
    mf: "",
  });

  // Fonction pour récupérer les emplacements accessibles
  const fetchAccessibleHomes = async () => {
    try {
      const response = await fetch("/api/homes/accessibles");
      if (response.ok) {
        const data = await response.json();
        setAccessibleHomes(data.data || []);
      } else {
        setAccessibleHomes(homes);
      }
    } catch (error) {
      console.error("Error fetching accessible homes:", error);
      setAccessibleHomes(homes);
    }
  };

  // Récupérer le rôle de l'utilisateur
  const fetchUserRole = async () => {
    try {
      const response = await fetch(`/api/users/me`);
      if (response.ok) {
        const data = await response.json();
        setUserRole(data.role || "ADMIN");
        if (data.role === "CHAUFFEUR" && data.chauffeur?.vehicule?.homeId) {
          setDefaultHomeId(data.chauffeur.vehicule.homeId);
        }
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole("ADMIN");
    }
  };

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      const [blRes, clientsRes, productsRes, homesRes] = await Promise.all([
        fetch(`/api/bon-livraisons/${params.id}`),
        fetch("/api/clients?includeProspects=true"),
        fetch("/api/products?limit=1000&includeStock=true"),
        fetch("/api/homes?limit=100"),
      ]);

      if (!blRes.ok) throw new Error("Bon de livraison non trouvé");

      const bl = await blRes.json();
      const clientsData = await clientsRes.json();
      const productsData = await productsRes.json();
      const homesData = await homesRes.json();

      setClients(clientsData.data || []);
      setProducts(productsData.data || []);
      setHomes(homesData.data || []);

      // Remplir le formulaire
      setSelectedClientId(bl.clientId);
      setStatut(bl.statut || "LIVRE");
      setRemise(bl.remise || 0);
      setTypeRemise('montant');

      // Remplir les lignes
      const lignesFormatted = bl.lignes.map((ligne: any, idx: number) => ({
        id: `ligne-${Date.now()}-${idx}`,
        productId: ligne.productId,
        product: ligne.product,
        homeId: ligne.homeId,
        home: ligne.home,
        quantite: ligne.quantite,
        prixVente: ligne.prixVente ?? 0,
      }));
      setLignes(lignesFormatted);

      // Remplir les paiements
      if (bl.paiements && bl.paiements.length > 0) {
        const paiementsFormatted = bl.paiements.map((p: any) => ({
          type: p.type,
          montant: p.montant,
          reference: p.reference || "",
          banque: p.banque || "",
          echeance: p.echeance || "",
          imageUrl: p.imageUrl || null,
          nameSecondClient: p.nameSecondClient || "",
        }));
        setPaiements(paiementsFormatted);

        const images: { [key: number]: string } = {};
        paiementsFormatted.forEach((p: any, idx: number) => {
          if (p.imageUrl) images[idx] = p.imageUrl;
        });
        setPaymentImages(images);
      } else {
        setPaiements([{ type: TypeReglement.ESPECE, montant: bl.montantTotal || 0 }]);
      }

      await fetchUserRole();
      await fetchHomes();

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les données",
        variant: "destructive",
      });
      router.push("/bons-livraison");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (homes.length > 0) {
      fetchAccessibleHomes();
    }
  }, [homes]);

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
    }
  };


  // Fonction utilitaire pour obtenir le prix effectif
  const getPrixEffectif = (l: LigneBL): number => {
    // Si prixVente existe ET est différent de 0, on l'utilise
    // Sinon on prend le prix du produit
    if (l.prixVente !== undefined && l.prixVente !== null && l.prixVente !== 0) {
      return l.prixVente;
    }
    return l.product?.prixVente ?? 0;
  };

  const calculerSousTotal = () => {
    return lignes.reduce((sum, l) => {
      const prixUnitaire = getPrixEffectif(l);
      return sum + (prixUnitaire * l.quantite);
    }, 0);
  };

  const calculerMontantRemise = () => {
    return remise;
  };

  const totalTTC = () => {
    const sousTotal = calculerSousTotal();
    const montantRemise = calculerMontantRemise();
    return sousTotal - montantRemise;
  };

  const totalHT = () => {
    const ttc = totalTTC();

    let totalHTAvantRemise = 0;
    let totalTTCAvantRemise = 0;

    lignes.forEach(l => {
      const quantite = l.quantite;
      const prixTTC = getPrixEffectif(l);
      const tva = (l.product?.tva || 0) / 100;
      const prixHT = prixTTC / (1 + tva);

      totalHTAvantRemise += quantite * prixHT;
      totalTTCAvantRemise += quantite * prixTTC;
    });

    if (totalTTCAvantRemise === 0) return 0;

    const tvaMoyenne = (totalTTCAvantRemise - totalHTAvantRemise) / totalHTAvantRemise;
    const ratioRemise = ttc / totalTTCAvantRemise;
    const htApresRemise = totalHTAvantRemise * ratioRemise;

    return htApresRemise;
  };

  // Total TVA après remise
  const totalTVA = () => {
    return totalTTC() - totalHT();
  };


  const totalPaiements = paiements.reduce((sum, p) => sum + (p.montant || 0), 0);
  const estReglementComplet = totalPaiements === totalTTC() && totalTTC() > 0;

  const ajouterLignePaiement = () => {
    setPaiements([...paiements, { type: TypeReglement.CHEQUE, montant: 0, imageUrl: undefined }]);
  };

  const designationOptions = () => {
    return products.map(product => ({
      value: product.id,
      label: product.designation,
      isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0) : product.quantiteStock === 0,
      data: product
    }));
  };

  const referenceOptions = () => {
    return products.map(product => ({
      value: product.id,
      label: product.reference,
      isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0) : product.quantiteStock === 0,
      data: product
    }));
  };

  const codeOptions = () => {
    return products.map(product => ({
      value: product.id,
      label: product.code || product.reference,
      isDisabled: userRole === 'CHAUFFEUR' && defaultHomeId ? !product.stockLocations?.some(sl => sl.homeId === defaultHomeId && sl.quantite > 0) : product.quantiteStock === 0,
      data: product
    }));
  };

  const getHomeOptions = (productId?: string) => {
    if (userRole !== 'ADMIN') return [];

    const homesToShow = homes;

    return homesToShow.map(home => {
      const stockDisponible = productId ? getStockDisponible(productId, home.id) : 0;
      const isDisabled = productId ? stockDisponible <= 0 : true;

      return {
        value: home.id,
        label: productId
          ? `${home.nom} (Stock: ${stockDisponible})`
          : home.nom,
        isDisabled: isDisabled,
        stock: stockDisponible,
        data: home
      };
    });
  };

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      borderColor: state.isFocused ? 'hsl(var(--primary))' : 'hsl(var(--border))',
      '&:hover': { borderColor: 'hsl(var(--primary))' },
      boxShadow: state.isFocused ? '0 0 0 2px hsl(var(--primary) / 0.2)' : 'none',
      minHeight: '36px',
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isDisabled
        ? '#fef2f2'
        : state.isFocused
          ? 'hsl(var(--accent))'
          : 'transparent',
      color: state.isDisabled ? '#dc2626' : 'inherit',
      cursor: state.isDisabled ? 'not-allowed' : 'pointer',
      opacity: state.isDisabled ? 0.7 : 1,
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))',
      fontSize: '13px',
      fontWeight: '500',
      overflow: 'visible',
      textOverflow: 'ellipsis',
      whiteSpace: 'normal',
      wordBreak: 'break-word',
    }),
    valueContainer: (base: any) => ({
      ...base,
      padding: '2px 8px',
      overflow: 'visible',
    }),
    input: (base: any) => ({
      ...base,
      color: 'hsl(var(--foreground))',
    }),
    placeholder: (base: any) => ({
      ...base,
      color: 'hsl(var(--muted-foreground))',
      fontSize: '13px',
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
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

  const updatePaiement = (index: number, field: keyof PaiementDetail, value: any) => {
    const newPaiements = [...paiements];
    newPaiements[index] = { ...newPaiements[index], [field]: value };
    setPaiements(newPaiements);
  };

  const handleOpenReglement = () => {
    setIsReglementDialogOpen(true);
  };

  const handleCloseReglement = () => {
    setIsReglementDialogOpen(false);
  };

  const handleValidateReglement = () => {
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiementsValides = paiementsValides.reduce((sum, p) => sum + p.montant, 0);

    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un paiement", variant: "destructive" });
      return;
    }

    if (Math.abs(totalPaiementsValides - totalTTC()) > 0.001) {
      toast({ title: "Erreur", description: `Le total des paiements (${formatCurrency(totalPaiementsValides)}) ne correspond pas au total TTC (${formatCurrency(totalTTC())})`, variant: "destructive" });
      return;
    }

    const paiementsAvecImages = paiements.map((paiement, index) => ({
      ...paiement,
      imageUrl: paymentImages[index] || undefined,
    }));

    setPaiements(paiementsAvecImages);
    setIsReglementDialogOpen(false);
    toast({ title: "Succès", description: "Règlement configuré avec succès" });
  };

  const handleClientInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { id, value } = e.target;
    setClientFormData((prev) => ({ ...prev, [id]: value }));
  };

  const resetClientForm = () => {
    setClientFormData({
      nom: "",
      telephone: "",
      email: "",
      adresse: "",
      ville: "",
      latitude: null,
      longitude: null,
      cin: "",
      mf: "",
    });
    setSelectedClient(null);
    setShowMapPicker(false);
  };

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientFormData.nom || !clientFormData.telephone) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    if (!clientFormData.cin && !clientFormData.mf) {
      toast({
        title: "Erreur",
        description: "Veuillez saisir soit le CIN soit le Matricule Fiscal (MF)",
        variant: "destructive",
      });
      return;
    }

    setIsSubmittingClient(true);

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(clientFormData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la création");
      }

      await fetchClients();

      setTimeout(() => {
        setSelectedClientId(result.id);
      }, 100);

      toast({ title: "Succès", description: "Client ajouté avec succès" });
      setIsClientDialogOpen(false);
      resetClientForm();
    } catch (error) {
      console.error("Error creating client:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer le client",
        variant: "destructive",
      });
    } finally {
      setIsSubmittingClient(false);
    }
  };

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée par votre navigateur",
        variant: "destructive",
      });
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setClientFormData((prev) => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast({
          title: "Position obtenue",
          description: `Lat: ${position.coords.latitude}, Lng: ${position.coords.longitude}`,
        });
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast({
          title: "Erreur",
          description: "Impossible d'obtenir votre position",
          variant: "destructive",
        });
        setIsLocating(false);
      }
    );
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setClientFormData((prev) => ({
      ...prev,
      latitude: lat,
      longitude: lng,
    }));
    setShowMapPicker(false);
    toast({
      title: "Position sélectionnée",
      description: `Latitude: ${lat}, Longitude: ${lng}`,
    });
  };

  const copyCoordinates = () => {
    if (clientFormData.latitude && clientFormData.longitude) {
      const coords = `${clientFormData.latitude},${clientFormData.longitude}`;
      navigator.clipboard.writeText(coords);
      toast({ title: "Copié", description: "Coordonnées copiées dans le presse-papier" });
    }
  };

  const openInGoogleMaps = () => {
    if (clientFormData.latitude && clientFormData.longitude) {
      window.open(`https://www.google.com/maps?q=${clientFormData.latitude},${clientFormData.longitude}`, '_blank');
    }
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

  const isReglementValid = () => {
    const paiementsValides = paiements.filter(p => p.montant > 0);
    const totalPaiementsValides = paiementsValides.reduce((sum, p) => sum + p.montant, 0);
    const finalTotal = totalTTC();
    return paiementsValides.length > 0 && Math.abs(totalPaiementsValides - finalTotal) <= 0.001 && finalTotal > 0;
  };

  const getStockDisponible = (productId: string, homeId: string): number => {
    const product = products.find(p => p.id === productId);
    if (!product) return 0;
    const stockLocation = product.stockLocations?.find(sl => sl.homeId === homeId);
    return stockLocation?.quantite || 0;
  };

  const addLigne = () => {
    setLignes([...lignes, {
      id: `ligne-${Date.now()}-${Math.random()}`,
      productId: "",
      homeId: userRole === 'CHAUFFEUR' && defaultHomeId ? defaultHomeId : "",
      quantite: 1,
      prixVente: 0
    }]);
  };

  const removeLigne = (index: number) => {
    if (lignes.length > 1) {
      setLignes(lignes.filter((_, i) => i !== index));
    }
  };

  const updateLigne = (index: number, field: keyof LigneBL, value: any) => {
    const newLignes = [...lignes];

    if (field === 'productId' && value) {
      const product = products.find(p => p.id === value);
      if (product) {
        newLignes[index] = {
          ...newLignes[index],
          productId: value,
          product: product,
          prixVente: product.prixVente, // ← AJOUTER CETTE LIGNE
        };
        if (userRole === 'CHAUFFEUR' && defaultHomeId) {
          const home = homes.find(h => h.id === defaultHomeId);
          if (home) {
            newLignes[index].homeId = defaultHomeId;
            newLignes[index].home = home;
          }
        }
      }
    } else if (field === 'homeId' && value) {
      const home = homes.find(h => h.id === value);
      if (home) {
        newLignes[index] = {
          ...newLignes[index],
          homeId: value,
          home: home,
        };
      }
    } else if (field === 'quantite') {
      newLignes[index] = {
        ...newLignes[index],
        quantite: value,
      };
    } else if (field === 'prixVente') { // ← AJOUTER CE BLOC
      newLignes[index] = {
        ...newLignes[index],
        prixVente: value,
      };
    } else {
      newLignes[index] = { ...newLignes[index], [field]: value };
    }

    setLignes(newLignes);
  };

  const fetchClients = async () => {
    try {
      const response = await fetch("/api/clients?includeProspects=true");
      const data = await response.json();
      setClients(data.data || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Erreur", description: "Impossible de charger les clients", variant: "destructive" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedClientId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un client", variant: "destructive" });
      return;
    }

    if (lignes.length === 0) {
      toast({ title: "Erreur", description: "Veuillez ajouter au moins un produit", variant: "destructive" });
      return;
    }

    const lignesSansHome = lignes.filter(l => !l.homeId);
    if (lignesSansHome.length > 0) {
      toast({
        title: "Erreur",
        description: "Toutes les lignes doivent avoir un emplacement assigné",
        variant: "destructive"
      });
      return;
    }

    const paiementsValides = paiements.filter(p => p.montant > 0);

    if (paiementsValides.length === 0) {
      toast({ title: "Erreur", description: "Veuillez saisir au moins un mode de paiement", variant: "destructive" });
      return;
    }

    const totalPaiementsCalc = paiementsValides.reduce((sum, p) => sum + p.montant, 0);

    if (Math.abs(totalPaiementsCalc - totalTTC()) > 0.001) {
      toast({ title: "Erreur", description: `Le montant total des paiements (${formatCurrency(totalPaiementsCalc)}) ne correspond pas au total TTC (${formatCurrency(totalTTC())})`, variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      let requestBody: any = {
        clientId: selectedClientId,
        statut: statut,
        lignes: lignes.map(l => ({
          productId: l.productId,
          homeId: l.homeId,
          quantite: l.quantite,
          prixVente: l.prixVente ?? (l.product?.prixVente ?? 0),
        })),
        montantTotal: totalTTC(),
        montantHT: totalHT(),
        montantTVA: totalTVA(),
        montantPaye: totalPaiementsCalc,
        montantRestant: 0,
        remise: remise,
        typeRemise: typeRemise,
        // montantTotal: totalTTC(),
        // montantHT: totalHT(),
        // montantTVA: totalTVA(),
        // montantPaye: totalPaiementsCalc,
        // montantRestant: 0,
        // remise: remise,
        // typeRemise: typeRemise,
      };

      if (paiementsValides.length === 1) {
        const seulPaiement = paiementsValides[0];
        const paiementIndex = paiements.findIndex(p => p === seulPaiement);
        requestBody = {
          ...requestBody,
          modeReglement: seulPaiement.type,
          montant: seulPaiement.montant,
          typeReglement: seulPaiement.type,
          reference: seulPaiement.reference,
          banque: seulPaiement.banque,
          echeance: seulPaiement.echeance,
          imageUrl: paymentImages[paiementIndex] || null,
          nameSecondClient: seulPaiement.nameSecondClient || null,
        };
      } else {
        requestBody = {
          ...requestBody,
          modeReglement: 'MIXTE',
          paiements: paiementsValides.map((p, index) => {
            const originalIndex = paiements.findIndex(original => original === p);
            return {
              type: p.type,
              montant: p.montant,
              reference: p.reference,
              banque: p.banque,
              echeance: p.echeance,
              imageUrl: paymentImages[originalIndex] || null,
              nameSecondClient: p.nameSecondClient || null,
            };
          }),
        };
      }

      const response = await fetch(`/api/bon-livraisons/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === 'REMISE_NON_AUTORISEE') {
          alert(`Remise dépassée !\nDemandé: ${result.remiseDemandee}\nPlafond: ${result.plafondTotal}\nDépassement: ${result.depassement}`);
          toast({
            title: "⛔ REMISE NON AUTORISÉE",
            description: `Remise demandée: ${formatCurrency(result.remiseDemandee)}\nPlafond: ${formatCurrency(result.plafondTotal)}\nDépassement: ${formatCurrency(result.depassement)}`,
            variant: "destructive",
            duration: 10000,
          });
        } else {
          toast({
            title: "Erreur",
            description: result.error || result.message || "Erreur lors de la modification",
            variant: "destructive"
          });
        }
        return;
      }

      toast({ title: "Succès", description: "Bon de livraison modifié avec succès" });
      if (result.whatsappUrl) {
        window.open(result.whatsappUrl, '_blank');
      }

      router.push('/bons-livraison');
    } catch (error) {
      console.error("Error updating bon livraison:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier le bon de livraison",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier le Bon de Livraison" subtitle="Chargement..." />
          <main className="flex items-center justify-center h-[calc(100vh-73px)]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />

      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Modifier le Bon de Livraison" subtitle="Modifier un bon de livraison existant" />
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <Link href="/bons-livraison">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour à la liste
              </Button>
            </Link>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              {/* Informations générales */}
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Sélection du client */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Client *</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsClientDialogOpen(true)}
                          className="h-6 px-2 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Nouveau
                        </Button>
                      </div>
                      {isMounted && (
                        <Select2
                          options={clients.map(client => ({
                            value: client.id,
                            label: `${client.nom} - ${client.telephone}`
                          }))}
                          value={clients.map(client => ({
                            value: client.id,
                            label: `${client.nom} - ${client.telephone}`
                          })).find(o => o.value === selectedClientId) || null}
                          onChange={(selected: any) => setSelectedClientId(selected?.value || "")}
                          placeholder="Sélectionner un client"
                          isSearchable
                          isClearable
                          className="text-sm"
                          classNamePrefix="select"
                          menuPortalTarget={document.body}
                          styles={selectStyles}
                        />
                      )}
                    </div>

                    {/* Affichage des détails du client sélectionné */}
                    {selectedClientId && (() => {
                      const client = clients.find(c => c.id === selectedClientId);
                      if (!client) return null;
                      return (
                        <div className="mt-3 p-3 bg-muted/50 rounded-lg border">
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs text-muted-foreground">Nom :</span>
                              <span className="font-medium">{client.nom}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs text-muted-foreground">Tél :</span>
                              <span>{client.telephone}</span>
                            </div>
                            {(client as any).cin && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">CIN :</span>
                                <span className="font-mono text-xs">{(client as any).cin}</span>
                              </div>
                            )}
                            {(client as any).mf && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">MF :</span>
                                <span className="font-mono text-xs">{(client as any).mf}</span>
                              </div>
                            )}
                            {client.email && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">Email :</span>
                                <span className="text-xs truncate max-w-[200px]">{client.email}</span>
                              </div>
                            )}
                            {client.adresse && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">Adresse :</span>
                                <span className="text-xs truncate max-w-[300px]">{client.adresse}</span>
                              </div>
                            )}
                            {(client as any).ville && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-xs text-muted-foreground">Ville :</span>
                                <span>{(client as any).ville}</span>
                              </div>
                            )}
                            {(client as any).latitude && (client as any).longitude && (
                              <div className="flex items-center gap-1">
                                <span className="text-xs text-muted-foreground">GPS :</span>
                                <span className="text-xs font-mono">
                                  {(client as any).latitude}, {(client as any).longitude}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-2 text-xs"
                                  onClick={() => window.open(`https://www.google.com/maps?q=${(client as any).latitude},${(client as any).longitude}`, '_blank')}
                                >
                                  <Map className="h-3 w-3 mr-1" />
                                  Carte
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </CardContent>
              </Card>

              {/* Produits - avec 3 colonnes comme dans BE */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Produits à livrer</CardTitle>
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
                            <TableHead>Désignation</TableHead>
                            <TableHead>Référence</TableHead>
                            <TableHead>Code</TableHead>
                            {userRole === 'ADMIN' && <TableHead>Emplacement</TableHead>}
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix unitaire (TTC)</TableHead>
                            <TableHead>Total TTC</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {lignes.map((ligne, idx) => (
                            <TableRow key={ligne.id}>
                              {/* Colonne Désignation */}
                              <TableCell className="min-w-[200px]">
                                {isMounted && (
                                  <Select2
                                    options={designationOptions()}
                                    value={designationOptions().find(o => o.value === ligne.productId) || null}
                                    onChange={(selected: any) => updateLigne(idx, 'productId', selected?.value || "")}
                                    placeholder="Désignation"
                                    isSearchable
                                    isClearable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={selectStyles}
                                  />
                                )}
                              </TableCell>

                              {/* Colonne Référence */}
                              <TableCell className="min-w-[150px]">
                                {isMounted && (
                                  <Select2
                                    options={referenceOptions()}
                                    value={referenceOptions().find(o => o.value === ligne.productId) || null}
                                    onChange={(selected: any) => updateLigne(idx, 'productId', selected?.value || "")}
                                    placeholder="Référence"
                                    isSearchable
                                    isClearable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={selectStyles}
                                  />
                                )}
                              </TableCell>

                              {/* Colonne Code */}
                              <TableCell className="min-w-[150px]">
                                {isMounted && (
                                  <Select2
                                    options={codeOptions()}
                                    value={codeOptions().find(o => o.value === ligne.productId) || null}
                                    onChange={(selected: any) => updateLigne(idx, 'productId', selected?.value || "")}
                                    placeholder="Code"
                                    isSearchable
                                    isClearable
                                    className="text-sm"
                                    classNamePrefix="select"
                                    menuPortalTarget={document.body}
                                    styles={selectStyles}
                                  />
                                )}
                              </TableCell>

                              {/* Colonne Emplacement - seulement pour ADMIN */}
                              {userRole === 'ADMIN' && (
                                <TableCell className="min-w-[200px]">
                                  {isMounted && (
                                    <Select2
                                      options={getHomeOptions(ligne.productId)}
                                      value={getHomeOptions(ligne.productId).find(o => o.value === ligne.homeId) || null}
                                      onChange={(selected: any) => updateLigne(idx, 'homeId', selected?.value || "")}
                                      placeholder={ligne.productId ? "Emplacement" : "Choisir produit d'abord"}
                                      isSearchable
                                      isClearable
                                      isDisabled={!ligne.productId}
                                      className="text-sm"
                                      classNamePrefix="select"
                                      menuPortalTarget={document.body}
                                      styles={selectStyles}
                                    />
                                  )}
                                </TableCell>
                              )}

                              {/* Colonne Quantité */}
                              <TableCell>
                                <Input
                                  type="number"
                                  min="1"
                                  // max={ligne.productId && ligne.homeId ? getStockDisponible(ligne.productId, ligne.homeId) : undefined}
                                  value={ligne.quantite === 0 ? '' : ligne.quantite}
                                  onChange={(e) => updateLigne(idx, 'quantite', parseInt(e.target.value) || 0)}
                                  className="w-24"
                                />
                              </TableCell>

                              {/* Colonne Prix unitaire - MODIFIABLE */}
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0"
                                  value={
                                    // Si ligne.prixVente est 0 ou null/undefined, on affiche le prix du produit
                                    // Sinon on affiche le prix personnalisé
                                    (ligne.prixVente === 0 || ligne.prixVente === null || ligne.prixVente === undefined)
                                      ? (ligne.product?.prixVente ?? '')
                                      : ligne.prixVente
                                  }

                                  onChange={(e) => updateLigne(idx, 'prixVente', parseFloat(e.target.value) || 0)}
                                  className="w-28"
                                />
                              </TableCell>

                              <TableCell className="font-medium">
                                {formatCurrency(
                                  ((ligne.prixVente && ligne.prixVente !== 0)
                                    ? ligne.prixVente
                                    : (ligne.product?.prixVente ?? 0)) * ligne.quantite
                                )}
                              </TableCell>

                              {/* Colonne Suppression */}
                              <TableCell>
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

                    {/* Totaux */}
                    {lignes.some(l => l.productId && l.quantite > 0) && (
                      <div className="pt-4 border-t">
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                            <span>Total HT :</span>
                            <span>{formatCurrency(totalHT())}</span>
                          </div>

                          {/* Total TTC après remise */}
                          <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                            <span>Total TVA :</span>
                            <span>{formatCurrency(totalTVA())}</span>
                          </div>

                          {/* Section Remise */}
                          <div className="w-80">
                            <div className="flex gap-2 mb-2">

                              <Button
                                type="button"
                                variant={typeRemise === 'montant' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setTypeRemise('montant')}
                                className="flex-1"
                              >
                                Remise (DT)
                              </Button>
                            </div>
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={typeRemise === 'pourcentage' ? "100" : undefined}
                                value={remise === 0 ? '' : String(remise)}
                                 onChange={(e) => {
                                  const val = e.target.value;
                                  setRemise(val === '' ? 0 : parseFloat(val));
                                }}
                                // onChange={(e) => setRemise(parseFloat(e.target.value) || 0)}
                                placeholder={typeRemise === 'pourcentage' ? "Pourcentage de remise" : "Montant de la remise"}
                                className="flex-1"
                              />
                              {typeRemise === 'pourcentage' && (
                                <span className="flex items-center text-muted-foreground">DT</span>
                              )}
                            </div>
                            {remise > 0 && (
                              <div className="flex justify-between mt-2 text-green-600">
                                <span className="text-sm">Remise appliquée :</span>
                                <span className="text-sm font-semibold">
                                  - {formatCurrency(calculerMontantRemise())}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Total TTC après remise */}
                          <div className="flex justify-between w-80 text-lg font-bold border-t pt-2 mt-1">
                            <span>Total TTC :</span>
                            <span>{formatCurrency(totalTTC())}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Boutons d'action */}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/bons-livraison')}>
                  Annuler
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleOpenReglement}
                  disabled={totalTTC() === 0}
                  className="border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  Règlement
                  {isReglementValid() && totalTTC() > 0 && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-green-500"></span>
                  )}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !lignes.some(l => l.productId && l.quantite > 0) || !isReglementValid() || totalTTC() === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Enregistrer les modifications
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </main>
      </div>

      {/* Dialog de règlement */}
      <Dialog open={isReglementDialogOpen} onOpenChange={setIsReglementDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Règlement client</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center">
              <Button type="button" variant="outline" size="sm" onClick={ajouterLignePaiement}>
                <Plus className="h-4 w-4 mr-1" /> Ajouter un mode de paiement
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
                      <Select value={paiement.type} onValueChange={(value) => updatePaiement(index, 'type', value as TypeReglement)}>
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
                          <Label className="text-xs">Nom Client Secondaire (optionnel)</Label>
                          <Input value={paiement.nameSecondClient || ''} onChange={(e) => updatePaiement(index, 'nameSecondClient', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Référence</Label>
                          <Input value={paiement.reference || ''} onChange={(e) => updatePaiement(index, 'reference', e.target.value)} />
                        </div>
                        <div>
                          <Label className="text-xs">Banque</Label>
                          <Input value={paiement.banque || ''} onChange={(e) => updatePaiement(index, 'banque', e.target.value)} />
                        </div>
                        {paiement.type === 'TRAITE_BANCAIRE' && (
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
                <span className="font-medium">Total TTC après remise :</span>
                <span className="text-lg font-bold">{formatCurrency(totalTTC())}</span>
              </div>
              {remise > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Remise appliquée :</span>
                  <span>- {formatCurrency(calculerMontantRemise())}</span>
                </div>
              )}
              <div className="flex justify-between items-center text-sm mt-1">
                <span>Total paiements :</span>
                <span className={estReglementComplet ? "text-green-600 font-semibold" : totalPaiements > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                  {totalPaiements > 0 ? formatCurrency(totalPaiements) : "0.000 DT"}
                </span>
              </div>
              {!estReglementComplet && totalPaiements > 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Différence : {formatCurrency(Math.abs(totalTTC() - totalPaiements))}
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

      {/* Dialog d'ajout de client */}
      <Dialog open={isClientDialogOpen} onOpenChange={(open) => {
        setIsClientDialogOpen(open);
        if (!open) resetClientForm();
      }}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          {!showMapPicker ? (
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {selectedClient ? "Modifier le Client" : "Ajouter un Client"}
                </DialogTitle>
              </DialogHeader>

              <Tabs defaultValue="manual" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="manual">📝 Saisie manuelle</TabsTrigger>
                  <TabsTrigger value="gps">📍 Géolocalisation</TabsTrigger>
                </TabsList>

                {/* Onglet Saisie manuelle */}
                <TabsContent value="manual" className="space-y-4 pt-4">
                  <form onSubmit={handleAddClient} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="nom">Nom complet *</Label>
                        <Input
                          id="nom"
                          placeholder="Nom du client"
                          value={clientFormData.nom}
                          onChange={handleClientInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telephone">Téléphone *</Label>
                        <Input
                          id="telephone"
                          placeholder="XX XXX XXX"
                          value={clientFormData.telephone}
                          onChange={handleClientInputChange}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cin">
                          CIN
                          <span className="text-xs text-muted-foreground ml-1">(ou MF requis)</span>
                        </Label>
                        <Input
                          id="cin"
                          type="text"
                          placeholder="Numéro CIN"
                          value={clientFormData.cin || ""}
                          onChange={handleClientInputChange}
                          className={!clientFormData.cin && !clientFormData.mf ? "border-yellow-500 focus:ring-yellow-500" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="mf">
                          MF
                          <span className="text-xs text-muted-foreground ml-1">(ou CIN requis)</span>
                        </Label>
                        <Input
                          id="mf"
                          type="text"
                          placeholder="Matricule Fiscal"
                          value={clientFormData.mf || ""}
                          onChange={handleClientInputChange}
                          className={!clientFormData.cin && !clientFormData.mf ? "border-yellow-500 focus:ring-yellow-500" : ""}
                        />
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="email@example.com"
                          value={clientFormData.email}
                          onChange={handleClientInputChange}
                        />
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="font-semibold mb-2 block">Adresse complète</Label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Textarea
                            id="adresse"
                            placeholder="Adresse complète"
                            value={clientFormData.adresse}
                            onChange={handleClientInputChange}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ville">Ville</Label>
                          <Input
                            id="ville"
                            placeholder="Ville"
                            value={clientFormData.ville}
                            onChange={handleClientInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Localisation</Label>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setShowMapPicker(true)}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          Choisir sur la carte
                        </Button>
                      </div>
                    </div>

                    {(clientFormData.latitude && clientFormData.longitude) && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex justify-between items-start mb-2">
                          <p className="text-sm font-medium text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Coordonnées GPS sélectionnées
                          </p>
                          <div className="flex gap-2">
                            <Button type="button" variant="ghost" size="sm" onClick={copyCoordinates}>
                              <Copy className="h-3 w-3 mr-1" /> Copier
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={openInGoogleMaps}>
                              <Map className="h-3 w-3 mr-1" /> Voir la carte
                            </Button>
                          </div>
                        </div>
                        <p className="text-xs text-green-600 font-mono">
                          Latitude: {clientFormData.latitude} | Longitude: {clientFormData.longitude}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2">
                      <Button type="button" variant="outline" onClick={() => {
                        setIsClientDialogOpen(false);
                        resetClientForm();
                      }}>
                        Annuler
                      </Button>
                      <Button type="submit" disabled={isSubmittingClient}>
                        {isSubmittingClient && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {selectedClient ? "Modifier" : "Enregistrer"}
                      </Button>
                    </div>
                  </form>
                </TabsContent>

                {/* Onglet Géolocalisation */}
                <TabsContent value="gps" className="space-y-4 pt-4">
                  <div className="text-center space-y-4">
                    <div className="p-6 bg-muted rounded-lg">
                      <Navigation className="h-12 w-12 mx-auto text-primary mb-3" />
                      <h3 className="font-semibold text-lg">Obtenir ma position actuelle</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Utilisez la géolocalisation de votre navigateur pour obtenir vos coordonnées GPS
                      </p>
                      <Button
                        onClick={handleGetCurrentLocation}
                        disabled={isLocating}
                        className="mt-4"
                      >
                        {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                        {isLocating ? "Recherche..." : "Obtenir ma position"}
                      </Button>
                    </div>

                    {clientFormData.latitude && clientFormData.longitude && (
                      <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                        <p className="font-medium text-green-700">Position obtenue !</p>
                        <p className="text-sm mt-1">Latitude: {clientFormData.latitude}</p>
                        <p className="text-sm">Longitude: {clientFormData.longitude}</p>
                        <div className="flex gap-2 mt-3">
                          <Button type="button" size="sm" onClick={() => window.open(`https://www.google.com/maps?q=${clientFormData.latitude},${clientFormData.longitude}`, '_blank')}>
                            Voir sur Google Maps
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => {
                            setClientFormData(prev => ({ ...prev, latitude: null, longitude: null }));
                          }}>
                            Effacer
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="relative w-full" style={{ height: "100vh", maxHeight: "800px", minHeight: "600px" }}>
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-0 left-0 z-10 m-2 bg-white shadow-md"
                onClick={() => setShowMapPicker(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <MapPicker
                initialLat={clientFormData.latitude || 36.8065}
                initialLng={clientFormData.longitude || 10.1815}
                onSelect={handleMapSelect}
                onClose={() => setShowMapPicker(false)}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}