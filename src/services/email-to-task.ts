import { supabase } from '@/lib/supabase';
import { CreateTaskInput } from '@/lib/types';
import { parseNaturalDateTime } from '@/lib/dateParser';

export interface EmailTask {
  id: string;
  from: string;
  subject: string;
  body: string;
  task_data: {
    title: string;
    description: string;
    deadline: string | null;
    priority: number;
    estimated_duration: number;
  };
  processed: boolean;
  created_at: string;
}

// Skapa Supabase-tabellen för email queue (kör detta i Supabase SQL Editor):
/*
CREATE TABLE email_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  task_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_email_tasks_user_processed ON email_tasks(user_id, processed);

-- RLS policies
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email tasks"
  ON email_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Backend can insert email tasks"
  ON email_tasks FOR INSERT
  WITH CHECK (true); -- Backend använder service role key
*/

// Hämta oprocessade email-tasks
export async function getUnprocessedEmailTasks(userId: string): Promise<EmailTask[]> {
  const { data, error } = await supabase
    .from('email_tasks')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch email tasks:', error);
    return [];
  }

  return data || [];
}

// Markera email-task som processad
export async function markEmailTaskProcessed(taskId: string): Promise<boolean> {
  const { error } = await supabase
    .from('email_tasks')
    .update({ processed: true })
    .eq('id', taskId);

  if (error) {
    console.error('Failed to mark email task as processed:', error);
    return false;
  }

  return true;
}

// Konvertera email-task till CreateTaskInput (CPM-format)
export function emailTaskToTaskInput(emailTask: EmailTask): CreateTaskInput {
  const { task_data } = emailTask;

  // Konvertera Claude's priority (1-10) till CPM-värden
  // Priority 1-3 → låg value (4-5)
  // Priority 4-6 → medel value (6-7)
  // Priority 7-10 → hög value (8-10)
  const value_score = Math.min(10, Math.max(1, Math.ceil(task_data.priority * 0.9) + 1));

  // Deadline → time_sensitivity
  // Har deadline → högre time_sensitivity
  const time_sensitivity = task_data.deadline ? 7 : 5;

  // Estimated duration → effort
  // 0-15 min → 2
  // 15-30 min → 3
  // 30-60 min → 5
  // 60-120 min → 7
  // 120+ min → 9
  let effort = 5;
  if (task_data.estimated_duration <= 15) effort = 2;
  else if (task_data.estimated_duration <= 30) effort = 3;
  else if (task_data.estimated_duration <= 60) effort = 5;
  else if (task_data.estimated_duration <= 120) effort = 7;
  else effort = 9;

  return {
    title: `📧 ${task_data.title}`,
    description: `**Från mejl:** ${emailTask.from}\n**Ämne:** ${emailTask.subject}\n\n${task_data.description}`,
    value_score,
    time_sensitivity,
    confidence: 7, // Medium confidence för email-tasks
    effort,
    deadline: task_data.deadline || undefined,
    estimated_duration: task_data.estimated_duration,
    priority_flag: task_data.deadline ? undefined : 'whenever',
  };
}

// Lyssna på nya email-tasks (realtime)
export function subscribeToEmailTasks(
  userId: string,
  onNewTask: (emailTask: EmailTask) => void
) {
  const subscription = supabase
    .channel('email_tasks_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'email_tasks',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const emailTask = payload.new as EmailTask;
        if (!emailTask.processed) {
          onNewTask(emailTask);
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
