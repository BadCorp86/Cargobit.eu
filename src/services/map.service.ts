/**
 * CargoBit Map Service
 * 
 * HERE Maps Integration for:
 * - Route calculation
 * - Distance estimation
 * - Geocoding (address to coordinates)
 * - Reverse geocoding (coordinates to address)
 * - Toll cost estimation
 */

// ===========================================
// TYPES
// ===========================================
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Address {
  street: string;
  streetNumber?: string;
  postalCode: string;
  city: string;
  country: string;
  countryCode: string;
}

export interface RouteResult {
  distance: number;        // in km
  duration: number;        // in minutes
  tollCost: number;        // in EUR
  fuelCost: number;        // in EUR
  polyline?: string;       // Encoded polyline for map display
  transitCountries: string[];
  waypoints: Coordinates[];
}

export interface GeocodingResult {
  coordinates: Coordinates;
  formattedAddress: string;
  address: Address;
  confidence: number;      // 0-1
}

export interface TollInfo {
  country: string;
  system: string;
  cost: number;
  currency: string;
}

// ===========================================
// MAP SERVICE CLASS
// ===========================================
class MapService {
  private apiKey: string | undefined;
  private appId: string | undefined;
  private appCode: string | undefined;
  private enabled: boolean;

  private readonly BASE_URL = 'https://router.hereapi.com/v8';
  private readonly GEOCODE_URL = 'https://geocode.search.hereapi.com/v1';
  private readonly REVERSE_GEOCODE_URL = 'https://revgeocode.search.hereapi.com/v1';

  constructor() {
    this.apiKey = process.env.HERE_API_KEY;
    this.appId = process.env.HERE_APP_ID;
    this.appCode = process.env.HERE_APP_CODE;
    this.enabled = !!this.apiKey;

    if (!this.enabled) {
      console.warn('⚠️ HERE Maps API key not configured. Map features will be simulated.');
    }
  }

  // ===========================================
  // GEOCODING
  // ===========================================

  /**
   * Convert address to coordinates
   */
  async geocode(address: string): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      // Return mock coordinates for development
      return this.getMockGeocoding(address);
    }

    try {
      const url = new URL(`${this.GEOCODE_URL}/geocode`);
      url.searchParams.append('q', address);
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const item = data.items[0];
      const pos = item.position;

      return {
        coordinates: {
          lat: pos.lat,
          lng: pos.lng,
        },
        formattedAddress: item.address.label,
        address: {
          street: item.address.street || '',
          streetNumber: item.address.houseNumber || '',
          postalCode: item.address.postalCode || '',
          city: item.address.city,
          country: item.address.countryName,
          countryCode: item.address.countryCode,
        },
        confidence: item.scoring?.queryScore || 0.8,
      };
    } catch (error) {
      console.error('❌ Geocoding error:', error);
      return this.getMockGeocoding(address);
    }
  }

  /**
   * Convert coordinates to address
   */
  async reverseGeocode(coordinates: Coordinates): Promise<GeocodingResult | null> {
    if (!this.apiKey) {
      return {
        coordinates,
        formattedAddress: `${coordinates.lat.toFixed(4)}, ${coordinates.lng.toFixed(4)}`,
        address: {
          street: '',
          postalCode: '',
          city: '',
          country: '',
          countryCode: '',
        },
        confidence: 0.5,
      };
    }

    try {
      const url = new URL(`${this.REVERSE_GEOCODE_URL}/revgeocode`);
      url.searchParams.append('at', `${coordinates.lat},${coordinates.lng}`);
      url.searchParams.append('apiKey', this.apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        return null;
      }

      const item = data.items[0];

      return {
        coordinates,
        formattedAddress: item.address.label,
        address: {
          street: item.address.street || '',
          streetNumber: item.address.houseNumber || '',
          postalCode: item.address.postalCode || '',
          city: item.address.city,
          country: item.address.countryName,
          countryCode: item.address.countryCode,
        },
        confidence: 0.9,
      };
    } catch (error) {
      console.error('❌ Reverse geocoding error:', error);
      return null;
    }
  }

  // ===========================================
  // ROUTING
  // ===========================================

  /**
   * Calculate route between two points
   */
  async calculateRoute(
    origin: Coordinates | string,
    destination: Coordinates | string,
    waypoints?: (Coordinates | string)[],
    options?: {
      avoidTolls?: boolean;
      vehicleType?: 'truck' | 'car';
      hazmat?: boolean;
    }
  ): Promise<RouteResult | null> {
    // Resolve addresses to coordinates
    const originCoords = typeof origin === 'string' 
      ? (await this.geocode(origin))?.coordinates 
      : origin;
    const destCoords = typeof destination === 'string'
      ? (await this.geocode(destination))?.coordinates
      : destination;

    if (!originCoords || !destCoords) {
      return null;
    }

    if (!this.apiKey) {
      return this.getMockRoute(originCoords, destCoords);
    }

    try {
      const url = new URL(`${this.BASE_URL}/routes`);
      url.searchParams.append('transportMode', options?.vehicleType === 'truck' ? 'truck' : 'car');
      url.searchParams.append('origin', `${originCoords.lat},${originCoords.lng}`);
      url.searchParams.append('destination', `${destCoords.lat},${destCoords.lng}`);
      url.searchParams.append('return', 'polyline,summary,tolls,actions');
      url.searchParams.append('apiKey', this.apiKey);

      if (waypoints && waypoints.length > 0) {
        const viaPoints = waypoints.map(wp => {
          if (typeof wp === 'string') {
            return wp; // Will need geocoding
          }
          return `${wp.lat},${wp.lng}`;
        }).join(',');
        // url.searchParams.append('via', viaPoints);
      }

      if (options?.avoidTolls) {
        url.searchParams.append('tolls[pass]', 'none');
      }

      if (options?.vehicleType === 'truck') {
        url.searchParams.append('truck[height]', '4.0');
        url.searchParams.append('truck[weight]', '18.0');
      }

      const response = await fetch(url.toString());
      const data = await response.json();

      if (!data.routes || data.routes.length === 0) {
        return null;
      }

      const route = data.routes[0];
      const summary = route.sections[0]?.summary || {};
      const tolls = route.sections[0]?.tolls || [];

      // Calculate total toll cost
      let tollCost = 0;
      const transitCountries: string[] = [];

      for (const toll of tolls) {
        tollCost += toll.totalPrice?.value || 0;
        if (toll.country && !transitCountries.includes(toll.country)) {
          transitCountries.push(toll.country);
        }
      }

      return {
        distance: Math.round((summary.length || 0) / 1000), // km
        duration: Math.round((summary.duration || 0) / 60),  // minutes
        tollCost: Math.round(tollCost * 100) / 100,
        fuelCost: this.estimateFuelCost(summary.length || 0, options?.vehicleType === 'truck'),
        polyline: route.sections[0]?.polyline,
        transitCountries,
        waypoints: [originCoords, destCoords],
      };
    } catch (error) {
      console.error('❌ Route calculation error:', error);
      return this.getMockRoute(originCoords, destCoords);
    }
  }

  /**
   * Get toll information for a route
   */
  async getTollInfo(origin: Coordinates, destination: Coordinates): Promise<TollInfo[]> {
    const route = await this.calculateRoute(origin, destination);
    if (!route) return [];

    // Mock toll info for development
    const tollInfo: TollInfo[] = [
      { country: 'DE', system: 'Toll Collect', cost: route.distance * 0.15, currency: 'EUR' },
    ];

    if (route.transitCountries.includes('AT')) {
      tollInfo.push({ country: 'AT', system: 'ASFINAG', cost: route.distance * 0.22, currency: 'EUR' });
    }

    return tollInfo;
  }

  // ===========================================
  // UTILITY METHODS
  // ===========================================

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(coord2.lat - coord1.lat);
    const dLng = this.toRad(coord2.lng - coord1.lng);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(coord1.lat)) * Math.cos(this.toRad(coord2.lat)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  /**
   * Estimate fuel cost based on distance
   */
  estimateFuelCost(distanceMeters: number, isTruck: boolean = true): number {
    const distanceKm = distanceMeters / 1000;
    const fuelEfficiency = isTruck ? 30 : 8; // liters per 100km
    const fuelPrice = 1.80; // EUR per liter
    return Math.round(distanceKm * (fuelEfficiency / 100) * fuelPrice * 100) / 100;
  }

  /**
   * Check if route crosses international borders
   */
  isInternationalRoute(origin: Coordinates, destination: Coordinates): Promise<boolean> {
    return this.reverseGeocode(origin).then(o => {
      return this.reverseGeocode(destination).then(d => {
        return o?.address.countryCode !== d?.address.countryCode;
      });
    });
  }

  // ===========================================
  // MOCK DATA FOR DEVELOPMENT
  // ===========================================

  private getMockGeocoding(address: string): GeocodingResult {
    // Simple mock based on city name
    const cityCoords: Record<string, Coordinates> = {
      'berlin': { lat: 52.5219, lng: 13.4132 },
      'hamburg': { lat: 53.5526, lng: 9.9932 },
      'münchen': { lat: 48.1374, lng: 11.5755 },
      'wien': { lat: 48.2082, lng: 16.3738 },
      'zürich': { lat: 47.3769, lng: 8.5417 },
      'prag': { lat: 50.0755, lng: 14.4378 },
      'amsterdam': { lat: 52.3731, lng: 4.8922 },
      'paris': { lat: 48.8566, lng: 2.3522 },
    };

    const searchKey = address.toLowerCase();
    const coords = cityCoords[searchKey] || cityCoords['berlin'];

    return {
      coordinates: coords,
      formattedAddress: address,
      address: {
        street: '',
        postalCode: '',
        city: address,
        country: 'DE',
        countryCode: 'DE',
      },
      confidence: 0.8,
    };
  }

  private getMockRoute(origin: Coordinates, destination: Coordinates): RouteResult {
    const distance = this.calculateDistance(origin, destination);
    const avgSpeed = 60; // km/h for truck

    return {
      distance,
      duration: Math.round((distance / avgSpeed) * 60),
      tollCost: Math.round(distance * 0.15 * 100) / 100,
      fuelCost: this.estimateFuelCost(distance * 1000, true),
      transitCountries: [],
      waypoints: [origin, destination],
    };
  }
}

// Export singleton instance
export const mapService = new MapService();
export default mapService;
