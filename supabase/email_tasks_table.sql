-- Email tasks table för email-to-task funktionalitet
-- Kör detta i Supabase SQL Editor

CREATE TABLE IF NOT EXISTS email_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT,
  task_data JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Index för snabbare queries
CREATE INDEX IF NOT EXISTS idx_email_tasks_user_processed
  ON email_tasks(user_id, processed);

CREATE INDEX IF NOT EXISTS idx_email_tasks_created
  ON email_tasks(created_at DESC);

-- Enable RLS
ALTER TABLE email_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own email tasks"
  ON email_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own email tasks"
  ON email_tasks FOR UPDATE
  USING (auth.uid() = user_id);

-- Backend service role kan skapa tasks (no policy needed - service role bypasses RLS)

-- Realtime för email_tasks (så frontend får notifieringar)
ALTER PUBLICATION supabase_realtime ADD TABLE email_tasks;

-- Funktion för att automatiskt sätta processed_at när processed = true
CREATE OR REPLACE FUNCTION set_email_task_processed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.processed = true AND OLD.processed = false THEN
    NEW.processed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_task_processed_trigger
  BEFORE UPDATE ON email_tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_email_task_processed_at();

-- Kommentar på tabellen
COMMENT ON TABLE email_tasks IS 'Email-to-task queue: Mejl från daniel@nymberg.se processas av Claude och skapar tasks automatiskt';
