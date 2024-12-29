// 3d.js - 3D lottery game logic
import { supabase } from './config.js';
import { showToast, formatDateTime, formatCurrency } from './utils.js';
import { placeBet, getBettingHistory, getLatestResults, isBettingAllowed, formatBetType, getStatusBadge, PAYOUT_RATES, calculateWinAmount } from './betting.js';

let currentUser = null;
let userProfile = null;
let selectedBets = [];

// Initialize the page
async function initializePage() {
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
        updateBalanceDisplay();
        
        // Load betting history
        await loadBettingHistory();
        
        // Load lottery results
        await loadLotteryResults();
        
        // Setup event listeners
        setupEventListeners();
        
        // Start real-time subscription for balance updates
        setupRealtimeSubscription();
        
    } catch (error) {
        console.error('Initialization error:', error);
        showToast('စနစ်တွင် ပြဿနာရှိနေပါသည်။', 'error');
    }
}

function setupEventListeners() {
    // Quick amount buttons
    document.querySelectorAll('[data-amount]').forEach(button => {
        button.addEventListener('click', (e) => {
            document.getElementById('betAmount').value = e.target.dataset.amount;
            updateWinAmount();
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
        amountInput.addEventListener('input', updateWinAmount);
    }
}

function setupRealtimeSubscription() {
    // Subscribe to profile changes for real-time balance updates
    const profileSubscription = supabase
        .channel('profile_changes')
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'profiles',
                filter: `id=eq.${currentUser.id}`
            },
            (payload) => {
                userProfile = payload.new;
                updateBalanceDisplay();
            }
        )
        .subscribe();

    // Subscribe to bet status changes
    const betSubscription = supabase
        .channel('bet_changes')
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'bets',
                filter: `user_id=eq.${currentUser.id}`
            },
            () => {
                loadBettingHistory();
            }
        )
        .subscribe();

    // Subscribe to new results
    const resultSubscription = supabase
        .channel('result_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'results'
            },
            () => {
                loadLotteryResults();
            }
        )
        .subscribe();
}

function updateBalanceDisplay() {
    const balanceEl = document.getElementById('userBalance');
    if (balanceEl) {
        balanceEl.textContent = formatCurrency(userProfile.balance);
    }
}

function generateRandomNumber() {
    const number = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    document.getElementById('betNumber').value = number;
    updateWinAmount();
}

function updateWinAmount() {
    const amount = parseInt(document.getElementById('betAmount').value) || 0;
    const winAmount = calculateWinAmount('3D', amount);
    
    const winAmountEl = document.getElementById('winAmount');
    if (winAmountEl) {
        winAmountEl.textContent = formatCurrency(winAmount);
    }
}

function addBet(number, amount) {
    // Validate number format
    if (!/^\d{3}$/.test(number)) {
        showToast('ဂဏန်းသုံးလုံး ထည့်သွင်းပါ။', 'error');
        return;
    }

    // Calculate win amount
    const winAmount = calculateWinAmount('3D', amount);

    selectedBets.push({
        number,
        amount,
        type: '3D',
        win_amount: winAmount,
        created_at: new Date().toISOString()
    });
}

function updateSelectedBetsDisplay() {
    const container = document.getElementById('selectedNumbers');
    if (!container) return;
    
    container.innerHTML = '';
    let totalAmount = 0;
    let totalWinAmount = 0;

    selectedBets.forEach((bet, index) => {
        totalAmount += bet.amount;
        totalWinAmount += bet.win_amount;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><span class="badge bg-primary">${bet.number}</span></td>
            <td>${formatCurrency(bet.amount)}</td>
            <td>${formatCurrency(bet.win_amount)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger remove-bet" data-index="${index}">
                    <i class="bi bi-x"></i>
                </button>
            </td>
        `;
        container.appendChild(row);

        // Add click handler for remove button
        const removeBtn = row.querySelector('.remove-bet');
        if (removeBtn) {
            removeBtn.addEventListener('click', () => {
                selectedBets.splice(index, 1);
                updateSelectedBetsDisplay();
            });
        }
    });

    // Update totals
    const totalAmountEl = document.getElementById('totalAmount');
    const totalWinAmountEl = document.getElementById('totalWinAmount');
    
    if (totalAmountEl) {
        totalAmountEl.textContent = formatCurrency(totalAmount);
    }
    
    if (totalWinAmountEl) {
        totalWinAmountEl.textContent = formatCurrency(totalWinAmount);
    }

    // Toggle submit button
    const submitBtn = document.getElementById('submitBets');
    if (submitBtn) {
        submitBtn.disabled = selectedBets.length === 0;
    }
}

async function handleAddBet(e) {
    e.preventDefault();
    
    const number = document.getElementById('betNumber').value;
    const amount = parseInt(document.getElementById('betAmount').value);
    
    if (!number || !amount) {
        showToast('ကျေးဇူးပြု၍ လိုအပ်သောအချက်အလက်များကို ဖြည့်ပါ။', 'error');
        return;
    }

    // Validate number format
    if (!/^\d{3}$/.test(number)) {
        showToast('ဂဏန်းသုံးလုံး ထည့်သွင်းပါ။', 'error');
        return;
    }

    // Check if betting is allowed
    const allowed = await isBettingAllowed('3D');
    if (!allowed) {
        showToast('ယခုအချိန်တွင် လောင်းကစားခွင့် မရှိသေးပါ။', 'error');
        return;
    }

    // Calculate total amount including new bet
    const totalAmount = selectedBets.reduce((sum, bet) => sum + bet.amount, 0) + amount;
    
    if (totalAmount > userProfile.balance) {
        showToast('သင့်လက်ကျန်ငွေ မလုံလောက်ပါ။', 'error');
        return;
    }
    
    // Add to selected bets
    addBet(number, amount);
    
    // Update display
    updateSelectedBetsDisplay();
    
    // Reset form
    e.target.reset();
    showToast('ထီဂဏန်းထည့်သွင်းပြီးပါပြီ။', 'success');
}

async function handleSubmitAllBets() {
    if (selectedBets.length === 0) {
        showToast('ထိုးမည့်ဂဏန်းများ ရွေးချယ်ပါ။', 'error');
        return;
    }

    try {
        // Submit each bet
        for (const bet of selectedBets) {
            await placeBet(bet.type, bet.number, bet.amount);
        }
        
        // Clear selected bets
        selectedBets = [];
        updateSelectedBetsDisplay();
        
        // Reload betting history
        await loadBettingHistory();
        
    } catch (error) {
        console.error('Error submitting bets:', error);
        showToast('လောင်းကစားမှု မအောင်မြင်ပါ။', 'error');
    }
}

async function loadBettingHistory() {
    try {
        const bets = await getBettingHistory('3D');
        
        const container = document.getElementById('bettingHistory');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (bets.length === 0) {
            container.innerHTML = `
                <div class="list-group-item text-center text-muted">
                    လောင်းကစားမှတ်တမ်း မရှိသေးပါ။
                </div>
            `;
            return;
        }
        
        bets.forEach(bet => {
            const betElement = document.createElement('div');
            betElement.className = 'list-group-item';
            betElement.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge bg-primary">${bet.number}</span>
                    ${getStatusBadge(bet.status)}
                </div>
                <div class="d-flex justify-content-between text-muted small">
                    <span>${formatCurrency(bet.amount)}</span>
                    <span>${bet.status === 'WIN' ? formatCurrency(bet.win_amount) + ' ရရှိ' : ''}</span>
                </div>
                <div class="d-flex justify-content-between text-muted small">
                    <span>${formatDateTime(bet.created_at)}</span>
                </div>
            `;
            container.appendChild(betElement);
        });
        
    } catch (error) {
        console.error('Error loading betting history:', error);
    }
}

async function loadLotteryResults() {
    try {
        const results = await getLatestResults('3D');
        
        const container = document.getElementById('daily3D');
        if (!container) return;
        
        if (results.length === 0) {
            container.textContent = '---';
            return;
        }
        
        const latestResult = results[0];
        container.textContent = latestResult.number;
        
    } catch (error) {
        console.error('Error loading results:', error);
    }
}

function clearAllBets() {
    selectedBets = [];
    updateSelectedBetsDisplay();
}

async function handleLogout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        showToast('ထွက်ခွာ၍မရပါ။', 'error');
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
