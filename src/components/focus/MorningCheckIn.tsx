import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { DailyCheckIn, EnergyLevel, FocusStrategy } from '@/lib/types';
import { Sun, Battery, BatteryMedium, BatteryLow, Zap, Target, BarChart } from 'lucide-react';

export function MorningCheckIn() {
  const navigate = useNavigate();
  const [availableTime, setAvailableTime] = useState<number>(240); // 4h default
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>('medium');
  const [strategy, setStrategy] = useState<FocusStrategy>('balanced');

  // Kolla om redan gjort check-in idag
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const stored = localStorage.getItem('daily_checkin');

    if (stored) {
      const data: DailyCheckIn = JSON.parse(stored);
      if (data.date === today) {
        // Redan gjort check-in, gå till focus
        navigate('/focus');
      }
    }
  }, [navigate]);

  const handleSubmit = () => {
    const today = new Date().toISOString().split('T')[0];
    const checkIn: DailyCheckIn = {
      date: today,
      availableTime,
      energyLevel,
      strategy
    };

    localStorage.setItem('daily_checkin', JSON.stringify(checkIn));
    navigate('/focus');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        <div className="text-center mb-8">
          <Sun className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            God morgon! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Låt oss planera din dag
          </p>
        </div>

        <div className="space-y-8">
          {/* Tillgänglig tid */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hur mycket fokuserad tid har du idag?
            </label>
            <div className="grid grid-cols-4 gap-3">
              {[120, 240, 360, 480].map(mins => (
                <Button
                  key={mins}
                  variant={availableTime === mins ? 'primary' : 'secondary'}
                  onClick={() => setAvailableTime(mins)}
                  className="h-20"
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold">{mins / 60}h</div>
                    <div className="text-xs opacity-75">{mins} min</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Energinivå */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hur är din energinivå just nu?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={energyLevel === 'low' ? 'primary' : 'secondary'}
                onClick={() => setEnergyLevel('low')}
                className="h-24"
              >
                <div className="text-center">
                  <BatteryLow className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Låg</div>
                  <div className="text-xs opacity-75">Tar det lugnt</div>
                </div>
              </Button>
              <Button
                variant={energyLevel === 'medium' ? 'primary' : 'secondary'}
                onClick={() => setEnergyLevel('medium')}
                className="h-24"
              >
                <div className="text-center">
                  <BatteryMedium className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Medel</div>
                  <div className="text-xs opacity-75">Normal dag</div>
                </div>
              </Button>
              <Button
                variant={energyLevel === 'high' ? 'primary' : 'secondary'}
                onClick={() => setEnergyLevel('high')}
                className="h-24"
              >
                <div className="text-center">
                  <Battery className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Hög</div>
                  <div className="text-xs opacity-75">Full fart!</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Strategi */}
          <div>
            <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Vad känner du för idag?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant={strategy === 'quick_wins' ? 'primary' : 'secondary'}
                onClick={() => setStrategy('quick_wins')}
                className="h-24"
              >
                <div className="text-center">
                  <Zap className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Quick Wins</div>
                  <div className="text-xs opacity-75">Många korta</div>
                </div>
              </Button>
              <Button
                variant={strategy === 'deep_work' ? 'primary' : 'secondary'}
                onClick={() => setStrategy('deep_work')}
                className="h-24"
              >
                <div className="text-center">
                  <Target className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Deep Work</div>
                  <div className="text-xs opacity-75">Få långa</div>
                </div>
              </Button>
              <Button
                variant={strategy === 'balanced' ? 'primary' : 'secondary'}
                onClick={() => setStrategy('balanced')}
                className="h-24"
              >
                <div className="text-center">
                  <BarChart className="h-8 w-8 mx-auto mb-2" />
                  <div className="font-semibold">Balanserat</div>
                  <div className="text-xs opacity-75">AI väljer</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            className="w-full h-14 text-lg"
          >
            Visa min första uppgift →
          </Button>
        </div>
      </div>
    </div>
  );
}
