import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// GET all addresses for a client
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    
    const addresses = await prisma.clientAddress.findMany({
      where: { clientId },
      orderBy: { estPrincipale: 'desc' },
    });

    return NextResponse.json({ data: addresses });
  } catch (error) {
    console.error('Error fetching client addresses:', error);
    return NextResponse.json(
      { error: 'Failed to fetch addresses' },
      { status: 500 }
    );
  }
}

// POST create address for client
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const body = await req.json();
    const { adresse, lieuDit, codePostal, ville, latitude, longitude, estPrincipale } = body;

    if (!adresse) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      );
    }

    // Si c'est l'adresse principale, retirer le flag des autres adresses
    if (estPrincipale) {
      await prisma.clientAddress.updateMany({
        where: { clientId, estPrincipale: true },
        data: { estPrincipale: false },
      });
    }

    const address = await prisma.clientAddress.create({
      data: {
        clientId,
        adresse,
        lieuDit: lieuDit || null,
        codePostal: codePostal || null,
        ville: ville || null,
        latitude: latitude || null,
        longitude: longitude || null,
        estPrincipale: estPrincipale || false,
      },
    });

    return NextResponse.json(address, { status: 201 });
  } catch (error) {
    console.error('Error creating address:', error);
    return NextResponse.json(
      { error: 'Failed to create address' },
      { status: 500 }
    );
  }
}

// PUT update address
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params;
    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get('addressId');
    const body = await req.json();
    const { adresse, lieuDit, codePostal, ville, latitude, longitude, estPrincipale } = body;

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
    }

    // Si c'est l'adresse principale, retirer le flag des autres adresses
    if (estPrincipale) {
      await prisma.clientAddress.updateMany({
        where: { clientId, estPrincipale: true },
        data: { estPrincipale: false },
      });
    }

    const address = await prisma.clientAddress.update({
      where: { id: addressId },
      data: {
        adresse: adresse || undefined,
        lieuDit: lieuDit || null,
        codePostal: codePostal || null,
        ville: ville || null,
        latitude: latitude || null,
        longitude: longitude || null,
        estPrincipale: estPrincipale || false,
      },
    });

    return NextResponse.json(address);
  } catch (error) {
    console.error('Error updating address:', error);
    return NextResponse.json(
      { error: 'Failed to update address' },
      { status: 500 }
    );
  }
}

// DELETE address
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get('addressId');

    if (!addressId) {
      return NextResponse.json(
        { error: 'Address ID is required' },
        { status: 400 }
      );
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