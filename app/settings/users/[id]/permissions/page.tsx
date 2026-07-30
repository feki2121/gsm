// app/settings/users/[id]/permissions/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Truck, Save, ArrowLeft, Phone, Car, Mail } from "lucide-react";

interface Permission {
  permission: string;
  granted: boolean;
  label: string;
  category: string;
  description: string;
}

interface User {
  id: string;
  nom: string;
  email: string;
  role: "ADMIN" | "CHAUFFEUR";
  chauffeur?: {
    id: string;
    nom: string;
    telephone: string;
    vehicule?: {
      immatricule: string;
      nom: string;
    };
  };
}

const availablePermissions: Permission[] = [
  // Dashboard
  { permission: "can_view_dashboard", label: "Voir le tableau de bord", category: "Dashboard", description: "Accès à la page d'accueil", granted: true },
  
  // Ventes
  { permission: "can_view_clients", label: "Voir les clients", category: "Ventes", description: "Consulter la liste des clients", granted: true },
  { permission: "can_view_bons_livraison", label: "Voir les bons de livraison", category: "Ventes", description: "Consulter les bons de livraison", granted: true },
  { permission: "can_create_bon_livraison", label: "Créer des bons de livraison", category: "Ventes", description: "Créer de nouveaux bons de livraison", granted: false },
  { permission: "can_update_bon_livraison_status", label: "Mettre à jour le statut des livraisons", category: "Ventes", description: "Marquer une livraison comme effectuée", granted: true },
  
  // Stock
  { permission: "can_view_produits", label: "Voir les produits", category: "Stock", description: "Consulter la liste des produits", granted: true },
  { permission: "can_view_emplacements", label: "Voir les emplacements", category: "Stock", description: "Consulter les emplacements de stock", granted: true },
  { permission: "can_view_mouvements_stock", label: "Voir les mouvements de stock", category: "Stock", description: "Consulter l'historique des mouvements", granted: true },
  
  // Logistique
  { permission: "can_view_tournees", label: "Voir les tournées", category: "Logistique", description: "Consulter les tournées assignées", granted: true },
  { permission: "can_update_tournee_status", label: "Mettre à jour les tournées", category: "Logistique", description: "Modifier le statut des tournées", granted: true },
  { permission: "can_view_vehicules", label: "Voir les véhicules", category: "Logistique", description: "Consulter les véhicules", granted: true },
  
  // Rapports
  { permission: "can_view_rapports", label: "Voir les rapports", category: "Rapports", description: "Consulter les rapports", granted: true },
  
  // Profil
  { permission: "can_view_own_profile", label: "Voir son profil", category: "Profil", description: "Accès à son propre profil", granted: true },
  { permission: "can_update_own_profile", label: "Modifier son profil", category: "Profil", description: "Modifier ses informations personnelles", granted: true },
];

export default function UserPermissionsPage() {
  const { sidebarClasses } = useSidebar();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  useEffect(() => {
    fetchUserAndPermissions();
  }, []);

  const fetchUserAndPermissions = async () => {
    try {
      // Récupérer l'utilisateur
      const userRes = await fetch(`/api/users/${params.id}`);
      const userData = await userRes.json();
      setUser(userData.data);

      // Récupérer les permissions actuelles
      const permsRes = await fetch(`/api/users/permissions?userId=${params.id}`);
      const permsData = await permsRes.json();
      
      if (permsData.success) {
        const currentPermissions = new Set(permsData.permissions);
        const updatedPermissions = availablePermissions.map(p => ({
          ...p,
          granted: currentPermissions.has(p.permission),
        }));
        setPermissions(updatedPermissions);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Erreur", description: "Impossible de charger les données", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const togglePermission = (permissionName: string) => {
    setPermissions(prev =>
      prev.map(p =>
        p.permission === permissionName ? { ...p, granted: !p.granted } : p
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Envoyer toutes les permissions modifiées
      for (const perm of permissions) {
        const original = availablePermissions.find(ap => ap.permission === perm.permission);
        if (original && original.granted !== perm.granted) {
          await fetch("/api/users/permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: params.id,
              permission: perm.permission,
              granted: perm.granted,
            }),
          });
        }
      }

      toast({ title: "Succès", description: "Permissions mises à jour avec succès" });
      router.push("/settings/users");
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les permissions", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const categories = [...new Set(permissions.map(p => p.category))];

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300 flex items-center justify-center", sidebarClasses)}>
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header 
          title={`Permissions - ${user?.nom}`} 
          subtitle={`Gérer les droits d'accès`}
        />
        <main className="p-4 md:p-6">
          <div className="mx-auto max-w-4xl">
            <Button variant="ghost" onClick={() => router.push("/settings/users")} className="mb-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Retour
            </Button>

            {/* Carte d'information utilisateur */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-full bg-primary/10 p-3">
                      {user?.role === "ADMIN" ? (
                        <Shield className="h-8 w-8 text-primary" />
                      ) : (
                        <Truck className="h-8 w-8 text-primary" />
                      )}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold">{user?.nom}</h2>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Mail className="h-3 w-3" />
                        <span>{user?.email}</span>
                      </div>
                      {user?.chauffeur && (
                        <>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            <span>{user.chauffeur.telephone}</span>
                          </div>
                          {user.chauffeur.vehicule && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                              <Car className="h-3 w-3" />
                              <span>{user.chauffeur.vehicule.immatricule} - {user.chauffeur.vehicule.nom}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <Badge variant={user?.role === "ADMIN" ? "default" : "secondary"} className="text-sm px-3 py-1">
                    {user?.role === "ADMIN" ? (
                      <><Shield className="h-3 w-3 mr-1" /> Administrateur</>
                    ) : (
                      <><Truck className="h-3 w-3 mr-1" /> Chauffeur</>
                    )}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Droits d'accès
                </CardTitle>
              </CardHeader>
              <CardContent>
                {user?.role === "ADMIN" ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Les administrateurs ont automatiquement tous les droits d'accès.</p>
                    <p className="text-sm">Aucune configuration nécessaire.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {categories.map(cat => (
                      <div key={cat} className="space-y-3">
                        <h3 className="font-semibold text-lg border-b pb-2">{cat}</h3>
                        <div className="space-y-2">
                          {permissions
                            .filter(p => p.category === cat)
                            .map(permission => (
                              <div key={permission.permission} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                                <div className="space-y-0.5">
                                  <Label className="font-medium cursor-pointer">{permission.label}</Label>
                                  <p className="text-xs text-muted-foreground">{permission.description}</p>
                                </div>
                                <Switch
                                  checked={permission.granted}
                                  onCheckedChange={() => togglePermission(permission.permission)}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {user?.role !== "ADMIN" && (
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="outline" onClick={() => router.push("/settings/users")}>
                  Annuler
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Sauvegarder les permissions
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}