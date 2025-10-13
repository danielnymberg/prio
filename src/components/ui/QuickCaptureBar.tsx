import { useState, CSSProperties } from 'react';
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

  const containerStyle: CSSProperties = {
    position: 'fixed',
    bottom: '0',
    left: '0',
    right: '0',
    zIndex: 40,
    backgroundColor: 'var(--e-surface)',
    borderTop: '1px solid var(--e-border)',
    boxShadow: '0 -2px 10px rgba(0, 0, 0, 0.1)',
  };

  const innerWrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '12px',
    paddingBottom: 'env(safe-area-inset-bottom, 12px)',
  };

  const primaryButtonStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '100px',
    minHeight: '60px',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    flex: '1',
    margin: '0 8px',
  };

  const secondaryButtonStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    minWidth: '80px',
    minHeight: '60px',
  };

  const iconStyle: CSSProperties = {
    height: '24px',
    width: '24px',
  };

  const textStyle: CSSProperties = {
    fontSize: '12px',
  };

  const spacerStyle: CSSProperties = {
    height: '80px',
  };

  // Hide on desktop (lg breakpoint = 1024px)
  const isDesktop = window.matchMedia('(min-width: 1024px)').matches;

  if (isDesktop) {
    return (
      <>
        <TaskForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (input) => {
            await createTask(input as CreateTaskInput);
          }}
        />
      </>
    );
  }

  return (
    <>
      {/* Floating bottom bar - endast synlig på mobil */}
      <div style={containerStyle}>
        <div style={innerWrapperStyle}>
          <Button
            variant="primary"
            size="lg"
            onClick={() => setIsFormOpen(true)}
            style={primaryButtonStyle}
            title="Skapa task"
          >
            <Plus style={iconStyle} />
            <span style={textStyle}>Ny task</span>
          </Button>

          <Button
            variant="ghost"
            size="lg"
            onClick={handlePhotoCapture}
            style={secondaryButtonStyle}
            title="Foto (kommer snart)"
          >
            <Camera style={iconStyle} />
            <span style={textStyle}>Foto</span>
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
      <div style={spacerStyle} />
    </>
  );
}
