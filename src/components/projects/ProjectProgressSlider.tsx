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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Ekonomisk översikt */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '16px',
        padding: '16px',
        borderRadius: '8px',
        backgroundColor: 'var(--e-surface-hover)'
      }}>
        <div>
          <span style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>Offererat</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--e-text)' }}>
            {metrics.quoted_hours}h
          </p>
        </div>
        <div>
          <span style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>Loggat</span>
          <p style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, color: 'var(--e-text)' }}>
            {metrics.logged_hours}h
          </p>
        </div>
        <div>
          <span style={{ fontSize: '14px', color: 'var(--e-text-secondary)' }}>Fakturerbara kvar</span>
          <p style={{
            fontSize: '24px',
            fontWeight: 'bold',
            margin: 0,
            color: metrics.billable_hours_remaining < 0 ? '#ef4444' : '#10b981'
          }}>
            {metrics.billable_hours_remaining}h
          </p>
        </div>
      </div>

      {/* Reglage */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--e-text)' }}>
            Uppskattat färdigt
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-600)' }}>
                {completionPercentage}%
              </span>
              {autoPercentage !== completionPercentage && (
                <span style={{ fontSize: '12px', color: 'var(--e-text-secondary)' }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginTop: '4px', color: 'var(--e-text-secondary)' }}>
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Återstående insats */}
      <div style={{
        padding: '16px',
        borderRadius: '8px',
        border: '2px solid var(--primary-500)',
        backgroundColor: 'var(--e-surface)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <span className="e-icons e-arrow-up" style={{
            fontSize: '16px',
            color: 'var(--primary-600)'
          }}></span>
          <h3 style={{ fontWeight: 'bold', fontSize: '18px', margin: 0, color: 'var(--e-text)' }}>
            Beräknad återstående insats
          </h3>
        </div>
        <p style={{
          margin: 0,
          fontWeight: 'bold',
          fontSize: '30px',
          color: 'var(--primary-600)'
        }}>
          {metrics.estimated_remaining_hours}h
        </p>
        <p style={{ fontSize: '14px', marginTop: '4px', marginBottom: 0, color: 'var(--e-text-secondary)' }}>
          ({100 - completionPercentage}% av {metrics.quoted_hours}h)
        </p>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="e-icons e-warning" style={{
              fontSize: '16px',
              color: '#ef4444'
            }}></span>
            <h3 style={{ fontWeight: 'bold', margin: 0, color: '#ef4444' }}>
              Budgetöverskridning!
            </h3>
          </div>
          <ul style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            fontSize: '14px',
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
          <div style={{ marginTop: '12px', fontSize: '14px', color: '#ef4444' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px', marginTop: 0 }}>💡 Överväg att:</p>
            <ul style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
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
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid var(--warning-500)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span className="e-icons e-warning" style={{
              fontSize: '16px',
              color: 'var(--warning-500)'
            }}></span>
            <h3 style={{ fontWeight: 'bold', margin: 0, color: 'var(--warning-500)' }}>
              Tight budget!
            </h3>
          </div>
          <p style={{ fontSize: '14px', margin: 0, color: 'var(--warning-500)' }}>
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
        className="e-btn e-primary"
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '12px',
          borderRadius: '8px',
          fontSize: '16px'
        }}
      >
        <span className="e-icons e-schedule" style={{ fontSize: '16px' }}></span>
        Planera in {metrics.estimated_remaining_hours}h i kalendern
      </button>

      {/* Budget-sammanfattning */}
      <div style={{ padding: '16px', borderRadius: '8px', backgroundColor: 'var(--e-surface-hover)' }}>
        <h3 style={{ fontWeight: '600', marginBottom: '12px', marginTop: 0, color: 'var(--e-text)' }}>
          Ekonomi
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: 'var(--e-text-secondary)' }}>Timkostnad:</span>
            <span style={{ fontFamily: 'monospace', color: 'var(--e-text)' }}>
              {metrics.quoted_hours}h × {project.hourly_rate.toLocaleString('sv-SE')} kr/h = {' '}
              {(metrics.quoted_hours * project.hourly_rate).toLocaleString('sv-SE')} kr
            </span>
          </div>
          {project.external_costs > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
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
