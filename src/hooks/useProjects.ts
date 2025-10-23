import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Project } from '@/lib/types';
import toast from 'react-hot-toast';

export function useProjects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      console.log('[useProjects] Fetching projects for user:', user.id);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      console.log('[useProjects] Fetched projects:', data?.length, 'projects');
      console.log('[useProjects] Status breakdown:', data?.reduce((acc: any, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}));
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Kunde inte hämta projekt');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('[useProjects] useEffect triggered, user:', user?.id);
    fetchProjects();
  }, [user]);

  return {
    projects,
    loading,
    refetch: fetchProjects,
  };
}
