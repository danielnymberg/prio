/**
 * Geolocation service - GPS positioning with reverse geocoding
 * Uses browser Geolocation API + OpenStreetMap Nominatim for city names
 */

const LOCATION_CACHE_KEY = 'prio_last_known_location';
const CACHE_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy?: number; // Accuracy in meters
  city?: string;
  country?: string;
  timestamp: number;
  source: 'gps' | 'cache';
}

interface CachedLocation extends LocationResult {
  expiry: number;
}

/**
 * Get current GPS position (one-time)
 */
export async function getCurrentPosition(): Promise<LocationResult | null> {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported by browser');
    return getCachedLocation();
  }

  try {
    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true, // Use GPS for best accuracy (~5-10m)
        timeout: 15000, // 15 seconds (GPS can take longer)
        maximumAge: 60 * 1000, // Accept 1 min old cached position
      });
    });

    const result: LocationResult = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy, // Accuracy in meters (WiFi = 100-5000m, GPS = 5-10m)
      timestamp: Date.now(),
      source: 'gps',
    };

    console.log(`📍 Location accuracy: ${Math.round(position.coords.accuracy)}m (${position.coords.accuracy > 100 ? 'WiFi/Cell' : 'GPS'})`)

    // Reverse geocode to get city name
    const cityInfo = await reverseGeocode(result.latitude, result.longitude);
    if (cityInfo) {
      result.city = cityInfo.city;
      result.country = cityInfo.country;
    }

    // Cache result
    cacheLocation(result);

    return result;
  } catch (error) {
    console.error('Failed to get GPS position:', error);
    return getCachedLocation();
  }
}

/**
 * Watch position continuously (updates every ~5 min when position changes significantly)
 * Returns watch ID for cleanup
 */
export function watchPosition(
  callback: (location: LocationResult) => void
): number | null {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported by browser');
    return null;
  }

  return navigator.geolocation.watchPosition(
    async (position) => {
      const result: LocationResult = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: Date.now(),
        source: 'gps',
      };

      console.log(`📍 Location accuracy: ${Math.round(position.coords.accuracy)}m (${position.coords.accuracy > 100 ? 'WiFi/Cell' : 'GPS'})`);

      // Reverse geocode
      const cityInfo = await reverseGeocode(result.latitude, result.longitude);
      if (cityInfo) {
        result.city = cityInfo.city;
        result.country = cityInfo.country;
      }

      cacheLocation(result);
      callback(result);
    },
    (error) => {
      console.error('Watch position error:', error);
    },
    {
      enableHighAccuracy: true, // Use GPS for best accuracy
      timeout: 15000,
      maximumAge: 60 * 1000, // 1 min
    }
  );
}

/**
 * Stop watching position
 */
export function clearWatch(watchId: number) {
  if (navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId);
  }
}

/**
 * Reverse geocode coordinates to city name using OpenStreetMap Nominatim
 * Free, no API key required, rate limit: 1 req/sec
 */
async function reverseGeocode(
  lat: number,
  lon: number
): Promise<{ city: string; country: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MinPrio App', // Nominatim requires User-Agent
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Extract city name (try different fields)
    const city =
      data.address?.city ||
      data.address?.town ||
      data.address?.village ||
      data.address?.municipality ||
      data.address?.county ||
      'Unknown';

    const country = data.address?.country || 'Unknown';

    return { city, country };
  } catch (error) {
    console.error('Reverse geocoding failed:', error);
    return null;
  }
}

/**
 * Cache location in localStorage
 */
function cacheLocation(location: LocationResult) {
  const cached: CachedLocation = {
    ...location,
    expiry: Date.now() + CACHE_DURATION_MS,
  };
  try {
    localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify(cached));
  } catch (error) {
    console.error('Failed to cache location:', error);
  }
}

/**
 * Get cached location if not expired
 */
export function getCachedLocation(): LocationResult | null {
  try {
    const cached = localStorage.getItem(LOCATION_CACHE_KEY);
    if (!cached) return null;

    const location: CachedLocation = JSON.parse(cached);

    // Check if expired
    if (Date.now() > location.expiry) {
      localStorage.removeItem(LOCATION_CACHE_KEY);
      return null;
    }

    return {
      ...location,
      source: 'cache',
    };
  } catch (error) {
    console.error('Failed to read cached location:', error);
    return null;
  }
}

/**
 * Clear cached location
 */
export function clearCachedLocation() {
  localStorage.removeItem(LOCATION_CACHE_KEY);
}
