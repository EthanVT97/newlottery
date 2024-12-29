// auth.js - Authentication functionality
import { showToast } from './utils.js';
import { supabase, getCurrentSession, getCurrentUser } from './config.js';

/**
 * User roles
 */
export const USER_ROLES = {
    ADMIN: 'admin',
    USER: 'user'
};

/**
 * Auth events
 */
export const AUTH_EVENTS = {
    LOGIN: 'auth:login',
    LOGOUT: 'auth:logout',
    PROFILE_UPDATE: 'auth:profile_update'
};

/**
 * Check if user is authenticated
 */
export async function checkAuth() {
    try {
        // First check if we have a session
        const session = await getCurrentSession();
        if (!session) {
            return { authenticated: false };
        }

        // Then get the current user
        const user = await getCurrentUser();
        if (!user) {
            return { authenticated: false };
        }

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profileError) {
            console.error('Profile error:', profileError);
            return { authenticated: false, error: profileError };
        }

        return {
            authenticated: true,
            user,
            profile,
            session
        };
    } catch (error) {
        console.error('Auth check error:', error);
        return { authenticated: false, error };
    }
}

/**
 * Handle user login
 */
export async function login(email, password) {
    try {
        showToast('အကောင့်ဝင်နေသည်...', 'info');
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) throw profileError;

        // Store profile
        localStorage.setItem('mm-2d3d-profile', JSON.stringify(profile));

        // Dispatch login event
        window.dispatchEvent(new CustomEvent(AUTH_EVENTS.LOGIN, { 
            detail: { user: data.user, profile } 
        }));

        showToast('အကောင့်ဝင်ရောက်မှု အောင်မြင်ပါသည်', 'success');

        // Redirect based on role
        window.location.href = profile.role === 'admin' ? 'admindashboard.html' : 'userdashboard.html';
        
        return true;
    } catch (error) {
        console.error('Login error:', error);
        showToast('အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ', 'error');
        return false;
    }
}

/**
 * Handle user logout
 */
export async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;

        // Clear local storage
        localStorage.removeItem('mm-2d3d-auth');
        localStorage.removeItem('mm-2d3d-profile');

        // Dispatch logout event
        window.dispatchEvent(new Event(AUTH_EVENTS.LOGOUT));

        showToast('အကောင့်ထွက်ခြင်း အောင်မြင်ပါသည်', 'success');
        window.location.href = 'index.html';
        
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        showToast('အကောင့်ထွက်ခြင်း မအောင်မြင်ပါ', 'error');
        return false;
    }
}

// Initialize auth state on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check authentication state
    const { authenticated, profile } = await checkAuth();
    
    // Get elements
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const registerForm = document.getElementById('registerForm');

    // Handle login form submission
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            await login(email, password);
        });
    }

    // Handle register form submission
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                showToast('လျှို့ဝှက်နံပါတ်များ မတူညီပါ', 'error');
                return;
            }

            try {
                // Sign up user
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name
                        }
                    }
                });

                if (error) throw error;

                // Create profile
                const { error: profileError } = await supabase
                    .from('profiles')
                    .insert([
                        {
                            id: data.user.id,
                            name,
                            email,
                            role: 'user',
                            balance: 0
                        }
                    ]);

                if (profileError) throw profileError;

                showToast('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်', 'success');
                
                // Auto login
                await login(email, password);

            } catch (error) {
                console.error('Registration error:', error);
                showToast('အကောင့်ဖွင့်ခြင်း မအောင်မြင်ပါ', 'error');
            }
        });
    }

    // Handle logout button click
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await logout();
        });
    }

    // Check if we need to redirect
    if (authenticated) {
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage === 'index.html' || currentPage === '') {
            window.location.href = profile.role === 'admin' ? 'admindashboard.html' : 'userdashboard.html';
        }
    } else {
        const protectedPages = ['2d.html', '3d.html', 'userdashboard.html', 'admindashboard.html'];
        const currentPage = window.location.pathname.split('/').pop();
        if (protectedPages.includes(currentPage)) {
            window.location.href = 'index.html';
        }
    }
});
