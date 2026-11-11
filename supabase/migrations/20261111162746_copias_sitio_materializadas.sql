-- Copias ya calculadas de las vistas pesadas del sitio (con el «Sí, arréglalo» de Cristóbal, 11-11-2026). Con ~44 mil
-- líneas, v_sitio_productos tardaba 2,8–4,4 s por página y la llave pública corta a los 3 s: el sitio cargaba solo
-- gracias a los reintentos. Las copias se leen al instante y pg_cron las renueva cada 15 minutos (sin bloquear las
-- lecturas: CONCURRENTLY). Las vistas v_sitio_* siguen iguales (son la definición; las copias salen de ellas).
create extension if not exists pg_cron with schema pg_catalog;

create materialized view public.mv_sitio_productos as select * from public.v_sitio_productos;
create unique index mv_sitio_productos_id on public.mv_sitio_productos (id);
create materialized view public.mv_sitio_resumen_productos as select * from public.v_sitio_resumen_productos;
create unique index mv_sitio_resumen_productos_id on public.mv_sitio_resumen_productos (id);
create materialized view public.mv_sitio_cultivos as select * from public.v_sitio_cultivos;
create unique index mv_sitio_cultivos_id on public.mv_sitio_cultivos (id);
create materialized view public.mv_sitio_objetivos as select * from public.v_sitio_objetivos;
create unique index mv_sitio_objetivos_id on public.mv_sitio_objetivos (id);

-- Mismo acceso que las vistas: solo lectura para la llave pública (los datos ya eran públicos).
revoke all on public.mv_sitio_productos, public.mv_sitio_resumen_productos, public.mv_sitio_cultivos,
  public.mv_sitio_objetivos from anon, authenticated;
grant select on public.mv_sitio_productos, public.mv_sitio_resumen_productos, public.mv_sitio_cultivos,
  public.mv_sitio_objetivos to anon, authenticated;

comment on materialized view public.mv_sitio_productos is 'Copia de v_sitio_productos; la renueva renovar_copias_sitio() cada 15 minutos (pg_cron).';
comment on materialized view public.mv_sitio_resumen_productos is 'Copia de v_sitio_resumen_productos; renovar_copias_sitio() cada 15 minutos.';
comment on materialized view public.mv_sitio_cultivos is 'Copia de v_sitio_cultivos; renovar_copias_sitio() cada 15 minutos.';
comment on materialized view public.mv_sitio_objetivos is 'Copia de v_sitio_objetivos; renovar_copias_sitio() cada 15 minutos.';

-- Renueva las cuatro copias. Solo la usan pg_cron y los scripts (como postgres): la llave pública no la puede llamar.
create or replace function public.renovar_copias_sitio() returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view concurrently public.mv_sitio_productos;
  refresh materialized view concurrently public.mv_sitio_resumen_productos;
  refresh materialized view concurrently public.mv_sitio_cultivos;
  refresh materialized view concurrently public.mv_sitio_objetivos;
end $$;
revoke execute on function public.renovar_copias_sitio() from public, anon, authenticated;

select cron.schedule('renovar-copias-sitio', '*/15 * * * *', 'select public.renovar_copias_sitio()');
