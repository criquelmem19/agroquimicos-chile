-- Resumen por producto para la tabla del inicio del sitio: cultivos con líneas de uso y dosis
-- desde-hasta por unidad (solo lectura, mismas reglas de acceso que product_uses).
create or replace view public.v_sitio_resumen_productos
with (security_invoker = true) as
with u as (
  select product_id, crop_id, dose_min, dose_max, dose_unit, dose_basis, review_status, confidence_score
  from public.product_uses
  where review_status <> 'rechazado'
), d as (
  select product_id, dose_unit, dose_basis,
         min(coalesce(dose_min, dose_max)) as mn,
         max(coalesce(dose_max, dose_min)) as mx,
         count(*) as n
  from u
  where coalesce(dose_min, dose_max) is not null
  group by product_id, dose_unit, dose_basis
)
select g.product_id as id,
       g.cultivos,
       g.n_lineas,
       g.n_aprobadas,
       g.n_baja_confianza,
       coalesce(dd.dosis, '[]'::jsonb) as dosis
from (
  select product_id,
         array_agg(distinct crop_id) filter (where crop_id is not null) as cultivos,
         count(*) as n_lineas,
         count(*) filter (where review_status = 'aprobado') as n_aprobadas,
         count(*) filter (where confidence_score < 0.80) as n_baja_confianza
  from u
  group by product_id
) g
left join (
  select product_id,
         jsonb_agg(jsonb_build_object('u', dose_unit, 'b', dose_basis, 'min', mn, 'max', mx, 'n', n) order by n desc) as dosis
  from d
  group by product_id
) dd on dd.product_id = g.product_id;

revoke all on public.v_sitio_resumen_productos from public;
grant select on public.v_sitio_resumen_productos to anon, authenticated;
