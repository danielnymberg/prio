import { useState } from 'react';
// Lucide icons replaced with SyncFusion e-icons
import { DependencyChain, getCriticalityLevel } from '@/lib/dependencyAnalyzer';
import { formatDuration } from '@/lib/utils';

interface DependencyAlertProps {
  chain: DependencyChain;
}

export function DependencyAlert({ chain }: DependencyAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { level, label, color } = getCriticalityLevel(chain.criticalityScore);

  const getBorderColor = () => {
    if (level === 'critical') return '#ef4444';
    if (level === 'high') return 'var(--warning-500)';
    if (level === 'medium') return 'var(--warning-500)';
    return 'var(--e-border, #d1d5db)';
  };

  const getBgColor = () => {
    if (level === 'critical') return 'rgba(254, 226, 226, 0.5)';
    if (level === 'high') return 'rgba(255, 237, 213, 0.5)';
    if (level === 'medium') return 'rgba(254, 243, 199, 0.5)';
    return 'var(--e-surface, #f9fafb)';
  };

  const rootTask = chain.chain[0];

  return (
    <div style={{
      borderRadius: '8px',
      border: `2px solid ${getBorderColor()}`,
      backgroundColor: getBgColor(),
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span className="e-icons e-warning" style={{ fontSize: '16px', color, flexShrink: 0, marginTop: '2px' }}></span>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontWeight: '600', color, marginBottom: '4px' }}>
                🔗 Kritisk blockeringskedja
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--e-text, #111827)', fontWeight: '500' }}>
                "{rootTask.title}" blockerar {chain.blockedCount} andra{' '}
                {chain.blockedCount === 1 ? 'uppgift' : 'uppgifter'}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  backgroundColor: level === 'critical' ? '#dc2626' : level === 'high' ? 'var(--warning-600)' : level === 'medium' ? 'var(--warning-600)' : '#4b5563',
                  color: '#ffffff'
                }}
              >
                {label}: {chain.criticalityScore}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span className="e-icons e-target" style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}></span>
              <span style={{ color: 'var(--e-text, #374151)' }}>
                Djup: {chain.depth} nivåer
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
              <span className="e-icons e-time" style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}></span>
              <span style={{ color: 'var(--e-text, #374151)' }}>
                Total tid: {formatDuration(chain.totalEstimatedTime)}
              </span>
            </div>
          </div>

          {/* Deadline Warning */}
          {chain.isDeadlineCritical && (
            <div style={{
              backgroundColor: 'rgba(254, 226, 226, 0.7)',
              border: '1px solid #fca5a5',
              borderRadius: '4px',
              padding: '8px 12px',
              marginBottom: '12px'
            }}>
              <p style={{ fontSize: '14px', color: '#991b1b', fontWeight: '500' }}>
                ⚠️ Innehåller uppgifter med deadline inom 48h!
              </p>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '14px',
              fontWeight: '500',
              color: 'var(--primary-600)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0
            }}
          >
            {isExpanded ? (
              <>
                <span className="e-icons e-chevron-up" style={{ fontSize: '12px' }}></span>
                Dölj detaljer
              </>
            ) : (
              <>
                <span className="e-icons e-chevron-down" style={{ fontSize: '12px' }}></span>
                Visa alla {chain.blockedCount} blockerade uppgifter
              </>
            )}
          </button>

          {/* Expanded Details */}
          {isExpanded && (
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--e-border, #d1d5db)' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', color: 'var(--e-text, #111827)', marginBottom: '8px' }}>
                Blockeringskedja (ordning):
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {chain.chain.map((task, index) => (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      fontSize: '14px',
                      paddingLeft: `${index * 16}px`
                    }}
                  >
                    <span style={{ color: 'var(--e-text-secondary, #9ca3af)', flexShrink: 0 }}>
                      {index === 0 ? '🔴' : '↳'}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--e-text, #111827)', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {task.title}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                        {task.estimated_duration && (
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--e-surface-secondary, #f5f5f4)',
                            color: 'var(--primary-600)'
                          }}>
                            {formatDuration(task.estimated_duration)}
                          </span>
                        )}
                        {task.deadline && (
                          <span style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)' }}>
                            Deadline: {new Date(task.deadline).toLocaleDateString('sv-SE')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--e-border, #d1d5db)' }}>
                <p style={{ fontSize: '12px', color: 'var(--e-text-secondary, #6b7280)', fontStyle: 'italic' }}>
                  💡 <strong>Tips:</strong> Slutför "{rootTask.title}" först för att låsa upp alla
                  {chain.blockedCount} blockerade uppgifter.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
