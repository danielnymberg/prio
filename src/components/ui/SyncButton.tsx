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
  primary: 'e-primary',
  secondary: 'e-outline',
  ghost: 'e-flat',
  danger: 'e-danger',
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
    type = 'button',
    iconCss,
    iconPosition = 'Left',
  }, ref) => {
    const cssClass = `${variantMap[variant]} ${sizeMap[size]} ${className}`.trim();

    // Handle click on wrapper div to ensure it always works (but not for submit buttons)
    const handleClick = (e: any) => {
      if (type === 'submit') {
        // Let form handle submit
        return;
      }
      if (!disabled && !loading && onClick) {
        onClick(e);
      }
    };

    // For submit buttons, render without wrapper to allow native form submission
    if (type === 'submit') {
      return (
        <ButtonComponent
          ref={ref}
          cssClass={cssClass}
          disabled={disabled || loading}
          enableRtl={false}
          isPrimary={variant === 'primary'}
          iconCss={iconCss}
          iconPosition={iconPosition}
          type={type}
          style={{
            width: style?.width,
            minHeight: size === 'lg' ? '44px' : size === 'sm' ? '28px' : '36px',
            padding: size === 'lg' ? '10px 20px' : size === 'sm' ? '4px 12px' : '6px 16px',
            ...style
          }}
        >
          {loading && <span className="e-spinner-pane e-spin-show"></span>}
          {children}
        </ButtonComponent>
      );
    }

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
        <div style={{ pointerEvents: 'none' }}>
          <ButtonComponent
            ref={ref}
            cssClass={cssClass}
            disabled={disabled || loading}
            enableRtl={false}
            isPrimary={variant === 'primary'}
            iconCss={iconCss}
            iconPosition={iconPosition}
            type={type}
          >
            {loading && <span className="e-spinner-pane e-spin-show"></span>}
            {children}
          </ButtonComponent>
        </div>
      </div>
    );
  }
);

SyncButton.displayName = 'SyncButton';
