import { useState, useEffect } from 'react';
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import { SliderComponent } from '@syncfusion/ej2-react-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { DailyCheckIn, EnergyLevel, FocusStrategy } from '@/lib/types';

interface DailyCheckInDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (checkIn: DailyCheckIn) => void;
}

export function DailyCheckInDialog({ isOpen, onClose, onComplete }: DailyCheckInDialogProps) {
  const [step, setStep] = useState(1);
  const [availableTime, setAvailableTime] = useState(4); // Timmar istället för minuter
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [strategy, setStrategy] = useState<FocusStrategy>('balanced');

  // Reset när dialog öppnas
  useEffect(() => {
    if (isOpen) {
      setStep(1);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn: DailyCheckIn = {
      date: today,
      availableTime: availableTime * 60, // Konvertera timmar till minuter för backend
      energyLevel,
      strategy
    };

    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    onComplete(checkIn);
    onClose();
  };

  // Animation settings enligt SyncFusion best practice
  const animationSettings: AnimationSettingsModel = {
    effect: 'Zoom',
    duration: 300,
    delay: 0
  };

  // Dialog buttons enligt SyncFusion API
  const getDialogButtons = (): ButtonPropsModel[] => {
    if (step === 1) {
      return [
        {
          buttonModel: {
            content: 'Nästa →',
            isPrimary: true,
            cssClass: 'e-flat'
          },
          click: () => setStep(2)
        },
        {
          buttonModel: {
            content: 'Avbryt',
            cssClass: 'e-flat'
          },
          click: onClose
        }
      ];
    } else if (step === 2) {
      return [
        {
          buttonModel: {
            content: 'Nästa →',
            isPrimary: true,
            cssClass: 'e-flat'
          },
          click: () => setStep(3)
        },
        {
          buttonModel: {
            content: '← Tillbaka',
            cssClass: 'e-flat'
          },
          click: () => setStep(1)
        }
      ];
    } else {
      return [
        {
          buttonModel: {
            content: 'Klar! 🎯',
            isPrimary: true,
            cssClass: 'e-flat'
          },
          click: handleSubmit
        },
        {
          buttonModel: {
            content: '← Tillbaka',
            cssClass: 'e-flat'
          },
          click: () => setStep(2)
        }
      ];
    }
  };

  // Dialog content som JSX
  const getDialogContent = (): JSX.Element => {
    return (
      <div style={{ padding: '20px' }}>
        {/* Progress bar */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          {[1, 2, 3].map(s => (
            <div
              key={s}
              style={{
                flex: 1,
                height: '8px',
                borderRadius: '4px',
                backgroundColor: s <= step ? 'var(--primary-600)' : 'var(--e-border)'
              }}
            />
          ))}
        </div>

        <div style={{ textAlign: 'center', marginBottom: '16px', fontSize: '14px', color: 'var(--e-text-secondary)' }}>
          Steg {step} av 3
        </div>

        {step === 1 && (
          <>
            <h3 style={{ textAlign: 'center', marginBottom: '24px' }}>
              Hur många timmar kan du fokusera idag?
            </h3>
            <SliderComponent
              value={availableTime}
              min={0}
              max={8}
              step={0.5}
              tooltip={{ isVisible: true, placement: 'Before' }}
              ticks={{
                placement: 'After',
                largeStep: 2,
                smallStep: 1,
                showSmallTicks: false
              }}
              renderingTicks={(args: any) => {
                const hours = args.value;
                if (hours % 1 === 0) {
                  args.text = `${hours}h`;
                } else {
                  const h = Math.floor(hours);
                  args.text = `${h}h 30m`;
                }
              }}
              tooltipChange={(args: any) => {
                const hours = args.value;
                if (hours % 1 === 0) {
                  args.text = `${hours}h`;
                } else {
                  const h = Math.floor(hours);
                  args.text = `${h}h 30m`;
                }
              }}
              change={(e: any) => setAvailableTime(e.value)}
            />
          </>
        )}

        {step === 2 && (
          <>
            <h3 style={{ textAlign: 'center', marginBottom: '32px' }}>
              Hur är din energinivå?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ButtonComponent
                onClick={() => setEnergyLevel('high')}
                cssClass={energyLevel === 'high' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                🚀 Hög energi - redo för utmaningar!
              </ButtonComponent>
              <ButtonComponent
                onClick={() => setEnergyLevel('medium')}
                cssClass={energyLevel === 'medium' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                ⚡ Normal energi - stabil dag
              </ButtonComponent>
              <ButtonComponent
                onClick={() => setEnergyLevel('low')}
                cssClass={energyLevel === 'low' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                🔋 Låg energi - ta det lugnt
              </ButtonComponent>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 style={{ textAlign: 'center', marginBottom: '32px' }}>
              Vilken arbetsstrategi passar idag?
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ButtonComponent
                onClick={() => setStrategy('quick_wins')}
                cssClass={strategy === 'quick_wins' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                ✅ Quick Wins - många små uppgifter
              </ButtonComponent>
              <ButtonComponent
                onClick={() => setStrategy('deep_work')}
                cssClass={strategy === 'deep_work' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                🧠 Deep Work - få stora uppgifter
              </ButtonComponent>
              <ButtonComponent
                onClick={() => setStrategy('balanced')}
                cssClass={strategy === 'balanced' ? 'e-primary e-block' : 'e-outline e-block'}
              >
                ⚖️ Balanserad - mix av stort och smått
              </ButtonComponent>
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <DialogComponent
      width="90%"
      height="auto"
      header="Dagens avstämning"
      visible={isOpen}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      buttons={getDialogButtons()}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog"
      style={{ maxWidth: '800px', minWidth: '320px' } as any}
    >
      {getDialogContent()}
    </DialogComponent>
  );
}
