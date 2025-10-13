import { ReactNode, useRef, useEffect } from 'react';
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

  // Proper cleanup on unmount
  useEffect(() => {
    return () => {
      if (dialogRef.current) {
        try {
          dialogRef.current.hide();
        } catch (e) {
          // Ignore errors during cleanup
        }
      }
    };
  }, []);

  // Don't render if not open (prevents Portal issues)
  if (!isOpen) return null;

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
    >
      {children}
    </DialogComponent>
  );
}
