import { useState, FormEvent } from 'react';
import { CreateTaskInput, UpdateTaskInput, Task } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { RangeSlider } from '@/components/ui/RangeSlider';
import { PriorityPreview } from '@/components/ui/PriorityPreview';
import { DurationPicker } from '@/components/ui/DurationPicker';
import { Alert } from '@/components/ui/Alert';
import { ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface TaskFormWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  task?: Task;
}

export function TaskFormWizard({ isOpen, onClose, onSubmit, task }: TaskFormWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Grundinfo
  const [title, setTitle] = useState(task?.title || '');
  const [description, setDescription] = useState(task?.description || '');
  const [projectId, setProjectId] = useState(task?.project_id || '');

  // Step 2: Konsekvenser
  const [consequence1Week, setConsequence1Week] = useState(task?.consequence_1week || '');
  const [consequence1Month, setConsequence1Month] = useState(task?.consequence_1month || '');
  const [consequence1Year, setConsequence1Year] = useState(task?.consequence_1year || '');
  const [consequenceDeadline, setConsequenceDeadline] = useState(
    task?.consequence_deadline ? task.consequence_deadline.split('T')[0] : ''
  );

  // Step 3: CPM-parametrar
  const [valueScore, setValueScore] = useState(task?.value_score || 5);
  const [timeSensitivity, setTimeSensitivity] = useState(task?.time_sensitivity || 5);
  const [confidence, setConfidence] = useState(task?.confidence || 7);
  const [effort, setEffort] = useState(task?.effort || 5);

  // Step 4: Detaljer
  const [deadline, setDeadline] = useState(task?.deadline ? task.deadline.split('T')[0] : '');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(task?.estimated_duration || null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const input = {
        title,
        description: description || undefined,
        project_id: projectId || undefined,
        value_score: valueScore,
        time_sensitivity: timeSensitivity,
        confidence,
        effort,
        consequence_1week: consequence1Week || undefined,
        consequence_1month: consequence1Month || undefined,
        consequence_1year: consequence1Year || undefined,
        consequence_deadline: consequenceDeadline || undefined,
        deadline: deadline || undefined,
        estimated_duration: estimatedDuration || undefined,
        status: task?.status || 'not_started',
      };

      await onSubmit(input);
      onClose();
      toast.success(task ? 'Task uppdaterad!' : 'Task skapad!');

      // Reset form
      setStep(1);
      setTitle('');
      setDescription('');
      setProjectId('');
      setConsequence1Week('');
      setConsequence1Month('');
      setConsequence1Year('');
      setConsequenceDeadline('');
      setValueScore(5);
      setTimeSensitivity(5);
      setConfidence(7);
      setEffort(5);
      setDeadline('');
      setEstimatedDuration(null);
    } catch (error) {
      console.error('Task form error:', error);
      toast.error('Kunde inte spara task');
    } finally {
      setLoading(false);
    }
  };

  const canGoNext = () => {
    if (step === 1) return title.trim().length > 0;
    return true;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Redigera task' : 'Ny task'}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        {/* Progress Indicator */}
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map(s => (
            <div
              key={s}
              className={`h-2 flex-1 rounded transition-all ${
                s <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
            />
          ))}
        </div>

        <div className="text-center mb-6 text-sm text-gray-600 dark:text-gray-400">
          Steg {step} av 4
        </div>

        {/* Step 1: Grundinfo */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Vad ska göras?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Beskriv uppgiften kortfattat
              </p>
            </div>

            <Input
              label="Titel"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="t.ex. Skicka offert till kund X"
              required
              autoFocus
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beskrivning (valfritt)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lägg till detaljer..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              />
            </div>

            <Input
              label="Projekt ID (valfritt)"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="t.ex. proj_123"
            />
          </div>
        )}

        {/* Step 2: Konsekvenser */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Om du INTE gör denna uppgift...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Tänk igenom de faktiska konsekvenserna
              </p>
            </div>

            <Alert variant="info" title="Motverkar urgency bias">
              Forskning visar att vi systematiskt prioriterar vad som känns brådskande över vad som
              faktiskt är viktigt. Dessa frågor hjälper dig se den verkliga prioriteten.
            </Alert>

            <Input
              label="Vad händer om 1 vecka?"
              value={consequence1Week}
              onChange={(e) => setConsequence1Week(e.target.value)}
              placeholder="t.ex. Kunden blir frustrerad, missar deadline"
            />

            <Input
              label="Vad händer om 1 månad?"
              value={consequence1Month}
              onChange={(e) => setConsequence1Month(e.target.value)}
              placeholder="t.ex. Tappar kunden, måste hitta ny"
            />

            <Input
              label="Vad händer om 1 år?"
              value={consequence1Year}
              onChange={(e) => setConsequence1Year(e.target.value)}
              placeholder="t.ex. Verksamheten förlorat trovärdighet"
            />

            <Input
              type="date"
              label="När träder konsekvensen i kraft? (valfritt)"
              value={consequenceDeadline}
              onChange={(e) => setConsequenceDeadline(e.target.value)}
            />
          </div>
        )}

        {/* Step 3: CPM-parametrar */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Prioritetsparametrar
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Beräknar automatiskt optimal prioritet
              </p>
            </div>

            <RangeSlider
              label="Värde - Objektiva konsekvenser"
              value={valueScore}
              onChange={setValueScore}
              min={1}
              max={10}
              description="Hur stora är de faktiska konsekvenserna?"
              formatValue={(v) => `${v}/10`}
              color="green"
            />

            <RangeSlider
              label="Tidskänslighet - Kostnad av fördröjning"
              value={timeSensitivity}
              onChange={setTimeSensitivity}
              min={1}
              max={10}
              description="Hur mycket kostar det att vänta?"
              formatValue={(v) => `${v}/10`}
              color="amber"
            />

            {timeSensitivity > 7 && (
              <Alert variant="warning" title="⚠️ Stress-varning!">
                Denna uppgift känns mycket brådskande. Forskning visar att vi systematiskt
                övervärderar brådska när vi är stressade. Vad är den <strong>faktiska</strong> kostnaden
                av att vänta 24 timmar?
              </Alert>
            )}

            <RangeSlider
              label="Tillit/Säkerhet - Sannolikhet för resultat"
              value={confidence}
              onChange={setConfidence}
              min={1}
              max={10}
              description="Hur säker är du på att det ger resultat?"
              formatValue={(v) => `${v}/10`}
              color="blue"
            />

            <RangeSlider
              label="Ansträngning - Faktisk tid/resurser"
              value={effort}
              onChange={setEffort}
              min={1}
              max={10}
              description="Hur mycket tid och energi krävs?"
              formatValue={(v) => `${v}/10`}
              color="red"
            />

            <PriorityPreview
              value={valueScore}
              timeSensitivity={timeSensitivity}
              confidence={confidence}
              effort={effort}
            />
          </div>
        )}

        {/* Step 4: Detaljer */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Sista detaljerna
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                När och hur länge?
              </p>
            </div>

            <DurationPicker
              value={estimatedDuration}
              onChange={setEstimatedDuration}
            />

            <Input
              type="date"
              label="Deadline (valfritt)"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />

            <Alert variant="success" title="Nästan klar!">
              Klicka på "Skapa" för att lägga till uppgiften i ditt fokusflöde.
            </Alert>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(step - 1)}
              className="flex-1"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tillbaka
            </Button>
          )}

          {step < 4 ? (
            <Button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className="flex-1"
            >
              Nästa
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={loading || !title.trim()}
              className="flex-1"
            >
              {loading ? 'Sparar...' : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {task ? 'Uppdatera' : 'Skapa'}
                </>
              )}
            </Button>
          )}
        </div>
      </form>
    </Modal>
  );
}
