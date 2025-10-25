import { useState } from 'react';
import { Project, ProjectMetrics } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
// Lucide icons replaced with SyncFusion e-icons

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

  // Auto-beräkna completion_percentage från loggad tid
  const autoPercentage = Math.min(
    Math.round((metrics.logged_hours / metrics.quoted_hours) * 100),
    100
  );

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
    <div className="e-flex e-flex-column e-gap-24">
      {/* Ekonomisk översikt */}
      <div className="e-grid e-grid-cols-3 e-gap-16 e-p-16" style={{
        borderRadius: '8px',
        backgroundColor: 'var(--e-surface-hover)'
      }}>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Offererat</span>
          <p className="e-font-bold" style={{ fontSize: '24px', margin: 0, color: 'var(--e-text)' }}>
            {metrics.quoted_hours}h
          </p>
        </div>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Loggat</span>
          <p className="e-font-bold" style={{ fontSize: '24px', margin: 0, color: 'var(--e-text)' }}>
            {metrics.logged_hours}h
          </p>
        </div>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Fakturerbara kvar</span>
          <p className="e-font-bold" style={{
            fontSize: '24px',
            margin: 0,
            color: metrics.billable_hours_remaining < 0 ? '#ef4444' : '#10b981'
          }}>
            {metrics.billable_hours_remaining}h
          </p>
        </div>
      </div>

      {/* Reglage */}
      <div>
        <div className="e-flex e-align-center e-justify-between e-mb-8">
          <label className="e-text-sm e-font-medium" style={{ color: 'var(--e-text)' }}>
            Uppskattat färdigt
          </label>
          <div className="e-flex e-align-center e-gap-12">
            <div className="e-flex e-flex-column e-align-end">
              <span className="e-font-bold" style={{ fontSize: '24px', color: 'var(--primary-600)' }}>
                {completionPercentage}%
              </span>
              {autoPercentage !== completionPercentage && (
                <span className="e-text-xs" style={{ color: 'var(--e-text-secondary)' }}>
                  Auto: {autoPercentage}%
                </span>
              )}
            </div>
            {autoPercentage !== completionPercentage && (
              <button
                onClick={() => handleUpdate(autoPercentage)}
                disabled={updating}
                className="e-btn e-small e-outline"
                title="Använd auto-beräknat värde"
              >
                <span className="e-icons e-refresh"></span>
              </button>
            )}
          </div>
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
            cursor: 'pointer',
            appearance: 'none',
            background: `linear-gradient(to right, #B87333 0%, #B87333 ${completionPercentage}%, var(--e-surface-hover) ${completionPercentage}%, var(--e-surface-hover) 100%)`
          }}
        />
        <div className="e-flex e-justify-between e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Återstående insats */}
      <div className="e-p-16" style={{
        borderRadius: '8px',
        border: '2px solid var(--primary-500)',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div className="e-flex e-align-center e-gap-8 e-mb-8">
          <span className="e-icons e-arrow-up" style={{
            fontSize: '16px',
            color: 'var(--primary-600)'
          }}></span>
          <h3 className="e-font-bold" style={{ fontSize: '18px', margin: 0, color: 'var(--e-text)' }}>
            Beräknad återstående insats
          </h3>
        </div>
        <p className="e-font-bold" style={{
          margin: 0,
          fontSize: '30px',
          color: 'var(--primary-600)'
        }}>
          {metrics.estimated_remaining_hours}h
        </p>
        <p className="e-text-sm e-mt-4" style={{ marginBottom: 0, color: 'var(--e-text-secondary)' }}>
          ({100 - completionPercentage}% av {metrics.quoted_hours}h)
        </p>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div className="e-p-16" style={{
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444'
        }}>
          <div className="e-flex e-align-center e-gap-8 e-mb-8">
            <span className="e-icons e-warning" style={{
              fontSize: '16px',
              color: '#ef4444'
            }}></span>
            <h3 className="e-font-bold" style={{ margin: 0, color: '#ef4444' }}>
              Budgetöverskridning!
            </h3>
          </div>
          <ul className="e-flex e-flex-column e-gap-4 e-text-sm" style={{
            padding: 0,
            margin: 0,
            listStyle: 'none',
            color: '#ef4444'
          }}>
            <li>• Redan över budget: {metrics.budget_overage_hours}h</li>
            <li>• Återstår att göra: {metrics.estimated_remaining_hours}h</li>
            <li>• Total överskridning: {metrics.total_overage_hours}h
              ({Math.round((metrics.total_overage_hours / metrics.quoted_hours) * 100)}%)
            </li>
          </ul>
          <div className="e-mt-12 e-text-sm" style={{ color: '#ef4444' }}>
            <p className="e-font-semibold e-mb-4" style={{ marginTop: 0 }}>💡 Överväg att:</p>
            <ul className="e-flex e-flex-column e-gap-4" style={{
              margin: 0,
              paddingLeft: 0,
              listStylePosition: 'inside'
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
        <div className="e-p-16" style={{
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid var(--warning-500)'
        }}>
          <div className="e-flex e-align-center e-gap-8 e-mb-8">
            <span className="e-icons e-warning" style={{
              fontSize: '16px',
              color: 'var(--warning-500)'
            }}></span>
            <h3 className="e-font-bold" style={{ margin: 0, color: 'var(--warning-500)' }}>
              Tight budget!
            </h3>
          </div>
          <p className="e-text-sm" style={{ margin: 0, color: 'var(--warning-500)' }}>
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
        className="e-btn e-primary e-flex e-align-center e-justify-center e-gap-8"
        style={{
          width: '100%',
          padding: '12px',
          fontSize: '16px'
        }}
      >
        <span className="e-icons e-schedule" style={{ fontSize: '16px' }}></span>
        Planera in {metrics.estimated_remaining_hours}h i kalendern
      </button>

      {/* Budget-sammanfattning */}
      <div className="e-p-16" style={{ borderRadius: '8px', backgroundColor: 'var(--e-surface-hover)' }}>
        <h3 className="e-font-semibold e-mb-12" style={{ marginTop: 0, color: 'var(--e-text)' }}>
          Ekonomi
        </h3>
        <div className="e-flex e-flex-column e-gap-8 e-text-sm">
          <div className="e-flex e-justify-between">
            <span style={{ color: 'var(--e-text-secondary)' }}>Timkostnad:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
              {metrics.quoted_hours}h × {project.hourly_rate.toLocaleString('sv-SE')} kr/h = {' '}
              {(metrics.quoted_hours * project.hourly_rate).toLocaleString('sv-SE')} kr
            </span>
          </div>
          {project.external_costs > 0 && (
            <div className="e-flex e-justify-between">
              <span style={{ color: 'var(--e-text-secondary)' }}>Övriga kostnader:</span>
              <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
                {project.external_costs.toLocaleString('sv-SE')} kr
              </span>
            </div>
          )}
          <div className="e-flex e-justify-between e-font-bold e-pt-8 e-mt-8" style={{
            borderTop: '1px solid var(--e-border)'
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
