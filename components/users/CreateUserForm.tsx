// components/users/CreateUserForm.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, UserCog, Truck } from "lucide-react";

// Schéma de validation
const createUserSchema = z.object({
  email: z.string().email("Email invalide"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
  nom: z.string().min(2, "Le nom est requis"),
  role: z.enum(["ADMIN", "CHAUFFEUR"]),
  // Champs spécifiques chauffeur
  chauffeurNom: z.string().optional(),
  chauffeurTelephone: z.string().optional(),
  chauffeurVehiculeId: z.string().optional(),
}).refine((data) => {
  if (data.role === "CHAUFFEUR") {
    return data.chauffeurNom && data.chauffeurTelephone;
  }
  return true;
}, {
  message: "Les informations du chauffeur sont requises",
  path: ["chauffeurNom"],
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

interface Vehicule {
  id: string;
  immatricule: string;
  nom: string;
}

export function CreateUserForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [vehicules, setVehicules] = useState<Vehicule[]>([]);
  const [selectedRole, setSelectedRole] = useState<"ADMIN" | "CHAUFFEUR">("ADMIN");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: "ADMIN",
    },
  });

  const role = watch("role");

  // Charger les véhicules pour les chauffeurs
  const fetchVehicules = async () => {
    try {
      const response = await fetch("/api/vehicules");
      const data = await response.json();
      setVehicules(data.data || []);
    } catch (error) {
      console.error("Error fetching vehicules:", error);
    }
  };

  const onSubmit = async (data: CreateUserFormData) => {
    setIsLoading(true);
    
    try {
      const payload: any = {
        email: data.email,
        password: data.password,
        nom: data.nom,
        role: data.role,
      };

      if (data.role === "CHAUFFEUR") {
        payload.chauffeur = {
          nom: data.chauffeurNom,
          telephone: data.chauffeurTelephone,
          vehiculeId: data.chauffeurVehiculeId,
        };
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la création");
      }

      toast({
        title: "Succès",
        description: `Utilisateur ${data.nom} créé avec succès`,
      });
      
      router.push("/settings/users");
      router.refresh();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer l'utilisateur",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter un utilisateur</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Informations générales */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Informations générales</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="nom">Nom complet *</Label>
                <Input
                  id="nom"
                  placeholder="Jean Dupont"
                  {...register("nom")}
                  className={errors.nom ? "border-red-500" : ""}
                />
                {errors.nom && (
                  <p className="text-sm text-red-600">{errors.nom.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="jean@example.com"
                  {...register("email")}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••"
                  {...register("password")}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Rôle *</Label>
                <Select
                  value={role}
                  onValueChange={(value: "ADMIN" | "CHAUFFEUR") => {
                    setValue("role", value);
                    setSelectedRole(value);
                    if (value === "CHAUFFEUR") {
                      fetchVehicules();
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Administrateur
                      </div>
                    </SelectItem>
                    <SelectItem value="CHAUFFEUR">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4" />
                        Chauffeur
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Informations spécifiques Chauffeur */}
          {role === "CHAUFFEUR" && (
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-medium">Informations Chauffeur</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chauffeurNom">Nom du chauffeur *</Label>
                  <Input
                    id="chauffeurNom"
                    placeholder="Nom du chauffeur"
                    {...register("chauffeurNom")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chauffeurTelephone">Téléphone *</Label>
                  <Input
                    id="chauffeurTelephone"
                    placeholder="+216 XX XXX XXX"
                    {...register("chauffeurTelephone")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chauffeurVehiculeId">Véhicule assigné</Label>
                  <Select
                    onValueChange={(value) => setValue("chauffeurVehiculeId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un véhicule" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Aucun véhicule</SelectItem>
                      {vehicules.map((vehicule) => (
                        <SelectItem key={vehicule.id} value={vehicule.id}>
                          {vehicule.immatricule} - {vehicule.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/settings/users")}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Création...
                </>
              ) : (
                <>
                  <UserCog className="mr-2 h-4 w-4" />
                  Créer l'utilisateur
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}