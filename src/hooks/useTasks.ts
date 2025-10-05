import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Task, CreateTaskInput, UpdateTaskInput } from '@/lib/types';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { calculatePriority } from '@/lib/priorityCalculation';

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
        .eq('user_id', user.id);

      if (error) throw error;

      // Beräkna priority med deadline boost och sortera
      const tasksWithPriority = (data || []).map(task => ({
        ...task,
        priority: calculatePriority(task),
      }));

      tasksWithPriority.sort((a, b) => b.priority - a.priority);

      setTasks(tasksWithPriority);
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

      // Optimistic update - lägg till ny task direkt
      setTasks(prevTasks => {
        const newTask = { ...data, priority: calculatePriority(data) };
        const allTasks = [...prevTasks, newTask];

        // Omberäkna priority för alla och sortera
        const withPriority = allTasks.map(task => ({
          ...task,
          priority: calculatePriority(task),
        }));

        withPriority.sort((a, b) => b.priority - a.priority);

        return withPriority;
      });

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
      // Optimistic update - uppdatera lokalt direkt för snabb feedback
      setTasks(prevTasks => {
        const updated = prevTasks.map(task =>
          task.id === id
            ? {
                ...task,
                ...input,
                updated_at: new Date().toISOString(),
              }
            : task
        );

        // Omberäkna priority med deadline boost för alla tasks
        const withPriority = updated.map(task => ({
          ...task,
          priority: calculatePriority(task),
        }));

        // Sortera efter ny priority
        withPriority.sort((a, b) => b.priority - a.priority);

        return withPriority;
      });

      // Konvertera undefined till null för Supabase (null rensar fält)
      const cleanInput: Record<string, any> = {};
      Object.entries(input).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanInput[key] = value;
        }
      });

      const { data, error } = await supabase
        .from('tasks')
        .update(cleanInput)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update error:', error);
        console.error('Input that failed:', cleanInput);
        // Återställ vid fel
        fetchTasks();
        throw error;
      }

      // Uppdatera med faktisk data från server
      setTasks(prevTasks => {
        const updated = prevTasks.map(task => (task.id === id ? data : task));

        // Omberäkna priority med deadline boost för alla tasks
        const withPriority = updated.map(task => ({
          ...task,
          priority: calculatePriority(task),
        }));

        // Sortera efter ny priority
        withPriority.sort((a, b) => b.priority - a.priority);

        return withPriority;
      });

      toast.success('Task uppdaterad!');
      return data;
    } catch (error: any) {
      console.error('Error updating task:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      toast.error(`Kunde inte uppdatera task: ${error.message || 'Okänt fel'}`);
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
