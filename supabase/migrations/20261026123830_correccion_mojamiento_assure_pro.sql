-- Corrección con visto bueno de Cristóbal (26-10-2026: «Sí, quítale el mojamiento a esas líneas de Assure Pro
-- (que quede vacío, sin borrar nada más)»). Assure®Pro (N° SAG 3556): el recopilador guardó mojamiento 100–150 L/ha
-- desde «Regiones con adecuada pluviometría 100 L/ha terrestre. … Regiones áridas con riego 150 L/ha terrestre.»
-- (pág. 1), que es un volumen mínimo según la zona, no un rango de mojamiento (control al azar del 26-10-2026).
-- Se vacía el mojamiento y su cita; el valor anterior queda en use_field_candidates.existing_value
-- (extractor 'correccion-recopilador-v1') para poder deshacerlo.
insert into public.use_field_candidates
  (extractor_version, product_use_id, document_id, field_name, value_min, value_max, value_text, not_applicable,
   quote, page, source, status, existing_value, notes)
select 'correccion-recopilador-v1', pu.id, pu.source_document_id, 'mojamiento', null, null, null, false,
       pu.field_citations->'mojamiento'->>'cita', (pu.field_citations->'mojamiento'->>'pagina')::int, 'texto', 'aplicado',
       jsonb_build_object('min', pu.water_volume_min_l_ha, 'max', pu.water_volume_max_l_ha,
                          'cita', pu.field_citations->'mojamiento')::text,
       'Mojamiento vaciado con visto bueno de Cristóbal (26-10-2026): la cita es un volumen mínimo según la zona, no un rango de mojamiento.'
from public.product_uses pu
join public.products p on p.id = pu.product_id
where p.commercial_name = 'Assure®Pro' and pu.review_status <> 'rechazado'
  and pu.water_volume_min_l_ha = 100 and pu.water_volume_max_l_ha = 150
  and pu.field_citations->'mojamiento'->>'cita' like 'Regiones con adecuada pluviometría 100 L/ha terrestre.%';

update public.product_uses pu set
  water_volume_min_l_ha = null,
  water_volume_max_l_ha = null,
  field_citations = pu.field_citations - 'mojamiento'
from public.use_field_candidates c
where c.extractor_version = 'correccion-recopilador-v1' and c.field_name = 'mojamiento'
  and c.product_use_id = pu.id and pu.water_volume_min_l_ha = 100 and pu.water_volume_max_l_ha = 150;
