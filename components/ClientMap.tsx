"use client";

import { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ClientMapProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  clientName: string;
}

declare global {
  interface Window {
    google: any;
    initMap: () => void;
  }
}

export default function ClientMap({ latitude, longitude, address, clientName }: ClientMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  // Utiliser Leaflet (open source, sans clé API)
  useEffect(() => {
    // Charger Leaflet dynamiquement
    const loadLeaflet = async () => {
      if (!mapRef.current) return;

      // @ts-ignore
      const L = await import('leaflet');
      await import('leaflet/dist/leaflet.css');

      // Configuration de l'icône par défaut
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });

      // Position par défaut (Tunis)
      const defaultLat = 36.8065;
      const defaultLng = 10.1815;
      
      const mapLat = latitude || defaultLat;
      const mapLng = longitude || defaultLng;

      // Créer la carte
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current).setView([mapLat, mapLng], 13);
        
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: 'abcd',
          maxZoom: 19,
        }).addTo(mapInstanceRef.current);
      }

      // Ajouter ou déplacer le marqueur
      if (markerRef.current) {
        markerRef.current.remove();
      }

      if (latitude && longitude) {
        markerRef.current = L.marker([latitude, longitude]).addTo(mapInstanceRef.current);
        markerRef.current.bindPopup(`
          <strong>${clientName}</strong><br/>
          ${address}<br/>
          📍 ${latitude}, ${longitude}
        `).openPopup();
        mapInstanceRef.current.setView([latitude, longitude], 15);
      } else if (address) {
        // Essayer de géocoder avec Nominatim
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`)
          .then(res => res.json())
          .then(data => {
            if (data && data.length > 0) {
              const lat = parseFloat(data[0].lat);
              const lng = parseFloat(data[0].lon);
              markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
              markerRef.current.bindPopup(`
                <strong>${clientName}</strong><br/>
                ${address}
              `).openPopup();
              mapInstanceRef.current.setView([lat, lng], 13);
            }
          })
          .catch(console.error);
      }
    };

    loadLeaflet();
  }, [latitude, longitude, address, clientName]);

  if (!latitude && !longitude && !address) {
    return (
      <div className="h-96 bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
        <MapPinned className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Aucune localisation disponible</p>
        <p className="text-sm text-muted-foreground">Ajoutez une adresse et cliquez sur "Trouver sur la carte"</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div ref={mapRef} className="h-96 w-full rounded-lg border" />
      <p className="text-xs text-muted-foreground text-center">
        Carte fournie par OpenStreetMap
      </p>
    </div>
  );
}

// Import manquant
import { MapPinned } from 'lucide-react';