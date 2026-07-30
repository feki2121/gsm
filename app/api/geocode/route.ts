import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { adresse } = await req.json();
    
    if (!adresse) {
      return NextResponse.json({ error: 'Adresse requise' }, { status: 400 });
    }

    // Utiliser Nominatim (OpenStreetMap) - gratuit sans clé API
    const encodedAddress = encodeURIComponent(adresse);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'KTC-Application/1.0',
        },
      }
    );

    const data = await response.json();

    if (data && data.length > 0) {
      return NextResponse.json({
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        displayName: data[0].display_name,
      });
    }

    return NextResponse.json({ error: 'Adresse non trouvée' }, { status: 404 });
  } catch (error) {
    console.error('Geocoding error:', error);
    return NextResponse.json(
      { error: 'Erreur de géocodage' },
      { status: 500 }
    );
  }
}