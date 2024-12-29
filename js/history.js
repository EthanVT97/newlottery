// history.js - Historical results functionality
import { formatDate, formatTime } from './utils.js';
import { DB_CONFIG, getAllItems } from './database.js';
import { RESULT_TYPES, getResultsByDateRange } from './results.js';
import { initializeTable } from './table.js';

// Initialize history tables
function initialize2DHistoryTable() {
    const columns = {
        date: { 
            title: 'Date',
            render: (data) => formatDate(data)
        },
        time: {
            title: 'Time',
            render: (data) => formatTime(data)
        },
        number: { 
            title: 'Number',
            render: (data) => data.padStart(2, '0')
        }
    };

    return initializeTable('2dHistoryTable', columns, {
        order: [[0, 'desc'], [1, 'desc']]
    });
}

function initialize3DHistoryTable() {
    const columns = {
        date: { 
            title: 'Date',
            render: (data) => formatDate(data)
        },
        number: { 
            title: 'Number',
            render: (data) => data.padStart(3, '0')
        }
    };

    return initializeTable('3dHistoryTable', columns, {
        order: [[0, 'desc']]
    });
}

// Load historical data
async function loadHistoricalData() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1); // Last 30 days

    const twoDTable = initialize2DHistoryTable();
    const threeDTable = initialize3DHistoryTable();

    try {
        const twoDResults = await getResultsByDateRange(RESULT_TYPES.TWO_D, startDate, endDate);
        const threeDResults = await getResultsByDateRange(RESULT_TYPES.THREE_D, startDate, endDate);

        twoDTable.clear().rows.add(twoDResults).draw();
        threeDTable.clear().rows.add(threeDResults).draw();
    } catch (error) {
        console.error('Error loading historical data:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadHistoricalData);

// Export functions
export { initialize2DHistoryTable, initialize3DHistoryTable, loadHistoricalData };
