-- QRLink Pro schema (safe to re-run). Run the whole file in Supabase > SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade default auth.uid(),
  slug text unique,
  name text not null check (char_length(name) between 1 and 80),
  bio text default '' check (char_length(bio) <= 180),
  email text default '',
  phone text default '',
  links jsonb not null default '[]'::jsonb,
  photo_url text default '',
  qr_dark text not null default '#101827',
  qr_light text not null default '#ffffff',
  theme text not null default 'midnight' check (theme in ('midnight','violet','ocean','minimal')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.cards add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table public.cards add column if not exists slug text;
alter table public.cards add column if not exists qr_dark text not null default '#101827';
alter table public.cards add column if not exists qr_light text not null default '#ffffff';
alter table public.cards add column if not exists theme text not null default 'midnight';
alter table public.cards add column if not exists is_active boolean not null default true;
alter table public.cards add column if not exists updated_at timestamptz not null default now();
create unique index if not exists cards_slug_key on public.cards (slug);
alter table public.cards drop constraint if exists cards_slug_format;
alter table public.cards add constraint cards_slug_format check (slug is null or slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$');

create table if not exists public.events (
  id bigint generated always as identity primary key,
  card_id uuid not null references public.cards(id) on delete cascade,
  type text not null check (type in ('view','click')),
  label text default '',
  device text default '',
  created_at timestamptz not null default now()
);
create index if not exists events_card_idx on public.events (card_id, created_at desc);

alter table public.cards enable row level security;
alter table public.events enable row level security;

-- CARDS: public can read active cards; owners manage their own.
drop policy if exists "Public can read cards" on public.cards;
drop policy if exists "Anyone can create cards" on public.cards;
drop policy if exists "read active or own cards" on public.cards;
drop policy if exists "owner inserts" on public.cards;
drop policy if exists "owner updates" on public.cards;
drop policy if exists "owner deletes" on public.cards;
create policy "read active or own cards" on public.cards for select to anon, authenticated using (is_active or user_id = auth.uid());
create policy "owner inserts" on public.cards for insert to authenticated with check (user_id = auth.uid());
create policy "owner updates" on public.cards for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner deletes" on public.cards for delete to authenticated using (user_id = auth.uid());

-- EVENTS: only the card owner can read analytics. Writes go through track_event().
drop policy if exists "owner reads events" on public.events;
create policy "owner reads events" on public.events for select to authenticated
  using (exists (select 1 from public.cards c where c.id = card_id and c.user_id = auth.uid()));

create or replace function public.track_event(p_card uuid, p_type text, p_label text default '', p_device text default '')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_type not in ('view','click') then return; end if;
  if not exists (select 1 from public.cards where id = p_card and is_active) then return; end if;
  insert into public.events(card_id, type, label, device)
  values (p_card, p_type, left(coalesce(p_label,''),60), left(coalesce(p_device,''),20));
end $$;

create or replace function public.slug_available(p_slug text)
returns boolean language sql security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9][a-z0-9_-]{2,29}$'
     and p_slug not in ('admin','api','login','dashboard','create','card','u','www','app','support','help','terms','privacy')
     and not exists (select 1 from public.cards where slug = p_slug);
$$;
grant execute on function public.track_event(uuid,text,text,text) to anon, authenticated;
grant execute on function public.slug_available(text) to anon, authenticated;

-- Abuse control: max 5 cards per account, and keep updated_at fresh.
create or replace function public.cards_guard() returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' and (select count(*) from public.cards where user_id = new.user_id) >= 5 then
    raise exception 'Card limit reached (5 per account)';
  end if;
  new.updated_at = now();
  return new;
end $$;
drop trigger if exists cards_guard_trg on public.cards;
create trigger cards_guard_trg before insert or update on public.cards for each row execute function public.cards_guard();

-- PHOTOS: 2 MB, images only, upload only into your own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos','profile-photos',true,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true, file_size_limit=2097152, allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Public can view profile photos" on storage.objects;
drop policy if exists "Anyone can upload profile photos" on storage.objects;
drop policy if exists "users upload own photos" on storage.objects;
drop policy if exists "users update own photos" on storage.objects;
drop policy if exists "users delete own photos" on storage.objects;
create policy "Public can view profile photos" on storage.objects for select to anon, authenticated using (bucket_id = 'profile-photos');
create policy "users upload own photos" on storage.objects for insert to authenticated with check (bucket_id='profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users update own photos" on storage.objects for update to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "users delete own photos" on storage.objects for delete to authenticated using (bucket_id='profile-photos' and (storage.foldername(name))[1] = auth.uid()::text);
