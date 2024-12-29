-- Drop existing triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS create_profile_if_not_exists();

-- Drop existing table and recreate
DROP TABLE IF EXISTS profiles;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'User',
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NULL,  -- Allow NULL for phone
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    balance INTEGER DEFAULT 0 CHECK (balance >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique index for non-null phone numbers only
DROP INDEX IF EXISTS profiles_phone_key;
CREATE UNIQUE INDEX profiles_phone_key ON profiles (phone) WHERE phone IS NOT NULL;

-- Create other indexes
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);
CREATE INDEX IF NOT EXISTS profiles_is_active_idx ON profiles(is_active);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- First, ensure the profile exists for the admin user
INSERT INTO profiles (id, email, name, role, phone, balance, is_active)
VALUES (
    'a6d07b7f-b67b-4285-9975-b5b0cf5f90e9',  -- admin user id
    'admin@example.com',
    'Admin User',
    'admin',
    NULL,  -- Set to NULL instead of empty string
    0,
    true
)
ON CONFLICT (id) DO UPDATE
SET 
    role = 'admin',
    name = 'Admin User',
    updated_at = NOW();

-- Update admin user's metadata first
UPDATE auth.users 
SET raw_user_meta_data = jsonb_build_object('role', 'admin', 'name', 'Admin User')
WHERE email = 'admin@example.com';

-- Then update the profile
UPDATE profiles 
SET 
    role = 'admin',
    name = 'Admin User',
    phone = NULL,  -- Set to NULL instead of empty string
    updated_at = NOW()
WHERE email = 'admin@example.com';

-- Reset RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON profiles;
DROP POLICY IF EXISTS "Enable update for users based on id" ON profiles;

-- Create simplified RLS policies
CREATE POLICY "Enable read access for all users" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for users based on id" ON profiles
    FOR UPDATE USING (
        auth.uid() = id OR 
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, phone, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', 'User'),
        NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), ''),  -- Convert empty string to NULL
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    )
    ON CONFLICT (id) DO UPDATE
    SET 
        email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, profiles.name),
        phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), profiles.phone),  -- Keep existing phone if new one is empty
        role = COALESCE(EXCLUDED.role, profiles.role),
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Update existing profiles to use NULL for empty phone numbers
UPDATE profiles 
SET phone = NULL 
WHERE phone = '';

-- Create missing profiles for existing users
INSERT INTO profiles (id, email, name, role, phone, balance, is_active)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'User'),
    COALESCE(au.raw_user_meta_data->>'role', 'user'),
    NULLIF(TRIM(COALESCE(au.raw_user_meta_data->>'phone', '')), ''),  -- Convert empty string to NULL
    0,
    true
FROM auth.users au
LEFT JOIN profiles p ON p.id = au.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE
SET 
    email = EXCLUDED.email,
    name = COALESCE(EXCLUDED.name, profiles.name),
    role = COALESCE(EXCLUDED.role, profiles.role),
    phone = COALESCE(NULLIF(TRIM(EXCLUDED.phone), ''), profiles.phone),  -- Keep existing phone if new one is empty
    updated_at = NOW();

-- Verify the changes
SELECT 
    au.email,
    au.raw_user_meta_data->>'role' as auth_role,
    p.role as profile_role,
    p.name as profile_name
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE au.email = 'admin@example.com';
