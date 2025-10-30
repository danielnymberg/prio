-- Conversation history tabell för persistent storage av AI-chatt
-- Redis används som 24h cache, Supabase som permanent backup

CREATE TABLE IF NOT EXISTS conversation_history (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Chat messages
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Metadata
  message_count int GENERATED ALWAYS AS (jsonb_array_length(messages)) STORED,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- One conversation per user (upsert pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_conversation_history_user ON conversation_history(user_id);

-- Index för sökning i messages
CREATE INDEX IF NOT EXISTS idx_conversation_history_messages ON conversation_history USING gin(messages);

-- RLS policies
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own conversation history"
  ON conversation_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation history"
  ON conversation_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation history"
  ON conversation_history FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation history"
  ON conversation_history FOR DELETE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_conversation_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_history_updated_at
  BEFORE UPDATE ON conversation_history
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_history_updated_at();
