-- User Preferences Table
-- For structured data (coordinates, budgets, geofences)
-- Complements Claude Memory (for casual natural language preferences)

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Locations (coordinates for geofencing)
  home_location JSONB DEFAULT '{"lat": null, "lon": null, "name": "Hem"}',
  work_location JSONB DEFAULT '{"lat": null, "lon": null, "name": "Jobb"}',

  -- Budget tracking (numeric data for aggregation)
  budget_food JSONB DEFAULT '{"lunch": 120, "dinner": 200, "coffee": 50}',
  budget_transport JSONB DEFAULT '{"monthly_max": 2000}',

  -- Work hours (for calendar capacity)
  work_hours JSONB DEFAULT '{"start": "09:00", "end": "17:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}',

  -- Travel patterns
  frequent_routes JSONB DEFAULT '[]',  -- ["Tyresö-Stockholm", "Stockholm-Göteborg"]
  preferred_transport JSONB DEFAULT '{"commute": "sl", "long_distance": "sj", "taxi": "uber"}',

  -- Meeting preferences
  meeting_buffer_minutes INTEGER DEFAULT 15,
  max_meetings_per_day INTEGER DEFAULT 4,

  -- Geofences (for location-based notifications)
  geofences JSONB DEFAULT '[]',
  -- Example: [{"name": "Centralen", "lat": 59.3293, "lon": 18.0686, "radius": 500}]

  -- Custom settings
  custom_data JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS Policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own preferences
CREATE POLICY "Users can view their own preferences"
  ON user_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences
  FOR DELETE
  USING (auth.uid() = user_id);

-- Comment
COMMENT ON TABLE user_preferences IS 'Structured user preferences (coordinates, budgets, geofences). Complements Claude Memory for programmatic data.';
