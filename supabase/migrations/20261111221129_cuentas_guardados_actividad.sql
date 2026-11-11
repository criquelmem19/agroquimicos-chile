-- Cuentas, productos guardados y actividad del sitio (contrato: docs/cuentas.md, sección «Base»).
-- Solo crea objetos nuevos; no toca nada existente.

-- Productos guardados por cada persona
create table public.productos_guardados (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  creado timestamptz not null default now(),
  primary key (user_id, product_id)
);
create index productos_guardados_product_idx on public.productos_guardados (product_id);
alter table public.productos_guardados enable row level security;
revoke all on public.productos_guardados from anon, authenticated;
grant select, insert, delete on public.productos_guardados to authenticated;
create policy guardados_ver on public.productos_guardados for select to authenticated
  using (user_id = (select auth.uid()));
create policy guardados_agregar on public.productos_guardados for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy guardados_quitar on public.productos_guardados for delete to authenticated
  using (user_id = (select auth.uid()));

-- Administradores (se marcan por user_id; sin acceso desde la API)
create table public.administradores (
  user_id uuid primary key references auth.users (id) on delete cascade,
  creado timestamptz not null default now()
);
alter table public.administradores enable row level security;
revoke all on public.administradores from anon, authenticated;

-- Actividad del sitio (sin datos personales; dispositivo = id al azar del equipo)
create table public.actividad (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  tipo text not null,
  user_id uuid references auth.users (id) on delete set null,
  dispositivo uuid,
  ruta text,
  producto_id uuid references public.products (id) on delete set null,
  detalle text
);
create index actividad_creado_idx on public.actividad (creado);
create index actividad_dispositivo_idx on public.actividad (dispositivo, creado);
create index actividad_user_idx on public.actividad (user_id, creado);
alter table public.actividad enable row level security;
revoke all on public.actividad from anon, authenticated;

-- ¿Quien llama es administrador?
create function public.es_admin() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.administradores a where a.user_id = (select auth.uid()));
$$;

-- Anota un evento; nunca falla por datos malos y tiene topes contra abuso
create function public.registrar_evento(
  p_tipo text, p_ruta text default null, p_producto uuid default null,
  p_detalle text default null, p_dispositivo uuid default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_producto uuid;
begin
  if p_tipo is null or p_tipo not in
     ('visita','busqueda','producto','etiqueta','guardar','quitar','plan','registro','ingreso') then
    return;
  end if;
  if (select count(*) from public.actividad where creado > now() - interval '24 hours') >= 20000 then
    return;
  end if;
  if p_dispositivo is not null
     and (select count(*) from public.actividad
          where dispositivo = p_dispositivo and creado > now() - interval '1 minute') >= 60 then
    return;
  end if;
  if p_producto is not null then
    select p.id into v_producto from public.products p where p.id = p_producto;
  end if;
  insert into public.actividad (tipo, user_id, dispositivo, ruta, producto_id, detalle)
  values (p_tipo, (select auth.uid()), p_dispositivo, left(p_ruta, 60), v_producto, left(p_detalle, 200));
exception when others then
  return;
end;
$$;

-- Panel del administrador (días según la hora de Chile)
create function public.admin_panel() returns jsonb
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_hoy date := (now() at time zone 'America/Santiago')::date;
  v jsonb;
begin
  if not public.es_admin() then
    raise exception 'solo para el administrador' using errcode = '42501';
  end if;

  with ev as (
    select a.*, (a.creado at time zone 'America/Santiago')::date as dia,
           coalesce(a.user_id::text, a.dispositivo::text) as persona
    from public.actividad a
    where a.creado >= now() - interval '40 days'
  ),
  dias as (
    select d::date as dia from generate_series(v_hoy - 29, v_hoy, interval '1 day') d
  )
  select jsonb_build_object(
    'generado', now(),
    'totales', jsonb_build_object(
      'usuarios', (select count(*) from auth.users),
      'usuarios_7d', (select count(*) from auth.users u
                      where (u.created_at at time zone 'America/Santiago')::date >= v_hoy - 6),
      'guardados', (select count(*) from public.productos_guardados),
      'usuarios_con_guardados', (select count(distinct g.user_id) from public.productos_guardados g),
      'visitas_hoy', (select count(*) from ev where tipo = 'visita' and dia = v_hoy),
      'visitas_7d', (select count(*) from ev where tipo = 'visita' and dia >= v_hoy - 6),
      'visitas_30d', (select count(*) from ev where tipo = 'visita' and dia >= v_hoy - 29),
      'personas_hoy', (select count(distinct persona) from ev where dia = v_hoy),
      'personas_7d', (select count(distinct persona) from ev where dia >= v_hoy - 6),
      'personas_30d', (select count(distinct persona) from ev where dia >= v_hoy - 29)
    ),
    'por_dia', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'dia', d.dia,
        'visitas', (select count(*) from ev where ev.dia = d.dia and ev.tipo = 'visita'),
        'personas', (select count(distinct ev.persona) from ev where ev.dia = d.dia),
        'busquedas', (select count(*) from ev where ev.dia = d.dia and ev.tipo = 'busqueda'),
        'registros', (select count(*) from ev where ev.dia = d.dia and ev.tipo = 'registro')
      ) order by d.dia), '[]'::jsonb)
      from dias d
    ),
    'usuarios', (
      select coalesce(jsonb_agg(t.x order by t.ord desc), '[]'::jsonb) from (
        select u.created_at as ord, jsonb_build_object(
          'id', u.id, 'correo', u.email, 'creado', u.created_at, 'ultimo_ingreso', u.last_sign_in_at,
          'guardados', (select count(*) from public.productos_guardados g where g.user_id = u.id),
          'eventos_30d', (select count(*) from ev where ev.user_id = u.id and ev.dia >= v_hoy - 29),
          'admin', exists (select 1 from public.administradores ad where ad.user_id = u.id)
        ) as x
        from auth.users u order by u.created_at desc limit 500
      ) t
    ),
    'mas_guardados', (
      select coalesce(jsonb_agg(jsonb_build_object('producto_id', t.product_id, 'nombre', t.nombre, 'n', t.n)
                                order by t.n desc, t.nombre), '[]'::jsonb)
      from (select g.product_id, p.commercial_name::text as nombre, count(*) as n
            from public.productos_guardados g join public.products p on p.id = g.product_id
            group by g.product_id, p.commercial_name order by count(*) desc, p.commercial_name::text limit 20) t
    ),
    'mas_vistos', (
      select coalesce(jsonb_agg(jsonb_build_object('producto_id', t.producto_id, 'nombre', t.nombre, 'n', t.n)
                                order by t.n desc, t.nombre), '[]'::jsonb)
      from (select e.producto_id, p.commercial_name::text as nombre, count(*) as n
            from ev e join public.products p on p.id = e.producto_id
            where e.tipo = 'producto' and e.dia >= v_hoy - 29
            group by e.producto_id, p.commercial_name order by count(*) desc, p.commercial_name::text limit 20) t
    ),
    'etiquetas', (
      select coalesce(jsonb_agg(jsonb_build_object('producto_id', t.producto_id, 'nombre', t.nombre, 'n', t.n)
                                order by t.n desc, t.nombre), '[]'::jsonb)
      from (select e.producto_id, p.commercial_name::text as nombre, count(*) as n
            from ev e join public.products p on p.id = e.producto_id
            where e.tipo = 'etiqueta' and e.dia >= v_hoy - 29
            group by e.producto_id, p.commercial_name order by count(*) desc, p.commercial_name::text limit 20) t
    ),
    'busquedas', (
      select coalesce(jsonb_agg(jsonb_build_object('texto', t.texto, 'n', t.n) order by t.n desc, t.texto), '[]'::jsonb)
      from (select lower(btrim(e.detalle)) as texto, count(*) as n
            from ev e
            where e.tipo = 'busqueda' and e.dia >= v_hoy - 29 and btrim(coalesce(e.detalle, '')) <> ''
            group by lower(btrim(e.detalle)) order by count(*) desc, lower(btrim(e.detalle)) limit 30) t
    ),
    'secciones', (
      select coalesce(jsonb_agg(jsonb_build_object('ruta', t.ruta, 'n', t.n) order by t.n desc, t.ruta), '[]'::jsonb)
      from (select e.ruta, count(*) as n from ev e
            where e.tipo = 'visita' and e.dia >= v_hoy - 29 and e.ruta is not null
            group by e.ruta) t
    ),
    'reciente', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'creado', t.creado, 'tipo', t.tipo, 'ruta', t.ruta, 'detalle', t.detalle,
        'producto', t.producto, 'correo', t.correo) order by t.creado desc, t.id desc), '[]'::jsonb)
      from (select a.id, a.creado, a.tipo, a.ruta, a.detalle, p.commercial_name::text as producto, u.email::text as correo
            from public.actividad a
            left join public.products p on p.id = a.producto_id
            left join auth.users u on u.id = a.user_id
            order by a.creado desc, a.id desc limit 100) t
    )
  ) into v;
  return v;
end;
$$;

-- Permisos de las funciones
revoke execute on function public.es_admin() from public;
revoke execute on function public.registrar_evento(text, text, uuid, text, uuid) from public;
revoke execute on function public.admin_panel() from public, anon;
grant execute on function public.es_admin() to anon, authenticated;
grant execute on function public.registrar_evento(text, text, uuid, text, uuid) to anon, authenticated;
grant execute on function public.admin_panel() to authenticated;
