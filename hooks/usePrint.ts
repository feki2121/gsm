"use client";

import { UsePrintOptions } from "@/types/print";
import { useCallback, useState } from "react";

export const usePrint = (options: UsePrintOptions = {}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const printHTML = useCallback(
    (htmlContent: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const printWindow = window.open("", "_blank", "noopener,noreferrer");

        if (!printWindow) {
          const errorMsg =
            "Impossible d'ouvrir la fenêtre d'impression. Vérifiez que les pop-ups ne sont pas bloqués.";
          setError(errorMsg);
          throw new Error(errorMsg);
        }

        // Injecter le HTML dans la fenêtre
        printWindow.document.write(htmlContent);
        printWindow.document.close();

        // Déclencher le callback onBeforePrint
        if (options.onBeforePrint) {
          options.onBeforePrint();
        }

        // Attendre que le contenu soit chargé avant d'imprimer
        printWindow.onload = () => {
          try {
            // Impression automatique
            printWindow.print();

            // Déclencher le callback onAfterPrint
            if (options.onAfterPrint) {
              options.onAfterPrint();
            }

            // Fermer la fenêtre après impression (optionnel)
            setTimeout(() => {
              printWindow.close();
            }, 100);
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'impression";
            setError(errorMsg);
            console.error("Print error:", err);
          }
        };

        // Gestion des erreurs de chargement
        printWindow.onerror = () => {
          const errorMsg = "Erreur lors du chargement du contenu à imprimer";
          setError(errorMsg);
          console.error(errorMsg);
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'impression";
        setError(errorMsg);
        console.error("Print error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [options]
  );

  const printComponent = useCallback(
    async (component: React.ReactElement) => {
      setIsLoading(true);
      setError(null);

      try {
        // Convertir le composant en HTML (nécessite un rendu serveur ou une bibliothèque comme ReactDOMServer)
        // Pour maintenant, utiliser une approche simple avec innerHTML
        const div = document.createElement("div");
        // Note: Vous aurez peut-être besoin d'utiliser ReactDOM.render() ou createRoot() ici
        // selon votre version de React

        // Alternative: utiliser un rendu côté serveur
        printHTML(div.innerHTML);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Erreur lors de l'impression";
        setError(errorMsg);
        console.error("Print error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [printHTML]
  );

  const printElement = useCallback(
    (element: HTMLElement | null) => {
      if (!element) {
        setError("Élément non trouvé");
        return;
      }

      const htmlContent = element.innerHTML;
      printHTML(htmlContent);
    },
    [printHTML]
  );

  const reset = useCallback(() => {
    setError(null);
    setIsLoading(false);
  }, []);

  return {
    printHTML,
    printComponent,
    printElement,
    isLoading,
    error,
    reset,
  };
};
