import { ReactNode, useRef, useEffect, useState } from 'react';
import { DialogComponent, AnimationSettingsModel } from '@syncfusion/ej2-react-popups';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: '400px',
  md: '600px',
  lg: '800px',
};

const animationSettings: AnimationSettingsModel = {
  effect: 'Zoom',
  duration: 300,
  delay: 0,
};

export function Dialog({ isOpen, onClose, title, children, size = 'md' }: DialogProps) {
  const dialogRef = useRef<DialogComponent>(null);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  // Track if dialog has ever been opened
  useEffect(() => {
    if (isOpen) {
      setHasBeenOpened(true);
    }
  }, [isOpen]);

  // Sync visible state with isOpen prop
  useEffect(() => {
    if (!dialogRef.current || !hasBeenOpened) return;

    try {
      if (isOpen) {
        dialogRef.current.show();
      } else {
        dialogRef.current.hide();
      }
    } catch (e) {
      console.warn('Dialog state sync error:', e);
    }
  }, [isOpen, hasBeenOpened]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialogRef.current) {
        try {
          dialogRef.current.destroy();
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  // Don't render until first open (prevents unnecessary Portal creation)
  if (!hasBeenOpened) {
    return null;
  }

  return (
    <DialogComponent
      ref={dialogRef}
      visible={isOpen}
      header={title}
      showCloseIcon={true}
      width={sizeMap[size]}
      isModal={true}
      close={onClose}
      animationSettings={animationSettings}
      enableResize={false}
      allowDragging={false}
      closeOnEscape={true}
      target="body"
      zIndex={1000}
      created={() => {
        // Ensure dialog is shown when created if isOpen is true
        if (isOpen && dialogRef.current) {
          dialogRef.current.show();
        }
      }}
    >
      {children}
    </DialogComponent>
  );
}
