-- Create profile for existing user
INSERT INTO profiles (id, email, full_name, is_beta_tester, onboarding_completed)
VALUES (
  '594ba863-a738-4272-be92-b5602165e7dd'::uuid,
  'daniel@nymberg.se',
  'Daniel Nymberg',
  true,
  false
)
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  is_beta_tester = EXCLUDED.is_beta_tester;

-- Verify
SELECT * FROM profiles WHERE id = '594ba863-a738-4272-be92-b5602165e7dd';
