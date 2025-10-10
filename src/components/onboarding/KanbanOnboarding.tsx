import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { KanbanSquare, Calendar, Undo2, FolderKanban, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

interface KanbanOnboardingProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function KanbanOnboarding({ isOpen, onComplete }: KanbanOnboardingProps) {
  const [step, setStep] = useState(1);

  const handleComplete = () => {
    localStorage.setItem('prio_kanban_onboarding_completed', 'true');
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem('prio_kanban_onboarding_completed', 'true');
    onComplete();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleSkip} title="✨ Nya kraftfulla funktioner!" size="lg">
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

      <div className="text-center mb-4 text-sm text-gray-600 dark:text-gray-400">
        Steg {step} av 3
      </div>

      {/* Steg 1: Kanban Board */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Kanban Board
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Visualisera ditt arbetsflöde och dra tasks mellan status
            </p>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 border-2 border-sand-300 dark:border-charcoal-700 rounded-xl p-6">
            <h3 className="font-bold text-stone-600 dark:text-sand-100 mb-3 flex items-center gap-2">
              <KanbanSquare className="h-6 w-6" />
              Vad är Kanban?
            </h3>
            <p className="text-stone-600 dark:text-sand-200 mb-4">
              En visuell metod för att hantera arbete. Se alla dina uppgifter i tre kolumner:
            </p>
            <div className="space-y-2 text-sm">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">📋</span>
                <div>
                  <strong>Ej påbörjad</strong> - Tasks som väntar
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">🚀</span>
                <div>
                  <strong>Pågående</strong> - Det du jobbar på nu
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <strong>Klar</strong> - Färdiga uppgifter
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <FolderKanban className="inline h-4 w-4 mr-1" />
              <strong>Swimlanes för projekt:</strong> Tasks grupperas automatiskt per projekt så du ser strukturen tydligt!
            </p>
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

      {/* Steg 2: Drag-and-Drop till Kalender */}
      {step === 2 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🗓️</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Drag-and-Drop Schemaläggning
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Dra tasks direkt från Kanban till kalendern
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <h4 className="font-bold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Kanban + Kalender
              </h4>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                Den nya kombinerade vyn visar Kanban och kalender sida vid sida. Dra tasks till en kalendercell för att schemalägga när du ska jobba på dem!
              </p>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-3 text-xs">
                <strong>📍 Hitta den här:</strong> Sidebar → Avancerat → "Kanban + Kalender"
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                <Undo2 className="h-5 w-5" />
                Ångra-funktion
              </h4>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                När du schemalägger en task visas en notifikation med "Ångra"-knapp. Du har 5 sekunder på dig att ändra dig!
              </p>
            </div>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-4">
            <p className="text-sm text-stone-600 dark:text-sand-200">
              <strong>💡 Tips:</strong> Du kan också dra tasks mellan projekt genom att dra dem mellan swimlanes i Kanban-vyn!
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

      {/* Steg 3: Kom igång */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Prova de nya funktionerna!
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Här är snabbguiden för att komma igång
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Öppna Kanban-vyn
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Gå till Sidebar → "Kanban" för standalone-vy eller "Kanban + Kalender" för kombinerad vy
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Dra och släpp
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dra tasks mellan kolumner för att ändra status, eller till kalendern för att schemalägga
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 w-8 h-8 bg-copper-600 text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                  Klicka för detaljer
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Klicka på en task i Kanban för att öppna detaljvyn och redigera alla fält
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <p className="text-sm text-center text-purple-900 dark:text-purple-100">
              <Sparkles className="inline h-4 w-4 mr-1" />
              <strong>Byggt med Syncfusion:</strong> Professionella UI-komponenter för bästa möjliga UX!
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setStep(2)} className="flex-1">
              Tillbaka
            </Button>
            <Button onClick={handleComplete} className="flex-1">
              <CheckCircle className="h-4 w-4 mr-2" />
              Kom igång!
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
