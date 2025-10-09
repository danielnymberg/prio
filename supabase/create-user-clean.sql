-- ============================================
-- CREATE USER WITH FIXED UUID
-- This will create the user with the SAME UUID as the export
-- So we can import tasks without issues
-- ============================================

WITH new_user AS (
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
    'e9ca80a3-5106-47ad-9d81-611508e57a54'::uuid, -- Same UUID as old project
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
  RETURNING id, email
)
INSERT INTO profiles (id, email, full_name, is_beta_tester)
SELECT id, email, 'Daniel Nymberg', true
FROM new_user
RETURNING id, email, full_name;

-- Verify
SELECT 'User created:' as status, id, email FROM auth.users WHERE email = 'daniel@nymberg.se';
