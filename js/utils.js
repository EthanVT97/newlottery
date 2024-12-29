// utils.js - Common utility functions

/**
 * Show a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type of toast (success, error, warning)
 */
export function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-white border-0 ${getToastClass(type)}`;
    toastEl.setAttribute('role', 'alert');
    toastEl.setAttribute('aria-live', 'assertive');
    toastEl.setAttribute('aria-atomic', 'true');
    
    // Create toast content
    const toastContent = document.createElement('div');
    toastContent.className = 'd-flex';
    
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = message;
    
    const closeButton = document.createElement('button');
    closeButton.type = 'button';
    closeButton.className = 'btn-close btn-close-white me-2 m-auto';
    closeButton.setAttribute('data-bs-dismiss', 'toast');
    closeButton.setAttribute('aria-label', 'Close');
    
    // Assemble toast
    toastContent.appendChild(toastBody);
    toastContent.appendChild(closeButton);
    toastEl.appendChild(toastContent);
    toastContainer.appendChild(toastEl);
    
    // Initialize and show toast
    const toast = new bootstrap.Toast(toastEl, {
        animation: true,
        autohide: true,
        delay: 5000
    });
    toast.show();
    
    // Remove toast element after it's hidden
    toastEl.addEventListener('hidden.bs.toast', () => {
        toastEl.remove();
    });
}

/**
 * Get the appropriate Bootstrap class for toast type
 * @param {string} type - Type of toast
 * @returns {string} Bootstrap background class
 */
export function getToastClass(type) {
    switch (type.toLowerCase()) {
        case 'success':
            return 'bg-success';
        case 'error':
            return 'bg-danger';
        case 'warning':
            return 'bg-warning';
        default:
            return 'bg-info';
    }
}

/**
 * Format date and time
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date and time
 */
export function formatDateTime(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('my-MM', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount with currency
 */
export function formatCurrency(amount) {
    return new Intl.NumberFormat('my-MM', {
        style: 'currency',
        currency: 'MMK',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Format date
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('my-MM', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(date);
}

/**
 * Format time
 * @param {string} timeString - Time string (HH:mm)
 * @returns {string} Formatted time
 */
export function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    
    return new Intl.DateTimeFormat('my-MM', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    }).format(date);
}

/**
 * Format phone number
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
    // Remove all non-numeric characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading '95' or '959' if present
    if (cleaned.startsWith('95')) {
        cleaned = cleaned.substring(2);
    }
    if (cleaned.startsWith('959')) {
        cleaned = cleaned.substring(3);
    }
    
    // Remove leading '0' if present
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }
    
    // Ensure the number starts with '9'
    if (!cleaned.startsWith('9')) {
        cleaned = '9' + cleaned;
    }
    
    // Limit to 10 digits
    cleaned = cleaned.substring(0, 10);
    
    return cleaned;
}

/**
 * Validate email
 * @param {string} email - Email to validate
 * @returns {boolean} Is valid email
 */
export function validateEmail(email) {
    const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return re.test(String(email).toLowerCase());
}

/**
 * Validate password
 * @param {string} password - Password to validate
 * @returns {Object} Validation result
 */
export function validatePassword(password) {
    const minLength = 6;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);

    if (password.length < minLength) {
        return {
            valid: false,
            message: 'စကားဝှက် အနည်းဆုံး စာလုံး ၆လုံး ထည့်သွင်းပါ'
        };
    }

    if (!hasNumber || !hasLetter) {
        return {
            valid: false,
            message: 'စကားဝှက်တွင် စာလုံးနှင့် ဂဏန်းများ ပါဝင်ရပါမည်'
        };
    }

    return {
        valid: true,
        message: ''
    };
}

/**
 * Get time until next draw
 * @param {string} drawTime - Draw time (HH:mm)
 * @returns {Object} Time remaining
 */
export function getTimeUntilDraw(drawTime) {
    const [hours, minutes] = drawTime.split(':');
    const now = new Date();
    const draw = new Date();
    draw.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (draw <= now) {
        draw.setDate(draw.getDate() + 1);
    }
    
    const diff = draw - now;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    
    return {
        hours: h,
        minutes: m,
        total: diff
    };
}

/**
 * Format bet number
 * @param {string|number} number - Number to format
 * @param {number} length - Required length
 * @returns {string} Formatted number
 */
export function formatBetNumber(number, length) {
    return number.toString().padStart(length, '0');
}

/**
 * Calculate win amount
 * @param {number} amount - Bet amount
 * @param {number} multiplier - Win multiplier
 * @returns {number} Win amount
 */
export function calculateWinAmount(amount, multiplier) {
    return Math.floor(amount * multiplier);
}

/**
 * Copy to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Success status
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy:', err);
        return false;
    }
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export function throttle(func, limit = 300) {
    let inThrottle;
    return function executedFunction(...args) {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}
