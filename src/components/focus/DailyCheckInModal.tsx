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
      <div className="e-flex e-gap-8 e-mb-24">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className="e-flex-1 e-rounded e-transition"
            style={{ height: '8px', backgroundColor: s <= step ? 'var(--primary-600)' : 'var(--e-border)' }}
          />
        ))}
      </div>

      <div className="e-text-center e-mb-8 e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
        Steg {step} av 3
      </div>

      {/* Step 1: Tillgänglig tid */}
      {step === 1 && (
        <div className="e-flex e-flex-column e-gap-24">
          <div className="e-text-center">
            <h3 className="e-text-xl e-font-bold e-mb-8" style={{ color: 'var(--e-text)' }}>
              Hur mycket tid har du för fokusarbete idag?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Detta hjälper oss föreslå rätt uppgifter
            </p>
          </div>

          <div className="e-flex e-flex-column e-gap-16">
            <div className="e-text-center">
              <div className="e-font-bold e-mb-8" style={{ fontSize: '48px', color: 'var(--primary-600)' }}>
                {formatTime(availableTime)}
              </div>
              <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
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

            <div className="e-flex e-justify-between e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
              <span>0h</span>
              <span>2h</span>
              <span>4h</span>
              <span>6h</span>
              <span>8h</span>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="e-w-full"
            style={{ height: '48px' }}
            disabled={availableTime === 0}
          >
            Nästa →
          </Button>
        </div>
      )}

      {/* Step 2: Energinivå */}
      {step === 2 && (
        <div className="e-flex e-flex-column e-gap-24">
          <div className="e-text-center">
            <h3 className="e-text-xl e-font-bold e-mb-8" style={{ color: 'var(--e-text)' }}>
              Hur är din energinivå?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Vi anpassar uppgifterna efter din energi
            </p>
          </div>

          <div className="e-grid e-grid-cols-3 e-gap-12">
            <Button
              onClick={() => setEnergyLevel('low')}
              variant={energyLevel === 'low' ? 'primary' : 'secondary'}
              className="e-p-24"
              style={{
                flexDirection: 'column',
                height: 'auto',
                textAlign: 'center'
              }}
            >
              <BatteryLow className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--error-500)' }} />
              <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Låg</div>
              <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Trött, dämpad</div>
            </Button>

            <Button
              onClick={() => setEnergyLevel('medium')}
              variant={energyLevel === 'medium' ? 'primary' : 'secondary'}
              className="e-p-24"
              style={{
                flexDirection: 'column',
                height: 'auto',
                textAlign: 'center'
              }}
            >
              <BatteryMedium className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--warning-500)' }} />
              <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Medel</div>
              <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Normal, stabil</div>
            </Button>

            <Button
              onClick={() => setEnergyLevel('high')}
              variant={energyLevel === 'high' ? 'primary' : 'secondary'}
              className="e-p-24"
              style={{
                flexDirection: 'column',
                height: 'auto',
                textAlign: 'center'
              }}
            >
              <Battery className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--success-500)' }} />
              <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Hög</div>
              <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Energisk, fokuserad</div>
            </Button>
          </div>

          <div className="e-flex e-gap-12">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="e-flex-1"
            >
              ← Tillbaka
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="e-flex-1"
            >
              Nästa →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Strategi */}
      {step === 3 && (
        <div className="e-flex e-flex-column e-gap-24">
          <div className="e-text-center">
            <h3 className="e-text-xl e-font-bold e-mb-8" style={{ color: 'var(--e-text)' }}>
              Vad är din strategi idag?
            </h3>
            <p style={{ color: 'var(--e-text-secondary)' }}>
              Välj hur du vill arbeta
            </p>
          </div>

          <div className="e-flex e-flex-column e-gap-12">
            <Button
              onClick={() => setStrategy('quick_wins')}
              variant={strategy === 'quick_wins' ? 'primary' : 'secondary'}
              className="e-w-full e-p-24"
              style={{
                height: 'auto',
                textAlign: 'left'
              }}
            >
              <div className="e-flex e-align-start e-gap-16">
                <Zap className="e-flex-none" style={{ height: '32px', width: '32px', color: 'var(--warning-500)' }} />
                <div>
                  <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                    ⚡ Quick Wins
                  </div>
                  <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                    Många små uppgifter för att bygga momentum och känna framsteg
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setStrategy('deep_work')}
              variant={strategy === 'deep_work' ? 'primary' : 'secondary'}
              className="e-w-full e-p-24"
              style={{
                height: 'auto',
                textAlign: 'left'
              }}
            >
              <div className="e-flex e-align-start e-gap-16">
                <Target style={{ height: '32px', width: '32px', color: 'var(--primary-500)' }} />
                <div>
                  <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                    🧠 Deep Work
                  </div>
                  <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                    Få stora uppgifter som kräver djupt fokus och concentration
                  </div>
                </div>
              </div>
            </Button>

            <Button
              onClick={() => setStrategy('balanced')}
              variant={strategy === 'balanced' ? 'primary' : 'secondary'}
              className="e-w-full e-p-24"
              style={{
                height: 'auto',
                textAlign: 'left'
              }}
              title="Blandning av korta och långa uppgifter baserat på CPM-algoritmen"
            >
              <div className="e-flex e-align-start e-gap-16">
                <BarChart style={{ height: '32px', width: '32px', color: 'var(--primary-500)' }} />
                <div>
                  <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                    ⚖️ Balanced
                  </div>
                  <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                    Blandning av både korta och långa uppgifter - smart balansering
                  </div>
                </div>
              </div>
            </Button>
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
