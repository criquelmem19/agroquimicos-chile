-- objetivos_de_productos: sin el punto o los espacios finales que traen algunos nombres («Pulgón verde del duraznero.»).
create or replace function public.objetivos_de_productos(p_productos uuid[])
returns table (nombre text, n bigint)
language sql stable security invoker set search_path = '' as $$
  select min(x.limpio) as nombre, count(distinct x.product_id) as n
  from (
    select op.product_id, regexp_replace(btrim(t.common_name::text), '[\s.,;:]+$', '') as limpio
    from public.mv_sitio_objetivo_producto op
    join public.targets t on t.id = op.objetivo_id
    where op.product_id = any (p_productos) and cardinality(p_productos) <= 2000
  ) x
  where length(x.limpio) between 3 and 60
  group by translate(lower(x.limpio), 'áéíóúü', 'aeiouu')
  order by n desc, nombre
  limit 40;
$$;
