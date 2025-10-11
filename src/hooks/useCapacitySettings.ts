import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { CapacitySettings } from '@/lib/types';
import { toast } from 'react-hot-toast';

const DEFAULT_SETTINGS: CapacitySettings = {
  working_hours_per_week: 40,
  working_days: [2, 3, 4, 5, 6], // Mån-Fre (1=Sön, 2=Mån, etc)
  capacity_thresholds: {
    under: 70,
    sweet_start: 70,
    sweet_end: 80,
    over: 90,
  },
};

export function useCapacitySettings() {
  const [settings, setSettings] = useState<CapacitySettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('working_hours_per_week, working_days, capacity_thresholds')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          working_hours_per_week: data.working_hours_per_week || DEFAULT_SETTINGS.working_hours_per_week,
          working_days: data.working_days || DEFAULT_SETTINGS.working_days,
          capacity_thresholds: data.capacity_thresholds || DEFAULT_SETTINGS.capacity_thresholds,
        });
      }
    } catch (error) {
      console.error('Error fetching capacity settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const updateSettings = async (newSettings: Partial<CapacitySettings>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const updatedSettings = { ...settings, ...newSettings };

      const { error } = await supabase
        .from('profiles')
        .update({
          working_hours_per_week: updatedSettings.working_hours_per_week,
          working_days: updatedSettings.working_days,
          capacity_thresholds: updatedSettings.capacity_thresholds,
        })
        .eq('id', user.id);

      if (error) throw error;

      setSettings(updatedSettings);
      toast.success('Kapacitetsinställningar uppdaterade');
      return true;
    } catch (error) {
      console.error('Error updating capacity settings:', error);
      toast.error('Kunde inte uppdatera inställningar');
      return false;
    }
  };

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
}
