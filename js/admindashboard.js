// Import required modules
import { supabase } from './config.js';
import { showToast, formatDateTime, formatMoney } from './utils.js';

// DOM Elements
const totalUsersElement = document.getElementById('totalUsers');
const todayBetsElement = document.getElementById('todayBets');
const totalBetsElement = document.getElementById('totalBets');
const totalProfitElement = document.getElementById('totalProfit');
const usersTable = document.getElementById('usersTable');
const betsTable = document.getElementById('betsTable');
const resultsTable = document.getElementById('resultsTable');
const logoutBtn = document.getElementById('logoutBtn');
const refreshButtons = {
    users: document.getElementById('refreshUsers'),
    bets: document.getElementById('refreshBets'),
    results: document.getElementById('refreshResults')
};

// Initialize dashboard
async function initializeDashboard() {
    try {
        // Verify admin access
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        if (profileError) throw profileError;

        const isAdmin = profile.role === 'admin' || user.user_metadata?.role === 'admin';
        if (!isAdmin) {
            window.location.href = 'userdashboard.html';
            return;
        }

        // Load dashboard data
        await Promise.all([
            loadTotalUsers(),
            loadTodayBets(),
            loadTotalBets(),
            loadTotalProfit(),
            loadUsers(),
            loadBets(),
            loadResults()
        ]);

        // Subscribe to real-time updates
        subscribeToUpdates();

    } catch (error) {
        console.error('Dashboard initialization error:', error);
        showToast('အချက်အလက်များ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load total users count
async function loadTotalUsers() {
    try {
        const { count, error } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        if (error) throw error;
        totalUsersElement.textContent = count || 0;

    } catch (error) {
        console.error('Error loading total users:', error);
        showToast('အသုံးပြုသူအရေအတွက် ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load today's bets
async function loadTodayBets() {
    try {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: bets, error } = await supabase
            .from('bets')
            .select('amount')
            .gte('created_at', today);

        if (error) throw error;

        const todayTotal = bets.reduce((total, bet) => total + bet.amount, 0);
        todayBetsElement.textContent = formatMoney(todayTotal);

    } catch (error) {
        console.error('Error loading today bets:', error);
        showToast('ယနေ့လောင်းကြေးများ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load total bets
async function loadTotalBets() {
    try {
        const { data: bets, error } = await supabase
            .from('bets')
            .select('amount');

        if (error) throw error;

        const total = bets.reduce((total, bet) => total + bet.amount, 0);
        totalBetsElement.textContent = formatMoney(total);

    } catch (error) {
        console.error('Error loading total bets:', error);
        showToast('စုစုပေါင်းလောင်းကြေးများ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load total profit
async function loadTotalProfit() {
    try {
        // Get all bets
        const { data: bets, error: betsError } = await supabase
            .from('bets')
            .select('amount, status, multiplier');

        if (betsError) throw betsError;

        // Calculate total bets received
        const totalReceived = bets.reduce((total, bet) => total + bet.amount, 0);

        // Calculate total payouts
        const totalPaid = bets
            .filter(bet => bet.status === 'won')
            .reduce((total, bet) => total + (bet.amount * bet.multiplier), 0);

        // Calculate profit
        const profit = totalReceived - totalPaid;
        totalProfitElement.textContent = formatMoney(profit);

    } catch (error) {
        console.error('Error loading total profit:', error);
        showToast('အမြတ်ငွေ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load users list
async function loadUsers() {
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        usersTable.innerHTML = users.map(user => `
            <tr>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>${user.phone}</td>
                <td>${formatMoney(user.balance)}</td>
                <td>
                    <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                        ${user.is_active ? 'အသုံးပြုနေဆဲ' : 'ပိတ်ထား'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-${user.is_active ? 'danger' : 'success'}"
                            onclick="toggleUserStatus('${user.id}', ${!user.is_active})">
                        ${user.is_active ? 'ပိတ်မည်' : 'ဖွင့်မည်'}
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading users:', error);
        showToast('အသုံးပြုသူများ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load bets list
async function loadBets() {
    try {
        const { data: bets, error } = await supabase
            .from('bets')
            .select(`
                *,
                profiles (name),
                sessions (game_type)
            `)
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;

        betsTable.innerHTML = bets.map(bet => `
            <tr>
                <td>${formatDateTime(bet.created_at)}</td>
                <td>${bet.profiles.name}</td>
                <td>${bet.sessions.game_type}</td>
                <td>${bet.number}</td>
                <td>${formatMoney(bet.amount)}</td>
                <td>
                    <span class="badge ${getBetStatusClass(bet.status)}">
                        ${getBetStatusText(bet.status)}
                    </span>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading bets:', error);
        showToast('လောင်းကြေးများ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Load results list
async function loadResults() {
    try {
        const { data: results, error } = await supabase
            .from('bet_results')
            .select('*, lottery_sessions(*)')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        resultsTable.innerHTML = results.map(result => `
            <tr>
                <td>${formatDateTime(result.created_at)}</td>
                <td>${result.lottery_sessions.session_type}</td>
                <td class="fw-bold">${result.winning_numbers}</td>
                <td>${formatDateTime(result.lottery_sessions.session_time)}</td>
                <td>
                    <button class="btn btn-sm btn-danger" 
                            onclick="deleteResult('${result.id}')">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading results:', error);
        showToast('ရလဒ်များ ရယူရာတွင် အမှားရှိနေပါသည်', 'error');
    }
}

// Subscribe to real-time updates
function subscribeToUpdates() {
    // Subscribe to profile changes
    supabase
        .channel('profile_changes')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'profiles'
        }, () => {
            loadTotalUsers();
            loadUsers();
        })
        .subscribe();

    // Subscribe to bet updates
    supabase
        .channel('bet_updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bets'
        }, () => {
            loadTodayBets();
            loadTotalBets();
            loadTotalProfit();
            loadBets();
        })
        .subscribe();

    // Subscribe to result updates
    supabase
        .channel('result_updates')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'bet_results'
        }, () => {
            loadResults();
        })
        .subscribe();
}

// Toggle user status
window.toggleUserStatus = async (userId, newStatus) => {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: newStatus })
            .eq('id', userId);

        if (error) throw error;

        showToast('အသုံးပြုသူအခြေအနေ ပြောင်းလဲပြီးပါပြီ', 'success');
        loadUsers();

    } catch (error) {
        console.error('Error toggling user status:', error);
        showToast('အသုံးပြုသူအခြေအနေ ပြောင်းလဲရာတွင် အမှားရှိနေပါသည်', 'error');
    }
};

// Delete result
window.deleteResult = async (resultId) => {
    if (!confirm('ဤရလဒ်ကို ဖျက်ရန် သေချာပါသလား?')) return;

    try {
        const { error } = await supabase
            .from('bet_results')
            .delete()
            .eq('id', resultId);

        if (error) throw error;

        showToast('ရလဒ်ကို ဖျက်ပြီးပါပြီ', 'success');
        loadResults();

    } catch (error) {
        console.error('Error deleting result:', error);
        showToast('ရလဒ်ဖျက်ရာတွင် အမှားရှိနေပါသည်', 'error');
    }
};

// Helper function to get bet status class
function getBetStatusClass(status) {
    switch (status) {
        case 'pending':
            return 'bg-warning';
        case 'won':
            return 'bg-success';
        case 'lost':
            return 'bg-danger';
        case 'cancelled':
            return 'bg-secondary';
        default:
            return 'bg-info';
    }
}

// Helper function to get bet status text
function getBetStatusText(status) {
    switch (status) {
        case 'pending':
            return 'စောင့်ဆိုင်းဆဲ';
        case 'won':
            return 'အနိုင်ရ';
        case 'lost':
            return 'ရှုံး';
        case 'cancelled':
            return 'ပယ်ဖျက်';
        default:
            return status;
    }
}

// Handle refresh button clicks
Object.entries(refreshButtons).forEach(([key, button]) => {
    button.addEventListener('click', () => {
        switch (key) {
            case 'users':
                loadUsers();
                break;
            case 'bets':
                loadBets();
                break;
            case 'results':
                loadResults();
                break;
        }
    });
});

// Handle logout
logoutBtn.addEventListener('click', async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        // Clear local storage
        localStorage.removeItem('mm-2d3d-auth');
        localStorage.removeItem('userProfile');
        
        // Redirect to login
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('ထွက်ရာတွင် အမှားရှိနေပါသည်', 'error');
    }
});

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDashboard);
