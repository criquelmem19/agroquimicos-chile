-- Ajustes tras la revisión de seguridad (11-11-2026), sobre cuentas_guardados_actividad:
-- 1) registrar_evento: sin equipo ni sesión no anota; tope global de 5.000 eventos en 24 h (antes 20.000); tope de 60 por
--    minuto por equipo y también por usuario. Así nadie con la llave pública puede llenar la base ni saltarse el tope.
-- 2) admin_panel: «por_dia» en una sola pasada (antes 120 recorridos) y «secciones» con máximo 30.

create or replace function public.registrar_evento(
  p_tipo text, p_ruta text default null, p_producto uuid default null,
  p_detalle text default null, p_dispositivo uuid default null
) returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_producto uuid;
  v_usuario uuid := (select auth.uid());
begin
  if p_tipo is null or p_tipo not in
     ('visita','busqueda','producto','etiqueta','guardar','quitar','plan','registro','ingreso') then
    return;
  end if;
  if p_dispositivo is null and v_usuario is null then
    return;
  end if;
  if (select count(*) from public.actividad where creado > now() - interval '24 hours') >= 5000 then
    return;
  end if;
  if p_dispositivo is not null
     and (select count(*) from public.actividad
          where dispositivo = p_dispositivo and creado > now() - interval '1 minute') >= 60 then
    return;
  end if;
  if v_usuario is not null
     and (select count(*) from public.actividad
          where user_id = v_usuario and creado > now() - interval '1 minute') >= 60 then
    return;
  end if;
  if p_producto is not null then
    select p.id into v_producto from public.products p where p.id = p_producto;
  end if;
  insert into public.actividad (tipo, user_id, dispositivo, ruta, producto_id, detalle)
  values (p_tipo, v_usuario, p_dispositivo, left(p_ruta, 60), v_producto, left(p_detalle, 200));
exception when others then
  return;
end;
$$;

create or replace function public.admin_panel() returns jsonb
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
  ),
  por_dia as (
    select ev.dia,
           count(*) filter (where ev.tipo = 'visita') as visitas,
           count(distinct ev.persona) as personas,
           count(*) filter (where ev.tipo = 'busqueda') as busquedas,
           count(*) filter (where ev.tipo = 'registro') as registros
    from ev group by ev.dia
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
        'visitas', coalesce(x.visitas, 0),
        'personas', coalesce(x.personas, 0),
        'busquedas', coalesce(x.busquedas, 0),
        'registros', coalesce(x.registros, 0)
      ) order by d.dia), '[]'::jsonb)
      from dias d left join por_dia x on x.dia = d.dia
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
            group by e.ruta order by count(*) desc, e.ruta limit 30) t
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
