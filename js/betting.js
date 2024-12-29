// betting.js - Shared betting functions
import { supabase } from './config.js';

// Payout rates for different bet types
export const PAYOUT_RATES = {
    '2D': 85,
    '3D': 500
};

// Subscribe to real-time updates
export async function subscribeToUpdates(callbacks = {}) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return () => {};

    const channels = [];

    // Bet updates
    if (callbacks.onBetUpdate) {
        const betChannel = supabase
            .channel('bet_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bets',
                    filter: `user_id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Bet change received!', payload);
                    callbacks.onBetUpdate(payload);
                }
            )
            .subscribe();
        channels.push(betChannel);
    }

    // Session updates
    if (callbacks.onSessionUpdate) {
        const sessionChannel = supabase
            .channel('session_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'lottery_sessions',
                    filter: 'is_active=eq.true'
                },
                (payload) => {
                    console.log('Session change received!', payload);
                    callbacks.onSessionUpdate(payload);
                }
            )
            .subscribe();
        channels.push(sessionChannel);
    }

    // Result updates
    if (callbacks.onResultUpdate) {
        const resultChannel = supabase
            .channel('result_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'bet_results'
                },
                (payload) => {
                    console.log('Result change received!', payload);
                    callbacks.onResultUpdate(payload);
                }
            )
            .subscribe();
        channels.push(resultChannel);
    }

    // Balance updates
    if (callbacks.onBalanceUpdate) {
        const balanceChannel = supabase
            .channel('balance_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    console.log('Balance change received!', payload);
                    callbacks.onBalanceUpdate(payload);
                }
            )
            .subscribe();
        channels.push(balanceChannel);
    }

    // Return unsubscribe function
    return () => {
        channels.forEach(channel => {
            supabase.removeChannel(channel);
        });
    };
}

// Place a bet
export async function placeBet(sessionId, numbers, amount) {
    try {
        const { data, error } = await supabase.rpc('place_bet', {
            p_session_id: sessionId,
            p_numbers: numbers,
            p_amount: amount
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error placing bet:', error);
        throw error;
    }
}

// Get active sessions
export async function getActiveSessions(sessionType = null) {
    try {
        const { data, error } = await supabase.rpc('get_active_sessions', {
            p_session_type: sessionType
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting active sessions:', error);
        throw error;
    }
}

// Get user's betting history
export async function getUserBets(status = null, fromDate = null) {
    try {
        const { data, error } = await supabase.rpc('get_user_bets', {
            p_status: status,
            p_from_date: fromDate
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error getting user bets:', error);
        throw error;
    }
}

// Cancel a bet
export async function cancelBet(betId) {
    try {
        const { data, error } = await supabase.rpc('cancel_bet', {
            p_bet_id: betId
        });

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error canceling bet:', error);
        throw error;
    }
}

// Format bet type for display
export function formatBetType(type) {
    switch (type) {
        case '2D':
            return '2D';
        case '3D':
            return '3D';
        default:
            return type;
    }
}

// Get status badge HTML
export function getStatusBadge(status) {
    const badges = {
        'pending': '<span class="badge bg-warning">စောင့်ဆိုင်းဆဲ</span>',
        'won': '<span class="badge bg-success">အနိုင်ရ</span>',
        'lost': '<span class="badge bg-danger">အရှုံး</span>',
        'cancelled': '<span class="badge bg-secondary">ပယ်ဖျက်ပြီး</span>'
    };
    return badges[status] || '<span class="badge bg-secondary">Unknown</span>';
}

// Calculate potential win amount
export function calculatePotentialWin(betType, amount) {
    const rate = PAYOUT_RATES[betType] || 0;
    return amount * rate;
}
