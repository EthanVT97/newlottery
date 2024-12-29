// admin.js - Admin panel functionality
import { showToast } from './utils.js';
import { supabase } from './config.js';
import { initializeRealtime } from './realtime.js';

// Initialize Supabase client and realtime subscriptions
initializeRealtime();

// Router
const routes = {
    '/dashboard': async () => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('dashboard-view').classList.add('active');
        await loadDashboardData();
    },
    '/2d': () => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('2d-view').classList.add('active');
        initialize2DTable();
    },
    '/3d': () => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('3d-view').classList.add('active');
        initialize3DTable();
    },
    '/members': () => {
        document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
        document.getElementById('members-view').classList.add('active');
        initializeMembersTable();
    }
};

// Router function
function router() {
    const hash = window.location.hash || '#/dashboard';
    const route = hash.slice(1);
    
    if (routes[route]) {
        routes[route]();
    } else {
        window.location.hash = '/dashboard';
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    const user = supabase.auth.getUser();
    if (!user) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize router
    router();
    window.addEventListener('hashchange', router);

    // Add event listeners
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await supabase.auth.signOut();
                window.location.href = 'index.html';
            } catch (error) {
                console.error('Logout error:', error);
                showToast('အကောင့်ထွက်ရာတွင် အမှားရှိနေပါသည်', 'error');
            }
        });
    }

    // Add refresh button handlers
    const refreshButtons = {
        'refresh2D': initialize2DTable,
        'refresh3D': initialize3DTable,
        'refreshMembers': initializeMembersTable
    };

    Object.entries(refreshButtons).forEach(([id, handler]) => {
        const button = document.getElementById(id);
        if (button) {
            button.addEventListener('click', handler);
        }
    });
});

// Export functions for use in HTML
window.edit2DResult = async (id) => {
    // Implement edit 2D result logic
};

window.delete2DResult = async (id) => {
    try {
        const { error } = await supabase
            .from('2d_results')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('2D ထီဂဏန်းကို ဖျက်ပြီးပါပြီ', 'success');
        initialize2DTable();
    } catch (error) {
        console.error('Delete 2D result error:', error);
        showToast('2D ထီဂဏန်းဖျက်ရာတွင် အမှားရှိနေပါသည်', 'error');
    }
};

window.edit3DResult = async (id) => {
    // Implement edit 3D result logic
};

window.delete3DResult = async (id) => {
    try {
        const { error } = await supabase
            .from('3d_results')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('3D ထီဂဏန်းကို ဖျက်ပြီးပါပြီ', 'success');
        initialize3DTable();
    } catch (error) {
        console.error('Delete 3D result error:', error);
        showToast('3D ထီဂဏန်းဖျက်ရာတွင် အမှားရှိနေပါသည်', 'error');
    }
};

window.editMember = async (id) => {
    // Implement edit member logic
};

window.deleteMember = async (id) => {
    try {
        const { error } = await supabase
            .from('admin_members')
            .delete()
            .eq('id', id);

        if (error) throw error;
        showToast('အကောင့်ကို ဖျက်ပြီးပါပြီ', 'success');
        initializeMembersTable();
    } catch (error) {
        console.error('Delete member error:', error);
        showToast('အကောင့်ဖျက်ရာတွင် အမှားရှိနေပါသည်', 'error');
    }
};

// Update dashboard statistics
async function updateDashboardStats() {
    try {
        // Get 2D count
        const { count: twodCount, error: twodError } = await supabase
            .from('2d_results')
            .select('*', { count: 'exact', head: true });

        if (twodError) throw twodError;
        document.getElementById('2d-count').textContent = twodCount || 0;

        // Get 3D count
        const { count: threedCount, error: threedError } = await supabase
            .from('3d_results')
            .select('*', { count: 'exact', head: true });

        if (threedError) throw threedError;
        document.getElementById('3d-count').textContent = threedCount || 0;

        // Get today's results count
        const today = new Date().toISOString().split('T')[0];
        const { count: todayCount2D, error: todayError2D } = await supabase
            .from('2d_results')
            .select('*', { count: 'exact', head: true })
            .eq('date', today);

        const { count: todayCount3D, error: todayError3D } = await supabase
            .from('3d_results')
            .select('*', { count: 'exact', head: true })
            .eq('date', today);

        if (todayError2D) throw todayError2D;
        if (todayError3D) throw todayError3D;

        document.getElementById('today-count').textContent = (todayCount2D || 0) + (todayCount3D || 0);

        // Get today's transactions
        const todayDeposits = await supabase
            .from('transactions')
            .select('amount')
            .eq('date', today)
            .eq('type', 'deposit');

        const todayWithdrawals = await supabase
            .from('transactions')
            .select('amount')
            .eq('date', today)
            .eq('type', 'withdraw');

        const depositSum = todayDeposits.data?.reduce((sum, t) => sum + t.amount, 0) || 0;
        const withdrawalSum = todayWithdrawals.data?.reduce((sum, t) => sum + t.amount, 0) || 0;

        // Add transaction stats to dashboard
        document.getElementById('today-deposits').textContent = new Intl.NumberFormat('my-MM').format(depositSum);
        document.getElementById('today-withdrawals').textContent = new Intl.NumberFormat('my-MM').format(withdrawalSum);
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
        showToast('ဒ့တ္တာ့စ် အချက်အလက်များ ဖတ်ရာတွင် အမှားရှိနေပါသည်', 'danger');
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load member stats first (this should work)
        const { data: members, error: memberError } = await supabase
            .from('admin_members')
            .select('id')
            .eq('status', true);

        if (!memberError) {
            document.getElementById('totalMembers').textContent = `${members.length} ဦး`;
        }

        // Set default values for sales
        document.getElementById('total2DSales').textContent = `0 ကျပ်`;
        document.getElementById('total3DSales').textContent = `0 ကျပ်`;

        // Add placeholder text for recent activity
        document.getElementById('recentSales').innerHTML = `
            <tr>
                <td colspan="4" class="text-center">မှတ်တမ်းများ မရှိသေးပါ</td>
            </tr>
        `;
        
        document.getElementById('recentActivity').innerHTML = `
            <div class="text-center text-muted">
                <i class="bi bi-info-circle"></i>
                <p>လုပ်ဆောင်ချက် မှတ်တမ်းများ မရှိသေးပါ</p>
            </div>
        `;

        // Add some sample activity for testing
        const sampleActivity = [
            {
                type: 'login',
                description: 'Admin အကောင့်ဝင်ရောက်မှု',
                created_at: new Date().toISOString()
            },
            {
                type: 'member',
                description: 'အကောင့်အသစ် ထည့်သွင်းခြင်း',
                created_at: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
            }
        ];

        const activityHtml = sampleActivity.map(item => `
            <div class="d-flex align-items-center mb-3">
                <div class="activity-icon ${item.type === 'login' ? 'bg-primary' : 'bg-success'} text-white rounded-circle p-2 me-3">
                    <i class="bi ${item.type === 'login' ? 'bi-person' : 'bi-people'}"></i>
                </div>
                <div>
                    <p class="mb-0">${item.description}</p>
                    <small class="text-muted">${new Date(item.created_at).toLocaleString()}</small>
                </div>
            </div>
        `).join('');
        document.getElementById('recentActivity').innerHTML = activityHtml;

    } catch (error) {
        console.error('Dashboard Error:', error);
        showToast('ပင်မစာမျက်နှာ အချက်အလက်များ ရယူရာတွင် အမှားရှိနေပါသည်', 'danger');
    }
}

// Initialize 2D table
function initialize2DTable() {
    const columns = {
        date: { title: 'Date' },
        time: { title: 'Time' },
        number: { title: 'Number' },
        set: { title: 'Set' },
        value: { title: 'Value' }
    };

    const actionRenderer = (data, type, row) => {
        return `<button class="btn btn-sm btn-primary" onclick="edit2DResult(${row.id})">ပြင်ဆင်</button>
                <button class="btn btn-sm btn-danger" onclick="delete2DResult(${row.id})">ဖျက်ရန်</button>`;
    };

    return initializeTable('2dResultsTable', 
        addActionColumn(columns, actionRenderer),
        { order: [[0, 'desc'], [1, 'desc']] }
    );
}

// Initialize 3D table
function initialize3DTable() {
    const columns = {
        date: { title: 'Date' },
        number: { title: 'Number' },
        set: { title: 'Set' },
        value: { title: 'Value' }
    };

    const actionRenderer = (data, type, row) => {
        return `<button class="btn btn-sm btn-primary" onclick="edit3DResult(${row.id})">ပြင်ဆင်</button>
                <button class="btn btn-sm btn-danger" onclick="delete3DResult(${row.id})">ဖျက်ရန်</button>`;
    };

    return initializeTable('3dResultsTable', 
        addActionColumn(columns, actionRenderer),
        { order: [[0, 'desc']] }
    );
}

// Initialize members table
function initializeMembersTable() {
    const columns = {
        name: { title: 'Name' },
        email: { title: 'Email' },
        balance: { 
            title: 'Balance',
            render: (data) => data.toLocaleString('my-MM')
        },
        status: { 
            title: 'Status',
            render: (data) => `<span class="badge bg-${data === 'active' ? 'success' : 'danger'}">${data}</span>`
        }
    };

    const actionRenderer = (data, type, row) => {
        return `<button class="btn btn-sm btn-primary" onclick="editMember(${row.id})">ပြင်ဆင်</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMember(${row.id})">ဖျက်ရန်</button>`;
    };

    return initializeTable('membersTable', 
        addActionColumn(columns, actionRenderer)
    );
}
