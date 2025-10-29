/**
 * Trafikverket Open API - Swedish Transport Administration
 *
 * API Documentation: https://api.trafikinfo.trafikverket.se/
 *
 * Used for:
 * - Traffic situations (accidents, roadworks, congestion)
 * - Road conditions
 * - Real-time incident updates
 *
 * FREE - Requires API key from https://api.trafikinfo.trafikverket.se/
 */

const API_URL = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

export interface TrafficSituation {
  id: string;
  message: string;           // "Olycka på E4 söderut vid Kungens kurva"
  severity: 'High' | 'Medium' | 'Low' | 'None';
  roadNumber: string;        // "E4", "222", "73"
  location: {
    description: string;     // "E4 Kungens kurva"
    lat?: number;
    lon?: number;
  };
  affectedDirection?: string; // "Norrgående", "Sörgående", "Båda"
  startTime: string;         // ISO 8601
  endTime?: string;          // Estimated end time (if available)
  geometry?: string;         // WGS84 coordinate string
}

export interface GetSituationsParams {
  roads?: string[];          // Filter by road numbers: ["E4", "222"]
  bbox?: {                   // Bounding box for geographic filtering
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  };
  severity?: ('High' | 'Medium' | 'Low')[];
}

/**
 * Get current traffic situations
 */
export async function getSituations(params?: GetSituationsParams): Promise<TrafficSituation[]> {
  const apiKey = import.meta.env.VITE_TRAFIKVERKET_API_KEY;

  if (!apiKey) {
    console.warn('⚠️ VITE_TRAFIKVERKET_API_KEY saknas - returnerar mock data');
    return getMockSituations(params);
  }

  // Build Trafikverket XML query
  const query = buildTrafikverketQuery(params);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`Trafikverket API error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.RESPONSE?.RESULT?.[0]?.Situation) {
    return [];
  }

  const situations = Array.isArray(data.RESPONSE.RESULT[0].Situation)
    ? data.RESPONSE.RESULT[0].Situation
    : [data.RESPONSE.RESULT[0].Situation];

  return situations.map(parseSituation);
}

/**
 * Build Trafikverket XML query
 */
function buildTrafikverketQuery(params?: GetSituationsParams): string {
  const apiKey = import.meta.env.VITE_TRAFIKVERKET_API_KEY;

  let filters = '';

  // Road number filter
  if (params?.roads && params.roads.length > 0) {
    const roadFilters = params.roads.map(road =>
      `<IN name="Deviation.RoadNumber" value="${road}" />`
    ).join('\n');
    filters += `<OR>\n${roadFilters}\n</OR>\n`;
  }

  // Geographic bounding box filter
  if (params?.bbox) {
    const { minLat, maxLat, minLon, maxLon } = params.bbox;
    filters += `
      <AND>
        <GT name="Deviation.Geometry.SWEREF99TM.lat" value="${minLat}" />
        <LT name="Deviation.Geometry.SWEREF99TM.lat" value="${maxLat}" />
        <GT name="Deviation.Geometry.SWEREF99TM.lon" value="${minLon}" />
        <LT name="Deviation.Geometry.SWEREF99TM.lon" value="${maxLon}" />
      </AND>
    `;
  }

  return `
    <REQUEST>
      <LOGIN authenticationkey="${apiKey}" />
      <QUERY objecttype="Situation" schemaversion="1.5">
        <FILTER>
          ${filters || '<IN name="Deviation.MessageType" value="Olycka,Vägarbete,Restriktion,Trafikmeddelande" />'}
        </FILTER>
        <INCLUDE>Id</INCLUDE>
        <INCLUDE>PublicationTime</INCLUDE>
        <INCLUDE>Deviation.Message</INCLUDE>
        <INCLUDE>Deviation.Severity</INCLUDE>
        <INCLUDE>Deviation.RoadNumber</INCLUDE>
        <INCLUDE>Deviation.LocationDescriptor</INCLUDE>
        <INCLUDE>Deviation.StartTime</INCLUDE>
        <INCLUDE>Deviation.EndTime</INCLUDE>
        <INCLUDE>Deviation.Geometry.WGS84</INCLUDE>
      </QUERY>
    </REQUEST>
  `.trim();
}

/**
 * Parse Trafikverket situation to our format
 */
function parseSituation(raw: any): TrafficSituation {
  const deviation = raw.Deviation?.[0] || {};

  return {
    id: raw.Id || `situation-${Date.now()}`,
    message: deviation.Message || 'Okänd trafiksituation',
    severity: parseSeverity(deviation.Severity),
    roadNumber: deviation.RoadNumber || 'Okänd väg',
    location: {
      description: deviation.LocationDescriptor || 'Okänd plats',
      lat: deviation.Geometry?.WGS84?.split(',')[0] ? parseFloat(deviation.Geometry.WGS84.split(',')[0]) : undefined,
      lon: deviation.Geometry?.WGS84?.split(',')[1] ? parseFloat(deviation.Geometry.WGS84.split(',')[1]) : undefined,
    },
    affectedDirection: deviation.RoadNumberNumeric || undefined,
    startTime: deviation.StartTime || new Date().toISOString(),
    endTime: deviation.EndTime || undefined,
    geometry: deviation.Geometry?.WGS84 || undefined,
  };
}

/**
 * Parse severity code to human-readable
 */
function parseSeverity(severity?: number): 'High' | 'Medium' | 'Low' | 'None' {
  if (!severity) return 'None';
  if (severity >= 5) return 'High';       // Severe impact
  if (severity >= 3) return 'Medium';     // Moderate impact
  return 'Low';                            // Minor impact
}

/**
 * Get commute status for common Stockholm routes
 */
export async function getCommuteStatus(routes?: string[]): Promise<{
  hasIssues: boolean;
  message: string;
  situations: TrafficSituation[];
}> {
  const defaultRoutes = routes || ['E4', '222', '73']; // E4, Värmdöleden, Nynäsvägen

  const situations = await getSituations({
    roads: defaultRoutes,
    bbox: {
      minLat: 59.2,
      maxLat: 59.4,
      minLon: 18.0,
      maxLon: 18.3,
    },
  });

  const highPriority = situations.filter(s => s.severity === 'High');

  if (highPriority.length > 0) {
    const first = highPriority[0];
    return {
      hasIssues: true,
      message: `⚠️ ${first.roadNumber}: ${first.message}`,
      situations: highPriority,
    };
  }

  if (situations.length > 0) {
    return {
      hasIssues: true,
      message: `⚠️ ${situations.length} trafikhändelser på väg`,
      situations,
    };
  }

  return {
    hasIssues: false,
    message: '✅ Fri väg!',
    situations: [],
  };
}

/**
 * Format situations for human-readable output
 */
export function formatSituations(situations: TrafficSituation[]): string {
  if (situations.length === 0) {
    return '✅ Inga kända trafikstörningar';
  }

  let output = `⚠️ ${situations.length} trafikhändelser:\n\n`;

  situations.forEach((s, i) => {
    const severityEmoji = {
      High: '🔴',
      Medium: '🟡',
      Low: '🟢',
      None: '⚪',
    }[s.severity];

    output += `${severityEmoji} ${s.roadNumber}: ${s.message}\n`;
    output += `   📍 ${s.location.description}\n`;

    if (i < situations.length - 1) {
      output += '\n';
    }
  });

  return output;
}

/**
 * Mock data for testing (when API key is missing)
 */
function getMockSituations(params?: GetSituationsParams): TrafficSituation[] {
  const allMock: TrafficSituation[] = [
    {
      id: 'mock-1',
      message: 'Olycka - E4 Kungens kurva söderut',
      severity: 'High',
      roadNumber: 'E4',
      location: {
        description: 'E4 Kungens kurva',
        lat: 59.2715,
        lon: 17.9997,
      },
      affectedDirection: 'Sörgående',
      startTime: new Date().toISOString(),
    },
    {
      id: 'mock-2',
      message: 'Vägarbete - Värmdöleden, vänster fil avstängd',
      severity: 'Medium',
      roadNumber: '222',
      location: {
        description: 'Värmdöleden vid Gullmarsplan',
        lat: 59.2985,
        lon: 18.0803,
      },
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Filter by roads if specified
  if (params?.roads && params.roads.length > 0) {
    return allMock.filter(s => params.roads!.includes(s.roadNumber));
  }

  return allMock;
}
