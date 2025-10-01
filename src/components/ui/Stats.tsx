interface StatsProps {
  stats: {
    label: string;
    value: number;
    variant?: 'default' | 'warning' | 'danger';
  }[];
}

export function Stats({ stats }: StatsProps) {
  const variantStyles = {
    default: 'text-gray-900 dark:text-white',
    warning: 'text-amber-600 dark:text-amber-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className="flex items-center gap-6 text-sm">
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-2">
          <span
            className={`font-bold text-lg ${variantStyles[stat.variant || 'default']}`}
          >
            {stat.value}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {stat.label}
          </span>
        </div>
      ))}
    </div>
  );
}
