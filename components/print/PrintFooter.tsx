import React from "react";
import { PrintFooterProps } from "@/types/print";

const DEFAULT_COMPANY = {
  name: "KALLAL TECH COMPANY",
  address: "RTE ELAIN KM3, SFAXXXX",
  phone: "24 807 784",
};

export const PrintFooter: React.FC<PrintFooterProps> = ({
  format,
  companyName = DEFAULT_COMPANY.name,
  companyAddress = DEFAULT_COMPANY.address,
  companyPhone = DEFAULT_COMPANY.phone,
  customMessage,
}) => {
  const isTicket = format === "TICKET";

  return (
    <div className={`footer ${isTicket ? "ticket" : ""}`}>
      {customMessage ? (
        <div>{customMessage}</div>
      ) : (
        <>
          <div>
            {companyName} - {companyAddress} - Tél: {companyPhone}
          </div>
          {!isTicket && (
            <div style={{ marginTop: "10px", fontSize: "8px" }}>
              Document généré automatiquement le{" "}
              {new Date().toLocaleDateString("fr-TN")}
            </div>
          )}
        </>
      )}
    </div>
  );
};
