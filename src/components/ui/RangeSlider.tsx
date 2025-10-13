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

const colorAccents = {
  blue: 'var(--primary-600)',
  green: 'var(--success-500, #10b981)',
  amber: 'var(--warning-500, var(--warning-500))',
  red: 'var(--error-500, #ef4444)',
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
    <div className="e-flex e-flex-column e-gap-8">
      <div className="e-flex e-align-center e-justify-between">
        <label htmlFor={id} className="e-text-sm e-font-medium" style={{ color: 'var(--e-text, #374151)' }}>
          {label}
        </label>
        {showValue && (
          <span className="e-text-sm e-font-semibold" style={{ color: 'var(--e-text, #111827)' }}>
            {formatValue(value)}
          </span>
        )}
      </div>
      {description && (
        <p className="e-text-xs" style={{ color: 'var(--e-text-secondary, #6b7280)' }}>{description}</p>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="e-w-full e-rounded-md e-cursor-pointer"
        style={{
          height: '8px',
          backgroundColor: 'var(--e-border, #e5e7eb)',
          appearance: 'none',
          accentColor: colorAccents[color]
        }}
      />
      <div className="e-flex e-justify-between e-text-xs" style={{ color: 'var(--e-text-secondary, #6b7280)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
