-- ============================================================
-- MesaYa — Schema completo
-- Ejecutar en orden en el SQL Editor de Supabase
-- Proyecto: weohpdgxtmuytwjxareq
-- ============================================================

-- ── 1. TABLAS ────────────────────────────────────────────────

create table if not exists public.tables (
  id                 uuid        primary key default gen_random_uuid(),
  name               text        not null,
  capacity           int         not null,
  zone               text        not null,
  status             text        not null default 'available'
                                 check (status in ('available', 'blocked', 'reserved')),
  blocked_until      timestamptz null,
  blocked_by_session text        null
);

create table if not exists public.reservations (
  id                uuid        primary key default gen_random_uuid(),
  table_id          uuid        not null references public.tables(id) on delete cascade,
  guest_name        text        not null,
  guest_email       text        not null,
  guest_phone       text        not null,
  party_size        int         not null,
  date              date        not null,
  time_slot         text        not null,
  status            text        not null default 'confirmed'
                                check (status in ('pending', 'confirmed', 'cancelled')),
  confirmation_code text        not null default upper(substring(gen_random_uuid()::text, 1, 8)),
  created_at        timestamptz default now()
);

-- ── 2. REALTIME ──────────────────────────────────────────────

alter publication supabase_realtime add table public.tables;
alter publication supabase_realtime add table public.reservations;

-- ── 3. RLS — solo lectura para anon ─────────────────────────
-- Toda escritura va por RPC functions (SECURITY DEFINER)

alter table public.tables      enable row level security;
alter table public.reservations enable row level security;

create policy "anon_read_tables"
  on public.tables for select using (true);

create policy "anon_read_reservations"
  on public.reservations for select using (true);

-- ── 4. RPC FUNCTIONS (SECURITY DEFINER) ─────────────────────
-- Corren con privilegios de postgres, bypaseando RLS.
-- El anon key puede llamarlas pero no puede hacer nada
-- que la función no permita explícitamente.

-- 4a. block_table
-- Bloquea una mesa de forma atómica.
-- Un solo UPDATE decide quién gana — imposible tener race condition.
create or replace function public.block_table(p_table_id uuid, p_session_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table         tables%rowtype;
  v_blocked_until timestamptz;
begin
  v_blocked_until := now() + interval '3 minutes';

  update tables set
    status             = 'blocked',
    blocked_until      = v_blocked_until,
    blocked_by_session = p_session_id
  where id = p_table_id
    and status != 'reserved'
    and (
      status = 'available'
      or (status = 'blocked' and blocked_until < now())
      or (status = 'blocked' and blocked_by_session = p_session_id)
    )
  returning * into v_table;

  if not found then
    select * into v_table from tables where id = p_table_id;
    if not found then
      return json_build_object('error', 'Mesa no encontrada');
    elsif v_table.status = 'reserved' then
      return json_build_object('error', 'La mesa ya está reservada');
    else
      return json_build_object('error', 'La mesa está bloqueada por otro usuario');
    end if;
  end if;

  return json_build_object(
    'success',      true,
    'blockedUntil', v_blocked_until,
    'table',        row_to_json(v_table)
  );
end;
$$;

-- 4b. create_reservation
-- Valida propiedad del bloqueo y crea la reserva en una transacción.
-- FOR UPDATE bloquea la fila durante la validación.
create or replace function public.create_reservation(
  p_table_id    uuid,
  p_session_id  text,
  p_guest_name  text,
  p_guest_email text,
  p_guest_phone text,
  p_party_size  int,
  p_date        date,
  p_time_slot   text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table       tables%rowtype;
  v_reservation reservations%rowtype;
begin
  select * into v_table from tables where id = p_table_id for update;

  if not found then
    return json_build_object('error', 'Mesa no encontrada');
  end if;

  if v_table.blocked_by_session is distinct from p_session_id then
    return json_build_object('error', 'No tienes el bloqueo de esta mesa');
  end if;

  if v_table.blocked_until < now() then
    return json_build_object('error', 'El tiempo de bloqueo expiró');
  end if;

  if exists (
    select 1 from reservations
    where table_id  = p_table_id
      and date      = p_date
      and time_slot = p_time_slot
      and status   != 'cancelled'
  ) then
    return json_build_object('error', 'Esta mesa ya tiene una reserva en ese horario');
  end if;

  insert into reservations (
    table_id, guest_name, guest_email, guest_phone,
    party_size, date, time_slot, status
  )
  values (
    p_table_id, p_guest_name, p_guest_email, p_guest_phone,
    p_party_size, p_date, p_time_slot, 'confirmed'
  )
  returning * into v_reservation;

  update tables set
    status             = 'reserved',
    blocked_until      = null,
    blocked_by_session = null
  where id = p_table_id;

  return json_build_object('success', true, 'reservation', row_to_json(v_reservation));
end;
$$;

-- 4c. release_block
-- Solo libera si la sesión es la dueña del bloqueo.
create or replace function public.release_block(p_table_id uuid, p_session_id text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  update tables set
    status             = 'available',
    blocked_until      = null,
    blocked_by_session = null
  where id            = p_table_id
    and blocked_by_session = p_session_id;

  return json_build_object('success', true);
end;
$$;

-- ── 5. PERMISOS DE RPC ───────────────────────────────────────
-- Solo el rol anon puede ejecutar estas funciones (no public genérico)

revoke execute on function public.block_table        from public;
revoke execute on function public.create_reservation  from public;
revoke execute on function public.release_block       from public;

grant  execute on function public.block_table        to anon;
grant  execute on function public.create_reservation  to anon;
grant  execute on function public.release_block       to anon;

-- ── 6. CRON — auto-desbloqueo ────────────────────────────────
-- Libera mesas cuyo bloqueo de usuario expiró (no las del admin)

create extension if not exists pg_cron;

create or replace function public.unblock_expired_tables()
returns void
language sql
security definer
set search_path = public
as $$
  update tables set
    status             = 'available',
    blocked_until      = null,
    blocked_by_session = null
  where status         = 'blocked'
    and blocked_until  < now()
    and blocked_by_session != 'admin';
$$;

select cron.schedule(
  'unblock-expired-tables',
  '* * * * *',
  'select public.unblock_expired_tables()'
);

-- ── 7. SEED — 12 mesas ───────────────────────────────────────

insert into public.tables (name, capacity, zone) values
  ('Mesa 1',  2, 'Terraza'),
  ('Mesa 2',  2, 'Terraza'),
  ('Mesa 3',  4, 'Terraza'),
  ('Mesa 4',  4, 'Terraza'),
  ('Mesa 5',  2, 'Salón Principal'),
  ('Mesa 6',  4, 'Salón Principal'),
  ('Mesa 7',  4, 'Salón Principal'),
  ('Mesa 8',  6, 'Salón Principal'),
  ('Mesa 9',  2, 'Barra'),
  ('Mesa 10', 2, 'Barra'),
  ('Mesa 11', 6, 'Privado'),
  ('Mesa 12', 8, 'Privado');
