import { useState, FormEvent, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { VoiceButton } from '@/components/ui/VoiceButton';
import { getTaskQuadrant } from '@/lib/utils';
import { toast } from 'react-hot-toast';

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
  const [importance, setImportance] = useState(5);
  const [urgency, setUrgency] = useState(5);
  const [deadline, setDeadline] = useState('');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'done'>('not_started');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setImportance(task.importance);
      setUrgency(task.urgency);
      setDeadline(task.deadline ? task.deadline.split('T')[0] : '');
      setStatus(task.status);
    } else {
      setTitle('');
      setDescription('');
      setImportance(5);
      setUrgency(5);
      setDeadline('');
      setStatus('not_started');
    }
  }, [task, isOpen]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const input = {
        title,
        description: description || undefined,
        importance,
        urgency,
        deadline: deadline || undefined,
        status,
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

  const mockTask = { importance, urgency } as Task;
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

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Viktighet: {importance}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={importance}
            onChange={(e) => setImportance(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Brådskande: {urgency}/10
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={urgency}
            onChange={(e) => setUrgency(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className={`p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border-2 ${info.color.replace('text-', 'border-')}`}>
          <p className={`text-sm font-medium ${info.color}`}>
            {info.emoji} Denna task kommer hamna i {info.label}
          </p>
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
