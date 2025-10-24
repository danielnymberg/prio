import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { ButtonComponent } from '@syncfusion/ej2-react-buttons';
// Lucide icons replaced with SyncFusion e-icons
import { toast } from 'react-hot-toast';

export function TaskImpactPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask } = useTasks();
  const [impact, setImpact] = useState(5);
  const task = tasks.find(t => t.id === taskId);

  const handleSubmit = async () => {
    if (!taskId) return;

    try {
      await updateTask(taskId, { result_impact: impact });
      toast.success('Tack för din feedback!');
      navigate('/focus');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Kunde inte spara');
    }
  };

  const handleClose = () => {
    navigate('/focus');
  };

  if (!task) {
    return (
      <div style={{
        maxWidth: '600px',
        margin: '2rem auto',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <p style={{ color: 'var(--e-text)' }}>Task hittades inte</p>
        <ButtonComponent
          cssClass="e-primary e-round e-mt-16"
          onClick={() => navigate('/focus')}
          content="Tillbaka till Focus"
        />
      </div>
    );
  }

  return (
    <div style={{
      maxWidth: '600px',
      margin: '0 auto',
      padding: '2rem',
      minHeight: '100vh'
    }}>
      {/* Header with close button */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, color: 'var(--e-text)' }}>Uppgift slutförd! 🎉</h2>
        <ButtonComponent
          cssClass="e-small e-round"
          iconCss="e-icons e-close"
          onClick={handleClose}
        />
      </div>

      <div className="e-flex e-flex-column e-gap-24">
        <p style={{ color: 'var(--e-text)' }}>
          Vilken <strong>faktisk påverkan</strong> hade denna uppgift?
        </p>

        <p className="e-text-sm" style={{
          color: 'var(--e-text-secondary)',
          fontStyle: 'italic'
        }}>
          "{task.title}"
        </p>

        <div className="e-flex e-flex-column e-gap-16">
          <label className="e-text-sm e-font-medium" style={{ display: 'block', color: 'var(--e-text)' }}>
            Faktisk påverkan (1-10):
          </label>

          <div className="e-flex e-align-center e-gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <button
                key={value}
                onClick={() => setImpact(value)}
                className="e-rounded-md e-font-semibold e-transition"
                style={{
                  cursor: 'pointer',
                  width: '40px',
                  height: '40px',
                  backgroundColor: impact >= value ? 'var(--warning-500, var(--warning-400))' : 'var(--e-hover, #e5e7eb)',
                  color: impact >= value ? 'var(--warning-900, #78350f)' : 'var(--e-text-secondary, #6b7280)',
                  transform: impact >= value ? 'scale(1.1)' : 'scale(1)',
                  border: 'none'
                }}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            {impact <= 3 && '1-3: Minimal faktisk nytta'}
            {impact > 3 && impact <= 7 && '4-7: Moderat nytta'}
            {impact > 7 && '8-10: Transformativ påverkan!'}
          </div>
        </div>

        <div className="e-rounded-md e-p-16 e-text-sm" style={{
          backgroundColor: 'var(--e-surface)',
          color: 'var(--e-text)'
        }}>
          💡 Detta hjälper appen lära sig vilka uppgifter som faktiskt ger resultat (Pareto-analys)
        </div>

        <div className="e-flex e-gap-12">
          <ButtonComponent
            cssClass="e-primary e-round"
            onClick={handleSubmit}
            style={{ flex: 1 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="e-icons e-star" style={{ fontSize: '12px', marginRight: '8px' }}></span>
              Spara bedömning
            </div>
          </ButtonComponent>
          <ButtonComponent
            cssClass="e-outline e-round"
            onClick={handleClose}
            content="Hoppa över"
          />
        </div>
      </div>
    </div>
  );
}
