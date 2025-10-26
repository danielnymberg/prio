/**
 * HomeView - Startsida med väder, dagens citat och AI-chat
 */

import { useState, useEffect } from 'react';
import { PushToTalkAssistant } from '@/components/voice/PushToTalkAssistant';

interface WeatherData {
  temperature: number;
  windSpeed: number;
  description: string;
}

interface Quote {
  q: string;
  a: string;
}

export function HomeView() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [location, setLocation] = useState<string>('');

  // Fetch väder
  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number, locationName: string) => {
      try {
        console.log('🌤️ Fetching weather for:', locationName, { lat, lon });
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';
        const url = `${BACKEND_URL}/api/weather?lat=${lat}&lon=${lon}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('🌤️ Weather data:', data.timeSeries[0]);

        // Första timmen i timeSeries
        const current = data.timeSeries[0];
        const temp = current.parameters.find((p: any) => p.name === 't')?.values[0];
        const wind = current.parameters.find((p: any) => p.name === 'ws')?.values[0];
        const weatherSymbol = current.parameters.find((p: any) => p.name === 'Wsymb2')?.values[0];

        // Enkel väder-beskrivning baserat på symbol (1-27)
        const getWeatherDesc = (symbol: number) => {
          if (symbol <= 2) return 'Klart';
          if (symbol <= 7) return 'Lätt molnighet';
          if (symbol <= 15) return 'Mulet';
          if (symbol <= 21) return 'Regn';
          return 'Oväder';
        };

        setWeather({
          temperature: Math.round(temp),
          windSpeed: Math.round(wind * 10) / 10,
          description: getWeatherDesc(weatherSymbol)
        });
        setLocation(locationName);
      } catch (error) {
        console.error('Väder-fetch error:', error);
      }
    };

    // Använd geolocation med fallback till Visby
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetchWeather(
            pos.coords.latitude,
            pos.coords.longitude,
            'Din plats'
          );
        },
        () => {
          // Fallback: Visby
          fetchWeather(57.64, 18.30, 'Visby');
        }
      );
    } else {
      // Ingen geolocation support - Visby
      fetchWeather(57.64, 18.30, 'Visby');
    }
  }, []);

  // Fetch dagens citat (2/dag: kl 00 + kl 12)
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        console.log('💬 Fetching quote from ZenQuotes...');
        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';
        const response = await fetch(`${BACKEND_URL}/api/quote`);
        const data = await response.json();
        console.log('💬 Quote data:', data);
        if (data && data[0]) {
          const newQuote = { q: data[0].q, a: data[0].a };

          // Cache med timestamp
          localStorage.setItem('prio-quote', JSON.stringify({
            quote: newQuote,
            fetchedAt: new Date().toISOString()
          }));

          setQuote(newQuote);
        }
      } catch (error) {
        console.error('Quote-fetch error:', error);
      }
    };

    // Kolla cache först
    const cached = localStorage.getItem('prio-quote');
    if (cached) {
      const { quote: cachedQuote, fetchedAt } = JSON.parse(cached);
      const now = new Date();
      const fetchTime = new Date(fetchedAt);

      // Ny dag? (efter 00:00)
      const isNewDay = now.getDate() !== fetchTime.getDate();

      // Efter 12:00 och citatet är från morgonen?
      const isAfternoon = now.getHours() >= 12 && fetchTime.getHours() < 12;

      if (!isNewDay && !isAfternoon) {
        // Använd cached
        setQuote(cachedQuote);
        return;
      }
    }

    // Fetch nytt citat
    fetchQuote();
  }, []);

  return (
    <div style={{
      padding: '16px',
      maxWidth: '600px',
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px'
    }}>

      {/* Väder Chip - Tight */}
      {weather && (
        <div className="e-card" style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
              {weather.temperature}°C
            </span>
            <span style={{ fontSize: '12px', opacity: 0.7 }}>
              {weather.description}
            </span>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '11px',
              opacity: 0.6
            }}>
              <span className="e-icons e-small e-play" style={{ transform: 'rotate(270deg)' }}></span>
              <span>{weather.windSpeed} m/s</span>
            </div>
            <span style={{ fontSize: '10px', opacity: 0.5 }}>
              {location}
            </span>
          </div>
        </div>
      )}

      {/* Dagens Citat */}
      {quote && (
        <div className="e-card" style={{
          padding: '16px',
          fontStyle: 'italic',
          borderLeft: '3px solid var(--color-sf-primary)'
        }}>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.6',
            margin: '0 0 8px 0'
          }}>
            "{quote.q}"
          </p>
          <p style={{
            fontSize: '12px',
            opacity: 0.7,
            margin: 0,
            textAlign: 'right'
          }}>
            — {quote.a}
          </p>
        </div>
      )}

      {/* AI Chat + Voice - Huvudfunktion */}
      <PushToTalkAssistant />

    </div>
  );
}
