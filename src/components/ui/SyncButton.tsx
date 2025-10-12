import { forwardRef, ReactNode } from 'react';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';

interface SyncButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: (e: any) => void;
  disabled?: boolean;
  loading?: boolean;
  children: ReactNode;
  className?: string;
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
    disabled = false,
    loading = false,
    children,
    className = '',
    type = 'button',
    iconCss,
    iconPosition = 'Left',
  }, ref) => {
    const cssClass = `prio-button ${variantMap[variant]} ${sizeMap[size]} ${className}`;

    return (
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
    );
  }
);

SyncButton.displayName = 'SyncButton';
