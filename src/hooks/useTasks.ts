import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';

export function useTasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setTasks([]);
      setLoading(false);
      return;
    }

    fetchTasks();

    // Subscribe to realtime changes
    const subscription = supabase
      .channel('tasks_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchTasks();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Kunde inte hämta tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (input: CreateTaskInput) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('Task skapad!');
      return data;
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Kunde inte skapa task');
      return null;
    }
  };

  const updateTask = async (id: string, input: UpdateTaskInput) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      toast.success('Task uppdaterad!');
      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Kunde inte uppdatera task');
      return null;
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;
      toast.success('Task borttagen!');
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Kunde inte ta bort task');
      return false;
    }
  };

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
}
