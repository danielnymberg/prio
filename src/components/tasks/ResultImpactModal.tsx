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
    <Modal
      isOpen={true}
      onClose={handleSkip}
      title="Task slutförd! 🎉"
    >
      <div className="space-y-6">
        <p className="text-gray-700 dark:text-gray-300">
          Vilken <strong>faktisk påverkan</strong> hade denna uppgift?
        </p>

        <p className="text-sm text-gray-600 dark:text-gray-400 italic">
          "{task.title}"
        </p>

        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Faktisk påverkan (1-10):
          </label>

          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => (
              <button
                key={value}
                onClick={() => setImpact(value)}
                className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                  impact >= value
                    ? 'bg-yellow-400 text-yellow-900 scale-110'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                }`}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400">
            {impact <= 3 && '1-3: Minimal faktisk nytta'}
            {impact > 3 && impact <= 7 && '4-7: Moderat nytta'}
            {impact > 7 && '8-10: Transformativ påverkan!'}
          </div>
        </div>

        <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-4 text-sm text-stone-600 dark:text-sand-200">
          💡 Detta hjälper appen lära sig vilka uppgifter som faktiskt ger resultat (Pareto-analys)
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSubmit} className="flex-1">
            <Star className="h-4 w-4 mr-2" />
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
