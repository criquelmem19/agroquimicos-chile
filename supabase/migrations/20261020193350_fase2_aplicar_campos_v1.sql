-- Fase 2: aplica mojamiento, intervalo y método (extractor campos-fase2-v1) SOLO en líneas que tenían
-- ese campo vacío. No pisa valores existentes. review_status no cambia (queda 'pendiente').
-- Un UPDATE por campo: Postgres no permite actualizar la misma fila dos veces en una sola sentencia.

update public.product_uses pu set
  water_volume_min_l_ha = c.value_min,
  water_volume_max_l_ha = c.value_max,
  field_citations = pu.field_citations || jsonb_build_object('mojamiento', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v1' and c.field_name = 'mojamiento' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.water_volume_min_l_ha is null and pu.water_volume_max_l_ha is null;

update public.product_uses pu set
  interval_min_days = c.value_min::int,
  interval_max_days = c.value_max::int,
  field_citations = pu.field_citations || jsonb_build_object('intervalo', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v1' and c.field_name = 'intervalo' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.interval_min_days is null and pu.interval_max_days is null;

update public.product_uses pu set
  application_method = c.value_text,
  field_citations = pu.field_citations || jsonb_build_object('metodo', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'campos-fase2-v1' and c.field_name = 'metodo' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and nullif(btrim(pu.application_method), '') is null;

-- Marcar como aplicados los candidatos que quedaron escritos (la cita guardada es de este extractor).
update public.use_field_candidates c set status = 'aplicado'
from public.product_uses pu
where c.extractor_version = 'campos-fase2-v1' and c.status = 'candidato'
  and pu.id = c.product_use_id
  and pu.field_citations -> c.field_name ->> 'extractor' = c.extractor_version;

-- Registro de la corrida por documento.
insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output, started_at, finished_at)
select document_id, 'extraido', 'campos-fase2-v1',
       'reglas-locales-sin-llm (scripts/fase2/extraer_otros.py) + verificación automática de citas literales',
       jsonb_build_object(
         'campos', 'mojamiento, intervalo, metodo',
         'mojamiento', count(*) filter (where field_name = 'mojamiento'),
         'intervalo', count(*) filter (where field_name = 'intervalo'),
         'metodo', count(*) filter (where field_name = 'metodo'),
         'aplicados', count(*) filter (where status = 'aplicado'),
         'datos', 'datos/fase2/mojamiento_v1.json, intervalo_v1.json, metodo_v1.json',
         'commit', '291f71db823fd5cb87fec34a3a5a3d34ad9fc10d'),
       now(), now()
from public.use_field_candidates
where extractor_version = 'campos-fase2-v1'
group by document_id;
