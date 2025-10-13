import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
import { Star } from 'lucide-react';
import { toast } from 'react-hot-toast';

export function ResultImpactModal() {
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

  const handleSkip = () => {
    navigate('/focus');
  };

  if (!task) return null;

  return (
    <Dialog
      isOpen={true}
      onClose={handleSkip}
      title="Task slutförd! 🎉"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ color: 'var(--e-text)' }}>
          Vilken <strong>faktisk påverkan</strong> hade denna uppgift?
        </p>

        <p style={{
          fontSize: '14px',
          color: 'var(--e-text-secondary)',
          fontStyle: 'italic'
        }}>
          "{task.title}"
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            color: 'var(--e-text)'
          }}>
            Faktisk påverkan (1-10):
          </label>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <button
                key={value}
                onClick={() => setImpact(value)}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  backgroundColor: impact >= value ? '#fbbf24' : 'var(--e-hover, #e5e7eb)',
                  color: impact >= value ? '#78350f' : 'var(--e-text-secondary, #6b7280)',
                  transform: impact >= value ? 'scale(1.1)' : 'scale(1)',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                {value}
              </button>
            ))}
          </div>

          <div style={{
            fontSize: '14px',
            color: 'var(--e-text-secondary)'
          }}>
            {impact <= 3 && '1-3: Minimal faktisk nytta'}
            {impact > 3 && impact <= 7 && '4-7: Moderat nytta'}
            {impact > 7 && '8-10: Transformativ påverkan!'}
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--e-surface)',
          borderRadius: '8px',
          padding: '16px',
          fontSize: '14px',
          color: 'var(--e-text)'
        }}>
          💡 Detta hjälper appen lära sig vilka uppgifter som faktiskt ger resultat (Pareto-analys)
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <Button onClick={handleSubmit} style={{ flex: '1' }}>
            <Star style={{ height: '16px', width: '16px', marginRight: '8px' }} />
            Spara bedömning
          </Button>
          <Button variant="secondary" onClick={handleSkip}>
            Hoppa över
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
