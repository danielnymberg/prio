import { useState } from 'react';
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import { NumericTextBoxComponent } from '@syncfusion/ej2-react-inputs';
import { DailyCheckIn, EnergyLevel, FocusStrategy } from '@/lib/types';

interface DagligCheckInProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (checkIn: DailyCheckIn) => void;
}

const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0
};

export function DagligCheckIn({ isOpen, onClose, onComplete }: DagligCheckInProps) {
  const [availableTime, setAvailableTime] = useState(4);
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [strategy, setStrategy] = useState<FocusStrategy>('balanced');

  const handleSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn: DailyCheckIn = {
      date: today,
      availableTime: availableTime * 60, // Konvertera timmar till minuter
      energyLevel,
      strategy
    };

    localStorage.setItem('prio-daily-checkin', JSON.stringify(checkIn));
    onComplete(checkIn);
    onClose();
  };

  const dialogButtons: ButtonPropsModel[] = [
    {
      buttonModel: {
        content: 'Klar',
        isPrimary: true,
        cssClass: 'e-primary'
      },
      click: handleSubmit
    },
    {
      buttonModel: {
        content: 'Avbryt',
        cssClass: 'e-flat'
      },
      click: onClose
    }
  ];

  // Villkorlig rendering enligt SF best practice
  if (!isOpen) return null;

  return (
    <DialogComponent
      width="min(95%, 700px)"
      header="Dagens avstämning"
      visible={true}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      buttons={dialogButtons}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog"
    >
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

        {/* Tillgänglig tid */}
        <div>
          <label style={{ display: 'block', marginBottom: '16px', fontWeight: 600 }}>
            Hur många timmar kan du fokusera idag?
          </label>
          <NumericTextBoxComponent
            value={availableTime}
            min={0.5}
            max={6}
            step={0.5}
            format="n1"
            placeholder="Timmar"
            floatLabelType="Auto"
            change={(e: any) => setAvailableTime(e.value)}
            width="200px"
          />
        </div>

        {/* Energinivå */}
        <div>
          <label style={{ display: 'block', marginBottom: '16px', fontWeight: 600 }}>
            Hur är din energinivå?
          </label>
          <div className="e-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="radio"
              id="energy-high"
              name="energy"
              value="high"
              checked={energyLevel === 'high'}
              onChange={() => setEnergyLevel('high')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="energy-high" style={{ textAlign: 'left' }}>
              🚀 Hög energi - redo för utmaningar!
            </label>

            <input
              type="radio"
              id="energy-medium"
              name="energy"
              value="medium"
              checked={energyLevel === 'medium'}
              onChange={() => setEnergyLevel('medium')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="energy-medium" style={{ textAlign: 'left' }}>
              ⚡ Normal energi - stabil dag
            </label>

            <input
              type="radio"
              id="energy-low"
              name="energy"
              value="low"
              checked={energyLevel === 'low'}
              onChange={() => setEnergyLevel('low')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="energy-low" style={{ textAlign: 'left' }}>
              🔋 Låg energi - ta det lugnt
            </label>
          </div>
        </div>

        {/* Strategi */}
        <div>
          <label style={{ display: 'block', marginBottom: '16px', fontWeight: 600 }}>
            Vilken arbetsstrategi passar idag?
          </label>
          <div className="e-btn-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="radio"
              id="strategy-quick"
              name="strategy"
              value="quick_wins"
              checked={strategy === 'quick_wins'}
              onChange={() => setStrategy('quick_wins')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="strategy-quick" style={{ textAlign: 'left' }}>
              ✅ Quick Wins - många små uppgifter
            </label>

            <input
              type="radio"
              id="strategy-deep"
              name="strategy"
              value="deep_work"
              checked={strategy === 'deep_work'}
              onChange={() => setStrategy('deep_work')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="strategy-deep" style={{ textAlign: 'left' }}>
              🧠 Deep Work - få stora uppgifter
            </label>

            <input
              type="radio"
              id="strategy-balanced"
              name="strategy"
              value="balanced"
              checked={strategy === 'balanced'}
              onChange={() => setStrategy('balanced')}
              style={{ display: 'none' }}
            />
            <label className="e-btn" htmlFor="strategy-balanced" style={{ textAlign: 'left' }}>
              ⚖️ Balanserad - mix av stort och smått
            </label>
          </div>
        </div>

      </div>
    </DialogComponent>
  );
}
