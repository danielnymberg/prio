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
      <div className="e-h-screen e-flex e-align-center e-justify-center e-p-16" style={{ background: 'linear-gradient(to bottom right, #ecfdf5, #d1fae5)' }}>
        <div className="e-rounded-xl e-p-32 e-w-full e-text-center" style={{ backgroundColor: 'var(--e-surface)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '42rem' }}>
          <div className="e-mb-24" style={{ fontSize: '60px' }}>🎉</div>
          <h1 className="e-text-2xl e-font-bold e-mb-16" style={{ color: 'var(--e-text)' }}>
            Pausen är klar!
          </h1>
          <p className="e-text-lg e-mb-16" style={{ color: 'var(--e-text-secondary)' }}>
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
    <div className="e-h-screen e-flex e-align-center e-justify-center e-p-16" style={{ background: 'linear-gradient(to bottom right, #fef3c7, #fed7aa)' }}>
      <div className="e-rounded-xl e-p-32 e-w-full" style={{ backgroundColor: 'var(--e-surface)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', maxWidth: '48rem' }}>
        <div className="e-text-center e-mb-16">
          {phase === 'physical' ? (
            <Coffee className="e-mx-auto e-mb-16" style={{ height: '80px', width: '80px', color: '#f59e0b' }} />
          ) : (
            <Mail className="e-mx-auto e-mb-16" style={{ height: '80px', width: '80px', color: 'var(--copper-500)' }} />
          )}
          <h1 className="e-text-2xl e-font-bold e-mb-16" style={{ color: 'var(--e-text)' }}>
            {phase === 'physical' ? '🧘 Pausdags!' : '📧 Mejl-batch'}
          </h1>
          <div className="e-font-bold e-mb-8" style={{ fontSize: '48px', fontFamily: 'monospace', color: 'var(--e-text)' }}>
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
          <div className="e-rounded-lg e-p-24" style={{ backgroundColor: '#ecfdf5', border: '2px solid #10b981' }}>
            <h3 className="e-font-bold e-mb-16" style={{ color: '#10b981' }}>
              📚 Forskning säger:
            </h3>
            <p className="e-mb-16" style={{ color: '#10b981' }}>
              Din prefrontala cortex (beslutsfattande/fokus) behöver bli av med metaboliska avfallsprodukter.
              Detta sker genom blodomflöde vid rörelse, INTE fortsatt kognitiv aktivitet.
            </p>
            <h3 className="e-font-semibold e-mb-8" style={{ color: '#10b981' }}>
              Gör något av detta:
            </h3>
            <ul className="e-flex e-flex-column e-gap-8 e-text-sm" style={{ color: '#10b981' }}>
              <li>✅ Promenad (helst utomhus)</li>
              <li>✅ Stretching/lätt rörelse</li>
              <li>✅ Fika utan skärmar</li>
              <li>✅ Stirra ut genom fönster och dagdrömma</li>
              <li>❌ INTE mejl/sociala medier</li>
              <li>❌ INTE fortsätt jobba</li>
            </ul>
          </div>
        ) : (
          <div className="e-rounded-lg e-p-24" style={{ backgroundColor: 'var(--e-border)', border: '2px solid var(--e-border)' }}>
            <h3 className="e-font-bold e-mb-12" style={{ color: 'var(--e-text)' }}>
              ⏱️ Timeboxad mejl-tid
            </h3>
            <p className="e-mb-16" style={{ color: 'var(--e-text-secondary)' }}>
              Max 10 minuter för mejl och samtal. När tiden är ute, stoppa omedelbart!
            </p>
            <ul className="e-flex e-flex-column e-gap-8 e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
              <li>• Svara på brådskande mejl</li>
              <li>• Ring nödvändiga samtal</li>
              <li>• Resten väntar till nästa batch</li>
            </ul>
          </div>
        )}

        <Button
          onClick={handleContinue}
          variant="secondary"
          className="e-w-full e-mt-24"
          style={{ height: '48px' }}
        >
          Hoppa över och fortsätt
        </Button>
      </div>
    </div>
  );
}
