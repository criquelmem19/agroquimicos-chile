# Agroquímicos Chile

Catálogo del mercado chileno de agroquímicos, con planificación de aplicaciones
y foro de experiencias. Los datos se extraen de etiquetas oficiales del SAG.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase (Postgres + Auth +
Storage) · deploy en Vercel.

```bash
npm install
npm run dev          # localhost:3000
npm run types        # regenera types/database.types.ts desde la base
npx supabase db pull # trae migraciones nuevas de la nube al repo
npx supabase db push # aplica migraciones locales a la nube
```

Variables en `.env.local` (ver `.env.local.example`). Nunca commitear claves.

## Proyecto Supabase

- ref `cejkhfugaobfqnjpkgpl`, región us-west-2, Postgres 17
- **Plan free: el proyecto se pausa tras ~1 semana sin uso.** Si una consulta
  falla con "relation does not exist", probablemente está despertando: esperar
  2-3 minutos. Para producción hace falta plan Pro.
- Bucket `etiquetas`: 152 PDFs, 96 MB, **público**.
- `pg_trgm` está instalado — usarlo para la búsqueda por nombre.

## Modelo de datos

Tablas en inglés, vistas con nombres en español. Todo en `public`.

| Tabla | Filas | Qué es |
|---|---|---|
| `products` | 151 | Un producto comercial = una etiqueta SAG |
| `active_ingredients` | 90 | Con `mechanism_group` + `mechanism_system` (IRAC/FRAC/HRAC) |
| `product_active_ingredients` | 167 | N:N, con concentración cruda y normalizada |
| `companies` / `product_companies` | 40 / 290 | `role`: titular, registrante, fabricante, formulador, importador, distribuidor, otro |
| `categories` / `product_categories` | 10 / 166 | Insecticida, fungicida, herbicida… |
| `crops` | 340 | `aliases text[]` para homologar (Vid = Uva = Parronal) |
| `targets` | 1.279 | Plagas, enfermedades, malezas |
| **`product_uses`** | **2.743** | **Tabla central.** Una fila = producto + cultivo + dosis |
| `use_targets` | 12.441 | N:N uso–plaga |
| `product_safety_profiles` | 149 | EPP, reingreso, primeros auxilios, incompatibilidades |
| `documents` | 150 | Etiquetas/HDS, con `sha256` y `storage_path` |

Pipeline de extracción, no es dominio agronómico: `extraction_runs` (308,
`raw_output` jsonb pesa ~10 MB), `extraction_issues` (42), `field_evidence` (0).

### Vistas

- `vista_plana` — una fila por producto × cultivo × plaga (12.591). Es la
  pantalla principal de consulta. Ordenar por `uso_id, objetivo_id`.
- `v_agrochemical_crop_lines` — una fila por línea de uso (2.743), 52 columnas,
  la más completa: observaciones, compatibilidades, `document_url`.
- `v_products_summary` — un producto por fila, con conteos de revisión.
- `v_export_excel` — encabezados en español. **No tiene columna única**, no
  sirve para paginar.

## Regla no negociable de la interfaz

Este catálogo dice qué dosis aplicar y cuántos días esperar antes de cosechar.
Un dato equivocado puede significar fruta rechazada en exportación o un residuo
por sobre tolerancia. Entonces:

1. **Nunca mostrar una dosis sin su estado de revisión visible.** Hoy solo 56 de
   2.743 líneas están aprobadas; 2.687 siguen en `pendiente`.
2. **Nunca mostrar un número de carencia que no exista en la base.** Si
   `carencia_dias` es null y `carencia_no_aplica` es false, decir "no extraída,
   verificar etiqueta" y enlazar el PDF. No inferirla, no dejarla en blanco.
3. **Siempre ofrecer el documento fuente** (`source_document_id`, `source_page`).
   El usuario tiene que poder llegar a la etiqueta en un clic.
4. La app informa, no prescribe. La etiqueta oficial manda.

## Estado de los datos (11-09-2026)

Medido, no estimado:

| Campo | Cobertura |
|---|---|
| `dose_min` parseada | 2.612 / 2.743 (95%) |
| `withholding_period_days` (carencia) | **36 / 2.743 (1%)** |
| `withholding_period_raw` | 56 / 2.743 |
| `water_volume_min_l_ha` (mojamiento) | **0 / 2.743** |
| `application_method` | 735 / 3.903 en crudo (19%) |
| `review_status = aprobado` | 56 / 2.743 |
| `confidence_score` promedio | 0,918 (260 líneas bajo 0,80) |

La causa está en `docs/DIAGNOSTICO-carencia.md`. Resumen: el extractor **pide**
los campos pero el modelo los devuelve vacíos en el 100% de los casos, y el dato
tampoco quedó en `observations` ni en `source_text`. Hay que arreglar el prompt
y reprocesar los 150 PDFs del bucket. No es un problema de parseo.

## Convenciones

- Migraciones con `supabase migration new <nombre_en_snake_case>`, nombres en
  español. Hay 27 aplicadas; la historia está en la nube y `db pull` la trae.
- Las vistas usan `security_invoker = true` para que respeten RLS.
- Después de cambiar el esquema: `npm run types`.
- Los comentarios y los nombres de vistas van en español; el código en inglés.

## Cosas que ya se descartaron (no reintentar)

- La API de Drive no crea fórmulas `IMPORTDATA` en archivos subidos por API:
  quedan como texto o `#REF!`. Para llevar datos a Sheets hay que usar Apps
  Script autorizado por el usuario.
- Hay dos Edge Functions desplegadas, `export-csv` y `agro-script`, con
  `verify_jwt=false` y token compartido `agro2026-cl-ro`. Sirven para exportar,
  pero **son un agujero**: exponen todo el catálogo sin auth. Borrarlas o
  ponerles auth real antes de publicar la app.
