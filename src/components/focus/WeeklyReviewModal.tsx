import { useMemo } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { SyncButton as Button } from '@/components/ui/SyncButton';
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
      <div className="e-flex e-flex-column e-gap-24">
        {/* Header */}
        <div className="e-text-center">
          <p className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>
            Översikt för senaste 7 dagarna
          </p>
        </div>

        {/* Key Stats Grid */}
        <div className="e-grid e-grid-cols-2 e-gap-16">
          <div className="e-rounded-md e-p-16 e-border" style={{ backgroundColor: '#ecfdf5', borderColor: '#10b981' }}>
            <div className="e-flex e-align-center e-gap-8 e-mb-4">
              <CheckCircle style={{ height: '16px', width: '16px', color: '#10b981' }} />
              <span className="e-text-sm" style={{ color: '#10b981' }}>Slutförda</span>
            </div>
            <div className="e-text-2xl e-font-bold" style={{ color: '#10b981' }}>
              {stats.totalCompleted}
            </div>
            <div className="e-text-xs e-mt-4" style={{ color: '#10b981' }}>
              av {stats.totalCreated} skapade
            </div>
          </div>

          <div className="e-rounded-md e-p-16 e-border" style={{ backgroundColor: 'var(--e-border)' }}>
            <div className="e-flex e-align-center e-gap-8 e-mb-4">
              <Clock style={{ height: '16px', width: '16px', color: 'var(--copper-600)' }} />
              <span className="e-text-sm" style={{ color: 'var(--e-text-secondary)' }}>Total tid</span>
            </div>
            <div className="e-text-2xl e-font-bold" style={{ color: 'var(--e-text)' }}>
              {stats.totalHoursSpent}h
            </div>
            <div className="e-text-xs e-mt-4" style={{ color: 'var(--e-text-secondary)' }}>
              produktiv tid
            </div>
          </div>
        </div>

        {/* Productivity Score */}
        <div style={{ background: 'linear-gradient(to right, #faf5ff, #fef3e2)', borderRadius: '0.75rem', padding: '1.5rem', border: '1px solid #a855f7' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp style={{ height: '20px', width: '20px', color: '#a855f7' }} />
              <h3 style={{ fontWeight: '600', color: '#a855f7' }}>
                Produktivitetspoäng
              </h3>
            </div>
            <div style={{ fontSize: '1.875rem' }}>
              {getProductivityEmoji(stats.productivityScore)}
            </div>
          </div>

          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '2.25rem', fontWeight: 'bold', color: '#a855f7' }}>
                {stats.productivityScore}%
              </span>
              <span style={{ fontSize: '0.875rem', color: '#a855f7' }}>
                högvärdes-tasks
              </span>
            </div>
            <div style={{ width: '100%', backgroundColor: '#e9d5ff', borderRadius: '9999px', height: '12px' }}>
              <div
                style={{ backgroundColor: '#a855f7', height: '12px', borderRadius: '9999px', transition: 'width 0.3s', width: `${stats.productivityScore}%` }}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#7c3aed', fontStyle: 'italic' }}>
            {getProductivityLabel(stats.productivityScore)}
          </p>
        </div>

        {/* Pareto Analysis */}
        <div style={{ backgroundColor: '#fef3c7', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #f59e0b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <Target style={{ height: '20px', width: '20px', color: '#f59e0b' }} />
            <h3 style={{ fontWeight: '600', color: '#f59e0b' }}>
              Pareto-analys (80/20-regeln)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.875rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#f59e0b' }}>Högt värde (7-10):</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>
                {stats.paretoAnalysis.high_value_count} tasks
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#f59e0b' }}>Lågt värde (1-6):</span>
              <span style={{ fontWeight: '600', color: '#f59e0b' }}>
                {stats.paretoAnalysis.low_value_count} tasks
              </span>
            </div>
          </div>

          <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #fbbf24' }}>
            <p style={{ fontSize: '0.75rem', color: '#d97706' }}>
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
            <h3 style={{ fontWeight: '600', color: 'var(--e-text)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle style={{ height: '20px', width: '20px', color: '#10b981' }} />
              Veckans toppresterare
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {stats.topCompletedTasks.map((task, index) => (
                <div
                  key={task.id}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem', backgroundColor: 'var(--e-border)', borderRadius: '0.5rem' }}
                >
                  <div style={{ flexShrink: 0, width: '24px', height: '24px', borderRadius: '9999px', backgroundColor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#10b981' }}>
                      {index + 1}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--e-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {task.title}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <span style={{ fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '0.25rem', backgroundColor: 'var(--e-border)', color: 'var(--copper-600)' }}>
                        Värde: {task.value_score}/10
                      </span>
                      {task.estimated_duration && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--e-text-secondary)' }}>
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
          <div style={{ backgroundColor: '#fee2e2', borderRadius: '0.5rem', padding: '1rem', border: '1px solid #ef4444' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertTriangle style={{ height: '20px', width: '20px', color: '#ef4444', flexShrink: 0, marginTop: '0.125rem' }} />
              <div>
                <p style={{ fontWeight: '600', color: '#ef4444', marginBottom: '0.25rem' }}>
                  ⚠️ {stats.overdueCount} försenade uppgifter
                </p>
                <p style={{ fontSize: '0.875rem', color: '#ef4444' }}>
                  Planera nästa vecka för att komma ikapp med försenade deadlines.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '1rem', borderTop: '1px solid var(--e-border)' }}>
          <Button onClick={onClose} style={{ flex: 1 }} variant="primary">
            Stäng översikt
          </Button>
        </div>

        <p style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--e-text-secondary)' }}>
          💡 Tips: Gör denna review varje måndag för bästa resultat (GTD-metoden)
        </p>
      </div>
    </Dialog>
  );
}
