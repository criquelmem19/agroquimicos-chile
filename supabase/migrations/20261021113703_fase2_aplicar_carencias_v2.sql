-- Fase 2, lote 6 (extractor carencia-fase2-v2): etiquetas cuya carencia no estaba en la capa de texto del PDF
-- (Biocap: columna sin texto; FALCON: texto con espacios dentro de las palabras), leídas con OCR y revisadas
-- contra la imagen. Llena SOLO líneas sin carencia ni texto de carencia. review_status no cambia.
with c as (
  select c.product_use_id, c.value_min, c.not_applicable, c.value_text, c.quote, c.page, c.extractor_version
  from public.use_field_candidates c
  join public.product_uses pu on pu.id = c.product_use_id
  where c.extractor_version = 'carencia-fase2-v2' and c.field_name = 'carencia' and c.status = 'candidato'
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
where u.extractor_version = 'carencia-fase2-v2' and u.field_name = 'carencia'
  and u.product_use_id in (select id from actualizadas);

insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output, started_at, finished_at)
select document_id, 'extraido', 'carencia-fase2-v2',
       'Claude Opus 5.5: OCR de la página completa + revisión contra la imagen + verificación automática de citas',
       jsonb_build_object(
         'campo', 'carencia',
         'lineas', count(*),
         'con_dias', count(*) filter (where value_min is not null),
         'no_aplica', count(*) filter (where not_applicable),
         'mapa', 'scripts/fase2/mapa_lote6.py',
         'datos', 'datos/fase2/carencias_v2.json'),
       now(), now()
from public.use_field_candidates
where extractor_version = 'carencia-fase2-v2' and field_name = 'carencia'
group by document_id;
