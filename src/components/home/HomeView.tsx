/**
 * HomeView - Startsida med väder, dagens citat och AI-chat
 */

import { useState, useEffect } from 'react';
import { PushToTalkAssistant } from '@/components/voice/PushToTalkAssistant';

interface Quote {
  q: string;
  a: string;
}

export function HomeView() {
  const [quote, setQuote] = useState<Quote | null>(null);

  // Fetch dagens citat (2/dag: kl 00 + kl 12)
  useEffect(() => {
    const fetchQuote = async () => {
      try {
        console.log('💬 Fetching quote from ZenQuotes...');
        const response = await fetch('https://zenquotes.io/api/random');
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

      {/* Dagens Citat */}
      {quote && (
        <div className="e-card" style={{
          padding: '12px',
          borderLeft: '3px solid var(--color-sf-primary)'
        }}>
          <p style={{
            fontSize: '13px',
            lineHeight: '1.5',
            margin: '0 0 6px 0',
            color: '#000',
            fontWeight: 'bold'
          }}>
            "{quote.q}"
          </p>
          <p style={{
            fontSize: '11px',
            color: '#000',
            opacity: 0.6,
            margin: 0,
            textAlign: 'right',
            fontWeight: 'normal'
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
