import { ReactNode, useRef, useEffect, useState } from 'react';
import { DialogComponent, AnimationSettingsModel, ButtonPropsModel } from '@syncfusion/ej2-react-popups';

export interface DialogButton {
  content: string;
  cssClass?: string;
  isPrimary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  buttons?: DialogButton[];
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

export function Dialog({ isOpen, onClose, title, children, size = 'md', buttons }: DialogProps) {
  const dialogRef = useRef<DialogComponent>(null);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);

  // Map buttons to Syncfusion's native button format
  const dialogButtons: ButtonPropsModel[] | undefined = buttons?.map(btn => ({
    buttonModel: {
      content: btn.content,
      cssClass: btn.cssClass,
      isPrimary: btn.isPrimary,
      disabled: btn.disabled,
    },
    click: btn.onClick,
  }));

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
      zIndex={1000}
      buttons={dialogButtons}
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
