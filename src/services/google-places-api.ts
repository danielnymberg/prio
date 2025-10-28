/**
 * Google Places API - Find restaurants, shops, and POIs
 *
 * API Documentation: https://developers.google.com/maps/documentation/places/web-service
 *
 * Used for:
 * - Nearby search (restaurants, cafes, stores near location)
 * - Text search (search by name or category)
 * - Place details (ratings, opening hours, photos)
 *
 * FREE: 5,000 requests/month
 * AFTER: $17 per 1,000 requests
 */

const API_BASE_URL = 'https://maps.googleapis.com/maps/api/place';

export interface GooglePlace {
  place_id: string;
  name: string;
  vicinity: string;          // Address
  rating?: number;           // 1.0-5.0
  user_ratings_total?: number;
  price_level?: number;      // 0-4 (0=free, 4=very expensive)
  opening_hours?: {
    open_now: boolean;
  };
  types: string[];           // ["restaurant", "food", "point_of_interest"]
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface NearbySearchParams {
  location: { lat: number; lng: number };
  radius: number;            // Meters (max 50,000)
  type?: string;             // "restaurant", "cafe", "grocery_store", etc
  keyword?: string;          // Additional search term
  openNow?: boolean;         // Only open now
  minPrice?: number;         // 0-4
  maxPrice?: number;         // 0-4
}

export interface TextSearchParams {
  query: string;             // "vegetarian restaurants in Stockholm"
  location?: { lat: number; lng: number };
  radius?: number;
}

/**
 * Nearby search - Find places near a location
 */
export async function nearbySearch(params: NearbySearchParams): Promise<GooglePlace[]> {
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';

  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      console.warn('⚠️ Not authenticated - returnerar mock data');
      return getMockPlaces(params);
    }

    const response = await fetch(`${BACKEND_URL}/api/google-places/nearby`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      throw new Error(`Google Places API error (${response.status})`);
    }

    const data = await response.json();

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
    }

    return data.results || [];
  } catch (error) {
    console.error('Google Places nearbySearch error:', error);
    console.warn('⚠️ Falling back to mock data');
    return getMockPlaces(params);
  }
}

/**
 * Text search - Search for places by text query
 */
export async function textSearch(params: TextSearchParams): Promise<GooglePlace[]> {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ VITE_GOOGLE_PLACES_API_KEY saknas - returnerar mock data');
    return getMockPlaces({ location: params.location || { lat: 59.3293, lng: 18.0686 }, radius: 1000 });
  }

  const queryParams = new URLSearchParams({
    key: apiKey,
    query: params.query,
  });

  if (params.location) {
    queryParams.set('location', `${params.location.lat},${params.location.lng}`);
  }
  if (params.radius) {
    queryParams.set('radius', String(params.radius));
  }

  const url = `${API_BASE_URL}/textsearch/json?${queryParams.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google Places API error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    throw new Error(`Google Places API error: ${data.status} - ${data.error_message || 'Unknown error'}`);
  }

  return data.results || [];
}

/**
 * Get photo URL from photo reference
 */
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return 'https://via.placeholder.com/400x300?text=No+API+Key';
  }

  return `${API_BASE_URL}/photo?maxwidth=${maxWidth}&photoreference=${photoReference}&key=${apiKey}`;
}

/**
 * Format places for human-readable output
 */
export function formatPlaces(places: GooglePlace[], maxResults: number = 5): string {
  if (places.length === 0) {
    return '❌ Inga platser hittades';
  }

  let output = `📍 Hittade ${places.length} platser:\n\n`;

  places.slice(0, maxResults).forEach((place, i) => {
    output += `${i + 1}. **${place.name}**\n`;
    output += `   📍 ${place.vicinity}\n`;

    if (place.rating) {
      const stars = '⭐'.repeat(Math.round(place.rating));
      output += `   ${stars} ${place.rating.toFixed(1)}`;
      if (place.user_ratings_total) {
        output += ` (${place.user_ratings_total} reviews)`;
      }
      output += '\n';
    }

    if (place.price_level !== undefined) {
      const priceSymbols = '💰'.repeat(place.price_level || 1);
      output += `   ${priceSymbols}\n`;
    }

    if (place.opening_hours) {
      output += `   ${place.opening_hours.open_now ? '🟢 Öppet nu' : '🔴 Stängt'}\n`;
    }

    if (i < Math.min(maxResults, places.length) - 1) {
      output += '\n';
    }
  });

  if (places.length > maxResults) {
    output += `\n... och ${places.length - maxResults} till`;
  }

  return output;
}

/**
 * Filter places by preferences (dietary restrictions, price, etc)
 */
export function filterByPreferences(
  places: GooglePlace[],
  preferences: {
    excludeKeywords?: string[];  // ["sushi", "shellfish"]
    maxPrice?: number;           // 0-4
    minRating?: number;          // 1.0-5.0
    openNow?: boolean;
  }
): GooglePlace[] {
  return places.filter((place) => {
    // Exclude keywords (case-insensitive)
    if (preferences.excludeKeywords) {
      const nameLower = place.name.toLowerCase();
      const typesLower = place.types.join(' ').toLowerCase();

      const hasExcluded = preferences.excludeKeywords.some(
        (keyword) =>
          nameLower.includes(keyword.toLowerCase()) ||
          typesLower.includes(keyword.toLowerCase())
      );

      if (hasExcluded) return false;
    }

    // Max price filter
    if (preferences.maxPrice !== undefined && place.price_level !== undefined) {
      if (place.price_level > preferences.maxPrice) return false;
    }

    // Min rating filter
    if (preferences.minRating !== undefined && place.rating !== undefined) {
      if (place.rating < preferences.minRating) return false;
    }

    // Open now filter
    if (preferences.openNow && place.opening_hours) {
      if (!place.opening_hours.open_now) return false;
    }

    return true;
  });
}

/**
 * Mock data for testing (when API key is missing)
 */
function getMockPlaces(params: NearbySearchParams): GooglePlace[] {
  const isCentralen = params.location.lat > 59.32 && params.location.lat < 59.34;

  if (isCentralen) {
    return [
      {
        place_id: 'mock-1',
        name: 'Max Burgers',
        vicinity: 'Centralplan 15, Stockholm',
        rating: 3.9,
        user_ratings_total: 1243,
        price_level: 2,
        opening_hours: { open_now: true },
        types: ['restaurant', 'food', 'point_of_interest'],
        geometry: {
          location: { lat: 59.3293, lng: 18.0686 },
        },
      },
      {
        place_id: 'mock-2',
        name: 'Espresso House',
        vicinity: 'Vasagatan 22, Stockholm',
        rating: 4.2,
        user_ratings_total: 892,
        price_level: 2,
        opening_hours: { open_now: true },
        types: ['cafe', 'food', 'point_of_interest'],
        geometry: {
          location: { lat: 59.3295, lng: 18.0682 },
        },
      },
      {
        place_id: 'mock-3',
        name: 'Hermitage',
        vicinity: 'Stora Nygatan 11, Stockholm',
        rating: 4.5,
        user_ratings_total: 456,
        price_level: 2,
        opening_hours: { open_now: false },
        types: ['restaurant', 'vegetarian', 'food'],
        geometry: {
          location: { lat: 59.3251, lng: 18.0705 },
        },
      },
    ];
  }

  return [
    {
      place_id: 'mock-tyreso-1',
      name: 'ICA Maxi Tyresö',
      vicinity: 'Tyresö Centrum',
      rating: 4.0,
      user_ratings_total: 234,
      price_level: 2,
      opening_hours: { open_now: true },
      types: ['grocery_store', 'supermarket', 'food'],
      geometry: {
        location: { lat: 59.2419, lng: 18.2558 },
      },
    },
  ];
}
