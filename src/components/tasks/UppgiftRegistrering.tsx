import { useState, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Task, TaskStatus, PriorityFlag } from '@/lib/types';

// SyncFusion imports
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent, NumericTextBoxComponent, SliderComponent } from '@syncfusion/ej2-react-inputs';
import { DateTimePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { ButtonComponent, ChipListComponent, CheckBoxComponent } from '@syncfusion/ej2-react-buttons';
import { FormValidator } from '@syncfusion/ej2-inputs';

interface UppgiftRegistreringProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultProjectId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    value_score?: number;
    time_sensitivity?: number;
    confidence?: number;
    effort?: number;
  };
}

const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0
};

// Helper: Beräkna default starttid
function getDefaultStartTime(): Date {
  const now = new Date();
  const hour = now.getHours();

  if (hour < 13) {
    // Före 13:00 - sätt till idag kl 13:00
    now.setHours(13, 0, 0, 0);
    return now;
  } else {
    // Efter 13:00 - sätt till imorgon kl 09:00
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0);
    return tomorrow;
  }
}

// Helper: Beräkna deadline (5 arbetsdagar efter start, kl 17:00)
function getDefaultDeadline(startTime: Date): Date {
  const deadline = new Date(startTime);
  let workDaysAdded = 0;

  while (workDaysAdded < 5) {
    deadline.setDate(deadline.getDate() + 1);
    const dayOfWeek = deadline.getDay();
    // Hoppa över lördagar (6) och söndagar (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workDaysAdded++;
    }
  }

  deadline.setHours(17, 0, 0, 0);
  return deadline;
}

export function UppgiftRegistrering({ isOpen, onClose, taskToEdit, defaultProjectId, defaultValues }: UppgiftRegistreringProps) {
  const { createTask, updateTask } = useTasks();
  const { projects } = useProjects();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTimeChip, setSelectedTimeChip] = useState<number>(-1); // -1 = ingen vald
  const [customDuration, setCustomDuration] = useState<number | null>(null);
  const [scheduledStart, setScheduledStart] = useState<Date | null>(null);
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [priorityFlag, setPriorityFlag] = useState<PriorityFlag>('asap');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [valueScore, setValueScore] = useState(8);
  const [timeSensitivity, setTimeSensitivity] = useState(5);
  const [confidence, setConfidence] = useState(8);
  const [effort, setEffort] = useState(5);

  const formRef = useRef<HTMLFormElement>(null);
  const validatorRef = useRef<FormValidator | null>(null);

  // Deadline-validering: Varna om task.deadline > project.project_deadline
  const selectedProjectData = selectedProject ? projects.find(p => p.id === selectedProject) : null;
  const hasDeadlineConflict =
    deadline &&
    selectedProjectData?.project_deadline &&
    new Date(deadline) > new Date(selectedProjectData.project_deadline);

  // Tidsval som chips
  const timeChips = [
    { text: '≤2min Snabbis', value: 2 },
    { text: '30min', value: 30 },
    { text: '1h', value: 60 },
    { text: 'Anpassad...', value: -1 }
  ];

  // Status-alternativ
  const statusOptions = [
    { text: 'Inte påbörjad', value: 'not_started' },
    { text: 'Pågår', value: 'in_progress' },
    { text: 'Klar', value: 'done' },
  ];

  // Priority flag-alternativ
  const priorityFlagOptions = [
    { text: 'ASAP (gör snart)', value: 'asap' },
    { text: 'När det passar', value: 'whenever' },
    { text: 'Någon gång', value: 'someday' },
  ];

  // Initialize form values
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        // Redigera befintlig uppgift
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setSelectedProject(taskToEdit.project_id);
        setStatus(taskToEdit.status);
        setScheduledStart(taskToEdit.scheduled_start ? new Date(taskToEdit.scheduled_start) : null);
        setDeadline(taskToEdit.deadline ? new Date(taskToEdit.deadline) : null);
        setPriorityFlag(taskToEdit.priority_flag || 'asap');
        setValueScore(taskToEdit.value_score);
        setTimeSensitivity(taskToEdit.time_sensitivity);
        setConfidence(taskToEdit.confidence);
        setEffort(taskToEdit.effort);

        // Sätt tidsval baserat på estimated_duration
        const duration = taskToEdit.estimated_duration;
        if (duration && duration <= 2) {
          setSelectedTimeChip(0);
        } else if (duration === 30) {
          setSelectedTimeChip(1);
        } else if (duration === 60) {
          setSelectedTimeChip(2);
        } else {
          setSelectedTimeChip(3);
          setCustomDuration(duration || null);
        }
      } else {
        // Ny uppgift - defaults
        setTitle(defaultValues?.title || '');
        setDescription(defaultValues?.description || '');
        setSelectedProject(defaultProjectId || null);
        setSelectedTimeChip(-1);
        setCustomDuration(null);
        const defaultStart = getDefaultStartTime();
        setScheduledStart(defaultStart);
        setDeadline(getDefaultDeadline(defaultStart));
        setStatus('not_started');
        setPriorityFlag('asap');
        setShowAdvanced(false);
        setValueScore(defaultValues?.value_score || 8);
        setTimeSensitivity(defaultValues?.time_sensitivity || 5);
        setConfidence(defaultValues?.confidence || 8);
        setEffort(defaultValues?.effort || 5);
      }
    }
  }, [isOpen, taskToEdit, defaultProjectId, defaultValues]);

  // Setup FormValidator
  useEffect(() => {
    if (isOpen && formRef.current && !validatorRef.current) {
      const rules = {
        title: {
          required: [true, 'Titel krävs'],
          minLength: [3, 'Minst 3 tecken'],
          maxLength: [100, 'Max 100 tecken'],
        },
      };

      validatorRef.current = new FormValidator(formRef.current, { rules });
    }

    return () => {
      if (validatorRef.current) {
        validatorRef.current.destroy();
        validatorRef.current = null;
      }
    };
  }, [isOpen]);

  // Uppdatera deadline när starttid ändras
  useEffect(() => {
    if (scheduledStart && !taskToEdit) {
      setDeadline(getDefaultDeadline(scheduledStart));
    }
  }, [scheduledStart, taskToEdit]);

  const handleSubmit = async () => {
    if (validatorRef.current && !validatorRef.current.validate()) {
      return;
    }

    // Beräkna estimated_duration från chips eller custom
    let estimatedDuration: number | undefined;
    if (selectedTimeChip >= 0 && selectedTimeChip < 3) {
      estimatedDuration = timeChips[selectedTimeChip].value;
    } else if (selectedTimeChip === 3 && customDuration) {
      estimatedDuration = customDuration;
    }

    const taskData = {
      title,
      description: description || undefined,
      project_id: selectedProject || undefined,
      estimated_duration: estimatedDuration,
      scheduled_start: scheduledStart?.toISOString(),
      deadline: deadline?.toISOString(),
      status,
      priority_flag: priorityFlag,
      value_score: valueScore,
      time_sensitivity: timeSensitivity,
      confidence: confidence,
      effort: effort,
    };

    if (taskToEdit) {
      await updateTask(taskToEdit.id, taskData);
    } else {
      await createTask({
        ...taskData,
        value_score: valueScore,
        time_sensitivity: timeSensitivity,
        confidence: confidence,
        effort: effort,
      });
    }

    onClose();
  };

  const dialogButtons: ButtonPropsModel[] = [
    {
      buttonModel: {
        content: taskToEdit ? 'Spara ändringar' : 'Skapa uppgift',
        isPrimary: true,
        cssClass: 'e-primary'
      },
      click: handleSubmit
    },
    {
      buttonModel: {
        content: 'Avbryt',
        cssClass: 'e-flat'
      },
      click: onClose
    }
  ];

  // Villkorlig rendering enligt SF best practice
  if (!isOpen) return null;

  return (
    <DialogComponent
      width="min(95%, 800px)"
      header={taskToEdit ? 'Redigera uppgift' : 'Ny uppgift'}
      visible={true}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      buttons={dialogButtons}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog"
    >
      <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* Titel */}
        <TextBoxComponent
          name="title"
          placeholder="Vad ska göras?"
          floatLabelType="Auto"
          value={title}
          input={(e) => setTitle(e.value)}
        />

        {/* Beskrivning */}
        <TextBoxComponent
          placeholder="Detaljer (valfritt)"
          floatLabelType="Auto"
          multiline={true}
          value={description}
          input={(e) => setDescription(e.value)}
        />

        {/* Tidsval - ChipList */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 600 }}>
            Uppskattad tid
          </label>
          <ChipListComponent
            chips={timeChips.map(chip => chip.text)}
            selection="Single"
            selectedChips={selectedTimeChip >= 0 ? [selectedTimeChip] : undefined}
            click={(e: any) => setSelectedTimeChip(e.index)}
          />

          {/* Visa NumericTextBox om "Anpassad" valts */}
          {selectedTimeChip === 3 && (
            <div style={{ marginTop: '12px' }}>
              <NumericTextBoxComponent
                placeholder="Minuter"
                floatLabelType="Auto"
                format="n0"
                min={1}
                step={15}
                value={customDuration || undefined}
                change={(e) => setCustomDuration(e.value)}
              />
            </div>
          )}
        </div>

        {/* Starttid och Deadline */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <DateTimePickerComponent
            placeholder="Starttid"
            floatLabelType="Auto"
            value={scheduledStart || undefined}
            change={(e) => setScheduledStart(e.value)}
            format="yyyy-MM-dd HH:mm"
          />
          <DateTimePickerComponent
            placeholder="Deadline"
            floatLabelType="Auto"
            value={deadline || undefined}
            change={(e) => setDeadline(e.value)}
            format="yyyy-MM-dd HH:mm"
          />
        </div>

        {/* Status och Projekt */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <DropDownListComponent
            dataSource={statusOptions}
            fields={{ text: 'text', value: 'value' }}
            floatLabelType="Auto"
            placeholder="Status"
            value={status}
            change={(e) => setStatus(e.value)}
          />
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <DropDownListComponent
                dataSource={projects as any}
                fields={{ text: 'name', value: 'id' }}
                placeholder="Projekt (valfritt)"
                floatLabelType="Auto"
                allowFiltering={true}
                value={selectedProject}
                change={(e) => setSelectedProject(e.value || null)}
              />
            </div>
            <ButtonComponent
              cssClass="e-outline"
              iconCss="e-icons e-plus"
              onClick={() => window.open('/projects/new', '_blank')}
              title="Skapa nytt projekt"
            />
          </div>
        </div>

        {/* Deadline-varning */}
        {hasDeadlineConflict && (
          <div className="e-p-12 e-rounded-lg" style={{
            backgroundColor: '#fef3c7',
            border: '2px solid #f59e0b'
          }}>
            <div className="e-flex e-align-center e-gap-8">
              <span className="e-icons e-warning" style={{ fontSize: '16px', color: '#d97706' }}></span>
              <div className="e-flex-1">
                <p className="e-font-bold e-text-sm e-m-0" style={{ color: '#78350f' }}>
                  ⚠️ Task-deadline efter projekt-deadline
                </p>
                <p className="e-text-xs e-m-0 e-mt-4" style={{ color: '#92400e' }}>
                  Task: {deadline ? new Date(deadline).toLocaleDateString('sv-SE') : ''} •
                  Projekt: {selectedProjectData?.project_deadline ? new Date(selectedProjectData.project_deadline).toLocaleDateString('sv-SE') : ''}
                </p>
                <p className="e-text-xs e-m-0 e-mt-4" style={{ color: '#92400e' }}>
                  💡 Överväg att justera task-deadline eller projekt-deadline
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Avancerat-sektion */}
        <div>
          <CheckBoxComponent
            label="Visa avancerade inställningar"
            checked={showAdvanced}
            change={(e: any) => setShowAdvanced(e.checked)}
          />
        </div>

        {showAdvanced && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '16px', backgroundColor: 'var(--primary-50)', borderRadius: '8px' }}>

            {/* Priority Flag */}
            <DropDownListComponent
              dataSource={priorityFlagOptions}
              fields={{ text: 'text', value: 'value' }}
              placeholder="Prioritet"
              floatLabelType="Auto"
              value={priorityFlag}
              change={(e) => setPriorityFlag(e.value)}
            />

            {/* CPM-parametrar */}
            <div>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Värde/Konsekvens om det INTE görs: {valueScore}
              </label>
              <SliderComponent
                value={valueScore}
                min={1}
                max={10}
                step={1}
                tooltip={{ isVisible: true, placement: 'Before' }}
                change={(e: any) => setValueScore(e.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Tidskänslighet (kostnad av att vänta): {timeSensitivity}
              </label>
              <SliderComponent
                value={timeSensitivity}
                min={1}
                max={10}
                step={1}
                tooltip={{ isVisible: true, placement: 'Before' }}
                change={(e: any) => setTimeSensitivity(e.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Säkerhet i bedömningen: {confidence}
              </label>
              <SliderComponent
                value={confidence}
                min={1}
                max={10}
                step={1}
                tooltip={{ isVisible: true, placement: 'Before' }}
                change={(e: any) => setConfidence(e.value)}
              />
            </div>

            <div>
              <label style={{ fontSize: '12px', color: '#666', marginBottom: '8px', display: 'block' }}>
                Uppskattad ansträngning: {effort}
              </label>
              <SliderComponent
                value={effort}
                min={1}
                max={10}
                step={1}
                tooltip={{ isVisible: true, placement: 'Before' }}
                change={(e: any) => setEffort(e.value)}
              />
            </div>
          </div>
        )}

      </form>
    </DialogComponent>
  );
}
