import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Clock, Target } from 'lucide-react';
import { DependencyChain, getCriticalityLevel } from '@/lib/dependencyAnalyzer';
import { formatDuration } from '@/lib/utils';

interface DependencyAlertProps {
  chain: DependencyChain;
}

export function DependencyAlert({ chain }: DependencyAlertProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { level, label, color } = getCriticalityLevel(chain.criticalityScore);

  const getBorderColor = () => {
    if (level === 'critical') return 'border-red-500 dark:border-red-600';
    if (level === 'high') return 'border-orange-500 dark:border-orange-600';
    if (level === 'medium') return 'border-amber-500 dark:border-amber-600';
    return 'border-gray-300 dark:border-gray-600';
  };

  const getBgColor = () => {
    if (level === 'critical') return 'bg-red-50 dark:bg-red-900/20';
    if (level === 'high') return 'bg-orange-50 dark:bg-orange-900/20';
    if (level === 'medium') return 'bg-amber-50 dark:bg-amber-900/20';
    return 'bg-gray-50 dark:bg-gray-800';
  };

  const rootTask = chain.chain[0];

  return (
    <div className={`rounded-lg border-2 ${getBorderColor()} ${getBgColor()} p-4 mb-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 ${color} flex-shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold ${color} mb-1`}>
                🔗 Kritisk blockeringskedja
              </h3>
              <p className="text-sm text-gray-900 dark:text-white font-medium">
                "{rootTask.title}" blockerar {chain.blockedCount} andra{' '}
                {chain.blockedCount === 1 ? 'uppgift' : 'uppgifter'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-bold ${
                  level === 'critical'
                    ? 'bg-red-600 text-white'
                    : level === 'high'
                    ? 'bg-orange-600 text-white'
                    : level === 'medium'
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-600 text-white'
                }`}
              >
                {label}: {chain.criticalityScore}
              </span>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm">
              <Target className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                Djup: {chain.depth} nivåer
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">
                Total tid: {formatDuration(chain.totalEstimatedTime)}
              </span>
            </div>
          </div>

          {/* Deadline Warning */}
          {chain.isDeadlineCritical && (
            <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded px-3 py-2 mb-3">
              <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                ⚠️ Innehåller uppgifter med deadline inom 48h!
              </p>
            </div>
          )}

          {/* Expand/Collapse Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Dölj detaljer
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                Visa alla {chain.blockedCount} blockerade uppgifter
              </>
            )}
          </button>

          {/* Expanded Details */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Blockeringskedja (ordning):
              </h4>
              <div className="space-y-2">
                {chain.chain.map((task, index) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-2 text-sm"
                    style={{ paddingLeft: `${index * 16}px` }}
                  >
                    <span className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {index === 0 ? '🔴' : '↳'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {task.estimated_duration && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                            {formatDuration(task.estimated_duration)}
                          </span>
                        )}
                        {task.deadline && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Deadline: {new Date(task.deadline).toLocaleDateString('sv-SE')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                <p className="text-xs text-gray-600 dark:text-gray-400 italic">
                  💡 <strong>Tips:</strong> Slutför "{rootTask.title}" först för att låsa upp alla
                  {chain.blockedCount} blockerade uppgifter.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
