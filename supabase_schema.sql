-- Create profiles table (extends auth.users)
create table public.profiles (
  id uuid references auth.users not null primary key,
  email text,
  role text default 'pending' check (role in ('pending', 'user', 'admin')),
  created_at timestamptz default now()
);

-- Enable RLS for profiles
alter table public.profiles enable row level security;

-- Create profiles policy
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create books table
create table public.books (
  id uuid default gen_random_uuid() primary key,
  isbn text,
  title text not null,
  author text,
  price numeric not null,
  stock int default 0,
  language text,
  type text,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- Enable RLS for books
alter table public.books enable row level security;

-- Books policies
create policy "Books are viewable by everyone."
  on books for select
  using ( true );

create policy "Allow all access for development."
  on books for all
  using ( true )
  with check ( true );

-- COMMENTED OUT STRICT POLICIES FOR DEV
-- create policy "Authenticated users can insert books."
--   on books for insert
--   with check ( auth.role() = 'authenticated' );

-- create policy "Authenticated users can update books."
--   on books for update
--   using ( auth.role() = 'authenticated' );

-- Create sales table
create table public.sales (
  id uuid default gen_random_uuid() primary key,
  total_amount numeric not null,
  discount_applied numeric default 0,
  sold_by uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Create sale_items table
create table public.sale_items (
  id uuid default gen_random_uuid() primary key,
  sale_id uuid references public.sales(id) not null,
  book_id uuid references public.books(id) not null,
  quantity int not null,
  price_at_sale numeric not null
);

-- Create offers table
create table public.offers (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  discount_percentage numeric not null,
  start_date timestamptz,
  end_date timestamptz,
  is_active boolean default true,
  created_at timestamptz default now()
);

-- Trigger to handle new user signup (optional but recommended)
-- This assumes you want to automatically create a profile entry when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'pending');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
