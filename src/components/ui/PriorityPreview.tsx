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
    if (p >= 50) return { label: 'Hög', color: '#10b981', bg: 'rgba(220, 252, 231, 0.5)', icon: TrendingUp };
    if (p >= 20) return { label: 'Medel', color: '#f59e0b', bg: 'rgba(254, 243, 199, 0.5)', icon: Minus };
    return { label: 'Låg', color: 'var(--e-text-secondary, #6b7280)', bg: 'var(--e-surface-secondary, #f9fafb)', icon: TrendingDown };
  };

  const level = getPriorityLevel(rounded);
  const Icon = level.icon;

  return (
    <div style={{
      padding: '16px',
      borderRadius: '8px',
      border: '1px solid var(--e-border, #d1d5db)',
      backgroundColor: level.bg
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--e-text, #374151)' }}>
          Beräknad prioritet
        </span>
        <Icon style={{ height: '20px', width: '20px', color: level.color }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '30px', fontWeight: 'bold', color: level.color }}>
          {rounded}
        </span>
        <span style={{ fontSize: '14px', fontWeight: '500', color: level.color }}>
          {level.label}
        </span>
      </div>
      <div style={{ marginTop: '12px', fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}>
        ({value} × {timeSensitivity} × {confidence}) / {effort}
      </div>
    </div>
  );
}
