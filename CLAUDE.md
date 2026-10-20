# Agroquímicos Chile — memoria del proyecto

Leer completo antes de tocar algo. Última actualización: 20-10-2026.

## Quién y cómo trabajar

- Dueño: **Cristóbal Riquelme**, ingeniero agrónomo en Semillas Altue (Chile). **No es programador.**
- Claude hace todo de principio a fin. Las decisiones técnicas las toma Claude con buen criterio y
  las anota aquí. **No preguntarle cosas técnicas.**
- A Cristóbal solo se le pide lo inevitable: iniciar sesión (GitHub, Supabase) y aceptar permisos.
  Cuando se le necesite: decirle exactamente qué hacer, un paso a la vez, en español simple.
- Hablarle en **español de Chile, corto y sin jerga**.
- **Nunca borrar datos sin preguntarle.** Cualquier borrado o cambio que no se pueda deshacer: preguntar antes.

## Objetivo

Aplicación web para consultar el mercado de agroquímicos en Chile, con tablas que ayuden a decidir,
planificar aplicaciones y planes de manejo, y un foro de experiencias. La usan agrónomos, asesores y
productores, muchas veces **desde el celular en el campo**.

- **Fase 1 (hecha el 20-10-2026):** catálogo publicado.
- **Fase 2:** completar la carencia (y mojamiento, método, intervalo) desde los PDF. Ver abajo.
- **Fase 3 (no empezar sin que Cristóbal lo pida):** cuentas, planes de manejo, planificación, foro.

## Reglas del sitio (obligatorias)

1. Nunca mostrar una dosis sin su estado: «Revisado» (solo `review_status = 'aprobado'`) o
   «Extraído automáticamente», con alerta si `confidence_score < 0,80`.
2. Nunca dejar una carencia en blanco. Si falta: «Sin dato, verificar etiqueta» + link al PDF (con página).
3. Todo producto y toda línea de uso con link a su etiqueta PDF.
4. Aviso visible en todas las páginas: datos de etiquetas SAG procesadas automáticamente, pueden
   tener errores, leer la etiqueta oficial antes de aplicar.
5. **Nunca inventar ni completar datos agronómicos con conocimiento general.** Solo lo que dice la
   etiqueta, con cita (texto y página).
6. Mientras la carencia esté incompleta: `noindex` (meta robots en `index.html`). Se comparte solo por link.
7. En el navegador y en el repositorio va **solo la llave pública** (publishable/anon). Nunca la
   secreta ni `service_role`.

Por qué importa: la carencia decide si se puede cosechar. En fruta de exportación un error significa
rechazo en destino o residuos sobre la tolerancia.

## Arquitectura (decidida el 19-10-2026; no cambiarla sin avisar a Cristóbal)

- **Datos:** Supabase, única fuente de verdad. Proyecto `cejkhfugaobfqnjpkgpl`
  (https://cejkhfugaobfqnjpkgpl.supabase.co), Postgres 17, us-west-2, **plan gratis**.
- **Sitio:** estático (HTML + CSS + JS, módulos ES, **sin paso de compilación**) en el repo público
  `criquelmem19/agroquimicos-chile`, publicado con **GitHub Pages desde `main`, carpeta raíz**.
  URL: https://criquelmem19.github.io/agroquimicos-chile/
- Lee Supabase en vivo con **supabase-js 2.117.2** (UMD desde jsDelivr, con huella SRI
  `sha256-WdOUh8NYmEO0EDItij1WLOAiq6HlzLFomO8/sqDaLs0=`; si jsDelivr falla, intenta unpkg con la misma huella).
  Para cambiar de versión: actualizar URL y huella en `index.html` (la huella sale de
  `https://data.jsdelivr.com/v1/packages/npm/@supabase/supabase-js@VERSION?structure=flat`, archivo `/dist/umd/supabase.js`).
- **Costo cero:** GitHub Free + Supabase Free.
- Descartado: publicar como página de claude.ai (no puede consultar Supabase en vivo).
- El repo existía como privado con un borrador Next.js/Vercel (11-09-2026). Se reutilizó: se hizo
  público y se reemplazó el contenido por el sitio estático en un commit normal (la historia conserva el borrador).

## Accesos y herramientas (en el computador de Cristóbal, Windows)

- `git` 2.55 y **GitHub CLI** (`C:\Program Files\GitHub CLI\gh.exe`, instalado con winget). Sesión
  iniciada como `criquelmem19` (token con scopes repo y workflow).
- Identidad de git **solo en este repo**: `Cristóbal Riquelme <300155998+criquelmem19@users.noreply.github.com>`.
  Los commits terminan con `Co-Authored-By: Claude …`.
- **Supabase:** se usa el conector MCP de Supabase de claude.ai (ya autenticado, con `restore_project`,
  `execute_sql`, `apply_migration`, `get_advisors`, `deploy_edge_function`…). No tiene herramientas de
  Storage ni para borrar Edge Functions: para eso, la CLI de Supabase (ver «Pendiente»).
- **Python 3.12** en `%LOCALAPPDATA%\Programs\Python\Python312\python.exe` (puede no estar en el PATH
  de una terminal abierta antes de instalarlo). `pdftotext` viene con Git for Windows.
- La carpeta local está en OneDrive: no guardar PDFs ni archivos grandes aquí (se sincronizan).
  Usar una carpeta fuera de OneDrive o el scratchpad para trabajar con los PDF.
- Probar el sitio: `python scripts/servidor_local.py` (sin caché) → http://127.0.0.1:8765.
  En Claude Code: `.claude/launch.json` tiene la configuración «sitio» (puerto 8766).

## Base de datos

13 tablas de dominio con RLS y política `lectura_publica_*` (SELECT para `anon` y `authenticated`,
`USING (true)`). Sin políticas de escritura: insertar/editar/borrar con la llave pública es imposible.
Las 3 tablas del proceso de extracción (`extraction_runs`, `extraction_issues`, `field_evidence`)
tienen RLS **sin políticas** y sin permiso SELECT para `anon`: la llave pública recibe «permission denied»
(verificado el 20-10-2026).

| Tabla | Filas (20-10-2026) | Qué es |
|---|---|---|
| `products` | 151 | Producto comercial = una etiqueta |
| `active_ingredients` | 90 | `mechanism_group` + `mechanism_system` (IRAC/FRAC/HRAC) |
| `product_active_ingredients` | 167 | Concentración cruda y normalizada |
| `companies` / `product_companies` | 40 / 290 | `role`: titular, registrante, fabricante, formulador, importador, distribuidor, otro |
| `categories` / `product_categories` | 10 / 166 | Acaricida, Fungicida, Herbicida, Insecticida… |
| `crops` | 340 | `aliases text[]` (sinónimos para buscar) |
| `targets` | 1.279 | Plagas, enfermedades, malezas (`target_type` poco confiable) |
| **`product_uses`** | **2.743** | **Tabla central**: una línea de uso (producto + cultivo + dosis…) |
| `use_targets` | 12.441 | Línea de uso ↔ objetivo |
| `product_safety_profiles` | 149 | EPP, reingreso (`reentry_hours`), primeros auxilios, compatibilidad |
| `documents` | 150 | Etiquetas (136), HDS (7), otros (7); `storage_path` = URL pública del PDF |
| `extraction_runs` / `extraction_issues` / `field_evidence` | 308 / 42 / 0 | Proceso, no dominio |

- Bucket público `etiquetas`: 152 PDF (96 MB), ruta `<sha256>/<archivo>.pdf`. Sin políticas de
  escritura (solo se descarga). 3 archivos `*_1_.pdf` son copias de otros ya registrados.
- `product_uses.review_status`: pendiente | revisado | aprobado | rechazado. El sitio oculta `rechazado`
  y solo muestra «Revisado» para `aprobado`.
- Extractor original: `rotulo-local-v3`, reglas locales **sin modelo de lenguaje** (`model_name = reglas-locales-sin-llm`).
- Vistas antiguas (todas `security_invoker = true`): `v_agrochemical_crop_lines`, `v_products_summary`,
  `v_export_excel`, `vista_plana`.
- **Vistas del sitio** (creadas el 20-10-2026, `security_invoker`, solo SELECT):
  `v_sitio_productos` (producto con categorías, ingredientes, empresas y documentos en JSON),
  `v_sitio_cultivos`, `v_sitio_objetivos` (con conteos de líneas y productos), `v_estado_datos`
  (indicadores de completitud, una fila).
- Extensiones `citext` y `pg_trgm` movidas al esquema `extensions` (advisor de seguridad). Probado:
  los filtros sin mayúsculas siguen funcionando por la API.
- Migraciones: 27 antiguas (jul–ago 2026, solo en la historia de Supabase: `list_migrations`) + las de
  `supabase/migrations/` de este repo. La migración `20260911000002_invariantes_de_calidad` del borrador
  anterior **nunca se aplicó** y el archivo se perdió: su idea (no aprobar sin carencia) va en la Fase 2.
- Advisors (20-10-2026): seguridad solo queda el INFO «RLS sin políticas» de las 3 tablas del proceso
  (es intencional). Rendimiento: se agregaron los índices faltantes; los «unused index» son porque las
  estadísticas se reiniciaron al despertar el proyecto.

### Estado de los datos (medido el 20-10-2026, sobre 2.743 líneas)

| Dato | Líneas | % |
|---|---|---|
| Dosis interpretada (`dose_min`) | 2.612 | 95 |
| **Carencia resuelta** (días o «no aplica») | **56** (36 días + 20 no aplica) | **2** |
| Mojamiento (mín. o máx.) | 56 (solo máximo) | 2 |
| Método de aplicación | 544 | 20 |
| Intervalo | 442 | 16 |
| Aprobadas | 56 | 2 |
| Confianza < 0,80 | 260 | 9,5 (promedio 0,918) |

Las 56 aprobadas son **todas de ACABAN® 050 SC** (producto de prueba del esquema, «Carga inicial
revisada» 14-07-2026), y su documento **no tiene PDF** en el bucket (`storage_path` null): pedir el PDF a Cristóbal.

### Problemas conocidos de los datos (no corregidos; no borrar sin preguntar)

- 84 «cultivos» son frases mal leídas (instrucciones de uso) con 92 líneas en total; además hay nombres
  cortos que no son cultivos («ADVERTENCIAS», «Syngenta», «NOCIVO») o que juntan varios («Manzano, Peral.»).
  El sitio marca como frase los de >40 caracteres o >6 palabras y **no los muestra en el buscador ni en
  «¿Qué aplico?»**; sus líneas sí se ven en la ficha del producto.
- Cultivos duplicados/variantes: «Repollito de Bruselas» / «Repollo de Bruselas» / «REPOLLODE BRUSELAS»,
  «Zarzaparrila» / «Zarzaparrilla», «Mango» (0 líneas) / «Mango Vides Forestales».
- Objetivos con muchas variantes (ej. 50 «oídio» con distintos nombres científicos). El sitio ofrece
  «Todos los que dicen «oídio»» para verlos juntos. `target_type` tiene errores (Botrytis como insecto).
- Productos duplicados: «Fendona 6 SC» (con 5 líneas, sin documento propio) y «Fendona? 6 SC no mancha
  ni deja olor» (con el documento). Las líneas apuntan al PDF correcto vía `source_document_id`.
  «Miravis Duo» y «MIRAVIS DUO» son dos productos distintos (dos etiquetas).
- Nombres de producto sacados del nombre de archivo: «. Biocap Avellanopict 23Enero», «20241202 Botristop».
- Ingredientes basura: «Concentracion», «Concentración», «Ibiforte», «Adepidin»; duplicados
  «Pidiflumetofen»/«Pidiflumetofeno», «Bordelés»/«Caldo Bordelés».
- Perfiles de seguridad con textos cortados por OCR (ej. primeros auxilios «Lavar los»).
- `crops.aliases` estaba vacío: el 20-10-2026 se llenaron 45 cultivos con sinónimos de nombre común
  (Vid = Uva = Parronal, Palto = Palta…). Son **solo para buscar**, no datos de etiqueta.

## El sitio

- `index.html`: una sola página, `noindex`, aviso permanente, carga supabase-js y `assets/js/app.js`.
- Rutas con `#` (funcionan en GitHub Pages sin configuración):
  - `#/` buscador único (productos, ingredientes, cultivos+alias, objetivos, empresas; sin tildes ni mayúsculas).
  - `#/aplicar?cultivo=<id>&objetivo=<id>|todos&oq=<texto>&usados=FRAC 3,IRAC 4A&orden=moa|producto|carencia`
    «¿Qué puedo aplicar?»: tabla con ingrediente, grupo de modo de acción, dosis+estado, carencia,
    reingreso; herramienta para rotar (marcar grupos ya usados). También parte por objetivo sin cultivo.
  - `#/productos?cat=&moa=&empresa=&ing=&q=` lista con filtros por categoría, modo de acción y empresa.
  - `#/producto/<id>` ficha: ingredientes, empresas y roles, líneas de uso por cultivo, seguridad, documentos.
  - `#/estado` «Estado de los datos» (en vivo desde `v_estado_datos`).
- Datos: al abrir se cargan las listas chicas (vistas `v_sitio_*`, `categories`, `active_ingredients`,
  `companies`, reingreso de `product_safety_profiles`); las líneas de uso se piden por cultivo, objetivo o
  producto. Todo paginado de a 1.000 filas (límite de la API) en `db.js → todas()`.
- Sin conexión: si falla la carga, usa la última copia guardada en `localStorage` y lo avisa.
- Las piezas que cumplen las reglas 1–3 están en `assets/js/ui.js` (`estadoRevision`, `dosis`,
  `carencia`, `reingreso`, `linkPdf`, `urlDeLinea`). Usarlas siempre; no mostrar dosis ni carencia «a mano».
- La dosis se muestra **como texto de la etiqueta** (`dose_raw`), no los números interpretados.
- Seguridad del código: los textos de la base nunca se insertan como HTML (`h()` en `ui.js`).
- Diseño: verde campo + banda ocre (como la banda de una etiqueta), letra del sistema a 17 px, alto
  contraste para el sol, modo oscuro automático o con botón (guardado en `localStorage`), barra inferior
  en celular. Los grupos FRAC/IRAC/HRAC tienen color propio.
- Fase 3 sin rehacer: agregar secciones en `SECCIONES` de `app.js` (menú + ruta) y vistas nuevas en
  `assets/js/vistas/`. El cliente de Supabase está en `db.js → cliente()`; para Auth, activar
  `persistSession` allí.
- GitHub Pages cachea ~10 minutos: después de publicar, los cambios pueden tardar en verse.

## Mantener Supabase despierto

`.github/workflows/mantener-activo.yml`: dos veces al día (11:17 y 23:43 UTC) hace tres consultas de
lectura con la llave pública. Si fallan, el flujo queda en rojo y GitHub manda correo a Cristóbal.
Para que GitHub no lo desactive (60 días sin actividad en repos públicos), si el último commit tiene
30 días o más, el flujo actualiza `registro/latido.txt` con la API (un commit chico).
Si el proyecto igual se pausa: `restore_project` con el MCP (o el botón «Resume» en el panel), esperar
a `ACTIVE_HEALTHY` (2–5 minutos).

## Cómo cargar información nueva

- **Etiqueta nueva (PDF):**
  1. Calcular sha256; si ya existe en `documents.sha256`, no repetir.
  2. Subir al bucket `etiquetas` en `<sha256>/<nombre-sin-espacios>.pdf` (requiere la CLI de Supabase con
     sesión iniciada: `supabase storage cp archivo.pdf ss:///etiquetas/<sha256>/<archivo>.pdf --experimental --linked`).
  3. Registrar en `documents` (tipo, `storage_path` = URL pública, `version_date`, `page_count`, `sha256`).
  4. Extraer producto, ingredientes, empresas, categorías, usos (cultivo, objetivos, dosis, carencia,
     mojamiento, intervalos, observaciones) y perfil de seguridad **con cita (`source_text`) y página
     (`source_page`)**. Todo queda `review_status = 'pendiente'` y aparece en el sitio de inmediato.
  5. Registrar la corrida en `extraction_runs` con un `extractor_version` propio.
- **Corrección:** Cristóbal dice el dato y de dónde sale. Actualizar el campo y anotar la fuente
  (en `observations`, `reviewed_by`/`reviewed_at` o `extraction_issues.resolution_notes`). «Aprobado» solo
  si una persona lo revisó.
- **Nunca borrar datos sin preguntar.**

## Fase 2: completar la carencia (plan)

Ver la sección «Fase 2 — estado» más abajo para lo avanzado.

1. Los PDF están en el bucket (URL pública en `documents.storage_path`). Descargarlos con un script
   directo a una carpeta fuera de OneDrive (no pasar archivos por el contexto del modelo).
2. Texto por página con `pdftotext -layout`; páginas sin texto → OCR o leer la imagen.
3. Buscar: «período de carencia», «carencia», «tiempo de espera a cosecha», «días a cosecha», «PC»,
   «no aplicar dentro de los N días previos a la cosecha». Suele estar fuera del cuadro de dosis y cambia por cultivo.
4. Por línea de uso: días, o `withholding_not_applicable`, siempre con cita textual
   (`withholding_period_raw`) y página (`source_page` de la cita). **Sin cita, queda vacío.**
5. En la misma pasada: mojamiento (L/ha), método de aplicación, intervalo entre aplicaciones.
6. `extractor_version` nuevo. Escribir primero en una tabla aparte, comparar, y después llenar en
   `product_uses` **solo campos vacíos**. No pisar valores existentes: los conflictos se le muestran a Cristóbal.
7. Lo extraído queda «pendiente». «Aprobado» solo lo revisa una persona.
8. Regla en la base: una línea no puede quedar «aprobado» sin carencia resuelta (revisar antes las filas
   que no la cumplen: al 20-10-2026 son 0).
9. Medir cobertura antes y después. Meta: 80–90 % de las líneas con carencia resuelta y citada.

## Fase 3 (más adelante; no empezar sin pedido)

Cuentas con Supabase Auth, planes de manejo, planificación de aplicaciones, foro con experiencias.
Tablas nuevas con RLS por `auth.uid()`; el foro necesita moderación. Decidir si el catálogo sigue con
lectura pública completa (hoy cualquiera con la llave pública puede descargarlo entero).

## No reintentar

- Fórmulas `IMPORTDATA`/`IMPORT*` creadas con la API de Google Drive: Google no las evalúa.
- Pasar archivos grandes por el contexto del modelo.
- Planilla de Google Sheets conectada en vivo (ago 2026): no resultó.
- Las Edge Functions `export-csv` y `agro-script` (token compartido, `service_role`): fueron
  neutralizadas el 20-10-2026 (responden 401/410). No volver a crear exportaciones sin autenticación.

## Pendiente

- **Borrar definitivamente** las Edge Functions `export-csv` y `agro-script` (hoy desactivadas: exigen
  JWT y responden «Función retirada»). El MCP no tiene herramienta para borrar: usar la CLI de Supabase
  (`supabase functions delete <nombre> --project-ref cejkhfugaobfqnjpkgpl`) o el panel.
- Instalar la CLI de Supabase y que Cristóbal inicie sesión (`supabase login`): necesaria para subir PDF
  nuevos al bucket y para borrar las funciones.
- Pedir a Cristóbal el PDF de ACABAN® 050 SC (sus 56 líneas aprobadas no tienen etiqueta enlazable).
- Limpieza de datos (con su visto bueno): cultivos-frase, duplicados de cultivos, objetivos y productos,
  ingredientes basura.
- Mejoras posibles: modo sin conexión completo (service worker), imagen para compartir por WhatsApp,
  favoritos por celular.
