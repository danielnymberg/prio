import { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ title, description, icon, action }: EmptyStateProps) {
  return (
    <div className="e-flex e-flex-column e-align-center e-justify-center e-p-32 e-text-center">
      {icon && (
        <div className="e-mb-16" style={{ color: 'var(--e-text-secondary)' }}>
          {icon}
        </div>
      )}

      <h3 className="e-text-lg e-font-medium e-mb-8" style={{ color: 'var(--e-text)' }}>
        {title}
      </h3>

      {description && (
        <p className="e-text-sm e-mb-16 e-max-w-lg" style={{ color: 'var(--e-text-secondary)' }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="e-inline-flex e-align-center e-gap-8 e-text-sm e-font-medium e-cursor-pointer e-transition-colors"
          style={{
            color: 'var(--copper-600)',
            background: 'none',
            border: 'none',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--copper-500)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--copper-600)'}
        >
          <Plus style={{ height: '16px', width: '16px' }} />
          {action.label}
        </button>
      )}
    </div>
  );
}
