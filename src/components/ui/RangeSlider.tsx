import { useId } from 'react';

interface RangeSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  color?: 'blue' | 'green' | 'amber' | 'red';
}

const colorClasses = {
  blue: 'accent-blue-600',
  green: 'accent-green-600',
  amber: 'accent-amber-600',
  red: 'accent-red-600',
};

export function RangeSlider({
  label,
  value,
  onChange,
  min = 1,
  max = 10,
  step = 1,
  description,
  showValue = true,
  formatValue = (v) => String(v),
  color = 'blue',
}: RangeSliderProps) {
  const id = useId();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {showValue && (
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatValue(value)}
          </span>
        )}
      </div>
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 ${colorClasses[color]}`}
      />
      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
