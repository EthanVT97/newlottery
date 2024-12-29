// config.js - Application configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.1/+esm';

/**
 * Application settings
 */
export const APP_CONFIG = {
    name: 'Myanmar 2D3D',
    version: '1.0.3',
    locale: 'my-MM',
    currency: 'MMK',
    timezone: 'Asia/Yangon',
    siteUrl: 'https://mm2d3d.onrender.com'
};

/**
 * Supabase Configuration
 */
const SUPABASE_URL = 'https://fikjryqofcauqezmefqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2pyeXFvZmNhdXFlem1lZnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU0Njc4NjQsImV4cCI6MjA1MTA0Mzg2NH0.vFCkc7lzVaMZihd-lOb4ywbFHJO2kItAfRDyRaETAnc';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
        storageKey: 'mm-2d3d-auth'
    }
});

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
    console.log('Auth state changed:', event, session);
    
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Store session
        localStorage.setItem('mm-2d3d-auth', JSON.stringify(session));
    } else if (event === 'SIGNED_OUT') {
        // Clear session
        localStorage.removeItem('mm-2d3d-auth');
        localStorage.removeItem('mm-2d3d-profile');
    }
});

// Get current session
export async function getCurrentSession() {
    try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    } catch (error) {
        console.error('Error getting session:', error);
        return null;
    }
}

// Get current user
export async function getCurrentUser() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

// Export auth for convenience
export const auth = supabase.auth;

/**
 * Game settings
 */
export const GAME_CONFIG = {
    '2D': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'R': { name: 'ရိုးရိုး', multiplier: 85 },
            'P': { name: 'ပါဝါ', multiplier: 80 },
            'B': { name: 'ဘရိတ်', multiplier: 75 },
        },
        drawTimes: ['12:01', '16:30'],
        numberLength: 2
    },
    '3D': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'R': { name: 'ရိုးရိုး', multiplier: 500 },
            'P': { name: 'ပါဝါ', multiplier: 450 },
            'B': { name: 'ဘရိတ်', multiplier: 400 },
        },
        drawTimes: ['16:30'],
        numberLength: 3
    }
};
