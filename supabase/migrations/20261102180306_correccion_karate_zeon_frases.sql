-- KARATE CON TECNOLOGIA ZEON (N° SAG 1582): 5 líneas de la carga original con una frase de la etiqueta como «cultivo»
-- («Aplicar 2 días después…», «Repetir cada 8 días», «Aplicar 1 vez / hasta 3 veces por temporada», «volumen de agua
-- 200 L/ha»). Esos números no son dosis y metían «1 – 200 L/ha» en la dosis del inicio. Se ocultan (rechazado), no se
-- borran. Aprobado por Cristóbal el 02-11-2026 («Sí, los dos»).
update public.product_uses u
set review_status = 'rechazado',
    reviewed_by = 'Cristóbal Riquelme: oculta el 02-11-2026, frase de la etiqueta leída como cultivo; sus números no son dosis',
    reviewed_at = now()
from public.products p, public.crops c
where p.id = u.product_id and c.id = u.crop_id
  and p.registration_number = '1582' and p.commercial_name = 'KARATE CON TECNOLOGIA ZEON'
  and u.review_status = 'pendiente' and u.dose_unit = 'L' and u.dose_basis = 'por_ha'
  and c.name like 'Aplicar %'
  and (length(c.name) > 40 or array_length(regexp_split_to_array(trim(c.name), '\s+'), 1) > 6);
