// admin.js - Admin panel functionality
import { supabase } from './config.js';
import { showToast, formatMoney, formatDateTime } from './utils.js';

// Load deposits based on status
async function loadDeposits(status) {
    try {
        const { data: deposits, error } = await supabase
            .from('deposits')
            .select(`
                *,
                users (name)
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('depositsTableBody');
        tableBody.innerHTML = '';

        deposits.forEach(deposit => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(deposit.created_at)}</td>
                <td>${deposit.users.name}</td>
                <td>${formatMoney(deposit.amount)}</td>
                <td>${deposit.payment_method}</td>
                <td>${deposit.phone_number}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(deposit.status)}">
                        ${getStatusText(deposit.status)}
                    </span>
                </td>
                <td>
                    ${deposit.status === 'pending' ? `
                        <button class="btn btn-sm btn-success me-1" onclick="approveDeposit(${deposit.id})">
                            <i class="bi bi-check-circle"></i> အတည်ပြုမည်
                        </button>
                        <button class="btn btn-sm btn-danger me-1" onclick="rejectDeposit(${deposit.id})">
                            <i class="bi bi-x-circle"></i> ငြင်းပယ်မည်
                        </button>
                    ` : ''}
                    <button class="btn btn-sm btn-primary" onclick="viewProof('${deposit.proof_image}')">
                        <i class="bi bi-image"></i> ကြည့်မည်
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading deposits:', error);
        showToast('error', 'ငွေသွင်းမှတ်တမ်းများ ရယူရာတွင် အမှားရှိနေပါသည်');
    }
}

// Load results
async function loadResults() {
    try {
        // Load 2D results
        const { data: results2d, error: error2d } = await supabase
            .from('results_2d')
            .select('*')
            .order('date', { ascending: false })
            .order('time', { ascending: false })
            .limit(10);

        if (error2d) throw error2d;

        // Load 3D results
        const { data: results3d, error: error3d } = await supabase
            .from('results_3d')
            .select('*')
            .order('date', { ascending: false })
            .limit(10);

        if (error3d) throw error3d;

        const tableBody = document.getElementById('resultsTableBody');
        tableBody.innerHTML = '';

        // Combine and sort results
        const allResults = [
            ...results2d.map(r => ({ ...r, type: '2D' })),
            ...results3d.map(r => ({ ...r, type: '3D' }))
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        allResults.forEach(result => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(result.date).split(' ')[0]}</td>
                <td>${result.time ? (result.time === '12:01:00' ? 'မနက်ပိုင်း' : 'ညနေပိုင်း') : '-'}</td>
                <td>${result.type}</td>
                <td>${result.number}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="editResult('${result.type}', ${result.id})">
                        <i class="bi bi-pencil"></i> ပြင်မည်
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading results:', error);
        showToast('error', 'ထွက်ဂဏန်းများ ရယူရာတွင် အမှားရှိနေပါသည်');
    }
}

// Load bets based on status
async function loadBets(status) {
    try {
        const { data: bets, error } = await supabase
            .from('bets')
            .select(`
                *,
                users (name)
            `)
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const tableBody = document.getElementById('betsTableBody');
        tableBody.innerHTML = '';

        bets.forEach(bet => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDateTime(bet.created_at)}</td>
                <td>${bet.users.name}</td>
                <td>${bet.type}</td>
                <td>${bet.number}</td>
                <td>${formatMoney(bet.amount)}</td>
                <td>${getBetMethodText(bet.bet_method)}</td>
                <td>
                    <span class="badge bg-${getStatusBadgeClass(bet.status)}">
                        ${getStatusText(bet.status)}
                    </span>
                </td>
            `;
            tableBody.appendChild(row);
        });
    } catch (error) {
        console.error('Error loading bets:', error);
        showToast('error', 'လောင်းကစားမှတ်တမ်းများ ရယူရာတွင် အမှားရှိနေပါသည်');
    }
}

// Add result
async function addResult() {
    const type = document.getElementById('resultType').value;
    const date = document.getElementById('resultDate').value;
    const time = document.getElementById('resultTime').value;
    const number = document.getElementById('resultNumber').value;

    try {
        let error;
        if (type === '2D') {
            const { error: err2d } = await supabase
                .from('results_2d')
                .insert([{ 
                    number,
                    date,
                    time: time === 'morning' ? '12:01:00' : '16:30:00'
                }]);
            error = err2d;
        } else if (type === '3D') {
            const { error: err3d } = await supabase
                .from('results_3d')
                .insert([{ 
                    number,
                    date
                }]);
            error = err3d;
        }

        if (error) throw error;

        showToast('success', 'ထွက်ဂဏန်း ထည့်သွင်းပြီးပါပြီ');
        bootstrap.Modal.getInstance(document.getElementById('addResultModal')).hide();
        loadResults();
        
        // Process winning bets
        await processWinningBets(type, number, date, time);

    } catch (error) {
        console.error('Error adding result:', error);
        showToast('error', 'ထွက်ဂဏန်း ထည့်သွင်းရာတွင် အမှားရှိနေပါသည်');
    }
}

// Process winning bets
async function processWinningBets(type, winningNumber, date, time) {
    try {
        // Get pending bets for this type and date
        const { data: bets, error } = await supabase
            .from('bets')
            .select('*')
            .eq('type', type)
            .eq('date', date)
            .eq('status', 'pending');

        if (error) throw error;

        for (const bet of bets) {
            // For 2D, also check the time
            if (type === '2D' && bet.time !== time) continue;

            const isWinner = checkWinningBet(bet.number, winningNumber, type, bet.bet_method);
            const status = isWinner ? 'won' : 'lost';
            
            // Update bet status
            const { error: updateError } = await supabase
                .from('bets')
                .update({ status })
                .eq('id', bet.id);

            if (updateError) throw updateError;

            // If won, update user balance and create transaction
            if (isWinner) {
                const winAmount = calculateWinAmount(bet.amount, type, bet.bet_method);
                
                // Update user balance
                const { error: balanceError } = await supabase
                    .from('users')
                    .update({
                        balance: supabase.raw(`balance + ${winAmount}`)
                    })
                    .eq('id', bet.user_id);

                if (balanceError) throw balanceError;

                // Create win transaction
                const { error: transactionError } = await supabase
                    .from('transactions')
                    .insert({
                        user_id: bet.user_id,
                        type: 'win',
                        amount: winAmount,
                        reference_id: `WIN_${bet.id}`,
                        status: 'completed'
                    });

                if (transactionError) throw transactionError;
            }
        }

        showToast('success', 'အနိုင်/အရှုံး တွက်ချက်ပြီးပါပြီ');

    } catch (error) {
        console.error('Error processing winning bets:', error);
        showToast('error', 'အနိုင်/အရှုံး တွက်ချက်ရာတွင် အမှားရှိနေပါသည်');
    }
}

// Approve deposit
async function approveDeposit(id) {
    try {
        const { data: deposit, error: fetchError } = await supabase
            .from('deposits')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        // Update deposit status
        const { error: updateError } = await supabase
            .from('deposits')
            .update({ status: 'approved' })
            .eq('id', id);

        if (updateError) throw updateError;

        // Update user balance
        const { error: balanceError } = await supabase
            .from('users')
            .update({
                balance: supabase.raw(`balance + ${deposit.amount}`)
            })
            .eq('id', deposit.user_id);

        if (balanceError) throw balanceError;

        // Create transaction record
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: deposit.user_id,
                type: 'deposit',
                amount: deposit.amount,
                reference_id: `DEP_${id}`,
                status: 'completed'
            });

        if (transactionError) throw transactionError;

        showToast('success', 'ငွေသွင်းမှု အတည်ပြုပြီးပါပြီ');
        loadDeposits('pending');

    } catch (error) {
        console.error('Error approving deposit:', error);
        showToast('error', 'ငွေသွင်းမှု အတည်ပြုရာတွင် အမှားရှိနေပါသည်');
    }
}

// Reject deposit
async function rejectDeposit(id) {
    try {
        const { error: updateError } = await supabase
            .from('deposits')
            .update({ status: 'rejected' })
            .eq('id', id);

        if (updateError) throw updateError;

        // Create failed transaction record
        const { error: transactionError } = await supabase
            .from('transactions')
            .insert({
                user_id: deposit.user_id,
                type: 'deposit',
                amount: deposit.amount,
                reference_id: `DEP_${id}`,
                status: 'failed'
            });

        if (transactionError) throw transactionError;

        showToast('success', 'ငွေသွင်းမှု ငြင်းပယ်ပြီးပါပြီ');
        loadDeposits('pending');

    } catch (error) {
        console.error('Error rejecting deposit:', error);
        showToast('error', 'ငွေသွင်းမှု ငြင်းပယ်ရာတွင် အမှားရှိနေပါသည်');
    }
}

// View payment proof
function viewProof(imageUrl) {
    document.getElementById('proofImage').src = `${supabase.storageUrl}/object/public/uploads/${imageUrl}`;
    new bootstrap.Modal(document.getElementById('viewProofModal')).show();
}

// Helper functions
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'approved':
        case 'won': return 'success';
        case 'rejected':
        case 'lost': return 'danger';
        default: return 'secondary';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'pending': return 'စောင့်ဆိုင်းဆဲ';
        case 'approved': return 'အတည်ပြုပြီး';
        case 'rejected': return 'ငြင်းပယ်ထား';
        case 'won': return 'အနိုင်ရ';
        case 'lost': return 'အရှုံး';
        default: return status;
    }
}

function getBetMethodText(method) {
    switch (method) {
        case 'R': return 'ရိုးရိုး';
        case 'P': return 'ပါဝါ';
        case 'B': return 'ဘရိတ်';
        case 'first2': return 'ရှေ့ ၂ လုံး';
        case 'last2': return 'နောက် ၂ လုံး';
        case 'first3': return 'ရှေ့ ၃ လုံး';
        case 'last3': return 'နောက် ၃ လုံး';
        default: return method;
    }
}

function checkWinningBet(betNumber, winningNumber, type, betMethod) {
    switch (type) {
        case '2D':
            return betNumber === winningNumber.slice(-2);
        case '3D':
            if (betMethod === 'first3') return betNumber === winningNumber.slice(0, 3);
            if (betMethod === 'last3') return betNumber === winningNumber.slice(-3);
            return betNumber === winningNumber;
        default:
            return betNumber === winningNumber;
    }
}

function calculateWinAmount(betAmount, type, betMethod) {
    const multipliers = {
        '2D': {
            'R': 85,
            'P': 425,
            'B': 8500
        },
        '3D': {
            'R': 500,
            'first3': 500,
            'last3': 500
        },
        'THAI': 100000,
        'LAO': 100000
    };

    if (type === '2D' || type === '3D') {
        return betAmount * multipliers[type][betMethod];
    }
    return betAmount * multipliers[type];
}

// Show add result modal
function showAddResultModal() {
    document.getElementById('resultDate').valueAsDate = new Date();
    new bootstrap.Modal(document.getElementById('addResultModal')).show();
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    // Load initial data
    loadDeposits('pending');
    loadResults();
    loadBets('pending');

    // Make functions available globally
    window.loadDeposits = loadDeposits;
    window.loadBets = loadBets;
    window.approveDeposit = approveDeposit;
    window.rejectDeposit = rejectDeposit;
    window.viewProof = viewProof;
    window.showAddResultModal = showAddResultModal;
    window.addResult = addResult;
});
