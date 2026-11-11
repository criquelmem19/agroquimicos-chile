-- Qué controlan los productos de un grupo de modo de acción (página de cada grupo, pedido de Cristóbal el 11-11-2026:
-- «un lugar donde te explique… cómo actúa y qué productos son, qué busca controlar»). Recibe los productos del grupo
-- (los arma el sitio) y devuelve las plagas, enfermedades y malezas de sus etiquetas, juntando las variantes del mismo
-- nombre común (sin tildes ni mayúsculas), con cuántos de esos productos las nombran. Lee la copia
-- mv_sitio_objetivo_producto (renovada cada 15 minutos).
create or replace function public.objetivos_de_productos(p_productos uuid[])
returns table (nombre text, n bigint)
language sql stable security invoker set search_path = '' as $$
  select min(btrim(t.common_name::text)) as nombre, count(distinct op.product_id) as n
  from public.mv_sitio_objetivo_producto op
  join public.targets t on t.id = op.objetivo_id
  where op.product_id = any (p_productos) and cardinality(p_productos) <= 2000
    and length(btrim(t.common_name::text)) between 3 and 60
  group by translate(lower(btrim(t.common_name::text)), 'áéíóúü', 'aeiouu')
  order by n desc, nombre
  limit 40;
$$;
revoke execute on function public.objetivos_de_productos(uuid[]) from public;
grant execute on function public.objetivos_de_productos(uuid[]) to anon, authenticated;
