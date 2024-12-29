// database.js - Database operations module

/**
 * Database configuration
 */
export const DB_CONFIG = {
    name: '2d3d_db',
    version: 2, // Incrementing version to force index creation
    tables: {
        users: 'users',
        results2D: 'results_2d',
        results3D: 'results_3d',
        bets: 'bets',
        transactions: 'transactions'
    }
};

/**
 * Initialize database connection
 * @returns {Promise<IDBDatabase>}
 */
export function initDatabase() {
    return new Promise((resolve, reject) => {
        console.log('Initializing database...');
        const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

        request.onerror = () => {
            console.error('Database error:', request.error);
            reject(request.error);
        };

        request.onsuccess = () => {
            console.log('Database opened successfully');
            resolve(request.result);
        };

        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed');
            const db = event.target.result;
            createTables(db);
        };
    });
}

/**
 * Create database tables
 * @param {IDBDatabase} db
 */
function createTables(db) {
    console.log('Creating/updating tables...');
    
    // Users table
    if (!db.objectStoreNames.contains(DB_CONFIG.tables.users)) {
        console.log('Creating users table...');
        const userStore = db.createObjectStore(DB_CONFIG.tables.users, { keyPath: 'id', autoIncrement: true });
        userStore.createIndex('email', 'email', { unique: true });
        userStore.createIndex('role', 'role', { unique: false });
        console.log('Users table created with indexes');
    } else {
        console.log('Users table already exists');
    }

    // 2D Results table
    if (!db.objectStoreNames.contains(DB_CONFIG.tables.results2D)) {
        console.log('Creating 2D results table...');
        const results2DStore = db.createObjectStore(DB_CONFIG.tables.results2D, { keyPath: 'id', autoIncrement: true });
        results2DStore.createIndex('date', 'date');
        results2DStore.createIndex('time', 'time');
    }

    // 3D Results table
    if (!db.objectStoreNames.contains(DB_CONFIG.tables.results3D)) {
        console.log('Creating 3D results table...');
        const results3DStore = db.createObjectStore(DB_CONFIG.tables.results3D, { keyPath: 'id', autoIncrement: true });
        results3DStore.createIndex('date', 'date');
    }

    // Bets table
    if (!db.objectStoreNames.contains(DB_CONFIG.tables.bets)) {
        console.log('Creating bets table...');
        const betsStore = db.createObjectStore(DB_CONFIG.tables.bets, { keyPath: 'id', autoIncrement: true });
        betsStore.createIndex('userId', 'userId');
        betsStore.createIndex('date', 'date');
        betsStore.createIndex('type', 'type');
    }

    // Transactions table
    if (!db.objectStoreNames.contains(DB_CONFIG.tables.transactions)) {
        console.log('Creating transactions table...');
        const transactionsStore = db.createObjectStore(DB_CONFIG.tables.transactions, { keyPath: 'id', autoIncrement: true });
        transactionsStore.createIndex('userId', 'userId');
        transactionsStore.createIndex('date', 'date');
        transactionsStore.createIndex('type', 'type');
    }
}

/**
 * Generic database operation
 * @param {string} storeName - Name of the store
 * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
 * @param {Function} operation - Operation to perform
 * @returns {Promise<any>}
 */
async function dbOperation(storeName, mode, operation) {
    const db = await initDatabase();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);

        try {
            const request = operation(store);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Add item to store
 * @param {string} storeName - Store name
 * @param {Object} data - Data to add
 * @returns {Promise<number>} - Returns the ID of the added item
 */
export function addItem(storeName, data) {
    return dbOperation(storeName, 'readwrite', (store) => store.add(data));
}

/**
 * Get item by ID
 * @param {string} storeName - Store name
 * @param {number} id - Item ID
 * @returns {Promise<Object>}
 */
export function getItem(storeName, id) {
    return dbOperation(storeName, 'readonly', (store) => store.get(id));
}

/**
 * Update item
 * @param {string} storeName - Store name
 * @param {Object} data - Updated data
 * @returns {Promise<Object>}
 */
export function updateItem(storeName, data) {
    return dbOperation(storeName, 'readwrite', (store) => store.put(data));
}

/**
 * Delete item
 * @param {string} storeName - Store name
 * @param {number} id - Item ID
 * @returns {Promise<undefined>}
 */
export function deleteItem(storeName, id) {
    return dbOperation(storeName, 'readwrite', (store) => store.delete(id));
}

/**
 * Get all items from store
 * @param {string} storeName - Store name
 * @returns {Promise<Array>}
 */
export function getAllItems(storeName) {
    return dbOperation(storeName, 'readonly', (store) => store.getAll());
}
