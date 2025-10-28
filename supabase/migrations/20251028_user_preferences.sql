-- User preferences table for AI assistant personalization
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  work_hours jsonb DEFAULT '{"start": "09:00", "end": "17:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb,
  travel_patterns jsonb DEFAULT '{"frequent_routes": [], "preferred_airline": null}'::jsonb,
  meeting_preferences jsonb DEFAULT '{"buffer_before": 15, "buffer_after": 0, "max_per_day": 4}'::jsonb,
  communication_style text DEFAULT 'casual',
  custom_context text,
  updated_at timestamptz DEFAULT now()
);

-- Index for fast user lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();
