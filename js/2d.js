// 2d.js - 2D lottery game logic
import { supabase } from './config.js';
import { showToast, formatDateTime, formatMoney } from './utils.js';
import { checkAuth } from './auth.js';
import { 
    subscribeToUpdates,
    placeBet,
    getActiveSessions,
    getUserBets,
    cancelBet,
    formatBetType,
    getStatusBadge,
    calculatePotentialWin,
    PAYOUT_RATES 
} from './betting.js';

let currentUser = null;
let userProfile = null;
let selectedBets = [];
let currentSession = null;
let activeSessions = [];
let unsubscribeFromUpdates = null;

// Initialize the page
async function initializePage() {
    try {
        // Check auth first
        const { authenticated, user, profile, error } = await checkAuth();
        
        if (!authenticated || error) {
            window.location.href = 'index.html';
            return;
        }

        currentUser = user;
        userProfile = profile;
        
        // Update balance display
        updateBalanceDisplay();
        
        // Load active sessions
        await loadActiveSessions();
        
        // Load betting history
        await loadBettingHistory();
        
        // Setup real-time updates
        await setupRealtimeUpdates();
        
        // Setup event listeners
        setupEventListeners();
        
        // Update displays
        updateSessionDisplay();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('စနစ်တွင် ပြဿနာရှိနေပါသည်။', 'error');
    }
}

async function loadActiveSessions() {
    try {
        activeSessions = await getActiveSessions('2D');
        if (activeSessions.length > 0) {
            currentSession = activeSessions[0];
        }
        updateSessionDisplay();
    } catch (error) {
        console.error('Error loading sessions:', error);
        showToast('လောင်းကစားချိန်များကို ရယူ၍မရပါ။', 'error');
    }
}

function updateSessionDisplay() {
    const sessionEl = document.getElementById('currentSession');
    const timeEl = document.getElementById('sessionTime');
    const closingEl = document.getElementById('closingTime');
    
    if (!sessionEl || !timeEl || !closingEl) {
        console.error('Session display elements not found');
        return;
    }
    
    if (currentSession) {
        sessionEl.textContent = `2D - ${formatDateTime(currentSession.session_time)}`;
        timeEl.textContent = formatDateTime(currentSession.session_time);
        closingEl.textContent = formatDateTime(currentSession.closing_time);
        
        // Check if betting is closed
        const now = new Date();
        const closingTime = new Date(currentSession.closing_time);
        if (now > closingTime) {
            showToast('လောင်းကစားချိန် ကုန်ဆုံးသွားပါပြီ။', 'warning');
            document.getElementById('betForm')?.classList.add('disabled');
        } else {
            document.getElementById('betForm')?.classList.remove('disabled');
        }
    } else {
        sessionEl.textContent = 'လောင်းကစားချိန် မရှိသေးပါ';
        timeEl.textContent = '-';
        closingEl.textContent = '-';
        document.getElementById('betForm')?.classList.add('disabled');
    }
}

function setupEventListeners() {
    // Quick amount buttons
    document.querySelectorAll('[data-amount]').forEach(button => {
        button.addEventListener('click', (e) => {
            document.getElementById('betAmount').value = e.target.dataset.amount;
            updatePotentialWin();
        });
    });

    // Add bet form handler
    const betForm = document.getElementById('betForm');
    if (betForm) {
        betForm.addEventListener('submit', handleAddBet);
    }

    // Random number button handler
    const randomBtn = document.getElementById('randomNumberBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', generateRandomNumber);
    }

    // Handle logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Submit all bets button handler
    const submitBtn = document.getElementById('submitBets');
    if (submitBtn) {
        submitBtn.addEventListener('click', handleSubmitAllBets);
    }

    // Amount input handler
    const amountInput = document.getElementById('betAmount');
    if (amountInput) {
        amountInput.addEventListener('input', updatePotentialWin);
    }
}

function setupRealtimeUpdates() {
    const unsubscribe = subscribeToUpdates({
        onBetUpdate: (payload) => {
            const { eventType, new: newRecord, old: oldRecord } = payload;
            
            // Update betting history
            loadBettingHistory();
            
            // Show notifications
            if (eventType === 'INSERT') {
                showToast('ထီထိုးခြင်း အောင်မြင်ပါသည်။', 'success');
            } else if (eventType === 'UPDATE' && newRecord.status === 'won') {
                showToast(`ဂုဏ်ယူပါသည်! သင်နိုင်ပါသည်။ ${formatMoney(newRecord.payout_amount)} ကျပ်`, 'success');
            }
        },
        onSessionUpdate: (payload) => {
            const { eventType, new: newRecord } = payload;
            
            // Reload active sessions
            loadActiveSessions();
            
            // Show notifications for session status changes
            if (eventType === 'UPDATE' && newRecord.status === 'completed') {
                showToast('ထီပေါက်ဂဏန်းများ ထွက်ရှိပြီးဖြစ်ပါသည်။', 'info');
            }
        },
        onResultUpdate: (payload) => {
            const { new: newRecord } = payload;
            
            // Update results display
            const resultsDiv = document.getElementById('todayResults');
            if (resultsDiv) {
                const resultTime = formatDateTime(newRecord.created_at);
                const resultHtml = `
                    <div class="alert alert-success">
                        <strong>${resultTime}</strong>: ${newRecord.winning_number}
                    </div>
                `;
                resultsDiv.insertAdjacentHTML('afterbegin', resultHtml);
            }
            
            showToast(`ထီပေါက်ဂဏန်း: ${newRecord.winning_number}`, 'info');
        },
        onBalanceUpdate: (payload) => {
            const { new: newRecord } = payload;
            userProfile.balance = newRecord.balance;
            updateBalanceDisplay();
        }
    });
    
    // Clean up on page unload
    window.addEventListener('unload', () => {
        unsubscribe();
    });
}

function updateBalanceDisplay() {
    const balanceEl = document.getElementById('userBalance');
    if (balanceEl && userProfile) {
        balanceEl.textContent = formatMoney(userProfile.balance);
    }
}

function generateRandomNumber() {
    const number = Math.floor(Math.random() * 100).toString().padStart(2, '0');
    document.getElementById('betNumber').value = number;
    updatePotentialWin();
}

function updatePotentialWin() {
    const amount = parseInt(document.getElementById('betAmount').value) || 0;
    const winAmount = calculatePotentialWin('2D', amount);
    document.getElementById('potentialWin').textContent = formatMoney(winAmount);
}

function addBet(number, amount) {
    // Validate number format
    if (!/^\d{2}$/.test(number)) {
        showToast('ဂဏန်းနှစ်လုံး ထည့်သွင်းပါ။', 'error');
        return;
    }

    // Add to selected bets
    selectedBets.push({ number, amount });
    updateSelectedBetsDisplay();
    
    // Clear form
    document.getElementById('betNumber').value = '';
    document.getElementById('betAmount').value = '';
    updatePotentialWin();
}

function updateSelectedBetsDisplay() {
    const container = document.getElementById('selectedBets');
    const totalEl = document.getElementById('totalAmount');
    let total = 0;

    container.innerHTML = selectedBets.map((bet, index) => {
        total += bet.amount;
        return `
            <div class="selected-bet">
                <span class="number">${bet.number}</span>
                <span class="amount">${formatMoney(bet.amount)}</span>
                <button type="button" class="btn-close" onclick="removeBet(${index})"></button>
            </div>
        `;
    }).join('');

    totalEl.textContent = formatMoney(total);
    
    // Show/hide submit button
    document.getElementById('submitBets').style.display = selectedBets.length ? 'block' : 'none';
}

function removeBet(index) {
    selectedBets.splice(index, 1);
    updateSelectedBetsDisplay();
}

async function handleAddBet(e) {
    e.preventDefault();
    
    if (!currentSession) {
        showToast('လောင်းကစားချိန် မရှိသေးပါ။', 'error');
        return;
    }

    const number = document.getElementById('betNumber').value;
    const amount = parseInt(document.getElementById('betAmount').value);

    if (!amount || amount <= 0) {
        showToast('ငွေပမာဏ ထည့်သွင်းပါ။', 'error');
        return;
    }

    addBet(number, amount);
}

async function handleSubmitAllBets() {
    if (!currentSession) {
        showToast('လောင်းကစားချိန် မရှိသေးပါ။', 'error');
        return;
    }

    try {
        for (const bet of selectedBets) {
            await placeBet(currentSession.id, bet.number, bet.amount);
        }

        showToast('လောင်းကစားမှု အောင်မြင်ပါသည်။', 'success');
        selectedBets = [];
        updateSelectedBetsDisplay();
        await loadBettingHistory();
    } catch (error) {
        console.error('Error placing bets:', error);
        showToast(error.message || 'လောင်းကစားမှု မအောင်မြင်ပါ။', 'error');
    }
}

async function loadBettingHistory() {
    try {
        const bets = await getUserBets(null, new Date());
        const container = document.getElementById('bettingHistory');
        
        container.innerHTML = bets.map(bet => `
            <div class="bet-history-item">
                <div class="bet-info">
                    <span class="time">${formatDateTime(bet.created_at)}</span>
                    <span class="number">${bet.numbers}</span>
                    <span class="amount">${formatMoney(bet.amount)}</span>
                    ${getStatusBadge(bet.status)}
                </div>
                ${bet.status === 'pending' ? `
                    <button type="button" class="btn btn-sm btn-outline-danger" 
                            onclick="handleCancelBet('${bet.bet_id}')">
                        ပယ်ဖျက်မည်
                    </button>
                ` : ''}
            </div>
        `).join('') || '<p class="text-muted">လောင်းကစားမှတ်တမ်း မရှိသေးပါ။</p>';
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('လောင်းကစားမှတ်တမ်းများကို ရယူ၍မရပါ။', 'error');
    }
}

async function handleCancelBet(betId) {
    try {
        await cancelBet(betId);
        showToast('လောင်းကစားမှု ပယ်ဖျက်ပြီးပါပြီ။', 'success');
        await loadBettingHistory();
    } catch (error) {
        console.error('Error cancelling bet:', error);
        showToast(error.message || 'လောင်းကစားမှု ပယ်ဖျက်၍မရပါ။', 'error');
    }
}

async function handleLogout() {
    try {
        await supabase.auth.signOut();
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('ထွက်ခွာ၍မရပါ။', 'error');
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
