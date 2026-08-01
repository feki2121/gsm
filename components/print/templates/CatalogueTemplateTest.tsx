// components/print/templates/CatalogueTemplateTest.tsx
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

interface CatalogueTemplateTestProps {
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
  useBackground?: boolean;
  backgroundImage?: string;
  backgroundOpacity?: number;
}

const DEFAULT_COMPANY = {
  name: "CHIHA GSM",
  address: "RTE ELAIN KM3, SFAX",
  phone: "24 807 784",
  email: "chihagsm@gmail.com",
  vat: "1677720 S/A/C/000",
};

const COLUMNS_PER_ROW = 4;

// ============================================================================
// CONSTANTES DE PAGINATION
// ----------------------------------------------------------------------------
// Ces valeurs sont des estimations de hauteur (en px) utilisées pour décider
// combien de lignes de produits tiennent sur une page avant de passer à la
// suivante. Elles doivent rester cohérentes avec les tailles réelles définies
// dans le CSS plus bas (product-card, catalogue-section-header, etc.).
//
// IMPORTANT : la désignation produit est bornée à EXACTEMENT 2 lignes grâce à
// `-webkit-line-clamp` (voir .product-designation). C'est ce qui rend la
// hauteur de carte réellement constante et donc la pagination fiable — avant,
// une désignation longue pouvait pousser une carte sur 3 lignes et décaler
// tout le reste de la page jusqu'à chevaucher le pied de page.
// ============================================================================
const PAGE_CONTENT_BUDGET_PX = 1100;
const CATEGORY_HEADER_HEIGHT_PX = 46;
const PRODUCT_ROW_HEIGHT_PX = 302; // carte ~286px (image 160px, cover) + gap 12px + marge de sécurité
const SEGMENT_BOTTOM_MARGIN_PX = 16;

// Un "segment" = un bloc de produits d'une même catégorie sur une page donnée
interface CategorySegment {
  categoryName: string;
  products: CatalogueProduct[];
  isFirstPageOfCategory: boolean; // true = début de la catégorie
  isLastPageOfCategory: boolean; // true = fin de la catégorie
}

// Une page = une liste de segments (1 ou plusieurs catégories dessus)
type CataloguePage = CategorySegment[];

export const CatalogueTemplateTest: React.FC<CatalogueTemplateTestProps> = ({
  products,
  title = "CATALOGUE DES PRODUITS",
  date,
  companyInfo = DEFAULT_COMPANY,
  useBackground = true,
  backgroundImage = "/catalogue/catalogue.jpg",
  backgroundOpacity = 0,
}) => {
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

  // Fonction pour distribuer intelligemment les produits sur les pages.
  // Une page ne change QUE lorsqu'il n'y a plus assez de place estimée,
  // pas systématiquement à chaque nouvelle catégorie.
  const distributeProductsOnPages = (): CataloguePage[] => {
    const pages: CataloguePage[] = [];
    let currentPage: CategorySegment[] = [];
    let remainingHeight = PAGE_CONTENT_BUDGET_PX;

    Object.entries(productsByCategory).forEach(([categoryName, categoryProducts]) => {
      let processed = 0;
      let isFirstSegmentOfCategory = true;

      while (processed < categoryProducts.length) {
        const minRequiredHeight =
          CATEGORY_HEADER_HEIGHT_PX + PRODUCT_ROW_HEIGHT_PX + SEGMENT_BOTTOM_MARGIN_PX;

        if (remainingHeight < minRequiredHeight) {
          pages.push(currentPage);
          currentPage = [];
          remainingHeight = PAGE_CONTENT_BUDGET_PX;
          continue;
        }

        const availableForRows =
          remainingHeight - CATEGORY_HEADER_HEIGHT_PX - SEGMENT_BOTTOM_MARGIN_PX;
        const maxRowsFit = Math.max(1, Math.floor(availableForRows / PRODUCT_ROW_HEIGHT_PX));
        const maxItemsFit = maxRowsFit * COLUMNS_PER_ROW;

        const toTake = Math.min(maxItemsFit, categoryProducts.length - processed);
        const rowsUsed = Math.ceil(toTake / COLUMNS_PER_ROW);
        const segmentHeight =
          CATEGORY_HEADER_HEIGHT_PX + rowsUsed * PRODUCT_ROW_HEIGHT_PX + SEGMENT_BOTTOM_MARGIN_PX;

        const segmentProducts = categoryProducts.slice(processed, processed + toTake);
        processed += toTake;

        currentPage.push({
          categoryName,
          products: segmentProducts,
          isFirstPageOfCategory: isFirstSegmentOfCategory,
          isLastPageOfCategory: processed === categoryProducts.length,
        });

        remainingHeight -= segmentHeight;
        isFirstSegmentOfCategory = false;
      }
    });

    if (currentPage.length > 0) {
      pages.push(currentPage);
    }

    return pages;
  };

  const cataloguePages = distributeProductsOnPages();

  const catalogueStyles = `
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    .catalogue-wrapper {
      --ink: #101828;
      --slate: #667085;
      --slate-light: #98A2B3;
      --line: #E4E7EC;
      --navy: #1D3557;
      --navy-light: #eef2f7;
      --emerald: #0F7A4E;
      --emerald-light: #E7F5EE;
      --surface: #FFFFFF;
      --paper-tile: #F4F5F7;
    }

    /* Styles d'impression - IMPORTANT */
    @media print {
      html, body {
        margin: 0;
        padding: 0;
        background: #ffffff;
        width: 100%;
        height: 100%;
      }

      .catalogue-wrapper {
        display: block;
        width: 100%;
        max-width: 210mm;
        margin: 0 auto;
        background: #ffffff;
      }

      .catalogue-page {
        page-break-after: always;
        page-break-inside: avoid;
        width: 210mm;
        height: 297mm;
        min-height: 297mm;
        position: relative;
        background: #ffffff;
        overflow: hidden;
        margin: 0 auto;
        padding: 0;
      }

      .catalogue-page:last-child {
        page-break-after: auto;
      }

      .catalogue-background-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 0;
        overflow: hidden;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      .catalogue-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-size: 100% 100%;
        background-position: center;
        background-repeat: no-repeat;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }

    /* Styles d'écran */
    .catalogue-wrapper {
      display: block;
      width: 100%;
      max-width: 210mm;
      margin: 0 auto;
      background: #ffffff;
      font-family: 'Inter', 'Arial', sans-serif;
    }

    .catalogue-page {
      width: 210mm;
      min-height: 297mm;
      height: 297mm;
      position: relative;
      background: #ffffff;
      overflow: hidden;
      margin: 0 auto 20px auto;
      box-shadow: 0 2px 16px rgba(16, 24, 40, 0.10);
      border-radius: 4px;
    }

    .catalogue-page:last-child {
      margin-bottom: 0;
    }

    .catalogue-background-container {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      overflow: hidden;
    }

    .catalogue-background {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-size: 100% 100%;
      background-position: center;
      background-repeat: no-repeat;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      transform: translateZ(0);
      backface-visibility: hidden;
    }

    .catalogue-background-img-fallback {
      display: none;
    }

    .catalogue-container {
      font-family: 'Inter', 'Arial', sans-serif;
      max-width: 210mm;
      margin: 0 auto;
      background-color: rgba(255, 255, 255, ${useBackground ? backgroundOpacity : 1});
      padding: 40px 25px 25px 25px;
      position: relative;
      z-index: 1;
      min-height: 297mm;
      height: 100%;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      overflow: hidden; /* garde-fou : ne laisse jamais un dépassement toucher une autre page */
    }

    /* En-tête de page */
    .catalogue-page-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--line);
      flex-shrink: 0;
    }

    .catalogue-page-header .company-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      color: var(--navy);
      letter-spacing: 1.5px;
    }

    .catalogue-page-header .page-info {
      font-family: 'JetBrains Mono', monospace;
      font-size: 9px;
      color: var(--slate-light);
      font-weight: 500;
      letter-spacing: 0.3px;
    }

    .catalogue-top-spacer {
      height: 40px;
      flex-shrink: 0;
      margin-top: 30px !important;
    }

    .catalogue-date {
      text-align: right;
      font-size: 11px;
      color: var(--slate);
      margin-bottom: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding-right: 4px;
    }

    .total-products {
      text-align: center;
      font-size: 12px;
      color: var(--ink);
      margin: 6px 0 18px 0;
      font-weight: 500;
      letter-spacing: 0.5px;
      padding: 10px 0;
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      background: var(--paper-tile);
      flex-shrink: 0;
    }

    .total-products span {
      font-weight: 800;
      color: var(--emerald);
      font-size: 14px;
    }

    /* En-tête de catégorie : languette de couleur + libellé + compteur */
    .catalogue-section-header {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 8px 0 12px 0;
      flex-shrink: 0;
    }

    .catalogue-section-header .section-tab {
      width: 4px;
      height: 16px;
      background: var(--navy);
      border-radius: 2px;
      flex-shrink: 0;
    }

    .catalogue-section-header h2 {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 14px;
      font-weight: 600;
      color: var(--ink);
      text-transform: uppercase;
      letter-spacing: 1.2px;
      white-space: nowrap;
    }

    .catalogue-section-header .section-rule {
      flex: 1;
      height: 1px;
      background: var(--line);
    }

    .catalogue-section-header .category-page-info {
      font-family: 'Inter', sans-serif;
      font-size: 9.5px;
      color: var(--slate);
      font-weight: 600;
      background: var(--navy-light);
      padding: 3px 12px;
      border-radius: 20px;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .products-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      page-break-inside: avoid;
      align-content: start;
      margin-bottom: 16px;
    }

    /* Carte produit : hauteur FIXE (pas min-height) pour garantir que la
       pagination calculée corresponde exactement au rendu réel. */
    .product-card {
      background: var(--surface);
      border-radius: 10px;
      padding: 10px;
      page-break-inside: avoid;
      box-shadow: 0 1px 3px rgba(16, 24, 40, 0.05);
      border: 1px solid var(--line);
      display: flex;
      flex-direction: column;
      height: 286px;
      overflow: hidden; /* garde-fou supplémentaire contre tout débordement de texte */
    }

    /* Image produit agrandie, en plein cadre (cover) pour un rendu plus dense
       et professionnel : l'image remplit tout le conteneur, recadrée si besoin,
       plutôt que de flotter avec des marges vides autour. */
    .product-image {
      width: 100%;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--paper-tile);
      border-radius: 8px;
      margin-bottom: 8px;
      overflow: hidden;
      position: relative;
      flex-shrink: 0;
    }

    .product-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      image-rendering: -webkit-optimize-contrast;
    }

    .product-image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--paper-tile);
      color: var(--slate-light);
      font-size: 42px;
    }

    .product-category-badge {
      position: absolute;
      top: 7px;
      right: 7px;
      background: rgba(16, 24, 40, 0.6);
      color: #fff;
      font-family: 'Inter', sans-serif;
      font-size: 7px;
      padding: 2px 8px;
      border-radius: 10px;
      font-weight: 600;
      letter-spacing: 0.3px;
      backdrop-filter: blur(2px);
    }

    .product-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-height: 0; /* nécessaire pour que line-clamp fonctionne dans un flex column */
    }

    /* Désignation bornée à EXACTEMENT 2 lignes : c'est ce qui rend la hauteur
       de carte déterministe et empêche tout décalage de pagination. */
    .product-designation {
      font-family: 'Inter', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: var(--ink);
      margin-bottom: 5px;
      line-height: 1.3;
      letter-spacing: 0.1px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      height: 26px; /* 10px * 1.3 * 2 lignes */
      flex-shrink: 0;
    }

    .product-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .product-reference,
    .product-code {
      font-family: 'JetBrains Mono', monospace;
      font-size: 7.5px;
      color: var(--slate-light);
      letter-spacing: 0.2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .product-reference span,
    .product-code span {
      color: var(--slate);
      font-weight: 600;
    }

    /* Étiquette de prix : pastille "ticket" avec un petit trou perforé,
       clin d'oeil au format d'une véritable étiquette de prix physique */
    .product-price-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: auto;
      padding-top: 8px;
      border-top: 1px dashed var(--line);
      flex-shrink: 0;
    }

    .product-price-tag {
      position: relative;
      display: inline-flex;
      align-items: baseline;
      background: var(--emerald);
      color: #ffffff;
      padding: 4px 10px 4px 16px;
      border-radius: 999px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .product-price-tag::before {
      content: '';
      position: absolute;
      left: 6px;
      top: 50%;
      transform: translateY(-50%);
      width: 5px;
      height: 5px;
      background: var(--surface);
      border-radius: 50%;
    }

    .product-price {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 12px;
      font-weight: 700;
      line-height: 1;
      white-space: nowrap;
    }

    .product-price-label {
      font-family: 'Inter', sans-serif;
      font-size: 7px;
      color: var(--slate-light);
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .catalogue-footer {
      display: none;
    }

    /* Impression - Qualité maximale */
    @media print {
      .catalogue-wrapper {
        max-width: 100% !important;
        margin: 0 !important;
        background: #ffffff !important;
        box-shadow: none !important;
      }

      .catalogue-page {
        width: 210mm !important;
        height: 297mm !important;
        min-height: 297mm !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        page-break-inside: avoid !important;
        background: #ffffff !important;
      }

      .catalogue-page:last-child {
        page-break-after: auto !important;
      }

      .catalogue-container {
        padding: 30px 18px 18px 18px !important;
        height: 297mm !important;
        min-height: 297mm !important;
      }

      .product-card {
        break-inside: avoid !important;
        background: var(--surface) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        box-shadow: none !important;
        border-color: var(--line) !important;
        padding: 8px !important;
        height: 268px !important;
      }

      .product-image {
        height: 148px !important;
      }

      .product-image img {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important;
      }

      .products-grid {
        gap: 8px !important;
      }

      .catalogue-top-spacer {
        height: 30px !important;
        margin-top: 30px !important;

      }

      .catalogue-section-header {
        margin: 6px 0 8px 0 !important;
      }

      .catalogue-section-header h2 {
        font-size: 11.5px !important;
      }

      .product-designation {
        font-size: 8.5px !important;
        height: 22px !important;
      }

      .product-price {
        font-size: 10.5px !important;
      }

      .catalogue-page-header {
        margin-bottom: 8px !important;
        padding-bottom: 6px !important;
      }

      .catalogue-page-header .company-name {
        font-size: 10px !important;
      }

      .catalogue-page-header .page-info {
        font-size: 8px !important;
      }
    }

    /* Responsive */
    @media screen and (max-width: 800px) {
      .catalogue-page {
        width: 100%;
        height: auto;
        min-height: auto;
        margin: 10px auto;
        box-shadow: 0 2px 10px rgba(16, 24, 40, 0.1);
        border-radius: 4px;
      }

      .catalogue-container {
        overflow: visible;
      }

      .products-grid {
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
        height: auto;
      }

      .catalogue-container {
        padding: 25px 12px 15px 12px;
        min-height: auto;
        height: auto;
      }

      .catalogue-top-spacer {
        height: 30px;
        margin-top: 30px !important;
      }
    }

    @media screen and (max-width: 500px) {
      .products-grid {
        grid-template-columns: 1fr;
        gap: 12px;
      }
    }
  `;

  // Fonction pour rendre une page du catalogue (qui peut contenir plusieurs segments/catégories)
  const renderCataloguePage = (pageSegments: CataloguePage, index: number) => {
    return (
      <div key={`page-${index}`} className="catalogue-page">
        {useBackground && (
          <div className="catalogue-background-container">
            <div
              className="catalogue-background"
              style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: '100% 100%',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
              }}
            />
            <img
              src={backgroundImage}
              alt="Background"
              className="catalogue-background-img-fallback"
              loading="eager"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="catalogue-container">
          <div className="catalogue-top-spacer"></div>

          <div className="catalogue-page-header">
            <div className="company-name"></div>
            <div className="page-info">
            </div>
          </div>

          {pageSegments.map((segment, segIndex) => {
            const totalCategoryProducts = productsByCategory[segment.categoryName]?.length || 0;

            return (
              <React.Fragment key={`${segment.categoryName}-${segIndex}`}>
                <div className="catalogue-section-header">
                  <span className="section-tab" />
                  <h2>
                    {segment.isFirstPageOfCategory
                      ? segment.categoryName.toUpperCase()
                      : `${segment.categoryName.toUpperCase()} (suite)`}
                  </h2>
                  <span className="section-rule" />
                  <span className="category-page-info">
                    {segment.isFirstPageOfCategory
                      ? `${totalCategoryProducts} produits`
                      : `${segment.products.length} produits`}
                  </span>
                </div>

                <div className="products-grid">
                  {segment.products.map((product: CatalogueProduct) => (
                    <div key={product.id} className="product-card">
                      <div className="product-image">
                        {product.imageUrl ? (
                          <>
                            <img
                              src={product.imageUrl}
                              alt={product.designation}
                              decoding="async"  
                              crossOrigin="anonymous"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                const placeholder = (e.target as HTMLImageElement).parentElement?.querySelector('.product-image-placeholder');
                                if (placeholder) {
                                  (placeholder as HTMLElement).style.display = 'flex';
                                }
                              }}
                            />
                            <span className="product-category-badge">
                              {product.category?.nom || "PRODUIT"}
                            </span>
                          </>
                        ) : (
                          <div className="product-image-placeholder">📦</div>
                        )}
                      </div>
                      <div className="product-info">
                        {/* Pas de troncature manuelle par caractères : le CSS
                            line-clamp gère l'ellipse visuelle de façon fiable,
                            quelle que soit la longueur du texte. */}
                        <div className="product-designation">{product.designation}</div>
                        <div className="product-meta">
                          <div className="product-reference">
                            <span>Réf</span> {product.reference}
                          </div>
                          {product.code && (
                            <div className="product-code">
                              <span>Code</span> {product.code}
                            </div>
                          )}
                        </div>
                        <div className="product-price-container">
                          <span className="product-price-label">Prix TTC</span>
                          <div className="product-price-tag">
                            <span className="product-price">
                              {formatCurrency(product.prixVente)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="catalogue-wrapper">
      <style>{catalogueStyles}</style>
      {cataloguePages.map((pageSegments, index) => renderCataloguePage(pageSegments, index))}
    </div>
  );
};
