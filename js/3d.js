// 3d.js - 3D lottery game logic
import { supabase } from './config.js';
import { showToast, formatDateTime, formatMoney } from './utils.js';
import { 
    placeBet,
    getActiveSessions,
    getUserBets,
    formatBetType,
    getStatusBadge,
    PAYOUT_RATES 
} from './database.js';

const DEFAULT_USER_ID = 1; // Default user ID for the single user
let selectedBets = [];
let currentSession = null;
let activeSessions = [];

// Initialize the page
async function initializePage() {
    try {
        // Update balance display
        await updateBalanceDisplay();
        
        // Load active sessions
        await loadActiveSessions();
        
        // Load betting history
        await loadBettingHistory();
        
        // Setup event listeners
        setupEventListeners();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('error', 'Error loading page data');
    }
}

// Load active betting sessions
async function loadActiveSessions() {
    try {
        activeSessions = await getActiveSessions();
        if (activeSessions && activeSessions.length > 0) {
            currentSession = activeSessions[0];
            updateSessionDisplay();
        }
    } catch (error) {
        console.error('Error loading sessions:', error);
        showToast('error', 'Error loading betting sessions');
    }
}

// Update the display of current session and results
function updateSessionDisplay() {
    const resultsContainer = document.getElementById('lotteryResults');
    if (!resultsContainer) return;

    resultsContainer.innerHTML = '';
    
    if (!activeSessions || activeSessions.length === 0) {
        resultsContainer.innerHTML = '<div class="text-center text-muted">No active sessions</div>';
        return;
    }

    activeSessions.forEach(session => {
        const resultItem = document.createElement('div');
        resultItem.className = 'list-group-item';
        
        const time = formatDateTime(session.created_at);
        const result = session.result || '--';
        const status = getStatusBadge(session.status);
        
        resultItem.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5 class="mb-1">${result}</h5>
                    <small class="text-muted">${time}</small>
                </div>
                <div>
                    ${status}
                </div>
            </div>
        `;
        
        resultsContainer.appendChild(resultItem);
    });
}

// Setup event listeners for the page
function setupEventListeners() {
    // Random number button
    const randomBtn = document.getElementById('randomNumberBtn');
    if (randomBtn) {
        randomBtn.addEventListener('click', () => {
            const betInput = document.getElementById('betNumber');
            if (betInput) {
                betInput.value = generateRandomNumber();
            }
        });
    }

    // Quick amount buttons
    const amountButtons = document.querySelectorAll('[data-amount]');
    amountButtons.forEach(button => {
        button.addEventListener('click', () => {
            const amountInput = document.getElementById('betAmount');
            if (amountInput) {
                amountInput.value = button.dataset.amount;
                updatePotentialWin();
            }
        });
    });

    // Bet amount input
    const betAmountInput = document.getElementById('betAmount');
    if (betAmountInput) {
        betAmountInput.addEventListener('input', updatePotentialWin);
    }

    // Bet form
    const betForm = document.getElementById('betForm');
    if (betForm) {
        betForm.addEventListener('submit', handleAddBet);
    }

    // Submit all bets button
    const submitBetsBtn = document.getElementById('submitBets');
    if (submitBetsBtn) {
        submitBetsBtn.addEventListener('click', handleSubmitAllBets);
    }

    // Clear all bets button
    const clearAllBtn = document.getElementById('clearAllBets');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            selectedBets = [];
            updateSelectedBetsDisplay();
        });
    }
}

// Update user's balance display
async function updateBalanceDisplay() {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', DEFAULT_USER_ID)
            .single();

        if (error) throw error;

        const balanceDisplay = document.getElementById('userBalance');
        if (balanceDisplay && user) {
            balanceDisplay.textContent = formatMoney(user.balance);
        }
    } catch (error) {
        console.error('Error updating balance:', error);
    }
}

// Generate a random 3-digit number
function generateRandomNumber() {
    return String(Math.floor(Math.random() * 1000)).padStart(3, '0');
}

// Update the potential win amount display
function updatePotentialWin() {
    const amount = document.getElementById('betAmount')?.value || 0;
    const winAmount = document.getElementById('winAmount');
    if (winAmount) {
        winAmount.textContent = formatMoney(amount * PAYOUT_RATES['3D']);
    }
}

// Add a bet to the selected bets list
function addBet(number, amount) {
    selectedBets.push({
        number,
        amount: parseFloat(amount),
        type: '3D',
        potentialWin: amount * PAYOUT_RATES['3D']
    });
    updateSelectedBetsDisplay();
}

// Update the display of selected bets
function updateSelectedBetsDisplay() {
    const container = document.getElementById('selectedNumbers');
    if (!container) return;

    container.innerHTML = selectedBets.map((bet, index) => `
        <tr>
            <td>${bet.number}</td>
            <td>${bet.type}</td>
            <td>${formatMoney(bet.amount)}</td>
            <td>${formatMoney(bet.potentialWin)}</td>
            <td>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="removeBet(${index})">
                    <i class="bi bi-x"></i>
                </button>
            </td>
        </tr>
    `).join('');

    // Update totals
    const totalAmount = selectedBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalWin = selectedBets.reduce((sum, bet) => sum + bet.potentialWin, 0);
    
    document.getElementById('totalAmount').textContent = formatMoney(totalAmount);
    document.getElementById('totalWinAmount').textContent = formatMoney(totalWin);
}

// Remove a bet from the selected bets list
function removeBet(index) {
    selectedBets.splice(index, 1);
    updateSelectedBetsDisplay();
}

// Handle adding a new bet
async function handleAddBet(e) {
    e.preventDefault();
    
    const number = document.getElementById('betNumber').value;
    const amount = document.getElementById('betAmount').value;

    if (!number || !amount) {
        showToast('error', 'Please enter both number and amount');
        return;
    }

    if (!/^\d{3}$/.test(number)) {
        showToast('error', 'Please enter a valid 3-digit number');
        return;
    }

    addBet(number, amount);
    
    // Reset form
    e.target.reset();
}

// Handle submitting all selected bets
async function handleSubmitAllBets() {
    if (selectedBets.length === 0) {
        showToast('error', 'No bets selected');
        return;
    }

    try {
        for (const bet of selectedBets) {
            await placeBet(DEFAULT_USER_ID, bet.number, bet.amount, bet.type);
        }

        showToast('success', 'Bets placed successfully');
        selectedBets = [];
        updateSelectedBetsDisplay();
        await updateBalanceDisplay();
        await loadBettingHistory();
    } catch (error) {
        console.error('Error placing bets:', error);
        showToast('error', 'Error placing bets');
    }
}

// Load user's betting history
async function loadBettingHistory() {
    try {
        const bets = await getUserBets(DEFAULT_USER_ID);
        const container = document.getElementById('bettingHistory');
        if (!container) return;

        if (!bets || bets.length === 0) {
            container.innerHTML = '<div class="text-center text-muted">No betting history</div>';
            return;
        }

        container.innerHTML = bets.map(bet => `
            <div class="list-group-item">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <h6 class="mb-1">${bet.number} (${formatBetType(bet.type)})</h6>
                        <small class="text-muted">${formatDateTime(bet.created_at)}</small>
                    </div>
                    <div class="text-end">
                        <div>${formatMoney(bet.amount)}</div>
                        ${getStatusBadge(bet.status)}
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading history:', error);
        showToast('error', 'Error loading betting history');
    }
}

// Initialize the page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
