-- Create admin_members table
CREATE TABLE IF NOT EXISTS admin_members (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW())
);

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    balance DECIMAL(12,2) DEFAULT 0,
    status BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW())
);

-- Create lottery_types table
CREATE TABLE IF NOT EXISTS lottery_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    country VARCHAR(50) NOT NULL,
    digits INTEGER NOT NULL,
    min_bet DECIMAL(12,2) NOT NULL,
    max_bet DECIMAL(12,2) NOT NULL,
    payout_rate DECIMAL(6,2) NOT NULL,
    status BOOLEAN DEFAULT true
);

-- Create bets table
CREATE TABLE IF NOT EXISTS bets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    lottery_type_id INTEGER REFERENCES lottery_types(id),
    number VARCHAR(3) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    session VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW())
);

-- Create deposits table
CREATE TABLE IF NOT EXISTS deposits (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    receipt_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW())
);

-- Create withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('UTC', NOW())
);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE lottery_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Enable read access for all users" ON lottery_types
    FOR SELECT USING (true);

-- Policies for bets table
CREATE POLICY "Enable read for users own bets" ON bets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for users own bets" ON bets
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for deposits table
CREATE POLICY "Enable read for users own deposits" ON deposits
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for users own deposits" ON deposits
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for withdrawals table
CREATE POLICY "Enable read for users own withdrawals" ON withdrawals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Enable insert for users own withdrawals" ON withdrawals
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policies for customers table
CREATE POLICY "Enable read for users own profile" ON customers
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Enable update for users own profile" ON customers
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Enable insert for new users" ON customers
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for admin_members table
CREATE POLICY "Enable read for admin users" ON admin_members
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Enable insert for new admin users" ON admin_members
    FOR INSERT WITH CHECK (auth.uid() = id);
