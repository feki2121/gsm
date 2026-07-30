// components/TourneeMap.tsx
"use client";

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// Importer Leaflet dynamiquement pour éviter les erreurs SSR
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

// Importer les types Leaflet
import type { Icon, LatLngExpression } from 'leaflet';

interface TourneeMapProps {
  chauffeurPosition: { lat: number; lng: number } | null;
  livraisons: Array<{
    id: string;
    client: { nom: string };
    adresse: { adresse: string; ville: string };
    latitude: number | null;
    longitude: number | null;
    ordre: number;
  }>;
  currentIndex: number;
  onSelectLivraison: (index: number) => void;
}

export default function TourneeMap({ 
  chauffeurPosition, 
  livraisons, 
  currentIndex, 
  onSelectLivraison 
}: TourneeMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [LeafletIcon, setLeafletIcon] = useState<Icon | null>(null);
  const [positions, setPositions] = useState<LatLngExpression[]>([]);
  const [center, setCenter] = useState<LatLngExpression>([34.7769, 10.7772]); // Centre sur Sfax

  useEffect(() => {
    setIsMounted(true);
    
    // Importer l'icône Leaflet uniquement côté client
    import('leaflet').then((L) => {
      const customIcon = new L.Icon({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });
      setLeafletIcon(customIcon);
    });
  }, []);

  // Calculer les positions pour la ligne d'itinéraire
  useEffect(() => {
    const points: LatLngExpression[] = [];
    
    // Ajouter la position du chauffeur
    if (chauffeurPosition) {
      points.push([chauffeurPosition.lat, chauffeurPosition.lng]);
    }
    
    // Ajouter les positions des livraisons avec coordonnées
    livraisons
      .filter(l => l.latitude && l.longitude)
      .sort((a, b) => a.ordre - b.ordre)
      .forEach(l => {
        points.push([l.latitude!, l.longitude!]);
      });
    
    setPositions(points);
    
    // Centrer la carte sur la livraison courante ou le chauffeur
    const current = livraisons[currentIndex];
    if (current?.latitude && current?.longitude) {
      setCenter([current.latitude, current.longitude]);
    } else if (chauffeurPosition) {
      setCenter([chauffeurPosition.lat, chauffeurPosition.lng]);
    }
  }, [chauffeurPosition, livraisons, currentIndex]);

  if (!isMounted) {
    return (
      <div className="flex justify-center items-center h-96 bg-muted rounded-lg">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const hasPositions = livraisons.some(l => l.latitude && l.longitude);

  if (!hasPositions) {
    return (
      <div className="flex flex-col justify-center items-center h-96 bg-muted rounded-lg">
        <p className="text-muted-foreground mb-4">
          Aucune coordonnée GPS disponible pour les clients
        </p>
        <p className="text-sm text-muted-foreground">
          Veuillez ajouter des adresses avec coordonnées aux clients
        </p>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={13}
      style={{ height: '100%', width: '100%', minHeight: '400px', borderRadius: '0.5rem' }}
      zoomControl={true}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {/* Marqueur du chauffeur */}
      {chauffeurPosition && LeafletIcon && (
        <Marker 
          position={[chauffeurPosition.lat, chauffeurPosition.lng]} 
          icon={LeafletIcon}
        >
          <Popup>
            <div className="text-center">
              <strong>📍 Vous êtes ici</strong>
            </div>
          </Popup>
        </Marker>
      )}
      
      {/* Marqueurs des livraisons */}
      {LeafletIcon && livraisons.map((livraison, idx) => (
        livraison.latitude && livraison.longitude && (
          <Marker
            key={livraison.id}
            position={[livraison.latitude, livraison.longitude]}
            icon={LeafletIcon}
            eventHandlers={{
              click: () => onSelectLivraison(idx),
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <strong className="text-lg">#{livraison.ordre}</strong>
                <p className="font-semibold mt-1">{livraison.client.nom}</p>
                <p className="text-sm text-muted-foreground">{livraison.adresse.adresse}</p>
                <p className="text-sm text-muted-foreground">{livraison.adresse.ville}</p>
                <button
                  onClick={() => onSelectLivraison(idx)}
                  className="mt-2 w-full px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary/90 transition-colors"
                >
                  {idx === currentIndex ? '✓ En cours' : 'Sélectionner'}
                </button>
              </div>
            </Popup>
          </Marker>
        )
      ))}
      
      {/* Ligne d'itinéraire */}
      {positions.length > 1 && (
        <Polyline
          positions={positions}
          color="#3b82f6"
          weight={3}
          opacity={0.7}
          dashArray="5, 10"
        />
      )}
    </MapContainer>
  );
}