-- Texto de la dosis de la etiqueta para la tabla del buscador, cuando la dosis no se puede resumir en un rango
-- «desde – hasta» con unidad conocida (pedido de Cristóbal el 11-11-2026: que no aparezca «Ver en la etiqueta»).
-- Por producto, el texto más repetido de las líneas sin número, con base «otro» o sin unidad. Vista aparte de
-- v_sitio_resumen_productos: agregarlo allí la hacía pasar de 0,5 a 3 s (el límite de la llave pública).
create view public.v_sitio_dosis_texto with (security_invoker = true) as
select product_id as id,
  mode() within group (order by left(btrim(dose_raw), 120)) as dosis_texto
from public.product_uses
where review_status <> 'rechazado'
  and nullif(btrim(dose_raw), '') is not null
  and (coalesce(dose_min, dose_max) is null or dose_basis = 'otro' or dose_unit is null)
group by product_id;

grant select on public.v_sitio_dosis_texto to anon, authenticated;
