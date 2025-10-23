// Lucide icons replaced with SyncFusion e-icons
import { CSSProperties } from 'react';

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
  const containerStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const labelStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: 'var(--e-text)',
  };

  const gridStyle: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  };

  const getButtonStyle = (isSelected: boolean): CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    border: isSelected ? '2px solid var(--primary-500)' : '2px solid var(--e-border)',
    backgroundColor: isSelected ? 'var(--e-surface)' : 'transparent',
    color: isSelected ? 'var(--primary-500)' : 'var(--e-text)',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s',
  });

  const clearButtonStyle: CSSProperties = {
    fontSize: '14px',
    color: 'var(--e-text)',
    opacity: 0.6,
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
  };

  return (
    <div style={containerStyle}>
      <label style={labelStyle}>
        <span className="e-icons e-time" style={{ fontSize: '12px' }}></span>
        Uppskattad tid
      </label>
      <div style={gridStyle}>
        {presets.map((preset) => (
          <button
            key={preset.minutes}
            type="button"
            onClick={() => onChange(preset.minutes)}
            style={getButtonStyle(value === preset.minutes)}
            onMouseEnter={(e) => {
              if (value !== preset.minutes) {
                e.currentTarget.style.borderColor = 'var(--e-text)';
                e.currentTarget.style.opacity = '0.8';
              }
            }}
            onMouseLeave={(e) => {
              if (value !== preset.minutes) {
                e.currentTarget.style.borderColor = 'var(--e-border)';
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>
      {value && (
        <button
          type="button"
          onClick={() => onChange(null)}
          style={clearButtonStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.6';
          }}
        >
          Rensa
        </button>
      )}
    </div>
  );
}
