-- Migration: create secure storage for Zoom meeting credentials
-- Adds event_meetings table, sync trigger, and RLS policies so sensitive links
-- no longer need to live in the public eventos table.

begin;

create table if not exists public.event_meetings (
    evento_id uuid primary key references public.eventos(id) on delete cascade,
    meeting_link text not null,
    meeting_password text,
    meeting_id text,
    host_start_url text,
    raw_metadata jsonb,
    created_at timestamptz not null default timezone('utc', now()),
    updated_at timestamptz not null default timezone('utc', now())
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc', now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists event_meetings_set_updated_at on public.event_meetings;
create trigger event_meetings_set_updated_at
before update on public.event_meetings
for each row
execute function public.set_current_timestamp_updated_at();

-- Helper to keep new table in sync while legacy columns still exist
create or replace function public.sync_event_meetings_from_eventos()
returns trigger as $$
begin
    if coalesce(new.meeting_link, new.meeting_password, new.meeting_id, new.meeting_start_url) is null then
        delete from public.event_meetings where evento_id = new.id;
        return new;
    end if;

    insert into public.event_meetings (
        evento_id,
        meeting_link,
        meeting_password,
        meeting_id,
        host_start_url,
        raw_metadata,
        created_at,
        updated_at
    ) values (
        new.id,
        new.meeting_link,
        new.meeting_password,
        new.meeting_id,
        new.meeting_start_url,
        null,
        timezone('utc', now()),
        timezone('utc', now())
    )
    on conflict (evento_id) do update set
        meeting_link = excluded.meeting_link,
        meeting_password = excluded.meeting_password,
        meeting_id = excluded.meeting_id,
        host_start_url = excluded.host_start_url,
        updated_at = timezone('utc', now());

    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists eventos_sync_event_meetings on public.eventos;
create trigger eventos_sync_event_meetings
after insert or update on public.eventos
for each row
execute function public.sync_event_meetings_from_eventos();

-- Seed new table with existing meetings
insert into public.event_meetings (evento_id, meeting_link, meeting_password, meeting_id, host_start_url)
select id, meeting_link, meeting_password, meeting_id, meeting_start_url
from public.eventos
where meeting_link is not null
on conflict (evento_id) do update set
    meeting_link = excluded.meeting_link,
    meeting_password = excluded.meeting_password,
    meeting_id = excluded.meeting_id,
    host_start_url = excluded.host_start_url;

alter table public.event_meetings enable row level security;

-- Allow service role (and other trusted backend roles) full access
create policy event_meetings_backend_rw on public.event_meetings
for all
using ((auth.jwt()->>'role') in ('service_role'))
with check ((auth.jwt()->>'role') in ('service_role'));

-- Allow admins to read meeting data from dashboards
create policy event_meetings_admin_select on public.event_meetings
for select
using (coalesce(auth.jwt()->>'role', '') in ('admin', 'superadmin', 'service_role'));

-- Allow confirmed attendees to read their meeting link only
create policy event_meetings_confirmed_attendee_select on public.event_meetings
for select
using (
    auth.uid() is not null
    and exists (
        select 1
        from public.inscricoes_eventos ie
        where ie.evento_id = event_meetings.evento_id
          and ie.user_id = auth.uid()
          and ie.status = 'confirmed'
    )
);

commit;
