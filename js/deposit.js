// deposit.js - Handle deposit functionality
import { supabase } from './config.js';
import { APP_CONFIG } from './config.js';
import { showToast, formatMoney } from './utils.js';

// Payment provider account details
const PAYMENT_ACCOUNTS = {
    kpay: {
        name: 'KBZ Pay',
        accountName: 'U Aung Aung',
        accountNumber: '09123456789'
    },
    wavepay: {
        name: 'Wave Pay',
        accountName: 'U Aung Aung',
        accountNumber: '09123456789'
    },
    cbpay: {
        name: 'CB Pay',
        accountName: 'U Aung Aung',
        accountNumber: '09123456789'
    },
    ayapay: {
        name: 'AYA Pay',
        accountName: 'U Aung Aung',
        accountNumber: '09123456789'
    }
};

// Initialize deposit form
function initializeDeposit() {
    const depositForm = document.getElementById('depositForm');
    const paymentMethod = document.getElementById('paymentMethod');
    const paymentDetails = document.getElementById('paymentDetails');
    const accountName = document.getElementById('accountName');
    const accountNumber = document.getElementById('accountNumber');
    
    // Show/hide payment details when payment method is selected
    paymentMethod.addEventListener('change', (e) => {
        const method = e.target.value;
        if (method) {
            const account = PAYMENT_ACCOUNTS[method];
            accountName.textContent = `အကောင့်အမည်: ${account.accountName}`;
            accountNumber.textContent = `အကောင့်နံပါတ်: ${account.accountNumber}`;
            paymentDetails.classList.remove('d-none');
        } else {
            paymentDetails.classList.add('d-none');
        }
    });
    
    // Handle deposit form submission
    depositForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const amount = parseFloat(document.getElementById('depositAmount').value);
        const method = document.getElementById('paymentMethod').value;
        const phone = document.getElementById('phoneNumber').value;
        const proofFile = document.getElementById('paymentProof').files[0];
        
        if (!amount || !method || !phone || !proofFile) {
            showToast('error', 'ကျေးဇူးပြု၍ လိုအပ်သည်များ ဖြည့်သွင်းပါ');
            return;
        }
        
        try {
            // Upload proof image
            const timestamp = new Date().getTime();
            const fileName = `deposit_proofs/${APP_CONFIG.defaultUserId}_${timestamp}_${proofFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('uploads')
                .upload(fileName, proofFile);
                
            if (uploadError) throw uploadError;
            
            // Create deposit record
            const { data: deposit, error: depositError } = await supabase
                .from('deposits')
                .insert({
                    user_id: APP_CONFIG.defaultUserId,
                    amount: amount,
                    payment_method: method,
                    phone_number: phone,
                    proof_image: fileName,
                    status: 'pending'
                })
                .select()
                .single();
                
            if (depositError) throw depositError;
            
            // Create transaction record
            const { error: transactionError } = await supabase
                .from('transactions')
                .insert({
                    user_id: APP_CONFIG.defaultUserId,
                    type: 'deposit',
                    amount: amount,
                    reference_id: `DEP_${deposit.id}`,
                    status: 'pending'
                });
                
            if (transactionError) throw transactionError;
            
            showToast('success', 'ငွေဖြည့်ရန် တောင်းဆိုမှု အောင်မြင်ပါသည်။ ခဏစောင့်ပါ။');
            
            // Reset form and close modal
            depositForm.reset();
            paymentDetails.classList.add('d-none');
            bootstrap.Modal.getInstance(document.getElementById('depositModal')).hide();
            
        } catch (error) {
            console.error('Deposit error:', error);
            showToast('error', 'ငွေဖြည့်ရန် တောင်းဆိုမှု မအောင်မြင်ပါ။ နောက်မှ ထပ်ကြိုးစားပါ။');
        }
    });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeDeposit);
