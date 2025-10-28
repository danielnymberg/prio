/**
 * SMHI API - Swedish Meteorological and Hydrological Institute
 *
 * API Documentation: https://opendata.smhi.se/apidocs/metfcst/index.html
 *
 * Used for:
 * - Weather forecasts (10 days ahead, hourly)
 * - Current weather conditions
 * - Precipitation, temperature, wind, cloudiness
 *
 * FREE - No API key required!
 */

const API_BASE_URL = 'https://opendata-download-metfcst.smhi.se/api';

export interface SMHIForecast {
  validTime: string;        // ISO 8601: "2025-10-28T14:00:00Z"
  temperature: number;      // Celsius
  precipitation: number;    // mm/h
  windSpeed: number;        // m/s
  windDirection: number;    // degrees (0-360)
  humidity: number;         // % (0-100)
  cloudiness: number;       // oktas (0-8, where 8 = fully clouded)
  weatherSymbol: number;    // SMHI weather symbol code (1-27)
  pressure: number;         // hPa
  visibility: number;       // km
}

export interface SMHIWeatherSummary {
  now: SMHIForecast;
  next3Hours: SMHIForecast[];
  today: SMHIForecast[];
  tomorrow: SMHIForecast[];
  rainWarning: boolean;
  rainStartTime?: string;
  rainEndTime?: string;
}

// SMHI Weather Symbol codes
export const WEATHER_SYMBOLS: Record<number, string> = {
  1: 'Klart',
  2: 'Halvklart',
  3: 'Molnigt',
  4: 'Mulet',
  5: 'Lätt regn',
  6: 'Regn',
  7: 'Kraftigt regn',
  8: 'Åska',
  9: 'Lätt snö',
  10: 'Snö',
  11: 'Kraftig snö',
  12: 'Snöblandat regn',
  13: 'Dimma',
  14: 'Lätt duggregn',
  15: 'Duggregn',
  16: 'Kraftigt duggregn',
  17: 'Lätt byregn',
  18: 'Byregn',
  19: 'Kraftigt byregn',
  20: 'Lätt snöby',
  21: 'Snöby',
  22: 'Kraftig snöby',
  23: 'Lätt hagel',
  24: 'Hagel',
  25: 'Kraftigt hagel',
  26: 'Lätt snöblandat regnby',
  27: 'Snöblandat regnby'
};

/**
 * Get weather forecast for a specific location
 */
export async function getForecast(lat: number, lon: number): Promise<SMHIForecast[]> {
  // SMHI uses lon,lat format (reversed from normal lat,lon!)
  const url = `${API_BASE_URL}/category/pmp3g/version/2/geotype/point/lon/${lon.toFixed(6)}/lat/${lat.toFixed(6)}/data.json`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`SMHI API error (${response.status}): ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.timeSeries) {
    return [];
  }

  // Parse SMHI format to our simplified format
  return data.timeSeries.map((entry: any) => {
    const params = entry.parameters.reduce((acc: any, param: any) => {
      acc[param.name] = param.values[0];
      return acc;
    }, {});

    return {
      validTime: entry.validTime,
      temperature: params.t || 0,           // Air temperature (°C)
      precipitation: params.pcat || 0,       // Precipitation category
      windSpeed: params.ws || 0,            // Wind speed (m/s)
      windDirection: params.wd || 0,        // Wind direction (degrees)
      humidity: params.r || 0,              // Relative humidity (%)
      cloudiness: params.tcc_mean || 0,     // Total cloud cover (oktas)
      weatherSymbol: params.Wsymb2 || 1,    // Weather symbol
      pressure: params.msl || 0,            // Mean sea level pressure (hPa)
      visibility: params.vis || 0           // Horizontal visibility (km)
    };
  });
}

/**
 * Get current weather (next hour forecast)
 */
export async function getCurrentWeather(lat: number, lon: number): Promise<SMHIForecast | null> {
  const forecasts = await getForecast(lat, lon);

  if (forecasts.length === 0) {
    return null;
  }

  // Return first forecast (closest to current time)
  return forecasts[0];
}

/**
 * Get smart weather summary with rain warnings
 */
export async function getWeatherSummary(lat: number, lon: number): Promise<SMHIWeatherSummary> {
  const forecasts = await getForecast(lat, lon);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const tomorrowStr = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const next3Hours = forecasts.slice(0, 3);
  const today = forecasts.filter(f => f.validTime.startsWith(todayStr));
  const tomorrow = forecasts.filter(f => f.validTime.startsWith(tomorrowStr));

  // Rain warning: Check if rain expected in next 3 hours
  const rainWarning = next3Hours.some(f => f.precipitation > 0.3); // > 0.3mm/h
  let rainStartTime: string | undefined;
  let rainEndTime: string | undefined;

  if (rainWarning) {
    const rainPeriods = forecasts.filter(f => f.precipitation > 0.3);
    if (rainPeriods.length > 0) {
      rainStartTime = rainPeriods[0].validTime;
      rainEndTime = rainPeriods[rainPeriods.length - 1].validTime;
    }
  }

  return {
    now: forecasts[0],
    next3Hours,
    today,
    tomorrow,
    rainWarning,
    rainStartTime,
    rainEndTime
  };
}

/**
 * Format weather for human-readable output
 */
export function formatWeatherSummary(summary: SMHIWeatherSummary): string {
  const { now, rainWarning, rainStartTime } = summary;

  let output = `🌡️ ${now.temperature.toFixed(1)}°C, ${WEATHER_SYMBOLS[now.weatherSymbol] || 'Okänt'}\n`;
  output += `💨 Vind: ${now.windSpeed.toFixed(1)} m/s\n`;

  if (rainWarning && rainStartTime) {
    const rainTime = new Date(rainStartTime);
    const hoursUntilRain = (rainTime.getTime() - new Date().getTime()) / (1000 * 60 * 60);

    if (hoursUntilRain < 1) {
      output += `☔ VARNING: Regn börjar om ${Math.round(hoursUntilRain * 60)} minuter!\n`;
    } else {
      output += `☔ Regn väntat om ${Math.round(hoursUntilRain)} timmar\n`;
    }
  }

  return output;
}

/**
 * Helper: Check if rain is expected within timeframe
 */
export async function willItRain(lat: number, lon: number, hoursAhead: number = 3): Promise<boolean> {
  const forecasts = await getForecast(lat, lon);
  const next = forecasts.slice(0, hoursAhead);

  return next.some(f => f.precipitation > 0.3); // > 0.3mm/h considered rain
}
