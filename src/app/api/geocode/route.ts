import { NextRequest, NextResponse } from 'next/server';

// Nominatim API endpoint (OpenStreetMap - free)
const NOMINATIM_API = 'https://nominatim.openstreetmap.org';

// Cache for geocoding results (in-memory, 1 hour TTL)
const geocodeCache = new Map<string, { data: any; expiresAt: number }>();

interface GeocodeResult {
  place_id: string;
  licence: string;
  osm_type: string;
  osm_id: string;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    house_number?: string;
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
  boundingbox?: [string, string, string, string];
  type?: string;
  importance?: number;
}

// GET - Search for addresses
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = parseInt(searchParams.get('limit') || '5');
    const countrycodes = searchParams.get('countrycodes') || 'de,at,ch,pl,nl,be,fr,cz,it,es';
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');

    // Reverse geocoding (lat/lng to address)
    if (lat && lng) {
      return handleReverseGeocode(parseFloat(lat), parseFloat(lng));
    }

    // Forward geocoding (address to lat/lng)
    if (!query || query.length < 3) {
      return NextResponse.json({ results: [] });
    }

    // Check cache
    const cacheKey = `search:${query}:${countrycodes}:${limit}`;
    const cached = geocodeCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json(cached.data);
    }

    // Call Nominatim API
    const url = new URL(`${NOMINATIM_API}/search`);
    url.searchParams.set('q', query);
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');
    url.searchParams.set('limit', limit.toString());
    url.searchParams.set('countrycodes', countrycodes);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CargoBit/1.0 (contact@cargobit.eu)',
        'Accept-Language': 'de',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const results: GeocodeResult[] = await response.json();

    // Transform results
    const transformedResults = results.map((result) => ({
      placeId: result.place_id,
      lat: parseFloat(result.lat),
      lng: parseFloat(result.lon),
      displayName: result.display_name,
      shortName: formatShortName(result),
      address: {
        street: result.address.road || result.address.house_number ? `${result.address.house_number || ''} ${result.address.road || ''}`.trim() : undefined,
        city: result.address.city || result.address.town || result.address.village || result.address.municipality,
        postcode: result.address.postcode,
        state: result.address.state,
        country: result.address.country,
        countryCode: result.address.country_code?.toUpperCase(),
      },
      type: result.type,
      importance: result.importance,
    }));

    const responseData = { results: transformedResults };

    // Cache for 1 hour
    geocodeCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + 3600000,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Geocode error:', error);
    return NextResponse.json(
      { error: 'Geocoding failed', results: [] },
      { status: 500 }
    );
  }
}

// Reverse geocoding handler
async function handleReverseGeocode(lat: number, lng: number) {
  // Check cache
  const cacheKey = `reverse:${lat}:${lng}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const url = new URL(`${NOMINATIM_API}/reverse`);
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('format', 'json');
    url.searchParams.set('addressdetails', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'CargoBit/1.0 (contact@cargobit.eu)',
        'Accept-Language': 'de',
      },
    });

    if (!response.ok) {
      throw new Error(`Nominatim API error: ${response.status}`);
    }

    const result: GeocodeResult = await response.json();

    const responseData = {
      lat,
      lng,
      displayName: result.display_name,
      shortName: formatShortName(result),
      address: {
        street: result.address?.road || result.address?.house_number ?
          `${result.address.house_number || ''} ${result.address.road || ''}`.trim() : undefined,
        city: result.address?.city || result.address?.town || result.address?.village || result.address?.municipality,
        postcode: result.address?.postcode,
        state: result.address?.state,
        country: result.address?.country,
        countryCode: result.address?.country_code?.toUpperCase(),
      },
    };

    // Cache for 1 hour
    geocodeCache.set(cacheKey, {
      data: responseData,
      expiresAt: Date.now() + 3600000,
    });

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Reverse geocode error:', error);
    return NextResponse.json(
      { error: 'Reverse geocoding failed' },
      { status: 500 }
    );
  }
}

// Format short name for display
function formatShortName(result: GeocodeResult): string {
  const parts: string[] = [];

  // Add city
  const city = result.address?.city || result.address?.town || result.address?.village || result.address?.municipality;
  if (city) {
    parts.push(city);
  }

  // Add postcode
  if (result.address?.postcode) {
    parts.push(result.address.postcode);
  }

  // Add country
  if (result.address?.country) {
    parts.push(result.address.country);
  }

  return parts.join(', ') || result.display_name.split(',')[0];
}

// POST - Batch geocode multiple addresses
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { addresses } = body;

    if (!Array.isArray(addresses) || addresses.length === 0) {
      return NextResponse.json({ error: 'Addresses array required' }, { status: 400 });
    }

    if (addresses.length > 10) {
      return NextResponse.json({ error: 'Maximum 10 addresses per batch' }, { status: 400 });
    }

    const results = await Promise.all(
      addresses.map(async (addr: string) => {
        const url = new URL(`${NOMINATIM_API}/search`);
        url.searchParams.set('q', addr);
        url.searchParams.set('format', 'json');
        url.searchParams.set('addressdetails', '1');
        url.searchParams.set('limit', '1');

        try {
          const response = await fetch(url.toString(), {
            headers: {
              'User-Agent': 'CargoBit/1.0 (contact@cargobit.eu)',
              'Accept-Language': 'de',
            },
          });

          const data = await response.json();
          const first = data[0];

          return {
            query: addr,
            found: !!first,
            lat: first ? parseFloat(first.lat) : null,
            lng: first ? parseFloat(first.lon) : null,
            displayName: first?.display_name || null,
          };
        } catch (error) {
          return {
            query: addr,
            found: false,
            error: 'Geocoding failed',
          };
        }
      })
    );

    return NextResponse.json({ results });

  } catch (error) {
    console.error('Batch geocode error:', error);
    return NextResponse.json(
      { error: 'Batch geocoding failed' },
      { status: 500 }
    );
  }
}
