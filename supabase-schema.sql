-- Run this in your Supabase SQL Editor
-- This script safely drops existing tables (if any) and recreates them cleanly.
-- WARNING: This will delete existing data in these tables. If you want to keep your data, 
-- do not run the DROP TABLE commands.

-- 1. Drop existing tables (optional, only if you want a completely fresh start)
DROP TABLE IF EXISTS public.game_sessions CASCADE;
DROP TABLE IF EXISTS public.words CASCADE;
DROP TABLE IF EXISTS public.access_codes CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. Create tables
CREATE TABLE public.profiles (
  id uuid references auth.users(id) on delete cascade not null primary key,
  role text not null default 'student',
  name text,
  access_code text,
  high_score integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.access_codes (
  id uuid default gen_random_uuid() primary key,
  code text not null,
  name text,
  grade_level text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.words (
  id uuid default gen_random_uuid() primary key,
  word text not null,
  translation text,
  definition text,
  example text,
  subject text,
  level text,
  teacher_id uuid references auth.users(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

CREATE TABLE public.game_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  game text not null,
  score integer default 0,
  max_score integer default 0,
  config_id text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Turn off RLS for simplicity (or configure as needed)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.words DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions DISABLE ROW LEVEL SECURITY;
