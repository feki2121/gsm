"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebartest";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/hooks/useSidebar";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Trash2, Mail, Phone, User, Shield, Truck, Home, Car } from "lucide-react";
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  phone: string;
  role: string;
  chauffeur: Chauffeur | null;
}

export default function ViewUtilisateurPage() {
  const { sidebarClasses } = useSidebar();
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUser();
  }, [params.id]);

  const fetchUser = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`);
      if (!response.ok) {
        throw new Error("Erreur lors du chargement");
      }
      const data = await response.json();
      setUser(data);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les détails de l'utilisateur",
        variant: "destructive",
      });
      router.push("/utilisateurs");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const response = await fetch(`/api/users/${params.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erreur lors de la suppression");
      }

      toast({
        title: "Succès",
        description: "Utilisateur supprimé avec succès",
      });

      router.push("/utilisateurs");
      router.refresh();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer l'utilisateur",
        variant: "destructive",
      });
    }
  };

  const getRoleBadge = (role: string) => {
    if (role === "ADMIN") {
      return <Badge className="bg-purple-500">Administrateur</Badge>;
    }
    return <Badge className="bg-blue-500">Chauffeur</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background flex-col md:flex-row">
        <Sidebar />
        <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
          <Header title="Détails de l'utilisateur" />
          <main className="p-4 md:p-6">
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background flex-col md:flex-row">
      <Sidebar />
      <div className={cn("flex-1 transition-all duration-300", sidebarClasses)}>
        <Header title="Détails de l'utilisateur" />
        <main className="p-4 md:p-6">
          <div className="max-w-4xl mx-auto">
            {/* Boutons d'action */}
            <div className="mb-6 flex justify-between items-center">
              <Link href="/utilisateurs">
                <Button variant="outline" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Retour à la liste
                </Button>
              </Link>
              <div className="flex gap-3">
                <Link href={`/utilisateurs/${params.id}/edit`}>
                  <Button variant="outline" className="gap-2">
                    <Edit className="h-4 w-4" />
                    Modifier
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Cette action est irréversible. Cela supprimera définitivement
                        l'utilisateur et toutes ses données associées.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                        Supprimer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* En-tête avec nom et rôle */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-8 w-8" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{user.nom}</h2>
                    <div className="flex items-center gap-2 mt-1">
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations générales */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  Informations générales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Nom complet</p>
                    <p className="font-medium">{user.nom}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Rôle</p>
                    <p className="font-medium">{user.role === "ADMIN" ? "Administrateur" : "Chauffeur"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <p className="font-medium">{user.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Téléphone
                    </p>
                    <p className="font-medium">{user.phone || "Non renseigné"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations chauffeur (si applicable) */}
            {user.role === "CHAUFFEUR" && user.chauffeur && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Truck className="h-5 w-5 text-primary" />
                    Informations chauffeur
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Nom du chauffeur</p>
                      <p className="font-medium">{user.chauffeur.nom}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Téléphone</p>
                      <p className="font-medium">{user.chauffeur.telephone || "Non renseigné"}</p>
                    </div>
                    {user.chauffeur.vehicule && (
                      <>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Car className="h-3 w-3" /> Véhicule
                          </p>
                          <p className="font-medium">{user.chauffeur.vehicule.nom}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Immatriculation</p>
                          <p className="font-medium font-mono">{user.chauffeur.vehicule.immatricule}</p>
                        </div>
                        {user.chauffeur.vehicule.home && (
                          <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Home className="h-3 w-3" /> Emplacement assigné
                            </p>
                            <p className="font-medium">{user.chauffeur.vehicule.home.nom}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}