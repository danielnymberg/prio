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
  blue: 'var(--copper-600, #d4764e)',
  green: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label htmlFor={id} style={{ fontSize: '14px', fontWeight: '500', color: 'var(--e-text, #374151)' }}>
          {label}
        </label>
        {showValue && (
          <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-text, #111827)' }}>
            {formatValue(value)}
          </span>
        )}
      </div>
      {description && (
        <p style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}>{description}</p>
      )}
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: '100%',
          height: '8px',
          backgroundColor: 'var(--e-border, #e5e7eb)',
          borderRadius: '8px',
          appearance: 'none',
          cursor: 'pointer',
          accentColor: colorAccents[color]
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}>
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
