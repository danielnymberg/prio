import { useState, useEffect, useRef } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import type { Task, TaskStatus, PriorityFlag } from '@/lib/types';

// SyncFusion imports - Pure SF implementation
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';
import { TextBoxComponent, NumericTextBoxComponent, SliderComponent } from '@syncfusion/ej2-react-inputs';
import { DatePickerComponent } from '@syncfusion/ej2-react-calendars';
import { DropDownListComponent } from '@syncfusion/ej2-react-dropdowns';
import { RadioButtonComponent, ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { FormValidator } from '@syncfusion/ej2-inputs';

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

// Animation settings för dialog
const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0
};

export function TaskForm({ isOpen, onClose, taskToEdit, defaultValues }: TaskFormProps) {
  const { createTask, updateTask } = useTasks();
  const { projects } = useProjects();

  // Form state - Grundläggande fält
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [status, setStatus] = useState<TaskStatus>('not_started');
  const [deadline, setDeadline] = useState<Date | null>(null);
  const [priorityFlag, setPriorityFlag] = useState<PriorityFlag | null>(null);

  // CPM parametrar (byt från importance/urgency)
  const [valueScore, setValueScore] = useState(8);
  const [timeSensitivity, setTimeSensitivity] = useState(5);
  const [confidence, setConfidence] = useState(8);
  const [effort, setEffort] = useState(5);

  // Nya fält från databasen
  const [importance, setImportance] = useState(5);
  const [urgency, setUrgency] = useState(10);
  const [complexity, setComplexity] = useState(5);
  const [energyRequired, setEnergyRequired] = useState<'low' | 'medium' | 'high'>('medium');
  const [consequence1Week, setConsequence1Week] = useState('');
  const [consequence1Month, setConsequence1Month] = useState('');
  const [consequence1Year, setConsequence1Year] = useState('');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [useAI, setUseAI] = useState(false);
  const [aiInput, setAIInput] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);

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
        // Legacy fält (behålls för bakåtkompatibilitet)
        setImportance((taskToEdit as any).importance || 5);
        setUrgency((taskToEdit as any).urgency || 10);
        setComplexity((taskToEdit as any).complexity || 5);
        setEnergyRequired((taskToEdit as any).energy_required || 'medium');
        setConsequence1Week((taskToEdit as any).consequence_1week || '');
        setConsequence1Month((taskToEdit as any).consequence_1month || '');
        setConsequence1Year((taskToEdit as any).consequence_1year || '');
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
        setImportance(5);
        setUrgency(10);
        setComplexity(5);
        setEnergyRequired('medium');
        setConsequence1Week('');
        setConsequence1Month('');
        setConsequence1Year('');
        setUseAI(false);
        setAIInput('');
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

  // AI-parsing av naturligt språk
  const parseWithAI = async () => {
    if (!aiInput.trim()) return;

    setIsProcessingAI(true);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) throw new Error('Not authenticated');

      const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://prio-backend.onrender.com';
      const response = await fetch(`${BACKEND_URL}/api/parse-task`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ description: aiInput }),
      });

      if (!response.ok) throw new Error('Failed to parse task');

      const parsed = await response.json();

      // Fyll i formuläret med AI-förslag
      if (parsed.title) setTitle(parsed.title);
      if (parsed.description) setDescription(parsed.description);
      if (parsed.value_score) setValueScore(parsed.value_score);
      if (parsed.time_sensitivity) setTimeSensitivity(parsed.time_sensitivity);
      if (parsed.confidence) setConfidence(parsed.confidence);
      if (parsed.effort) setEffort(parsed.effort);
      if (parsed.deadline) setDeadline(new Date(parsed.deadline));
      if (parsed.estimated_duration) setEstimatedDuration(parsed.estimated_duration);
      if (parsed.priority_flag) setPriorityFlag(parsed.priority_flag);

      // Växla till manuellt läge för att visa resultatet
      setUseAI(false);
      setShowAdvanced(true); // Visa avancerat så användaren ser alla fält
    } catch (error) {
      console.error('AI parsing error:', error);
      // Vid fel, behåll texten i title
      setTitle(aiInput);
      setUseAI(false);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleSubmit = async () => {
    // Om i AI-läge, parsa först
    if (useAI && aiInput.trim()) {
      await parseWithAI();
      return; // Låt användaren granska innan spara
    }

    // Validate form
    if (validatorRef.current && !validatorRef.current.validate()) {
      return;
    }

    const taskData: any = {
      title,
      description: description || undefined,
      project_id: selectedProject || undefined,
      estimated_duration: estimatedDuration || undefined,
      status,
      deadline: deadline ? deadline.toISOString().split('T')[0] : undefined,
      priority_flag: !deadline && priorityFlag ? priorityFlag : null,
      value_score: valueScore,
      time_sensitivity: timeSensitivity,
      confidence: confidence,
      effort: effort,
      importance: importance,
      urgency: urgency,
    };

    // Lägg till avancerade fält om de är ifyllda
    if (showAdvanced) {
      if (complexity !== 5) taskData.complexity = complexity;
      if (energyRequired !== 'medium') taskData.energy_required = energyRequired;
      if (consequence1Week) taskData.consequence_1week = consequence1Week;
      if (consequence1Month) taskData.consequence_1month = consequence1Month;
      if (consequence1Year) taskData.consequence_1year = consequence1Year;
    }

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, taskData);
      } else {
        await createTask(taskData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  // Dialog buttons enligt SF best practice
  const getDialogButtons = (): ButtonPropsModel[] => {
    if (useAI && aiInput.trim()) {
      // I AI-läge, visa "Analysera med AI"
      return [
        {
          buttonModel: {
            content: isProcessingAI ? 'Analyserar...' : 'Analysera med AI',
            isPrimary: true,
            disabled: isProcessingAI,
            iconCss: isProcessingAI ? 'e-icons e-spinner' : 'e-icons e-sparkle'
          },
          click: parseWithAI
        },
        {
          buttonModel: {
            content: 'Avbryt',
            cssClass: 'e-flat'
          },
          click: onClose
        }
      ];
    }

    return [
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
  };

  // Dialog content som JSX
  const getDialogContent = (): JSX.Element => {
    return (
      <form ref={formRef} style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
        {/* Toggle mellan AI och manuell input */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <ButtonComponent
            onClick={() => setUseAI(false)}
            cssClass={!useAI ? 'e-primary' : 'e-outline'}
            content="Manuell inmatning"
          />
          <ButtonComponent
            onClick={() => setUseAI(true)}
            cssClass={useAI ? 'e-primary' : 'e-outline'}
            content="AI-assisterad"
            iconCss="e-icons e-sparkle"
          />
        </div>

        {/* AI Input */}
        {useAI ? (
          <div>
            <TextBoxComponent
              placeholder="Beskriv uppgiften i naturligt språk, t.ex. 'Skriva rapport för Q4, deadline nästa fredag, viktigt för kvartalsredovisningen'"
              floatLabelType="Auto"
              multiline={true}
              value={aiInput}
              input={(e: any) => setAIInput(e.value)}
              cssClass="e-outline"
            />
            <p style={{ fontSize: '12px', color: 'var(--e-text-secondary)', marginTop: '8px' }}>
              AI kommer att analysera din beskrivning och föreslå prioritet, tidsåtgång och andra parametrar
            </p>
          </div>
        ) : (
          <>
            {/* Titel */}
            <TextBoxComponent
              name="title"
              placeholder="Skriv uppgiftens titel..."
              floatLabelType="Auto"
              value={title}
              input={(e: any) => setTitle(e.value)}
            />

            {/* Beskrivning */}
            <TextBoxComponent
              placeholder="Lägg till detaljer (valfritt)..."
              floatLabelType="Auto"
              multiline={true}
              value={description}
              input={(e: any) => setDescription(e.value)}
            />

            {/* Projekt */}
            <DropDownListComponent
              dataSource={projects as any}
              fields={{ text: 'name', value: 'id' }}
              placeholder="Välj projekt (valfritt)"
              floatLabelType="Auto"
              allowFiltering={true}
              value={selectedProject}
              change={(e: any) => setSelectedProject(e.value || null)}
            />

            {/* Tidsuppskattning */}
            <NumericTextBoxComponent
              placeholder="Minuter"
              floatLabelType="Auto"
              format="n0"
              min={1}
              step={15}
              value={estimatedDuration || undefined}
              change={(e: any) => setEstimatedDuration(e.value)}
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
                    change={(e: any) => setStatus(e.value)}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <DatePickerComponent
                    format="yyyy-MM-dd"
                    floatLabelType="Auto"
                    placeholder="Välj slutdatum (valfritt)"
                    value={deadline || undefined}
                    change={(e: any) => setDeadline(e.value)}
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
                  change={(e: any) => setStatus(e.value)}
                />
                <DatePickerComponent
                  format="yyyy-MM-dd"
                  floatLabelType="Auto"
                  placeholder="Välj slutdatum (valfritt)"
                  value={deadline || undefined}
                  change={(e: any) => setDeadline(e.value)}
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
                change={(e: any) => setPriorityFlag(e.value || null)}
              />
            )}

            {/* Avancerat-sektion */}
            <div>
              <ButtonComponent
                content={showAdvanced ? 'Dölj avancerade inställningar' : 'Visa avancerade inställningar'}
                onClick={() => setShowAdvanced(!showAdvanced)}
                cssClass="e-outline"
              />
            </div>

            {showAdvanced && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingLeft: '16px', borderLeft: '2px solid var(--e-border)' }}>

                {/* CPM Parametrar */}
                <h4 style={{ margin: '0 0 8px 0', color: 'var(--e-text)' }}>CPM Prioritering</h4>

                <SliderComponent
                  value={valueScore}
                  min={1}
                  max={10}
                  step={1}
                  tooltip={{ isVisible: true, placement: 'Before', format: 'Värde: {value}' }}
                  ticks={{ placement: 'After', largeStep: 3, smallStep: 1 }}
                  change={(e: any) => setValueScore(e.value)}
                />

                <SliderComponent
                  value={timeSensitivity}
                  min={1}
                  max={10}
                  step={1}
                  tooltip={{ isVisible: true, placement: 'Before', format: 'Tidskänslighet: {value}' }}
                  ticks={{ placement: 'After', largeStep: 3, smallStep: 1 }}
                  change={(e: any) => setTimeSensitivity(e.value)}
                />

                <SliderComponent
                  value={confidence}
                  min={1}
                  max={10}
                  step={1}
                  tooltip={{ isVisible: true, placement: 'Before', format: 'Säkerhet: {value}' }}
                  ticks={{ placement: 'After', largeStep: 3, smallStep: 1 }}
                  change={(e: any) => setConfidence(e.value)}
                />

                <SliderComponent
                  value={effort}
                  min={1}
                  max={10}
                  step={1}
                  tooltip={{ isVisible: true, placement: 'Before', format: 'Ansträngning: {value}' }}
                  ticks={{ placement: 'After', largeStep: 3, smallStep: 1 }}
                  change={(e: any) => setEffort(e.value)}
                />

                {/* Legacy parametrar */}
                <h4 style={{ margin: '16px 0 8px 0', color: 'var(--e-text)' }}>Eisenhower Matrix (legacy)</h4>

                <div style={{ display: 'flex', gap: '16px' }}>
                  <NumericTextBoxComponent
                    placeholder="Importance (1-10)"
                    floatLabelType="Auto"
                    format="n0"
                    min={1}
                    max={10}
                    step={1}
                    value={importance}
                    change={(e: any) => setImportance(e.value || 5)}
                  />
                  <NumericTextBoxComponent
                    placeholder="Urgency (1-10)"
                    floatLabelType="Auto"
                    format="n0"
                    min={1}
                    max={10}
                    step={1}
                    value={urgency}
                    change={(e: any) => setUrgency(e.value || 10)}
                  />
                </div>

                {/* Energinivå */}
                <h4 style={{ margin: '16px 0 8px 0', color: 'var(--e-text)' }}>Energikrav</h4>
                <div style={{ display: 'flex', gap: '24px' }}>
                  <RadioButtonComponent
                    label="Låg"
                    name="energyRequired"
                    value="low"
                    checked={energyRequired === 'low'}
                    change={(e: any) => e.checked && setEnergyRequired('low')}
                  />
                  <RadioButtonComponent
                    label="Medium"
                    name="energyRequired"
                    value="medium"
                    checked={energyRequired === 'medium'}
                    change={(e: any) => e.checked && setEnergyRequired('medium')}
                  />
                  <RadioButtonComponent
                    label="Hög"
                    name="energyRequired"
                    value="high"
                    checked={energyRequired === 'high'}
                    change={(e: any) => e.checked && setEnergyRequired('high')}
                  />
                </div>

                {/* Konsekvensanalys */}
                <h4 style={{ margin: '16px 0 8px 0', color: 'var(--e-text)' }}>Konsekvenser av att skjuta upp</h4>
                <TextBoxComponent
                  placeholder="Om 1 vecka..."
                  floatLabelType="Auto"
                  multiline={true}
                  value={consequence1Week}
                  input={(e: any) => setConsequence1Week(e.value)}
                />
                <TextBoxComponent
                  placeholder="Om 1 månad..."
                  floatLabelType="Auto"
                  multiline={true}
                  value={consequence1Month}
                  input={(e: any) => setConsequence1Month(e.value)}
                />
                <TextBoxComponent
                  placeholder="Om 1 år..."
                  floatLabelType="Auto"
                  multiline={true}
                  value={consequence1Year}
                  input={(e: any) => setConsequence1Year(e.value)}
                />

                {/* Komplexitet */}
                <NumericTextBoxComponent
                  placeholder="Komplexitet (1-10)"
                  floatLabelType="Auto"
                  format="n0"
                  min={1}
                  max={10}
                  step={1}
                  value={complexity}
                  change={(e: any) => setComplexity(e.value || 5)}
                />
              </div>
            )}
          </>
        )}
      </form>
    );
  };

  // Render DialogComponent direkt enligt SF best practice
  return (
    <DialogComponent
      width="90%"
      height="auto"
      header={taskToEdit ? 'Redigera uppgift' : 'Ny uppgift'}
      visible={isOpen}
      close={onClose}
      showCloseIcon={true}
      isModal={true}
      buttons={getDialogButtons()}
      animationSettings={animationSettings}
      target="body"
      cssClass="e-responsive-dialog e-dlg-responsive"
      allowDragging={false}
      enableResize={false}
      closeOnEscape={true}
    >
      {getDialogContent()}
    </DialogComponent>
  );
}
