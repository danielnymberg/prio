import { ReactNode } from 'react';
// Lucide icons replaced with SyncFusion e-icons

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px',
      textAlign: 'center'
    }}>
      {icon && (
        <div style={{ marginBottom: '16px', color: 'var(--e-text-secondary)' }}>
          {icon}
        </div>
      )}

      <h3 style={{
        fontSize: '20px',
        fontWeight: '500',
        marginBottom: '8px',
        color: 'var(--e-text)'
      }}>
        {title}
      </h3>

      {description && (
        <p style={{
          fontSize: '14px',
          marginBottom: '16px',
          maxWidth: '32rem',
          color: 'var(--e-text-secondary)'
        }}>
          {description}
        </p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'color 0.2s',
            color: 'var(--primary-600)',
            background: 'none',
            border: 'none',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-500)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--primary-600)'}
        >
          <span className="e-icons e-plus" style={{ fontSize: '12px' }}></span>
          {action.label}
        </button>
      )}
    </div>
  );
}
