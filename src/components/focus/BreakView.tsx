import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Coffee, Mail, ArrowRight } from 'lucide-react';

export function BreakView() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isShortBreak = searchParams.get('duration') === 'short';

  const PHYSICAL_DURATION = isShortBreak ? 5 * 60 : 20 * 60; // 5 eller 20 min
  const EMAIL_DURATION = isShortBreak ? 0 : 10 * 60; // 0 eller 10 min

  const [timeRemaining, setTimeRemaining] = useState(PHYSICAL_DURATION);
  const [phase, setPhase] = useState<'physical' | 'email' | 'done'>('physical');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(interval);

          if (phase === 'physical' && EMAIL_DURATION > 0) {
            setPhase('email');
            setTimeRemaining(EMAIL_DURATION);
          } else {
            setPhase('done');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [phase]);

  const handleContinue = () => {
    navigate('/focus');
  };

  const minutes = Math.floor(timeRemaining / 60);
  const seconds = timeRemaining % 60;

  if (phase === 'done') {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #ecfdf5, #d1fae5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
        <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '3rem', maxWidth: '42rem', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3.75rem', marginBottom: '1.5rem' }}>🎉</div>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
            Pausen är klar!
          </h1>
          <p style={{ fontSize: '1.25rem', color: 'var(--e-text-secondary)', marginBottom: '2rem' }}>
            {isShortBreak ? 'Nu är du redo igen!' : 'Dags för nästa session'}
          </p>
          <Button
            onClick={handleContinue}
            style={{ height: '64px', padding: '0 3rem', fontSize: '1.125rem' }}
          >
            <ArrowRight style={{ height: '24px', width: '24px', marginRight: '0.5rem' }} />
            Nästa uppgift
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(to bottom right, #fef3c7, #fed7aa)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ backgroundColor: 'var(--e-surface)', borderRadius: '1.5rem', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', padding: '3rem', maxWidth: '48rem', width: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          {phase === 'physical' ? (
            <Coffee style={{ height: '80px', width: '80px', color: '#f59e0b', margin: '0 auto 1rem' }} />
          ) : (
            <Mail style={{ height: '80px', width: '80px', color: 'var(--copper-500)', margin: '0 auto 1rem' }} />
          )}
          <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '1rem' }}>
            {phase === 'physical' ? '🧘 Pausdags!' : '📧 Mejl-batch'}
          </h1>
          <div style={{ fontSize: '3rem', fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p style={{ color: 'var(--e-text-secondary)' }}>
            {phase === 'physical'
              ? isShortBreak
                ? 'Kort paus - sträck på benen'
                : 'Obligatorisk fysisk paus'
              : 'Max 10 min för mejl & samtal'}
          </p>
        </div>

        {phase === 'physical' ? (
          <div style={{ backgroundColor: '#ecfdf5', borderRadius: '0.75rem', padding: '1.5rem', border: '2px solid #10b981' }}>
            <h3 style={{ fontWeight: 'bold', color: '#10b981', marginBottom: '1rem' }}>
              📚 Forskning säger:
            </h3>
            <p style={{ color: '#10b981', marginBottom: '1rem' }}>
              Din prefrontala cortex (beslutsfattande/fokus) behöver bli av med metaboliska avfallsprodukter.
              Detta sker genom blodomflöde vid rörelse, INTE fortsatt kognitiv aktivitet.
            </p>
            <h3 style={{ fontWeight: '600', color: '#10b981', marginBottom: '0.5rem' }}>
              Gör något av detta:
            </h3>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: '#10b981' }}>
              <li>✅ Promenad (helst utomhus)</li>
              <li>✅ Stretching/lätt rörelse</li>
              <li>✅ Fika utan skärmar</li>
              <li>✅ Stirra ut genom fönster och dagdrömma</li>
              <li>❌ INTE mejl/sociala medier</li>
              <li>❌ INTE fortsätt jobba</li>
            </ul>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--e-border)', borderRadius: '0.75rem', padding: '1.5rem', border: '2px solid var(--e-border)' }}>
            <h3 style={{ fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '0.75rem' }}>
              ⏱️ Timeboxad mejl-tid
            </h3>
            <p style={{ color: 'var(--e-text-secondary)', marginBottom: '1rem' }}>
              Max 10 minuter för mejl och samtal. När tiden är ute, stoppa omedelbart!
            </p>
            <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
              <li>• Svara på brådskande mejl</li>
              <li>• Ring nödvändiga samtal</li>
              <li>• Resten väntar till nästa batch</li>
            </ul>
          </div>
        )}

        <Button
          onClick={handleContinue}
          variant="secondary"
          style={{ width: '100%', marginTop: '1.5rem', height: '48px' }}
        >
          Hoppa över och fortsätt
        </Button>
      </div>
    </div>
  );
}
