import { useState, useRef, useEffect } from 'react';
import { DialogComponent, AnimationSettingsModel } from '@syncfusion/ej2-react-popups';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { SliderComponent } from '@syncfusion/ej2-react-inputs';
import { DailyCheckIn, EnergyLevel, FocusStrategy } from '@/lib/types';
import { Battery, BatteryMedium, BatteryLow, Zap, Target, BarChart } from 'lucide-react';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (checkIn: DailyCheckIn) => void;
}

const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0,
};

export function DailyCheckInModal({ isOpen, onClose, onComplete }: DailyCheckInModalProps) {
  const dialogRef = useRef<DialogComponent>(null);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [step, setStep] = useState(1);
  const [availableTime, setAvailableTime] = useState(240); // 4h default
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [strategy, setStrategy] = useState<FocusStrategy>('balanced');

  // Track if dialog has ever been opened
  useEffect(() => {
    if (isOpen) {
      setHasBeenOpened(true);
      setStep(1); // Reset to step 1 when opening
    }
  }, [isOpen]);

  // Sync visible state with isOpen prop
  useEffect(() => {
    if (!dialogRef.current || !hasBeenOpened) return;

    try {
      if (isOpen) {
        dialogRef.current.show();
      } else {
        dialogRef.current.hide();
      }
    } catch (e) {
      console.warn('Dialog state sync error:', e);
    }
  }, [isOpen, hasBeenOpened]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialogRef.current) {
        try {
          dialogRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

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

  // Don't render until first open
  if (!hasBeenOpened) {
    return null;
  }

  return (
    <DialogComponent
      ref={dialogRef}
      visible={isOpen}
      header="Dagens avstämning"
      showCloseIcon={true}
      width="800px"
      isModal={true}
      close={onClose}
      animationSettings={animationSettings}
      enableResize={false}
      allowDragging={false}
      closeOnEscape={true}
      target="body"
      zIndex={1000}
      created={() => {
        if (isOpen && dialogRef.current) {
          dialogRef.current.show();
        }
      }}
    >
      <div style={{ padding: '20px' }}>
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

              <SliderComponent
                min={0}
                max={480}
                step={30}
                value={availableTime}
                change={(e) => setAvailableTime(e.value)}
                type="MinRange"
                ticks={{ placement: 'After', largeStep: 120, smallStep: 30, showSmallTicks: false }}
                tooltip={{ isVisible: true, placement: 'Before', showOn: 'Hover' }}
              />

              <div className="e-flex e-justify-between e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                <span>0h</span>
                <span>2h</span>
                <span>4h</span>
                <span>6h</span>
                <span>8h</span>
              </div>
            </div>

            <ButtonComponent
              onClick={() => setStep(2)}
              isPrimary={true}
              content="Nästa"
              cssClass="e-w-full"
            />
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
              <ButtonComponent
                onClick={() => setEnergyLevel('low')}
                cssClass={energyLevel === 'low' ? 'e-primary e-round' : 'e-outline e-round'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
                  <BatteryLow className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--error-500)' }} />
                  <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Låg</div>
                  <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Trött, dämpad</div>
                </div>
              </ButtonComponent>

              <ButtonComponent
                onClick={() => setEnergyLevel('medium')}
                cssClass={energyLevel === 'medium' ? 'e-primary e-round' : 'e-outline e-round'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
                  <BatteryMedium className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--warning-500)' }} />
                  <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Medel</div>
                  <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Normal, stabil</div>
                </div>
              </ButtonComponent>

              <ButtonComponent
                onClick={() => setEnergyLevel('high')}
                cssClass={energyLevel === 'high' ? 'e-primary e-round' : 'e-outline e-round'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '24px' }}>
                  <Battery className="e-mx-auto e-mb-12" style={{ height: '48px', width: '48px', color: 'var(--success-500)' }} />
                  <div className="e-font-semibold" style={{ color: 'var(--e-text)' }}>Hög</div>
                  <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>Energisk, fokuserad</div>
                </div>
              </ButtonComponent>
            </div>

            <div className="e-flex e-gap-12">
              <ButtonComponent
                cssClass="e-link e-flex-1"
                onClick={() => setStep(1)}
                content="← Tillbaka"
              />
              <ButtonComponent
                cssClass="e-primary e-round e-flex-1"
                onClick={() => setStep(3)}
                content="Nästa →"
              />
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
              <ButtonComponent
                onClick={() => setStrategy('quick_wins')}
                cssClass={strategy === 'quick_wins' ? 'e-primary e-round e-w-full' : 'e-outline e-round e-w-full'}
              >
                <div className="e-flex e-align-start e-gap-16" style={{ padding: '24px' }}>
                  <Zap className="e-flex-none" style={{ height: '32px', width: '32px', color: 'var(--warning-500)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                      ⚡ Quick Wins
                    </div>
                    <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                      Många små uppgifter för att bygga momentum och känna framsteg
                    </div>
                  </div>
                </div>
              </ButtonComponent>

              <ButtonComponent
                onClick={() => setStrategy('deep_work')}
                cssClass={strategy === 'deep_work' ? 'e-primary e-round e-w-full' : 'e-outline e-round e-w-full'}
              >
                <div className="e-flex e-align-start e-gap-16" style={{ padding: '24px' }}>
                  <Target style={{ height: '32px', width: '32px', color: 'var(--primary-500)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                      🧠 Deep Work
                    </div>
                    <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                      Få stora uppgifter som kräver djupt fokus och concentration
                    </div>
                  </div>
                </div>
              </ButtonComponent>

              <ButtonComponent
                onClick={() => setStrategy('balanced')}
                cssClass={strategy === 'balanced' ? 'e-primary e-round e-w-full' : 'e-outline e-round e-w-full'}
              >
                <div className="e-flex e-align-start e-gap-16" style={{ padding: '24px' }}>
                  <BarChart style={{ height: '32px', width: '32px', color: 'var(--primary-500)' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div className="e-font-semibold e-text-lg e-mb-4" style={{ color: 'var(--e-text)' }}>
                      ⚖️ Balanced
                    </div>
                    <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
                      Blandning av både korta och långa uppgifter - smart balansering
                    </div>
                  </div>
                </div>
              </ButtonComponent>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <ButtonComponent
                cssClass="e-link e-flex-1"
                onClick={() => setStep(2)}
                content="← Tillbaka"
              />
              <ButtonComponent
                cssClass="e-primary e-round e-flex-1"
                onClick={handleSubmit}
                content="Klar! 🎯"
              />
            </div>
          </div>
        )}
      </div>
    </DialogComponent>
  );
}
