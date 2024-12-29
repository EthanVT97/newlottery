// Import required modules
import { supabase } from './config.js';
import { showToast, formatDateTime, formatMoney } from './utils.js';

// DOM Elements
const userNameElement = document.getElementById('userName');
const balanceDisplay = document.getElementById('balanceDisplay');
const winningsDisplay = document.getElementById('winningsDisplay');
const totalBetsDisplay = document.getElementById('totalBetsDisplay');
const recentBetsTable = document.getElementById('recentBetsTable');
const recentResultsTable = document.getElementById('recentResultsTable');
const logoutBtn = document.getElementById('logoutBtn');
const userBalance = document.getElementById('userBalance');

// Initialize dashboard
async function initializeDashboard() {
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
            window.location.href = 'login.html';
            return;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        userNameElement.textContent = profile.name || 'User';
        updateBalance(profile.balance || 0);

        await Promise.all([
            loadRecentBets(),
            loadRecentResults(),
            loadWinnings(),
            loadTotalBets()
        ]);

        subscribeToUpdates(user.id);

    } catch (error) {
        console.error('Dashboard error:', error);
        showToast('Error loading dashboard', 'error');
    }
}

// Update balance displays
function updateBalance(balance) {
    const formattedBalance = formatMoney(balance || 0);
    balanceDisplay.textContent = formattedBalance;
    userBalance.textContent = formattedBalance;
}

// Load recent bets
async function loadRecentBets() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: bets, error } = await supabase
            .from('bets')
            .select(`
                *,
                lottery_sessions (
                    id,
                    session_type,
                    session_time,
                    multiplier
                )
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!bets || bets.length === 0) {
            recentBetsTable.innerHTML = '<tr><td colspan="5" class="text-center">No recent bets</td></tr>';
            return;
        }

        recentBetsTable.innerHTML = bets.map(bet => `
            <tr>
                <td>${formatDateTime(bet.created_at)}</td>
                <td>${bet.lottery_sessions?.session_type || '-'}</td>
                <td>${bet.numbers}</td>
                <td>${formatMoney(bet.amount)}</td>
                <td><span class="badge ${getBetStatusClass(bet.status)}">${getBetStatusText(bet.status)}</span></td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading bets:', error);
        showToast('Error loading recent bets', 'error');
    }
}

// Load recent results
async function loadRecentResults() {
    try {
        const { data: results, error } = await supabase
            .from('bet_results')
            .select(`
                *,
                lottery_sessions (
                    id,
                    session_type,
                    session_time
                )
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        if (!results || results.length === 0) {
            recentResultsTable.innerHTML = '<tr><td colspan="4" class="text-center">No recent results</td></tr>';
            return;
        }

        recentResultsTable.innerHTML = results.map(result => `
            <tr>
                <td>${formatDateTime(result.created_at)}</td>
                <td>${result.lottery_sessions?.session_type || '-'}</td>
                <td class="fw-bold">${result.winning_numbers}</td>
                <td>${formatDateTime(result.lottery_sessions?.session_time)}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading results:', error);
        showToast('Error loading recent results', 'error');
    }
}

// Load total winnings
async function loadWinnings() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: winnings, error } = await supabase
            .from('bets')
            .select('amount, lottery_sessions(multiplier)')
            .eq('user_id', user.id)
            .eq('status', 'won');

        if (error) throw error;

        const totalWinnings = winnings?.reduce((total, bet) => 
            total + (bet.amount * (bet.lottery_sessions?.multiplier || 1)), 0) || 0;

        winningsDisplay.textContent = formatMoney(totalWinnings);

    } catch (error) {
        console.error('Error loading winnings:', error);
        showToast('Error loading winnings', 'error');
    }
}

// Load total bets
async function loadTotalBets() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        const { data: bets, error } = await supabase
            .from('bets')
            .select('amount')
            .eq('user_id', user.id);

        if (error) throw error;

        const totalBets = bets?.reduce((total, bet) => total + (bet.amount || 0), 0) || 0;
        totalBetsDisplay.textContent = formatMoney(totalBets);

    } catch (error) {
        console.error('Error loading total bets:', error);
        showToast('Error loading total bets', 'error');
    }
}

// Subscribe to real-time updates
function subscribeToUpdates(userId) {
    const channels = [];

    // Profile changes (balance updates)
    const profileChannel = supabase
        .channel('profile_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${userId}`
        }, payload => {
            if (payload.new) {
                updateBalance(payload.new.balance);
            }
        })
        .subscribe();
    
    channels.push(profileChannel);

    // Bet updates
    const betChannel = supabase
        .channel('bet_updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bets',
            filter: `user_id=eq.${userId}`
        }, () => {
            Promise.all([
                loadRecentBets(),
                loadWinnings(),
                loadTotalBets()
            ]);
        })
        .subscribe();
    
    channels.push(betChannel);

    // Result updates
    const resultChannel = supabase
        .channel('result_updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bet_results'
        }, () => {
            loadRecentResults();
        })
        .subscribe();
    
    channels.push(resultChannel);

    // Clean up on page unload
    window.addEventListener('unload', () => {
        channels.forEach(channel => {
            supabase.removeChannel(channel);
        });
    });
}

// Helper function to get bet status class
function getBetStatusClass(status) {
    switch (status) {
        case 'pending': return 'bg-warning text-dark';
        case 'won': return 'bg-success';
        case 'lost': return 'bg-danger';
        case 'cancelled': return 'bg-secondary';
        default: return 'bg-info';
    }
}

// Helper function to get bet status text
function getBetStatusText(status) {
    switch (status) {
        case 'pending': return 'Pending';
        case 'won': return 'Won';
        case 'lost': return 'Lost';
        case 'cancelled': return 'Cancelled';
        default: return status;
    }
}

// Handle logout
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('Error signing out', 'error');
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', initializeDashboard);
