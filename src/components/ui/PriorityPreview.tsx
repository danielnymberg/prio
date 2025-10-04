import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface PriorityPreviewProps {
  value: number;
  timeSensitivity: number;
  confidence: number;
  effort: number;
}

export function PriorityPreview({
  value,
  timeSensitivity,
  confidence,
  effort,
}: PriorityPreviewProps) {
  const priority = effort > 0 ? (value * timeSensitivity * confidence) / effort : 0;
  const rounded = Math.round(priority * 10) / 10;

  const getPriorityLevel = (p: number) => {
    if (p >= 50) return { label: 'Hög', color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20', icon: TrendingUp };
    if (p >= 20) return { label: 'Medel', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20', icon: Minus };
    return { label: 'Låg', color: 'text-gray-600 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-700/20', icon: TrendingDown };
  };

  const level = getPriorityLevel(rounded);
  const Icon = level.icon;

  return (
    <div className={`p-4 rounded-lg border ${level.bg} border-gray-200 dark:border-gray-700`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Beräknad prioritet
        </span>
        <Icon className={`h-5 w-5 ${level.color}`} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-3xl font-bold ${level.color}`}>
          {rounded}
        </span>
        <span className={`text-sm font-medium ${level.color}`}>
          {level.label}
        </span>
      </div>
      <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        ({value} × {timeSensitivity} × {confidence}) / {effort}
      </div>
    </div>
  );
}
