-- Aplicada el 20-10-2026 con el MCP de Supabase (apply_migration).

-- Índices para llaves foráneas sin índice (advisor de rendimiento).
create index if not exists product_active_ingredients_ai_ix on public.product_active_ingredients (active_ingredient_id);
create index if not exists product_categories_category_ix on public.product_categories (category_id);
create index if not exists product_companies_company_ix on public.product_companies (company_id);
create index if not exists product_safety_profiles_document_ix on public.product_safety_profiles (source_document_id);
create index if not exists extraction_issues_run_ix on public.extraction_issues (extraction_run_id);
create index if not exists field_evidence_document_ix on public.field_evidence (document_id);

-- Vistas livianas para el sitio web. Solo leen tablas del dominio (lectura pública).
-- security_invoker = true: se respetan los permisos de quien consulta.
-- Las líneas con review_status = 'rechazado' no se cuentan ni se muestran.

-- Un producto por fila, con lo necesario para buscar, filtrar y enlazar la etiqueta.
create or replace view public.v_sitio_productos with (security_invoker = true) as
with docs as (
  select p.id as product_id, d.id, d.document_type, d.storage_path, d.page_count, d.version_date,
         (d.product_id = p.id) as propio
  from public.products p
  join public.documents d
    on d.product_id = p.id
    or d.id in (select pu.source_document_id from public.product_uses pu where pu.product_id = p.id)
)
select
  p.id,
  p.commercial_name::text as nombre,
  p.registration_number as registro,
  p.formulation_code as formulacion_codigo,
  p.formulation_name as formulacion,
  p.hazard_classification as clasificacion,
  coalesce((select array_agg(pc.category_id order by pc.category_id)
            from public.product_categories pc where pc.product_id = p.id), '{}') as categorias,
  coalesce((select jsonb_agg(jsonb_build_object('id', pai.active_ingredient_id, 'conc', pai.concentration_raw)
                             order by ai.common_name)
            from public.product_active_ingredients pai
            join public.active_ingredients ai on ai.id = pai.active_ingredient_id
            where pai.product_id = p.id), '[]') as ingredientes,
  coalesce((select jsonb_agg(jsonb_build_object('id', pcm.company_id, 'rol', pcm.role)
                             order by public.rango_rol_empresa(pcm.role))
            from public.product_companies pcm where pcm.product_id = p.id), '[]') as empresas,
  coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.document_type, 'url', x.storage_path,
                                                'paginas', x.page_count, 'fecha', x.version_date)
                             order by (x.document_type = 'etiqueta') desc, x.propio desc, x.version_date desc nulls last)
            from docs x where x.product_id = p.id), '[]') as documentos,
  (select count(*) from public.product_uses pu
    where pu.product_id = p.id and pu.review_status <> 'rechazado') as n_lineas,
  (select count(distinct pu.crop_id) from public.product_uses pu
    where pu.product_id = p.id and pu.review_status <> 'rechazado') as n_cultivos
from public.products p;

-- Cultivos con su cantidad de líneas de uso (para ordenar por relevancia).
create or replace view public.v_sitio_cultivos with (security_invoker = true) as
select c.id, c.name::text as nombre, c.aliases,
       count(pu.id) as n_lineas, count(distinct pu.product_id) as n_productos
from public.crops c
left join public.product_uses pu on pu.crop_id = c.id and pu.review_status <> 'rechazado'
group by c.id;

-- Objetivos (plagas, enfermedades, malezas) con su cantidad de líneas de uso.
create or replace view public.v_sitio_objetivos with (security_invoker = true) as
select t.id, t.common_name::text as nombre, t.scientific_name::text as cientifico, t.target_type as tipo,
       count(distinct pu.id) as n_lineas, count(distinct pu.product_id) as n_productos
from public.targets t
left join public.use_targets ut on ut.target_id = t.id
left join public.product_uses pu on pu.id = ut.product_use_id and pu.review_status <> 'rechazado'
group by t.id;

-- Una fila con los indicadores de completitud para la página "Estado de los datos".
create or replace view public.v_estado_datos with (security_invoker = true) as
select
  (select count(*) from public.products) as productos,
  (select count(*) from public.products p
     where exists (select 1 from public.documents d
                   where d.storage_path is not null
                     and (d.product_id = p.id
                          or d.id in (select pu.source_document_id from public.product_uses pu where pu.product_id = p.id)))
  ) as productos_con_pdf,
  count(*) as lineas,
  count(*) filter (where u.dose_min is not null) as con_dosis,
  count(*) filter (where u.withholding_period_days is not null or u.withholding_not_applicable) as con_carencia,
  count(*) filter (where u.withholding_period_days is not null) as carencia_dias,
  count(*) filter (where u.withholding_not_applicable) as carencia_no_aplica,
  count(*) filter (where u.water_volume_min_l_ha is not null or u.water_volume_max_l_ha is not null) as con_mojamiento,
  count(*) filter (where nullif(btrim(u.application_method), '') is not null) as con_metodo,
  count(*) filter (where u.interval_min_days is not null or u.interval_max_days is not null) as con_intervalo,
  count(*) filter (where u.review_status = 'aprobado') as aprobadas,
  count(*) filter (where u.confidence_score < 0.80) as confianza_baja,
  round(avg(u.confidence_score), 3) as confianza_promedio,
  greatest(
    max(u.updated_at),
    (select max(updated_at) from public.products),
    (select max(uploaded_at) from public.documents),
    (select max(updated_at) from public.product_safety_profiles),
    (select max(updated_at) from public.active_ingredients),
    (select max(updated_at) from public.targets)
  ) as ultima_actualizacion
from public.product_uses u
where u.review_status <> 'rechazado';

-- Solo lectura para la llave pública.
revoke all on public.v_sitio_productos, public.v_sitio_cultivos, public.v_sitio_objetivos, public.v_estado_datos
  from anon, authenticated;
grant select on public.v_sitio_productos, public.v_sitio_cultivos, public.v_sitio_objetivos, public.v_estado_datos
  to anon, authenticated;

comment on view public.v_sitio_productos is 'Sitio web: un producto por fila con categorías, ingredientes, empresas y documentos (PDF).';
comment on view public.v_sitio_cultivos is 'Sitio web: cultivos con alias y cantidad de líneas de uso.';
comment on view public.v_sitio_objetivos is 'Sitio web: objetivos (plagas, enfermedades, malezas) con cantidad de líneas de uso.';
comment on view public.v_estado_datos is 'Sitio web: indicadores de completitud de los datos.';
