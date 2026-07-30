// components/print/templates/CatalogueTemplate.tsx
import React from "react";
import { formatCurrency } from "@/lib/types";

interface CatalogueProduct {
  id: string;
  reference: string;
  code: string;
  designation: string;
  prixVente: number;
  imageUrl?: string;
  quantiteStock: number;
  category: {
    nom: string;
  };
}

interface CatalogueTemplateProps {
  products: CatalogueProduct[];
  title?: string;
  date?: string;
  companyInfo?: {
    name: string;
    address: string;
    phone: string;
    email: string;
    vat: string;
  };
}

const DEFAULT_COMPANY = {
  name: "KALLAL TECH COMPANY",
  address: "01. Teniour chihia 3000 - SFAX",
  phone: " 25 535 035",
  email: "kallel@gmail.com",
  vat: "1860077 Q/A/M/000",
};


// Styles pour le catalogue
const catalogueStyles = `
  @page {
    size: A4;
    margin: 1cm;
  }
  
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  .catalogue-container {
    font-family: 'Arial', sans-serif;
    max-width: 210mm;
    margin: 0 auto;
    background: white;
    padding: 10px;
    position: relative;
  }
  
  /* En-tête avec 3 colonnes */
  .catalogue-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 25px;
    padding-bottom: 15px;
    border-bottom: 2px solid #333;
  }
  
  .header-left {
    flex: 1;
    text-align: left;
  }
  
  .logo-img {
    max-width: 70px;
    height: auto;
  }
  
  .header-center {
    flex: 2;
    text-align: center;
  }
  
  .catalogue-title {
    font-size: 20px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #1a1a1a;
  }
  
  .catalogue-subtitle {
    font-size: 11px;
    color: #e74c3c;
    font-weight: bold;
    margin-top: 5px;
  }
  
  .header-right {
    flex: 1;
    text-align: right;
    font-size: 9px;
    color: #555;
    line-height: 1.4;
  }
  
  .header-right p {
    margin: 2px 0;
  }
  
  .header-right strong {
    font-size: 10px;
  }
  
  .catalogue-date {
    text-align: right;
    font-size: 10px;
    color: #666;
    margin-bottom: 15px;
  }
  
  .category-section {
    margin-bottom: 30px;
    page-break-inside: avoid;
  }
  
  .category-title {
    font-size: 16px;
    font-weight: bold;
    background: #f0f0f0;
    padding: 8px 12px;
    margin-bottom: 15px;
    border-left: 4px solid #333;
    page-break-after: avoid;
  }
  
  .products-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 15px;
    page-break-inside: avoid;
  }
  
  .product-card {
    border: 1px solid #e0e0e0;
    border-radius: 6px;
    padding: 10px;
    transition: all 0.3s ease;
    page-break-inside: avoid;
    background: white;
  }
  
  .product-image {
    width: 100%;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f9f9f9;
    border-radius: 4px;
    margin-bottom: 8px;
    overflow: hidden;
  }
  
  .product-image img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
  }
  
  .product-image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f5f5;
    color: #999;
    font-size: 30px;
  }
  
  .product-designation {
    font-size: 11px;
    font-weight: bold;
    color: #1a1a1a;
    margin-bottom: 5px;
    line-height: 1.3;
    min-height: 28px;
  }
  
  .product-reference {
    font-size: 9px;
    color: #888;
    margin-bottom: 6px;
    font-family: monospace;
  }
  
  .product-price {
    font-size: 14px;
    font-weight: bold;
    color: #2c5f2d;
    margin: 6px 0;
  }
  
  .product-price-label {
    font-size: 8px;
    color: #666;
    font-weight: normal;
  }
  
  .product-stock {
    font-size: 9px;
    color: #666;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed #e0e0e0;
  }
  
  .product-stock-value {
    font-weight: bold;
    color: #2980b9;
  }
  
  .total-products {
    text-align: center;
    font-size: 11px;
    color: #555;
    margin: 15px 0;
    font-weight: bold;
  }
  
  /* Pied de page */
  .catalogue-footer {
    position: running(footer);
    text-align: center;
    font-size: 8px;
    color: #888;
    margin-top: 30px;
    padding-top: 12px;
    border-top: 1px solid #e0e0e0;
  }
  
  .footer-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  }
  
  .footer-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .footer-logo-img {
    max-width: 30px;
    height: auto;
  }
  
  .footer-logo-text {
    font-size: 8px;
    font-weight: bold;
    color: #555;
  }
  
  .footer-address {
    text-align: center;
    font-size: 8px;
  }
  
  .footer-right {
    text-align: right;
    font-size: 8px;
  }
  
  @media print {
    .product-card {
      break-inside: avoid;
    }
    .category-section {
      break-inside: avoid;
    }
    .products-grid {
      break-inside: avoid;
    }
    
    /* Fixer le pied de page sur chaque page */
    .catalogue-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: white;
      padding: 10px;
    }
  }
`;

export const CatalogueTemplate: React.FC<CatalogueTemplateProps> = ({
  products,
  title = "LISTE DE PRIX",
  date,
  companyInfo = DEFAULT_COMPANY,
}) => {
  const formattedDate = date || new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  // Grouper les produits par catégorie
  const productsByCategory = products.reduce((acc, product) => {
    const categoryName = product.category?.nom || "AUTRES PRODUITS";
    if (!acc[categoryName]) {
      acc[categoryName] = [];
    }
    acc[categoryName].push(product);
    return acc;
  }, {} as Record<string, CatalogueProduct[]>);

  const totalProducts = products.length;

  return (
    <div className="catalogue-container">
      <style>{catalogueStyles}</style>
      
      {/* En-tête avec 3 colonnes */}
      <div className="catalogue-header">
        {/* Colonne gauche - Logo */}
        <div className="header-left">
          <img
            src="/ktc.png"
            alt="Logo SIT"
            className="logo-img"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
        
        {/* Colonne centre - Titre */}
        <div className="header-center">
          <div className="catalogue-title">
            {title}
          </div>
          <div className="catalogue-subtitle">
            NOUVEL ARRIVAGE
          </div>
        </div>
        
        {/* Colonne droite - Adresse société */}
        <div className="header-right">
          <p><strong>{companyInfo.name}</strong></p>
          <p>{companyInfo.address}</p>
          <p>Tel: {companyInfo.phone}</p>
        </div>
      </div>
      
      <div className="catalogue-date">
        {formattedDate}
      </div>
      
      <div className="total-products">
        {totalProducts} produit(s) en stock
      </div>
      
      {/* Liste des produits par catégorie */}
      {Object.entries(productsByCategory).map(([categoryName, categoryProducts]) => (
        <div key={categoryName} className="category-section">
          <div className="category-title">
            {categoryName.toUpperCase()}
          </div>
          <div className="products-grid">
            {categoryProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.designation}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="product-image-placeholder" style={{ display: product.imageUrl ? 'none' : 'flex' }}>
                    📦
                  </div>
                </div>
                <div className="product-designation">
                  {product.designation.length > 40 
                    ? product.designation.substring(0, 37) + "..." 
                    : product.designation}
                </div>
                <div className="product-reference">
                  Réf: {product.reference}
                </div>
                <div className="product-price">
                  {formatCurrency(product.prixVente)}
                  <span className="product-price-label"> </span>
                </div>
                {/* <div className="product-stock">
                  Stock: <span className="product-stock-value">{product.quantiteStock}</span> unités
                </div> */}
              </div>
            ))}
          </div>
        </div>
      ))}
      
      {/* Pied de page avec logo et adresse */}
      <div className="catalogue-footer">
        <div className="footer-content">
          <div className="footer-logo">
            <img
              src="/ktc.png"
              alt="Logo SIT"
              className="footer-logo-img"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
          <div className="footer-address">
            {companyInfo.name} - {companyInfo.address}
            <br />
            Tel: {companyInfo.phone}
          </div>
          <div className="footer-right">
            Page <span className="page-number"></span>
          </div>
        </div>
      </div>
    </div>
  );
};