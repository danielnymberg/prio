/**
 * Morning Briefing - Scheduled job (runs at 07:00 daily)
 *
 * Combines:
 * - Weather forecast (SMHI)
 * - Traffic situation (Trafikverket)
 * - Calendar events (Microsoft Graph)
 * - SL/train departures (ResRobot)
 *
 * Output:
 * - Outlook Calendar event med AI-genererad sammanfattning
 * - (Future: OneSignal push notification)
 */

// NOTE: This script is designed to run on Render.com as a cron job
// Environment variables are loaded from Render's dashboard

const BACKEND_URL = process.env.BACKEND_URL || 'https://prio-backend.onrender.com';
const USER_ID = process.env.USER_ID; // Daniel's user ID

// Koordinater
const HOME = { lat: 59.2419, lon: 18.2558 }; // Tyresö
const WORK = { lat: 59.3293, lon: 18.0686 }; // Stockholm Central

async function getMorningBriefing() {
  console.log('🌅 Genererar morgonbriefing...');

  try {
    // 1. Väder (SMHI)
    const weatherResponse = await fetch(
      `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${HOME.lon.toFixed(6)}/lat/${HOME.lat.toFixed(6)}/data.json`
    );
    const weatherData = await weatherResponse.json();
    const todayWeather = weatherData.timeSeries.slice(0, 12); // Nästa 12 timmar

    // Parse väder
    const temps = todayWeather.map(t => {
      const temp = t.parameters.find(p => p.name === 't');
      return temp ? temp.values[0] : null;
    }).filter(Boolean);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;

    const rain = todayWeather.some(t => {
      const precip = t.parameters.find(p => p.name === 'pcat');
      return precip && precip.values[0] > 0.3; // > 0.3mm/h
    });

    // 2. Trafik (Mock data om API-key saknas)
    let trafficSummary = '✅ Fri väg';
    // (Skulle kalla Trafikverket API här om key finns)

    // 3. Dagens schema (Mock)
    // (Skulle kalla Microsoft Graph API här)
    const meetingsToday = []; // Placeholder

    // 4. SL-avgångar från Tyresö C
    // (Skulle kalla ResRobot API här)

    // 5. Bygg sammanfattning
    const briefing = `
☀️ God morgon!

🌡️ VÄDER:
  • Temperatur: ${avgTemp.toFixed(1)}°C (genomsnitt idag)
  ${rain ? '  • ☔ Regn väntat - ta paraply!' : '  • 🌤️ Torrt väder'}

🚗 TRAFIK:
  • ${trafficSummary}

📅 DAGENS SCHEMA:
  • ${meetingsToday.length > 0 ? meetingsToday.join('\n  • ') : 'Inga möten inbokade'}

⏰ REKOMMENDATION:
  ${rain ? '🚗 Ta bilen (regn förväntat)' : '🚆 SL fungerar normalt'}
  ${trafficSummary.includes('⚠️') ? '⚠️ Kolla trafikläget innan avfärd' : ''}
    `.trim();

    console.log('✅ Morgonbriefing genererad');
    return briefing;
  } catch (error) {
    console.error('❌ Fel vid morgonbriefing:', error);
    return '❌ Kunde inte hämta morgonbriefing';
  }
}

async function createCalendarEvent(briefing) {
  // I framtiden: Skapa Outlook Calendar event via Microsoft Graph API
  // För nu: Logga bara
  console.log('📅 Morgonbriefing (skulle skapas i Outlook):');
  console.log(briefing);
}

// Main execution
(async () => {
  console.log('🚀 Morning briefing job started');
  console.log('⏰ Tid:', new Date().toLocaleString('sv-SE'));

  const briefing = await getMorningBriefing();
  await createCalendarEvent(briefing);

  console.log('✅ Morning briefing job completed');
  process.exit(0);
})();
