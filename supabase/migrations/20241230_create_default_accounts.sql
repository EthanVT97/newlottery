-- First delete existing profiles
DELETE FROM public.profiles WHERE email IN ('admin@mm2d3d.com', 'user@mm2d3d.com');

-- Then delete existing users
DELETE FROM auth.users WHERE email IN ('admin@mm2d3d.com', 'user@mm2d3d.com');

-- Create users and their profiles
WITH inserted_admin AS (
    -- Create admin account
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
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'admin@mm2d3d.com',
        crypt('admin123', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "admin"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id, email
), inserted_user AS (
    -- Create regular user account
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
        email_change,
        email_change_token_new,
        recovery_token
    ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'user@mm2d3d.com',
        crypt('user123', gen_salt('bf')),
        NOW(),
        '{"provider": "email", "providers": ["email"]}',
        '{"role": "user"}',
        NOW(),
        NOW(),
        '',
        '',
        '',
        ''
    )
    RETURNING id, email
)
-- Create corresponding profiles
INSERT INTO public.profiles (id, email, name, role, phone, balance, is_active)
SELECT 
    id,
    email,
    CASE WHEN email = 'admin@mm2d3d.com' THEN 'Admin User' ELSE 'Regular User' END,
    CASE WHEN email = 'admin@mm2d3d.com' THEN 'admin' ELSE 'user' END,
    NULL,
    0,
    true
FROM (
    SELECT * FROM inserted_admin
    UNION ALL
    SELECT * FROM inserted_user
) new_users;
