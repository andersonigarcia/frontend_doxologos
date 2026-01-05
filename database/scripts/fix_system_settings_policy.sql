-- Fix RLS policies for system_settings to use role-based access instead of hardcoded email

-- Drop restrictive email-based policies
drop policy if exists "Admins can insert settings" on public.system_settings;
drop policy if exists "Admins can update settings" on public.system_settings;
drop policy if exists "Admins can delete settings" on public.system_settings;

-- Create new role-based policies (checking user_metadata)
create policy "Admins can insert settings"
    on public.system_settings for insert
    with check (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

create policy "Admins can update settings"
    on public.system_settings for update
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

create policy "Admins can delete settings"
    on public.system_settings for delete
    using (
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Ensure read access is still public (already exists, but good to verify)
-- drop policy if exists "Settings are viewable by everyone" on public.system_settings;
-- create policy "Settings are viewable by everyone" on public.system_settings for select using (true);
