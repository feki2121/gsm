import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all products with pagination
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;
    const includeHistory = searchParams.get('includeHistory') === 'true';
    const includeStock = searchParams.get('includeStock') === 'true';

    // Construire l'objet include dynamiquement
    const include: any = {
      category: true,
      home: true,
    };

    if (includeStock) {
      include.stockLocations = {
        include: {
          home: true,
        },
      };
      // Inclure stockParType directement dans la requête principale
      include.stockParType = true;
    }

    if (includeHistory) {
      include.historiquePrix = {
        orderBy: { dateApplication: 'desc' },
        take: 1,
      };
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        skip,
        take: limit,
        include,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count(),
    ]);

    // Transformer les produits pour inclure le stock par type sous forme d'objet

    // Transformer les produits pour inclure le stock par type sous forme d'objet
    const productsWithExtra = products.map(product => {
      // Convertir stockParType de tableau vers objet
      const stockParTypeObj: Record<string, number> = {};
      if (product.stockParType && Array.isArray(product.stockParType)) {
        product.stockParType.forEach((item: any) => {
          stockParTypeObj[item.typeBE] = item.quantite;
        });
      }

      // Si includeHistory, ajouter les derniers prix
      const extraFields: any = {};
      if (includeHistory) {
        const historiquePrix = product.historiquePrix as any;
        extraFields.dernierPrixAchatTTC = historiquePrix?.[0]?.prixAchat || product.prixAchat;
        extraFields.dernierPrixAchatHT = historiquePrix?.[0]?.prixAchatHT || (product as any).prixAchatHT;
        extraFields.dernierPrixVente = historiquePrix?.[0]?.prixVente || product.prixVenteHT;
        extraFields.derniereDateAchat = historiquePrix?.[0]?.dateApplication || null;
      }

      return {
        ...product,
        stockParType: stockParTypeObj,
        ...extraFields,
      };
    });

    return NextResponse.json({
      data: productsWithExtra,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

// POST create product
// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json();
//     const {
//       reference,
//       code, // Nouveau champ optionnel
//       designation,
//       categoryId,
//       homeId,
//       prixAchat,
//       prixAchatHT,
//       prixVente,
//       tva,
//       quantiteStock,
//       seuilAlerte,
//     } = body;

//     if (!reference || !designation || !categoryId || !homeId) {
//       return NextResponse.json(
//         { error: 'Missing required fields' },
//         { status: 400 }
//       );
//     }

//     // Générer automatiquement le code si non fourni
//     let productCode = code;
//     if (!productCode) {
//       // Compter les produits existants cette année
//       const currentYear = new Date().getFullYear();
//       const count = await prisma.product.count({
//         where: {
//           code: {
//             startsWith: `${currentYear}-`,
//           },
//         },
//       });
//       // Format: 2026-0001
//       productCode = `${currentYear}-${String(count + 1).padStart(4, '0')}`;
//     }

//     const product = await prisma.$transaction(async (tx) => {
//       const createdProduct = await tx.product.create({
//         data: {
//           reference,
//           code: productCode, // Code auto-généré ou fourni
//           designation,
//           categoryId,
//           homeId,
//           prixAchat: prixAchat || 0,
//           prixAchatHT: prixAchatHT || 0,
//           prixVente: prixVente || 0,
//           tva: tva || 19,
//           quantiteStock: quantiteStock || 0,
//           seuilAlerte: seuilAlerte || 5,
//         },
//       });

//       if (quantiteStock && quantiteStock > 0) {
//         await tx.stockLocation.create({
//           data: {
//             productId: createdProduct.id,
//             homeId,
//             quantite: quantiteStock,
//           },
//         });
//       }

//       return await tx.product.findUnique({
//         where: { id: createdProduct.id },
//         include: {
//           category: true,
//           home: true,
//           stockLocations: {
//             include: {
//               home: true,
//             },
//           },
//           stockParType: true,
//         },
//       });
//     });

//     return NextResponse.json(product, { status: 201 });
//   } catch (error) {
//     console.error('Error creating product:', error);
//     return NextResponse.json(
//       { error: 'Failed to create product' },
//       { status: 500 }
//     );
//   }
// }


export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      reference,
      code,
      designation,
      categoryId,
      prixAchat,
      prixAchatHT,
      prixVente,
      tva,
      seuilAlerte,
      plafondRemise,
      imageUrl,
    } = body;

    // Validation des champs requis
    if (!reference || !designation || !categoryId) {
      return NextResponse.json(
        { error: 'Les champs référence, désignation et catégorie sont requis' },
        { status: 400 }
      );
    }

    // Vérifier si la référence existe déjà
    const existingReference = await prisma.product.findUnique({
      where: { reference }
    });

    if (existingReference) {
      return NextResponse.json(
        { error: 'Cette référence existe déjà' },
        { status: 400 }
      );
    }

    // Gérer le code produit (auto-génération si vide)
    let finalCode = code;
    if (!finalCode || finalCode.trim() === "") {
      const currentYear = new Date().getFullYear();

      // Trouver le dernier code utilisé pour l'année en cours
      const lastProduct = await prisma.product.findFirst({
        where: {
          code: {
            startsWith: `${currentYear}-`,
          },
        },
        orderBy: {
          code: 'desc',
        },
      });

      let nextNumber = 1;
      if (lastProduct && lastProduct.code) {
        const lastNumber = parseInt(lastProduct.code.split('-')[1]);
        if (!isNaN(lastNumber)) {
          nextNumber = lastNumber + 1;
        }
      }

      finalCode = `${currentYear}-${String(nextNumber).padStart(4, '0')}`;

      // Vérifier que le code généré n'existe pas déjà
      const codeExists = await prisma.product.findFirst({
        where: { code: finalCode }
      });

      if (codeExists) {
        // En cas de collision (rare), incrémenter encore
        let counter = 1;
        while (codeExists) {
          finalCode = `${currentYear}-${String(nextNumber + counter).padStart(4, '0')}`;
          const exists = await prisma.product.findFirst({
            where: { code: finalCode }
          });
          if (!exists) break;
          counter++;
        }
      }
    } else {
      // Vérifier que le code saisi n'existe pas déjà
      const existingCode = await prisma.product.findFirst({
        where: { code: finalCode }
      });

      if (existingCode) {
        return NextResponse.json(
          { error: 'Ce code produit existe déjà' },
          { status: 400 }
        );
      }
    }

    // Récupérer l'entrepôt principal
    const defaultHome = await prisma.home.findFirst({
      where: { nom: 'PRINCIPAL' }
    });

    if (!defaultHome) {
      return NextResponse.json(
        { error: 'Entrepôt principal non trouvé' },
        { status: 500 }
      );
    }

    // Créer le produit
    const product = await prisma.product.create({
      data: {
        reference,
        code: finalCode,
        designation,
        categoryId,
        homeId: defaultHome.id,
        prixAchat,
        prixAchatHT: prixAchatHT || 0,
        prixVente,
        tva: tva || 19,
        quantiteStock: 0,
        seuilAlerte: seuilAlerte || 5,
        plafondRemise: plafondRemise || 0,
        imageUrl: imageUrl || null,
      },
      include: {
        category: true,
        home: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}