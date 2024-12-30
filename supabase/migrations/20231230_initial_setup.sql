-- Create tables for the 2D3D lottery application

-- Drop existing tables if they exist
drop table if exists public.transactions;
drop table if exists public.deposits;
drop table if exists public.bets;
drop table if exists public.results_3d;
drop table if exists public.results_2d;
drop table if exists public.sessions;
drop table if exists public.users;
drop table if exists public.admin_users;

-- Create users table
create table public.users (
    id serial primary key,
    name text not null,
    balance decimal(12,2) default 0.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create admin users table
create table public.admin_users (
    id serial primary key,
    username text not null unique,
    password_hash text not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create sessions table
create table public.sessions (
    id serial primary key,
    type text not null check (type in ('2D', '3D', 'THAI', 'LAO')),
    date date not null,
    time time,
    result text,
    status text default 'active' check (status in ('active', 'closed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create 2D results table
create table public.results_2d (
    id serial primary key,
    number text not null,
    date date not null,
    time time not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create 3D results table
create table public.results_3d (
    id serial primary key,
    number text not null,
    date date not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create bets table
create table public.bets (
    id serial primary key,
    user_id integer references public.users(id),
    type text not null check (type in ('2D', '3D', 'THAI', 'LAO')),
    number text not null,
    amount decimal(10,2) not null,
    bet_method text not null check (bet_method in ('R', 'P', 'B', 'first2', 'last2', 'first3', 'last3')),
    date date not null,
    time time,
    status text default 'pending' check (status in ('pending', 'won', 'lost')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create deposits table
create table public.deposits (
    id serial primary key,
    user_id integer references public.users(id),
    amount decimal(10,2) not null,
    payment_method text not null check (payment_method in ('kpay', 'wavepay', 'cbpay', 'ayapay')),
    phone_number text not null,
    proof_image text not null,
    status text default 'pending' check (status in ('pending', 'approved', 'rejected')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create transactions table
create table public.transactions (
    id serial primary key,
    user_id integer references public.users(id),
    type text not null check (type in ('deposit', 'withdraw', 'bet', 'win')),
    amount decimal(10,2) not null,
    reference_id text,
    status text default 'completed' check (status in ('pending', 'completed', 'failed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default user
insert into public.users (name, balance) values ('Default User', 10000.00);

-- Insert default admin user (username: admin, password: admin123)
insert into public.admin_users (username, password_hash)
values ('admin', '$2b$10$zGqGMPV8P5B6HHCRFNDZeOQEDr0KX7KF5h8RqMGYKJ1XZz8H5V8Wy');

-- Insert default sessions for today
insert into public.sessions (type, date, time, status)
values 
('2D', current_date, '12:01:00', 'active'),
('2D', current_date, '16:30:00', 'active'),
('3D', current_date, '16:30:00', 'active'),
('THAI', current_date, '16:30:00', 'active'),
('LAO', current_date, '16:30:00', 'active');
