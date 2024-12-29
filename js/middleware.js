// middleware.js - Authentication and route protection middleware
import { supabase } from './config.js';

/**
 * Check if user is authenticated
 * @returns {Promise<Object>} User session and profile
 */
export async function requireAuth() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
        window.location.href = '/login';
        return null;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return { session };
    }

    return { session, profile };
}

/**
 * Check if user is admin
 * @returns {Promise<boolean>}
 */
export async function requireAdmin() {
    const auth = await requireAuth();
    if (!auth) return false;

    if (auth.profile?.role !== 'admin') {
        window.location.href = '/customer';
        return false;
    }

    return true;
}

/**
 * Check if user is customer
 * @returns {Promise<boolean>}
 */
export async function requireCustomer() {
    const auth = await requireAuth();
    if (!auth) return false;

    if (auth.profile?.role !== 'customer') {
        window.location.href = '/admin';
        return false;
    }

    return true;
}

/**
 * Redirect if user is already authenticated
 * @returns {Promise<void>}
 */
export async function redirectIfAuthenticated() {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
        return;
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    // Redirect based on role
    window.location.href = profile.role === 'admin' ? '/admin' : '/customer';
}
