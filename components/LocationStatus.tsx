import { MapPin, CheckCircle, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LocationStatusProps {
  latitude: number | null;
  longitude: number | null;
  showDetails?: boolean;
}

export function LocationStatus({ latitude, longitude, showDetails = false }: LocationStatusProps) {
  const isLocated = latitude && longitude;

  if (!showDetails) {
    return isLocated ? (
      <Badge className="bg-green-500 text-white flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        Localisé
      </Badge>
    ) : (
      <Badge variant="outline" className="text-yellow-600 flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        Non localisé
      </Badge>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Localisation</span>
        {isLocated ? (
          <Badge className="bg-green-500 text-white text-xs">Coordonnées enregistrées</Badge>
        ) : (
          <Badge variant="outline" className="text-yellow-600 text-xs">Non localisé</Badge>
        )}
      </div>
      
      {isLocated && (
        <div className="ml-6 text-sm text-muted-foreground">
          <p>Latitude: {latitude?.toFixed(6)}</p>
          <p>Longitude: {longitude?.toFixed(6)}</p>
          <a 
            href={`https://www.google.com/maps?q=${latitude},${longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-xs"
          >
            Ouvrir dans Google Maps →
          </a>
        </div>
      )}
    </div>
  );
}