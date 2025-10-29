/**
 * ResRobot API - Swedish public transport (trains, buses, ferries)
 *
 * API Documentation: https://www.trafiklab.se/api/trafiklab-apis/resrobot-v21/
 *
 * Used for:
 * - Ferry departures (Destination Gotland: Visby ↔ Nynäshamn)
 * - Train departures (SJ, regional trains)
 * - Bus departures (all operators in Sweden)
 */

const API_BASE_URL = 'https://api.resrobot.se/v2.1';

export interface ResRobotDeparture {
  name: string;           // Line name (e.g., "Destination Gotland")
  type: string;           // Transport type (e.g., "SHP" for ship/ferry)
  stop: string;           // Stop name
  stopId: string;         // Stop ID
  stopExtId: string;      // External stop ID
  time: string;           // Departure time (HH:MM:SS)
  date: string;           // Departure date (YYYY-MM-DD)
  direction: string;      // Destination
  transportNumber?: string; // Trip number
  rtTime?: string;        // Real-time departure time (if available)
  rtDate?: string;        // Real-time departure date (if available)
}

export interface ResRobotLocation {
  name: string;
  id: string;
  extId: string;
  type: 'ST' | 'ADR' | 'POI';  // Station, Address, Point of Interest
  lat?: number;
  lon?: number;
}

export interface DeparturesParams {
  id: string;             // Stop ID (required)
  maxJourneys?: number;   // Max number of departures (default: 10)
  date?: string;          // Date (YYYY-MM-DD, default: today)
  time?: string;          // Time (HH:MM, default: now)
  passlist?: boolean;     // Include intermediate stops (default: false)
  products?: number;      // Bitmask for transport types (default: all)
}

export interface LocationParams {
  input: string;          // Search string (station name)
  maxNo?: number;         // Max results (default: 10)
  type?: 'S' | 'A' | 'P' | 'SA' | 'SP' | 'AP' | 'SAP';  // Location types
}

/**
 * Get departures from a stop
 */
export async function getDepartures(params: DeparturesParams): Promise<ResRobotDeparture[]> {
  const apiKey = import.meta.env.VITE_TRAFIKLAB_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_TRAFIKLAB_API_KEY saknas i miljövariabler');
  }

  const queryParams = new URLSearchParams({
    accessId: apiKey,
    id: params.id,
    format: 'json',
    maxJourneys: String(params.maxJourneys || 10),
    passlist: params.passlist ? '1' : '0',
  });

  if (params.date) queryParams.set('date', params.date);
  if (params.time) queryParams.set('time', params.time);
  if (params.products !== undefined) queryParams.set('products', String(params.products));

  const url = `${API_BASE_URL}/departureBoard?${queryParams.toString()}`;

  console.log('🚌 ResRobot departures URL:', url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ResRobot API error:', response.status, errorText);
    throw new Error(`ResRobot API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('🚌 ResRobot response:', data);

  if (!data.Departure) {
    console.warn('⚠️ No departures found in response');
    return [];
  }

  const departures = Array.isArray(data.Departure) ? data.Departure : [data.Departure];
  console.log(`✅ Found ${departures.length} departures`);
  return departures;
}

/**
 * Search for locations (stations, stops)
 */
export async function searchLocations(params: LocationParams): Promise<ResRobotLocation[]> {
  const apiKey = import.meta.env.VITE_TRAFIKLAB_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_TRAFIKLAB_API_KEY saknas i miljövariabler');
  }

  const queryParams = new URLSearchParams({
    accessId: apiKey,
    input: params.input,
    format: 'json',
    maxNo: String(params.maxNo || 10),
  });

  if (params.type) queryParams.set('type', params.type);

  const url = `${API_BASE_URL}/location.name?${queryParams.toString()}`;

  console.log('🔍 ResRobot station search URL:', url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ResRobot API error:', response.status, errorText);
    throw new Error(`ResRobot API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('🔍 ResRobot response:', data);

  // API returns stopLocationOrCoordLocation array with nested StopLocation
  if (!data.stopLocationOrCoordLocation || data.stopLocationOrCoordLocation.length === 0) {
    console.warn('⚠️ No stations found in response');
    return [];
  }

  const stations = data.stopLocationOrCoordLocation
    .map((item: any) => item.StopLocation)
    .filter(Boolean);

  console.log(`✅ Found ${stations.length} stations`);
  return stations;
}

/**
 * Helper: Get ferry departures from Visby or Nynäshamn
 */
export async function getFerryDepartures(from: 'visby' | 'nynashamn', maxJourneys: number = 10): Promise<ResRobotDeparture[]> {
  // Known stop IDs for Destination Gotland ferry terminals
  const STOP_IDS = {
    visby: '740000054',       // Visby färjeterminal (TODO: verify)
    nynashamn: '740000881',   // Nynäshamn färjeterminal (TODO: verify)
  };

  return getDepartures({
    id: STOP_IDS[from],
    maxJourneys,
    products: 16,  // Bitmask for ferries (SHP)
  });
}

/**
 * Helper: Search for a station by name
 */
export async function findStation(name: string): Promise<ResRobotLocation | null> {
  const results = await searchLocations({ input: name, maxNo: 1, type: 'S' });
  return results.length > 0 ? results[0] : null;
}

/**
 * Plan a trip from A to B with public transit
 */
export interface TripParams {
  originId: string;      // Origin station ID
  destId: string;        // Destination station ID
  date?: string;         // Travel date (YYYY-MM-DD, default: today)
  time?: string;         // Travel time (HH:MM, default: now)
  searchForArrival?: boolean; // Search for arrival time instead of departure (default: false)
  numTrips?: number;     // Number of trip suggestions (default: 3)
}

export interface TripLeg {
  name: string;          // Line name (e.g., "SJ Regional")
  type: string;          // Transport type
  origin: string;        // Origin stop name
  destination: string;   // Destination stop name
  departure: string;     // Departure time (HH:MM:SS)
  arrival: string;       // Arrival time (HH:MM:SS)
  duration: string;      // Duration (HH:MM:SS)
}

export interface Trip {
  legs: TripLeg[];
  departure: string;     // Total trip departure time
  arrival: string;       // Total trip arrival time
  duration: string;      // Total duration (HH:MM:SS)
  changes: number;       // Number of changes
}

export async function planTrip(params: TripParams): Promise<Trip[]> {
  const apiKey = import.meta.env.VITE_TRAFIKLAB_API_KEY;

  if (!apiKey) {
    throw new Error('VITE_TRAFIKLAB_API_KEY saknas i miljövariabler');
  }

  const queryParams = new URLSearchParams({
    accessId: apiKey,
    originId: params.originId,
    destId: params.destId,
    format: 'json',
    numTrips: String(params.numTrips || 3),
  });

  if (params.date) queryParams.set('date', params.date);
  if (params.time) queryParams.set('time', params.time);
  if (params.searchForArrival) queryParams.set('searchForArrival', '1');

  const url = `${API_BASE_URL}/trip?${queryParams.toString()}`;

  console.log('🚌 ResRobot trip planner URL:', url);

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ ResRobot trip API error:', response.status, errorText);
    throw new Error(`ResRobot trip API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log('🚌 ResRobot trip response:', data);

  if (!data.Trip) {
    console.warn('⚠️ No trips found in response');
    return [];
  }

  const trips = Array.isArray(data.Trip) ? data.Trip : [data.Trip];
  console.log(`✅ Found ${trips.length} trip options`);

  return trips.map((trip: any) => ({
    legs: Array.isArray(trip.LegList?.Leg) ? trip.LegList.Leg : [trip.LegList?.Leg],
    departure: trip.LegList?.Leg[0]?.Origin?.time || '',
    arrival: trip.LegList?.Leg[trip.LegList?.Leg.length - 1]?.Destination?.time || '',
    duration: trip.duration || '',
    changes: trip.LegList?.Leg?.length - 1 || 0
  }));
}
