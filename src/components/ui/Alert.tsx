interface AlertProps {
  variant?: 'info' | 'warning' | 'success' | 'error';
  title?: string;
  children: React.ReactNode;
}

const variantConfig = {
  info: {
    iconCss: 'e-icons e-info',
    iconColor: 'var(--primary-500)',
  },
  warning: {
    iconCss: 'e-icons e-warning',
    iconColor: 'var(--warning-500)',
  },
  success: {
    iconCss: 'e-icons e-check',
    iconColor: '#10b981',
  },
  error: {
    iconCss: 'e-icons e-close',
    iconColor: '#ef4444',
  },
};

export function Alert({ variant = 'info', title, children }: AlertProps) {
  const config = variantConfig[variant];

  return (
    <div className="e-border e-rounded-lg e-p-16" style={{ backgroundColor: 'var(--e-surface)' }}>
      <div className="e-flex e-align-start e-gap-12">
        <span className={config.iconCss} style={{
          fontSize: '16px',
          color: config.iconColor,
          marginTop: '2px'
        }}></span>
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
