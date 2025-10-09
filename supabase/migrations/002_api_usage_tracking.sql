-- API Usage Tracking System
-- Spåra Claude API-användning per user för quota-hantering

-- ==========================================
-- 1. API USAGE TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- API request counters
  claude_requests_today INT DEFAULT 0,
  claude_requests_month INT DEFAULT 0,
  azure_tts_chars_month INT DEFAULT 0,
  speechmatics_minutes_month INT DEFAULT 0,

  -- Token tracking (för Claude)
  claude_input_tokens_month BIGINT DEFAULT 0,
  claude_output_tokens_month BIGINT DEFAULT 0,

  -- Estimated costs (i USD cent)
  estimated_cost_today_cents INT DEFAULT 0,
  estimated_cost_month_cents INT DEFAULT 0,

  -- Reset timestamps
  daily_reset_at TIMESTAMPTZ DEFAULT NOW(),
  monthly_reset_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api usage"
  ON api_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own api usage"
  ON api_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own api usage"
  ON api_usage FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index för snabbare lookups
CREATE INDEX idx_api_usage_user_id ON api_usage(user_id);
CREATE INDEX idx_api_usage_daily_reset ON api_usage(daily_reset_at);
CREATE INDEX idx_api_usage_monthly_reset ON api_usage(monthly_reset_at);

-- ==========================================
-- 2. USER SETTINGS TABLE (för egna API-nycklar)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Pricing tier
  pricing_tier TEXT DEFAULT 'free' CHECK (pricing_tier IN ('free', 'pro', 'business')),

  -- Egna API-nycklar (encrypted i frontend innan lagring)
  own_claude_api_key TEXT, -- Encrypted
  own_azure_speech_key TEXT, -- Encrypted

  -- Usage preferences
  use_own_api_keys BOOLEAN DEFAULT FALSE,

  -- Quotas baserat på tier
  daily_claude_quota INT DEFAULT 50, -- free tier
  monthly_claude_quota INT DEFAULT 1500,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings"
  ON user_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own settings"
  ON user_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON user_settings FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ==========================================
-- 3. API REQUEST LOG (för detaljerad spårning)
-- ==========================================
CREATE TABLE IF NOT EXISTS api_request_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Request details
  api_type TEXT NOT NULL CHECK (api_type IN ('claude', 'azure_tts', 'speechmatics')),
  endpoint TEXT,

  -- Token/character counts
  input_tokens INT,
  output_tokens INT,
  characters INT,

  -- Cost calculation
  estimated_cost_cents INT,

  -- Metadata
  request_timestamp TIMESTAMPTZ DEFAULT NOW(),
  response_time_ms INT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT
);

-- Enable RLS
ALTER TABLE api_request_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api logs"
  ON api_request_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert api logs"
  ON api_request_log FOR INSERT
  WITH CHECK (TRUE); -- Backend med service role kan logga

-- Indexes
CREATE INDEX idx_api_log_user_id ON api_request_log(user_id);
CREATE INDEX idx_api_log_timestamp ON api_request_log(request_timestamp DESC);
CREATE INDEX idx_api_log_api_type ON api_request_log(api_type);

-- ==========================================
-- 4. FUNCTIONS - Auto-reset counters
-- ==========================================

-- Function: Reset daily counters
CREATE OR REPLACE FUNCTION reset_daily_api_usage()
RETURNS void AS $$
BEGIN
  UPDATE api_usage
  SET
    claude_requests_today = 0,
    estimated_cost_today_cents = 0,
    daily_reset_at = NOW()
  WHERE daily_reset_at < NOW() - INTERVAL '1 day';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reset monthly counters
CREATE OR REPLACE FUNCTION reset_monthly_api_usage()
RETURNS void AS $$
BEGIN
  UPDATE api_usage
  SET
    claude_requests_month = 0,
    azure_tts_chars_month = 0,
    speechmatics_minutes_month = 0,
    claude_input_tokens_month = 0,
    claude_output_tokens_month = 0,
    estimated_cost_month_cents = 0,
    monthly_reset_at = NOW()
  WHERE monthly_reset_at < NOW() - INTERVAL '1 month';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Increment Claude usage
CREATE OR REPLACE FUNCTION increment_claude_usage(
  p_user_id UUID,
  p_input_tokens INT,
  p_output_tokens INT
)
RETURNS void AS $$
DECLARE
  v_cost_cents INT;
BEGIN
  -- Calculate cost: $3/MTok input, $15/MTok output
  v_cost_cents := (p_input_tokens * 3 / 10000) + (p_output_tokens * 15 / 10000);

  -- Insert or update api_usage
  INSERT INTO api_usage (
    user_id,
    claude_requests_today,
    claude_requests_month,
    claude_input_tokens_month,
    claude_output_tokens_month,
    estimated_cost_today_cents,
    estimated_cost_month_cents
  ) VALUES (
    p_user_id,
    1,
    1,
    p_input_tokens,
    p_output_tokens,
    v_cost_cents,
    v_cost_cents
  )
  ON CONFLICT (user_id) DO UPDATE SET
    claude_requests_today = api_usage.claude_requests_today + 1,
    claude_requests_month = api_usage.claude_requests_month + 1,
    claude_input_tokens_month = api_usage.claude_input_tokens_month + p_input_tokens,
    claude_output_tokens_month = api_usage.claude_output_tokens_month + p_output_tokens,
    estimated_cost_today_cents = api_usage.estimated_cost_today_cents + v_cost_cents,
    estimated_cost_month_cents = api_usage.estimated_cost_month_cents + v_cost_cents,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 5. TRIGGERS - Auto-update timestamps
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_usage_updated_at
  BEFORE UPDATE ON api_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- 6. INITIAL DATA - Free tier defaults
-- ==========================================

-- Auto-create user_settings när ny user registreras
CREATE OR REPLACE FUNCTION create_user_settings_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_settings (user_id, pricing_tier, daily_claude_quota, monthly_claude_quota)
  VALUES (NEW.id, 'free', 50, 1500);

  INSERT INTO api_usage (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_user_settings_on_signup();

-- ==========================================
-- 7. VERIFICATION QUERIES
-- ==========================================

-- Se alla tabeller och RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('api_usage', 'user_settings', 'api_request_log');

-- Test: Hämta min egen usage (som inloggad user)
-- SELECT * FROM api_usage WHERE user_id = auth.uid();
-- SELECT * FROM user_settings WHERE user_id = auth.uid();
