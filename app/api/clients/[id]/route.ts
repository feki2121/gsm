import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET client by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: { estPrincipale: 'desc' },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    const mainAddress = client.addresses.find((addr: { estPrincipale: boolean }) => addr.estPrincipale) || client.addresses[0];
    
    return NextResponse.json({
      ...client,
      adresse: mainAddress?.adresse || null,
      lieuDit: mainAddress?.lieuDit || null,
      codePostal: mainAddress?.codePostal || null,
      ville: mainAddress?.ville || null,
      latitude: mainAddress?.latitude || null,
      longitude: mainAddress?.longitude || null,
    });
  } catch (error) {
    console.error('Error fetching client:', error);
    return NextResponse.json(
      { error: 'Failed to fetch client' },
      { status: 500 }
    );
  }
}
 
// PUT update client
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { 
      nom, 
      telephone, 
      email, 
      solde,
      cin,
      mf,
      adresse,
      lieuDit,
      codePostal,
      ville,
      latitude,
      longitude 
    } = body;

    // Mettre à jour le client
    const client = await prisma.client.update({
      where: { id },
      data: {
        nom,
        telephone,
        email: email || null,
        solde: solde || 0,
        cin: cin || null,
        mf: mf || null,
      },
    });

    // Gérer l'adresse (upsert = update ou create)
    if (adresse || lieuDit || codePostal || ville || latitude || longitude) {
      // Vérifier si une adresse principale existe déjà
      const existingAddress = await prisma.clientAddress.findFirst({
        where: {
          clientId: id,
          estPrincipale: true,
        },
      });

      if (existingAddress) {
        // Mettre à jour l'adresse existante
        await prisma.clientAddress.update({
          where: { id: existingAddress.id },
          data: {
            adresse: adresse || null,
            lieuDit: lieuDit || null,
            codePostal: codePostal || null,
            ville: ville || null,
            latitude: latitude || null,
            longitude: longitude || null,
          },
        });
      } else if (adresse || lieuDit || codePostal || ville) {
        // Créer une nouvelle adresse principale
        await prisma.clientAddress.create({
          data: {
            clientId: id,
            adresse: adresse || null,
            lieuDit: lieuDit || null,
            codePostal: codePostal || null,
            ville: ville || null,
            latitude: latitude || null,
            longitude: longitude || null,
            estPrincipale: true,
          },
        });
      }
    }

    // Récupérer le client mis à jour avec son adresse
    const updatedClient = await prisma.client.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: { estPrincipale: 'desc' },
        },
      },
    });

    const mainAddress = updatedClient?.addresses.find((addr: { estPrincipale: boolean }) => addr.estPrincipale) || updatedClient?.addresses[0];

    return NextResponse.json({
      ...updatedClient,
      adresse: mainAddress?.adresse || null,
      lieuDit: mainAddress?.lieuDit || null,
      codePostal: mainAddress?.codePostal || null,
      ville: mainAddress?.ville || null,
      latitude: mainAddress?.latitude || null,
      longitude: mainAddress?.longitude || null,
    });
  } catch (error) {
    console.error('Error updating client:', error);
    return NextResponse.json(
      { error: 'Failed to update client' },
      { status: 500 }
    );
  }
}

// DELETE client
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    await prisma.$transaction(async (tx: any) => {
      // Supprimer d'abord les adresses
      await tx.clientAddress.deleteMany({
        where: { clientId: id },
      });
      
      // Puis supprimer le client
      await tx.client.delete({
        where: { id },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }
}