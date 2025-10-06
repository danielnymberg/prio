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
    <div className="space-y-6">
      {/* Ekonomisk översikt */}
      <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Offererat</span>
          <p className="text-2xl font-bold">{metrics.quoted_hours}h</p>
        </div>
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Loggat</span>
          <p className="text-2xl font-bold">{metrics.logged_hours}h</p>
        </div>
        <div>
          <span className="text-sm text-gray-600 dark:text-gray-400">Fakturerbara kvar</span>
          <p className={`text-2xl font-bold ${
            metrics.billable_hours_remaining < 0
              ? 'text-red-600 dark:text-red-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {metrics.billable_hours_remaining}h
          </p>
        </div>
      </div>

      {/* Reglage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium">
            Uppskattat färdigt
          </label>
          <span className="text-2xl font-bold text-copper-600 dark:text-copper-400">
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
          className="w-full h-3 rounded-lg appearance-none cursor-pointer bg-gray-200 dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #B87333 0%, #B87333 ${completionPercentage}%, #e5e7eb ${completionPercentage}%, #e5e7eb 100%)`
          }}
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Återstående insats */}
      <div className="p-4 border-2 border-copper-500 dark:border-copper-400 rounded-lg bg-sand-100 dark:bg-charcoal-850">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-5 w-5 text-copper-600 dark:text-copper-400" />
          <h3 className="font-bold text-lg">Beräknad återstående insats</h3>
        </div>
        <p className="text-3xl font-bold text-copper-600 dark:text-copper-400">
          {metrics.estimated_remaining_hours}h
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          ({100 - completionPercentage}% av {metrics.quoted_hours}h)
        </p>
      </div>

      {/* Varning för budgetöverskridning */}
      {metrics.is_over_budget && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-400 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <h3 className="font-bold text-red-900 dark:text-red-100">
              Budgetöverskridning!
            </h3>
          </div>
          <ul className="space-y-1 text-sm text-red-800 dark:text-red-200">
            <li>• Redan över budget: {metrics.budget_overage_hours}h</li>
            <li>• Återstår att göra: {metrics.estimated_remaining_hours}h</li>
            <li>• Total överskridning: {metrics.total_overage_hours}h
              ({Math.round((metrics.total_overage_hours / metrics.quoted_hours) * 100)}%)
            </li>
          </ul>
          <div className="mt-3 text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold mb-1">💡 Överväg att:</p>
            <ul className="list-disc list-inside space-y-1">
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
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-500 dark:border-yellow-400 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h3 className="font-bold text-yellow-900 dark:text-yellow-100">
              Tight budget!
            </h3>
          </div>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
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
        className="w-full py-3 bg-copper-600 hover:bg-copper-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
      >
        <Calendar className="h-5 w-5" />
        Planera in {metrics.estimated_remaining_hours}h i kalendern
      </button>

      {/* Budget-sammanfattning */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-3">Ekonomi</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Timkostnad:</span>
            <span className="font-mono">
              {metrics.quoted_hours}h × {project.hourly_rate.toLocaleString('sv-SE')} kr/h = {' '}
              {(metrics.quoted_hours * project.hourly_rate).toLocaleString('sv-SE')} kr
            </span>
          </div>
          {project.external_costs > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Övriga kostnader:</span>
              <span className="font-mono">{project.external_costs.toLocaleString('sv-SE')} kr</span>
            </div>
          )}
          <div className="flex justify-between font-bold border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
            <span>Total budget:</span>
            <span className="font-mono">{project.total_budget.toLocaleString('sv-SE')} kr</span>
          </div>
        </div>
      </div>
    </div>
  );
}
