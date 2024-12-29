// Initialize Supabase client
const supabaseUrl = 'https://fikjryqofcauqezmefqr.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY;

// Create Supabase client with service role key
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// Define valid roles exactly as in the constraint
const ADMIN_ROLES = {
    HEAD_ADMIN: 'ဒိုင်ချုပ်',  // Copied exactly from constraint
    ADMIN: 'ဂုတ်စီး',      // Copied exactly from constraint
    SELLER: 'ရောင်းသား'    // Copied exactly from constraint
};

async function setupDatabase() {
    try {
        // First, delete existing users and their profiles
        console.log('Cleaning up existing data...');
        
        // Delete existing profiles
        await supabase
            .from('admin_members')
            .delete()
            .eq('email', 'admin@example.com');
            
        await supabase
            .from('customers')
            .delete()
            .eq('email', 'customer@example.com');
            
        await supabase
            .from('lottery_types')
            .delete();
        
        // List and delete existing users
        const { data: usersList, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
            console.error('Error listing users:', listError);
        } else if (usersList?.users) {
            for (const user of usersList.users) {
                if (user.email === 'admin@example.com' || user.email === 'customer@example.com') {
                    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
                    if (deleteError) {
                        console.error('Error deleting user:', deleteError);
                    } else {
                        console.log('Deleted user:', user.email);
                    }
                }
            }
        }

        // Create admin user through auth
        console.log('Creating admin account...');
        const { data: adminData, error: adminError } = await supabase.auth.admin.createUser({
            email: 'admin@example.com',
            password: 'admin123',
            email_confirm: true
        });

        if (adminError) {
            console.error('Failed to create admin account:', adminError);
            throw adminError;
        }
        console.log('Admin account created successfully');

        // Create admin profile
        console.log('Creating admin profile...');
        const { error: adminProfileError } = await supabase
            .from('admin_members')
            .upsert({
                id: adminData.user.id,
                email: 'admin@example.com',
                password: 'admin123',
                role: ADMIN_ROLES.HEAD_ADMIN,
                status: true
            }, {
                onConflict: 'email'
            });

        if (adminProfileError) {
            console.error('Admin profile error:', adminProfileError);
            throw adminProfileError;
        }
        console.log('Admin profile created successfully');

        // Create customer user through auth
        console.log('Creating customer account...');
        const { data: customerData, error: customerError } = await supabase.auth.admin.createUser({
            email: 'customer@example.com',
            password: 'customer123',
            email_confirm: true
        });

        if (customerError) {
            console.error('Failed to create customer account:', customerError);
            throw customerError;
        }
        console.log('Customer account created successfully');

        // Create customer profile
        console.log('Creating customer profile...');
        const { error: customerProfileError } = await supabase
            .from('customers')
            .upsert({
                id: customerData.user.id,
                email: 'customer@example.com',
                name: 'Sample Customer',
                phone: '09123456789',
                balance: 0,
                status: true
            }, {
                onConflict: 'email'
            });

        if (customerProfileError) {
            console.error('Customer profile error:', customerProfileError);
            throw customerProfileError;
        }
        console.log('Customer profile created successfully');

        // Add lottery types
        console.log('Creating lottery types...');
        const { error: lotteryTypesError } = await supabase
            .from('lottery_types')
            .upsert([
                {
                    name: 'Myanmar 2D',
                    country: 'Myanmar',
                    digits: 2,
                    min_bet: 100,
                    max_bet: 50000,
                    payout_rate: 85,
                    status: true
                },
                {
                    name: 'Myanmar 3D',
                    country: 'Myanmar',
                    digits: 3,
                    min_bet: 100,
                    max_bet: 50000,
                    payout_rate: 500,
                    status: true
                },
                {
                    name: 'Laos 2D',
                    country: 'Laos',
                    digits: 2,
                    min_bet: 100,
                    max_bet: 50000,
                    payout_rate: 85,
                    status: true
                },
                {
                    name: 'Thai 2D',
                    country: 'Thailand',
                    digits: 2,
                    min_bet: 100,
                    max_bet: 50000,
                    payout_rate: 85,
                    status: true
                }
            ], {
                onConflict: 'name'
            });

        if (lotteryTypesError) {
            console.error('Lottery types error:', lotteryTypesError);
            throw lotteryTypesError;
        }
        console.log('Lottery types created successfully');

        alert('Database setup completed successfully! You can now log in with:\n\nAdmin: admin@example.com / admin123\nCustomer: customer@example.com / customer123');
        window.location.href = 'index.html';

    } catch (error) {
        console.error('Error setting up database:', error);
        alert('Error setting up database: ' + (error.message || error));
    }
}

// Add event listener to setup button
document.getElementById('setupButton').addEventListener('click', setupDatabase);
