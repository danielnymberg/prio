import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { DailyCheckIn, EnergyLevel, FocusStrategy } from '@/lib/types';
import { Battery, BatteryMedium, BatteryLow, Zap, Target, BarChart } from 'lucide-react';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (checkIn: DailyCheckIn) => void;
}

export function DailyCheckInModal({ isOpen, onClose, onComplete }: DailyCheckInModalProps) {
  const [step, setStep] = useState(1);
  const [availableTime, setAvailableTime] = useState(240); // 4h default
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [strategy, setStrategy] = useState<FocusStrategy>('balanced');

  const handleSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn: DailyCheckIn = {
      date: today,
      availableTime,
      energyLevel,
      strategy
    };

    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    onComplete(checkIn);
    onClose();
  };

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Dagens avstämning"
      size="lg"
    >
      {/* Progress Indicator */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[1, 2, 3].map(s => (
          <div
            key={s}
            style={{
              height: '8px',
              flex: 1,
              borderRadius: '4px',
              transition: 'all 0.2s',
              backgroundColor: s <= step ? 'var(--copper-600)' : 'var(--e-border)'
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: '0.5rem', fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
        Steg {step} av 3
      </div>

      {/* Step 1: Tillgänglig tid */}
      {step === 1 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Hur mycket tid har du för fokusarbete idag?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Detta hjälper oss föreslå rätt uppgifter
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', fontWeight: 'bold', color: 'var(--copper-600)', marginBottom: '0.5rem' }}>
                {formatTime(availableTime)}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
                {availableTime} minuter
              </div>
            </div>

            <input
              type="range"
              min="0"
              max="480"
              step="30"
              value={availableTime}
              onChange={(e) => setAvailableTime(Number(e.target.value))}
              style={{ width: '100%', height: '12px', cursor: 'pointer' }}
            />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--e-text-secondary)' }}>
              <span>0h</span>
              <span>2h</span>
              <span>4h</span>
              <span>6h</span>
              <span>8h</span>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            style={{ width: '100%', height: '48px' }}
            disabled={availableTime === 0}
          >
            Nästa →
          </Button>
        </div>
      )}

      {/* Step 2: Energinivå */}
      {step === 2 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Hur är din energinivå?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Vi anpassar uppgifterna efter din energi
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setEnergyLevel('low')}
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                border: energyLevel === 'low' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: energyLevel === 'low' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: energyLevel === 'low' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transform: energyLevel === 'low' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <BatteryLow style={{ height: '48px', width: '48px', margin: '0 auto 12px', color: '#f97316' }} />
              <div style={{ fontWeight: '600', color: 'var(--e-text)' }}>Låg</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '4px' }}>Trött, dämpad</div>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('medium')}
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                border: energyLevel === 'medium' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: energyLevel === 'medium' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: energyLevel === 'medium' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transform: energyLevel === 'medium' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <BatteryMedium style={{ height: '48px', width: '48px', margin: '0 auto 12px', color: '#eab308' }} />
              <div style={{ fontWeight: '600', color: 'var(--e-text)' }}>Medel</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '4px' }}>Normal, stabil</div>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('high')}
              style={{
                padding: '1.5rem',
                borderRadius: '12px',
                border: energyLevel === 'high' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: energyLevel === 'high' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: energyLevel === 'high' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transform: energyLevel === 'high' ? 'scale(1.05)' : 'scale(1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
            >
              <Battery style={{ height: '48px', width: '48px', margin: '0 auto 12px', color: '#22c55e' }} />
              <div style={{ fontWeight: '600', color: 'var(--e-text)' }}>Hög</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '4px' }}>Energisk, fokuserad</div>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              style={{ flex: 1 }}
            >
              ← Tillbaka
            </Button>
            <Button
              onClick={() => setStep(3)}
              style={{ flex: 1 }}
            >
              Nästa →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Strategi */}
      {step === 3 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Vad är din strategi idag?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Välj hur du vill arbeta
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={() => setStrategy('quick_wins')}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '12px',
                border: strategy === 'quick_wins' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: strategy === 'quick_wins' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: strategy === 'quick_wins' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <Zap style={{ height: '32px', width: '32px', color: '#eab308', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', color: 'var(--e-text)', marginBottom: '4px' }}>
                    ⚡ Quick Wins
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
                    Många små uppgifter för att bygga momentum och känna framsteg
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('deep_work')}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '12px',
                border: strategy === 'deep_work' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: strategy === 'deep_work' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: strategy === 'deep_work' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <Target style={{ height: '32px', width: '32px', color: '#a855f7', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', color: 'var(--e-text)', marginBottom: '4px' }}>
                    🧠 Deep Work
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
                    Få stora uppgifter som kräver djupt fokus och concentration
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('balanced')}
              style={{
                width: '100%',
                padding: '1.5rem',
                borderRadius: '12px',
                border: strategy === 'balanced' ? '2px solid var(--copper-500)' : '2px solid var(--e-border)',
                backgroundColor: strategy === 'balanced' ? 'var(--e-surface-secondary)' : 'var(--e-surface)',
                boxShadow: strategy === 'balanced' ? '0 10px 15px -3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.2s',
                textAlign: 'left',
                cursor: 'pointer'
              }}
              title="Blandning av korta och långa uppgifter baserat på CPM-algoritmen"
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <BarChart style={{ height: '32px', width: '32px', color: 'var(--copper-500)', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem', color: 'var(--e-text)', marginBottom: '4px' }}>
                    ⚖️ Balanced
                  </div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)' }}>
                    Blandning av både korta och långa uppgifter - smart balansering
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              style={{ flex: 1 }}
            >
              ← Tillbaka
            </Button>
            <Button
              onClick={handleSubmit}
              style={{ flex: 1 }}
            >
              Klar! 🎯
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
