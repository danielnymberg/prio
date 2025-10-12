import { useMemo } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Task } from '@/lib/types';
import { TrendingUp, CheckCircle, Clock, AlertTriangle, Target } from 'lucide-react';

interface WeeklyReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

interface WeeklyStats {
  totalCompleted: number;
  totalCreated: number;
  highValueCompleted: number;
  totalHoursSpent: number;
  productivityScore: number;
  topCompletedTasks: Task[];
  overdueCount: number;
  paretoAnalysis: {
    high_value_percentage: number;
    high_value_count: number;
    low_value_count: number;
  };
}

export function WeeklyReviewModal({ isOpen, onClose, tasks }: WeeklyReviewModalProps) {
  const stats = useMemo((): WeeklyStats => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Filter tasks from last week
    const weekTasks = tasks.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= oneWeekAgo;
    });

    const completedThisWeek = weekTasks.filter(t => {
      if (t.status !== 'done' || !t.completed_at) return false;
      const completedAt = new Date(t.completed_at);
      return completedAt >= oneWeekAgo;
    });

    // High value = value_score >= 7
    const highValueCompleted = completedThisWeek.filter(t => (t.value_score || 0) >= 7);
    const lowValueCompleted = completedThisWeek.filter(t => (t.value_score || 0) < 7);

    // Calculate total hours spent (sum of estimated_duration for completed tasks)
    const totalMinutes = completedThisWeek.reduce((sum, t) => sum + (t.estimated_duration || 0), 0);
    const totalHoursSpent = Math.round(totalMinutes / 60 * 10) / 10;

    // Productivity score: (high value completed / total completed) * 100
    const productivityScore = completedThisWeek.length > 0
      ? Math.round((highValueCompleted.length / completedThisWeek.length) * 100)
      : 0;

    // Top 5 completed tasks by value
    const topCompleted = [...completedThisWeek]
      .sort((a, b) => (b.value_score || 0) - (a.value_score || 0))
      .slice(0, 5);

    // Count overdue tasks
    const activeTasks = tasks.filter(t => t.status !== 'done');
    const overdueCount = activeTasks.filter(t => {
      if (!t.deadline) return false;
      return new Date(t.deadline) < now;
    }).length;

    return {
      totalCompleted: completedThisWeek.length,
      totalCreated: weekTasks.length,
      highValueCompleted: highValueCompleted.length,
      totalHoursSpent,
      productivityScore,
      topCompletedTasks: topCompleted,
      overdueCount,
      paretoAnalysis: {
        high_value_percentage: productivityScore,
        high_value_count: highValueCompleted.length,
        low_value_count: lowValueCompleted.length,
      },
    };
  }, [tasks]);

  const getProductivityEmoji = (score: number) => {
    if (score >= 80) return '🔥';
    if (score >= 60) return '💪';
    if (score >= 40) return '👍';
    if (score >= 20) return '🤔';
    return '😅';
  };

  const getProductivityLabel = (score: number) => {
    if (score >= 80) return 'Excellent! Du fokuserar på högt värde';
    if (score >= 60) return 'Bra! Fortsätt prioritera viktiga tasks';
    if (score >= 40) return 'OK, men fokusera mer på viktiga tasks';
    if (score >= 20) return 'Varning: För mycket lågt värde';
    return 'Kritiskt: Omvärdera dina prioriteringar';
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="📊 Veckoöversikt" size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Översikt för senaste 7 dagarna
          </p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-green-800 dark:text-green-200">Slutförda</span>
            </div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {stats.totalCompleted}
            </div>
            <div className="text-xs text-green-700 dark:text-green-300 mt-1">
              av {stats.totalCreated} skapade
            </div>
          </div>

          <div className="bg-sand-100 dark:bg-charcoal-850 rounded-lg p-4 border border-sand-300 dark:border-charcoal-700">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-copper-600 dark:text-copper-400" />
              <span className="text-sm text-stone-600 dark:text-sand-200">Total tid</span>
            </div>
            <div className="text-3xl font-bold text-stone-600 dark:text-sand-100">
              {stats.totalHoursSpent}h
            </div>
            <div className="text-xs text-stone-600 dark:text-sand-300 mt-1">
              produktiv tid
            </div>
          </div>
        </div>

        {/* Productivity Score */}
        <div className="bg-gradient-to-r from-purple-50 to-copper-100 dark:from-purple-900/20 dark:to-charcoal-850 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                Produktivitetspoäng
              </h3>
            </div>
            <div className="text-3xl">
              {getProductivityEmoji(stats.productivityScore)}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-4xl font-bold text-purple-900 dark:text-purple-100">
                {stats.productivityScore}%
              </span>
              <span className="text-sm text-purple-700 dark:text-purple-300">
                högvärdes-tasks
              </span>
            </div>
            <div className="w-full bg-purple-200 dark:bg-purple-900/40 rounded-full h-3">
              <div
                className="bg-purple-600 dark:bg-purple-500 h-3 rounded-full transition-all"
                style={{ width: `${stats.productivityScore}%` }}
              />
            </div>
          </div>

          <p className="text-sm text-purple-800 dark:text-purple-200 italic">
            {getProductivityLabel(stats.productivityScore)}
          </p>
        </div>

        {/* Pareto Analysis */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-3">
            <Target className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="font-semibold text-amber-900 dark:text-amber-100">
              Pareto-analys (80/20-regeln)
            </h3>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-amber-800 dark:text-amber-200">Högt värde (7-10):</span>
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.paretoAnalysis.high_value_count} tasks
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-800 dark:text-amber-200">Lågt värde (1-6):</span>
              <span className="font-semibold text-amber-900 dark:text-amber-100">
                {stats.paretoAnalysis.low_value_count} tasks
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
            <p className="text-xs text-amber-700 dark:text-amber-300">
              💡 <strong>Insight:</strong> {stats.paretoAnalysis.high_value_percentage >= 80
                ? 'Perfekt! Du följer 80/20-regeln - fokuserar på det viktigaste.'
                : stats.paretoAnalysis.high_value_percentage >= 60
                ? 'Bra riktning! Försök öka andelen högt värde till 80%.'
                : 'Tips: Fokusera mer på uppgifter med värde 7-10 för större impact.'}
            </p>
          </div>
        </div>

        {/* Top Completed Tasks */}
        {stats.topCompletedTasks.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Veckans toppresterare
            </h3>
            <div className="space-y-2">
              {stats.topCompletedTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <span className="text-xs font-bold text-green-700 dark:text-green-300">
                      {index + 1}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {task.title}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 rounded bg-sand-100 dark:bg-charcoal-850 text-copper-600 dark:text-sand-200">
                        Värde: {task.value_score}/10
                      </span>
                      {task.estimated_duration && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(task.estimated_duration / 60)}h
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue Warning */}
        {stats.overdueCount > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  ⚠️ {stats.overdueCount} försenade uppgifter
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  Planera nästa vecka för att komma ikapp med försenade deadlines.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={onClose} className="flex-1" variant="primary">
            Stäng översikt
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400">
          💡 Tips: Gör denna review varje måndag för bästa resultat (GTD-metoden)
        </p>
      </div>
    </Dialog>
  );
}
