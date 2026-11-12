-- Planes de aplicación de cada cuenta (12-11-2026, pedido de Cristóbal: «cada persona tiene que poder ver el plan que
-- ha guardado en sus perfiles»). Una fila por persona con todos sus planes, en el mismo formato que guarda el sitio en
-- el equipo (assets/js/plan.js): { version, activo, planes, borrados }. Cada persona lee y escribe solo su fila.
create table if not exists public.planes_usuario (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  datos jsonb not null,
  actualizado timestamptz not null default now(),
  constraint planes_usuario_datos_objeto check (jsonb_typeof(datos) = 'object'),
  constraint planes_usuario_tamano check (pg_column_size(datos) < 1500000)
);

alter table public.planes_usuario enable row level security;

revoke all on public.planes_usuario from anon, authenticated;
grant select, insert, update on public.planes_usuario to authenticated;

create policy planes_usuario_leer on public.planes_usuario
  for select to authenticated using (user_id = (select auth.uid()));
create policy planes_usuario_crear on public.planes_usuario
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy planes_usuario_cambiar on public.planes_usuario
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- La fecha del último cambio la pone la base.
create or replace function public.planes_usuario_fecha() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.actualizado := now();
  return new;
end $$;

drop trigger if exists planes_usuario_fecha on public.planes_usuario;
create trigger planes_usuario_fecha before insert or update on public.planes_usuario
  for each row execute function public.planes_usuario_fecha();

revoke all on function public.planes_usuario_fecha() from public, anon, authenticated;
