// utils.js - Utility functions
import { GAME_CONFIG } from './config.js';

/**
 * Format currency amount
 */
export function formatCurrency(amount) {
    return amount.toLocaleString('my-MM', {
        style: 'currency',
        currency: 'MMK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

/**
 * Format date to Myanmar format
 */
export function formatDate(date) {
    return date.toLocaleDateString('my-MM', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Format time to Myanmar format
 */
export function formatTime(time) {
    return time.toLocaleTimeString('my-MM', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Show toast notification
 */
export function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    
    const container = document.createElement('div');
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.appendChild(toast);
    document.body.appendChild(container);
    
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    toast.addEventListener('hidden.bs.toast', () => {
        container.remove();
    });
}

/**
 * Get game configuration
 */
export function getGameConfig(type) {
    return GAME_CONFIG[type];
}

/**
 * Validate bet number format
 */
export function validateBetNumber(type, number) {
    const config = getGameConfig(type);
    if (!config) return false;
    
    const regex = new RegExp(`^\\d{${config.numberLength}}$`);
    return regex.test(number);
}

/**
 * Validate bet amount
 */
export function validateBetAmount(type, amount, method) {
    const config = getGameConfig(type);
    if (!config) return false;
    
    return amount >= config.minBet && amount <= config.maxBet;
}

/**
 * Calculate potential win amount
 */
export function calculateWinAmount(type, amount, method) {
    const config = getGameConfig(type);
    if (!config) return 0;
    
    const multiplier = config.betMethods[method]?.multiplier || 0;
    return amount * multiplier;
}
