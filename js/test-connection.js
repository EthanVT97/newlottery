// test-connection.js
import { supabase } from './config.js';
import { initDatabase, addItem, getAllItems } from './database.js';

async function testConnection() {
    try {
        console.log('Testing Supabase connection...');
        
        // Test 1: Basic connection
        const { data: test, error: testError } = await supabase.from('users').select('*').limit(1);
        if (testError) throw testError;
        console.log('✅ Database connection successful');

        // Test 2: Initialize database (create default users)
        const initResult = await initDatabase();
        if (!initResult) throw new Error('Database initialization failed');
        console.log('✅ Database initialization successful');

        // Test 3: User Authentication
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email: 'admin@gmail.com',
            password: '123456'
        });
        if (authError) throw authError;
        console.log('✅ Admin authentication successful');

        // Test 4: Create a test 2D result
        const testResult = {
            number: '12',
            date: new Date().toISOString().split('T')[0],
            time: '12:01:00',
            created_by: authData.user.id
        };
        
        const result2D = await addItem('results_2d', testResult);
        console.log('✅ Created test 2D result:', result2D);

        // Test 5: Fetch all 2D results
        const allResults = await getAllItems('results_2d');
        console.log('✅ Retrieved all 2D results:', allResults);

        console.log('\nAll tests passed successfully! 🎉');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error);
    }
}

// Run tests
testConnection();
