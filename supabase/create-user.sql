-- ============================================
-- CREATE USER AND PROFILE
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create user in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(), -- Will generate a new UUID
  'authenticated',
  'authenticated',
  'daniel@nymberg.se',
  crypt('qwerty1234', gen_salt('bf')), -- Password: qwerty1234
  NOW(), -- Auto-confirm email
  '{"provider":"email","providers":["email"]}',
  '{}',
  NOW(),
  NOW(),
  '',
  ''
)
RETURNING id, email;

-- 2. Create profile (run this AFTER step 1, replace USER_ID with the ID from step 1)
-- INSERT INTO profiles (id, email, full_name, is_beta_tester)
-- VALUES (
--   'USER_ID_FROM_STEP_1',
--   'daniel@nymberg.se',
--   'Daniel Nymberg',
--   true
-- );

-- OR: If you want to do it in one go, use this instead:
--
-- WITH new_user AS (
--   INSERT INTO auth.users (
--     instance_id, id, aud, role, email, encrypted_password,
--     email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
--     created_at, updated_at, confirmation_token, recovery_token
--   ) VALUES (
--     '00000000-0000-0000-0000-000000000000',
--     gen_random_uuid(),
--     'authenticated',
--     'authenticated',
--     'daniel@nymberg.se',
--     crypt('qwerty1234', gen_salt('bf')),
--     NOW(),
--     '{"provider":"email","providers":["email"]}',
--     '{}',
--     NOW(),
--     NOW(),
--     '',
--     ''
--   )
--   RETURNING id, email
-- )
-- INSERT INTO profiles (id, email, full_name, is_beta_tester)
-- SELECT id, email, 'Daniel Nymberg', true
-- FROM new_user;

-- Note: Change password after first login!
