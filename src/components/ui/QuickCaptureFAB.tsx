import { useState } from 'react';
import { SpeedDialComponent, SpeedDialItemModel } from '@syncfusion/ej2-react-buttons';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput } from '@/lib/types';

export function QuickCaptureFAB() {
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const { createTask } = useTasks();

  // Hide on desktop (lg breakpoint = 1024px)
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
  if (isDesktop) return null;

  const items: SpeedDialItemModel[] = [
    {
      text: 'Ny uppgift',
      iconCss: 'e-icons e-plus',
      title: 'Skapa ny uppgift'
    },
    {
      text: 'Röstinmatning',
      iconCss: 'e-icons e-microphone',
      title: 'Starta röstassistent'
    }
  ];

  const handleClick = (args: any) => {
    const text = args.item.text;

    if (text === 'Ny uppgift') {
      setIsTaskFormOpen(true);
    } else if (text === 'Röstinmatning') {
      // Trigger voice interface
      window.dispatchEvent(new Event('trigger-voice'));
    }
  };

  return (
    <>
      <SpeedDialComponent
        items={items}
        position='BottomRight'
        openIconCss='e-icons e-plus'
        closeIconCss='e-icons e-close'
        cssClass='e-primary'
        modal={false}
        clicked={handleClick}
      />

      {/* Task form modal */}
      <TaskForm
        isOpen={isTaskFormOpen}
        onClose={() => setIsTaskFormOpen(false)}
        onSubmit={async (input) => {
          await createTask(input as CreateTaskInput);
          setIsTaskFormOpen(false);
        }}
      />
    </>
  );
}
