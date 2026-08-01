"use client";

import { Sidebar } from "@/components/layout/sidebartest";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Product, formatCurrency } from "@/lib/types";
import { Plus, Package, Edit, Trash2, Eye, Loader2, History, Filter, TrendingUp, BarChart3, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { FileSpreadsheet } from "lucide-react";
import { useSession } from "next-auth/react";
import { generateCatalogueHTML, generateCatalogueHTMLTest } from "@/lib/print-utils-jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";

// Interfaces
interface Category {
  id: string;
  nom: string;
  description?: string;
}

interface EmplacementStats {
  homeId: string;
  homeNom: string;
  totalValeurAchat: number;
  nombreProduits: number;
}

interface Home {
  id: string;
  nom: string;
  description?: string;
}

interface StockParType {
  typeBE: string;
  quantite: number;
}

interface ProductWithStockTypes extends Product {
  stockParType?: StockParType[];
}

interface StockItem {
  typeBE: string;
  quantite: number;
}

type TypeBEFilter = "TOUS" | "FAC" | "BL" | "BS" | "AUCUN";

export default function ProduitsPage() {
  const { sidebarClasses } = useSidebar();
  const { data: session } = useSession();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [products, setProducts] = useState<ProductWithStockTypes[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [homes, setHomes] = useState<Home[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<TypeBEFilter>("TOUS");
  const [emplacementFilter, setEmplacementFilter] = useState<string>("TOUS");
  const [emplacementStats, setEmplacementStats] = useState<EmplacementStats[]>([]);
  const [showStats, setShowStats] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    reference: "",
    designation: "",
    categoryId: "",
    homeId: "",
    prixAchat: "",
    prixVente: "",
    tva: 19,
    quantiteStock: "",
    seuilAlerte: "",
  });
  const isAdmin = session?.user?.role === 'ADMIN';

  const [isGeneratingCatalogue, setIsGeneratingCatalogue] = useState(false);
  const [isGeneratingCatalogueTest, setIsGeneratingCatalogueTest] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");

  const { toast } = useToast();

  // Charger les produits, catégories et emplacements
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchProducts(),
          fetchCategories(),
          fetchHomes()
        ]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const fetchProducts = async () => {
    try {
      // Ajoutez includeStock=true pour récupérer stockParType directement
      const response = await fetch("/api/products?limit=1000&includeStock=true");
      if (!response.ok) throw new Error("Erreur lors du chargement des produits");
      const data = await response.json();

      // Plus besoin de faire des appels supplémentaires !
      // Les données stockParType sont déjà incluses
      setProducts(data.data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les produits",
        variant: "destructive",
      });
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement des catégories");
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error("Error fetching categories:", error);
      setCategories([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger les catégories",
        variant: "destructive",
      });
    }
  };

  const fetchHomes = async () => {
    try {
      const response = await fetch("/api/homes?limit=100");
      if (!response.ok) throw new Error("Erreur lors du chargement des emplacements");
      const data = await response.json();
      setHomes(data.data || []);
    } catch (error) {
      console.error("Error fetching homes:", error);
      setHomes([]);
      toast({
        title: "Erreur",
        description: "Impossible de charger les emplacements",
        variant: "destructive",
      });
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      // Filtre par type BE
      if (typeFilter !== "TOUS") {
        const stockForType = (product.stockParType as any)?.[typeFilter] || 0;
        if (Number(stockForType) === 0) return false;
      }

      // Filtre par emplacement
      if (emplacementFilter !== "TOUS") {
        const hasStockInLocation = product.stockLocations?.some(
          loc => loc.homeId === emplacementFilter && loc.quantite > 0
        );
        if (!hasStockInLocation) return false;
      }

      return true;
    });
  }, [products, typeFilter, emplacementFilter]);
  const resetFilters = () => {
    setTypeFilter("TOUS");
    setEmplacementFilter("TOUS");
    setGlobalSearch("");
  };

  // Fonction de recherche combinée (designation, référence, code) avec useMemo
  const displayedProducts = useMemo(() => {
    if (!globalSearch.trim()) return filteredProducts;

    const searchLower = globalSearch.toLowerCase();
    return filteredProducts.filter(product =>
      product.designation?.toLowerCase().includes(searchLower) ||
      product.reference?.toLowerCase().includes(searchLower) ||
      product.code?.toLowerCase().includes(searchLower)
    );
  }, [filteredProducts, globalSearch]);


  const calculateEmplacementStats = useMemo(() => {
    const statsMap = new Map<string, EmplacementStats>();

    products.forEach(product => {
      if (product.stockLocations && product.stockLocations.length > 0) {
        product.stockLocations.forEach(location => {
          const homeId = location.homeId;
          const homeNom = location.home?.nom || "Emplacement inconnu";
          const valeurAchat = (product.prixAchat || 0) * location.quantite;

          if (statsMap.has(homeId)) {
            const existing = statsMap.get(homeId)!;
            existing.totalValeurAchat += valeurAchat;
            existing.nombreProduits += location.quantite;
          } else {
            statsMap.set(homeId, {
              homeId,
              homeNom,
              totalValeurAchat: valeurAchat,
              nombreProduits: location.quantite,
            });
          }
        });
      }
    });

    return Array.from(statsMap.values()).sort((a, b) => b.totalValeurAchat - a.totalValeurAchat);
  }, [products]);
  // Fonction pour obtenir le stock par type (fonctionne avec objet ou tableau)

  // Fonction pour obtenir le stock par type (maintenant c'est un objet)
  const getStockByType = (product: ProductWithStockTypes, type: string): number => {
    if (!product.stockParType) return 0;

    // Maintenant stockParType est directement un objet
    if (typeof product.stockParType === 'object' && !Array.isArray(product.stockParType)) {
      return (product.stockParType as any)[type] || 0;
    }

    // Fallback pour le cas où c'est encore un tableau
    if (Array.isArray(product.stockParType)) {
      const stockItem = product.stockParType.find(s => s.typeBE === type);
      return stockItem?.quantite || 0;
    }

    return 0;
  };

  // Fonction pour obtenir le badge de stock
  const getStockBadge = (product: ProductWithStockTypes, type: string) => {
    const quantite = getStockByType(product, type);
    if (quantite === 0) return null;

    const colors = {
      FAC: "bg-blue-100 text-blue-800 border-blue-200",
      BL: "bg-green-100 text-green-800 border-green-200",
      BS: "bg-yellow-100 text-yellow-800 border-yellow-200",
      AUCUN: "bg-gray-100 text-gray-800 border-gray-200",
    };

    const labels = {
      FAC: "Facture",
      BL: "Bon Livraison",
      BS: "Bon Sortie",
      AUCUN: "Aucun type",
    };

    return (
      <Badge key={type} className={colors[type as keyof typeof colors]}>
        {labels[type as keyof typeof labels]}: {quantite}
      </Badge>
    );
  };

  // Calculer le stock total par type
  const stockTotaux = products.reduce((acc, product) => {
    const types = ['FAC', 'BL', 'BS', 'AUCUN'];
    types.forEach(type => {
      const quantite = getStockByType(product, type);
      acc[type] = (acc[type] || 0) + quantite;
    });
    return acc;
  }, {} as Record<string, number>);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: name === "tva" ? Number(value) : value,
    }));
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) return;

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      setProducts(prev => prev.filter(p => p.id !== productId));

      toast({
        title: "Succès",
        description: "Produit supprimé avec succès",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le produit",
        variant: "destructive",
      });
    }
  };
  const confirmDelete = (productId: string) => {
    setProductToDelete(productId);
    setDeleteDialogOpen(true);
  };

  const handleGenerateCatalogue = async () => {
    setIsGeneratingCatalogue(true);
    try {
      const response = await fetch("/api/products/catalogue");
      if (!response.ok) throw new Error("Erreur lors de la génération");
      const data = await response.json();

      // Filtrer les produits avec stock physique > 0 (sécurité supplémentaire)
      const productsWithPhysicalStock = data.data.filter((product: any) => {
        // Vérifier via stockLocations (stock physique)
        const hasPhysicalStock = product.stockLocations?.some(
          (loc: any) => loc.quantite > 0
        ) || false;

        return hasPhysicalStock;
      });

      if (productsWithPhysicalStock.length === 0) {
        toast({
          title: "Information",
          description: "Aucun produit en stock physique pour générer le catalogue",
          variant: "default",
        });
        return;
      }

      // Générer le HTML du catalogue avec les produits filtrés
      const html = generateCatalogueHTML(productsWithPhysicalStock);

      // Ouvrir la fenêtre d'impression
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Catalogue Produits CHIHA GSM</title>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: white;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
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

      toast({
        title: "Succès",
        description: `Catalogue généré avec ${productsWithPhysicalStock.length} produit(s) en stock`,
      });
    } catch (error) {
      console.error("Error generating catalogue:", error);
      toast({
        title: "Erreur",
        description: "Impossible de générer le catalogue",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCatalogue(false);
    }
  };

const preloadImages = async (products: any[]): Promise<void> => {
  const productsWithImages = products.filter(p => p.imageUrl);
  
  if (productsWithImages.length === 0) {
    console.log("Aucune image à précharger");
    return;
  }
  // Créer un tableau de promesses pour chaque image
  const imagePromises = productsWithImages.map((product) => {
    return new Promise<void>((resolve) => {
      const img = new window.Image();
      
      img.onload = () => {
        console.log(`✅ Image chargée: ${product.imageUrl}`);
        resolve();
      };
      
      img.onerror = () => {
        console.warn(`❌ Échec chargement image: ${product.imageUrl}`);
        resolve();
      };
      
      img.src = product.imageUrl;
      
      setTimeout(() => {
        resolve();
      }, 5000);
    });
  });

  await Promise.all(imagePromises);
  console.log("✅ Toutes les images ont été traitées");
};

const handleGenerateCatalogueTest = async () => {
  setIsGeneratingCatalogueTest(true);
  
  try {
    // 1. Récupérer les produits
    const response = await fetch("/api/products/catalogue");
    if (!response.ok) throw new Error("Erreur lors de la génération");
    const data = await response.json();

    // 2. Filtrer les produits avec stock physique > 0
    const productsWithPhysicalStock = data.data.filter((product: any) => {
      const hasPhysicalStock = product.stockLocations?.some(
        (loc: any) => loc.quantite > 0
      ) || false;
      return hasPhysicalStock;
    });

    // 3. Vérifier qu'il y a des produits
    if (productsWithPhysicalStock.length === 0) {
      toast({
        title: "Information",
        description: "Aucun produit en stock physique pour générer le catalogue",
        variant: "default",
      });
      return;
    }

    // 4. ⭐ PRÉCHARGER LES IMAGES AVANT LE RENDU ⭐
    await preloadImages(productsWithPhysicalStock);

    // 5. Générer le HTML du catalogue
    const html = generateCatalogueHTMLTest(productsWithPhysicalStock);

    // 6. Ouvrir la fenêtre d'impression
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Catalogue Produits KTC</title>
          <meta charset="UTF-8">
          <style>
            body {
              margin: 0;
              padding: 20px;
              background: white;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          ${html}
          <script>
            // ⭐ ATTENDRE LE CHARGEMENT COMPLET ⭐
            window.onload = () => {
              // Attendre que toutes les images de la page soient chargées
              const images = document.querySelectorAll('img');
              let imagesLoaded = 0;
              
              if (images.length === 0) {
                // Pas d'images, imprimer directement
                setTimeout(() => {
                  window.print();
                  setTimeout(() => window.close(), 3000);
                }, 2000);
              } else {
                // Compter les images chargées
                images.forEach(img => {
                  if (img.complete) {
                    imagesLoaded++;
                    checkAllImagesLoaded();
                  } else {
                    img.onload = () => {
                      imagesLoaded++;
                      checkAllImagesLoaded();
                    };
                    img.onerror = () => {
                      imagesLoaded++;
                      checkAllImagesLoaded();
                    };
                  }
                });
                
                function checkAllImagesLoaded() {
                  if (imagesLoaded === images.length) {
                    // ⭐ TOUTES LES IMAGES SONT CHARGÉES ⭐
                    setTimeout(() => {
                      window.print();
                      setTimeout(() => window.close(), 3000);
                    }, 1000);
                  }
                }
                
                // ⭐ TIMEOUT DE SÉCURITÉ (5 secondes max) ⭐
                setTimeout(() => {
                  if (imagesLoaded < images.length) {
                    console.warn('Timeout: impression forcée après 5 secondes');
                    window.print();
                    setTimeout(() => window.close(), 3000);
                  }
                }, 5000);
              }
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    }

    // 7. Afficher le succès
    toast({
      title: "Succès",
      description: `Catalogue généré avec ${productsWithPhysicalStock.length} produit(s) en stock`,
    });
    
  } catch (error) {
    console.error("Error generating catalogue:", error);
    toast({
      title: "Erreur",
      description: "Impossible de générer le catalogue",
      variant: "destructive",
    });
  } finally {
    setIsGeneratingCatalogueTest(false);
  }
};

  // Même chose pour handleViewCatalogue
  const handleViewCatalogue = async () => {
    try {
      const response = await fetch("/api/products/catalogue");
      if (!response.ok) throw new Error("Erreur lors de la génération");
      const data = await response.json();

      // Filtrer les produits avec stock physique > 0
      const productsWithPhysicalStock = data.data.filter((product: any) => {
        const hasPhysicalStock = product.stockLocations?.some(
          (loc: any) => loc.quantite > 0
        ) || false;
        return hasPhysicalStock;
      });

      if (productsWithPhysicalStock.length === 0) {
        toast({
          title: "Information",
          description: "Aucun produit en stock physique pour afficher le catalogue",
          variant: "default",
        });
        return;
      }

      // Générer le HTML du catalogue
      const html = generateCatalogueHTML(productsWithPhysicalStock);

      // Ouvrir le catalogue dans une nouvelle fenêtre
      const viewWindow = window.open('', '_blank', 'width=1024,height=800,scrollbars=yes');
      if (viewWindow) {
        viewWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Catalogue KALLAL TECH</title>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            html, body {
              width: 100%;
              min-height: 100vh;
              margin: 0;
              padding: 0;
              background: #f5f5f5;
              font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
            }
            .catalogue-wrapper {
              max-width: 210mm;
              margin: 20px auto;
              background: white;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              border-radius: 12px;
              overflow: hidden;
            }
            .catalogue-wrapper > div {
              padding: 20px;
            }
            @media print {
              html, body {
                background: white !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              .catalogue-wrapper {
                max-width: 100% !important;
                margin: 0 !important;
                border-radius: 0 !important;
                box-shadow: none !important;
              }
              .catalogue-wrapper > div {
                padding: 10px !important;
              }
            }
            @media screen and (max-width: 768px) {
              .catalogue-wrapper {
                margin: 10px;
                border-radius: 8px;
              }
            }
          </style>
        </head>
        <body>
          <div class="catalogue-wrapper">
            ${html}
          </div>
          <script>
            window.onload = function() {
              document.body.style.minHeight = '100vh';
            };
          </script>
        </body>
        </html>
      `);
        viewWindow.document.close();
      }

      toast({
        title: "Succès",
        description: `Catalogue ouvert avec ${productsWithPhysicalStock.length} produit(s)`,
      });
    } catch (error) {
      console.error("Error viewing catalogue:", error);
      toast({
        title: "Erreur",
        description: "Impossible d'ouvrir le catalogue",
        variant: "destructive",
      });
    }
  };
  const columns = [
    {
      key: "image" as const,
      header: "",
      className: "w-[60px]",
      render: (item: ProductWithStockTypes) => (
        item.imageUrl ? (
          <div className="relative w-10 h-10 rounded-md overflow-hidden border border-gray-200">
            <Image
              src={item.imageUrl}
              alt={item.designation}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-md bg-gray-100 flex items-center justify-center">
            <Package className="h-5 w-5 text-gray-400" />
          </div>
        )
      ),
    },
    {
      key: "reference" as keyof Product,
      header: "Réf.",
      className: "w-[100px]",
      render: (item: ProductWithStockTypes) => (
        <span className="font-mono text-sm">{item.reference}</span>
      ),
    },
    {
      key: "code" as keyof Product,
      header: "Code",
      className: "w-[100px]",
      render: (item: ProductWithStockTypes) => (
        <span className="font-mono text-sm">{item.code || "-"}</span>
      ),
    },
    {
      key: "designation" as keyof Product,
      header: "Désignation",
      className: "min-w-[180px]",
      render: (item: ProductWithStockTypes) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{item.designation}</span>
        </div>
      ),
    },
    {
      key: "category.nom",
      header: "Catégorie",
      className: "w-[100px]",
      render: (item: ProductWithStockTypes) => (
        <Badge variant="secondary" className="text-xs">
          {item.category?.nom || "N/A"}
        </Badge>
      ),
    },
    {
      key: "stockFAC" as const,
      header: "FAC",
      className: "w-[80px] text-center",
      render: (item: ProductWithStockTypes) => {
        const stockFAC = getStockByType(item, "FAC");
        return (
          <span className={cn(
            "font-semibold text-sm",
            stockFAC > 0 ? "text-blue-600" : "text-gray-400"
          )}>
            {stockFAC}
          </span>
        );
      },
    },
    {
      key: "tva" as keyof Product,
      header: "TVA",
      className: "w-[60px] text-center",
      render: (item: ProductWithStockTypes) => (
        <span className="font-semibold text-sm">{item.tva}%</span>
      ),
    },
    ...(isAdmin
      ? [
        {
          key: "prixAchat" as keyof Product,
          header: "Achat",
          className: "w-[90px] text-right",
          render: (item: ProductWithStockTypes) => (
            <span className="text-muted-foreground text-sm">
              {formatCurrency(item.prixAchat)}
            </span>
          ),
        },
      ]
      : []),
    {
      key: "prixVente" as keyof Product,
      header: "Vente",
      className: "w-[90px] text-right",
      render: (item: ProductWithStockTypes) => (
        <span className="font-semibold text-sm">{formatCurrency(item.prixVente)}</span>
      ),
    },
    {
      key: "stockLocations" as const,
      header: "Emplacement",
      className: "min-w-[120px]",
      render: (item: ProductWithStockTypes) => (
        <div className="space-y-1">
          {item.stockLocations && item.stockLocations.length > 0 ? (
            <>
              {item.stockLocations.map((loc) => (
                <Badge
                  key={loc.homeId}
                  variant="outline"
                  className="text-xs block w-full text-left"
                >
                  {loc.home?.nom || "N/A"}: {loc.quantite}
                </Badge>
              ))}
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Aucun</span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-[50px]",
      render: (item: ProductWithStockTypes) => {
        if (!isAdmin) return null;

        return (
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <span className="sr-only">Ouvrir le menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem asChild>
                  <Link href={`/produits/edit/${item.id}`} className="cursor-pointer">
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Modifier</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => confirmDelete(item.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span>Supprimer</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirmer la suppression</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <p>Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible.</p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                    Annuler
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      if (productToDelete) {
                        handleDelete(productToDelete);
                        setDeleteDialogOpen(false);
                        setProductToDelete(null);
                      }
                    }}
                  >
                    Supprimer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        );
      }
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Produits" subtitle="Gestion des produits du magasin" />
          <main className="p-4 md:p-6">
            <Card>
              <CardContent className="p-8">
                <div className="flex justify-center items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span>Chargement des produits...</span>
                </div>
              </CardContent>
            </Card>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Produits" subtitle="Gestion des produits du magasin" />
        <main className="p-4 md:p-6">
          {/* Section des statistiques par emplacement */}
          {isAdmin && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Statistiques par Emplacement
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {calculateEmplacementStats.map((stat) => (
                    <Card key={stat.homeId} className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-lg">{stat.homeNom}</h3>
                          <TrendingUp className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Valeur totale d'achat:</span>
                            <span className="font-bold text-primary">
                              {formatCurrency(stat.totalValeurAchat)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Nombre de produits:</span>
                            <span className="font-semibold">{stat.nombreProduits} unités</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {calculateEmplacementStats.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    Aucune donnée de stock par emplacement disponible
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {/* Filtres et tableau des produits */}
          <Card>

            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  <CardTitle>Liste des Produits</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link href="/produits/creer">
                      <Button className="gap-2">
                        <Plus className="h-4 w-4" />
                        Nouveau produit
                      </Button>
                    </Link>
                  )}
                  {/* Nouveau bouton Voir catalogue */}
                  <Button
                    variant="outline"
                    onClick={handleViewCatalogue}
                    className="gap-2 bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    Voir catalogue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateCatalogue}
                    disabled={isGeneratingCatalogue}
                    className="gap-2"
                  >
                    {isGeneratingCatalogue ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Catalogue
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleGenerateCatalogueTest}
                    disabled={isGeneratingCatalogue}
                    className="gap-2"
                  >
                    {isGeneratingCatalogue ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSpreadsheet className="h-4 w-4" />
                    )}
                    Nouveau Catalogue
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {/* Barre de filtres */}
              <div className="mb-6 space-y-4">
                {/* Recherche et réinitialisation */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <Input
                      placeholder="Rechercher par désignation, référence ou code..."
                      value={globalSearch}
                      onChange={(e) => setGlobalSearch(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  {(typeFilter !== "TOUS" || emplacementFilter !== "TOUS") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={resetFilters}
                      className="gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Réinitialiser
                    </Button>
                  )}
                </div>

                {/* Filtres */}
                {isAdmin && (
                  <div className="flex flex-wrap gap-4 items-center">
                    {/* Filtre par type BE */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium whitespace-nowrap">Type BE:</Label>
                      <Select value={typeFilter} onValueChange={(value: TypeBEFilter) => setTypeFilter(value)}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Filtrer par type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TOUS">Tous les types</SelectItem>
                          <SelectItem value="FAC">Avec stock FAC</SelectItem>
                          <SelectItem value="BL">Avec stock BL</SelectItem>
                          <SelectItem value="BS">Avec stock BS</SelectItem>
                          <SelectItem value="AUCUN">Avec stock BE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtre par emplacement */}
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium whitespace-nowrap">Emplacement:</Label>
                      <Select value={emplacementFilter} onValueChange={setEmplacementFilter}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filtrer par emplacement" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TOUS">Tous les emplacements</SelectItem>
                          {homes.map((home) => (
                            <SelectItem key={home.id} value={home.id}>
                              {home.nom}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Indicateur de résultats */}
                    <div className="flex-1 flex justify-end">
                      <Badge variant="secondary">
                        {displayedProducts.length} produit{displayedProducts.length !== 1 ? 's' : ''} trouvé(s)
                      </Badge>
                    </div>
                  </div>
                )}
              </div>

              {/* DataTable avec largeurs optimisées */}
              <DataTable
                data={displayedProducts}
                columns={columns}
                hideSearch={true}
              />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}