import { useState } from 'react';
import { Mic, Plus, Camera } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput } from '@/lib/types';

interface QuickCaptureBarProps {
  onVoiceClick: () => void;
}

export function QuickCaptureBar({ onVoiceClick }: QuickCaptureBarProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { createTask } = useTasks();

  // Photo capture kommer i FAS 3
  const handlePhotoCapture = () => {
    alert('📸 Foto-funktion kommer snart! Använd röst eller text för att skapa tasks.');
  };

  return (
    <>
      {/* Floating bottom bar - endast synlig på mobil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl">
        <div className="flex items-center justify-around p-3 pb-safe">
          <Button
            variant="ghost"
            size="lg"
            onClick={onVoiceClick}
            className="flex flex-col items-center gap-1 min-w-[80px] min-h-[60px]"
            title="Röstinmatning"
          >
            <Mic className="h-6 w-6" />
            <span className="text-xs">Röst</span>
          </Button>

          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsFormOpen(true)}
            className="flex flex-col items-center gap-1 min-w-[80px] min-h-[60px] shadow-lg"
            title="Skapa task"
          >
            <Plus className="h-6 w-6" />
            <span className="text-xs">Ny task</span>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handlePhotoCapture}
            className="flex flex-col items-center gap-1 min-w-[80px] min-h-[60px]"
            title="Foto (kommer snart)"
          >
            <Camera className="h-6 w-6" />
            <span className="text-xs">Foto</span>
          </Button>
        </div>
      </div>

      {/* Task form modal */}
      <TaskForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={async (input) => {
          await createTask(input as CreateTaskInput);
        }}
      />

      {/* Spacer för att innehåll inte täcks av fixed bar */}
      <div className="lg:hidden h-20" />
    </>
  );
}
