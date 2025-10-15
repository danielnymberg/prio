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
          <label className="e-block e-text-sm e-font-medium" style={{ color: 'var(--e-text)' }}>
            Faktisk påverkan (1-10):
          </label>

          <div className="e-flex e-align-center e-gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <button
                key={value}
                onClick={() => setImpact(value)}
                className={`e-btn ${impact >= value ? 'e-primary' : 'e-outline'}`}
                style={{
                  width: '44px',
                  height: '44px',
                  minWidth: '44px',
                  padding: 0
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
          <Button onClick={handleSubmit} className="e-flex-1">
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
