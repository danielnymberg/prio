import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Target, Zap, Brain, AlertTriangle, ArrowRight, CheckCircle } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onClose?: () => void;
  onConnectMicrosoft?: () => Promise<void>;
  onSkip?: () => Promise<void>;
}

export function WelcomeModal({ isOpen, onComplete }: WelcomeModalProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleSkip} title="Välkommen till Prio" size="lg">
      {/* Progress Indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            className={`h-2 flex-1 rounded transition-all ${
              s <= step ? 'bg-copper-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
        Steg {step} av 4
      </div>

      {/* Steg 1: Välkommen & CPM-modellen */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Håll fokus på det som är viktigt
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Prio hjälper dig prioritera smartare med CPM-modellen
            </p>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 border-2 border-sand-300 dark:border-charcoal-700 rounded-xl p-6">
            <h3 className="font-bold text-stone-600 dark:text-sand-100 mb-3 flex items-center gap-2">
              <Target className="h-6 w-6" />
              Vad är CPM-modellen?
            </h3>
            <p className="text-stone-600 dark:text-sand-200 mb-4">
              <strong>Consequence-Priority Model</strong> är en forskningsbaserad metod som
              beräknar verklig prioritet baserat på faktiska konsekvenser - inte vad som känns brådskande.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 font-mono text-sm">
              Prioritet = (Värde × Tidskänslighet × Tillit) / Ansträngning
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={handleSkip} className="flex-1">
              Hoppa över
            </Button>
            <Button onClick={() => setStep(2)} className="flex-1">
              Nästa <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 2: CPM-parametrar */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              De fyra parametrarna
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              För varje uppgift bedömer du dessa fyra värden
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-bold text-green-900 dark:text-green-100 mb-2">
                💎 Värde (Value)
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200">
                Hur stora är de <strong>objektiva konsekvenserna</strong> om du gör/inte gör detta?
              </p>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                ⏱️ Tidskänslighet (Time-Sensitivity)
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Hur mycket <strong>kostar det att vänta</strong>? (Inte hur stressad du känner dig!)
              </p>
            </div>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-4">
              <h4 className="font-bold text-stone-600 dark:text-sand-100 mb-2">
                ✅ Tillit (Confidence)
              </h4>
              <p className="text-sm text-stone-600 dark:text-sand-200">
                Hur <strong>säker är du</strong> på att detta ger resultat?
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="font-bold text-red-900 dark:text-red-100 mb-2">
                💪 Ansträngning (Effort)
              </h4>
              <p className="text-sm text-red-800 dark:text-red-200">
                Hur mycket <strong>faktisk tid och energi</strong> krävs?
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(1)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={() => setStep(3)} className="flex-1">
              Nästa <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 3: Konsekvenstänkande */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Motverka "Urgency Bias"
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Forskning visar att vi systematiskt övervärderar brådska
            </p>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-3 flex items-center gap-2">
              <Brain className="h-6 w-6" />
              Mere Urgency Effect
            </h3>
            <p className="text-amber-800 dark:text-amber-200 mb-4">
              När vi är stressade väljer vi vad som <strong>känns brådskande</strong> istället
              för vad som faktiskt <strong>är viktigt</strong>.
            </p>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 space-y-2">
              <p className="text-sm font-semibold">Därför frågar Prio:</p>
              <ul className="text-sm space-y-1 list-disc list-inside text-gray-700 dark:text-gray-300">
                <li>Vad händer om 1 vecka om du INTE gör detta?</li>
                <li>Vad händer om 1 månad?</li>
                <li>Vad händer om 1 år?</li>
              </ul>
            </div>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-4">
            <p className="text-sm text-stone-600 dark:text-sand-200">
              <strong>💡 Tips:</strong> Om konsekvenserna är minimala efter 1 månad,
              är uppgiften förmodligen inte lika brådskande som den känns just nu.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={() => setStep(4)} className="flex-1">
              Nästa <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 4: Kom igång */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Du är redo!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Så här kommer du igång med Prio
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Gör din dagliga check-in
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Sätt din tillgängliga tid, energinivå och strategi för dagen
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Lägg till dina uppgifter
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Använd "Ny task" och fyll i CPM-parametrarna
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Gå till "Just Nu"
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Prio visar automatiskt den viktigaste uppgiften att börja med
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-sand-100 to-sand-200 dark:from-charcoal-850 dark:to-charcoal-850 rounded-lg p-4 border border-sand-300 dark:border-charcoal-700">
            <p className="text-sm text-center text-stone-600 dark:text-sand-100">
              <Zap className="inline h-4 w-4 mr-1" />
              <strong>Pro-tips:</strong> Använd "Wizard"-läget för att skapa uppgifter med guidning!
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={handleComplete} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Kom igång!
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
