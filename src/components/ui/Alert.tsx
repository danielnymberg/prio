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
    iconColor: 'var(--primary-500)',
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

  const iconStyle: CSSProperties = {
    height: '20px',
    width: '20px',
    color: config.iconColor,
    flexShrink: 0,
    marginTop: '2px',
  };

  return (
    <div className="e-border e-rounded-lg e-p-16" style={{ backgroundColor: 'var(--e-surface)' }}>
      <div className="e-flex e-align-start e-gap-12">
        <Icon style={iconStyle} />
        <div className="e-flex-1">
          {title && (
            <h3 className="e-font-semibold e-mb-4" style={{ color: 'var(--e-text)' }}>
              {title}
            </h3>
          )}
          <div className="e-text-sm" style={{ color: 'var(--e-text)' }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
