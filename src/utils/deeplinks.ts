/**
 * Deeplink Generator - Verified URL structures for booking services
 *
 * Creates deep links to transport and accommodation booking services.
 * All URLs are verified to work as of 2025-10-29.
 */

export interface UberParams {
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
}

export interface SASFlightParams {
  from: string;        // IATA code (ARN, GOT, BMA, etc)
  to: string;          // IATA code
  date: string;        // YYYY-MM-DD
  tripType?: 'OW' | 'RT';  // One-way or Round-trip
  adults?: number;     // Default: 1
}

export interface HotelParams {
  destination: string; // City name
  checkIn: string;     // YYYY-MM-DD
  checkOut: string;    // YYYY-MM-DD
  adults?: number;     // Default: 1
  rooms?: number;      // Default: 1
}

export interface ResRobotParams {
  fromStationId: string;  // ResRobot station ID
  toStationId: string;
  date?: string;          // YYYY-MM-DD
  time?: string;          // HH:MM
  arrivalTime?: boolean;  // Search by arrival time instead of departure
}

/**
 * Generate Uber deep link
 * Docs: https://developer.uber.com/docs/riders/ride-requests/tutorials/deep-links/introduction
 */
export function generateUberLink(params: UberParams): string {
  const { pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress } = params;

  const queryParams = new URLSearchParams({
    'action': 'setPickup',
    'pickup[latitude]': pickupLat.toString(),
    'pickup[longitude]': pickupLng.toString(),
    'dropoff[latitude]': dropoffLat.toString(),
    'dropoff[longitude]': dropoffLng.toString(),
  });

  if (pickupAddress) {
    queryParams.set('pickup[formatted_address]', pickupAddress);
  }

  if (dropoffAddress) {
    queryParams.set('dropoff[formatted_address]', dropoffAddress);
  }

  // Universal link (works on web + opens app if installed)
  return `https://m.uber.com/ul/?${queryParams.toString()}`;
}

/**
 * Generate SAS flight search link
 * Format: https://www.sas.se/book/flights/?search=OW_ARN-GOT-20251030_a1c0i0y0
 */
export function generateSASLink(params: SASFlightParams): string {
  const { from, to, date, tripType = 'OW', adults = 1 } = params;

  // Convert date to YYYYMMDD
  const dateStr = date.replace(/-/g, '');

  // Format: a{adults}c{children}i{infants}y{youth}
  const passengers = `a${adults}c0i0y0`;

  const search = `${tripType}_${from.toUpperCase()}-${to.toUpperCase()}-${dateStr}_${passengers}`;

  return `https://www.sas.se/book/flights/?search=${search}&view=upsell&bookingFlow=revenue`;
}

/**
 * Generate Hotels.com search link
 * Example: https://sv.hotels.com/Hotel-Search?destination=Göteborg&d1=2025-11-06&d2=2025-11-07&adults=1&rooms=1
 */
export function generateHotelsLink(params: HotelParams): string {
  const { destination, checkIn, checkOut, adults = 1, rooms = 1 } = params;

  const queryParams = new URLSearchParams({
    destination: destination,
    d1: checkIn,
    d2: checkOut,
    adults: adults.toString(),
    rooms: rooms.toString(),
    useRewards: 'true',
  });

  return `https://sv.hotels.com/Hotel-Search?${queryParams.toString()}`;
}

/**
 * Generate ResRobot deep link for public transit
 * Docs: https://www.trafiklab.se/api/our-apis/resrobot-v21/deep-links/
 */
export function generateResRobotLink(params: ResRobotParams): string {
  const { fromStationId, toStationId, date, time, arrivalTime } = params;

  const queryParams = new URLSearchParams({
    S: fromStationId,
    Z: toStationId,
    start: '1',
  });

  if (date) queryParams.set('date', date);
  if (time) queryParams.set('time', time);
  if (arrivalTime) queryParams.set('timesel', 'arrive');

  return `https://reseplanerare.resrobot.se/bin/query.exe/sn?${queryParams.toString()}`;
}

/**
 * Generate SJ link (generic - no parameters available)
 */
export function generateSJLink(): string {
  return 'https://www.sj.se/sok-resa';
}

/**
 * Generate Destination Gotland link (goes to logged-in area)
 */
export function generateDestinationGotlandLink(): string {
  return 'https://www.destinationgotland.se/mina-sidor/';
}

/**
 * Generate Flygbussarna link (generic)
 */
export function generateFlygbussarnaLink(): string {
  return 'https://www.flygbussarna.se/en/tickets';
}

/**
 * Generate Taxi Gotland phone link
 */
export function generateTaxiGotlandLink(): string {
  return 'tel:+46498210020';
}

/**
 * Helper: Get IATA code for Swedish airports
 */
export const SWEDISH_AIRPORTS: Record<string, string> = {
  'Arlanda': 'ARN',
  'Bromma': 'BMA',
  'Göteborg': 'GOT',
  'Göteborg Landvetter': 'GOT',
  'Visby': 'VBY',
  'Malmö': 'MMX',
  'Umeå': 'UME',
  'Kiruna': 'KRN',
  'Luleå': 'LLA',
};

/**
 * Helper: Convert city name to IATA code
 */
export function getIATACode(cityOrAirport: string): string | null {
  const normalized = cityOrAirport.trim();

  // Direct match
  if (SWEDISH_AIRPORTS[normalized]) {
    return SWEDISH_AIRPORTS[normalized];
  }

  // Partial match
  for (const [name, code] of Object.entries(SWEDISH_AIRPORTS)) {
    if (name.toLowerCase().includes(normalized.toLowerCase())) {
      return code;
    }
  }

  return null;
}
