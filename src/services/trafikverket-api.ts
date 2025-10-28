// Trafikverket API Wrapper
// Docs: https://api.trafikinfo.trafikverket.se/
// API Key: Hämtas från environment variable VITE_TRAFIKVERKET_API_KEY

const TRAFIKVERKET_API_URL = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

// ObjectType versioner (senaste enligt Trafikverket API)
const OBJECT_VERSIONS: Record<string, string> = {
  Camera: '1',
  FerryAnnouncement: '1.2',
  FerryRoute: '1.2',
  Icon: '1',
  MeasurementData20: '1',
  MeasurementData100: '1',
  Parking: '1.4',
  PavementData: '1',
  RailCrossing: '1.5',
  ReasonCode: '1.1',
  RoadCondition: '1.2',
  RoadData: '1',
  RoadGeometry: '1',
  Situation: '1.5',
  TrafficFlow: '1.5',
  TrafficSafetyCamera: '1',
  TrainAnnouncement: '1.9',
  TrainMessage: '1.7',
  TrainPosition: '1.1',
  TrainStation: '1.4',
  TrainStationMessage: '1',
  TravelTimeRoute: '1.5',
  WeatherMeasurepoint: '2',
  WeatherObservation: '2',
};

export type TrafikverketObjectType = keyof typeof OBJECT_VERSIONS;

export interface TrafikverketFilter {
  field: string;
  value: string | number | boolean;
  operator?: 'EQ' | 'GT' | 'GTE' | 'LT' | 'LTE' | 'NE' | 'LIKE' | 'NOTLIKE' | 'IN' | 'NOTIN';
}

export interface TrafikverketQuery {
  objectType: TrafikverketObjectType;
  filters?: TrafikverketFilter[];
  limit?: number;
  orderby?: string;
  skip?: number;
}

export interface TrafikverketResponse {
  success: boolean;
  data?: any;
  error?: string;
  count?: number;
}

// Bygg XML-filter från filter array
function buildFilters(filters: TrafikverketFilter[]): string {
  if (!filters || filters.length === 0) return '';

  const filterElements = filters
    .map((filter) => {
      const op = filter.operator || 'EQ';
      return `<${op} name="${filter.field}" value="${filter.value}" />`;
    })
    .join('\n      ');

  return `
    <FILTER>
      ${filterElements}
    </FILTER>`;
}

// Bygg komplett XML-request
function buildXMLRequest(apiKey: string, query: TrafikverketQuery): string {
  const { objectType, filters, limit = 10, orderby, skip } = query;
  const version = OBJECT_VERSIONS[objectType];

  let queryAttrs = `objecttype="${objectType}" schemaversion="${version}" limit="${limit}"`;
  if (orderby) queryAttrs += ` orderby="${orderby}"`;
  if (skip) queryAttrs += ` skip="${skip}"`;

  const filterXML = filters ? buildFilters(filters) : '';

  return `<REQUEST>
  <LOGIN authenticationkey="${apiKey}" />
  <QUERY ${queryAttrs}>${filterXML}
  </QUERY>
</REQUEST>`;
}

// Hämta data från Trafikverket API
export async function queryTrafikverket(
  query: TrafikverketQuery
): Promise<TrafikverketResponse> {
  try {
    // Hämta API-nyckel från environment
    const apiKey = import.meta.env.VITE_TRAFIKVERKET_API_KEY;

    if (!apiKey) {
      console.error('❌ VITE_TRAFIKVERKET_API_KEY saknas');
      return {
        success: false,
        error: 'Trafikverket API-nyckel saknas. Lägg till VITE_TRAFIKVERKET_API_KEY i .env.local',
      };
    }

    // Bygg XML-request
    const xmlRequest = buildXMLRequest(apiKey, query);

    console.log('🚆 Trafikverket API request:', query.objectType);

    // POST request
    const response = await fetch(TRAFIKVERKET_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
      },
      body: xmlRequest,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Kontrollera om Trafikverket returnerade fel
    if (data.RESPONSE?.RESULT?.[0]?.ERROR) {
      const error = data.RESPONSE.RESULT[0].ERROR;
      console.error('❌ Trafikverket API error:', error);
      return {
        success: false,
        error: error.MESSAGE || 'Trafikverket API error',
      };
    }

    // Extrahera data från response
    const resultData = data.RESPONSE?.RESULT?.[0]?.[query.objectType] || [];
    const count = resultData.length;

    console.log(`✅ Trafikverket API success: ${count} ${query.objectType} hittade`);

    return {
      success: true,
      data: resultData,
      count,
    };
  } catch (error) {
    console.error('❌ Trafikverket API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// === HELPER FUNCTIONS FÖR VANLIGA QUERIES ===

// Tågavgångar från en station
export async function getTrainDepartures(
  stationName: string,
  limit: number = 10
): Promise<TrafikverketResponse> {
  return queryTrafikverket({
    objectType: 'TrainAnnouncement',
    filters: [
      { field: 'LocationSignature', value: stationName, operator: 'EQ' },
      { field: 'ActivityType', value: 'Avgang', operator: 'EQ' },
    ],
    limit,
    orderby: 'AdvertisedTimeAtLocation',
  });
}

// Tågankomster till en station
export async function getTrainArrivals(
  stationName: string,
  limit: number = 10
): Promise<TrafikverketResponse> {
  return queryTrafikverket({
    objectType: 'TrainAnnouncement',
    filters: [
      { field: 'LocationSignature', value: stationName, operator: 'EQ' },
      { field: 'ActivityType', value: 'Ankomst', operator: 'EQ' },
    ],
    limit,
    orderby: 'AdvertisedTimeAtLocation',
  });
}

// Sök tågstationer
export async function searchTrainStations(
  searchTerm: string
): Promise<TrafikverketResponse> {
  return queryTrafikverket({
    objectType: 'TrainStation',
    filters: [{ field: 'AdvertisedLocationName', value: `%${searchTerm}%`, operator: 'LIKE' }],
    limit: 20,
  });
}

// Tågstörningar
export async function getTrainMessages(limit: number = 10): Promise<TrafikverketResponse> {
  return queryTrafikverket({
    objectType: 'TrainMessage',
    limit,
    orderby: 'LastUpdateDateTime desc',
  });
}

// Färjeavgångar
export async function getFerryDepartures(
  routeName?: string,
  limit: number = 10
): Promise<TrafikverketResponse> {
  const filters = routeName
    ? [{ field: 'Route.Name', value: routeName, operator: 'EQ' as const }]
    : undefined;

  return queryTrafikverket({
    objectType: 'FerryAnnouncement',
    filters,
    limit,
  });
}

// Vägsituationer (olyckor, vägarbeten)
export async function getRoadSituations(
  countyId?: number,
  limit: number = 20
): Promise<TrafikverketResponse> {
  const filters = countyId ? [{ field: 'CountyNo', value: countyId, operator: 'EQ' as const }] : undefined;

  return queryTrafikverket({
    objectType: 'Situation',
    filters,
    limit,
    orderby: 'CreationTime desc',
  });
}

// Väglag
export async function getRoadConditions(
  countyId?: number,
  limit: number = 20
): Promise<TrafikverketResponse> {
  const filters = countyId ? [{ field: 'CountyNo', value: countyId, operator: 'EQ' as const }] : undefined;

  return queryTrafikverket({
    objectType: 'RoadCondition',
    filters,
    limit,
  });
}

// Väderobservationer
export async function getWeatherObservations(
  stationName?: string,
  limit: number = 10
): Promise<TrafikverketResponse> {
  const filters = stationName
    ? [{ field: 'Name', value: stationName, operator: 'EQ' as const }]
    : undefined;

  return queryTrafikverket({
    objectType: 'WeatherObservation',
    filters,
    limit,
    orderby: 'Observation.Sample desc',
  });
}

// Restider
export async function getTravelTimes(
  routeId?: string,
  limit: number = 10
): Promise<TrafikverketResponse> {
  const filters = routeId ? [{ field: 'Id', value: routeId, operator: 'EQ' as const }] : undefined;

  return queryTrafikverket({
    objectType: 'TravelTimeRoute',
    filters,
    limit,
  });
}
