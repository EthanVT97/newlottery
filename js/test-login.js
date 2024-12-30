// test-login.js - Test login functionality
import { supabase } from './config.js';

async function testLogin() {
    console.log('Testing login...');

    // Try admin login
    console.log('Attempting admin login...');
    const { data: adminData, error: adminError } = await supabase.auth.signInWithPassword({
        email: 'admin@gmail.com',
        password: '123456'
    });

    if (adminError) {
        console.error('Admin login failed:', adminError);
    } else {
        console.log('Admin login successful:', adminData);
        
        // Get admin profile
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', adminData.user.id)
            .single();
            
        if (profileError) {
            console.error('Error getting admin profile:', profileError);
        } else {
            console.log('Admin profile:', profile);
        }
    }

    // Sign out
    await supabase.auth.signOut();

    // Try user login
    console.log('\nAttempting user login...');
    const { data: userData, error: userError } = await supabase.auth.signInWithPassword({
        email: 'user@gmail.com',
        password: '123456'
    });

    if (userError) {
        console.error('User login failed:', userError);
    } else {
        console.log('User login successful:', userData);
        
        // Get user profile
        const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userData.user.id)
            .single();
            
        if (profileError) {
            console.error('Error getting user profile:', profileError);
        } else {
            console.log('User profile:', profile);
        }
    }
}

// Run the test
testLogin();
