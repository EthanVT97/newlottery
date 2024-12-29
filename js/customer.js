// customer.js - Customer panel functionality
import { supabase } from './config.js';
import { showToast, formatDateTime, formatCurrency } from './utils.js';

let currentUser = null;
let userProfile = null;

// Initialize dashboard
async function initialize() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
            
        if (profileError) {
            showToast('သင်၏ပရိုဖိုင်ကို ရယူ၍မရပါ။', 'error');
            return;
        }

        userProfile = profile;
        
        // Update display
        updateUserInfo();
        
        // Load data
        await Promise.all([
            loadBalance(),
            loadBettingHistory(),
            loadLotteryResults()
        ]);
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('စနစ်တွင် ပြဿနာရှိနေပါသည်။', 'error');
    }
}

async function loadBalance() {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', currentUser.id)
            .single();
            
        if (error) throw error;
        
        userProfile.balance = profile.balance;
        updateUserInfo();
        
    } catch (error) {
        console.error('Error loading balance:', error);
        showToast('လက်ကျန်ငွေကို ရယူ၍မရပါ။', 'error');
    }
}

async function loadBettingHistory() {
    try {
        const { data: bets, error } = await supabase
            .from('bets')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false })
            .limit(10);
            
        if (error) throw error;
        
        const historyContainer = document.getElementById('bettingHistory');
        if (!historyContainer) return;
        
        historyContainer.innerHTML = '';
        
        bets.forEach(bet => {
            const betElement = document.createElement('div');
            betElement.className = 'list-group-item';
            betElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <span class="badge bg-primary me-2">${bet.number}</span>
                        <span class="text-muted">${bet.type === '2D_MORNING' ? 'မနက်ပိုင်း' : 'ညနေပိုင်း'}</span>
                    </div>
                    <div>
                        <span>${formatCurrency(bet.amount)}</span>
                    </div>
                </div>
                <small class="text-muted">${formatDateTime(bet.created_at)}</small>
            `;
            historyContainer.appendChild(betElement);
        });
    } catch (error) {
        console.error('Error loading betting history:', error);
        showToast('လောင်းကစားမှတ်တမ်းများကို ရယူ၍မရပါ။', 'error');
    }
}

async function loadLotteryResults() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const { data: results, error } = await supabase
            .from('results')
            .select('*')
            .in('type', ['2D_MORNING', '2D_EVENING'])
            .gte('created_at', today)
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        
        const resultsContainer = document.getElementById('lotteryResults');
        if (!resultsContainer) return;
        
        resultsContainer.innerHTML = '';
        
        results.forEach(result => {
            const resultElement = document.createElement('div');
            resultElement.className = 'list-group-item';
            resultElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <span class="badge bg-success fs-5">${result.number}</span>
                    <span>${result.type === '2D_MORNING' ? 'မနက်ပိုင်း' : 'ညနေပိုင်း'}</span>
                </div>
                <small class="text-muted">${formatDateTime(result.created_at)}</small>
            `;
            resultsContainer.appendChild(resultElement);
        });
    } catch (error) {
        console.error('Error loading lottery results:', error);
        showToast('ထွက်ဂဏန်းများကို ရယူ၍မရပါ။', 'error');
    }
}

function updateUserInfo() {
    // Update username
    const usernameEl = document.getElementById('userName');
    if (usernameEl) {
        usernameEl.textContent = userProfile.name || currentUser.email;
    }
    
    // Update balance
    const balanceEl = document.getElementById('userBalance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(userProfile.balance);
    }
}

function setupEventListeners() {
    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Error signing out:', error);
        showToast('Logout မအောင်မြင်ပါ။', 'error');
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initialize);
