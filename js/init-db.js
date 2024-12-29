import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to generate random 2D number
const generateRandom2D = () => String(Math.floor(Math.random() * 100)).padStart(2, '0');

// Function to generate random 3D number
const generateRandom3D = () => String(Math.floor(Math.random() * 1000)).padStart(3, '0');

// Function to generate sample 2D data
async function generate2DData() {
    const today = new Date();
    const data = [];

    // Generate data for the last 30 days
    for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        // Morning draw (11:00 AM)
        data.push({
            date: dateStr,
            time: '11:00',
            number: generateRandom2D(),
            set: Math.floor(Math.random() * 1000) + 500,
            value: Math.floor(Math.random() * 100000) + 50000
        });

        // Evening draw (4:30 PM)
        data.push({
            date: dateStr,
            time: '16:30',
            number: generateRandom2D(),
            set: Math.floor(Math.random() * 1000) + 500,
            value: Math.floor(Math.random() * 100000) + 50000
        });
    }

    // Insert data into 2d_results table
    const { data: result, error } = await supabase
        .from('"2d_results"')
        .insert(data);

    if (error) {
        console.error('Error inserting 2D data:', error);
    } else {
        console.log('Successfully inserted 2D data');
    }
}

// Function to generate sample 3D data
async function generate3DData() {
    const today = new Date();
    const data = [];

    // Generate data for the last 60 days (3D draws are less frequent)
    for (let i = 0; i < 60; i += 15) { // Every 15 days
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        data.push({
            date: dateStr,
            number: generateRandom3D(),
            set: Math.floor(Math.random() * 1000) + 200,
            value: Math.floor(Math.random() * 1000000) + 100000
        });
    }

    // Insert data into 3d_results table
    const { data: result, error } = await supabase
        .from('"3d_results"')
        .insert(data);

    if (error) {
        console.error('Error inserting 3D data:', error);
    } else {
        console.log('Successfully inserted 3D data');
    }
}

// Initialize database with sample data
async function initializeDatabase() {
    console.log('Starting database initialization...');
    
    try {
        await generate2DData();
        await generate3DData();
        console.log('Database initialization completed successfully!');
    } catch (error) {
        console.error('Error during database initialization:', error);
    }
}

// Run the initialization
initializeDatabase();
