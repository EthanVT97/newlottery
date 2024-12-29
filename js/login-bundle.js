// Supabase configuration
const SUPABASE_URL = 'https://dxuhwqgbwvmtpgwqsceh.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4dWh3cWdid3ZtdHBnd3FzY2VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDM4NzIyMjAsImV4cCI6MjAxOTQ0ODIyMH0.HRBVkI1DUvPe0-3FLGqTtJxEFp3_sCXg5YkEK0K4vwI';

// Initialize Supabase client
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

// Show toast message
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0 position-fixed bottom-0 end-0 m-3`;
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">${message}</div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
    `;
    document.body.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// Handle login for user/admin
window.handleLogin = async (role) => {
    try {
        // Default credentials
        const credentials = {
            email: role === 'admin' ? 'admin@mm2d3d.com' : 'user@mm2d3d.com',
            password: role === 'admin' ? 'admin123' : 'user123'
        };

        // Show loading state on button
        const button = document.querySelector(`button[onclick="handleLogin('${role}')"]`);
        const originalText = button.innerHTML;
        button.disabled = true;
        button.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>လုပ်ဆောင်နေသည်...`;

        // Sign in with Supabase Auth
        const { data: authData, error: authError } = await supabaseClient.auth.signInWithPassword(credentials);

        if (authError) throw authError;

        // Store session
        if (authData.session) {
            localStorage.setItem('mm-2d3d-auth', JSON.stringify(authData.session));
        }

        // Create or update profile if it doesn't exist
        const { data: profile, error: profileError } = await supabaseClient
            .from('profiles')
            .upsert({
                id: authData.user.id,
                email: credentials.email,
                role: role,
                name: role === 'admin' ? 'Admin User' : 'Regular User',
                is_active: true,
                balance: role === 'admin' ? 999999 : 10000,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (profileError) throw profileError;

        // Store profile
        localStorage.setItem('userProfile', JSON.stringify(profile));

        // Redirect based on role
        window.location.href = role === 'admin' ? 'admindashboard.html' : 'userdashboard.html';

    } catch (error) {
        console.error('Login error:', error);
        showToast('ဝင်ရောက်ရာတွင် အမှားရှိနေပါသည်', 'error');
        
        // Reset button state if button exists
        const button = document.querySelector(`button[onclick="handleLogin('${role}')"]`);
        if (button) {
            button.disabled = false;
            button.innerHTML = originalText;
        }
    }
};
