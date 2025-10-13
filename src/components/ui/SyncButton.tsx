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
  style?: React.CSSProperties;
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
    style,
    title,
    iconCss,
    iconPosition = 'Left',
  }, ref) => {
    const cssClass = `${variantMap[variant]} ${sizeMap[size]} ${className}`.trim();

    // Handle click on wrapper div to ensure it always works
    const handleClick = (e: any) => {
      if (!disabled && !loading && onClick) {
        onClick(e);
      }
    };

    return (
      <div
        title={title}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
        style={{
          display: 'inline-block',
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          ...style
        }}
      >
        <ButtonComponent
          ref={ref}
          cssClass={cssClass}
          disabled={disabled || loading}
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
