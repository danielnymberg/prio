import { useState, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Task, TaskStatus, PriorityFlag } from '@/lib/types';

// SyncFusion imports - Pure implementation
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent, NumericTextBoxComponent, SliderComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { FormValidator } from '@syncfusion/ej2-inputs';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface TaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: Task | null;
  defaultValues?: {
    title?: string;
    description?: string;
    value_score?: number;
    time_sensitivity?: number;
    confidence?: number;
    effort?: number;
  };
}

// Animation settings for dialog
const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0
};

export function TaskForm({ isOpen, onClose, taskToEdit, defaultValues }: TaskFormProps) {
  const { createTask, updateTask } = useTasks();
  const { projects } = useProjects();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [priorityFlag, setPriorityFlag] = useState<PriorityFlag | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [valueScore, setValueScore] = useState(8);
  const [timeSensitivity, setTimeSensitivity] = useState(5);
  const [confidence, setConfidence] = useState(8);
  const [effort, setEffort] = useState(5);
  const [isMobile, setIsMobile] = useState(false);

  // FormValidator ref
  const formRef = useRef<HTMLFormElement>(null);
  const validatorRef = useRef<FormValidator | null>(null);

  // Status options
  const statusOptions = [
    { text: 'Inte påbörjad', value: 'not_started' },
    { text: 'Pågår', value: 'in_progress' },
    { text: 'Klar', value: 'done' },
  ];

  // Priority flag options
  const priorityFlagOptions = [
    { text: 'ASAP (gör snart)', value: 'asap' },
    { text: 'När det passar', value: 'whenever' },
    { text: 'Någon gång', value: 'someday' },
  ];

  // Responsive detection
  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    setIsMobile(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // Initialize form values when dialog opens or taskToEdit changes
  useEffect(() => {
    if (isOpen) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDescription(taskToEdit.description || '');
        setSelectedProject(taskToEdit.project_id);
        setEstimatedDuration(taskToEdit.estimated_duration);
        setStatus(taskToEdit.status);
        setDeadline(taskToEdit.deadline ? new Date(taskToEdit.deadline) : null);
        setPriorityFlag(taskToEdit.priority_flag);
        setValueScore(taskToEdit.value_score);
        setTimeSensitivity(taskToEdit.time_sensitivity);
        setConfidence(taskToEdit.confidence);
        setEffort(taskToEdit.effort);
      } else {
        // New task - reset to defaults
        setTitle(defaultValues?.title || '');
        setDescription(defaultValues?.description || '');
        setSelectedProject(null);
        setEstimatedDuration(null);
        setStatus('not_started');
        setDeadline(null);
        setPriorityFlag(null);
        setShowAdvanced(false);
        setValueScore(defaultValues?.value_score || 8);
        setTimeSensitivity(defaultValues?.time_sensitivity || 5);
        setConfidence(defaultValues?.confidence || 8);
        setEffort(defaultValues?.effort || 5);
      }
    }
  }, [isOpen, taskToEdit, defaultValues]);

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

      validatorRef.current = new FormValidator(formRef.current, {
        rules,
      });
    }

    // Cleanup
    return () => {
      if (validatorRef.current) {
        validatorRef.current.destroy();
        validatorRef.current = null;
      }
    };
  }, [isOpen]);

  const handleSubmit = async () => {
    // Validate form
    if (validatorRef.current && !validatorRef.current.validate()) {
      return;
    }

    const taskData = {
      title,
      description: description || undefined,
      project_id: selectedProject || undefined,
      estimated_duration: estimatedDuration || undefined,
      status,
      deadline: deadline ? deadline.toISOString().split('T')[0] : undefined,
      priority_flag: !deadline && priorityFlag ? priorityFlag : null,
      value_score: showAdvanced ? valueScore : 8,
      time_sensitivity: showAdvanced ? timeSensitivity : 5,
      confidence: showAdvanced ? confidence : 8,
      effort: showAdvanced ? effort : 5,
    };

    if (taskToEdit) {
      await updateTask(taskToEdit.id, taskData);
    } else {
      await createTask({
        ...taskData,
        value_score: taskData.value_score,
        time_sensitivity: taskData.time_sensitivity,
        confidence: taskData.confidence,
        effort: taskData.effort,
      });
    }

    onClose();
  };

  // Dialog buttons enligt SyncFusion best practice
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

  // Only render dialog when it should be open to avoid DOM conflicts
  if (!isOpen) return null;

  return (
    <DialogComponent
      width="min(90%, 800px)"
      header={taskToEdit ? 'Redigera uppgift' : 'Ny uppgift'}
      visible={true}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      buttons={dialogButtons}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog"
      allowDragging={false}
      enableResize={false}
      closeOnEscape={true}
    >
      <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Titel */}
        <TextBoxComponent
          name="title"
          placeholder="Skriv uppgiftens titel..."
          floatLabelType="Auto"
          value={title}
          input={(e) => setTitle(e.value)}
        />

        {/* Beskrivning */}
        <TextBoxComponent
          placeholder="Lägg till detaljer (valfritt)..."
          floatLabelType="Auto"
          multiline={true}
          value={description}
          input={(e) => setDescription(e.value)}
        />

        {/* Projekt */}
        <DropDownListComponent
          dataSource={projects as any}
          fields={{ text: 'name', value: 'id' }}
          placeholder="Välj projekt (valfritt)"
          floatLabelType="Auto"
          allowFiltering={true}
          value={selectedProject}
          change={(e) => setSelectedProject(e.value || null)}
        />

        {/* Tidsuppskattning */}
        <NumericTextBoxComponent
          placeholder="Minuter"
          floatLabelType="Auto"
          format="n0"
          min={1}
          step={15}
          value={estimatedDuration || undefined}
          change={(e) => setEstimatedDuration(e.value)}
        />

        {/* Status och Deadline - Responsive layout */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <DropDownListComponent
                dataSource={statusOptions}
                fields={{ text: 'text', value: 'value' }}
                floatLabelType="Auto"
                value={status}
                change={(e) => setStatus(e.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <DatePickerComponent
                format="yyyy-MM-dd"
                floatLabelType="Auto"
                placeholder="Välj slutdatum (valfritt)"
                value={deadline || undefined}
                change={(e) => setDeadline(e.value)}
              />
            </div>
          </div>
        )}

        {/* Mobil layout - Stacked */}
        {isMobile && (
          <>
            <DropDownListComponent
              dataSource={statusOptions}
              fields={{ text: 'text', value: 'value' }}
              floatLabelType="Auto"
              value={status}
              change={(e) => setStatus(e.value)}
            />
            <DatePickerComponent
              format="yyyy-MM-dd"
              floatLabelType="Auto"
              placeholder="Välj slutdatum (valfritt)"
              value={deadline || undefined}
              change={(e) => setDeadline(e.value)}
            />
          </>
        )}

        {/* Priority Flag - Visa endast om ingen deadline */}
        {!deadline && (
          <DropDownListComponent
            dataSource={priorityFlagOptions}
            fields={{ text: 'text', value: 'value' }}
            placeholder="Prioritet (valfritt)"
            floatLabelType="Auto"
            value={priorityFlag}
            change={(e) => setPriorityFlag(e.value || null)}
          />
        )}

        {/* Avancerat-sektion */}
        <div>
          <ButtonComponent
            content={showAdvanced ? 'Dölj avancerade inställningar' : 'Visa avancerade inställningar'}
            onClick={() => setShowAdvanced(!showAdvanced)}
          />
        </div>

        {showAdvanced && (
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '20px', paddingLeft: '16px' }}>
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
