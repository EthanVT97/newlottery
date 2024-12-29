// Import required modules
import { supabase } from './config.js';
import { showToast } from './utils.js';

// DOM Elements
const newPasswordForm = document.getElementById('newPasswordForm');

// Handle new password form submission
newPasswordForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;

    // Validate passwords match
    if (newPassword !== confirmNewPassword) {
        showToast('စကားဝှက်များ မတူညီပါ', 'error');
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        showToast('စကားဝှက် အနည်းဆုံး ၆လုံး ထည့်သွင်းပါ', 'error');
        return;
    }

    try {
        // Show loading state
        const submitBtn = newPasswordForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>လုပ်ဆောင်နေသည်...';

        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        showToast('စကားဝှက်အသစ် သတ်မှတ်ပြီးပါပြီ', 'success');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);

    } catch (error) {
        console.error('Password update error:', error);
        showToast('စကားဝှက်အသစ် သတ်မှတ်၍မရပါ', 'error');
    } finally {
        // Reset button state
        const submitBtn = newPasswordForm.querySelector('button[type="submit"]');
        submitBtn.disabled = false;
        submitBtn.innerHTML = 'စကားဝှက်အသစ်သတ်မှတ်မည်';
    }
});
