import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// POST - Ajouter une adresse
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { adresse, lieuDit, codePostal, ville, latitude, longitude, estPrincipale } = body;

    // Si cette adresse est définie comme principale, désactiver les autres
    if (estPrincipale) {
      await prisma.clientAddress.updateMany({
        where: { clientId: id },
        data: { estPrincipale: false },
      });
    }

    const newAddress = await prisma.clientAddress.create({
      data: {
        clientId: id,
        adresse,
        lieuDit: lieuDit || null,
        codePostal: codePostal || null,
        ville: ville || null,
        latitude: latitude || null,
        longitude: longitude || null,
        estPrincipale: estPrincipale || false,
      },
    });

    return NextResponse.json(newAddress, { status: 201 });
  } catch (error) {
    console.error('Error adding address:', error);
    return NextResponse.json(
      { error: 'Failed to add address' },
      { status: 500 }
    );
  }
}

// PUT - Modifier une adresse
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const addressId = searchParams.get('addressId');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { adresse, lieuDit, codePostal, ville, latitude, longitude, estPrincipale } = body;

    // Si cette adresse est définie comme principale, désactiver les autres
    if (estPrincipale) {
      await prisma.clientAddress.updateMany({
        where: { clientId },
        data: { estPrincipale: false },
      });
    }

    const updatedAddress = await prisma.clientAddress.update({
      where: { id: addressId },
      data: {
        adresse: adresse !== undefined ? adresse : undefined,
        lieuDit: lieuDit !== undefined ? (lieuDit || null) : undefined,
        codePostal: codePostal !== undefined ? (codePostal || null) : undefined,
        ville: ville !== undefined ? (ville || null) : undefined,
        latitude: latitude !== undefined ? (latitude || null) : undefined,
        longitude: longitude !== undefined ? (longitude || null) : undefined,
        estPrincipale: estPrincipale !== undefined ? estPrincipale : undefined,
      },
    });

    return NextResponse.json(updatedAddress);
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une adresse
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const searchParams = req.nextUrl.searchParams;
    const addressId = searchParams.get('addressId');
    
    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Vérifier que l'adresse appartient bien au client
    const address = await prisma.clientAddress.findFirst({
      where: {
        id: addressId,
        clientId,
      },
    });

    if (!address) {
      return NextResponse.json(
        { error: 'Address not found' },
        { status: 404 }
      );
    }

    // Si c'était l'adresse principale, définir une autre comme principale
    if (address.estPrincipale) {
      const anotherAddress = await prisma.clientAddress.findFirst({
        where: { clientId, id: { not: addressId } },
      });
      
      if (anotherAddress) {
        await prisma.clientAddress.update({
          where: { id: anotherAddress.id },
          data: { estPrincipale: true },
        });
      }
    }

    await prisma.clientAddress.delete({
      where: { id: addressId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting address:', error);
    return NextResponse.json(
      { error: 'Failed to delete address' },
      { status: 500 }
    );
  }
}