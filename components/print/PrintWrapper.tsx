"use client";

import React, { useEffect, useRef } from "react";
import { PrintFormat } from "@/types/print";
import { PrintLayout } from "./PrintLayout";
import ReactDOMServer from "react-dom/server";

interface PrintWrapperProps {
  template: React.ReactElement;
  format?: PrintFormat;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

/**
 * Composant wrapper qui génère et affiche le HTML d'impression
 * Utilise une iframe cachée pour éviter l'ouverture d'une nouvelle fenêtre
 */
export const PrintWrapper: React.FC<PrintWrapperProps> = ({
  template,
  format = "A4",
  onError,
  onSuccess,
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    try {
      // Créer une iframe cachée
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);
      iframeRef.current = iframe;

      // Convertir le template React en HTML string
      const htmlContent = ReactDOMServer.renderToStaticMarkup(
        <PrintLayout format={format}>
          {template}
        </PrintLayout>
      );

      // Écrire le contenu dans l'iframe
      const iframeDoc = iframe.contentWindow?.document;
      if (iframeDoc) {
        iframeDoc.open();
        iframeDoc.write(htmlContent);
        iframeDoc.close();

        // Déclencher l'impression
        iframe.onload = () => {
          iframe.contentWindow?.print();
          onSuccess?.();
          
          // Supprimer l'iframe après l'impression
          setTimeout(() => {
            if (iframe.parentNode) {
              iframe.parentNode.removeChild(iframe);
            }
          }, 1000);
        };
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Erreur lors de l'impression";
      console.error("Print error:", error);
      onError?.(errorMsg);
    }

    // Cleanup
    return () => {
      if (iframeRef.current && iframeRef.current.parentNode) {
        iframeRef.current.parentNode.removeChild(iframeRef.current);
      }
    };
  }, [template, format, onError, onSuccess]);

  return null;
};