// main.js - Homepage functionality
import { supabase } from './config.js';
import { showToast, formatDateTime, formatCurrency } from './utils.js';
import { placeBet, getLatestResults, isBettingAllowed } from './betting.js';

let currentUser = null;
let userProfile = null;

// Initialize the page
async function initializePage() {
    // Check authentication
    const { data: { user }, error } = await supabase.auth.getSession();
    if (error || !user) {
        window.location.href = 'login.html';
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

    // Load latest results and start countdown
    loadLatestResults();
    startCountdown();

    // Set up event listeners
    setupEventListeners();

    // Handle play button clicks
    handlePlayButtons();
}

// Load latest 2D results
async function loadLatestResults() {
    const { data: results, error } = await getLatestResults('2D');
    
    if (error) {
        showToast('ပေါက်ဂဏန်းများ ရယူ၍မရပါ။', 'error');
        return;
    }

    if (results && results.length > 0) {
        // Sort by created_at in descending order
        results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Get evening and morning results
        const eveningResult = results.find(r => r.session === 'EVENING');
        const morningResult = results.find(r => r.session === 'MORNING');

        if (eveningResult) {
            document.getElementById('2dEveningResult').textContent = eveningResult.number || '--';
            document.getElementById('2dEveningTime').textContent = formatDateTime(eveningResult.created_at);
        }

        if (morningResult) {
            document.getElementById('2dMorningResult').textContent = morningResult.number || '--';
            document.getElementById('2dMorningTime').textContent = formatDateTime(morningResult.created_at);
        }
    }
}

// Start countdown timer
function startCountdown() {
    function updateCountdown() {
        const now = new Date();
        let target = new Date(now);

        // Set target time based on current time
        if (now.getHours() < 12) {
            // Morning session: 12:00 PM
            target.setHours(12, 0, 0, 0);
        } else {
            // Evening session: 4:30 PM
            target.setHours(16, 30, 0, 0);
            
            // If it's past 4:30 PM, set target to next day morning
            if (now > target) {
                target = new Date(now);
                target.setDate(target.getDate() + 1);
                target.setHours(12, 0, 0, 0);
            }
        }

        const diff = target - now;
        
        if (diff > 0) {
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            document.getElementById('countdown').textContent = 
                `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        } else {
            document.getElementById('countdown').textContent = '00:00:00';
        }
    }

    // Update immediately and then every second
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// Set up event listeners
function setupEventListeners() {
    // Quick bet form
    document.getElementById('quickBetForm').addEventListener('submit', handleQuickBet);

    // Quick amount buttons
    document.querySelectorAll('[data-amount]').forEach(button => {
        button.addEventListener('click', () => {
            document.getElementById('betAmount').value = button.dataset.amount;
        });
    });

    // Random number generator
    document.getElementById('randomNumberBtn').addEventListener('click', () => {
        const randomNum = Math.floor(Math.random() * 100).toString().padStart(2, '0');
        document.getElementById('betNumber').value = randomNum;
    });

    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

// Handle quick bet submission
async function handleQuickBet(event) {
    event.preventDefault();

    const number = document.getElementById('betNumber').value;
    const amount = parseInt(document.getElementById('betAmount').value);

    // Validate number format
    if (!/^\d{2}$/.test(number)) {
        showToast('ဂဏန်းနှစ်လုံး ထည့်သွင်းပါ။', 'error');
        return;
    }

    // Validate amount
    if (amount < 100) {
        showToast('အနည်းဆုံး ၁၀၀ ကျပ် ထိုးရပါမည်။', 'error');
        return;
    }

    if (amount > userProfile.balance) {
        showToast('လက်ကျန်ငွေ မလုံလောက်ပါ။', 'error');
        return;
    }

    // Check if betting is allowed
    const canBet = await isBettingAllowed('2D');
    if (!canBet) {
        showToast('လောင်းကစားချိန် ကျော်လွန်သွားပါပြီ။', 'error');
        return;
    }

    // Place bet
    try {
        await placeBet('2D', number, amount, 'QUICK');
        showToast('ထိုးပြီးပါပြီ။', 'success');
        event.target.reset();
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

// Check authentication status
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    return session !== null;
}

// Handle play button clicks
function handlePlayButtons() {
    const playButtons = document.querySelectorAll('[data-game]');
    playButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            e.preventDefault();
            
            const isAuthenticated = await checkAuth();
            if (!isAuthenticated) {
                showToast('ကျေးဇူးပြု၍ အကောင့်ဝင်ရောက်ပါ။', 'warning');
                setTimeout(() => {
                    window.location.href = '/login.html';
                }, 1500);
                return;
            }
            
            const game = button.getAttribute('data-game');
            window.location.href = `/${game}.html`;
        });
    });
}

// Initialize the page
document.addEventListener('DOMContentLoaded', initializePage);
