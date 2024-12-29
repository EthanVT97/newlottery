// auth-check.js - Common authentication check module
import { supabase } from './config.js';
import { showToast } from './utils.js';

export async function checkAuthAndRedirect() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
        showToast('ကျေးဇူးပြု၍ အကောင့်ဝင်ရောက်ပါ။', 'warning');
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 1500);
        return false;
    }
    return true;
}
