import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { CreateProjectInput } from '@/lib/types';
import toast from 'react-hot-toast';

interface ProjectFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProjectForm({ onSuccess, onCancel }: ProjectFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateProjectInput>({
    name: '',
    description: '',
    client_name: '',
    quoted_hours: 0,
    hourly_rate: 0,
    external_costs: 0,
    project_deadline: '',
    color: '#6B7280'
  });

  const calculatedBudget = (formData.quoted_hours * formData.hourly_rate) + (formData.external_costs || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('projects')
        .insert({
          ...formData,
          user_id: user.id
        });

      if (error) throw error;

      toast.success('Projekt skapat!');
      onSuccess?.();
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Kunde inte skapa projekt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Projektnamn *
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Klient/Beställare
        </label>
        <input
          type="text"
          value={formData.client_name || ''}
          onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Offererade timmar *
          </label>
          <input
            type="number"
            step="0.5"
            value={formData.quoted_hours}
            onChange={(e) => setFormData({ ...formData, quoted_hours: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Timpris (kr) *
          </label>
          <input
            type="number"
            step="50"
            value={formData.hourly_rate}
            onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Övriga kostnader (resor, externa tjänster, kr)
        </label>
        <input
          type="number"
          step="100"
          value={formData.external_costs || 0}
          onChange={(e) => setFormData({ ...formData, external_costs: parseFloat(e.target.value) || 0 })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
        />
      </div>

      <div className="p-4 bg-sand-100 dark:bg-charcoal-850 rounded-lg">
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Beräknad total budget
        </div>
        <div className="text-2xl font-bold text-copper-600 dark:text-copper-400">
          {calculatedBudget.toLocaleString('sv-SE')} kr
        </div>
        <div className="text-xs text-gray-500 mt-1">
          {formData.quoted_hours}h × {formData.hourly_rate} kr/h
          {(formData.external_costs || 0) > 0 && ` + ${formData.external_costs} kr övriga`}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Deadline
        </label>
        <input
          type="date"
          value={formData.project_deadline || ''}
          onChange={(e) => setFormData({ ...formData, project_deadline: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Beskrivning
        </label>
        <textarea
          value={formData.description || ''}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-copper-400 dark:focus:ring-copper-400"
          rows={3}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 py-3 bg-copper-600 text-white rounded-lg font-semibold hover:bg-copper-600 disabled:opacity-50"
        >
          {loading ? 'Skapar...' : 'Skapa projekt'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 border rounded-lg hover:bg-gray-50"
          >
            Avbryt
          </button>
        )}
      </div>
    </form>
  );
}
