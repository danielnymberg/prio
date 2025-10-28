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

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ResRobot API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.Departure) {
    return [];
  }

  return Array.isArray(data.Departure) ? data.Departure : [data.Departure];
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

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ResRobot API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  if (!data.StopLocation) {
    return [];
  }

  return Array.isArray(data.StopLocation) ? data.StopLocation : [data.StopLocation];
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
