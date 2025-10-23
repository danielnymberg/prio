import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { ProjectAllocation, CreateProjectAllocationInput, UpdateProjectAllocationInput } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useProjectAllocations() {
  const { user } = useAuth();
  const [allocations, setAllocations] = useState<ProjectAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setAllocations([]);
      setLoading(false);
      return;
    }

    fetchAllocations();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('project_allocations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_allocations',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchAllocations();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchAllocations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('project_allocations')
        .select('*')
        .eq('user_id', user.id)
        .order('week_start', { ascending: true });

      if (error) throw error;
      setAllocations(data || []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
      toast.error('Kunde inte hämta allokeringar');
    } finally {
      setLoading(false);
    }
  };

  const setAllocation = async (input: CreateProjectAllocationInput) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('project_allocations')
        .upsert({
          ...input,
          user_id: user.id,
        }, {
          onConflict: 'user_id,project_id,week_start'
        })
        .select()
        .single();

      if (error) throw error;

      // Update local state optimistically
      setAllocations(prev => {
        const existing = prev.findIndex(
          a => a.project_id === input.project_id && a.week_start === input.week_start
        );
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = data;
          return updated;
        } else {
          return [...prev, data];
        }
      });

      return data;
    } catch (error) {
      console.error('Error setting allocation:', error);
      toast.error('Kunde inte spara allokering');
      return null;
    }
  };

  const updateAllocation = async (id: string, input: UpdateProjectAllocationInput) => {
    try {
      const { data, error } = await supabase
        .from('project_allocations')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Update local state
      setAllocations(prev => prev.map(a => a.id === id ? data : a));

      return data;
    } catch (error) {
      console.error('Error updating allocation:', error);
      toast.error('Kunde inte uppdatera allokering');
      return null;
    }
  };

  const deleteAllocation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_allocations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Update local state
      setAllocations(prev => prev.filter(a => a.id !== id));

      toast.success('Allokering borttagen!');
      return true;
    } catch (error) {
      console.error('Error deleting allocation:', error);
      toast.error('Kunde inte ta bort allokering');
      return false;
    }
  };

  // Helper: Get allocations for a specific week
  const getAllocationsForWeek = (weekStart: string) => {
    return allocations.filter(a => a.week_start === weekStart);
  };

  // Helper: Get allocations for a specific project
  const getAllocationsForProject = (projectId: string) => {
    return allocations.filter(a => a.project_id === projectId);
  };

  // Helper: Get total hours allocated for a week
  const getTotalHoursForWeek = (weekStart: string) => {
    return allocations
      .filter(a => a.week_start === weekStart)
      .reduce((sum, a) => sum + a.allocated_hours, 0);
  };

  // Helper: Get total hours allocated for a project
  const getTotalHoursForProject = (projectId: string) => {
    return allocations
      .filter(a => a.project_id === projectId)
      .reduce((sum, a) => sum + a.allocated_hours, 0);
  };

  return {
    allocations,
    loading,
    setAllocation,
    updateAllocation,
    deleteAllocation,
    getAllocationsForWeek,
    getAllocationsForProject,
    getTotalHoursForWeek,
    getTotalHoursForProject,
    refetch: fetchAllocations,
  };
}
