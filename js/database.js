// database.js - Database operations
import { supabase } from './config.js';
import { APP_CONFIG, GAME_CONFIG } from './config.js';

/**
 * Database configuration
 */
export const DB_CONFIG = {
    tables: {
        users: 'users',
        results2D: 'results_2d',
        results3D: 'results_3d',
        bets: 'bets',
        transactions: 'transactions',
        sessions: 'sessions'
    }
};

// Payout rates for different bet types
export const PAYOUT_RATES = {
    '2D_R': 85,
    '2D_P': 80,
    '2D_B': 75,
    '3D_R': 500,
    '3D_P': 450,
    '3D_B': 400,
    'THAI_first2': 85,
    'THAI_last2': 85,
    'THAI_first3': 500,
    'THAI_last3': 500,
    'LAO_first2': 85,
    'LAO_last2': 85,
    'LAO_first3': 500,
    'LAO_last3': 500
};

/**
 * Initialize database and create default users
 */
export async function initDatabase() {
    try {
        console.log('Initializing database...');
        
        // Create default admin user
        const { data: adminData, error: adminError } = await supabase.auth.signUp({
            email: 'admin@gmail.com',
            password: '123456',
            options: {
                data: {
                    role: 'admin',
                    name: 'Admin User',
                }
            }
        });

        if (adminError) throw adminError;

        // Create default regular user
        const { data: userData, error: userError } = await supabase.auth.signUp({
            email: 'user@gmail.com',
            password: '123456',
            options: {
                data: {
                    role: 'user',
                    name: 'Regular User',
                }
            }
        });

        if (userError) throw userError;

        console.log('Database initialized successfully');
        return true;
    } catch (error) {
        console.error('Database initialization error:', error);
        return false;
    }
}

/**
 * Add item to store
 * @param {string} table - Table name
 * @param {Object} data - Data to add
 * @returns {Promise<Object>}
 */
export async function addItem(table, data) {
    const { data: result, error } = await supabase
        .from(table)
        .insert(data)
        .select()
        .single();
    
    if (error) throw error;
    return result;
}

/**
 * Get item by ID
 * @param {string} table - Table name
 * @param {number} id - Item ID
 * @returns {Promise<Object>}
 */
export async function getItem(table, id) {
    const { data, error } = await supabase
        .from(table)
        .select()
        .eq('id', id)
        .single();
    
    if (error) throw error;
    return data;
}

/**
 * Update item
 * @param {string} table - Table name
 * @param {number} id - Item ID
 * @param {Object} data - Updated data
 * @returns {Promise<Object>}
 */
export async function updateItem(table, id, data) {
    const { data: result, error } = await supabase
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single();
    
    if (error) throw error;
    return result;
}

/**
 * Delete item
 * @param {string} table - Table name
 * @param {number} id - Item ID
 * @returns {Promise<void>}
 */
export async function deleteItem(table, id) {
    const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', id);
    
    if (error) throw error;
}

/**
 * Get all items from table
 * @param {string} table - Table name
 * @returns {Promise<Array>}
 */
export async function getAllItems(table) {
    const { data, error } = await supabase
        .from(table)
        .select();
    
    if (error) throw error;
    return data;
}

/**
 * Get items with filter
 * @param {string} table - Table name
 * @param {Object} filter - Filter conditions
 * @returns {Promise<Array>}
 */
export async function getFilteredItems(table, filter) {
    let query = supabase.from(table).select();
    
    // Apply filters
    Object.entries(filter).forEach(([key, value]) => {
        query = query.eq(key, value);
    });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return data;
}

/**
 * Get active betting sessions
 */
export async function getActiveSessions() {
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('date', today)
        .order('created_at', { ascending: false });
        
    if (error) {
        console.error('Error getting sessions:', error);
        return [];
    }
    
    return data || [];
}

/**
 * Get user balance
 */
export async function getUserBalance() {
    const { data, error } = await supabase
        .from('users')
        .select('balance')
        .eq('id', APP_CONFIG.defaultUserId)
        .single();

    if (error) {
        console.error('Error getting balance:', error);
        return 0;
    }

    return data.balance;
}

/**
 * Update user balance
 */
export async function updateUserBalance(amount) {
    const { data, error } = await supabase
        .from('users')
        .update({ balance: amount })
        .eq('id', APP_CONFIG.defaultUserId)
        .select()
        .single();

    if (error) {
        console.error('Error updating balance:', error);
        return false;
    }

    return true;
}

/**
 * Place a bet
 */
export async function placeBet(userId, number, amount, type, method) {
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];
    
    // Get current balance
    const currentBalance = await getUserBalance();
    if (currentBalance < amount) {
        throw new Error('Insufficient balance');
    }
    
    // Start transaction
    const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
            user_id: userId,
            type: 'bet',
            amount: -amount,
            status: 'completed'
        });
    
    if (transactionError) throw transactionError;
    
    // Update balance
    const newBalance = currentBalance - amount;
    const balanceUpdated = await updateUserBalance(newBalance);
    if (!balanceUpdated) throw new Error('Failed to update balance');
    
    // Place bet
    const { data: bet, error: betError } = await supabase
        .from('bets')
        .insert({
            user_id: userId,
            type: type,
            number: number,
            amount: amount,
            bet_method: method,
            date: today,
            time: currentTime,
            status: 'pending'
        })
        .select()
        .single();
    
    if (betError) throw betError;
    
    return bet;
}

/**
 * Get user bets
 */
export async function getUserBets(userId, type = null) {
    let query = supabase
        .from('bets')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
    
    if (type) {
        query = query.eq('type', type);
    }
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error getting bets:', error);
        return [];
    }
    
    return data;
}

/**
 * Format bet type for display
 */
export function formatBetType(method) {
    const methodMap = {
        'R': 'Regular',
        'P': 'Power',
        'B': 'Break',
        'first2': 'First 2',
        'last2': 'Last 2',
        'first3': 'First 3',
        'last3': 'Last 3'
    };
    
    return methodMap[method] || method;
}

/**
 * Get status badge class
 */
export function getStatusBadge(status) {
    const badges = {
        'pending': 'badge bg-warning',
        'won': 'badge bg-success',
        'lost': 'badge bg-danger',
        'completed': 'badge bg-success',
        'failed': 'badge bg-danger'
    };
    
    const badgeClass = badges[status] || 'badge bg-secondary';
    return `<span class="${badgeClass}">${status}</span>`;
}

/**
 * Get latest results
 */
export async function getLatestResults(type) {
    const table = type === '2D' ? 'results_2d' : 'results_3d';
    const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error getting results:', error);
        return [];
    }

    return data;
}

/**
 * Get user transactions
 */
export async function getUserTransactions() {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', APP_CONFIG.defaultUserId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error getting transactions:', error);
        return [];
    }

    return data;
}
