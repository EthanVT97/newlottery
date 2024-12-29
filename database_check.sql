-- Check table structures
SELECT 
    table_name,
    column_name,
    data_type,
    column_default,
    is_nullable,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check constraints
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.check_constraints cc
    ON cc.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- Create execute_sql function
CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION execute_sql(text) TO service_role;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('admin_members', 'customers', 'lottery_types');

-- Temporarily disable RLS
ALTER TABLE admin_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_types DISABLE ROW LEVEL SECURITY;

-- After setup, we'll re-enable it:
-- ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE lottery_types ENABLE ROW LEVEL SECURITY;

-- Check RLS policies for lottery_types
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'lottery_types';

-- Check table contents
SELECT 'admin_members' as table_name, COUNT(*) as row_count FROM admin_members
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'lottery_types', COUNT(*) FROM lottery_types
UNION ALL
SELECT 'bets', COUNT(*) FROM bets
UNION ALL
SELECT 'deposits', COUNT(*) FROM deposits
UNION ALL
SELECT 'withdrawals', COUNT(*) FROM withdrawals;

-- Check admin_members data
SELECT * FROM admin_members LIMIT 5;

-- Check customers data
SELECT * FROM customers LIMIT 5;

-- Check lottery_types data
SELECT * FROM lottery_types LIMIT 5;

-- Check sample bets
SELECT * FROM bets LIMIT 5;

-- Check sample deposits
SELECT * FROM deposits LIMIT 5;

-- Check sample withdrawals
SELECT * FROM withdrawals LIMIT 5;

-- Check enums and custom types
SELECT 
    t.typname,
    e.enumlabel
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public';

-- Check role constraint specifically
SELECT
    con.conname AS constraint_name,
    pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_namespace nsp ON nsp.oid = con.connamespace
JOIN pg_class cls ON cls.oid = con.conrelid
WHERE nsp.nspname = 'public'
    AND cls.relname = 'admin_members'
    AND con.conname = 'admin_members_role_check';

-- Check exact bytes of working role value
SELECT 
    role,
    length(role) as char_length,
    ascii(substr(role, generate_series(1, length(role)), 1)) as char_codes
FROM admin_members 
WHERE role = 'ဒိုင်ချုပ်';

-- Also check the constraint definition again
SELECT pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'admin_members_role_check';
