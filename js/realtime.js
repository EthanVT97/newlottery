// realtime.js - Real-time updates using Supabase
import { supabase } from './config.js';
import { showToast } from './utils.js';

/**
 * Initialize real-time subscriptions
 */
export function initializeRealtime() {
    // Subscribe to lottery sessions
    const sessionsChannel = supabase
        .channel('lottery_sessions_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'lottery_sessions'
            },
            (payload) => handleSessionChange(payload)
        )
        .subscribe();

    // Subscribe to bets
    const betsChannel = supabase
        .channel('bets_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'bets'
            },
            (payload) => handleBetChange(payload)
        )
        .subscribe();

    // Subscribe to bet results
    const resultsChannel = supabase
        .channel('bet_results_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'bet_results'
            },
            (payload) => handleResultChange(payload)
        )
        .subscribe();

    // Subscribe to profiles
    const profilesChannel = supabase
        .channel('profiles_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'profiles'
            },
            (payload) => handleProfileChange(payload)
        )
        .subscribe();
}

/**
 * Handle lottery session changes
 */
function handleSessionChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Update sessions table if it exists
    const sessionsTable = document.getElementById('sessionsTable');
    if (sessionsTable) {
        updateSessionsTable();
    }

    // Show notification
    switch (eventType) {
        case 'INSERT':
            showToast(`New lottery session created: ${newRecord.name}`, 'success');
            break;
        case 'UPDATE':
            showToast(`Lottery session updated: ${newRecord.name}`, 'info');
            break;
        case 'DELETE':
            showToast(`Lottery session deleted: ${oldRecord.name}`, 'warning');
            break;
    }
}

/**
 * Handle bet changes
 */
function handleBetChange(payload) {
    const { eventType, new: newRecord } = payload;
    
    // Update bets table if it exists
    const betsTable = document.getElementById('betsTable');
    if (betsTable) {
        updateBetsTable();
    }

    // Update stats
    updateStats();

    // Show notification for new bets only
    if (eventType === 'INSERT') {
        showToast(`New bet placed: ${newRecord.numbers} for ${newRecord.amount} MMK`, 'info');
    }
}

/**
 * Handle bet result changes
 */
function handleResultChange(payload) {
    const { eventType, new: newRecord } = payload;
    
    // Update results table if it exists
    const resultsTable = document.getElementById('resultsTable');
    if (resultsTable) {
        updateResultsTable();
    }

    // Show notification for new results only
    if (eventType === 'INSERT') {
        showToast(`New result added: ${newRecord.numbers}`, 'success');
    }
}

/**
 * Handle profile changes
 */
function handleProfileChange(payload) {
    const { eventType, new: newRecord } = payload;
    
    // Update users table if it exists
    const usersTable = document.getElementById('usersTable');
    if (usersTable) {
        updateUsersTable();
    }

    // Show notification for new users only
    if (eventType === 'INSERT') {
        showToast(`New user registered: ${newRecord.name}`, 'info');
    }
}

/**
 * Update sessions table
 */
async function updateSessionsTable() {
    try {
        const { data: sessions, error } = await supabase
            .from('lottery_sessions')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const table = document.getElementById('sessionsTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        sessions.forEach(session => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${session.name}</td>
                <td>${session.game_type}</td>
                <td>${session.start_time}</td>
                <td>${session.end_time}</td>
                <td>${session.status}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editSession(${session.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteSession(${session.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating sessions table:', error);
        showToast('Error updating sessions table', 'error');
    }
}

/**
 * Update bets table
 */
async function updateBetsTable() {
    try {
        const { data: bets, error } = await supabase
            .from('bets')
            .select(`
                *,
                profiles (name),
                lottery_sessions (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const table = document.getElementById('betsTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        bets.forEach(bet => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${bet.profiles.name}</td>
                <td>${bet.lottery_sessions.name}</td>
                <td>${bet.numbers}</td>
                <td>${bet.amount}</td>
                <td>${bet.created_at}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteBet(${bet.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating bets table:', error);
        showToast('Error updating bets table', 'error');
    }
}

/**
 * Update results table
 */
async function updateResultsTable() {
    try {
        const { data: results, error } = await supabase
            .from('bet_results')
            .select(`
                *,
                lottery_sessions (name)
            `)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const table = document.getElementById('resultsTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        results.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${result.lottery_sessions.name}</td>
                <td>${result.numbers}</td>
                <td>${result.created_at}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteResult(${result.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating results table:', error);
        showToast('Error updating results table', 'error');
    }
}

/**
 * Update users table
 */
async function updateUsersTable() {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        const table = document.getElementById('usersTable');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        tbody.innerHTML = '';

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${user.balance}</td>
                <td>${user.created_at}</td>
                <td>
                    <button class="btn btn-sm btn-primary me-1" onclick="editUser(${user.id})">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error('Error updating users table:', error);
        showToast('Error updating users table', 'error');
    }
}

/**
 * Update dashboard stats
 */
async function updateStats() {
    try {
        // Get total users
        const { count: userCount, error: userError } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (userError) throw userError;

        // Get today's bets
        const today = new Date().toISOString().split('T')[0];
        const { data: todayBets, error: todayError } = await supabase
            .from('bets')
            .select('amount')
            .gte('created_at', today);

        if (todayError) throw todayError;

        // Get total bets
        const { data: totalBets, error: totalError } = await supabase
            .from('bets')
            .select('amount');

        if (totalError) throw totalError;

        // Calculate totals
        const todayTotal = todayBets.reduce((sum, bet) => sum + bet.amount, 0);
        const allTimeTotal = totalBets.reduce((sum, bet) => sum + bet.amount, 0);

        // Update UI
        document.getElementById('totalUsers').textContent = userCount || 0;
        document.getElementById('todayBets').textContent = `${todayTotal.toLocaleString()} ကျပ်`;
        document.getElementById('totalBets').textContent = `${allTimeTotal.toLocaleString()} ကျပ်`;
        document.getElementById('totalProfit').textContent = `${(allTimeTotal * 0.15).toLocaleString()} ကျပ်`;
    } catch (error) {
        console.error('Error updating stats:', error);
        showToast('Error updating dashboard stats', 'error');
    }
}
