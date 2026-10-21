# Agroquímicos CRM — memoria del proyecto

Leer completo antes de tocar algo. Última actualización: 21-10-2026.
El sitio se llama **Agroquímicos CRM** (antes «Agroquímicos Chile»; el repo y la URL siguen siendo
`agroquimicos-chile`). «CRM» es la marca de Cristóbal y va arriba, en el logo.

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
- **Fase 2 (hecha el 20 y 21-10-2026):** carencia de 2 % a 89,5 % de las líneas, con cita y página; además
  mojamiento, método e intervalo. Ver «Fase 2 — estado».
- **Plan de aplicaciones (hecho el 21-10-2026, a pedido de Cristóbal):** calendario por cultivo con
  alertas (ver «El sitio»). Se guarda en el equipo; los planes de Cristóbal también quedan guardados en
  la base y se abren con su link personal (ver «Planes guardados»).
- **Fase 3 (no empezar sin que Cristóbal lo pida):** cuentas, planes guardados en la nube y compartidos, foro.

## Reglas del sitio (obligatorias)

1. Nunca mostrar una dosis sin su estado: «Revisado» (solo `review_status = 'aprobado'`) o
   «Extraído automáticamente», con alerta si `confidence_score < 0,80`.
2. Nunca dejar una carencia en blanco. Si falta: «Sin dato, verificar etiqueta» + link al PDF (con página).
3. Todo producto y toda línea de uso con link a su etiqueta PDF.
4. ~~Aviso visible en todas las páginas~~: **eliminado a pedido de Cristóbal el 21-10-2026** («elimina
   de la app todo este tipo de avisos»), junto con los textos de presentación de cada página, la nota del
   pie («Fuente…») y la página «Estado de los datos». No volver a agregar avisos generales ni textos
   explicativos largos. Se mantienen las etiquetas por dato (reglas 1–3) y las alertas del plan.
5. **Nunca inventar ni completar datos agronómicos con conocimiento general.** Solo lo que dice la
   etiqueta, con cita (texto y página).
6. Mientras la carencia esté incompleta: `noindex` (meta robots en `index.html`). Se comparte solo por link.
7. En el navegador y en el repositorio va **solo la llave pública** (publishable/anon). Nunca la
   secreta ni `service_role`.

Por qué importa: la carencia decide si se puede cosechar. En fruta de exportación un error significa
rechazo en destino o residuos sobre la tolerancia.

## Reglas de estética (pedidas por Cristóbal el 21-10-2026)

- Limpio, moderno y sencillo, **al estilo de los sitios de Enza Zaden**: fondo blanco, mucho aire, letra
  redondeada (**Rubik**, de Google Fonts, con la del sistema de respaldo), botones tipo píldora negros,
  bloques de color plano en la portada, tarjetas con bordes suaves y pie de página negro. Solo información importante.
- Paleta fresca: **verde** (`#1f9d55`, bloques `#63d17b`), **azul** (`#1d6fd8`, bloques `#cfe3fa`),
  **negro** (`#141414`), **beige muy claro** (`#f7f4ee`) y **gris** (`#6b6962`). Todo como variables en
  `assets/css/app.css`.
- **Sin modo noche** (Cristóbal lo pidió quitar el 21-10-2026: «está muy de más»). Solo modo claro.
- Marca: logo «CRM» (píldora negra con letras blancas y un punto verde) arriba a la izquierda, junto a
  «Agroquímicos CRM». Ícono de la pestaña: `assets/img/icono.svg` con la misma marca.
- Se mantienen: letra de 17 px y alto contraste (se usa al sol), barra inferior en celular (Buscar,
  Qué aplico, Plan, Productos).
- Grupos de modo de acción con color propio: FRAC azul, IRAC verde, HRAC tierra.

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
Las 4 tablas del proceso de extracción (`extraction_runs`, `extraction_issues`, `field_evidence`,
`use_field_candidates`) tienen RLS **sin políticas** y sin permiso SELECT para `anon`: la llave pública
recibe «permission denied» (verificado el 20-10-2026).

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
| `extraction_runs` / `extraction_issues` / `field_evidence` | 505 / 42 / 0 | Proceso, no dominio |
| `use_field_candidates` | 3.402 | Proceso (Fase 2): valores leídos de los PDF con cita y página, antes de aplicarlos |
| `planes_guardados` | 1 | Planes de aplicación de una persona, privados, se leen con su clave (ver «Planes guardados») |

- `product_uses.field_citations` (jsonb, Fase 2): `{"carencia"|"mojamiento"|"intervalo"|"metodo":
  {"cita", "pagina", "extractor"[, "condicional"]}}`. La página de la cita va aquí; `source_page` sigue
  siendo la del cuadro de dosis.
- Reglas en la base (Fase 2): `aprobado_requiere_carencia`, `carencia_requiere_cita` (días o «no aplica»
  exigen `withholding_period_raw`), `carencia_dias_o_no_aplica`.

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
  los filtros sin mayúsculas siguen funcionando por la API. La extensión `http` se usó solo para cargar
  la Fase 2 y se quitó el mismo día.
- Migraciones: 27 antiguas (jul–ago 2026, solo en la historia de Supabase: `list_migrations`) + las de
  `supabase/migrations/` de este repo (copia de cada una aplicada con el MCP; el texto exacto también está
  en `supabase_migrations.schema_migrations.statements`). La migración `20260911000002_invariantes_de_calidad`
  del borrador anterior **nunca se aplicó**; su idea quedó en `aprobado_requiere_carencia`.
- Advisors (21-10-2026): seguridad solo quedan el INFO «RLS sin políticas» de las 4 tablas del proceso
  y de `planes_guardados`, y el WARN de `plan_guardado` ejecutable por anon (todo intencional).
  Rendimiento: solo «unused index» (las estadísticas se reiniciaron al despertar el proyecto).

### Estado de los datos (medido el 20-10-2026, sobre 2.743 líneas)

| Dato | Antes de la Fase 2 | Después de la Fase 2 |
|---|---|---|
| Dosis interpretada (`dose_min`) | 2.612 (95 %) | igual |
| **Carencia resuelta** (días o «no aplica») | 56 (2 %) | **2.456 (89,5 %)**: 1.673 con días + 783 no aplica |
| Carencia «depende» (condicionada, con cita) | 0 | 26 |
| Mojamiento (mín. o máx.) | 56 (2 %) | 816 (29,7 %) |
| Método de aplicación | 544 (20 %) | 667 (24,3 %) |
| Intervalo | 442 (16 %) | 531 (19,4 %) |
| Aprobadas | 56 (2 %) | igual |
| Confianza < 0,80 | 260 (9,5 %; promedio 0,918) | igual |

Las 56 aprobadas son **todas de ACABAN® 050 SC** (producto de prueba del esquema, «Carga inicial
revisada» 14-07-2026), y su documento **no tiene PDF** en el bucket (`storage_path` null). Ese documento
es la versión del **16-06-2025** (`acaban_050_sc (1).pdf`, sha256 `514f80b8…`). El 21-10-2026 Cristóbal
mandó otro PDF: la etiqueta del **26-10-2022** (sha256 `d3229ccd…`), que **no coincide** en la carencia de
5 cultivos (palto 14 vs 1 día en la base, ciruelo y damasco 7 vs 6, durazno y nectarino 7 vs 2; el resto,
dosis, mojamientos y máximo 1 por temporada, coincide). No se enlazó: falta el PDF de 2025.

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
- `application_method` de la carga original: muchos con basura (texto OCR revuelto, «NOCIVO», «CUIDADO»,
  párrafos enteros) y algunos errados. Katana Syngenta (4 líneas de cítricos decían «Al follaje» y la
  etiqueta dice «dirigido al suelo… para evitar daños al follaje») **se corrigió el 21-10-2026 con el «sí»
  de Cristóbal** (`correccion_metodo_katana`; el valor anterior quedó en `use_field_candidates.existing_value`).
  Lista completa de diferencias en `datos/fase2/reporte_otros_v1.txt` (casi todas son solo otro nombre:
  «Riego por goteo» = «Vía riego»).
- Intervalo: 4 líneas guardan 14–14 días donde la etiqueta dice «intervalo de 14 días como máximo».

## El sitio

- `index.html`: una sola página, `noindex`, aviso permanente, carga supabase-js y `assets/js/app.js`.
- Rutas con `#` (funcionan en GitHub Pages sin configuración):
  - `#/` buscador único (productos, ingredientes, cultivos+alias, objetivos, empresas; sin tildes ni mayúsculas).
  - `#/aplicar?cultivo=<id>&objetivo=<id>|todos&oq=<texto>&usados=FRAC 3,IRAC 4A&orden=moa|producto|carencia`
    «¿Qué puedo aplicar?»: tabla con ingrediente, grupo de modo de acción, dosis+estado, carencia,
    reingreso; herramienta para rotar (marcar grupos ya usados). También parte por objetivo sin cultivo.
  - `#/productos?cat=&moa=&empresa=&ing=&q=` lista con filtros por categoría, modo de acción y empresa.
  - `#/producto/<id>` ficha: ingredientes, empresas y roles, líneas de uso por cultivo, seguridad, documentos.
  - `#/plan?producto=<id>&uso=<id>` / `#/plan?abrir=<clave>` «Plan de aplicaciones»: calendario del mes +
    lista por día (cada día = una mezcla: n.° de aplicación, etapa, equipo y sus productos). Los botones
    «Al plan» de «¿Qué aplico?» y «Agregar al plan» de la ficha llegan con el producto y el uso elegidos.
    Guardado en el equipo (`localStorage`, clave `planes-v1`; varios planes). Lógica en `assets/js/plan.js`
    (sin interfaz), vista en `assets/js/vistas/plan.js`.
    - Plan: nombre, cultivo (o varios: `otrosCultivos`, ej. cucurbitáceas), **destino consumo o
      semillero** («Lechuga semillero»), fecha de trasplante y de cosecha (de semilla si es semillero).
    - Aplicación: por fecha o por **días desde el trasplante** (`ddt`; con la fecha de trasplante la fecha
      sale sola y se mueve si cambia el trasplante). Producto del catálogo (con su uso de la etiqueta) o
      **fuera del catálogo** (`externo`: nombre, ingrediente, tipo). Además: dosis de tu plan, objetivo,
      equipo, etapa, n.° de aplicación, alternativa Syngenta, nota.
    - Alertas (solo comparan con la etiqueta, sin recomendaciones propias): mismo grupo IRAC/FRAC/HRAC en
      la misma mezcla, en la aplicación anterior o antes en el plan; la etiqueta no tiene usos para el
      cultivo; más aplicaciones que el máximo por temporada; menos días que el intervalo; no alcanza la
      carencia antes de la cosecha (o sin dato / «depende»); uso de otro cultivo. El grupo de un producto
      fuera del catálogo sale de su ingrediente si ese ingrediente está en el catálogo (grupos de las
      etiquetas; tolera errores de tipeo); fertilizantes, bioestimulantes y coadyuvantes no tienen grupo.
      Aparecen antes de agregar y en un aviso emergente (`notificar` en `ui.js`).
    - Exporta a CSV para Excel (`;`, UTF-8 con BOM) e imprime la lista.
- Datos: al abrir se cargan las listas chicas (vistas `v_sitio_*`, `categories`, `active_ingredients`,
  `companies`, reingreso de `product_safety_profiles`); las líneas de uso se piden por cultivo, objetivo o
  producto. Todo paginado de a 1.000 filas (límite de la API) en `db.js → todas()`.
- Sin conexión: si falla la carga, usa la última copia guardada en `localStorage` y lo avisa.
- Las piezas que cumplen las reglas 1–3 están en `assets/js/ui.js` (`estadoRevision`, `dosis`,
  `carencia`, `reingreso`, `linkPdf`, `urlDeLinea`). Usarlas siempre; no mostrar dosis ni carencia «a mano».
  `carencia`, `mojamiento`, `intervalo` y `metodo` muestran el valor con su cita «…» (pág. N) desde
  `field_citations` (`citaDe`); carencia condicionada → «Depende: ver condición en la etiqueta» + cita.
- La dosis se muestra **como texto de la etiqueta** (`dose_raw`), no los números interpretados.
- Seguridad del código: los textos de la base nunca se insertan como HTML (`h()` en `ui.js`).
- Diseño: ver «Reglas de estética». La página «Estado de los datos» se eliminó (la vista
  `v_estado_datos` sigue en la base: el pie usa su fecha de última actualización).

## Planes guardados (link personal, sin cuentas)

- Tabla privada `planes_guardados` (clave secreta ≥ 32 caracteres, descripción, `datos` = `{version, planes}`
  en el formato de `plan.js`). Sin permisos para la llave pública; se lee solo con la función
  `plan_guardado(p_clave)` (SECURITY DEFINER, `search_path` vacío), que devuelve el plan de esa clave y
  nada más. El advisor muestra un WARN por esa función: es intencional (funciona como un link secreto).
- El sitio abre `#/plan?abrir=<clave>`: copia los planes al equipo; si ya estaban, pregunta antes de
  reemplazarlos (se perderían los cambios hechos en ese equipo).
- **Plan de Cristóbal (21-10-2026):** lechuga semillero (87 aplicaciones) y cucurbitáceas semillero
  (86; cultivos Cucurbitáceas, Zapallo, Zapallo italiano, Melón, Sandía, Pepino y Pepino dulce),
  temporada 26-27, desde su planilla Excel (hojas fitosanitarias y de fertilización; **sin precios**).
  Sin fecha de trasplante: él la pone en el sitio. La clave está solo en el link que se le entregó (no se
  escribe aquí: el repo es público). Los datos del plan no van al repo.
- Convertir una planilla: `scripts/planes/planilla_a_plan.py` (lee el .xlsx sin librerías, reconoce las
  mezclas por las celdas combinadas, busca los productos en el catálogo y elige el uso de la etiqueta si
  es claro). Cargar: INSERT a `planes_guardados` con el JSON (en partes si es largo) y comprobar con una
  suma md5 por plan (id, ddt, producto, dosis, objetivo…) calculada igual en Python y en SQL.
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
     Carencia, mojamiento, intervalo y método: con el procedimiento de la Fase 2 (cita en `field_citations`).
  5. Registrar la corrida en `extraction_runs` con un `extractor_version` propio.
- **Corrección:** Cristóbal dice el dato y de dónde sale. Actualizar el campo y anotar la fuente
  (en `observations`, `reviewed_by`/`reviewed_at` o `extraction_issues.resolution_notes`). «Aprobado» solo
  si una persona lo revisó.
- **Nunca borrar datos sin preguntar.**

## Fase 2 — estado (hecha el 20-10-2026)

Resultado: ver «Estado de los datos». Quedan 261 líneas (9,5 %) con «Sin dato, verificar etiqueta»
(más 26 «Depende»): sobre todo «cultivos» que son frases o palabras sueltas («NOCIVO», «CUIDADO»),
flores y ornamentales para los que la etiqueta no da carencia (no se asume «no aplica» sin cita), usos al
suelo o en bandejas que la etiqueta no cubre (ACTARA: 92 líneas) y fertilizantes/bioestimulantes cuyas
etiquetas no hablan de carencia (BOROCAL S, Ibicarbox, Stimplex, Acadian). Se comprobó con OCR de página
completa que esas etiquetas no esconden la carencia en imágenes. Detalle por etiqueta:
`datos/fase2/reporte_carencias_v2.txt`. Todo quedó «pendiente» («Extraído automáticamente»): nada se
marcó como revisado.

**Carencia (extractor `carencia-fase2-v1`)**, scripts en `scripts/fase2/` (cada uno explica su uso arriba):
1. `descargar_pdfs.py` baja los PDF del bucket a una carpeta fuera de OneDrive (scratchpad) y verifica el sha256.
2. `extraer_texto.py` saca el texto por página (`pdftotext`, modo lectura). Páginas sin texto:
   `completar_con_ocr.py` + `ocr_windows.ps1` (OCR de Windows, español, una página por llamada).
   Capa de texto dañada (CUPROFORTE pág. 3): `render_pagina.py` + `ocr_imagen.ps1` + `parchar_corpus.py`.
3. `bajar_lineas.py` baja las líneas de uso (llave pública); `fragmentos.py` y `ver_lineas.py` muestran,
   por etiqueta, los párrafos de carencia y los cultivos de sus líneas.
4. Claude leyó cada etiqueta y escribió el **mapa** (`mapa_carencias.py` + `mapa_lote2…5.py`): por
   documento, reglas cultivo → días / «NA» / «COND», con cita literal, encabezado opcional y página.
   Cuadros con columna de carencia: valor leído en la imagen de la página (lote 5).
5. `aplicar_mapa.py` comprueba que **cada cita exista tal cual en esa página** (solo se normalizan
   espacios), asigna valores por cultivo y condición, deja fuera los conflictos y escribe el reporte.
6. `exportar_candidatos.py` → `datos/fase2/carencias_v1.json` (queda en el repo, auditable).
7. Carga: la base lee el JSON desde GitHub fijado a un commit (extensión `http` temporal,
   `scripts/fase2/cargar_candidatos.sql`) a la tabla privada `use_field_candidates`; la migración
   `fase2_aplicar_carencias_v1` llena **solo líneas sin carencia** (`withholding_period_raw` = cita;
   `field_citations.carencia`). 0 conflictos con valores existentes. Luego se quita `http`.
   Lotes chicos (decenas de filas): `sql_candidatos.py <archivo.json>` genera el INSERT desde el JSON y
   va directo por `execute_sql`, sin `http`.
8. **Lote 6 (`carencia-fase2-v2`, 21-10-2026):** etiquetas con la carencia fuera de la capa de texto.
   Biocap (pág. 2: columna que es imagen, «Carencia: No posee (0 días).», 44 líneas) y FALCON (texto con
   espacios dentro de las palabras, «car encia», 3 líneas). `ocr_paginas_completas.py` lee la página con
   OCR, se revisa contra la imagen y `parchar_corpus.py` reemplaza la página en el corpus. `doc(...,
   extractor="carencia-fase2-v2")` en `mapa_lote6.py`; `exportar_candidatos.py … carencia carencia-fase2-v2`
   exporta solo ese lote (`datos/fase2/carencias_v2.json`). Se comprobó que la exportación v1 rehecha es
   idéntica byte a byte a la ya cargada.

**Mojamiento, intervalo y método (extractor `campos-fase2-v1`)**: `extraer_otros.py`, reglas locales sin
modelo de lenguaje sobre el texto de cada línea. Solo acepta un valor si la frase citada existe tal cual
en el PDF; si una línea trae valores distintos (ej. terrestre y aérea) no se llena. Excluye umbrales
(«para volúmenes mayores… respetar la dosis por concentración»), cifras que dependen del cultivo
(«Pomáceas: 1.500 L/ha»), precauciones generales («para aplicaciones aéreas prohíbase…») y rangos al
revés («14 a 1 días»). Datos: `datos/fase2/{mojamiento,intervalo,metodo}_v1.json`; diferencias con
valores existentes: `datos/fase2/reporte_otros_v1.txt`. Aplicado con `fase2_aplicar_campos_v1`, solo en
campos vacíos. **v2 (`campos-fase2-v2`, 21-10-2026):** si la frase no está en la capa de texto, se busca
en el OCR de la página completa (las 474 páginas leídas con `ocr_paginas_completas.py`; 4.º argumento
de `extraer_otros.py`), con fuente «ocr». Sumó 62 mojamientos (53 de REGLONE, cuya frase cortaba otra
columna) y 1 intervalo, cargados con `sql_candidatos.py` (INSERT generado desde el JSON) y
`fase2_aplicar_campos_v2`. Las líneas que ya tenían valor salieron iguales. Nombres de método: Al follaje, Vía riego, Al suelo, Al surco, Tratamiento de semillas,
Inmersión, Aplicación terrestre, Aplicación aérea (varios se unen con « / »).

**Decisiones:**
- «COND»: si la etiqueta da una carencia que depende de algo que la línea no dice (uva de mesa o
  vinífera, dosis menor o mayor…), se guarda la cita sin número (`field_citations.carencia.condicional`)
  y el sitio muestra «Depende: ver condición en la etiqueta».
- Para repetir con etiquetas nuevas: mismo orden. Archivos de trabajo (PDF, corpus, OCR, imágenes) en el
  scratchpad, nunca en OneDrive. Python siempre con `-I`. `render_pagina.py` necesita pypdfium2 4.30.0 +
  Pillow (venv en el scratchpad). Un `extractor_version` nuevo por pasada.

### Plan original de la Fase 2 (referencia)

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
- `Windows.Data.Pdf` no abre algunos PDF (GRANDEVO): usar `render_pagina.py` (pypdfium2).
- OCR de muchas páginas en una sola llamada de `ocr_windows.ps1`: falla o se cuelga. Una página por
  llamada, con tope de tiempo (así lo hace `completar_con_ocr.py`).
- Actualizar la misma fila dos veces en una sola sentencia (varios CTE con UPDATE): Postgres aplica solo
  uno. Un UPDATE por campo.
- `apply_migration` puede responder «timed out» y aun así quedar aplicada: revisar
  `supabase_migrations.schema_migrations` antes de repetirla.

## Pendiente

- **Borrar definitivamente** las Edge Functions `export-csv` y `agro-script` (hoy desactivadas: exigen
  JWT y responden «Función retirada»). El MCP no tiene herramienta para borrar: usar la CLI de Supabase
  (`supabase functions delete <nombre> --project-ref cejkhfugaobfqnjpkgpl`) o el panel.
- La CLI de Supabase ya está instalada (`%LOCALAPPDATA%\Programs\supabase-cli\supabase.exe`, v2.120.0)
  pero **sin sesión**: falta que Cristóbal haga `supabase login` (necesaria para subir PDF nuevos al
  bucket y para borrar las funciones).
- Pedir a Cristóbal el PDF de ACABAN® 050 SC **versión 16-06-2025** (la de 2022 no coincide con las 56
  líneas aprobadas, ver «Estado de los datos»). Subirlo al bucket requiere la CLI con sesión.
- **Productos del plan de Cristóbal que no están en el catálogo** (21-10-2026). Él pidió «búscalos y
  agrégalos». Plaguicidas (necesitan su etiqueta oficial: buscarla en SAG o en el sitio del fabricante,
  pedir permiso para descargar, subir al bucket con la CLI y extraer con cita): RAYO, MOSPILAN, PREVICUR,
  PUNTO 70, LUNA EXPERIENCE, MURALLA DELTA, CONFIDOR 200 SL, CONFIDOR 350, PIRIMOR, ZERO, ABAMAX 1,8 EC,
  BULLDOCK, GLADIADOR, IMPULSO 25 SC, METALAXIL MZ 58, KASUMIN, AZUFRE FLOABLE AN 600, AZUFRE 80%,
  CITROLIV, BC-1000, ENTONEM, CONDOR SHIELD. Fertilizantes, bioestimulantes y coadyuvantes (SILWET,
  ZOBERAMINOL, CALCIO-BORO, DEFENDER MANGANESO, VITANICA RZ, SAGASTIM, FLOWER POWER, FRUTALIV, STIMULATE,
  ULTRASOL, MEZCLA 17-20-20) quedan como «fuera del catálogo». Con esas etiquetas, las alertas de rotación
  verían también imidacloprid y acetamiprid (IRAC 4A), que hoy no están en el catálogo.
- Revisión humana: para que una línea diga «Revisado» alguien tiene que compararla con la etiqueta
  (hoy solo las 56 de ACABAN). Quitar `noindex` lo decide Cristóbal.
- TOPAS 200 EW no tiene grupo de modo de acción en los datos (penconazol sin grupo): revisar su etiqueta.
- Limpieza de datos (con su visto bueno): cultivos-frase, duplicados de cultivos, objetivos y productos,
  ingredientes basura, métodos antiguos con basura.
- Mejoras posibles: modo sin conexión completo (service worker), imagen para compartir por WhatsApp,
  favoritos por celular.
