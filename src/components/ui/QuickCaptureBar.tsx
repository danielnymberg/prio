import { useState } from 'react';
import { Plus, Camera } from 'lucide-react';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { TaskForm } from '@/components/tasks/TaskForm';
import { useTasks } from '@/hooks/useTasks';
import { CreateTaskInput } from '@/lib/types';

export function QuickCaptureBar() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const { createTask } = useTasks();

  // Photo capture kommer i FAS 3
  const handlePhotoCapture = () => {
    alert('📸 Foto-funktion kommer snart! Använd text för att skapa tasks.');
  };

  return (
    <>
      {/* Floating bottom bar - endast synlig på mobil */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-cream-100 dark:bg-charcoal-900 border-t border-sand-200 dark:border-charcoal-800 shadow-medium">
        <div className="flex items-center justify-around p-3 pb-safe">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsFormOpen(true)}
            className="flex flex-col items-center gap-1 min-w-[100px] min-h-[60px] shadow-soft flex-1 mx-2"
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
