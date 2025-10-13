import { useState, FormEvent, useEffect } from 'react';
import { Task, CreateTaskInput, UpdateTaskInput, Project, PriorityFlag } from '@/lib/types';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { DURATION_PRESETS, formatDuration } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Clock, AlertTriangle } from 'lucide-react';
import { AutoBookModal } from './AutoBookModal';
import { findFreeTimeSlots, isMicrosoftLoggedIn, FreeTimeSlot } from '@/services/microsoft-graph';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Syncfusion Components
import { TextBoxComponent, SliderComponent } from '@syncfusion/ej2-react-inputs';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { Tooltip } from '@/components/ui/Tooltip';

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
  const [deadlineHasTime, setDeadlineHasTime] = useState(false);
  const [deadlineHour, setDeadlineHour] = useState('17');
  const [scheduledStartDate, setScheduledStartDate] = useState('');
  const [scheduledStartHasTime, setScheduledStartHasTime] = useState(false);
  const [scheduledStartHour, setScheduledStartHour] = useState('09');
  const [status, setStatus] = useState<'not_started' | 'in_progress' | 'done'>('not_started');
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [customDurationText, setCustomDurationText] = useState('');
  const [showCustomDuration, setShowCustomDuration] = useState(false);
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

  // Parse fritext-tid till minuter
  const parseCustomDuration = (text: string): number | null => {
    const lower = text.toLowerCase().trim();

    // Veckor: "2 veckor", "3v", "1 vecka"
    const weeksMatch = lower.match(/(\d+)\s*(v|vecka|veckor|week|weeks)/);
    if (weeksMatch) return parseInt(weeksMatch[1]) * 7 * 24 * 60;

    // Dagar: "5 dagar", "3d", "1 dag"
    const daysMatch = lower.match(/(\d+)\s*(d|dag|dagar|day|days)/);
    if (daysMatch) return parseInt(daysMatch[1]) * 24 * 60;

    // Timmar: "40 timmar", "8h", "1 timme"
    const hoursMatch = lower.match(/(\d+)\s*(h|timme|timmar|hour|hours)/);
    if (hoursMatch) return parseInt(hoursMatch[1]) * 60;

    // Minuter: "30 min", "45m"
    const minutesMatch = lower.match(/(\d+)\s*(m|min|minut|minuter|minute|minutes)/);
    if (minutesMatch) return parseInt(minutesMatch[1]);

    // Bara siffra = timmar (standard)
    const numberMatch = lower.match(/^(\d+)$/);
    if (numberMatch) return parseInt(numberMatch[1]) * 60;

    return null;
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

      // Deadline
      const parsedDeadline = parseDeadline(task.deadline);
      setDeadlineDate(parsedDeadline.date);
      setDeadlineHour(parsedDeadline.hour);
      setDeadlineHasTime(!!task.deadline && parsedDeadline.hour !== '00');

      // Scheduled start
      const parsedScheduledStart = parseDeadline(task.scheduled_start);
      setScheduledStartDate(parsedScheduledStart.date);
      setScheduledStartHour(parsedScheduledStart.hour);
      setScheduledStartHasTime(!!task.scheduled_start && parsedScheduledStart.hour !== '00');

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
      setDeadlineHasTime(false);
      setDeadlineHour('17');
      setScheduledStartDate('');
      setScheduledStartHasTime(false);
      setScheduledStartHour('09');
      setStatus('not_started');
      setEstimatedDuration(null);
      setProjectId(null);
      setPriorityFlag('whenever');
    }
  }, [task]);

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

      // Bygg deadline från datum + timme (optional)
      if (deadlineDate) {
        if (deadlineHasTime) {
          input.deadline = `${deadlineDate}T${deadlineHour}:00:00`;
        } else {
          input.deadline = `${deadlineDate}T00:00:00`;
        }
        input.priority_flag = null; // Tasks med deadline får inte priority_flag
      } else {
        // Tasks utan deadline använder priority_flag
        input.deadline = null; // Sätt explicit null för att ta bort deadline
        input.priority_flag = priorityFlag;
      }

      // Bygg scheduled_start från datum + timme (optional)
      if (scheduledStartDate) {
        if (scheduledStartHasTime) {
          input.scheduled_start = `${scheduledStartDate}T${scheduledStartHour}:00:00`;
        } else {
          input.scheduled_start = `${scheduledStartDate}T00:00:00`;
        }
      } else {
        input.scheduled_start = null;
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
            toast.success('Uppgift skapad! Vill du boka tid?');
            return;
          }
        }
      }

      onClose();
      toast.success(task ? 'Uppgift uppdaterad!' : 'Uppgift skapad!');
    } catch (error) {
      console.error('Task form error:', error);
      toast.error('Kunde inte spara uppgift');
    } finally {
      setLoading(false);
    }
  };

  // Calculate priority preview
  const priorityPreview = (valueScore * timeSensitivity * confidence) / effort;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={task ? 'Redigera uppgift' : 'Ny uppgift'}
      size="md"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <TextBoxComponent
            value={title}
            change={(e: any) => setTitle(e.value || '')}
            placeholder="Titel"
            floatLabelType="Auto"
            cssClass="e-outline"
            showClearButton={true}
            htmlAttributes={{ maxLength: '100' }}
          />
        </div>

        <div>
          <TextBoxComponent
            multiline={true}
            value={description}
            change={(e: any) => setDescription(e.value || '')}
            placeholder="Beskrivning (valfritt)"
            floatLabelType="Auto"
            cssClass="e-outline"
            htmlAttributes={{ rows: '3' }}
          />
        </div>

        {/* Project Selection */}
        <div>
          <DropDownListComponent
            dataSource={[
              { id: '', name: 'Inget projekt', client_name: '' },
              ...projects
            ] as any}
            fields={{ text: 'name', value: 'id' }}
            value={projectId || ''}
            change={(e: any) => setProjectId(e.value || null)}
            placeholder="Välj projekt (valfritt)"
            floatLabelType="Auto"
            allowFiltering={true}
            itemTemplate={(data: any) => (
              <div>
                {data.name} {data.client_name ? `(${data.client_name})` : ''}
              </div>
            )}
          />
        </div>

        {/* Tidsuppskattning - FLYTTAD HIT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock style={{ height: '1rem', width: '1rem', color: 'var(--e-text-secondary)' }} />
            <label style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)' }}>
              Tidsuppskattning
              {estimatedDuration && estimatedDuration > 0 && (
                <span style={{ marginLeft: '0.5rem', color: 'var(--primary-500)' }}>
                  ({formatDuration(estimatedDuration)})
                </span>
              )}
            </label>
          </div>

          {!showCustomDuration ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => {
                      if (preset.value === -1) {
                        setShowCustomDuration(true);
                      } else {
                        setEstimatedDuration(preset.value);
                      }
                    }}
                    style={{
                      padding: '0.5rem',
                      borderRadius: '0.5rem',
                      border: estimatedDuration === preset.value
                        ? '2px solid var(--primary-500)'
                        : '1px solid var(--e-border)',
                      backgroundColor: estimatedDuration === preset.value
                        ? 'var(--e-surface)'
                        : 'var(--e-surface)',
                      color: estimatedDuration === preset.value
                        ? 'var(--primary-600)'
                        : 'var(--e-text)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    title={preset.description}
                  >
                    <div style={{ fontSize: '1.125rem' }}>{preset.icon}</div>
                    <div style={{ fontSize: '0.75rem', fontWeight: '500' }}>{preset.label}</div>
                  </button>
                ))}
              </div>

              {estimatedDuration && estimatedDuration > 0 && !DURATION_PRESETS.find(p => p.value === estimatedDuration) && (
                <div style={{ textAlign: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEstimatedDuration(null);
                      setCustomDurationText('');
                    }}
                    style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}
                  >
                    Anpassad tid: {formatDuration(estimatedDuration)} • Rensa
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <TextBoxComponent
                value={customDurationText}
                change={(e: any) => {
                  const value = e.value || '';
                  setCustomDurationText(value);
                  const parsed = parseCustomDuration(value);
                  if (parsed) {
                    setEstimatedDuration(parsed);
                  }
                }}
                placeholder="T.ex: 3 veckor, 5 dagar, 40 timmar"
                floatLabelType="Auto"
                cssClass="e-outline"
                showClearButton={true}
              />
              <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)' }}>
                Exempel: "3v", "5 dagar", "40h", "2 veckor", "10d"
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomDuration(false);
                    if (!estimatedDuration || estimatedDuration <= 0) {
                      setCustomDurationText('');
                    }
                  }}
                  style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', cursor: 'pointer', background: 'none', border: 'none' }}
                >
                  ← Tillbaka till snabbval
                </button>
                {estimatedDuration && estimatedDuration > 0 && (
                  <span style={{ fontSize: '0.875rem', color: 'var(--e-success, #10b981)' }}>
                    ✓ {formatDuration(estimatedDuration)}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status och Slutdatum - FLYTTAT HIT */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
          {/* Status - vänster spalt */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Status
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { value: 'not_started', label: 'Ej påbörjad' },
                { value: 'in_progress', label: 'Pågår' },
                { value: 'done', label: 'Klar' },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  onClick={() => setStatus(value as any)}
                  variant={status === value ? 'primary' : 'secondary'}
                  size="sm"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    justifyContent: 'flex-start'
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Slutdatum - höger spalt */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Slutdatum
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="date"
                value={deadlineDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  border: '1px solid var(--e-border)',
                  borderRadius: '0.5rem',
                  backgroundColor: 'var(--e-surface)',
                  color: 'var(--e-text)'
                }}
              />
              <DropDownListComponent
                dataSource={[
                  { value: '00', text: '00:00' },
                  { value: '06', text: '06:00' },
                  { value: '09', text: '09:00' },
                  { value: '12', text: '12:00' },
                  { value: '15', text: '15:00' },
                  { value: '17', text: '17:00' },
                  { value: '18', text: '18:00' },
                  { value: '21', text: '21:00' }
                ]}
                fields={{ text: 'text', value: 'value' }}
                value={deadlineHour}
                change={(e: any) => setDeadlineHour(e.value)}
                placeholder="Klockslag"
                floatLabelType="Auto"
              />

              {/* Rensa slutdatum-knapp */}
              {deadlineDate && (
                <button
                  type="button"
                  onClick={() => setDeadlineDate('')}
                  style={{
                    width: '100%',
                    fontSize: '0.875rem',
                    color: 'var(--e-error, #ef4444)',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none'
                  }}
                >
                  ❌ Ta bort slutdatum
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Starttid/Schemaläggning */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
            Starttid (schemalägg uppgiften)
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="date"
              value={scheduledStartDate}
              onChange={(e) => setScheduledStartDate(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid var(--e-border)',
                borderRadius: '0.5rem',
                backgroundColor: 'var(--e-surface)',
                color: 'var(--e-text)'
              }}
            />
            {scheduledStartDate && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckBoxComponent
                    checked={scheduledStartHasTime}
                    change={(e: any) => setScheduledStartHasTime(e.checked)}
                    label="Ange klockslag"
                  />
                </div>

                {scheduledStartHasTime && (
                  <DropDownListComponent
                    dataSource={[
                      { value: '06', text: '06:00' },
                      { value: '07', text: '07:00' },
                      { value: '08', text: '08:00' },
                      { value: '09', text: '09:00' },
                      { value: '10', text: '10:00' },
                      { value: '11', text: '11:00' },
                      { value: '12', text: '12:00' },
                      { value: '13', text: '13:00' },
                      { value: '14', text: '14:00' },
                      { value: '15', text: '15:00' },
                      { value: '16', text: '16:00' },
                      { value: '17', text: '17:00' },
                      { value: '18', text: '18:00' }
                    ]}
                    fields={{ text: 'text', value: 'value' }}
                    value={scheduledStartHour}
                    change={(e: any) => setScheduledStartHour(e.value)}
                    placeholder="Klockslag"
                    floatLabelType="Auto"
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    setScheduledStartDate('');
                    setScheduledStartHasTime(false);
                  }}
                  style={{
                    width: '100%',
                    fontSize: '0.875rem',
                    color: 'var(--e-error, #ef4444)',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none'
                  }}
                >
                  ❌ Ta bort schemaläggning
                </button>
              </>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
            💡 Schemalagda uppgifter visas i kalendervyn
          </p>
        </div>

        {/* Priority Flag - visas ENDAST om ingen deadline är satt */}
        {!deadlineDate && (
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Prioritetsnivå (för uppgifter utan slutdatum)
            </label>
            <DropDownListComponent
              dataSource={[
                { value: 'asap', text: '🎯 ASAP - Gör så snart möjligt (+50% prio)' },
                { value: 'whenever', text: '📅 När det passar (normal prio)' },
                { value: 'someday', text: '💭 Någon gång i framtiden (-30% prio)' }
              ]}
              fields={{ text: 'text', value: 'value' }}
              value={priorityFlag}
              change={(e: any) => setPriorityFlag(e.value as PriorityFlag)}
              floatLabelType="Auto"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
              💡 Styr hur viktiga uppgifter utan slutdatum prioriteras
            </p>
          </div>
        )}

        {/* CPM Parameters - FLYTTAT HIT SIST */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', borderRadius: '0.5rem', backgroundColor: 'var(--e-surface)', border: '1px solid var(--e-border)' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)' }}>CPM Prioritering</h3>

          <div style={{ userSelect: 'none' }}>
            <Tooltip content="Bedöm objektiva konsekvenser: Vad händer om du INTE gör detta? Fokusera på mätbara effekter, inte känslor." position="TopCenter">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem', cursor: 'help' }}>
                Värde - Objektiva konsekvenser: {valueScore}/10
              </label>
            </Tooltip>
            <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
              💡 Vad händer om du INTE gör detta? (Inte hur viktigt det känns)
            </p>
            <SliderComponent
              value={valueScore}
              change={(e: any) => setValueScore(e.value)}
              min={1}
              max={10}
              step={1}
              tooltip={{ isVisible: true, placement: 'Before', showOn: 'Always' }}
              ticks={{ placement: 'After', largeStep: 2, smallStep: 1 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem' }}>
              <span>Minimal påverkan</span>
              <span>Allvarliga konsekvenser</span>
            </div>
          </div>

          <div style={{ userSelect: 'none' }}>
            <Tooltip content="Bedöm kostnaden av fördröjning: Vad kostar det att vänta 1 timme eller 1 dag? Inte samma som deadline!" position="TopCenter">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem', cursor: 'help' }}>
                Tidskänslighet - Kostnad av fördröjning: {timeSensitivity}/10
              </label>
            </Tooltip>
            <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
              💡 Vad kostar det att vänta 1 timme/1 dag? (Inte när deadline är)
            </p>
            <SliderComponent
              value={timeSensitivity}
              change={(e: any) => setTimeSensitivity(e.value)}
              min={1}
              max={10}
              step={1}
              tooltip={{ isVisible: true, placement: 'Before', showOn: 'Always' }}
              ticks={{ placement: 'After', largeStep: 2, smallStep: 1 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem' }}>
              <span>Kan vänta (låg kostnad)</span>
              <span>Ökar kraftigt per timme</span>
            </div>

            {/* Stress warning */}
            {timeSensitivity > 7 && (
              <div style={{ marginTop: '1rem', backgroundColor: 'var(--e-warning-light, #fffbeb)', border: '2px solid var(--e-warning, var(--warning-500))', borderRadius: '0.5rem', padding: '1rem' }}>
                <h4 style={{ fontWeight: 'bold', color: 'var(--e-warning-dark, #78350f)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle style={{ height: '1.25rem', width: '1.25rem' }} />
                  ⚠️ Stress-varning!
                </h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--e-warning-dark, #92400e)', marginBottom: '0.75rem' }}>
                  Denna uppgift känns mycket brådskande. Forskning visar att vi systematiskt
                  övervärderar brådska när vi är stressade.
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--e-warning-dark, #92400e)', marginBottom: '0.5rem' }}>
                  <strong>Exempel:</strong> "Måste vara klar till lunch imorgon" betyder INTE automatiskt hög tidskänslighet!
                  Fråga dig: Vad kostar det att göra det ikväll vs tidigt imorgon?
                </p>
                <p style={{ fontSize: '0.875rem', color: 'var(--e-warning-dark, #92400e)' }}>
                  Hög tidskänslighet (8-10) = Kostnaden ÖKAR KRAFTIGT för varje timme (ex: förlorar kund om jag inte svarar nu)
                </p>
              </div>
            )}
          </div>

          <div style={{ userSelect: 'none' }}>
            <Tooltip content="Hur säker är du på att resultatet blir som förväntat? Hög tillit = garanterat resultat, låg = osäkert utfall." position="TopCenter">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem', cursor: 'help' }}>
                Tillit/Säkerhet - Sannolikhet för resultat: {confidence}/10
              </label>
            </Tooltip>
            <SliderComponent
              value={confidence}
              change={(e: any) => setConfidence(e.value)}
              min={1}
              max={10}
              step={1}
              tooltip={{ isVisible: true, placement: 'Before', showOn: 'Always' }}
              ticks={{ placement: 'After', largeStep: 2, smallStep: 1 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem' }}>
              <span>Osäker</span>
              <span>Garanterad</span>
            </div>
          </div>

          <div style={{ userSelect: 'none' }}>
            <Tooltip content="Hur mycket tid och energi krävs för att slutföra detta? 1 = snabbt och lätt, 10 = mycket krävande." position="TopCenter">
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem', cursor: 'help' }}>
                Ansträngning - Faktisk tid/resurser: {effort}/10
              </label>
            </Tooltip>
            <SliderComponent
              value={effort}
              change={(e: any) => setEffort(e.value)}
              min={1}
              max={10}
              step={1}
              tooltip={{ isVisible: true, placement: 'Before', showOn: 'Always' }}
              ticks={{ placement: 'After', largeStep: 2, smallStep: 1 }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem' }}>
              <span>Lätt</span>
              <span>Mycket krävande</span>
            </div>
          </div>

          {/* Priority Preview */}
          <div style={{ marginTop: '1rem', padding: '0.75rem', backgroundColor: 'var(--e-surface)', borderRadius: '0.5rem' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)' }}>
              📊 Beräknad prioritet: <span style={{ fontSize: '1.125rem', fontWeight: 'bold' }}>{priorityPreview.toFixed(1)}</span>
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem' }}>
              Formel: (Värde × Tidskänslighet × Tillit) / Ansträngning
            </p>
          </div>
        </div>

        {/* Priority Flag - visas ENDAST om ingen deadline är satt */}
        {!deadlineDate && (
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
              Prioritetsnivå (för uppgifter utan slutdatum)
            </label>
            <DropDownListComponent
              dataSource={[
                { value: 'asap', text: '🎯 ASAP - Gör så snart möjligt (+50% prio)' },
                { value: 'whenever', text: '📅 När det passar (normal prio)' },
                { value: 'someday', text: '💭 Någon gång i framtiden (-30% prio)' }
              ]}
              fields={{ text: 'text', value: 'value' }}
              value={priorityFlag}
              change={(e: any) => setPriorityFlag(e.value as PriorityFlag)}
              floatLabelType="Auto"
            />
            <p style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
              💡 Styr hur viktiga uppgifter utan slutdatum prioriteras
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', paddingTop: '1rem' }}>
          {task && onDelete && (
            <Button
              onClick={async () => {
                if (confirm(`Är du säker på att du vill radera "${task.title}"?`)) {
                  await onDelete(task.id);
                  onClose();
                  toast.success('Uppgift raderad');
                }
              }}
              variant="danger"
              size="sm"
            >
              Radera
            </Button>
          )}
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            style={{ flex: 1 }}
          >
            Avbryt
          </Button>
          <div style={{ flex: 1 }} onClick={(e) => {
            e.preventDefault();
            if (!loading && title.trim()) {
              handleSubmit(e as any);
            }
          }}>
            <Button
              disabled={loading || !title.trim()}
              variant="primary"
              size="sm"
              style={{ width: '100%' }}
            >
              {loading ? 'Sparar...' : 'Spara'}
            </Button>
          </div>
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
    </Dialog>
  );
}
