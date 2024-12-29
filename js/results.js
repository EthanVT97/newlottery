// results.js - Lottery results management

import { DB_CONFIG, addItem, getAllItems, getItem, updateItem } from './database.js';
import { formatDate, formatTime } from './utils.js';

/**
 * Result types
 */
export const RESULT_TYPES = {
    TWO_D: '2D',
    THREE_D: '3D'
};

/**
 * Add lottery result
 * @param {string} type - Result type (2D/3D)
 * @param {Object} data - Result data
 * @returns {Promise<number>} Result ID
 */
export async function addResult(type, data) {
    const store = type === RESULT_TYPES.TWO_D ? DB_CONFIG.tables.results2D : DB_CONFIG.tables.results3D;
    return await addItem(store, {
        ...data,
        createdAt: new Date().toISOString()
    });
}

/**
 * Get results by date range
 * @param {string} type - Result type (2D/3D)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Promise<Array>} Results
 */
export async function getResultsByDateRange(type, startDate, endDate) {
    const store = type === RESULT_TYPES.TWO_D ? DB_CONFIG.tables.results2D : DB_CONFIG.tables.results3D;
    const results = await getAllItems(store);
    
    return results.filter(result => {
        const resultDate = new Date(result.date);
        return resultDate >= startDate && resultDate <= endDate;
    });
}

/**
 * Get latest result
 * @param {string} type - Result type (2D/3D)
 * @returns {Promise<Object>} Latest result
 */
export async function getLatestResult(type) {
    const store = type === RESULT_TYPES.TWO_D ? DB_CONFIG.tables.results2D : DB_CONFIG.tables.results3D;
    const results = await getAllItems(store);
    
    return results.reduce((latest, current) => {
        if (!latest || new Date(current.date) > new Date(latest.date)) {
            return current;
        }
        return latest;
    }, null);
}

/**
 * Format result for display
 * @param {Object} result - Result object
 * @param {string} type - Result type (2D/3D)
 * @returns {Object} Formatted result
 */
export function formatResult(result, type) {
    const formatted = {
        ...result,
        formattedDate: formatDate(result.date)
    };

    if (type === RESULT_TYPES.TWO_D) {
        formatted.formattedTime = formatTime(result.time);
    }

    return formatted;
}

/**
 * Get results table configuration
 * @param {string} type - Result type (2D/3D)
 * @returns {Object} Table configuration
 */
export function getResultsTableConfig(type) {
    const common = {
        date: {
            title: 'Date',
            render: (data) => formatDate(data)
        },
        number: {
            title: 'Number',
            render: (data) => data.padStart(type === RESULT_TYPES.TWO_D ? 2 : 3, '0')
        },
        set: { title: 'Set' },
        value: { 
            title: 'Value',
            render: (data) => data.toLocaleString('my-MM')
        }
    };

    if (type === RESULT_TYPES.TWO_D) {
        return {
            ...common,
            time: {
                title: 'Time',
                render: (data) => formatTime(data)
            }
        };
    }

    return common;
}
