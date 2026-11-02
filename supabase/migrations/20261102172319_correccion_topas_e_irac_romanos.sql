-- Pedido de Cristóbal el 02-11-2026 («revísame el Topas»; aprobado con «Sí, todo»).

-- 1) TOPAS 200 EW (N° SAG 2340) no tenía ingrediente. Su etiqueta (documento del bucket, 10-12-2021, pág. 1) dice
--    «Penconazol * … 20 % p/v (200 g/L)»; la del SAG del 17-12-2025 dice lo mismo y «Grupo FRAC penconazol 3».
insert into public.product_active_ingredients
  (product_id, active_ingredient_id, concentration_raw, concentration_percent_pv, concentration_g_l, field_citations)
select p.id, ai.id, '20 % p/v (200 g/L)', 20, 200,
  jsonb_build_object(
    'nombre', jsonb_build_object('cita', 'Penconazol *', 'pagina', 1, 'documento', d.id, 'extractor', 'revision-manual-2026-11-02'),
    'concentracion', jsonb_build_object('cita', '20 % p/v (200 g/L)', 'pagina', 1, 'documento', d.id, 'extractor', 'revision-manual-2026-11-02'))
from public.products p
join public.documents d on d.product_id = p.id
  and d.sha256 = '328527c4a1cad58e5f302e0b2fe3e4dcaf37b7047d833b37753ae30dd3de6890'
join public.active_ingredients ai on ai.common_name = 'Penconazol' and ai.mechanism_system = 'FRAC'
where p.registration_number = '2340' and p.commercial_name = 'TOPAS 200 EW'
  and not exists (select 1 from public.product_active_ingredients x where x.product_id = p.id);

-- 2) TOPAS 200 EW: 6 líneas de la carga original con una frase de la etiqueta como «cultivo» («Aplicar en forma
--    preventiva… máximo de 3 aplicaciones… cada 10-15 días»). Sus números no son dosis (son n.° de aplicaciones e
--    intervalos) y metían «3 – 15 L/ha» en la dosis del inicio. Se ocultan (rechazado); no se borran.
update public.product_uses u
set review_status = 'rechazado',
    reviewed_by = 'Cristóbal Riquelme: oculta el 02-11-2026, frase de la etiqueta leída como cultivo; sus números no son dosis',
    reviewed_at = now()
from public.products p, public.crops c
where p.id = u.product_id and c.id = u.crop_id
  and p.registration_number = '2340' and p.commercial_name = 'TOPAS 200 EW'
  and u.review_status = 'pendiente' and u.dose_unit = 'L'
  and (length(c.name) > 40 or array_length(regexp_split_to_array(trim(c.name), '\s+'), 1) > 6);

-- 3) Grupos IRAC escritos con número romano: «I» e «Ib» = 1B (organofosforados).
insert into public.moa_equivalencias (sistema, codigo, codigo_actual, ingrediente_id, nota)
select v.sistema, v.codigo, v.codigo_actual, ai.id, v.nota
from (values
  ('IRAC', 'I', '1B', 'Etoprofós', 'La etiqueta de MOCAP MR 6 EC dice «Grupo I» (1 en número romano): el etoprofós es organofosforado = IRAC 1B'),
  ('IRAC', 'Ib', '1B', 'Fenamifós', 'La etiqueta de NEMACUR 240 CS dice «Grupo Ib» (1B en número romano): organofosforados = IRAC 1B')
) as v(sistema, codigo, codigo_actual, nombre, nota)
join public.active_ingredients ai on ai.common_name = v.nombre and ai.mechanism_system = v.sistema and ai.mechanism_group = v.codigo;
