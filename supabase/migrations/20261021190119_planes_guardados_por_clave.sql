-- Planes de aplicación guardados para una persona, sin cuentas: se leen solo con su clave secreta
-- (link personal #/plan?abrir=<clave>) mediante la función plan_guardado. La tabla no se puede leer
-- ni listar con la llave pública. Primer uso: plan fitosanitario 26-27 de Cristóbal (lechuga y
-- cucurbitáceas semillero), sin precios.
create table public.planes_guardados (
  clave text primary key check (length(clave) >= 32),
  descripcion text not null,
  datos jsonb not null check (jsonb_typeof(datos -> 'planes') = 'array'),
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
comment on table public.planes_guardados is
  'Planes de aplicación guardados para una persona. Se leen solo con la clave (función plan_guardado). Privada.';
alter table public.planes_guardados enable row level security;
revoke all on public.planes_guardados from anon, authenticated;

create or replace function public.plan_guardado(p_clave text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select datos from public.planes_guardados where clave = p_clave
$$;
comment on function public.plan_guardado(text) is
  'Devuelve los planes guardados para esa clave (link personal). Sin la clave no se puede listar nada.';
revoke all on function public.plan_guardado(text) from public;
grant execute on function public.plan_guardado(text) to anon, authenticated;
