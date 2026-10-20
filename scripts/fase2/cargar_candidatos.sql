-- Carga un archivo de candidatos de la Fase 2 (datos/fase2/<campo>_v1.json, formato de
-- exportar_candidatos.py) a la tabla privada use_field_candidates.
-- La base lee el archivo directo desde GitHub, fijado a un commit: los datos no pasan por el contexto del modelo.
-- Requiere la extensión http (temporal: crearla antes de cargar y borrarla al terminar).
-- Reemplazar <COMMIT> y <ARCHIVO> y ejecutar (MCP de Supabase → execute_sql).
with r as (
  select (extensions.http_get(
    'https://raw.githubusercontent.com/criquelmem19/agroquimicos-chile/<COMMIT>/datos/fase2/<ARCHIVO>')).content::jsonb as j
), f as (
  select j->>'extractor' as extractor, j->>'campo' as campo, fila
  from r, jsonb_array_elements(j->'filas') as fila
)
insert into public.use_field_candidates
  (extractor_version, product_use_id, document_id, field_name, value_min, value_max, value_text,
   not_applicable, quote, page, source, notes)
select extractor, (fila->>0)::uuid, (fila->>1)::uuid, campo,
       case when jsonb_typeof(fila->2) = 'number' then (fila->>2)::numeric end,
       case when jsonb_typeof(fila->3) = 'number' then (fila->>3)::numeric end,
       case when fila->>2 = 'COND' then 'condicionada'
            when jsonb_typeof(fila->2) = 'string' and fila->>2 <> 'NA' then fila->>2 end,
       coalesce(fila->>2 = 'NA', false),
       fila->>4, (fila->>5)::int, fila->>6, fila->>7
from f
on conflict (extractor_version, product_use_id, field_name) do nothing;
