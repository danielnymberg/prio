import { ReactNode } from 'react';
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
  return (
    <DialogComponent
      visible={isOpen}
      header={title}
      showCloseIcon={true}
      width={sizeMap[size]}
      isModal={true}
      close={onClose}
      animationSettings={animationSettings}
      cssClass="e-dlg-custom prio-dialog"
      enableResize={false}
      allowDragging={false}
      closeOnEscape={true}
      target="body"
      zIndex={1000}
    >
      <div className="prio-dialog-content">
        {children}
      </div>
    </DialogComponent>
  );
}
