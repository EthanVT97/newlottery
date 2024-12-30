// config.js - Application configuration
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.1/+esm';

/**
 * Application settings
 */
export const APP_CONFIG = {
    name: 'Myanmar 2D3D',
    version: '1.0.3',
    locale: 'my-MM',
    currency: 'MMK',
    timezone: 'Asia/Yangon',
    defaultUserId: 1
};

/**
 * Supabase Configuration
 */
const SUPABASE_URL = 'https://fikjryqofcauqezmefqr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZpa2pyeXFvZmNhdXFlem1lZnFyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MDM5MjQ4NjQsImV4cCI6MjAxOTUwMDg2NH0.vFCkc7lzVaMZihd-lOb4ywbFHJO2kItAfRDyRaETAnc';

// Initialize Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Game settings
 */
export const GAME_CONFIG = {
    '2D': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'R': { name: 'ရိုးရိုး', multiplier: 85 },
            'P': { name: 'ပါဝါ', multiplier: 80 },
            'B': { name: 'ဘရိတ်', multiplier: 75 },
        },
        drawTimes: ['12:01', '16:30'],
        numberLength: 2
    },
    '3D': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'R': { name: 'ရိုးရိုး', multiplier: 500 },
            'P': { name: 'ပါဝါ', multiplier: 450 },
            'B': { name: 'ဘရိတ်', multiplier: 400 },
        },
        drawTimes: ['16:30'],
        numberLength: 3
    },
    'THAI': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'first2': { name: 'First 2', multiplier: 85 },
            'last2': { name: 'Last 2', multiplier: 85 },
            'first3': { name: 'First 3', multiplier: 500 },
            'last3': { name: 'Last 3', multiplier: 500 }
        },
        drawTimes: ['16:30'],
        numberLength: 6
    },
    'LAO': {
        minBet: 100,
        maxBet: 50000,
        betMethods: {
            'first2': { name: 'First 2', multiplier: 85 },
            'last2': { name: 'Last 2', multiplier: 85 },
            'first3': { name: 'First 3', multiplier: 500 },
            'last3': { name: 'Last 3', multiplier: 500 }
        },
        drawTimes: ['16:30'],
        numberLength: 6
    }
};
