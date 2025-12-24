-- Create a table for global system settings
create table if not exists public.system_settings (
    key text primary key,
    value jsonb not null,
    description text,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_by uuid references auth.users(id)
);

-- Enable RLS
alter table public.system_settings enable row level security;

-- Policy: Everyone can read settings (public)
create policy "Settings are viewable by everyone"
    on public.system_settings for select
    using (true);

-- Policy: Only specific admin email can insert/update/delete
-- This avoids dependency on specific profile tables that may not exist or be configured

create policy "Admins can insert settings"
    on public.system_settings for insert
    with check (
        (select email from auth.users where id = auth.uid()) = 'adm@doxologos.com.br'
    );

create policy "Admins can update settings"
    on public.system_settings for update
    using (
        (select email from auth.users where id = auth.uid()) = 'adm@doxologos.com.br'
    );

create policy "Admins can delete settings"
    on public.system_settings for delete
    using (
        (select email from auth.users where id = auth.uid()) = 'adm@doxologos.com.br'
    );

-- Insert default setting for Lead Magnet
insert into public.system_settings (key, value, description)
values (
    'lead_magnet_enabled', 
    'true'::jsonb, 
    'Enable or disable the Anxiety Guide Lead Magnet modal on the home page'
)
on conflict (key) do nothing;
