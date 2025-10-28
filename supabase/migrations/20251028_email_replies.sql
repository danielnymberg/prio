-- Email replies tabell för async email queries
-- AI kan skicka mejl och vänta på svar
CREATE TABLE IF NOT EXISTS email_replies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Outgoing email
  sent_to text NOT NULL,
  sent_subject text NOT NULL,
  sent_body text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  sent_message_id text, -- MS Graph message ID

  -- Reply tracking
  status text DEFAULT 'waiting' CHECK (status IN ('waiting', 'received', 'timeout', 'cancelled')),
  reply_from text,
  reply_subject text,
  reply_body text,
  reply_received_at timestamptz,
  reply_message_id text,

  -- Metadata
  conversation_id text, -- Claude conversation ID (om vi vill fortsätta samma konversation)
  timeout_at timestamptz DEFAULT (now() + interval '24 hours'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index för snabb sökning
CREATE INDEX IF NOT EXISTS idx_email_replies_user_status ON email_replies(user_id, status);
CREATE INDEX IF NOT EXISTS idx_email_replies_sent_message ON email_replies(sent_message_id);
CREATE INDEX IF NOT EXISTS idx_email_replies_timeout ON email_replies(timeout_at) WHERE status = 'waiting';

-- RLS policies
ALTER TABLE email_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own email replies"
  ON email_replies FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email replies"
  ON email_replies FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email replies"
  ON email_replies FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_email_replies_updated_at
  BEFORE UPDATE ON email_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_email_replies_updated_at();
