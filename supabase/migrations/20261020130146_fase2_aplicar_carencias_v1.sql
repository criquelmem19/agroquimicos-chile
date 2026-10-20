-- Fase 2: aplica las carencias extraídas (extractor carencia-fase2-v1) SOLO en líneas que no tenían
-- carencia ni texto de carencia. No pisa valores existentes. review_status no cambia (queda 'pendiente').
with c as (
  select c.id as cand_id, c.product_use_id, c.value_min, c.not_applicable, c.value_text, c.quote, c.page, c.extractor_version
  from public.use_field_candidates c
  join public.product_uses pu on pu.id = c.product_use_id
  where c.extractor_version = 'carencia-fase2-v1' and c.field_name = 'carencia' and c.status = 'candidato'
    and pu.withholding_period_days is null and not pu.withholding_not_applicable
    and nullif(btrim(pu.withholding_period_raw), '') is null
), actualizadas as (
  update public.product_uses pu set
    withholding_period_days = case when c.value_min is not null then c.value_min::int end,
    withholding_not_applicable = c.not_applicable,
    withholding_period_raw = c.quote,
    field_citations = pu.field_citations || jsonb_build_object('carencia', jsonb_strip_nulls(jsonb_build_object(
      'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version,
      'condicional', case when c.value_text = 'condicionada' then true end)))
  from c
  where pu.id = c.product_use_id
  returning pu.id
)
update public.use_field_candidates u set status = 'aplicado'
where u.extractor_version = 'carencia-fase2-v1' and u.field_name = 'carencia'
  and u.product_use_id in (select id from actualizadas);

-- Registro de la corrida por documento.
insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output, started_at, finished_at)
select document_id, 'extraido', 'carencia-fase2-v1',
       'Claude Opus 5.5: lectura de cada etiqueta + verificación automática de citas literales',
       jsonb_build_object(
         'campo', 'carencia',
         'lineas', count(*),
         'con_dias', count(*) filter (where value_min is not null),
         'no_aplica', count(*) filter (where not_applicable),
         'condicionadas', count(*) filter (where value_text = 'condicionada'),
         'mapa', 'scripts/fase2/mapa_carencias.py y mapa_lote*.py',
         'datos', 'datos/fase2/carencias_v1.json',
         'commit', 'f367bcb9eb13e61186bf63bbb128a0229199147a'),
       now(), now()
from public.use_field_candidates
where extractor_version = 'carencia-fase2-v1' and field_name = 'carencia'
group by document_id;
