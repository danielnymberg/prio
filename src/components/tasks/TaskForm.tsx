import { useState, FormEvent, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput, Project, PriorityFlag } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { DURATION_PRESETS, formatDuration } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Clock, AlertTriangle } from 'lucide-react';
import { AutoBookModal } from './AutoBookModal';
import { findFreeTimeSlots, isMicrosoftLoggedIn, FreeTimeSlot } from '@/services/microsoft-graph';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateTaskInput | UpdateTaskInput) => Promise<void>;
  onDelete?: (id: string) => Promise<boolean>;
  task?: Task;
}

export function TaskForm({ isOpen, onClose, onSubmit, onDelete, task }: TaskFormProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // CPM Parameters
  const [valueScore, setValueScore] = useState(5);
  const [timeSensitivity, setTimeSensitivity] = useState(5);
  const [confidence, setConfidence] = useState(7);
  const [effort, setEffort] = useState(5);

  const [blocksTaskIds, setBlocksTaskIds] = useState<string[]>([]);

  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineHour, setDeadlineHour] = useState('17');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'done'>('not_started');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [priorityFlag, setPriorityFlag] = useState<PriorityFlag>('whenever');

  // Projects state
  const [projects, setProjects] = useState<Project[]>([]);

  // Auto-booking state
  const [showAutoBook, setShowAutoBook] = useState(false);
  const [freeSlots, setFreeSlots] = useState<FreeTimeSlot[]>([]);
  const [autoBookDeadline, setAutoBookDeadline] = useState<Date | undefined>(undefined);

  // Fetch projects
  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('name');

    setProjects(data || []);
  };

  // Konvertera ISO datetime till datum (YYYY-MM-DD) och timme
  const parseDeadline = (isoString: string | null): { date: string; hour: string } => {
    if (!isoString) return { date: '', hour: '17' };
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    return { date: `${year}-${month}-${day}`, hour: hours };
  };

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setValueScore(task.value_score || 5);
      setTimeSensitivity(task.time_sensitivity || 5);
      setConfidence(task.confidence || 7);
      setEffort(task.effort || 5);
      setBlocksTaskIds(task.blocks_task_ids || []);
      const parsed = parseDeadline(task.deadline);
      setDeadlineDate(parsed.date);
      setDeadlineHour(parsed.hour);
      setStatus(task.status);
      setEstimatedDuration(task.estimated_duration);
      setProjectId(task.project_id || null);
      setPriorityFlag(task.priority_flag || 'whenever');
    } else {
      setTitle('');
      setDescription('');
      setValueScore(5);
      setTimeSensitivity(5);
      setConfidence(7);
      setEffort(5);
      setBlocksTaskIds([]);
      setDeadlineDate('');
      setDeadlineHour('17');
      setStatus('not_started');
      setEstimatedDuration(null);
      setProjectId(null);
      setPriorityFlag('whenever');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const input: any = {
        title,
        description: description.trim() || '', // Tom eller whitespace blir tom sträng
        value_score: valueScore,
        time_sensitivity: timeSensitivity,
        confidence,
        effort,
        status,
      };

      // Lägg bara till optional fields om de har värden
      if (blocksTaskIds.length > 0) input.blocks_task_ids = blocksTaskIds;

      // Bygg deadline från datum + timme
      if (deadlineDate) {
        input.deadline = `${deadlineDate}T${deadlineHour}:00:00`;
        input.priority_flag = null; // Tasks med deadline får inte priority_flag
      } else {
        // Tasks utan deadline använder priority_flag
        input.deadline = null; // Sätt explicit null för att ta bort deadline
        input.priority_flag = priorityFlag;
      }

      if (estimatedDuration) input.estimated_duration = estimatedDuration;
      if (projectId) input.project_id = projectId;

      await onSubmit(input);

      // Check if auto-booking should be triggered
      const shouldAutoBook =
        !task && // Only for new tasks
        estimatedDuration &&
        estimatedDuration >= 60 && // At least 1 hour
        deadlineDate &&
        (await isMicrosoftLoggedIn());

      if (shouldAutoBook) {
        // Check if deadline is within 7 days
        const deadlineDate = new Date(input.deadline);
        const now = new Date();
        const daysUntilDeadline = (deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

        if (daysUntilDeadline > 0 && daysUntilDeadline <= 7) {
          // Find free slots
          const endDate = new Date(deadlineDate);
          const slots = await findFreeTimeSlots(now, endDate, estimatedDuration);

          if (slots.length > 0) {
            setFreeSlots(slots);
            setAutoBookDeadline(endDate);
            setShowAutoBook(true);
            // Don't close main modal yet
            toast.success('Task skapad! Vill du boka tid?');
            return;
          }
        }
      }

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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Redigera task' : 'Ny task'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Beskrivning
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detaljer (valfritt)"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
          />
        </div>

        {/* Project Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Projekt (valfritt)
          </label>
          <select
            value={projectId || ''}
            onChange={(e) => setProjectId(e.target.value || null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">Inget projekt</option>
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name} {project.client_name ? `(${project.client_name})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* CPM Parameters */}
        <div className="space-y-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border">
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">CPM Prioritering</h3>

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
          <div className="mt-4 p-3 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
            <p className="text-sm font-medium text-stone-600 dark:text-sand-100">
              📊 Beräknad prioritet: <span className="text-lg font-bold">{priorityPreview.toFixed(1)}</span>
            </p>
            <p className="text-xs text-stone-600 dark:text-sand-200 mt-1">
              Formel: (Värde × Tidskänslighet × Tillit) / Ansträngning
            </p>
          </div>
        </div>

        {/* Priority Flag - visas ENDAST om ingen deadline är satt */}
        {!deadlineDate && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prioritetsnivå (för tasks utan deadline)
            </label>
            <select
              value={priorityFlag}
              onChange={(e) => setPriorityFlag(e.target.value as PriorityFlag)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="asap">🎯 ASAP - Gör så snart möjligt (+50% prio)</option>
              <option value="whenever">📅 När det passar (normal prio)</option>
              <option value="someday">💭 Någon gång i framtiden (-30% prio)</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
              💡 Styr hur viktiga tasks utan deadline prioriteras
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Tidsuppskattning
              {estimatedDuration && (
                <span className="ml-2 text-copper-500 dark:text-copper-400">
                  ({formatDuration(estimatedDuration)})
                </span>
              )}
            </label>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {DURATION_PRESETS.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => setEstimatedDuration(preset.value)}
                className={`p-2 rounded-lg border text-center transition-all hover:shadow-sm ${
                  estimatedDuration === preset.value
                    ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 text-copper-600 dark:text-sand-200'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                title={preset.description}
              >
                <div className="text-lg">{preset.icon}</div>
                <div className="text-xs font-medium">{preset.label}</div>
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

        {/* Status och Deadline i två spalter */}
        <div className="grid grid-cols-2 gap-4">
          {/* Status - vänster spalt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <div className="space-y-2">
              {[
                { value: 'not_started', label: 'Ej påbörjad', color: 'gray' },
                { value: 'in_progress', label: 'Pågår', color: 'amber' },
                { value: 'done', label: 'Klar', color: 'green' },
              ].map(({ value, label, color }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setStatus(value as any)}
                  className={`w-full py-2 px-3 rounded-lg text-sm font-medium transition-colors text-left ${
                    status === value
                      ? color === 'green'
                        ? 'bg-green-600 text-white'
                        : color === 'amber'
                        ? 'bg-amber-600 text-white'
                        : 'bg-gray-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline - höger spalt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Deadline
            </label>
            <div className="space-y-2">
              <Input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                placeholder="Datum"
              />
              <select
                value={deadlineHour}
                onChange={(e) => setDeadlineHour(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-copper-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="00">00:00</option>
                <option value="06">06:00</option>
                <option value="09">09:00</option>
                <option value="12">12:00</option>
                <option value="15">15:00</option>
                <option value="17">17:00</option>
                <option value="18">18:00</option>
                <option value="21">21:00</option>
              </select>

              {/* Rensa deadline-knapp */}
              {deadlineDate && (
                <button
                  type="button"
                  onClick={() => setDeadlineDate('')}
                  className="w-full text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 py-1"
                >
                  ❌ Ta bort deadline
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-4">
          {task && onDelete && (
            <button
              type="button"
              onClick={async () => {
                if (confirm(`Är du säker på att du vill radera "${task.title}"?`)) {
                  await onDelete(task.id);
                  onClose();
                  toast.success('Task raderad');
                }
              }}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            >
              Radera
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Avbryt
          </button>
          <button
            type="submit"
            disabled={loading || !title.trim()}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sparar...' : 'Spara'}
          </button>
        </div>
      </form>

      {/* Auto-Booking Modal */}
      {showAutoBook && (
        <AutoBookModal
          isOpen={showAutoBook}
          onClose={() => {
            setShowAutoBook(false);
            onClose(); // Close main modal too
          }}
          taskTitle={title}
          durationMinutes={estimatedDuration || 60}
          freeSlots={freeSlots}
          deadline={autoBookDeadline}
        />
      )}
    </Modal>
  );
}
