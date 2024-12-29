// table.js - Generic table initialization

/**
 * Default table options
 */
const DEFAULT_OPTIONS = {
    responsive: true,
    order: [[0, 'desc']],
    pageLength: 10,
    language: {
        search: 'ရှာဖွေရန်:',
        lengthMenu: '_MENU_ ခုပြရန်',
        info: 'စုစုပေါင်း _TOTAL_ ခုမှ _START_ မှ _END_ ထိ',
        paginate: {
            first: 'ပထမ',
            last: 'နောက်ဆုံး',
            next: 'ရှေ့',
            previous: 'နောက်'
        }
    }
};

/**
 * Initialize DataTable with configuration
 * @param {string} tableId - Table element ID
 * @param {Object} columns - Column definitions
 * @param {Object} options - Additional options
 * @returns {DataTable} Initialized DataTable instance
 */
export function initializeTable(tableId, columns, options = {}) {
    const columnDefs = Object.entries(columns).map(([key, config]) => ({
        data: key,
        title: config.title,
        render: config.render || (data => data),
        className: config.className || '',
        width: config.width || null,
        orderable: config.orderable !== false
    }));

    return new DataTable(`#${tableId}`, {
        ...DEFAULT_OPTIONS,
        ...options,
        columns: columnDefs
    });
}

/**
 * Update table data
 * @param {DataTable} table - DataTable instance
 * @param {Array} data - New data
 */
export function updateTableData(table, data) {
    table.clear();
    table.rows.add(data);
    table.draw();
}

/**
 * Add action column to table
 * @param {Object} columns - Column definitions
 * @param {Function} actionRenderer - Action column renderer
 * @returns {Object} Updated columns
 */
export function addActionColumn(columns, actionRenderer) {
    return {
        ...columns,
        actions: {
            title: 'Actions',
            orderable: false,
            className: 'text-center',
            render: actionRenderer
        }
    };
}

/**
 * Create edit button
 * @param {string} onClick - onClick handler
 * @returns {string} Button HTML
 */
export function createEditButton(onClick) {
    return `
        <button class="btn btn-sm btn-primary me-1" onclick="${onClick}">
            <i class="bi bi-pencil"></i>
        </button>
    `;
}

/**
 * Create delete button
 * @param {string} onClick - onClick handler
 * @returns {string} Button HTML
 */
export function createDeleteButton(onClick) {
    return `
        <button class="btn btn-sm btn-danger" onclick="${onClick}">
            <i class="bi bi-trash"></i>
        </button>
    `;
}

/**
 * Create view button
 * @param {string} onClick - onClick handler
 * @returns {string} Button HTML
 */
export function createViewButton(onClick) {
    return `
        <button class="btn btn-sm btn-info me-1" onclick="${onClick}">
            <i class="bi bi-eye"></i>
        </button>
    `;
}
