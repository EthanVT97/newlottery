-- Drop existing tables if they exist
DROP TABLE IF EXISTS bet_results CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TABLE IF EXISTS lottery_sessions CASCADE;

-- Create lottery sessions table
CREATE TABLE IF NOT EXISTS lottery_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_type VARCHAR(2) NOT NULL CHECK (session_type IN ('2D', '3D')),
    opening_time TIME NOT NULL,
    closing_time TIME NOT NULL,
    draw_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    result VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT valid_times CHECK (
        opening_time < closing_time 
        AND closing_time < draw_time
    )
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lottery_sessions_updated_at
    BEFORE UPDATE ON lottery_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create unique constraint for session type and time
CREATE UNIQUE INDEX lottery_sessions_type_time_idx ON lottery_sessions (session_type, opening_time);

-- Create bets table
CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    session_id UUID NOT NULL REFERENCES lottery_sessions(id),
    numbers VARCHAR(10) NOT NULL,
    amount INTEGER NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bet_results table
CREATE TABLE bet_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES lottery_sessions(id),
    winning_numbers VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX bets_user_id_idx ON bets(user_id);
CREATE INDEX bets_session_id_idx ON bets(session_id);
CREATE INDEX bets_status_idx ON bets(status);
CREATE INDEX bet_results_session_id_idx ON bet_results(session_id);

-- Enable RLS
ALTER TABLE lottery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for lottery_sessions
DROP POLICY IF EXISTS "Anyone can view active sessions" ON lottery_sessions;
CREATE POLICY "Anyone can view active sessions" ON lottery_sessions
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "Only admins can insert sessions" ON lottery_sessions;
CREATE POLICY "Only admins can insert sessions" ON lottery_sessions
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Only admins can update sessions" ON lottery_sessions;
CREATE POLICY "Only admins can update sessions" ON lottery_sessions
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for bets
DROP POLICY IF EXISTS "Users can view their own bets" ON bets;
CREATE POLICY "Users can view their own bets" ON bets
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Authenticated users can place bets" ON bets;
CREATE POLICY "Authenticated users can place bets" ON bets
    FOR INSERT TO authenticated
    WITH CHECK (
        auth.uid() = user_id AND
        EXISTS (
            SELECT 1 FROM lottery_sessions s
            WHERE s.id = session_id AND s.is_active = true
        )
    );

DROP POLICY IF EXISTS "Users can update their pending bets" ON bets;
CREATE POLICY "Users can update their pending bets" ON bets
    FOR UPDATE TO authenticated
    USING (
        (user_id = auth.uid() AND status = 'pending') OR
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for bet_results
DROP POLICY IF EXISTS "Anyone can view results" ON bet_results;
CREATE POLICY "Anyone can view results" ON bet_results
    FOR SELECT TO public
    USING (true);

DROP POLICY IF EXISTS "Only admins can insert results" ON bet_results;
CREATE POLICY "Only admins can insert results" ON bet_results
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Insert default sessions for today
INSERT INTO lottery_sessions (session_type, opening_time, closing_time, draw_time)
VALUES 
    -- Morning 2D
    ('2D', '09:00', '11:30', '12:00'),
    -- Evening 2D
    ('2D', '14:00', '15:30', '16:00'),
    -- 3D (Once per day)
    ('3D', '09:00', '14:00', '16:00');

-- Create or replace function for real-time updates
CREATE OR REPLACE FUNCTION handle_bet_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify about the change
    PERFORM pg_notify(
        'bet_updates',
        json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'id', NEW.id,
            'user_id', NEW.user_id,
            'session_id', NEW.session_id,
            'status', NEW.status,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$;

-- Create or replace function for session updates
CREATE OR REPLACE FUNCTION handle_session_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify about the change
    PERFORM pg_notify(
        'session_updates',
        json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'id', NEW.id,
            'session_type', NEW.session_type,
            'opening_time', NEW.opening_time,
            'is_active', NEW.is_active
        )::text
    );
    RETURN NEW;
END;
$$;

-- Create or replace function for result updates
CREATE OR REPLACE FUNCTION handle_result_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Notify about the change
    PERFORM pg_notify(
        'result_updates',
        json_build_object(
            'type', TG_OP,
            'table', TG_TABLE_NAME,
            'id', NEW.id,
            'session_id', NEW.session_id,
            'winning_numbers', NEW.winning_numbers
        )::text
    );
    RETURN NEW;
END;
$$;

-- Create triggers for real-time updates
CREATE TRIGGER on_bet_change
    AFTER INSERT OR UPDATE ON bets
    FOR EACH ROW
    EXECUTE FUNCTION handle_bet_updates();

CREATE TRIGGER on_session_change
    AFTER INSERT OR UPDATE ON lottery_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_session_updates();

CREATE TRIGGER on_result_change
    AFTER INSERT OR UPDATE ON bet_results
    FOR EACH ROW
    EXECUTE FUNCTION handle_result_updates();
