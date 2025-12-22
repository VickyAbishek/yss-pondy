-- Add this policy to allow admins to update any profile
-- Run this in Supabase SQL Editor

create policy "Admins can update any profile."
  on profiles for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
