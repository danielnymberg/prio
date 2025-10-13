import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { CSSProperties } from 'react';

interface AlertProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
}

const variantConfig = {
  info: {
    icon: Info,
    iconColor: 'var(--copper-500)',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: '#f59e0b',
  },
  success: {
    icon: CheckCircle,
    iconColor: '#10b981',
  },
  error: {
    icon: XCircle,
    iconColor: '#ef4444',
  },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const config = variantConfig[variant];
  const Icon = config.icon;

  const containerStyle: CSSProperties = {
    backgroundColor: 'var(--e-surface)',
    border: '1px solid var(--e-border)',
    borderRadius: '8px',
    padding: '16px',
  };

  const contentWrapperStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const iconStyle: CSSProperties = {
    height: '20px',
    width: '20px',
    color: config.iconColor,
    flexShrink: 0,
    marginTop: '2px',
  };

  const textContainerStyle: CSSProperties = {
    flex: '1',
  };

  const titleStyle: CSSProperties = {
    fontWeight: '600',
    color: 'var(--e-text)',
    marginBottom: '4px',
  };

  const textStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--e-text)',
  };

  return (
    <div style={containerStyle}>
      <div style={contentWrapperStyle}>
        <Icon style={iconStyle} />
        <div style={textContainerStyle}>
          {title && (
            <h3 style={titleStyle}>
              {title}
            </h3>
          )}
          <div style={textStyle}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
