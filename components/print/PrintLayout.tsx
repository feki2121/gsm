import React from "react";
import { PrintLayoutProps } from "@/types/print";
import { combinePrintStyles } from "./printStyles";

export const PrintLayout: React.FC<PrintLayoutProps> = ({
  format = "A4",
  children,
  companyName,
  companyAddress,
  companyPhone,
  companyVAT,
}) => {
  return (
    <html>
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>{combinePrintStyles(format)}</style>
      </head>
      <body>
        <div className="page">
          {children}
        </div>
        {/* <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onload = () => {
                window.print();
              };
            `,
          }}
        /> */}
      </body>
    </html>
  );
};
