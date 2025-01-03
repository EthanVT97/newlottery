// Import required modules
import { supabase } from './config.js';
import { showToast } from './utils.js';
import { AUTH_EVENTS } from './auth.js';
import { getUserBalance } from './database.js';
import { APP_CONFIG } from './config.js';
import { formatMoney } from './utils.js';
import './deposit.js';

// DOM Elements
const authButtons = document.getElementById('authButtons');
const heroButtons = document.getElementById('heroButtons');
const gameButtons = document.querySelectorAll('.game-card button');
const userBalanceElement = document.getElementById('userBalance');
const depositForm = document.getElementById('depositForm');

// Update UI based on auth state
async function updateAuthUI() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;

        if (user) {
            // Get user profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            // Update auth buttons
            authButtons.innerHTML = `
                <span class="text-light me-3">
                    <i class="bi bi-person-circle me-1"></i>${profile?.name || 'User'}
                </span>
                <div class="dropdown">
                    <button class="btn btn-light dropdown-toggle" type="button" data-bs-toggle="dropdown">
                        <i class="bi bi-gear"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item" href="userdashboard.html">
                                <i class="bi bi-speedometer2 me-2"></i>Dashboard
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <button class="dropdown-item text-danger" id="logoutBtn">
                                <i class="bi bi-box-arrow-right me-2"></i>Logout
                            </button>
                        </li>
                    </ul>
                </div>
            `;

            // Update hero buttons
            heroButtons.innerHTML = `
                <a href="2d.html" class="btn btn-primary btn-lg">
                    <i class="bi bi-play-circle me-2"></i>Play Now
                </a>
                <a href="userdashboard.html" class="btn btn-outline-primary btn-lg">
                    <i class="bi bi-speedometer2 me-2"></i>Dashboard
                </a>
            `;

            // Enable game buttons
            gameButtons.forEach(button => {
                button.disabled = false;
                const gameCard = button.closest('.game-card');
                const game = gameCard.dataset.game;
                button.onclick = () => window.location.href = `${game}.html`;
            });

        } else {
            // Show login/register buttons
            authButtons.innerHTML = `
                <button class="btn btn-outline-light me-2" data-bs-toggle="modal" data-bs-target="#loginModal">
                    <i class="bi bi-box-arrow-in-right me-1"></i>Login
                </button>
                <button class="btn btn-light" data-bs-toggle="modal" data-bs-target="#registerModal">
                    <i class="bi bi-person-plus me-1"></i>Register
                </button>
            `;

            // Show login/register hero buttons
            heroButtons.innerHTML = `
                <button class="btn btn-primary btn-lg" data-bs-toggle="modal" data-bs-target="#loginModal">
                    <i class="bi bi-box-arrow-in-right me-2"></i>Login
                </button>
                <button class="btn btn-outline-primary btn-lg" data-bs-toggle="modal" data-bs-target="#registerModal">
                    <i class="bi bi-person-plus me-2"></i>Register
                </button>
            `;

            // Disable game buttons and show login modal on click
            gameButtons.forEach(button => {
                button.disabled = false;
                button.onclick = () => {
                    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
                    loginModal.show();
                };
            });
        }
    } catch (error) {
        console.error('Auth error:', error);
        showToast('Error checking authentication', 'error');
    }
}

// Update user balance display
async function updateBalanceDisplay() {
    try {
        const { data: user, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', APP_CONFIG.defaultUserId)
            .single();

        if (error) throw error;

        const balanceDisplay = document.getElementById('userBalance');
        if (balanceDisplay && user) {
            balanceDisplay.textContent = formatMoney(user.balance);
        }
    } catch (error) {
        console.error('Error updating balance:', error);
        showToast('error', 'Error loading balance');
    }
}

// Setup game card links
function setupGameCards() {
    const gameCards = document.querySelectorAll('.game-card');
    gameCards.forEach(card => {
        card.addEventListener('click', (e) => {
            e.preventDefault();
            const link = card.closest('a');
            if (link) {
                window.location.href = link.href;
            }
        });
    });
}

// Handle deposit form submission
depositForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const amount = form.querySelector('input[type="number"]').value;
    const method = form.querySelector('select').value;
    
    // TODO: Implement deposit logic
    alert(`ငွေဖြည့်ခြင်း အောင်မြင်ပါသည်။ ပမာဏ: ${amount} MMK, နည်းလမ်း: ${method}`);
    
    // Close modal
    bootstrap.Modal.getInstance(document.getElementById('depositModal')).hide();
});

// Initialize the page
async function initializePage() {
    try {
        // Update balance display
        await updateBalanceDisplay();
        
        // Setup game card links
        setupGameCards();
        
    } catch (error) {
        console.error('Error initializing page:', error);
        showToast('error', 'Error loading page data');
    }
}

// Listen for auth events
window.addEventListener(AUTH_EVENTS.LOGIN, updateAuthUI);
window.addEventListener(AUTH_EVENTS.LOGOUT, updateAuthUI);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
