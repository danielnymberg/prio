-- Check if user exists
SELECT
  id,
  email,
  encrypted_password IS NOT NULL as has_password,
  email_confirmed_at,
  created_at,
  confirmation_sent_at
FROM auth.users
WHERE email = 'daniel@nymberg.se';

-- Check profile
SELECT * FROM profiles WHERE email = 'daniel@nymberg.se';

-- Count all users
SELECT COUNT(*) as total_users FROM auth.users;
