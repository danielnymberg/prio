import { Clock } from 'lucide-react';

interface DurationPickerProps {
  value: number | null;
  onChange: (minutes: number | null) => void;
}

const presets = [
  { label: '15 min', minutes: 15 },
  { label: '30 min', minutes: 30 },
  { label: '1 timme', minutes: 60 },
  { label: '2 timmar', minutes: 120 },
  { label: '4 timmar', minutes: 240 },
  { label: '1 dag', minutes: 480 },
];

export function DurationPicker({ value, onChange }: DurationPickerProps) {
  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        <Clock className="h-4 w-4" />
        Uppskattad tid
      </label>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => onChange(preset.minutes)}
            className={`px-4 py-2 rounded-lg border-2 transition-all text-sm font-medium ${
              value === preset.minutes
                ? 'border-copper-500 bg-sand-100 dark:bg-charcoal-850 text-copper-600 dark:text-sand-200'
                : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          Rensa
        </button>
      )}
    </div>
  );
}
