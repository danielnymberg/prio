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
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 max-w-2xl w-full text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Pausen är klar!
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8">
            {isShortBreak ? 'Nu är du redo igen!' : 'Dags för nästa session'}
          </p>
          <Button
            onClick={handleContinue}
            className="h-16 px-12 text-lg"
          >
            <ArrowRight className="h-6 w-6 mr-2" />
            Nästa uppgift
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-12 max-w-3xl w-full">
        <div className="text-center mb-8">
          {phase === 'physical' ? (
            <Coffee className="h-20 w-20 text-amber-500 mx-auto mb-4" />
          ) : (
            <Mail className="h-20 w-20 text-copper-500 mx-auto mb-4" />
          )}
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            {phase === 'physical' ? '🧘 Pausdags!' : '📧 Mejl-batch'}
          </h1>
          <div className="text-5xl font-mono font-bold text-gray-900 dark:text-white mb-2">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            {phase === 'physical'
              ? isShortBreak
                ? 'Kort paus - sträck på benen'
                : 'Obligatorisk fysisk paus'
              : 'Max 10 min för mejl & samtal'}
          </p>
        </div>

        {phase === 'physical' ? (
          <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border-2 border-green-200 dark:border-green-800">
            <h3 className="font-bold text-green-900 dark:text-green-100 mb-4">
              📚 Forskning säger:
            </h3>
            <p className="text-green-800 dark:text-green-200 mb-4">
              Din prefrontala cortex (beslutsfattande/fokus) behöver bli av med metaboliska avfallsprodukter.
              Detta sker genom blodomflöde vid rörelse, INTE fortsatt kognitiv aktivitet.
            </p>
            <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              Gör något av detta:
            </h3>
            <ul className="space-y-2 text-sm text-green-700 dark:text-green-300">
              <li>✅ Promenad (helst utomhus)</li>
              <li>✅ Stretching/lätt rörelse</li>
              <li>✅ Fika utan skärmar</li>
              <li>✅ Stirra ut genom fönster och dagdrömma</li>
              <li>❌ INTE mejl/sociala medier</li>
              <li>❌ INTE fortsätt jobba</li>
            </ul>
          </div>
        ) : (
          <div className="bg-sand-100 dark:bg-charcoal-850 rounded-xl p-6 border-2 border-sand-300 dark:border-charcoal-700">
            <h3 className="font-bold text-stone-600 dark:text-sand-100 mb-3">
              ⏱️ Timeboxad mejl-tid
            </h3>
            <p className="text-stone-600 dark:text-sand-200 mb-4">
              Max 10 minuter för mejl och samtal. När tiden är ute, stoppa omedelbart!
            </p>
            <ul className="space-y-2 text-sm text-stone-600 dark:text-sand-300">
              <li>• Svara på brådskande mejl</li>
              <li>• Ring nödvändiga samtal</li>
              <li>• Resten väntar till nästa batch</li>
            </ul>
          </div>
        )}

        <Button
          onClick={handleContinue}
          variant="secondary"
          className="w-full mt-6 h-12"
        >
          Hoppa över och fortsätt
        </Button>
      </div>
    </div>
  );
}
