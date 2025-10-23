// Lucide icons replaced with SyncFusion e-icons

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
    if (p >= 50) return { label: 'Hög', color: 'var(--success-500, #10b981)', bg: 'var(--success-100, rgba(220, 252, 231, 0.5))', iconClass: 'e-arrow-up' };
    if (p >= 20) return { label: 'Medel', color: 'var(--warning-500, var(--warning-500))', bg: 'var(--warning-100, rgba(254, 243, 199, 0.5))', iconClass: 'e-minus' };
    return { label: 'Låg', color: 'var(--e-text-secondary, #6b7280)', bg: 'var(--e-surface-secondary, #f9fafb)', iconClass: 'e-arrow-down' };
  };

  const level = getPriorityLevel(rounded);

  return (
    <div className="e-p-16 e-rounded-md e-border" style={{
      borderColor: 'var(--e-border, #d1d5db)',
      backgroundColor: level.bg
    }}>
      <div className="e-flex e-align-center e-justify-between e-mb-8">
        <span className="e-text-sm e-font-medium" style={{ color: 'var(--e-text, #374151)' }}>
          Beräknad prioritet
        </span>
        <span className={`e-icons ${level.iconClass}`} style={{ fontSize: '16px', color: level.color }}></span>
      </div>
      <div className="e-flex e-align-baseline e-gap-8">
        <span className="e-font-bold" style={{ fontSize: '30px', color: level.color }}>
          {rounded}
        </span>
        <span className="e-text-sm e-font-medium" style={{ color: level.color }}>
          {level.label}
        </span>
      </div>
      <div className="e-mt-12 e-text-xs" style={{ color: 'var(--e-text-secondary, #6b7280)' }}>
        ({value} × {timeSensitivity} × {confidence}) / {effort}
      </div>
    </div>
  );
}
