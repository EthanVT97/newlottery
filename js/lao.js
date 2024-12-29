// lao.js - Lao lottery game logic
import { supabase } from './config.js';
import { showToast, formatDateTime, formatCurrency } from './utils.js';
import { placeBet, getBettingHistory, getLatestResults, isBettingAllowed, formatBetType, getStatusBadge, PAYOUT_RATES, calculateWinAmount } from './betting.js';

let currentUser = null;
let userProfile = null;
let selectedBets = [];

// Initialize the page
async function initializePage() {
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getSession();
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }
    currentUser = user;

    // Get user profile
    const { data: profile } = await supabase.from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
    
    if (profile) {
        userProfile = profile;
        updateBalance(profile.balance);
    }

    // Set up real-time subscription for balance updates
    const balanceSubscription = supabase
        .channel('balance_changes')
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
        }, payload => {
            updateBalance(payload.new.balance);
        })
        .subscribe();

    // Load latest results
    loadLatestResults();

    // Load betting history
    loadBettingHistory();

    // Set up event listeners
    setupEventListeners();
}

// Load latest Lao lottery results
async function loadLatestResults() {
    const { data: results, error } = await supabase
        .from('lottery_results')
        .select('*')
        .eq('type', 'LAO')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

    if (error) {
        showToast('ပေါက်ဂဏန်းများ ရယူ၍မရပါ။', 'error');
        return;
    }

    if (results) {
        document.getElementById('laoFirst').textContent = results.number || '------';
        document.getElementById('laoLastThree').textContent = results.number ? results.number.slice(-3) : '---';
        document.getElementById('laoLastTwo').textContent = results.number ? results.number.slice(-2) : '--';
    }
}

// Load betting history
async function loadBettingHistory() {
    const { data: bets, error } = await getBettingHistory('LAO');
    
    if (error) {
        showToast('လောင်းကစားမှတ်တမ်း ရယူ၍မရပါ။', 'error');
        return;
    }

    const historyContainer = document.getElementById('bettingHistory');
    historyContainer.innerHTML = '';

    if (bets && bets.length > 0) {
        bets.forEach(bet => {
            const item = document.createElement('div');
            item.className = 'list-group-item';
            item.innerHTML = `
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-0">${bet.number}</h6>
                        <small class="text-muted">${formatDateTime(bet.created_at)}</small>
                    </div>
                    <div class="text-end">
                        <div>${formatCurrency(bet.amount)}</div>
                        <span class="badge ${getStatusBadge(bet.status)}">${bet.status}</span>
                    </div>
                </div>
            `;
            historyContainer.appendChild(item);
        });
    } else {
        historyContainer.innerHTML = '<div class="text-center p-3 text-muted">လောင်းကစားမှတ်တမ်း မရှိသေးပါ။</div>';
    }
}

// Set up event listeners
function setupEventListeners() {
    // Bet form submission
    document.getElementById('betForm').addEventListener('submit', handleBetSubmission);

    // Quick amount buttons
    document.querySelectorAll('[data-amount]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('betAmount').value = button.dataset.amount;
            updateWinAmount();
        });
    });

    // Random number generator
    document.getElementById('randomNumberBtn').addEventListener('click', generateRandomNumber);

    // Bet method change
    document.getElementById('betMethod').addEventListener('change', handleBetMethodChange);

    // Amount input change
    document.getElementById('betAmount').addEventListener('input', updateWinAmount);

    // Submit all bets button
    document.getElementById('submitBets').addEventListener('click', submitAllBets);

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Handle bet method change
function handleBetMethodChange() {
    const method = document.getElementById('betMethod').value;
    const numberInput = document.getElementById('betNumber');
    const numberHelp = document.getElementById('numberHelp');

    switch (method) {
        case 'FIRST':
            numberInput.maxLength = 6;
            numberHelp.textContent = 'ဂဏန်းခြောက်လုံး ထည့်သွင်းပါ (000000-999999)';
            break;
        case 'LAST_THREE':
            numberInput.maxLength = 3;
            numberHelp.textContent = 'ဂဏန်းသုံးလုံး ထည့်သွင်းပါ (000-999)';
            break;
        case 'LAST_TWO':
            numberInput.maxLength = 2;
            numberHelp.textContent = 'ဂဏန်းနှစ်လုံး ထည့်သွင်းပါ (00-99)';
            break;
    }

    numberInput.value = '';
    updateWinAmount();
}

// Generate random number based on selected method
function generateRandomNumber() {
    const method = document.getElementById('betMethod').value;
    let randomNum;

    switch (method) {
        case 'FIRST':
            randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
            break;
        case 'LAST_THREE':
            randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            break;
        case 'LAST_TWO':
            randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
            break;
    }

    document.getElementById('betNumber').value = randomNum;
}

// Handle bet submission
async function handleBetSubmission(event) {
    event.preventDefault();

    const method = document.getElementById('betMethod').value;
    const number = document.getElementById('betNumber').value;
    const amount = parseInt(document.getElementById('betAmount').value);

    // Validate number format
    let isValid = false;
    switch (method) {
        case 'FIRST':
            isValid = /^\d{6}$/.test(number);
            break;
        case 'LAST_THREE':
            isValid = /^\d{3}$/.test(number);
            break;
        case 'LAST_TWO':
            isValid = /^\d{2}$/.test(number);
            break;
    }

    if (!isValid) {
        showToast('ဂဏန်းပုံစံ မှားယွင်းနေပါသည်။', 'error');
        return;
    }

    // Add to selected bets
    const winAmount = calculateWinAmount('LAO', amount, method);
    selectedBets.push({
        type: 'LAO',
        method,
        number,
        amount,
        win_amount: winAmount
    });

    // Update display
    updateSelectedBets();
    
    // Reset form
    event.target.reset();
    updateWinAmount();
}

// Update win amount display
function updateWinAmount() {
    const amount = parseInt(document.getElementById('betAmount').value) || 0;
    const method = document.getElementById('betMethod').value;
    const winAmount = calculateWinAmount('LAO', amount, method);
    
    document.getElementById('winAmount').textContent = formatCurrency(winAmount);
}

// Update selected bets display
function updateSelectedBets() {
    const tbody = document.getElementById('selectedNumbers');
    const submitBtn = document.getElementById('submitBets');
    tbody.innerHTML = '';

    let totalAmount = 0;
    let totalWinAmount = 0;

    selectedBets.forEach((bet, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${bet.number}</td>
            <td>${formatBetType(bet.method)}</td>
            <td>${formatCurrency(bet.amount)}</td>
            <td>${formatCurrency(bet.win_amount)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeBet(${index})">
                    <i class="bi bi-x"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);

        totalAmount += bet.amount;
        totalWinAmount += bet.win_amount;
    });

    document.getElementById('totalAmount').textContent = formatCurrency(totalAmount);
    document.getElementById('totalWinAmount').textContent = formatCurrency(totalWinAmount);
    submitBtn.disabled = selectedBets.length === 0;
}

// Remove a bet from the selected bets
window.removeBet = function(index) {
    selectedBets.splice(index, 1);
    updateSelectedBets();
};

// Clear all selected bets
window.clearAllBets = function() {
    selectedBets = [];
    updateSelectedBets();
};

// Submit all selected bets
async function submitAllBets() {
    if (selectedBets.length === 0) {
        showToast('ထိုးမည့်ဂဏန်း ရွေးချယ်ပါ။', 'warning');
        return;
    }

    const totalAmount = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
    if (totalAmount > userProfile.balance) {
        showToast('လက်ကျန်ငွေ မလုံလောက်ပါ။', 'error');
        return;
    }

    // Check if betting is allowed
    const canBet = await isBettingAllowed('LAO');
    if (!canBet) {
        showToast('လောင်းကစားချိန် ကျော်လွန်သွားပါပြီ။', 'error');
        return;
    }

    // Place all bets
    try {
        for (const bet of selectedBets) {
            await placeBet('LAO', bet.number, bet.amount, bet.method);
        }

        showToast('ထိုးပြီးပါပြီ။', 'success');
        selectedBets = [];
        updateSelectedBets();
        loadBettingHistory();
    } catch (error) {
        showToast('ထိုး၍မရပါ။ နောက်မှ ထပ်ကြိုးစားပါ။', 'error');
    }
}

// Update balance display
function updateBalance(balance) {
    document.getElementById('userBalance').textContent = formatCurrency(balance);
}

// Handle logout
async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
