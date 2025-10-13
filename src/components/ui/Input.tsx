import { InputHTMLAttributes, forwardRef, CSSProperties } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = '', label, error, style, ...props }, ref) => {
    const containerStyle: CSSProperties = {
      width: '100%',
    };

    const labelStyle: CSSProperties = {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: 'var(--e-text)',
      marginBottom: '4px',
    };

    const inputStyle: CSSProperties = {
      width: '100%',
      padding: '12px 16px',
      border: error ? '1px solid #ef4444' : '1px solid var(--e-border)',
      borderRadius: '8px',
      outline: 'none',
      minHeight: '44px',
      fontSize: '16px',
      backgroundColor: 'var(--e-surface)',
      color: 'var(--e-text)',
      ...style,
    };

    const errorStyle: CSSProperties = {
      marginTop: '4px',
      fontSize: '14px',
      color: '#ef4444',
    };

    // Media query handling via CSS-in-JS
    if (window.matchMedia('(min-width: 640px)').matches) {
      inputStyle.padding = '8px 12px';
      inputStyle.fontSize = '14px';
    }

    return (
      <div style={containerStyle}>
        {label && (
          <label style={labelStyle}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          style={inputStyle}
          onFocus={(e) => {
            e.target.style.outline = '2px solid var(--primary-400)';
            e.target.style.outlineOffset = '2px';
            if (error) {
              e.target.style.outline = '2px solid #ef4444';
            }
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            e.target.style.outline = 'none';
            props.onBlur?.(e);
          }}
          {...props}
        />
        {error && (
          <p style={errorStyle}>{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
