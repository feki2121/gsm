"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, X, Search, Loader2 } from 'lucide-react';

interface MapPickerProps {
  initialLat?: number;
  initialLng?: number;
  onSelect: (lat: number, lng: number) => void;
  onClose: () => void;
}

export function MapPicker({ initialLat = 36.8065, initialLng = 10.1815, onSelect, onClose }: MapPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [lat, setLat] = useState(initialLat);
  const [lng, setLng] = useState(initialLng);
  const [isLoading, setIsLoading] = useState(true);
  const [searchAddress, setSearchAddress] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    const loadMap = async () => {
      if (!mapRef.current || !isMounted) return;

      try {
        // Importer Leaflet
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');

        if (!isMounted) return;

        // Configuration de l'icône
        // @ts-ignore
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
          iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        });

        // Créer la carte
        mapInstanceRef.current = L.map(mapRef.current).setView([lat, lng], 15);
        
        // Ajouter le fond de carte
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        // Ajouter un marqueur
        markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current);
        
        // Événement quand le marqueur est déplacé
        markerRef.current.on('dragend', () => {
          const position = markerRef.current.getLatLng();
          setLat(position.lat);
          setLng(position.lng);
        });

        // Événement quand on clique sur la carte
        mapInstanceRef.current.on('click', (e: any) => {
          const { lat: clickLat, lng: clickLng } = e.latlng;
          setLat(clickLat);
          setLng(clickLng);
          markerRef.current.setLatLng([clickLat, clickLng]);
        });

        // Forcer le redimensionnement de la carte
        setTimeout(() => {
          if (mapInstanceRef.current) {
            mapInstanceRef.current.invalidateSize();
          }
        }, 100);

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading map:", error);
        setIsLoading(false);
      }
    };

    loadMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Recherche d'adresse
  const handleSearch = async () => {
    if (!searchAddress) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const newLat = parseFloat(data[0].lat);
        const newLng = parseFloat(data[0].lon);
        setLat(newLat);
        setLng(newLng);
        
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newLat, newLng], 15);
          markerRef.current.setLatLng([newLat, newLng]);
        }
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onSelect(lat, lng);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl flex flex-col" style={{ maxHeight: "85vh" }}>
        <div className="flex items-center justify-between p-4 border-b flex-shrink-0">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Choisir un emplacement
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 flex-1 flex flex-col min-h-0 overflow-y-auto">
          {/* Barre de recherche */}
          <div className="flex gap-2 mb-4 flex-shrink-0">
            <Input
              ref={searchInputRef}
              placeholder="Rechercher une adresse, une ville..."
              value={searchAddress}
              onChange={(e) => setSearchAddress(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={isSearching}>
              {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Chercher
            </Button>
          </div>

          {/* Carte - hauteur réduite à 400px */}
          <div className="relative w-full mb-4" style={{ height: "400px" }}>
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg z-10">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Chargement de la carte...</p>
                </div>
              </div>
            )}
            <div 
              ref={mapRef} 
              className="w-full h-full rounded-lg border" 
              style={{ background: '#f0f0f0' }}
            />
          </div>
          
          {/* Position sélectionnée avec margin-top négatif */}
          <div className="mt-[-40px] p-3 bg-muted rounded-lg relative z-20">
            <p className="text-sm font-medium">Position sélectionnée :</p>
            <p className="text-xs text-muted-foreground mt-1">
              Latitude: {lat.toFixed(6)} | Longitude: {lng.toFixed(6)}
            </p>
            <div className="flex gap-2 mt-3">
              <Button 
                size="sm" 
                variant="default"
                onClick={handleConfirm}
                className="flex-1"
              >
                Confirmer cette position
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}