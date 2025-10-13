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
    <div className="e-flex e-flex-column e-gap-24">
      {/* Ekonomisk översikt */}
      <div className="e-grid e-grid-cols-3 e-gap-16 e-p-16 e-rounded-lg" style={{ backgroundColor: 'var(--e-surface-hover)' }}>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Offererat</span>
          <p className="e-text-2xl e-font-bold e-m-0" style={{ color: 'var(--e-text)' }}>
            {metrics.quoted_hours}h
          </p>
        </div>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Loggat</span>
          <p className="e-text-2xl e-font-bold e-m-0" style={{ color: 'var(--e-text)' }}>
            {metrics.logged_hours}h
          </p>
        </div>
        <div>
          <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Fakturerbara kvar</span>
          <p className="e-text-2xl e-font-bold e-m-0" style={{
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
          <span className="e-text-2xl e-font-bold" style={{ color: 'var(--primary-600)' }}>
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
          className="e-w-full e-rounded-lg e-cursor-pointer"
          style={{
            height: '12px',
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
      <div className="e-p-16 e-rounded-lg" style={{
        border: '2px solid var(--primary-500)',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div className="e-flex e-align-center e-gap-8 e-mb-8">
          <TrendingUp style={{
            height: '20px',
            width: '20px',
            color: 'var(--primary-600)'
          }} />
          <h3 className="e-font-bold e-text-lg e-m-0" style={{ color: 'var(--e-text)' }}>
            Beräknad återstående insats
          </h3>
        </div>
        <p className="e-m-0 e-font-bold" style={{
          fontSize: '30px',
          color: 'var(--primary-600)'
        }}>
          {metrics.estimated_remaining_hours}h
        </p>
        <p className="e-text-sm e-mt-4 e-mb-0" style={{ color: 'var(--e-text-secondary)' }}>
          ({100 - completionPercentage}% av {metrics.quoted_hours}h)
        </p>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div className="e-p-16 e-rounded-lg" style={{
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444'
        }}>
          <div className="e-flex e-align-center e-gap-8 e-mb-8">
            <AlertTriangle style={{
              height: '20px',
              width: '20px',
              color: '#ef4444'
            }} />
            <h3 className="e-font-bold e-m-0" style={{ color: '#ef4444' }}>
              Budgetöverskridning!
            </h3>
          </div>
          <ul className="e-flex e-flex-column e-gap-4 e-text-sm e-p-0 e-m-0" style={{
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
            <p className="e-font-semibold e-mb-4 e-mt-0">💡 Överväg att:</p>
            <ul className="e-flex e-flex-column e-gap-4 e-m-0 e-pl-0" style={{ listStylePosition: 'inside' }}>
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
        <div className="e-p-16 e-rounded-lg" style={{
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid #f59e0b'
        }}>
          <div className="e-flex e-align-center e-gap-8 e-mb-8">
            <AlertTriangle style={{
              height: '20px',
              width: '20px',
              color: '#f59e0b'
            }} />
            <h3 className="e-font-bold e-m-0" style={{ color: '#f59e0b' }}>
              Tight budget!
            </h3>
          </div>
          <p className="e-text-sm e-m-0" style={{ color: '#f59e0b' }}>
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
        className="e-w-full e-p-12 e-rounded-lg e-font-semibold e-cursor-pointer e-flex e-align-center e-justify-center e-gap-8 e-text-base e-transition"
        style={{
          backgroundColor: 'var(--primary-600)',
          color: '#ffffff',
          border: 'none'
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-700)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-600)'}
      >
        <Calendar style={{ height: '20px', width: '20px' }} />
        Planera in {metrics.estimated_remaining_hours}h i kalendern
      </button>

      {/* Budget-sammanfattning */}
      <div className="e-p-16 e-rounded-lg" style={{ backgroundColor: 'var(--e-surface-hover)' }}>
        <h3 className="e-font-semibold e-mb-12 e-mt-0" style={{ color: 'var(--e-text)' }}>
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
          <div className="e-flex e-justify-between e-font-bold e-border-t e-pt-8 e-mt-8">
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
