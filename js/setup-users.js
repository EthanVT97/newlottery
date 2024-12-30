// setup-users.js - Create or update initial users
import { supabase } from './config.js';

async function setupInitialUsers() {
    console.log('Setting up initial users...');

    // Create admin user
    const { data: adminData, error: adminError } = await supabase.auth.signUp({
        email: 'admin@gmail.com',
        password: '123456',
        options: {
            data: {
                name: 'Admin User',
                role: 'admin'
            }
        }
    });

    if (adminError) {
        if (adminError.message.includes('already registered')) {
            console.log('Admin user already exists, trying to sign in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: 'admin@gmail.com',
                password: '123456'
            });

            if (signInError) {
                console.error('Admin sign in failed:', signInError);
            } else {
                console.log('Admin signed in successfully:', signInData);
            }
        } else {
            console.error('Error creating admin:', adminError);
        }
    } else {
        console.log('Admin created successfully:', adminData);
    }

    // Create regular user
    const { data: userData, error: userError } = await supabase.auth.signUp({
        email: 'user@gmail.com',
        password: '123456',
        options: {
            data: {
                name: 'Regular User',
                role: 'user'
            }
        }
    });

    if (userError) {
        if (userError.message.includes('already registered')) {
            console.log('Regular user already exists, trying to sign in...');
            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email: 'user@gmail.com',
                password: '123456'
            });

            if (signInError) {
                console.error('User sign in failed:', signInError);
            } else {
                console.log('User signed in successfully:', signInData);
            }
        } else {
            console.error('Error creating user:', userError);
        }
    } else {
        console.log('Regular user created successfully:', userData);
    }
}

// Run the setup
setupInitialUsers();
