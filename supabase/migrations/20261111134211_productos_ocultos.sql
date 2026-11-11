-- Productos ocultos de las listas del sitio (pedido de Cristóbal el 11-11-2026: «Sí, ocúltalos»). Son registros de la
-- carga original (jul–ago 2026), sin etiqueta del SAG ni ingrediente activo: nombres sacados de un archivo, hojas de
-- seguridad o fichas técnicas en vez de etiquetas, duplicados de un producto que ya está, y productos sin ningún dato.
-- No se borra nada: el producto, sus documentos y sus líneas siguen en la base. Para mostrarlo de nuevo, dejar
-- oculto_motivo en null.
alter table public.products add column oculto_motivo text;
comment on column public.products.oculto_motivo is
  'Si no es null, el sitio no muestra el producto en sus listas (tabla, filtros, buscadores); su ficha sigue abriendo. Motivo legible.';

update public.products p set oculto_motivo = v.motivo, updated_at = now()
from (values
  ('. Biocap Avellanopict 23Enero', 'Duplicado de Biocap® (etiqueta del SAG): nombre sacado del archivo y sin ingrediente'),
  ('Ibicarbox Potasio K', 'Fertilizante de la carga original sin registro ni ingrediente; sus líneas son texto mal leído'),
  ('Acadian Organic Liquid Seaweed Concentrate', 'Carga original: el documento es una homologación de bioestimulante, no una etiqueta'),
  ('AL GOLD 96 EC', 'Carga original: nombre mal leído de un documento de Dual Gold 96 EC, sin ingrediente ni usos'),
  ('Baciforte 2025', 'Carga original: nombre sacado del archivo, sin ingrediente ni usos'),
  ('de Advion de sodio de la', 'Carga original: insecticida sanitario con nombre mal leído, sin ingrediente ni usos'),
  ('de Demon TC 25', 'Carga original: ficha técnica de un insecticida sanitario, sin ingrediente ni usos'),
  ('DEMAND CS', 'Carga original: ficha técnica de un insecticida sanitario, sin ingrediente ni usos'),
  ('Fendona? 6 SC no mancha ni deja olor', 'Duplicado de «Fendona 6 SC»: nombre mal leído, sin ingrediente ni usos'),
  ('Goldstar Eu Fromat Aph 1001 00 Spanish.0424', 'Carga original: hoja de seguridad europea, nombre sacado del archivo'),
  ('Icon 10 Pm 25G 2', 'Carga original: ficha técnica de un insecticida sanitario, sin ingrediente ni usos'),
  ('ISAGROW PREMIO SC', 'Carga original: sin registro, ingrediente ni usos'),
  ('Klerat Bloque Rodenticida S1129873891 V 1.4', 'Carga original: hoja de seguridad, nombre sacado del archivo'),
  ('KLERAT C', 'Carga original: ficha técnica de un rodenticida sanitario, sin ingrediente ni usos'),
  ('LD 96 EC', 'Carga original: hoja de seguridad de Dual Gold 96 EC con nombre mal leído'),
  ('Musashino Crop Report July 26 27', 'Carga original: es un informe, no un producto'),
  ('Optigard', 'Carga original: ficha técnica de un insecticida sanitario, sin ingrediente ni usos'),
  ('Optigard Lt Insecticida S191453301 2.22', 'Carga original: hoja de seguridad, nombre sacado del archivo'),
  ('Primor Insecticida S12486067 1.2', 'Carga original: hoja de seguridad, nombre sacado del archivo'),
  ('RADIFARM', 'Carga original: bioestimulante sin registro, ingrediente ni usos'),
  ('Retrosal', 'Carga original: fertilizante sin registro, ingrediente ni usos'),
  ('SATOP 90 WG', 'Carga original: hoja de seguridad de Gesatop 90 WG con nombre mal leído'),
  ('Ts2035 Oct', 'Carga original: nombre sacado del archivo, sin ingrediente ni usos'),
  ('TWA 5 mg/m Syngenta', 'Duplicado: el documento es la etiqueta de Vibrance Integral; nombre mal leído'),
  ('Viva Syngenta', 'Carga original: sin registro, ingrediente ni usos')
) as v(nombre, motivo)
where p.commercial_name = v.nombre;

do $$
declare n int;
begin
  select count(*) into n from public.products where oculto_motivo is not null;
  if n <> 25 then raise exception 'Se esperaban 25 productos ocultos y quedaron %', n; end if;
end $$;

-- La vista del sitio agrega oculto_motivo al final (mismo cuerpo que antes).
create or replace view public.v_sitio_productos with (security_invoker = true) as
 WITH docs AS (
         SELECT d.product_id, d.id, d.document_type, COALESCE(d.storage_path, d.source_url) AS url, d.page_count,
            d.version_date, true AS propio
           FROM documents d
          WHERE d.product_id IS NOT NULL
        UNION
         SELECT pu.product_id, d.id, d.document_type, COALESCE(d.storage_path, d.source_url) AS url, d.page_count,
            d.version_date, NOT d.product_id IS DISTINCT FROM pu.product_id AS propio
           FROM ( SELECT DISTINCT product_uses.product_id, product_uses.source_document_id
                   FROM product_uses
                  WHERE product_uses.source_document_id IS NOT NULL) pu
             JOIN documents d ON d.id = pu.source_document_id
        )
 SELECT id,
    commercial_name::text AS nombre,
    registration_number AS registro,
    formulation_code AS formulacion_codigo,
    formulation_name AS formulacion,
    hazard_classification AS clasificacion,
    COALESCE(( SELECT array_agg(pc.category_id ORDER BY pc.category_id) AS array_agg
           FROM product_categories pc
          WHERE pc.product_id = p.id), '{}'::smallint[]) AS categorias,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', pai.active_ingredient_id, 'conc', pai.concentration_raw) ORDER BY ai.common_name) AS jsonb_agg
           FROM product_active_ingredients pai
             JOIN active_ingredients ai ON ai.id = pai.active_ingredient_id
          WHERE pai.product_id = p.id), '[]'::jsonb) AS ingredientes,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', pcm.company_id, 'rol', pcm.role) ORDER BY (rango_rol_empresa(pcm.role))) AS jsonb_agg
           FROM product_companies pcm
          WHERE pcm.product_id = p.id), '[]'::jsonb) AS empresas,
    COALESCE(( SELECT jsonb_agg(jsonb_build_object('id', x.id, 'tipo', x.document_type, 'url', x.url, 'paginas', x.page_count, 'fecha', x.version_date) ORDER BY (x.document_type = 'etiqueta'::text) DESC, x.propio DESC, x.version_date DESC NULLS LAST) AS jsonb_agg
           FROM ( SELECT DISTINCT ON (docs.id) docs.product_id, docs.id, docs.document_type, docs.url, docs.page_count,
                    docs.version_date, docs.propio
                   FROM docs
                  WHERE docs.product_id = p.id
                  ORDER BY docs.id, docs.propio DESC) x), '[]'::jsonb) AS documentos,
    ( SELECT count(*) AS count
           FROM product_uses pu
          WHERE pu.product_id = p.id AND pu.review_status <> 'rechazado'::text) AS n_lineas,
    ( SELECT count(DISTINCT pu.crop_id) AS count
           FROM product_uses pu
          WHERE pu.product_id = p.id AND pu.review_status <> 'rechazado'::text) AS n_cultivos,
        CASE
            WHEN solo_exportacion THEN 'Solo para exportación (lo dice la etiqueta)'::text
            WHEN sustancia_prohibida IS NOT NULL THEN ('Contiene '::text || sustancia_prohibida) || ', sustancia prohibida por el SAG'::text
            WHEN sag_estado = 'cancelado'::text AND sag_fecha_limite < CURRENT_DATE THEN 'Autorización cancelada: se podía usar hasta el '::text || to_char(sag_fecha_limite::timestamp with time zone, 'DD-MM-YYYY'::text)
            ELSE NULL::text
        END AS no_disponible,
    sag_estado,
    sag_fecha_limite,
    toxicidad_abejas,
    oculto_motivo
   FROM products p;
