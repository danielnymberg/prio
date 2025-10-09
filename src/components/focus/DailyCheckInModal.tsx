import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Dagens avstämning"
      size="lg"
    >
      {/* Progress Indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`h-2 flex-1 rounded transition-all ${
              s <= step ? 'bg-copper-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      <div className="text-center mb-2 text-sm text-gray-600 dark:text-gray-400">
        Steg {step} av 3
      </div>

      {/* Step 1: Tillgänglig tid */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Hur mycket tid har du för fokusarbete idag?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Detta hjälper oss föreslå rätt uppgifter
            </p>
          </div>

          <div className="space-y-4">
            <div className="text-center">
              <div className="text-5xl font-bold text-copper-600 mb-2">
                {formatTime(availableTime)}
              </div>
              <div className="text-sm text-gray-500">
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
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
            />

            <div className="flex justify-between text-xs text-gray-500">
              <span>0h</span>
              <span>2h</span>
              <span>4h</span>
              <span>6h</span>
              <span>8h</span>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            className="w-full h-12"
            disabled={availableTime === 0}
          >
            Nästa →
          </Button>
        </div>
      )}

      {/* Step 2: Energinivå */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Hur är din energinivå?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Vi anpassar uppgifterna efter din energi
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setEnergyLevel('low')}
              className={`p-6 rounded-xl border-2 transition-all ${
                energyLevel === 'low'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <BatteryLow className="h-12 w-12 mx-auto mb-3 text-orange-500" />
              <div className="font-semibold text-gray-900 dark:text-white">Låg</div>
              <div className="text-xs text-gray-500 mt-1">Trött, dämpad</div>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('medium')}
              className={`p-6 rounded-xl border-2 transition-all ${
                energyLevel === 'medium'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <BatteryMedium className="h-12 w-12 mx-auto mb-3 text-yellow-500" />
              <div className="font-semibold text-gray-900 dark:text-white">Medel</div>
              <div className="text-xs text-gray-500 mt-1">Normal, stabil</div>
            </button>

            <button
              type="button"
              onClick={() => setEnergyLevel('high')}
              className={`p-6 rounded-xl border-2 transition-all ${
                energyLevel === 'high'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg scale-105'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <Battery className="h-12 w-12 mx-auto mb-3 text-green-500" />
              <div className="font-semibold text-gray-900 dark:text-white">Hög</div>
              <div className="text-xs text-gray-500 mt-1">Energisk, fokuserad</div>
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(1)}
              className="flex-1"
            >
              ← Tillbaka
            </Button>
            <Button
              onClick={() => setStep(3)}
              className="flex-1"
            >
              Nästa →
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Strategi */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Vad är din strategi idag?
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Välj hur du vill arbeta
            </p>
          </div>

          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setStrategy('quick_wins')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                strategy === 'quick_wins'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <Zap className="h-8 w-8 text-yellow-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    ⚡ Quick Wins
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Många små uppgifter för att bygga momentum och känna framsteg
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('deep_work')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                strategy === 'deep_work'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-4">
                <Target className="h-8 w-8 text-purple-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    🧠 Deep Work
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Få stora uppgifter som kräver djupt fokus och concentration
                  </div>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setStrategy('balanced')}
              className={`w-full p-6 rounded-xl border-2 transition-all text-left ${
                strategy === 'balanced'
                  ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
              title="Blandning av korta och långa uppgifter baserat på CPM-algoritmen"
            >
              <div className="flex items-start gap-4">
                <BarChart className="h-8 w-8 text-copper-500 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-lg text-gray-900 dark:text-white mb-1">
                    ⚖️ Balanced
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Blandning av både korta och långa uppgifter - smart balansering
                  </div>
                </div>
              </div>
            </button>
          </div>

          <div className="flex gap-3">
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              className="flex-1"
            >
              ← Tillbaka
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
            >
              Klar! 🎯
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
