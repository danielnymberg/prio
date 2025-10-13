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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
      {icon && (
        <div style={{ marginBottom: '1rem', color: 'var(--e-text-secondary)' }}>
          {icon}
        </div>
      )}

      <h3 style={{ fontSize: '1.125rem', fontWeight: '500', color: 'var(--e-text)', marginBottom: '0.5rem' }}>
        {title}
      </h3>

      {description && (
        <p style={{ fontSize: '0.875rem', color: 'var(--e-text-secondary)', marginBottom: '1rem', maxWidth: '24rem' }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.875rem',
            color: 'var(--copper-600)',
            fontWeight: '500',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s'
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
