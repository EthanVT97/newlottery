// admin-login.js - Handle admin authentication
import { supabase } from './config.js';
import { showToast } from './utils.js';

// Check if already logged in
document.addEventListener('DOMContentLoaded', async () => {
    const adminSession = localStorage.getItem('adminSession');
    if (adminSession) {
        // Verify session is still valid
        try {
            const { data: admin, error } = await supabase
                .from('admin_users')
                .select('id')
                .eq('id', JSON.parse(adminSession).id)
                .single();
                
            if (admin) {
                window.location.href = 'admin.html';
                return;
            }
        } catch (error) {
            console.error('Session verification error:', error);
        }
        
        // Clear invalid session
        localStorage.removeItem('adminSession');
    }
});

// Handle login form submission
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        // Get admin user
        const { data: admin, error } = await supabase
            .from('admin_users')
            .select('id, username, password_hash')
            .eq('username', username)
            .single();
            
        if (error) throw error;
        
        if (!admin) {
            showToast('error', 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်');
            return;
        }
        
        // Verify password (in production, use proper password hashing)
        if (admin.password_hash !== password) {
            showToast('error', 'အသုံးပြုသူအမည် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်');
            return;
        }
        
        // Store admin session
        localStorage.setItem('adminSession', JSON.stringify({
            id: admin.id,
            username: admin.username
        }));
        
        // Redirect to admin dashboard
        window.location.href = 'admin.html';
        
    } catch (error) {
        console.error('Login error:', error);
        showToast('error', 'အကောင့်ဝင်ရာတွင် အမှားရှိနေပါသည်');
    }
});
