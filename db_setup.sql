-- RESET DATABASE (Drop all existing tables)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS forum_replies CASCADE;
DROP TABLE IF EXISTS forum_threads CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 1. Create Profiles Table
-- Since we are not using Supabase Auth, id is just a text or uuid string
create table profiles (
  id text primary key,
  display_name text,
  handle text,
  bio text,
  avatar_url text,
  location text,
  trust_score integer default 50,
  badges jsonb default '[]'::jsonb,
  projects text[] default '{}',
  hobbies text[] default '{}',
  coordinates_lat float,
  coordinates_lng float,
  created_at timestamp with time zone default now()
);

-- 2. Create Requests Table
create table requests (
  id text primary key,
  requester_id text references profiles(id),
  title text,
  reason text,
  category text,
  status text,
  location text,
  created_at timestamp with time zone,
  coordinates_lat float,
  coordinates_lng float,
  shipping_address text,
  fulfiller_id text references profiles(id),
  tracking_number text,
  proof_of_purchase_image text,
  gift_message text,
  thank_you_message text,
  receipt_verification_status text,
  enriched_data jsonb,
  candidates text[] default '{}',
  comments jsonb default '[]'::jsonb
);

-- 3. Create Forum Tables
create table forum_threads (
  id text primary key,
  author_id text references profiles(id),
  title text,
  content text,
  category text,
  created_at timestamp with time zone,
  views integer default 0,
  likes text[] default '{}'
);

create table forum_replies (
  id text primary key,
  thread_id text references forum_threads(id),
  author_id text references profiles(id),
  content text,
  created_at timestamp with time zone
);

-- 4. Create Notifications Table
create table notifications (
  id text primary key,
  user_id text references profiles(id),
  message text,
  type text,
  is_read boolean default false,
  created_at timestamp with time zone,
  related_request_id text
);