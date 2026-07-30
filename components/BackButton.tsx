// components/BackButton.tsx
"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface BackButtonProps {
  label?: string;
  className?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  fallbackUrl?: string; // URL de secours si aucune page précédente
  showIcon?: boolean;
}

export function BackButton({ 
  label = "Retour", 
  className = "", 
  variant = "outline",
  size = "default",
  fallbackUrl = "/",
  showIcon = true
}: BackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    // Vérifier s'il y a une page précédente dans l'historique
    if (window.history.length > 1) {
      router.back();
    } else {
      // Sinon, rediriger vers l'URL de secours
      router.push(fallbackUrl);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleBack}
      className={className}
    >
      {showIcon && <ArrowLeft className="h-4 w-4 mr-2" />}
      {label}
    </Button>
  );
}