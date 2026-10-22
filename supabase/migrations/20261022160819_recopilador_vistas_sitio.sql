-- Recopilador (22-10-2026): el link a la etiqueta usa la copia del bucket si existe y, si no, la URL oficial
-- del SAG (documents.source_url). Se agregan al final de v_sitio_productos las marcas de producto que no se
-- puede usar en Chile. La lista de documentos se arma sin el OR del JOIN anterior (lento con miles de filas).
create or replace view public.v_sitio_productos with (security_invoker = true) as
with docs as (
  select d.product_id, d.id, d.document_type, coalesce(d.storage_path, d.source_url) as url, d.page_count,
         d.version_date, true as propio
  from public.documents d
  where d.product_id is not null
  union
  select pu.product_id, d.id, d.document_type, coalesce(d.storage_path, d.source_url) as url, d.page_count,
         d.version_date, d.product_id is not distinct from pu.product_id as propio
  from (select distinct product_id, source_document_id from public.product_uses where source_document_id is not null) pu
  join public.documents d on d.id = pu.source_document_id
)
select p.id,
  p.commercial_name::text as nombre,
  p.registration_number as registro,
  p.formulation_code as formulacion_codigo,
  p.formulation_name as formulacion,
  p.hazard_classification as clasificacion,
  coalesce((select array_agg(pc.category_id order by pc.category_id) from public.product_categories pc
            where pc.product_id = p.id), '{}'::smallint[]) as categorias,
  coalesce((select jsonb_agg(jsonb_build_object('id', pai.active_ingredient_id, 'conc', pai.concentration_raw)
                             order by ai.common_name)
            from public.product_active_ingredients pai join public.active_ingredients ai on ai.id = pai.active_ingredient_id
            where pai.product_id = p.id), '[]'::jsonb) as ingredientes,
  coalesce((select jsonb_agg(jsonb_build_object('id', pcm.company_id, 'rol', pcm.role) order by public.rango_rol_empresa(pcm.role))
            from public.product_companies pcm where pcm.product_id = p.id), '[]'::jsonb) as empresas,
  coalesce((select jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.document_type, 'url', x.url, 'paginas', x.page_count,
                                                'fecha', x.version_date)
                             order by (x.document_type = 'etiqueta') desc, x.propio desc, x.version_date desc nulls last)
            from (select distinct on (id) * from docs where docs.product_id = p.id order by id, propio desc) x), '[]'::jsonb) as documentos,
  (select count(*) from public.product_uses pu where pu.product_id = p.id and pu.review_status <> 'rechazado') as n_lineas,
  (select count(distinct pu.crop_id) from public.product_uses pu where pu.product_id = p.id and pu.review_status <> 'rechazado') as n_cultivos,
  case
    when p.solo_exportacion then 'Solo para exportación (lo dice la etiqueta)'
    when p.sustancia_prohibida is not null then 'Contiene ' || p.sustancia_prohibida || ', sustancia prohibida por el SAG'
    when p.sag_estado = 'cancelado' and p.sag_fecha_limite < current_date
      then 'Autorización cancelada: se podía usar hasta el ' || to_char(p.sag_fecha_limite, 'DD-MM-YYYY')
  end as no_disponible,
  p.sag_estado,
  p.sag_fecha_limite,
  p.toxicidad_abejas
from public.products p;

create or replace view public.v_estado_datos with (security_invoker = true) as
select (select count(*) from public.products) as productos,
  (select count(*) from public.products p
   where exists (select 1 from public.documents d
                 where coalesce(d.storage_path, d.source_url) is not null
                   and (d.product_id = p.id or d.id in (select pu.source_document_id from public.product_uses pu
                                                        where pu.product_id = p.id)))) as productos_con_pdf,
  count(*) as lineas,
  count(*) filter (where dose_min is not null) as con_dosis,
  count(*) filter (where withholding_period_days is not null or withholding_not_applicable) as con_carencia,
  count(*) filter (where withholding_period_days is not null) as carencia_dias,
  count(*) filter (where withholding_not_applicable) as carencia_no_aplica,
  count(*) filter (where water_volume_min_l_ha is not null or water_volume_max_l_ha is not null) as con_mojamiento,
  count(*) filter (where nullif(btrim(application_method), '') is not null) as con_metodo,
  count(*) filter (where interval_min_days is not null or interval_max_days is not null) as con_intervalo,
  count(*) filter (where review_status = 'aprobado') as aprobadas,
  count(*) filter (where confidence_score < 0.80) as confianza_baja,
  round(avg(confidence_score), 3) as confianza_promedio,
  greatest(max(updated_at), (select max(updated_at) from public.products), (select max(uploaded_at) from public.documents),
           (select max(updated_at) from public.product_safety_profiles), (select max(updated_at) from public.active_ingredients),
           (select max(updated_at) from public.targets)) as ultima_actualizacion
from public.product_uses u
where review_status <> 'rechazado';

-- Para las listas por documento y la carga en volumen
create index if not exists product_uses_source_document_ix on public.product_uses (source_document_id);
