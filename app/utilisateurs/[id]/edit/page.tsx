"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, ArrowLeft, Shield, Truck, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import Select2 from "react-select";

interface Vehicule {
  id: string;
  immatricule: string;
  nom: string;
  homeId: string;
  home?: {
    id: string;
    nom: string;
  };
}

interface Chauffeur {
  id: string;
  nom: string;
  telephone: string;
  vehiculeId: string;
  vehicule?: Vehicule;
}

interface User {
  id: string;
  nom: string;
  email: string;
  cin: string;
  phone: string;
  role: string;
  chauffeur: Chauffeur | null;
}

export default function EditUtilisateurPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  
  const [formData, setFormData] = useState({
    nom: "",
    email: "",
    cin: "",
    phone: "",
    role: "CHAUFFEUR" as "ADMIN" | "CHAUFFEUR",
    vehiculeId: "",
    password: "",
    confirmPassword: "",
  });

  const [originalUser, setOriginalUser] = useState<User | null>(null);

  useEffect(() => {
    setIsMounted(true);
    fetchVehicules();
    fetchUser();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`);
      if (!response.ok) throw new Error("Erreur lors du chargement");
      const data = await response.json();
      setOriginalUser(data);
      setFormData({
        nom: data.nom,
        email: data.email,
        cin: data.cin,
        phone: data.phone || "",
        role: data.role,
        vehiculeId: data.chauffeur?.vehiculeId || "",
        password: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error fetching user:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'utilisateur",
        variant: "destructive",
      });
      router.push("/utilisateurs");
    } finally {
      setIsLoadingData(false);
    }
  };

  const fetchVehicules = async () => {
    try {
      const response = await fetch("/api/vehicules?limit=100");
      const data = await response.json();
      setVehicules(data.data || []);
    } catch (error) {
      console.error("Error fetching vehicules:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoleChange = (value: "ADMIN" | "CHAUFFEUR") => {
    setFormData((prev) => ({ ...prev, role: value, vehiculeId: "" }));
  };

  const validateForm = (): boolean => {
    if (!formData.nom.trim()) {
      toast({ title: "Erreur", description: "Le nom est requis", variant: "destructive" });
      return false;
    }

    if (!formData.email.trim()) {
      toast({ title: "Erreur", description: "L'email est requis", variant: "destructive" });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({ title: "Erreur", description: "Email invalide", variant: "destructive" });
      return false;
    }

    if (!formData.phone.trim()) {
      toast({ title: "Erreur", description: "Le téléphone est requis", variant: "destructive" });
      return false;
    }

    if (formData.password && formData.password.length < 6) {
      toast({ title: "Erreur", description: "Le mot de passe doit contenir au moins 6 caractères", variant: "destructive" });
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return false;
    }

    if (formData.role === "CHAUFFEUR" && !formData.vehiculeId) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un véhicule pour le chauffeur", variant: "destructive" });
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: formData.nom,
          email: formData.email,
          cin: formData.cin,
          phone: formData.phone,
          role: formData.role,
          vehiculeId: formData.role === "CHAUFFEUR" ? formData.vehiculeId : undefined,
          password: formData.password || undefined,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erreur lors de la modification");
      }

      toast({
        title: "Succès",
        description: "Utilisateur modifié avec succès",
      });

      router.push(`/utilisateurs`);
      router.refresh();
    } catch (error) {
      console.error("Error updating user:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const vehiculeOptions = vehicules.map(vehicule => ({
    value: vehicule.id,
    label: `${vehicule.nom} - ${vehicule.immatricule}`,
  }));

  if (isLoadingData) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Modifier l'utilisateur" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
        <Header title="Modifier l'utilisateur" subtitle={`Modifier les informations de ${originalUser?.nom || "l'utilisateur"}`} />
        <main className="p-4 md:p-6">
          <div className="mb-6">
            <Link href={`/utilisateurs/${params.id}/view`}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
            </Link>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Informations générales</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom complet *</Label>
                      <Input
                        id="nom"
                        name="nom"
                        placeholder="Nom de l'utilisateur"
                        value={formData.nom}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cin">Cin *</Label>
                      <Input
                        id="cin"
                        name="cin"
                        type="text"
                        placeholder="xxxxxxxxxx"
                        value={formData.cin}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="email@example.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="XX XXX XXX"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="role">Rôle *</Label>
                      <Select value={formData.role} onValueChange={handleRoleChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner un rôle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="CHAUFFEUR">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4" />
                              Chauffeur
                            </div>
                          </SelectItem>
                          <SelectItem value="ADMIN">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4" />
                              Administrateur
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {formData.role === "CHAUFFEUR" && (
                      <div className="space-y-2">
                        <Label htmlFor="vehiculeId">Véhicule *</Label>
                        {isMounted && (
                          <Select2
                            options={vehiculeOptions}
                            value={vehiculeOptions.find(o => o.value === formData.vehiculeId) || null}
                            onChange={(selected: any) => setFormData(prev => ({ ...prev, vehiculeId: selected?.value || "" }))}
                            placeholder="Sélectionner un véhicule"
                            isSearchable
                            isClearable
                            className="text-sm"
                            classNamePrefix="select"
                            menuPortalTarget={document.body}
                            styles={{
                              menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sécurité</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="password">Nouveau mot de passe</Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Laisser vide pour conserver l'ancien"
                        value={formData.password}
                        onChange={handleInputChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum 6 caractères. Laisser vide pour conserver le mot de passe actuel.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="Confirmer le nouveau mot de passe"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        disabled={!formData.password}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => router.push(`/utilisateurs/${params.id}/view`)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Modification...
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
    </div>
  );
}