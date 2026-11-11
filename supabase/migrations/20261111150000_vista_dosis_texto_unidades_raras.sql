-- v_sitio_dosis_texto también toma las líneas con una unidad que el sitio no reconoce (OCR: «Uha», «c»), para que
-- esos productos muestren el texto de la dosis de la etiqueta en vez de «Sin dosis en los datos».
create or replace view public.v_sitio_dosis_texto with (security_invoker = true) as
select product_id as id,
  mode() within group (order by left(btrim(dose_raw), 120)) as dosis_texto
from public.product_uses
where review_status <> 'rechazado'
  and nullif(btrim(dose_raw), '') is not null
  and (coalesce(dose_min, dose_max) is null or dose_basis = 'otro' or dose_unit is null
    or (lower(btrim(dose_unit)) !~ '^(k|kg|g|gr|gramos|mg|l|lt|ml|cc|cm3|%|ppm|ppb)$' and dose_unit not like '%/%'))
group by product_id;
