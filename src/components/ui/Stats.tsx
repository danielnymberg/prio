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
    warning: 'var(--warning-500, var(--warning-500))',
    danger: 'var(--error-500, #ef4444)',
  };

  return (
    <div className="e-flex e-align-center e-gap-24 e-text-sm">
      {stats.map((stat, index) => (
        <div key={index} className="e-flex e-align-center e-gap-8">
          <span
            className="e-font-bold e-text-lg"
            style={{
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
