import { forwardRef, ReactNode } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface SyncButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: any) => void;
  onMouseDown?: (e: any) => void;
  onMouseUp?: (e: any) => void;
  onTouchStart?: (e: any) => void;
  onTouchEnd?: (e: any) => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
  title?: string;
  type?: 'button' | 'submit' | 'reset';
  iconCss?: string;
  iconPosition?: 'Left' | 'Right';
}

const variantMap = {
  primary: 'e-primary e-round',
  secondary: 'e-outline e-round',
  ghost: 'e-link',
  danger: 'e-danger e-round',
};

const sizeMap = {
  sm: 'e-small',
  md: '',
  lg: 'e-large',
};

export const SyncButton = forwardRef<any, SyncButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    onClick,
    onMouseDown,
    onMouseUp,
    onTouchStart,
    onTouchEnd,
    disabled = false,
    loading = false,
    children,
    className = '',
    title,
    iconCss,
    iconPosition = 'Left',
  }, ref) => {
    const cssClass = `prio-button ${variantMap[variant]} ${sizeMap[size]} ${className}`;

    return (
      <div
        title={title}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <ButtonComponent
          ref={ref}
          cssClass={cssClass}
          disabled={disabled || loading}
          onClick={onClick}
          enableRtl={false}
          isPrimary={variant === 'primary'}
          iconCss={iconCss}
          iconPosition={iconPosition}
        >
          {loading && <span className="e-spinner-pane e-spin-show"></span>}
          {children}
        </ButtonComponent>
      </div>
    );
  }
);

SyncButton.displayName = 'SyncButton';
