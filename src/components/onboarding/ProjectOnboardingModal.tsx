import { useState } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { FolderKanban, Sparkles, Calculator, TrendingUp, FileText, ArrowRight, CheckCircle } from 'lucide-react';

interface ProjectOnboardingModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function ProjectOnboardingModal({ isOpen, onComplete }: ProjectOnboardingModalProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_project_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_project_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleSkip} title="Välkommen till Projekthantering" size="lg">
      {/* Progress Indicator */}
      <div className="flex gap-2 mb-6">
        {[1, 2, 3, 4, 5].map(s => (
          <div
            key={s}
            className={`h-2 flex-1 rounded transition-all ${
              s <= step ? 'bg-amber-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
        Steg {step} av 5
      </div>

      {/* Steg 1: Vad är projekthantering? */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">💼</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Hantera kundprojekt med ekonomi
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Håll koll på budget, timmar och leveranser
            </p>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 border-2 border-sand-300 dark:border-charcoal-700 rounded-xl p-6">
            <h3 className="font-bold text-stone-600 dark:text-sand-100 mb-3 flex items-center gap-2">
              <FolderKanban className="h-6 w-6" />
              Vad kan du göra?
            </h3>
            <div className="space-y-3 text-stone-600 dark:text-sand-200">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Skapa projekt med <strong>offererade timmar</strong> och <strong>timpris</strong></p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Se <strong>auto-beräknad total budget</strong> (timmar × pris + övriga kostnader)</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Spåra <strong>completion %</strong> och få budget-varningar</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>Koppla tasks till projekt för <strong>automatisk tidsspårning</strong></p>
              </div>
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

      {/* Steg 2: AI-driven skapande */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <Sparkles className="h-16 w-16 text-purple-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              AI-driven projektinmatning
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Skapa projekt super snabbt med naturligt språk
            </p>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-copper-100 dark:from-purple-900/20 dark:to-charcoal-850 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6">
            <h3 className="font-bold text-purple-900 dark:text-purple-100 mb-4 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Så här fungerar det:
            </h3>

            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Du säger:</p>
                <div className="bg-sand-100 dark:bg-charcoal-850 rounded p-3 font-medium text-stone-600 dark:text-sand-100">
                  "Nytt projekt Wallenstam slutrapport, 40 timmar, 1950 per timme, 2000 i resor, deadline 1 december"
                </div>
              </div>

              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-purple-500" />
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Claude skapar automatiskt:</p>
                <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>✅ Projektnamn: "Wallenstam slutrapport"</li>
                  <li>✅ Klient: "Wallenstam"</li>
                  <li>✅ Offererade timmar: 40h</li>
                  <li>✅ Timpris: 1 950 kr/h</li>
                  <li>✅ Övriga kostnader: 2 000 kr</li>
                  <li>✅ Total budget: <strong>80 000 kr</strong></li>
                  <li>✅ Deadline: 1 december 2025</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-300 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>💡 Tips:</strong> Använd AI-chatten (högst ner till höger) eller röstkommando
              för att skapa projekt blixtnabbt!
            </p>
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

      {/* Steg 3: Budget & Ekonomi */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <Calculator className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Auto-beräknad ekonomi
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Håll koll på budget och lönsamhet i realtid
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Total Budget
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mb-2">
                Beräknas automatiskt när du skapar projekt:
              </p>
              <div className="bg-white dark:bg-gray-800 rounded p-3 font-mono text-sm">
                Budget = (Timmar × Timpris) + Övriga kostnader
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                Exempel: (40h × 1 950 kr/h) + 2 000 kr = <strong>80 000 kr</strong>
              </p>
            </div>

            <div className="bg-sand-100 dark:bg-charcoal-850 border border-sand-300 dark:border-charcoal-700 rounded-lg p-4">
              <h4 className="font-bold text-stone-600 dark:text-sand-100 mb-2 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Completion % (kommer i Fas 2)
              </h4>
              <p className="text-sm text-stone-600 dark:text-sand-200">
                Du kommer kunna sätta completion % med reglage och få:
              </p>
              <ul className="text-xs text-stone-600 dark:text-sand-300 mt-2 space-y-1 list-disc list-inside">
                <li>Återstående timmar att fakturera</li>
                <li>Förbrukad budget hittills</li>
                <li>Varningar om du går över budget</li>
              </ul>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                PDF-upload (tillgängligt nu!)
              </h4>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Dra in en PDF-offert så extraherar Claude automatiskt:
              </p>
              <ul className="text-xs text-purple-700 dark:text-purple-300 mt-2 space-y-1 list-disc list-inside">
                <li>Projektnamn från offertens titel</li>
                <li>Kund från mottagare</li>
                <li>Timmar och timpris från prislista</li>
                <li>Externa kostnader från specifikation</li>
              </ul>
            </div>
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

      {/* Steg 4: PDF-upload NYTT! */}
      {step === 4 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="relative inline-block">
              <FileText className="h-16 w-16 text-amber-500 mx-auto mb-4" />
              <Sparkles className="h-8 w-8 text-purple-500 absolute -top-2 -right-2 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              AI PDF-upload är här! 🎉
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Skapa projekt från offert-PDF på 15 sekunder
            </p>
          </div>

          <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-6">
            <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
              <Sparkles className="h-6 w-6" />
              Så här funkar det:
            </h3>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  1
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Gå till "Nytt projekt"
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Klicka på knappen "Ladda upp PDF"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  2
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Dra och släpp din offert-PDF
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Eller klicka för att välja fil
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  3
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Vänta 5-15 sekunder medan Claude analyserar
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    AI läser och extraherar all viktig info
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  4
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Granska och justera data om nödvändigt
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Formuläret fylls i automatiskt
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-sm">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                    Klicka "Skapa projekt" - klart!
                  </p>
                  <p className="text-xs text-green-800 dark:text-green-200">
                    Budget beräknas automatiskt
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 border border-purple-300 dark:border-purple-700">
            <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Vad extraheras automatiskt?
            </h4>
            <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
              <li>✅ Projektnamn (från offertens titel)</li>
              <li>✅ Kundnamn (från mottagare/beställare)</li>
              <li>✅ Offererade timmar (summerar olika poster)</li>
              <li>✅ Timpris (från prislista)</li>
              <li>✅ Externa kostnader (resor, material, licenser)</li>
              <li>✅ Deadline (från leveransdatum)</li>
              <li>✅ Beskrivning (sammanfattning av projektet)</li>
            </ul>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-300 dark:border-amber-700">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>💡 Tips:</strong> Fungerar bäst med strukturerade offerter som har tydliga rubriker
              och prisuppställning. Om något blir fel kan du enkelt justera manuellt!
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(3)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={() => setStep(5)} className="flex-1">
              Nästa <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {/* Steg 5: Kom igång */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Redo att skapa ditt första projekt!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Tre sätt att komma igång
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg border-2 border-amber-300 dark:border-amber-700">
              <div className="flex-shrink-0 w-8 h-8 bg-amber-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  PDF-upload (rekommenderat! ⚡)
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dra in en offert-PDF så extraherar Claude all info på 15 sekunder
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border-2 border-purple-300 dark:border-purple-700">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  AI-chat
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Öppna chatten (högst ner till höger) och skriv:<br />
                  <code className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded mt-1 inline-block">
                    "Nytt projekt för [Kund], [X] timmar, [Y] kr/h"
                  </code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-sand-100 to-sand-200 dark:from-charcoal-850 dark:to-charcoal-850 rounded-lg border-2 border-sand-300 dark:border-charcoal-700">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
                  <FolderKanban className="h-4 w-4" />
                  Manuellt formulär
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Klicka på <strong>"Nytt projekt"</strong> och fyll i formuläret
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-sand-100 to-sand-200 dark:from-charcoal-850 dark:to-charcoal-850 rounded-lg p-4 border border-sand-300 dark:border-charcoal-700">
            <p className="text-sm text-center text-stone-600 dark:text-sand-100">
              <strong>🎯 Nu kör vi!</strong> Skapa ditt första projekt och testa funktionerna.
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(4)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={handleComplete} className="flex-1 bg-green-600 hover:bg-green-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Kom igång!
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
