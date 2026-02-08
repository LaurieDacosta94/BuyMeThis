-- 1. Reset/Create Public Schema
create schema if not exists public;
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;

-- 2. Create Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  handle text,
  bio text,
  avatar_url text,
  location text,
  trust_score integer default 50,
  badges jsonb default '[]'::jsonb,
  projects text[] default '{}',
  hobbies text[] default '{}',
  created_at timestamp with time zone default timezone('utc'::text, now())
);
alter table public.profiles enable row level security;

do $$ begin
  drop policy if exists "Public profiles access" on public.profiles;
  create policy "Public profiles access" on public.profiles for select using (true);
  
  drop policy if exists "Users update own profile" on public.profiles;
  create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
  
  drop policy if exists "Users insert own profile" on public.profiles;
  create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
end $$;

-- 3. Create Requests Table
create table if not exists public.requests (
  id text primary key,
  requester_id uuid references public.profiles(id),
  title text,
  reason text,
  category text,
  status text,
  location text,
  created_at timestamp with time zone,
  coordinates_lat float,
  coordinates_lng float,
  shipping_address text,
  fulfiller_id uuid references public.profiles(id),
  tracking_number text,
  proof_of_purchase_image text,
  gift_message text,
  thank_you_message text,
  receipt_verification_status text,
  enriched_data jsonb,
  comments jsonb default '[]'::jsonb
);
alter table public.requests enable row level security;

do $$ begin
  drop policy if exists "Public requests access" on public.requests;
  create policy "Public requests access" on public.requests for select using (true);

  drop policy if exists "Users insert requests" on public.requests;
  create policy "Users insert requests" on public.requests for insert with check (auth.uid() = requester_id);

  drop policy if exists "Users update own requests" on public.requests;
  create policy "Users update own requests" on public.requests for update using (auth.uid() = requester_id);

  drop policy if exists "Anyone can update requests" on public.requests;
  create policy "Anyone can update requests" on public.requests for update using (true);
end $$;

-- 4. Create Forum Tables
create table if not exists public.forum_threads (
  id text primary key,
  author_id uuid references public.profiles(id),
  title text,
  content text,
  category text,
  created_at timestamp with time zone,
  views integer default 0,
  likes text[] default '{}'
);
alter table public.forum_threads enable row level security;

do $$ begin
  drop policy if exists "Public forum access" on public.forum_threads;
  create policy "Public forum access" on public.forum_threads for select using (true);

  drop policy if exists "Users insert threads" on public.forum_threads;
  create policy "Users insert threads" on public.forum_threads for insert with check (auth.uid() = author_id);
end $$;

create table if not exists public.forum_replies (
  id text primary key,
  thread_id text references public.forum_threads(id),
  author_id uuid references public.profiles(id),
  content text,
  created_at timestamp with time zone
);
alter table public.forum_replies enable row level security;

do $$ begin
  drop policy if exists "Public replies access" on public.forum_replies;
  create policy "Public replies access" on public.forum_replies for select using (true);

  drop policy if exists "Users insert replies" on public.forum_replies;
  create policy "Users insert replies" on public.forum_replies for insert with check (auth.uid() = author_id);
end $$;

-- 5. Create Notifications Table
create table if not exists public.notifications (
  id text primary key,
  user_id uuid references public.profiles(id),
  message text,
  type text,
  is_read boolean default false,
  created_at timestamp with time zone,
  related_request_id text
);
alter table public.notifications enable row level security;

do $$ begin
  drop policy if exists "Users see own notifications" on public.notifications;
  create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);

  drop policy if exists "System insert notifications" on public.notifications;
  create policy "System insert notifications" on public.notifications for insert with check (true);

  drop policy if exists "Users update own notifications" on public.notifications;
  create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
end $$;

-- 6. Storage Setup
insert into storage.buckets (id, name, public) 
values ('images', 'images', true)
on conflict (id) do nothing;

-- Storage policies
do $$ begin
  drop policy if exists "Public Access" on storage.objects;
  create policy "Public Access" on storage.objects for select using ( bucket_id = 'images' );

  drop policy if exists "Authenticated Insert" on storage.objects;
  create policy "Authenticated Insert" on storage.objects for insert with check ( bucket_id = 'images' and auth.role() = 'authenticated' );
exception when others then
  raise notice 'Storage policy creation skipped or failed (likely permissions or already exists): %', SQLERRM;
end $$;
