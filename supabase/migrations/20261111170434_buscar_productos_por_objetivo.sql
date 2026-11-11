-- Buscador principal de la tabla también por plaga, enfermedad o maleza (Cristóbal, 11-11-2026: «yo quiero que ese
-- filtro filtre absolutamente todo»: «avenilla» daba 0 productos). Copia ya calculada de cada par objetivo–producto con
-- el nombre común y científico del objetivo normalizado igual que buscador.js → normalizar (sin tildes, minúsculas,
-- solo letras y números). La renueva renovar_copias_sitio() cada 15 minutos, con las demás.
create materialized view public.mv_sitio_objetivo_producto as
select distinct ut.target_id as objetivo_id, pu.product_id,
  ' ' || btrim(regexp_replace(
    translate(lower(coalesce(t.common_name::text, '') || ' ' || coalesce(t.scientific_name::text, '')),
      'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc'),
    '[^a-z0-9]+', ' ', 'g')) || ' ' as texto
from public.use_targets ut
join public.product_uses pu on pu.id = ut.product_use_id and pu.review_status <> 'rechazado'
join public.targets t on t.id = ut.target_id;
create unique index mv_sitio_objetivo_producto_ux on public.mv_sitio_objetivo_producto (objetivo_id, product_id);
create index mv_sitio_objetivo_producto_texto on public.mv_sitio_objetivo_producto using gin (texto extensions.gin_trgm_ops);
revoke all on public.mv_sitio_objetivo_producto from anon, authenticated;
grant select on public.mv_sitio_objetivo_producto to anon, authenticated;
comment on materialized view public.mv_sitio_objetivo_producto is
  'Objetivo (plaga, enfermedad, maleza) → producto, con el texto normalizado del objetivo, para el buscador principal. renovar_copias_sitio() cada 15 minutos.';

-- Productos con algún objetivo cuyo nombre contiene el texto (ya normalizado por el sitio; 3 letras o más).
create or replace function public.productos_por_objetivo(p_texto text) returns setof uuid
language sql stable security invoker set search_path = '' as $$
  select distinct product_id from public.mv_sitio_objetivo_producto
  where length(p_texto) between 3 and 60 and p_texto ~ '^[a-z0-9 ]+$' and texto like '%' || p_texto || '%';
$$;
revoke execute on function public.productos_por_objetivo(text) from public;
grant execute on function public.productos_por_objetivo(text) to anon, authenticated;

create or replace function public.renovar_copias_sitio() returns void
language plpgsql security definer set search_path = '' as $$
begin
  refresh materialized view concurrently public.mv_sitio_productos;
  refresh materialized view concurrently public.mv_sitio_resumen_productos;
  refresh materialized view concurrently public.mv_sitio_cultivos;
  refresh materialized view concurrently public.mv_sitio_objetivos;
  refresh materialized view concurrently public.mv_sitio_objetivo_producto;
end $$;
revoke execute on function public.renovar_copias_sitio() from public, anon, authenticated;
