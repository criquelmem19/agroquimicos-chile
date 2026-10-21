-- Fase 2, segunda pasada (extractor campos-fase2-v2): mismas reglas que v1, pero la cita también se comprueba
-- con el OCR de la página completa (frases cortadas por otra columna en la capa de texto, ej. REGLONE).
-- Llena SOLO campos vacíos. review_status no cambia.

update public.product_uses pu set
  water_volume_min_l_ha = c.value_min,
  water_volume_max_l_ha = c.value_max,
  field_citations = pu.field_citations || jsonb_build_object('mojamiento', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v2' and c.field_name = 'mojamiento' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.water_volume_min_l_ha is null and pu.water_volume_max_l_ha is null;

update public.product_uses pu set
  interval_min_days = c.value_min::int,
  interval_max_days = c.value_max::int,
  field_citations = pu.field_citations || jsonb_build_object('intervalo', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v2' and c.field_name = 'intervalo' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.interval_min_days is null and pu.interval_max_days is null;

update public.product_uses pu set
  application_method = c.value_text,
  field_citations = pu.field_citations || jsonb_build_object('metodo', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v2' and c.field_name = 'metodo' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and nullif(btrim(pu.application_method), '') is null;

update public.use_field_candidates c set status = 'aplicado'
from public.product_uses pu
where c.extractor_version = 'campos-fase2-v2' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.field_citations -> c.field_name ->> 'extractor' = c.extractor_version;

insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output, started_at, finished_at)
select document_id, 'extraido', 'campos-fase2-v2',
       'reglas-locales-sin-llm (scripts/fase2/extraer_otros.py) + verificación de citas con texto y OCR de la página',
       jsonb_build_object(
         'campos', 'mojamiento, intervalo, metodo',
         'mojamiento', count(*) filter (where field_name = 'mojamiento'),
         'intervalo', count(*) filter (where field_name = 'intervalo'),
         'metodo', count(*) filter (where field_name = 'metodo'),
         'aplicados', count(*) filter (where status = 'aplicado'),
         'datos', 'datos/fase2/mojamiento_v2.json, intervalo_v2.json'),
       now(), now()
from public.use_field_candidates
where extractor_version = 'campos-fase2-v2'
group by document_id;
