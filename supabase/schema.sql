-- =====================================================================
-- Mi Vehículo · Esquema Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → Run
-- =====================================================================

-- ---------- Vehículos ----------
create table if not exists public.vehicles (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  data        jsonb not null default '{}'::jsonb,   -- marca, modelo, placa, tipo, motorización, km inicial, foto, etc.
  deleted     boolean not null default false,       -- borrado suave para sincronizar entre dispositivos
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists vehicles_user_idx on public.vehicles (user_id);
-- Un propietario (data->>'ownerId' / data->>'ownerName') puede tener 1 o más vehículos
create index if not exists vehicles_owner_idx on public.vehicles (user_id, (data->>'ownerId'));

-- ---------- Registros (combustible, mantenimientos, revisiones, documentos, comparendos, lavadas, gastos) ----------
create table if not exists public.records (
  id          text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  vehicle_id  text not null references public.vehicles (id) on delete cascade,
  module      text not null check (module in ('fuel','maintenance','checks','documents','fines','washes','expenses')),
  data        jsonb not null default '{}'::jsonb,   -- fecha, km, valores, gps {lat,lng,acc}, etc.
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);
create index if not exists records_user_idx    on public.records (user_id);
create index if not exists records_vehicle_idx on public.records (vehicle_id, module);
create index if not exists records_date_idx    on public.records ((data->>'date'));

-- ---------- Ajustes por usuario ----------
create table if not exists public.user_settings (
  user_id     uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- ---------- Seguridad: cada usuario solo ve y edita lo suyo ----------
alter table public.vehicles      enable row level security;
alter table public.records       enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "vehicles_own" on public.vehicles;
create policy "vehicles_own" on public.vehicles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "records_own" on public.records;
create policy "records_own" on public.records
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.user_id = (select auth.uid()))
  );

drop policy if exists "settings_own" on public.user_settings;
create policy "settings_own" on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------- Vista útil para reportes (opcional) ----------
create or replace view public.v_fuel with (security_invoker = true) as
select r.id, r.user_id, r.vehicle_id,
       (r.data->>'date')::date            as fecha,
       (r.data->>'km')::numeric           as km,
       r.data->>'fuelType'                as tipo,
       (r.data->>'quantity')::numeric     as cantidad,
       r.data->>'unit'                    as unidad,
       (r.data->>'total')::numeric        as total,
       (r.data->'gps'->>'lat')::numeric   as lat,
       (r.data->'gps'->>'lng')::numeric   as lng
from public.records r
where r.module = 'fuel' and not r.deleted;

-- ---------- Vehículos por propietario (opcional) ----------
create or replace view public.v_owners with (security_invoker = true) as
select user_id,
       coalesce(nullif(data->>'ownerId', ''), nullif(data->>'ownerName', ''), 'Sin propietario') as propietario_id,
       max(data->>'ownerName') as propietario,
       count(*)                as vehiculos,
       array_agg(coalesce(data->>'plate', id) order by created_at) as placas
from public.vehicles
where not deleted
group by 1, 2;
