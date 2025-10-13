import { useState } from 'react';
import { Project, ProjectMetrics } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import { AlertTriangle, TrendingUp, Calendar } from 'lucide-react';

interface ProjectProgressSliderProps {
  project: Project;
  metrics: ProjectMetrics;
  onUpdate: () => void;
}

export function ProjectProgressSlider({
  project,
  metrics,
  onUpdate
}: ProjectProgressSliderProps) {
  const [completionPercentage, setCompletionPercentage] = useState(
    project.completion_percentage
  );
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (newPercentage: number) => {
    setCompletionPercentage(newPercentage);
    setUpdating(true);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ completion_percentage: newPercentage })
        .eq('id', project.id);

      if (error) throw error;

      onUpdate();
    } catch (error) {
      console.error('Error updating progress:', error);
      toast.error('Kunde inte uppdatera progress');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Ekonomisk översikt */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        padding: '16px',
        backgroundColor: 'var(--e-surface-hover)',
        borderRadius: '8px'
      }}>
        <div>
          <span style={{
            fontSize: '14px',
            color: 'var(--e-text-secondary)'
          }}>Offererat</span>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--e-text)',
            margin: 0
          }}>{metrics.quoted_hours}h</p>
        </div>
        <div>
          <span style={{
            fontSize: '14px',
            color: 'var(--e-text-secondary)'
          }}>Loggat</span>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--e-text)',
            margin: 0
          }}>{metrics.logged_hours}h</p>
        </div>
        <div>
          <span style={{
            fontSize: '14px',
            color: 'var(--e-text-secondary)'
          }}>Fakturerbara kvar</span>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: metrics.billable_hours_remaining < 0 ? '#ef4444' : '#10b981',
            margin: 0
          }}>
            {metrics.billable_hours_remaining}h
          </p>
        </div>
      </div>

      {/* Reglage */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px'
        }}>
          <label style={{
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--e-text)'
          }}>
            Uppskattat färdigt
          </label>
          <span style={{
            fontSize: '24px',
            fontWeight: 'bold',
            color: 'var(--copper-600)'
          }}>
            {completionPercentage}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={completionPercentage}
          onChange={(e) => handleUpdate(parseInt(e.target.value))}
          disabled={updating}
          style={{
            width: '100%',
            height: '12px',
            borderRadius: '8px',
            appearance: 'none',
            cursor: 'pointer',
            background: `linear-gradient(to right, #B87333 0%, #B87333 ${completionPercentage}%, var(--e-surface-hover) ${completionPercentage}%, var(--e-surface-hover) 100%)`
          }}
        />
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '12px',
          color: 'var(--e-text-secondary)',
          marginTop: '4px'
        }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Återstående insats */}
      <div style={{
        padding: '16px',
        border: '2px solid var(--copper-500)',
        borderRadius: '8px',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '8px'
        }}>
          <TrendingUp style={{
            height: '20px',
            width: '20px',
            color: 'var(--copper-600)'
          }} />
          <h3 style={{
            fontWeight: 'bold',
            fontSize: '18px',
            color: 'var(--e-text)',
            margin: 0
          }}>Beräknad återstående insats</h3>
        </div>
        <p style={{
          fontSize: '30px',
          fontWeight: 'bold',
          color: 'var(--copper-600)',
          margin: 0
        }}>
          {metrics.estimated_remaining_hours}h
        </p>
        <p style={{
          fontSize: '14px',
          color: 'var(--e-text-secondary)',
          marginTop: '4px',
          marginBottom: 0
        }}>
          ({100 - completionPercentage}% av {metrics.quoted_hours}h)
        </p>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <AlertTriangle style={{
              height: '20px',
              width: '20px',
              color: '#ef4444'
            }} />
            <h3 style={{
              fontWeight: 'bold',
              color: '#ef4444',
              margin: 0
            }}>
              Budgetöverskridning!
            </h3>
          </div>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '14px',
            color: '#ef4444'
          }}>
            <li>• Redan över budget: {metrics.budget_overage_hours}h</li>
            <li>• Återstår att göra: {metrics.estimated_remaining_hours}h</li>
            <li>• Total överskridning: {metrics.total_overage_hours}h
              ({Math.round((metrics.total_overage_hours / metrics.quoted_hours) * 100)}%)
            </li>
          </ul>
          <div style={{
            marginTop: '12px',
            fontSize: '14px',
            color: '#ef4444'
          }}>
            <p style={{
              fontWeight: '600',
              marginBottom: '4px',
              marginTop: 0
            }}>💡 Överväg att:</p>
            <ul style={{
              listStylePosition: 'inside',
              margin: 0,
              paddingLeft: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <li>Fakturera extra tid som tillägg</li>
              <li>Förhandla om utökad budget</li>
              <li>Dokumentera merarbete för framtida referens</li>
            </ul>
          </div>
        </div>
      )}

      {/* Varning för tight budget */}
      {!metrics.is_over_budget &&
       metrics.estimated_remaining_hours > metrics.billable_hours_remaining &&
       metrics.billable_hours_remaining > 0 && (
        <div style={{
          padding: '16px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid #f59e0b',
          borderRadius: '8px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            <AlertTriangle style={{
              height: '20px',
              width: '20px',
              color: '#f59e0b'
            }} />
            <h3 style={{
              fontWeight: 'bold',
              color: '#f59e0b',
              margin: 0
            }}>
              Tight budget!
            </h3>
          </div>
          <p style={{
            fontSize: '14px',
            color: '#f59e0b',
            margin: 0
          }}>
            Återstående insats ({metrics.estimated_remaining_hours}h) överstiger
            fakturerbara timmar kvar ({metrics.billable_hours_remaining}h) med{' '}
            {Math.round((metrics.estimated_remaining_hours - metrics.billable_hours_remaining) * 10) / 10}h.
          </p>
        </div>
      )}

      {/* Kalenderbokning knapp */}
      <button
        onClick={() => {
          // TODO: Implementera kalenderbokning i Fas 3
          toast.success(`Kalenderbokning kommer i nästa fas! (${metrics.estimated_remaining_hours}h)`);
        }}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: 'var(--copper-600)',
          color: '#ffffff',
          borderRadius: '8px',
          border: 'none',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          fontSize: '16px',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--copper-700)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--copper-600)'}
      >
        <Calendar style={{ height: '20px', width: '20px' }} />
        Planera in {metrics.estimated_remaining_hours}h i kalendern
      </button>

      {/* Budget-sammanfattning */}
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--e-surface-hover)',
        borderRadius: '8px'
      }}>
        <h3 style={{
          fontWeight: '600',
          marginBottom: '12px',
          marginTop: 0,
          color: 'var(--e-text)'
        }}>Ekonomi</h3>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontSize: '14px'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span style={{ color: 'var(--e-text-secondary)' }}>Timkostnad:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
              {metrics.quoted_hours}h × {project.hourly_rate.toLocaleString('sv-SE')} kr/h = {' '}
              {(metrics.quoted_hours * project.hourly_rate).toLocaleString('sv-SE')} kr
            </span>
          </div>
          {project.external_costs > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between'
            }}>
              <span style={{ color: 'var(--e-text-secondary)' }}>Övriga kostnader:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
                {project.external_costs.toLocaleString('sv-SE')} kr
              </span>
            </div>
          )}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            borderTop: '1px solid var(--e-border)',
            paddingTop: '8px',
            marginTop: '8px'
          }}>
            <span style={{ color: 'var(--e-text)' }}>Total budget:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
              {project.total_budget.toLocaleString('sv-SE')} kr
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
