import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { AbsencePeriod, CreateAbsencePeriodInput } from '@/lib/types';
import { toast } from 'react-hot-toast';

export function useAbsencePeriods() {
  const [absencePeriods, setAbsencePeriods] = useState<AbsencePeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAbsencePeriods = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('absence_periods')
        .select('*')
        .eq('user_id', user.id)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setAbsencePeriods(data || []);
    } catch (error) {
      console.error('Error fetching absence periods:', error);
      toast.error('Kunde inte hämta frånvaroperioder');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAbsencePeriods();
  }, []);

  const createAbsencePeriod = async (input: CreateAbsencePeriodInput) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('absence_periods')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      setAbsencePeriods(prev => [...prev, data]);
      toast.success('Frånvaroperiod tillagd');
      return data;
    } catch (error) {
      console.error('Error creating absence period:', error);
      toast.error('Kunde inte skapa frånvaroperiod');
      return null;
    }
  };

  const updateAbsencePeriod = async (id: string, input: Partial<CreateAbsencePeriodInput>) => {
    try {
      const { data, error } = await supabase
        .from('absence_periods')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setAbsencePeriods(prev => prev.map(ap => ap.id === id ? data : ap));
      toast.success('Frånvaroperiod uppdaterad');
      return data;
    } catch (error) {
      console.error('Error updating absence period:', error);
      toast.error('Kunde inte uppdatera frånvaroperiod');
      return null;
    }
  };

  const deleteAbsencePeriod = async (id: string) => {
    try {
      const { error } = await supabase
        .from('absence_periods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setAbsencePeriods(prev => prev.filter(ap => ap.id !== id));
      toast.success('Frånvaroperiod borttagen');
      return true;
    } catch (error) {
      console.error('Error deleting absence period:', error);
      toast.error('Kunde inte ta bort frånvaroperiod');
      return false;
    }
  };

  return {
    absencePeriods,
    loading,
    createAbsencePeriod,
    updateAbsencePeriod,
    deleteAbsencePeriod,
    refetch: fetchAbsencePeriods,
  };
}
