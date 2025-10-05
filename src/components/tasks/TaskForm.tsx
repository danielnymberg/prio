import { useState, FormEvent, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { VoiceButton } from '@/components/ui/VoiceButton';
import { getTaskQuadrant, DURATION_PRESETS, formatDuration } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Clock, AlertTriangle } from 'lucide-react';

// TODO: DaNy AI integration point
// Add "Föreslå prioritet" button using AI analysis of task title/description
// Show AI reasoning for suggested importance/urgency values

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  task?: Task;
}

export function TaskForm({ isOpen, onClose, onSubmit, task }: TaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // CPM Parameters
  const [valueScore, setValueScore] = useState(5);
  const [timeSensitivity, setTimeSensitivity] = useState(5);
  const [confidence, setConfidence] = useState(7);
  const [effort, setEffort] = useState(5);

  // Consequences
  const [consequences, setConsequences] = useState({
    oneWeek: '',
    oneMonth: '',
    oneYear: ''
  });
  const [consequenceDeadline, setConsequenceDeadline] = useState('');
  const [blocksTaskIds, setBlocksTaskIds] = useState<string[]>([]);

  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'done'>('not_started');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const handleVoiceCommand = (action: string, params: any) => {
    switch (action) {
      case 'set_importance':
        setValueScore(params.importance);
        break;
      case 'set_urgency':
        setTimeSensitivity(params.urgency);
        break;
      case 'update':
        if (params.title) setTitle(params.title);
        break;
      case 'complete':
        setStatus('done');
        break;
      case 'set_duration':
        if (params.duration) setEstimatedDuration(params.duration);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setValueScore(task.value_score || 5);
      setTimeSensitivity(task.time_sensitivity || 5);
      setConfidence(task.confidence || 7);
      setEffort(task.effort || 5);
      setConsequences({
        oneWeek: task.consequence_1week || '',
        oneMonth: task.consequence_1month || '',
        oneYear: task.consequence_1year || ''
      });
      setConsequenceDeadline(task.consequence_deadline ? task.consequence_deadline.split('T')[0] : '');
      setBlocksTaskIds(task.blocks_task_ids || []);
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      setStatus(task.status);
      setEstimatedDuration(task.estimated_duration);
    } else {
      setTitle('');
      setDescription('');
      setValueScore(5);
      setTimeSensitivity(5);
      setConfidence(7);
      setEffort(5);
      setConsequences({ oneWeek: '', oneMonth: '', oneYear: '' });
      setConsequenceDeadline('');
      setBlocksTaskIds([]);
      setDeadline('');
      setStatus('not_started');
      setEstimatedDuration(null);
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const input = {
        title,
        description: description || undefined,
        value_score: valueScore,
        time_sensitivity: timeSensitivity,
        confidence,
        effort,
        consequence_1week: consequences.oneWeek || undefined,
        consequence_1month: consequences.oneMonth || undefined,
        consequence_1year: consequences.oneYear || undefined,
        consequence_deadline: consequenceDeadline || undefined,
        blocks_task_ids: blocksTaskIds.length > 0 ? blocksTaskIds : undefined,
        deadline: deadline || undefined,
        status,
        estimated_duration: estimatedDuration || undefined,
      };

      await onSubmit(input);
      onClose();
      toast.success(task ? 'Task uppdaterad!' : 'Task skapad!');
    } catch (error) {
      console.error('Task form error:', error);
      toast.error('Kunde inte spara task');
    } finally {
      setLoading(false);
    }
  };

  // Calculate priority preview
  const priorityPreview = (valueScore * timeSensitivity * confidence) / effort;
  const mockTask = { importance: valueScore, urgency: timeSensitivity } as Task;
  const quadrant = getTaskQuadrant(mockTask);

  const quadrantInfo = {
    Q1: { label: 'Q1: Viktigt + Brådskande', color: 'text-red-600 dark:text-red-400', emoji: '🔥' },
    Q2: { label: 'Q2: Viktigt + Ej Brådskande', color: 'text-green-600 dark:text-green-400', emoji: '🎯' },
    Q3: { label: 'Q3: Ej Viktigt + Brådskande', color: 'text-amber-600 dark:text-amber-400', emoji: '⚡' },
    Q4: { label: 'Q4: Ej Viktigt + Ej Brådskande', color: 'text-gray-600 dark:text-gray-400', emoji: '📦' },
  };

  const info = quadrantInfo[quadrant];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Redigera task' : 'Ny task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                label="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Vad ska du göra?"
                required
                maxLength={100}
                autoFocus
              />
            </div>
            <VoiceButton
              onTranscript={(text) => setTitle(text)}
              size="md"
            />
          </div>
        </div>

        <div>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Beskrivning
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detaljer (valfritt)"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
              />
            </div>
            <VoiceButton
              onTranscript={(text) => setDescription(text)}
              size="md"
            />
          </div>
        </div>

        {/* Consequences Section - Anti-urgency bias */}
        <div className="space-y-4 p-6 bg-blue-50 dark:bg-blue-900/20 rounded-xl border-2 border-blue-200 dark:border-blue-800 mb-6">
          <h3 className="font-bold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Om du INTE gör denna uppgift:
          </h3>

          <div>
            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Vad händer om 1 vecka?
            </label>
            <Input
              value={consequences.oneWeek}
              onChange={(e) => setConsequences({...consequences, oneWeek: e.target.value})}
              placeholder="t.ex. Kunden blir frustrerad, missar deadline"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Vad händer om 1 månad?
            </label>
            <Input
              value={consequences.oneMonth}
              onChange={(e) => setConsequences({...consequences, oneMonth: e.target.value})}
              placeholder="t.ex. Tappar kunden, måste hitta ny"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              Vad händer om 1 år?
            </label>
            <Input
              value={consequences.oneYear}
              onChange={(e) => setConsequences({...consequences, oneYear: e.target.value})}
              placeholder="t.ex. Verksamheten förlorat trovärdighet"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
              När träder konsekvensen i kraft? (deadline för konsekvens)
            </label>
            <Input
              type="date"
              value={consequenceDeadline}
              onChange={(e) => setConsequenceDeadline(e.target.value)}
            />
          </div>

          <p className="text-xs text-blue-700 dark:text-blue-300">
            ⚠️ <strong>Forskningsbaserat:</strong> Att tänka igenom konsekvenser motverkar "urgency bias"
            (tendensen att prioritera vad som känns brådskande istället för vad som är viktigt)
          </p>
        </div>

        {/* CPM Parameters */}
        <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">CPM Prioritering</h3>
            <VoiceButton
              mode="smart"
              onTranscript={() => {}}
              onCommand={handleVoiceCommand}
              placeholder="Säg 'viktighet 8' eller 'brådska 5'"
              size="sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Värde - Objektiva konsekvenser: {valueScore}/10
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
              💡 Vad händer om du INTE gör detta? (Inte hur viktigt det känns)
            </p>
            <input
              type="range"
              min="1"
              max="10"
              value={valueScore}
              onChange={(e) => setValueScore(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>Minimal påverkan</span>
              <span>Allvarliga konsekvenser</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tidskänslighet - Kostnad av fördröjning: {timeSensitivity}/10
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 italic">
              💡 Vad kostar det att vänta 1 timme/1 dag? (Inte när deadline är)
            </p>
            <input
              type="range"
              min="1"
              max="10"
              value={timeSensitivity}
              onChange={(e) => setTimeSensitivity(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>Kan vänta (låg kostnad)</span>
              <span>Ökar kraftigt per timme</span>
            </div>

            {/* Stress warning */}
            {timeSensitivity > 7 && (
              <div className="mt-4 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-500 rounded-lg p-4">
                <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  ⚠️ Stress-varning!
                </h4>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                  Denna uppgift känns mycket brådskande. Forskning visar att vi systematiskt
                  övervärderar brådska när vi är stressade.
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200 mb-2">
                  <strong>Exempel:</strong> "Måste vara klar till lunch imorgon" betyder INTE automatiskt hög tidskänslighet!
                  Fråga dig: Vad kostar det att göra det ikväll vs tidigt imorgon?
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Hög tidskänslighet (8-10) = Kostnaden ÖKAR KRAFTIGT för varje timme (ex: förlorar kund om jag inte svarar nu)
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tillit/Säkerhet - Sannolikhet för resultat: {confidence}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>Osäker</span>
              <span>Garanterad</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Ansträngning - Faktisk tid/resurser: {effort}/10
            </label>
            <input
              type="range"
              min="1"
              max="10"
              value={effort}
              onChange={(e) => setEffort(Number(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
              <span>Lätt</span>
              <span>Mycket krävande</span>
            </div>
          </div>

          {/* Priority Preview */}
          <div className="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <p className="text-sm font-medium text-indigo-900 dark:text-indigo-100">
              📊 Beräknad prioritet: <span className="text-lg font-bold">{priorityPreview.toFixed(1)}</span>
            </p>
            <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-1">
              Formel: (Värde × Tidskänslighet × Tillit) / Ansträngning
            </p>
          </div>
        </div>

        <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-2 ${info.color.replace('text-', 'border-')}`}>
          <p className={`text-sm font-medium ${info.color}`}>
            {info.emoji} Denna task kommer hamna i {info.label}
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Tidsuppskattning
                {estimatedDuration && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ({formatDuration(estimatedDuration)})
                  </span>
                )}
              </label>
            </div>
            <VoiceButton
              mode="smart"
              onTranscript={() => {}}
              onCommand={handleVoiceCommand}
              placeholder="Säg '30 minuter' eller 'en timme'"
              size="sm"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setEstimatedDuration(preset.value)}
                className={`p-3 rounded-lg border text-center transition-all hover:shadow-sm ${
                  estimatedDuration === preset.value
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                title={preset.description}
              >
                <div className="text-lg mb-1">{preset.icon}</div>
                <div className="text-xs font-medium">{preset.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{preset.description}</div>
              </button>
            ))}
          </div>

          {estimatedDuration && !DURATION_PRESETS.find(p => p.value === estimatedDuration) && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => setEstimatedDuration(null)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Anpassad tid: {formatDuration(estimatedDuration)} • Rensa
              </button>
            </div>
          )}
        </div>

        <Input
          type="date"
          label="Deadline (valfritt)"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex gap-2">
            {[
              { value: 'not_started', label: 'Ej påbörjad' },
              { value: 'in_progress', label: 'Pågår' },
              { value: 'done', label: 'Klar' },
            ].map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value as any)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                  status === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            className="flex-1"
          >
            Avbryt
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={loading || !title.trim()}
            className="flex-1"
          >
            {loading ? 'Sparar...' : task ? 'Uppdatera' : 'Skapa'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
