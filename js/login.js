// Import required modules
import { supabase } from './config.js';
import { showToast, validateEmail, validatePassword, formatPhoneNumber } from './utils.js';
import { redirectIfAuthenticated } from './middleware.js';

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const resetPasswordForm = document.getElementById('resetPasswordForm');
    const showRegisterBtn = document.getElementById('showRegister');
    const forgotPasswordBtn = document.getElementById('forgotPassword');

    // Initialize modals
    const registerModal = new bootstrap.Modal(document.getElementById('registerModal'));
    const resetPasswordModal = new bootstrap.Modal(document.getElementById('resetPasswordModal'));

    // Setup real-time channel for registration updates
    const registrationChannel = supabase.channel('registration_updates');

    // Show register modal
    showRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        registerModal.show();
    });

    // Show reset password modal
    forgotPasswordBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        resetPasswordModal.show();
    });

    // Handle registration form submission
    registerForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>အကောင့်ဖွင့်နေသည်...';

        try {
            const name = document.getElementById('regName').value.trim();
            const email = document.getElementById('regEmail').value.trim();
            const phone = formatPhoneNumber(document.getElementById('regPhone').value.trim());
            const password = document.getElementById('regPassword').value;
            const confirmPassword = document.getElementById('regConfirmPassword').value;

            // Validate password match
            if (password !== confirmPassword) {
                throw new Error('စကားဝှက်များ မတူညီပါ');
            }

            // Create auth user with Supabase
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                        phone
                    }
                }
            });

            if (signUpError) throw signUpError;

            // Create user profile
            const { error: profileError } = await supabase
                .from('profiles')
                .insert([
                    {
                        id: user.id,
                        name,
                        email,
                        phone,
                        role: 'customer',
                        balance: 0,
                        is_active: true
                    }
                ]);

            if (profileError) throw profileError;

            // Subscribe to profile changes
            registrationChannel
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'profiles',
                        filter: `id=eq.${user.id}`
                    },
                    (payload) => {
                        console.log('Profile created:', payload);
                        showToast('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။ အီးမေးလ်တွင် အတည်ပြုချက်ကို စစ်ဆေးပါ', 'success');
                    }
                )
                .subscribe();

            // Close modal and reset form
            setTimeout(() => {
                registerModal.hide();
                form.reset();
                form.classList.remove('was-validated');
            }, 1500);

        } catch (error) {
            console.error('Registration error:', error);
            
            let errorMessage = 'အကောင့်ဖွင့်ရာတွင် အမှားရှိနေပါသည်';
            
            if (error.message?.includes('duplicate key')) {
                if (error.message.includes('profiles_email_key')) {
                    errorMessage = 'ဤအီးမေးလ်ဖြင့် အကောင့်ရှိပြီးဖြစ်ပါသည်';
                } else if (error.message.includes('profiles_phone_key')) {
                    errorMessage = 'ဤဖုန်းနံပါတ်ဖြင့် အကောင့်ရှိပြီးဖြစ်ပါသည်';
                }
            } else if (error.message?.includes('password')) {
                errorMessage = 'စကားဝှက် အားနည်းနေပါသည်။ အနည်းဆုံး စာလုံး ၆လုံး ထည့်သွင်းပါ';
            } else if (error.message === 'စကားဝှက်များ မတူညီပါ') {
                errorMessage = error.message;
            }
            
            showToast(errorMessage, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Handle login form submission
    loginForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>အကောင့်ဝင်နေသည်...';

        try {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
                options: {
                    shouldRemember: rememberMe
                }
            });

            if (error) throw error;

            // Get user profile
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role, is_active')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            // Check if account is active
            if (!profile.is_active) {
                throw new Error('အကောင့်ပိတ်ထားပါသည်။ စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ။');
            }

            showToast('အကောင့်ဝင်ရောက်မှု အောင်မြင်ပါသည်', 'success');

            // Store the session
            localStorage.setItem('mm2d3d_session', JSON.stringify(data.session));
            localStorage.setItem('mm2d3d_profile', JSON.stringify(profile));

            // Redirect based on role
            setTimeout(() => {
                window.location.href = profile.role === 'admin' ? 'admin.html' : 'customer.html';
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            
            let errorMessage = 'အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်';
            
            if (error.message === 'အကောင့်ပိတ်ထားပါသည်။ စီမံခန့်ခွဲသူကို ဆက်သွယ်ပါ။') {
                errorMessage = error.message;
            } else if (error.message?.includes('Email not confirmed')) {
                errorMessage = 'အီးမေးလ်အတည်ပြုချက် မပြုလုပ်ရသေးပါ။ သင့်အီးမေးလ်ကို စစ်ဆေးပါ။';
            }
            
            showToast(errorMessage, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });

    // Handle password reset form submission
    resetPasswordForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        
        if (!form.checkValidity()) {
            e.stopPropagation();
            form.classList.add('was-validated');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>စကားဝှက်ပြန်လည်သတ်မှတ်ရန် ပို့နေသည်...';

        try {
            const email = document.getElementById('resetEmail').value.trim();

            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password.html`
            });

            if (error) throw error;

            showToast('စကားဝှက်ပြန်လည်သတ်မှတ်ရန် လင့်ခ်ကို အီးမေးလ်သို့ ပို့ပြီးပါပြီ', 'success');
            
            // Close modal and reset form
            setTimeout(() => {
                resetPasswordModal.hide();
                form.reset();
                form.classList.remove('was-validated');
            }, 1500);

        } catch (error) {
            console.error('Password reset error:', error);
            showToast('စကားဝှက်ပြန်လည်သတ်မှတ်ရာတွင် အမှားရှိနေပါသည်', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
});
