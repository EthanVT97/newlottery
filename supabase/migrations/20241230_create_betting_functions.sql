-- Function to place a bet
CREATE OR REPLACE FUNCTION place_bet(
    p_user_id UUID,
    p_session_id UUID,
    p_numbers VARCHAR(10),
    p_amount INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session lottery_sessions%ROWTYPE;
    v_user_balance INTEGER;
    v_bet_id UUID;
BEGIN
    -- Check if session exists and is active
    SELECT * INTO v_session
    FROM lottery_sessions
    WHERE id = p_session_id AND is_active = true;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid or inactive session';
    END IF;

    -- Check if it's past closing time
    IF CURRENT_TIME > v_session.closing_time THEN
        RAISE EXCEPTION 'Betting is closed for this session';
    END IF;

    -- Check user balance
    SELECT balance INTO v_user_balance
    FROM profiles
    WHERE id = p_user_id;

    IF v_user_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Create bet and update balance in a transaction
    BEGIN
        -- Insert bet
        INSERT INTO bets (user_id, session_id, numbers, amount)
        VALUES (p_user_id, p_session_id, p_numbers, p_amount)
        RETURNING id INTO v_bet_id;

        -- Update user balance
        UPDATE profiles
        SET 
            balance = balance - p_amount,
            updated_at = NOW()
        WHERE id = p_user_id;

        RETURN v_bet_id;
    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to place bet: %', SQLERRM;
    END;
END;
$$;

-- Function to submit winning numbers
CREATE OR REPLACE FUNCTION submit_winning_numbers(
    p_session_id UUID,
    p_winning_numbers VARCHAR(10)
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_session lottery_sessions%ROWTYPE;
    v_bet RECORD;
    v_payout_rate INTEGER;
BEGIN
    -- Check if session exists
    SELECT * INTO v_session
    FROM lottery_sessions
    WHERE id = p_session_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid session';
    END IF;

    -- Set payout rate based on session type
    v_payout_rate := CASE 
        WHEN v_session.session_type = '2D' THEN 85
        WHEN v_session.session_type = '3D' THEN 500
        ELSE 0
    END;

    -- Begin transaction
    BEGIN
        -- Insert winning numbers
        INSERT INTO bet_results (session_id, winning_numbers)
        VALUES (p_session_id, p_winning_numbers);

        -- Update all bets for this session
        FOR v_bet IN 
            SELECT b.id, b.user_id, b.amount
            FROM bets b
            WHERE b.session_id = p_session_id
            AND b.status = 'pending'
        LOOP
            -- Update bet status
            UPDATE bets
            SET 
                status = CASE 
                    WHEN numbers = p_winning_numbers THEN 'won'
                    ELSE 'lost'
                END,
                updated_at = NOW()
            WHERE id = v_bet.id;

            -- If bet won, update user balance
            IF v_bet.numbers = p_winning_numbers THEN
                UPDATE profiles
                SET 
                    balance = balance + (v_bet.amount * v_payout_rate),
                    updated_at = NOW()
                WHERE id = v_bet.user_id;
            END IF;
        END LOOP;

        -- Deactivate the session
        UPDATE lottery_sessions
        SET 
            is_active = false,
            updated_at = NOW()
        WHERE id = p_session_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process results: %', SQLERRM;
    END;
END;
$$;

-- Function to get active sessions
CREATE OR REPLACE FUNCTION get_active_sessions(p_session_type VARCHAR DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    session_type VARCHAR(2),
    opening_time TIME,
    closing_time TIME,
    draw_time TIME,
    is_active BOOLEAN,
    result VARCHAR(10),
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ls.id,
        ls.session_type,
        ls.opening_time,
        ls.closing_time,
        ls.draw_time,
        ls.is_active,
        ls.result,
        ls.created_at,
        ls.updated_at
    FROM lottery_sessions ls
    WHERE 
        ls.is_active = true
        AND (p_session_type IS NULL OR ls.session_type = p_session_type)
        AND DATE(ls.created_at) = CURRENT_DATE
        AND ls.closing_time > CURRENT_TIME
    ORDER BY ls.draw_time ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_sessions TO public;

-- Function to get user bets
CREATE OR REPLACE FUNCTION get_user_bets(
    p_user_id UUID,
    p_status VARCHAR DEFAULT NULL,
    p_from_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    bet_id UUID,
    session_type VARCHAR,
    session_time TIME,
    numbers VARCHAR,
    amount INTEGER,
    status VARCHAR,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id as bet_id,
        s.session_type,
        s.session_time,
        b.numbers,
        b.amount,
        b.status,
        b.created_at
    FROM bets b
    JOIN lottery_sessions s ON s.id = b.session_id
    WHERE b.user_id = p_user_id
    AND (p_status IS NULL OR b.status = p_status)
    AND DATE(b.created_at) >= p_from_date
    ORDER BY b.created_at DESC;
END;
$$;

-- Function to cancel bet
CREATE OR REPLACE FUNCTION cancel_bet(
    p_bet_id UUID,
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_bet bets%ROWTYPE;
    v_session lottery_sessions%ROWTYPE;
BEGIN
    -- Get bet details
    SELECT * INTO v_bet
    FROM bets
    WHERE id = p_bet_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bet not found or not owned by user';
    END IF;

    IF v_bet.status != 'pending' THEN
        RAISE EXCEPTION 'Only pending bets can be cancelled';
    END IF;

    -- Get session details
    SELECT * INTO v_session
    FROM lottery_sessions
    WHERE id = v_bet.session_id;

    IF CURRENT_TIME > v_session.closing_time THEN
        RAISE EXCEPTION 'Cannot cancel bet after closing time';
    END IF;

    -- Begin transaction
    BEGIN
        -- Update bet status
        UPDATE bets
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = p_bet_id;

        -- Refund amount to user
        UPDATE profiles
        SET 
            balance = balance + v_bet.amount,
            updated_at = NOW()
        WHERE id = p_user_id;

    EXCEPTION WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to cancel bet: %', SQLERRM;
    END;
END;
$$;
