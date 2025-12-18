-- Add new columns to books table if they don't exist
alter table public.books add column if not exists language text;
alter table public.books add column if not exists type text;
alter table public.books add column if not exists thumbnail_url text;

-- Update RLS Policies for Books to be open for development

-- First, drop existing policies to avoid conflicts
drop policy if exists "Books are viewable by everyone." on public.books;
drop policy if exists "Authenticated users can insert books." on public.books;
drop policy if exists "Authenticated users can update books." on public.books;
drop policy if exists "Allow all access for development." on public.books;

-- Re-create the open policy
create policy "Allow all access for development."
  on public.books for all
  using ( true )
  with check ( true );

-- Ensure RLS is enabled (idempotent)
alter table public.books enable row level security;
