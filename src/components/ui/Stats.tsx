interface StatsProps {
  stats: {
    label: string;
    value: number;
    variant?: 'default' | 'warning' | 'danger';
  }[];
}

export function Stats({ stats }: StatsProps) {
  const variantStyles = {
    default: 'var(--e-text, #111827)',
    warning: '#f59e0b',
    danger: '#ef4444',
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', fontSize: '14px' }}>
      {stats.map((stat, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontWeight: 'bold',
              fontSize: '18px',
              color: variantStyles[stat.variant || 'default']
            }}
          >
            {stat.value}
          </span>
          <span style={{ color: 'var(--e-text-secondary, #6b7280)' }}>
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
