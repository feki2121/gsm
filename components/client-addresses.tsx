"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Edit, Trash2, MapPin, Star, Navigation, Loader2, Map, CheckCircle, Copy, ArrowLeft } from "lucide-react";
import { MapPicker } from "@/components/MapPicker";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ClientAddress {
  id: string;
  adresse: string;
  lieuDit: string | null;
  codePostal: string | null;
  ville: string | null;
  latitude: number | null;
  longitude: number | null;
  estPrincipale: boolean;
}

interface ClientAddressesProps {
  clientId: string;
  addresses: ClientAddress[];
  onAddressChange: () => void;
}

export function ClientAddresses({ clientId, addresses, onAddressChange }: ClientAddressesProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<ClientAddress | null>(null);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  
  const [formData, setFormData] = useState({
    adresse: "",
    lieuDit: "",
    codePostal: "",
    ville: "",
    latitude: null as number | null,
    longitude: null as number | null,
    estPrincipale: false,
  });

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erreur",
        description: "La géolocalisation n'est pas supportée",
        variant: "destructive"
      });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast({ title: "Succès", description: "Position obtenue" });
        setIsLocating(false);
      },
      (error) => {
        toast({ title: "Erreur", description: "Impossible d'obtenir votre position", variant: "destructive" });
        setIsLocating(false);
      }
    );
  };

  const handleMapSelect = (lat: number, lng: number) => {
    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
    setShowMapPicker(false);
    toast({ title: "Position sélectionnée", description: `Lat: ${lat}, Lng: ${lng}` });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const url = selectedAddress
        ? `/api/clients/${clientId}/addresses?addressId=${selectedAddress.id}`
        : `/api/clients/${clientId}/addresses`;
      
      const method = selectedAddress ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Erreur lors de l'enregistrement");

      toast({ title: "Succès", description: `Adresse ${selectedAddress ? "modifiée" : "ajoutée"} avec succès` });
      setIsDialogOpen(false);
      resetForm();
      onAddressChange();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'adresse", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette adresse ?")) return;

    try {
      const response = await fetch(`/api/clients/${clientId}/addresses?addressId=${addressId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Erreur lors de la suppression");

      toast({ title: "Succès", description: "Adresse supprimée avec succès" });
      onAddressChange();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer l'adresse", variant: "destructive" });
    }
  };

  const handleSetPrincipal = async (addressId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}/addresses?addressId=${addressId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estPrincipale: true }),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");

      toast({ title: "Succès", description: "Adresse principale mise à jour" });
      onAddressChange();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de définir l'adresse principale", variant: "destructive" });
    }
  };

  const openEditDialog = (address: ClientAddress) => {
    setSelectedAddress(address);
    setFormData({
      adresse: address.adresse,
      lieuDit: address.lieuDit || "",
      codePostal: address.codePostal || "",
      ville: address.ville || "",
      latitude: address.latitude,
      longitude: address.longitude,
      estPrincipale: address.estPrincipale,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      adresse: "",
      lieuDit: "",
      codePostal: "",
      ville: "",
      latitude: null,
      longitude: null,
      estPrincipale: false,
    });
    setSelectedAddress(null);
    setShowMapPicker(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Adresses du client</h3>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Ajouter une adresse
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            {!showMapPicker ? (
              <div className="p-6 max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{selectedAddress ? "Modifier l'adresse" : "Ajouter une adresse"}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="manual" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual">📝 Saisie manuelle</TabsTrigger>
                    <TabsTrigger value="gps">📍 Géolocalisation</TabsTrigger>
                  </TabsList>

                  <TabsContent value="manual" className="space-y-4 pt-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="adresse">Adresse *</Label>
                        <Textarea
                          id="adresse"
                          placeholder="Adresse complète"
                          value={formData.adresse}
                          onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="lieuDit">Lieu dit / Quartier</Label>
                          <Input
                            id="lieuDit"
                            value={formData.lieuDit}
                            onChange={(e) => setFormData(prev => ({ ...prev, lieuDit: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="codePostal">Code postal</Label>
                          <Input
                            id="codePostal"
                            value={formData.codePostal}
                            onChange={(e) => setFormData(prev => ({ ...prev, codePostal: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ville">Ville</Label>
                          <Input
                            id="ville"
                            value={formData.ville}
                            onChange={(e) => setFormData(prev => ({ ...prev, ville: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Localisation</Label>
                        <div className="flex gap-2">
                          <Button type="button" variant="outline" onClick={() => setShowMapPicker(true)}>
                            <MapPin className="h-4 w-4 mr-2" />
                            Choisir sur la carte
                          </Button>
                        </div>
                      </div>

                      {(formData.latitude && formData.longitude) && (
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-sm font-medium text-green-700">Coordonnées GPS</p>
                          <p className="text-xs text-green-600 font-mono">
                            Lat: {formData.latitude} | Lng: {formData.longitude}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="estPrincipale"
                          checked={formData.estPrincipale}
                          onChange={(e) => setFormData(prev => ({ ...prev, estPrincipale: e.target.checked }))}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="estPrincipale">Définir comme adresse principale</Label>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                          Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {selectedAddress ? "Modifier" : "Ajouter"}
                        </Button>
                      </div>
                    </form>
                  </TabsContent>

                  <TabsContent value="gps" className="space-y-4 pt-4">
                    <div className="text-center space-y-4">
                      <div className="p-6 bg-muted rounded-lg">
                        <Navigation className="h-12 w-12 mx-auto text-primary mb-3" />
                        <h3 className="font-semibold text-lg">Obtenir ma position actuelle</h3>
                        <Button onClick={handleGetCurrentLocation} disabled={isLocating} className="mt-4">
                          {isLocating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Navigation className="h-4 w-4 mr-2" />}
                          {isLocating ? "Recherche..." : "Obtenir ma position"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="relative w-full" style={{ height: "100vh", maxHeight: "600px", minHeight: "400px" }}>
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
                  initialLat={formData.latitude || 36.8065}
                  initialLng={formData.longitude || 10.1815}
                  onSelect={handleMapSelect}
                  onClose={() => setShowMapPicker(false)}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3">
        {addresses.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">Aucune adresse enregistrée</p>
        ) : (
          addresses.map((address) => (
            <Card key={address.id} className={address.estPrincipale ? "border-primary" : ""}>
              <CardContent className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{address.adresse}</p>
                      {address.estPrincipale && (
                        <Badge className="bg-primary">Principale</Badge>
                      )}
                    </div>
                    {(address.lieuDit || address.codePostal || address.ville) && (
                      <p className="text-sm text-muted-foreground ml-6">
                        {[address.lieuDit, address.codePostal, address.ville].filter(Boolean).join(" - ")}
                      </p>
                    )}
                    {address.latitude && address.longitude && (
                      <p className="text-xs text-muted-foreground ml-6 mt-1 font-mono">
                        📍 {address.latitude.toFixed(6)}, {address.longitude.toFixed(6)}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {!address.estPrincipale && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleSetPrincipal(address.id)}
                        title="Définir comme adresse principale"
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(address)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(address.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}