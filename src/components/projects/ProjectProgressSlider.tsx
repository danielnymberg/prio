import { useState } from 'react';
import { Project, ProjectMetrics } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
import { SliderComponent } from '@syncfusion/ej2-react-inputs';
import toast from 'react-hot-toast';

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Progress + Återstående */}
      <div className="e-card">
        <div className="e-card-content" style={{ padding: '6px 10px 4px 10px' }}>
          {/* Labels */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-sf-black)', opacity: 0.5 }}>
              Uppskattat färdigt
            </span>
            <span style={{ fontSize: '11px', color: 'var(--color-sf-black)', opacity: 0.5 }}>
              Återstår
            </span>
          </div>

          {/* Siffror */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-sf-primary)' }}>
              {completionPercentage}%
            </span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--color-sf-primary-dark)' }}>
              {metrics.estimated_remaining_hours}h
            </span>
          </div>

          {/* Slider */}
          <SliderComponent
            min={0}
            max={100}
            step={5}
            value={completionPercentage}
            type="MinRange"
            tooltip={{ isVisible: true, placement: 'Before', showOn: 'Hover' }}
            change={(e: any) => handleUpdate(e.value)}
            enabled={!updating}
          />
        </div>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div className="e-p-16" style={{
          borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '2px solid #ef4444'
        }}>
          <div className="e-mb-8" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="e-icons e-medium e-warning" style={{
              color: '#ef4444'
            }}></span>
            <h3 className="e-font-bold" style={{ margin: 0, color: '#ef4444' }}>
              Budgetöverskridning!
            </h3>
          </div>
          <ul className="e-text-sm" style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
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
        <div className="e-p-16" style={{
          borderRadius: '8px',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          border: '2px solid var(--warning-500)'
        }}>
          <div className="e-mb-8" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className="e-icons e-medium e-warning" style={{
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
      <ButtonComponent
        onClick={() => {
          // TODO: Implementera kalenderbokning i Fas 3
          toast.success(`Kalenderbokning kommer i nästa fas! (${metrics.estimated_remaining_hours}h)`);
        }}
        cssClass="e-primary"
        iconCss="e-icons e-clock"
        content={`Planera in ${metrics.estimated_remaining_hours}h i kalendern`}
        style={{ width: '100%' }}
      />

    </div>
  );
}
