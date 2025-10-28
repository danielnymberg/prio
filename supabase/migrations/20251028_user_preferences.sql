-- User preferences table for AI assistant personalization
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Locations (coordinates for geofencing & navigation)
  home_location jsonb DEFAULT '{"lat": null, "lon": null, "name": "Hem"}'::jsonb,
  work_location jsonb DEFAULT '{"lat": null, "lon": null, "name": "Jobb"}'::jsonb,

  -- Budget tracking (for expense aggregation)
  budget_food jsonb DEFAULT '{"lunch": 120, "dinner": 200, "coffee": 50}'::jsonb,
  budget_transport jsonb DEFAULT '{"monthly_max": 2000}'::jsonb,

  -- Work schedule
  work_hours jsonb DEFAULT '{"start": "09:00", "end": "17:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}'::jsonb,

  -- Travel patterns
  travel_patterns jsonb DEFAULT '{"frequent_routes": [], "preferred_airline": null}'::jsonb,

  -- Meeting preferences
  meeting_preferences jsonb DEFAULT '{"buffer_before": 15, "buffer_after": 0, "max_per_day": 4}'::jsonb,

  -- Geofences (for location-based notifications)
  -- Example: [{"name": "Centralen", "lat": 59.3293, "lon": 18.0686, "radius": 500}]
  geofences jsonb DEFAULT '[]'::jsonb,

  -- Communication style
  communication_style text DEFAULT 'casual',

  -- Custom AI context (freeform text)
  custom_context text,

  -- Metadata
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
