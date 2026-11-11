# Agroquímicos CRM — memoria del proyecto

Leer completo antes de tocar algo. Última actualización: 11-11-2026.
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
- **Recopilador del SAG (desde el 22-10-2026, a pedido de Cristóbal):** cargar todas las etiquetas que publica
  el SAG (~1.500), con cada dato citado. Claude quedó como **recopilador** del proyecto: el mismo flujo sirve para
  las etiquetas nuevas del SAG y para cualquier producto que pida. Ver «Recopilador del SAG».
- **Fase 3 (no empezar sin que Cristóbal lo pida):** cuentas, planes guardados en la nube y compartidos, foro.

## Reglas del sitio (obligatorias)

1. Nunca mostrar una dosis sin su estado: «Revisado» (solo `review_status = 'aprobado'`) o
   «Extraído automáticamente». **Excepción en la tabla del buscador** (Cristóbal, 11-11-2026: «no pongas la frase de
   extraído automáticamente»): ahí solo se muestra «Revisado» cuando corresponde (`dosisRango(…, { soloRevisado })`);
   la ficha y el plan siguen con el estado de cada línea. La alerta «Confianza baja: revisa la etiqueta» (`confidence_score < 0,80`) **se quitó a
   pedido de Cristóbal el 10-11-2026** («no pongas este tipo de mensajes, hace que todo se vea más feo»); el dato sigue
   en la base. No volver a ponerla.
2. Nunca dejar una carencia en blanco. Si falta: «Sin dato, verificar etiqueta» + link al PDF (con página).
3. Todo producto y toda línea de uso con link a su etiqueta PDF.
4. ~~Aviso visible en todas las páginas~~: **eliminado a pedido de Cristóbal el 21-10-2026** («elimina
   de la app todo este tipo de avisos»), junto con los textos de presentación de cada página, la nota del
   pie («Fuente…») y la página «Estado de los datos». No volver a agregar avisos generales ni textos
   explicativos largos. Se mantienen las etiquetas por dato (reglas 1–3) y las alertas del plan. Excepción pedida por
   él el 01-11-2026: la explicación de FRAC, IRAC y HRAC (hoy el inicio, `#/`) y la página «Mezclas» (02-11-2026).
5. **Nunca inventar ni completar datos agronómicos con conocimiento general.** Solo lo que dice la
   etiqueta, con cita (texto y página). Excepción pedida por Cristóbal el 11-11-2026: el **código de modo de acción**
   de un ingrediente cuya etiqueta no lo trae sale de la lista oficial de su comité (FRAC, IRAC, HRAC), en la tabla
   aparte `moa_clasificacion` con su fuente (ver «Códigos de modo de acción»). Dosis y carencias, nunca.
6. Mientras la carencia esté incompleta: `noindex` (meta robots en `index.html`). Se comparte solo por link.
7. En el navegador y en el repositorio va **solo la llave pública** (publishable/anon). Nunca la
   secreta ni `service_role`.

Por qué importa: la carencia decide si se puede cosechar. En fruta de exportación un error significa
rechazo en destino o residuos sobre la tolerancia.

## Reglas de estética (paleta «Tech Premium» del 10-11-2026, pedido de Cristóbal)

El 10-11-2026 hubo tres pasadas el mismo día: primero marfil, negro, azul rey y códigos fluorescentes; después una
paleta menta/esmeralda estilo SaaS; al final pidió esta, **que es la que manda**: «moderna, minimalista y estilo Tech
Premium, con colores de alto contraste… fondos neutros, evitando que predomine el verde… colores intensos solo para
elementos destacados… bordes discretos, esquinas redondeadas y sombras suaves… limpia, elegante, tecnológica y
profesional, sin saturación visual». Se mantienen de las pasadas anteriores: buen contraste (AA), ~70 % fondos claros,
sin degradés ni colores intensos en superficies grandes.
- **Claro:** fondo `#f8faf9` (blanco con un matiz verde casi imperceptible); tarjetas, tablas, formularios y cabecera
  `#ffffff` con borde `#e3e8e6` y sombra suave; texto `#19352e`; texto secundario gris neutro `#5e6865` (AA); bordes de
  campos y botones secundarios `#858f8c` (contraste 3:1); pie gris carbón `#141a19`.
- **Oscuro:** fondo gris carbón `#141a19`, tarjetas `#202725`, texto `#f2f8f4`, secundario `#9aa5a1`. Mismos botones verdes;
  foco, selección y texto de énfasis en un verde más claro (`#3dcb98`) para que se lea sobre carbón.
- **Verde principal `#007f5b`** (texto blanco) solo para botones y acciones: botones principales, menú activo, selección,
  foco, orden activo y progreso. Hover `#006b4d` (`#00936a` en oscuro), presionado `#005a41`, desactivado al 50 %.
- **Categorías de modo de acción: FRAC azul `#2672ff`, IRAC coral `#ff4864`, HRAC amarillo `#e5ae00`**, cada una con
  fondo suave (`#eaf1ff`, `#ffebee`, `#fff6d6`) y variante oscura para texto chico (`#1a5ae0`, `#c8203d`, `#876200`).
  El color intenso va solo en franjas, bordes y dibujos: la franja a la izquierda de cada fila y tarjeta del buscador, el
  título de cada grupo (fondo suave de su categoría), la franja de cada código y el cuadrito con el dibujo de cada comité
  (dibujo blanco sobre azul y coral, grafito sobre amarillo: `--*-sobre`).
  **Todo código es un botón** que lleva a todos los productos de ese código (`ui.js → chipMoa`, `#/buscar?moa=<familia>`),
  en cualquier página; solo dentro de otro link o botón va sin link (`enlace: false`).
- Avisos: ok verde suave, información azul suave, alerta amarillo suave, peligro rojo suave (el rojo es el único color
  fuera de la paleta: hace falta para lo que no cumple la etiqueta).
- Esquinas: tarjetas 14, avisos y opciones 10, campos 8, etiquetas 6; botones en píldora.
- Sigue al modo del equipo; el botón sol/luna de la cabecera lo cambia y lo recuerda (`localStorage` `tema`). `index.html`
  pone `data-tema="claro|oscuro"` en `<html>` antes de dibujar (sin parpadeo); `app.js → ponerTema`. Todos los colores son
  variables en `assets/css/app.css` (`:root` y `:root[data-tema="oscuro"]`): **no usar colores fijos**.
- **Logo:** el cuadrado de «lista que brota» (tres barras y una hoja; Cristóbal: «solo el cuadrado») en `index.html`
  (`<symbol id="logo-crm">`), y **cambia de color para contrastar con el fondo** (`--logo-fondo`/`--logo-tinta`): verde en
  la cabecera clara, verde claro en la oscura, casi blanco en el pie carbón. `assets/img/icono.svg` (verde; verde claro si
  el equipo está en modo oscuro) y los PNG (`scripts/iconos.py`).
- Se mantiene: **Rubik**, 17 px y alto contraste (se usa al sol), botones y chips en píldora, barra inferior en celular
  (Inicio, Buscar, Mezclas, Plan y Trivia), solo información importante.
- **Menú (02-11-2026):** «Inicio» (la explicación de FRAC, IRAC y HRAC), «Buscador» (la tabla), «Mezclas», «Plan» y
  «Trivia» (el «Mapa» se quitó por un tiempo el 31-10-2026, ver «El sitio»). El buscador usa todo el ancho de la
  pantalla (`--ancho-max` 1680 px; `ANCHA = true` en la vista); el resto de las páginas, 1180 px.
- **Pasada «unslop» (31-10-2026):** sus reglas siguen: medidas en px sobre la grilla de 4 (2 px solo para ajustes dentro
  de controles chicos); títulos y etiquetas en minúscula normal, nunca en MAYÚSCULAS espaciadas (salvo datos de la
  etiqueta como «CUIDADO»); pesos 400, 500 y 600; sin cursiva (las citas van en gris entre «…»); radios: ver arriba;
  íconos de línea de `ui.js` con trazo 1,5;
  enlaces en el color de la letra con subrayado; un solo acento en los controles (el verde principal); «Extraído
  automáticamente» como texto gris sin caja; sin signos de exclamación ni punto final en textos cortos; transiciones
  solo de color/fondo/borde/transform (150 ms, `--curva`), nada que anime ancho o alto. El pie queda abajo aunque la
  página sea corta (`body` en columna).
- **Nada de avisos que afeen** (10-11-2026): sin «Confianza baja» (ver regla 1).
- **Nunca etiquetas que separen a la gente** (11-11-2026: «Para el técnico… es súper clasista y me carga»): nada de «para
  el técnico», «para expertos», «avanzado» ni parecidos; lo más técnico va en «Más detalle» o «Detalle».
- **Pantallas de carga como esqueleto** (pedido del 31-10-2026: «la ruedita se ve muy tediosa»): bloques grises que
  laten despacio con la forma de lo que viene, sin ruedita ni texto visible (el texto queda para lectores de
  pantalla). `ui.js → cargando(texto, forma)`: 'inicio' (panel de filtros y filas/tarjetas), 'lista' o 'texto'; el
  de la primera carga está escrito en `index.html`. Si cambia el alto del panel de filtros, ajustar `.esq-panel`.

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
- **Costo cero:** GitHub Free + Supabase Free. Límites que cuidar: base < 400 MB, bucket < 900 MB.
- **Los PDF del SAG no se suben al bucket** (pesarían > 1 GB): `documents.source_url` guarda la URL oficial y el
  sitio usa `coalesce(storage_path, source_url)`. Al bucket solo etiquetas de otras fuentes que podrían desaparecer.
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
  Storage ni para borrar Edge Functions: para eso, la CLI de Supabase.
- **CLI de Supabase** (`%LOCALAPPDATA%\Programs\supabase-cli\supabase.exe`, v2.120.0) **con sesión iniciada**
  (comprobado el 22-10-2026). `supabase db query --linked --project-ref cejkhfugaobfqnjpkgpl -f archivo.sql`
  corre SQL como `postgres`: así cargan los scripts sin pasar datos por la conversación. Cada llamada crea un
  usuario temporal y **dos llamadas a la vez se anulan** («password authentication failed for cli_login_postgres»):
  `scripts/recopilador/comun.py → sql()` usa un candado y reintenta.
- **Mapa del código (graphify 0.9.92**, instalado el 31-10-2026 con el «sí» de Cristóbal; versión de dos semanas antes,
  no la más nueva): `C:\Users\crisa\agroquimicos-datos\graphify\Scripts\graphify.exe` (venv propio, 174 MB). El mapa está
  en `graphify-out/` (fuera del repo, `.gitignore`; qué no lee: `.graphifyignore`). Sirve para ubicarse sin leer
  archivos: `graphify explain "cargarCatalogo"` (dónde está y con qué se conecta), `graphify affected "rangosDosis"`
  (qué se rompe si cambia), `graphify path "A" "B"`, `graphify query "<pregunta>"`. Rehacerlo después de cambiar
  código: `graphify update .` (sin IA, gratis). **Solo código (`extract . --code-only`)**: la lectura de documentos
  gasta uso de Claude y no aporta (CLAUDE.md ya se lee). Sin hooks ni sección automática en este archivo.
- **unslop** (31-10-2026, pedido de Cristóbal): habilidad de diseño en `~/.claude/skills/unslop` (de heydamir/unslop,
  CC BY 4.0; revisada antes de instalarla: solo reglas de diseño y dos scripts opcionales de captura y video que piden
  Playwright y ffmpeg, no instalados). `/unslop` en Claude Code. Si se usa en este sitio, respetar las «Reglas de
  estética» de Cristóbal (Rubik, paleta, estilo Enza Zaden): mandan sobre las de unslop. Ya se aplicó una vez a todo el
  sitio (31-10-2026, ver «Pasada unslop» en «Reglas de estética»).
- **Python 3.12** en `%LOCALAPPDATA%\Programs\Python\Python312\python.exe` (puede no estar en el PATH
  de una terminal abierta antes de instalarlo). `pdftotext` viene con Git for Windows.
- **Tesseract 5.4.0** (23-10-2026, `winget install UB-Mannheim.TesseractOCR`, con el «sí» de Cristóbal):
  `C:\Program Files\Tesseract-OCR\tesseract.exe`. Su carpeta de idiomas no se puede escribir sin permisos de
  administrador: el español (`spa.traineddata` de tessdata_best) está en `C:\Users\crisa\agroquimicos-datos\tessdata`
  (con copias de eng y osd) y se usa con `--tessdata-dir`.
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
| `sag_inventario` | 1.634 (22-10) | Proceso, privada: cada PDF del listado del SAG y su estado en el recopilador |
| `recopilador_revision` | — | Proceso, privada: cultivos, objetivos, ingredientes, empresas y categorías que creó el recopilador (revisar) |

- `moa_equivalencias` (27-10-2026, 76 filas desde el 11-11-2026, lectura pública): código antiguo → actual de FRAC y
  HRAC; `codigo_actual` vacío = el ingrediente no tiene grupo (ver «El sitio»).
- `moa_clasificacion` (11-11-2026, 629 filas, lectura pública): código oficial de los ingredientes cuya etiqueta no lo
  trae, o qué son si ningún comité los clasifica (`tipo`), y grupo químico de todos. Ver «Códigos de modo de acción».
- **Productos ocultos** (11-11-2026, «Sí, ocúltalos»): `products.oculto_motivo` (texto; null = visible), también en
  `v_sitio_productos`. 25 registros de la carga original sin etiqueta del SAG ni ingrediente (nombres de archivo, hojas
  de seguridad o fichas técnicas, duplicados como «Fendona? 6 SC no mancha…» o «TWA 5 mg/m Syngenta» = Vibrance
  Integral, productos sin ningún dato). No se borró nada. El sitio no los pone en ninguna lista (`db.js → enListas`,
  tabla, filtros, Mezclas, Plan, inicio, trivia); su ficha abre por link con una nota. Mostrar uno de nuevo: dejar su
  `oculto_motivo` en null (migración `productos_ocultos`).
- `objetivos_de_productos(uuid[])` (11-11-2026, SECURITY INVOKER): plagas, enfermedades y malezas de las etiquetas de
  unos productos, por nombre común sin tildes ni punto final, con cuántos productos las nombran (página de cada grupo).
- `mv_sitio_objetivo_producto` (11-11-2026, ~17.800 filas, 4 MB) y la función `productos_por_objetivo(texto)`
  (SECURITY INVOKER, solo texto ya normalizado de 3–60 letras y números): buscador principal por plaga, enfermedad o
  maleza. Se renueva con las demás copias (`renovar_copias_sitio()`).
- `v_sitio_dosis_texto` (11-11-2026): por producto, el texto de dosis de la etiqueta más repetido entre las líneas sin
  rango (sin número, base «otro» o unidad rara). Vista aparte: dentro de `v_sitio_resumen_productos` la llevaba a 3 s.
- **Recopilador (22-10-2026):** `field_citations` (mismo formato que en `product_uses`) también en `products`,
  `product_active_ingredients`, `product_companies`, `product_safety_profiles` y `active_ingredients` (grupo de modo
  de acción leído de una etiqueta, con `documento`). `documents.source_url` (URL oficial). En `products`:
  `sag_estado` (autorizado / cancelado / no_figura, según las listas del SAG), `sag_vencimiento`, `sag_fecha_limite`
  (cancelados: hasta cuándo se puede usar), `solo_exportacion`, `sustancia_prohibida`, `toxicidad_abejas`,
  `avisaje_abejas` (lista del SAG de abejas, por N° SAG). Índice único `products_registration_number_ux` (N° SAG,
  ya existía: 0 duplicados). `v_sitio_productos` agrega al final `no_disponible` (motivo por el que no se usa en
  Chile), `sag_estado`, `sag_fecha_limite`, `toxicidad_abejas`; el sitio saca esos productos de «¿Qué aplico?»,
  los marca en la lista y en la ficha, y el plan avisa.

- `product_uses.field_citations` (jsonb, Fase 2): `{"carencia"|"mojamiento"|"intervalo"|"metodo":
  {"cita", "pagina", "extractor"[, "condicional"]}}`. La página de la cita va aquí; `source_page` sigue
  siendo la del cuadro de dosis.
- Reglas en la base (Fase 2): `aprobado_requiere_carencia`, `carencia_requiere_cita` (días o «no aplica»
  exigen `withholding_period_raw`), `carencia_dias_o_no_aplica`.

- Bucket público `etiquetas`: 152 PDF (96 MB), ruta `<sha256>/<archivo>.pdf`. Sin políticas de
  escritura (solo se descarga). 3 archivos `*_1_.pdf` son copias de otros ya registrados.
- `product_uses.review_status`: pendiente | revisado | aprobado | rechazado. El sitio oculta `rechazado`
  y solo muestra «Revisado» para `aprobado`. Desde el 25-10-2026 `rechazado` también marca las líneas reemplazadas
  por una lectura nueva del recopilador (`reviewed_by` «recopilador: reemplazada…»; 127 líneas de 4 etiquetas): no se
  borran. El índice único `product_uses_source_crop_ux` (documento, página, fila, cultivo) no cuenta las `rechazado`
  (migración `usos_unicos_sin_rechazados`).
- Extractor original: `rotulo-local-v3`, reglas locales **sin modelo de lenguaje** (`model_name = reglas-locales-sin-llm`).
- Vistas antiguas (todas `security_invoker = true`): `v_agrochemical_crop_lines`, `v_products_summary`,
  `v_export_excel`, `vista_plana`.
- **Vistas del sitio** (creadas el 20-10-2026, `security_invoker`, solo SELECT):
  `v_sitio_productos` (producto con categorías, ingredientes, empresas y documentos en JSON),
  `v_sitio_resumen_productos` (27-10-2026: por producto, cultivos con líneas, dosis mín.–máx. por unidad y base,
  n.° de líneas aprobadas y con confianza < 0,80; alimenta la tabla del inicio),
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
  y de `planes_guardados`, y el WARN de `plan_guardado` ejecutable por anon (todo intencional). Desde el 11-11-2026
  también el WARN «materialized view in API» de las copias `mv_sitio_*` (intencional, ver «Carga rápida»).
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
  «¿Qué aplico?»**; sus líneas sí se ven en la ficha del producto. **Revisión del 02-11-2026** (esas líneas sí entran
  en la dosis «desde – hasta» del inicio): de 387 líneas con dosis, 334 son cultivos reales con nombre largo
  («Vides (de mesa, para vino y para pisco)», «Plantaciones forestales (Pino…)») y dosis correctas; Dormex, KEEP y
  Stimplex V1 tienen una frase que describe el uso pero dosis reales. Con el «sí» de Cristóbal se ocultaron
  (`rechazado`) las de dosis falsas: TOPAS 200 EW (6, «3 – 15 L/ha»; además se le agregó el penconazol que le
  faltaba, migración `correccion_topas_e_irac_romanos`) y KARATE CON TECNOLOGIA ZEON (5, «1 – 200 L/ha», migración
  `correccion_karate_zeon_frases`); CUPROFORTE se reemplazó entero con la etiqueta del SAG (ver «Estado del
  recopilador»). **Cultivos con nombre largo unidos a su cultivo (02-11-2026, con su «sí, arréglalo»):**
  `db.js → unirVariantes` une cada cultivo «frase» a los cultivos del catálogo que nombra (primeras 1–3 palabras de cada
  trozo separado por paréntesis, comas, «y», «o», en singular simple; solo cultivos con nombre limpio y fuera de
  `NO_CULTIVOS`): «Vides (de mesa…)» → Vid, «Manzanos, perales…» → Manzano, Peral… (125 de 149). `usosPorCultivo(id,
  variantes)` trae también esas líneas (Vid ganó 28 productos), la tabla muestra el cultivo base en vez del nombre largo
  (`cultivosVisibles`), el plan no avisa «otro cultivo» por ellos y `nProductos` los cuenta. Sin cambios en la base.
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

- `index.html`: una sola página, `noindex`, carga supabase-js y `assets/js/app.js`.
- Rutas con `#` (funcionan en GitHub Pages sin configuración):
  - `#/` **Inicio: FRAC, IRAC y HRAC** (01-11-2026; desde el 02-11-2026 es el inicio y «más visual, divertido de
    entender», pedido de Cristóbal; `assets/js/vistas/modos.js`; `#/modos` antiguo abre aquí). Para que lo entienda un
    agricultor sin estudios y un ingeniero esté de acuerdo: lo simple a la vista y lo más técnico en desplegables
    **«Más detalle»** (hasta el 11-11-2026 decían «Para el técnico»; Cristóbal: «es súper clasista y me carga, ponle solo
    como detalle»). **10-11-2026 (Cristóbal):** parte explicando qué es un grupo y por qué dos marcas del mismo grupo son
    iguales; enseguida, los tres comités con «Más detalle» **abierto**; el juego de la botrytis se quitó («no sirve de
    nada»). Partes: portada «Rota el código, no la marca» con «¿Qué es un grupo?» y «¿Por qué son iguales?» y un bloque
    por comité (fondo suave y franja de su color, con un dibujo: hongo, insecto, maleza: `DIBUJOS`); «Un ejemplo con productos del catálogo»:
    dos productos reales con el mismo código (=) y uno con otro (≠); «Los tres comités»: tarjeta por comité (cómo leer
    el código, códigos con más productos del catálogo con link al buscador filtrado y, abierta, la tabla de grupos
    frecuentes con lo que hacen (`moa.js`), sitio de acción, familia, ingredientes y riesgo FRAC);
    «¿Rotaste o no?» (4 preguntas con respuesta al tocar: mismo código con otra marca, 1A/1B, HRAC A/1, mezcla 7+11 → 3);
    4 palabras; 4 reglas de oro (+ «Más consejos» plegado); por qué importa; ejemplos (botrytis, arañita, ballica y un
    producto real con dos códigos); cómo usarlo en el sitio (Buscador, Mezclas, Plan). Los grupos y ejemplos de
    ingrediente están escritos a mano desde las listas oficiales (FRAC Code List, IRAC MoA Classification, HRAC 2020), no
    de la base: en la base hay errores (glufosinato como HRAC 3, el protector cloquintocet como HRAC 4, «FRAC E3 GRUPO 2»;
    se revisan en otra tarea con Cristóbal); los conteos del catálogo solo muestran códigos bien escritos (`CODIGO_VALIDO`).
  - `#/mezclas?p=<id>,<id>…` **Mezclas** (02-11-2026, Cristóbal: «una vista y una tabla con la interacción de productos
    que explique que no se pueden mezclar todas las cosas de WP y EC»; `assets/js/vistas/mezclas.js`). «Arma tu mezcla»:
    hasta 6 productos del catálogo; los dibuja en un **estanque** en el orden de carga según su formulación
    (`tipoFormulacion` en `db.js`: el código del dato o el del nombre); alerta si dos productos tienen el mismo código, si
    uno no va al estanque (DP, GR, cebos, semillas, UL) o si no se sabe su tipo; y muestra lo que dice cada etiqueta
    (`product_safety_profiles`: compatibilidad, incompatibilidad, preparación y fitotoxicidad, «Extraído automáticamente»
    y link al PDF). Abajo: orden de carga en 7 pasos (agua y agitación; correctores; sólidos WG/WP/SG; suspensiones
    SC/CS/SE/ZC; emulsiones y aceites EC/EW/ME/OD; solubles SL; coadyuvantes y completar), tabla de formulaciones (código,
    nombre, cómo es, paso, cuidado), por qué una mezcla sale mal (física, química, fitotoxicidad, antagonismo) y la prueba
    de la jarra. Cada paso tiene su fondo suave (agua azul claro, sólidos gris, suspensiones verde, emulsiones amarillo, solubles azul).
    Es explicación general: siempre dice que manda la etiqueta. Fertilizantes y bioestimulantes: «según su etiqueta».
  - `#/buscar?cultivo=<id>,<id>…&objetivo=<id>,…&oq=<texto>&cat=<id>,…&q=<texto>&empresa=<nombre corto>,…&moa=<clave>|sin&ing=<id>&orden=moa|nombre|empresa|tipo|ing|cultivos&inv=1`
    **Buscador** (título «Buscador de productos» desde el 11-11-2026; antes «¿Qué aplico?») (fue el inicio hasta el 02-11-2026; los links antiguos al inicio con alguno de esos filtros, y
    `#/aplicar`, `#/productos` y `#/mapa`, se abren aquí: `AL_BUSCADOR` y `FILTROS_TABLA` en `app.js`). «¿Qué aplico?»
    (rehecho el 27-10-2026 a pedido de Cristóbal; vista `assets/js/vistas/inicio.js`):
    arriba el **buscador principal** («Buscar en la tabla», `q`; pedido del 31-10-2026): filtra mientras se escribe y
    busca en todas las columnas (nombre y categoría, empresa y su nombre completo, grupos de modo de acción y su código
    de la etiqueta, o el tipo si no tiene código, grupo químico, tipo y su nombre, ingredientes con su concentración,
    registro, cultivos con sus sinónimos y el texto de la dosis); cada palabra tiene que estar en alguna columna.
    **Desde el 11-11-2026** (Cristóbal: «tiene que filtrar todos y cada uno de los elementos que aparezcan en las
    columnas») busca **dentro** de las palabras («cipermetrina» encuentra Alfacipermetrina, «betaciflutrina» a
    Beta-ciflutrina): `buscador.js → preparar/contiene`; las de 1–2 letras («SC», «2») solo al inicio de una palabra.
    Probado con 39 celdas al azar: todas encuentran su fila. «FRAC 3», «IRAC 4», «HRAC A», «FRAC G1», «IRAC UNE» o
    «FRAC NC» se buscan como grupo (`RE_MOA`), para que el número no calce con registros o dosis. Al lado: cultivo y plaga/enfermedad/maleza
    con sugerencias, tipo de producto, empresa y modo de acción: **los seis filtros en una fila** desde 1.100 px (10-11-2026;
    en el celular y la tablet, empresa y modo de acción tras «Más filtros»). `moa=` también acepta el código antiguo de la
    etiqueta («HRAC A»). Luego una tabla con **una fila por producto**. **Desde el 11-11-2026** (Cristóbal: «reducir
    tanta info», en dos pasadas), en este orden: **Producto** (solo el nombre, en negrita; la categoría al pasar el mouse
    y en la tarjeta del celular), **Modo de acción** (chips), **Empresa** (nombre corto), **Ingrediente activo** (uno por
    línea y completos: la única celda que puede ocupar más de una línea), **Tipo** (sigla: WP, SC…), **Cultivos** (3 y
    un botón «+X» que abre una burbuja con todos, `ui.js → globo`), **Etiqueta** (ícono de PDF relleno en el verde de
    énfasis, `icono('pdfLleno')`, que se resalta al pasar el mouse; `.boton-etiqueta`) y **Plan** (botón redondo). Todo
    centrado y una línea por celda (lo que no cabe, con «…» y completo al pasar el mouse). **Sin Reg. SAG ni Dosis** en
    la tabla (siguen en la ficha y el plan; el registro sí se puede buscar). La dosis ya no sale aquí, así que tampoco
    «Extraído automáticamente» (ver regla 1). **Todas las filas miden lo mismo**
    (72 px; pedido del 10-11-2026): anchos fijos por columna (`colgroup`, clases `col-*`) y cada celda recortada a una o
    dos líneas (lo completo, al pasar el mouse o en la ficha). **Cada grupo lleva una frase con lo que hacen sus
    productos**: `assets/js/moa.js → queHace`, escrita a mano desde las listas oficiales para todos los códigos del
    catálogo (al llegar un código nuevo sin frase, no se muestra nada: agregarlo ahí con su fuente). **Reescritas el
    11-11-2026** (Cristóbal: «"Frena la fabricación de aminoácidos en otro punto" no me sirve… tiene que ser más
    autoconclusivo»): qué bloquea, en qué parte de la plaga y qué le pasa («HRAC 9 · Impide que la maleza fabrique 3
    aminoácidos (enzima EPSPS): baja hasta la raíz y la mata entera»). **Los productos sin código** se agrupan por lo que
    son (`moa.js → TIPOS`: reguladores, feromonas, coadyuvantes, protectores, anticoagulantes, preservantes de madera…),
    con un chip gris (clave `tipo:regulador`, también en el filtro y como link) y su frase; al final, «Sin ingrediente
    activo en los datos». **Dosis** sin rango «desde – hasta»: ppm, ppb, dispositivos/ha, tabletas/ha y g i.a./ha ya
    entran al rango; si no, el texto de la dosis de la etiqueta (`v_sitio_dosis_texto`, vista aparte porque agregarlo a
    `v_sitio_resumen_productos` la llevaba a 3 s). Ya no aparece «Ver en la etiqueta» (solo «Sin dosis en los datos»).
    **Sin carencia ni reingreso en esta tabla** (pidió sacarlos; siguen en la ficha y en el plan). Con cultivo u
    objetivo, los cultivos salen solo de las líneas que calzan (Enter en el objetivo = «Todos los que dicen…»).
    **Filtros (11-11-2026, tercera pasada de Cristóbal):** arriba el buscador de todo («Buscar en todo») con una **X** a
    la derecha que borra todos los filtros; debajo, **cuatro listas iguales** (Cultivo, Plaga/enfermedad/maleza, Tipo,
    Empresa; dos por fila en el celular) hechas con `ui.js → selectorMultiple`: un botón con lo elegido que abre un panel
    con buscador y casillas (en el celular, una hoja desde abajo); se pueden elegir **varias** opciones (vale cualquiera)
    y se aplica al cerrar («Listo», Esc o tocar afuera). Varios cultivos: se juntan sus líneas; plaga «Todos los que dicen
    «x»» sigue como opción (`oq`). **Sin la lista de modo de acción** («nadie lo va a usar»): `moa=` llega desde los chips
    y se ve como chip «Modo de acción: … ×» sobre la tabla. **Antes del nombre de cada producto, el dibujo de su comité**
    (hongo, insecto, maleza: `ui.js → dibujoComite`, el mismo del inicio, solo líneas y del color del comité), en una
    columna fija a la izquierda de la celda. **El título de cada grupo** lleva el botón «Cómo actúa y qué controla» a la
    página del grupo (`#/grupo/…`, ver abajo).
    **Agrupada (11-11-2026, «menos tedioso»):** una **sección por comité** («FRAC · Fungicidas y bactericidas», «IRAC ·
    Insecticidas, acaricidas y nematicidas», «HRAC · Herbicidas», «Sin código de rotación», con cuántos son) y, dentro,
    el título de cada grupo en una línea: el chip, una **frase breve** (`moa.js → BREVE`/`breve()`, unas pocas palabras;
    la completa de `QUE_HACE` al pasar el mouse), el grupo químico aparte en etiquetas grises (hasta dos, «+N») y cuántos.
    **El buscador principal también busca por plaga, enfermedad o maleza** (Cristóbal, 11-11-2026: «quiero que ese
    filtro filtre absolutamente todo»; «avenilla» daba 0): cada palabra de 3 letras o más se manda a la función
    `productos_por_objetivo` (copia `mv_sitio_objetivo_producto`: objetivo → producto con el nombre común y científico
    normalizado, índice trigram; ~14 ms) y el producto calza si la palabra está en una columna **o** en alguna plaga de
    sus etiquetas (`db.js → productosPorObjetivo`, guarda cada texto; mientras llega, esqueleto en vez de «0»).
    «avenilla» 88 productos, «avenilla syngenta» 9, «oídio» 278.
    Los productos que no se usan en Chile no aparecen en la tabla (el botón «Mostrar también…» se quitó a pedido de
    Cristóbal el 31-10-2026; siguen en su ficha y en el plan, que avisa). Debajo de 1.100 px la tabla se
    vuelve tarjetas (dos por fila en tablet). Ya no existen la rotación de grupos ni el buscador general.
    **Orden (27-10-2026):** tocar el título de una columna ordena por ella y tocarlo de nuevo invierte (`inv=1`); en el
    celular, un selector y un botón ▲/▼. Por defecto, **agrupados por modo de acción**: los productos con la misma
    combinación de grupos («FRAC 7 + FRAC 11») van juntos, bajo un título con el grupo, el grupo químico y cuántos son,
    y con una franja del color del sistema; los sin grupo al final. Se agrupa por **código actual y familia**: ver
    «Códigos de modo de acción» más abajo.
  - `#/grupo/<clave>` **Página de un grupo** (11-11-2026, Cristóbal: «un lugar donde te explique los IRAC que tocaste,
    cómo actúa y qué productos son, qué busca controlar»; `assets/js/vistas/grupo.js`). Clave: un código («FRAC 3»), una
    combinación («FRAC 7 + FRAC 11») o un tipo sin código («tipo:regulador»). Cabecera con el dibujo del comité y la frase
    breve; «Cómo actúa» (frase completa de `QUE_HACE`, y como detalle el sitio de acción, `moa.js → SITIO`, y los grupos
    químicos del catálogo) con un consejo corto de rotación; «Qué controla»: las plagas, enfermedades y malezas que más
    nombran las etiquetas de esos productos (función `objetivos_de_productos(uuid[])` sobre `mv_sitio_objetivo_producto`,
    junta variantes del mismo nombre; cada una lleva al buscador con ese código y esa plaga); «Ingredientes activos» y
    «Productos» (nombre, empresa, ingrediente, tipo y PDF). En el menú queda marcado «Buscador».
  - **Mapa quitado por un tiempo (31-10-2026, Cristóbal: «quita un rato el mapa»).** No está en el menú ni en la barra
    del celular, la ficha ya no tiene «Ver en el mapa», `mapa.js` no se importa ni se precarga, y `#/mapa` abre el
    buscador (`AL_BUSCADOR` en `app.js`). El código (`vistas/mapa.js`) y sus estilos siguen. Para volver a ponerlo: la
    línea en `SECCIONES` y el `import` en `app.js`, sacar «mapa» de `AL_BUSCADOR`, el `modulepreload` en `index.html` y el
    botón de la ficha (`producto.js`); sus links usan `ruta('', …)`, que ahora es el inicio: cambiarlos a `ruta('buscar', …)`.
    Lo que sigue describe cómo era:
  - `#/mapa?nodo=g:FRAC 3|i:<id>|p:<id>|c:<id>|o:<id>` **Mapa** (31-10-2026, Cristóbal pidió incorporar graphify y eligió
    «las dos»: esta página y la herramienta, ver «Mapa del código»; `assets/js/vistas/mapa.js`): dibujo interactivo de
    las conexiones del catálogo, al estilo de graphify. Se parte de un nodo (buscador o chips de grupos y cultivos con
    más productos) y se ven sus vecinos en dos anillos; tocar uno lo pone al centro. Grupo → ingredientes y productos;
    ingrediente → grupo, productos y con qué viene mezclado; producto → ingredientes, grupos, cultivos y plagas (de sus
    líneas); cultivo → grupos y plagas (con n.° de productos); plaga → grupos y cultivos. Debajo, las mismas conexiones
    como chips (lo usable en el celular) y un botón a la tabla con ese filtro o a la ficha. Sin dosis ni carencias;
    sin productos que no se usan en Chile. Máximo 24 vecinos por tipo en el dibujo (todos en la lista, hasta 80).
    Posiciones calculadas a mano (`posiciones`: anillos, zigzag si hay más de 14, cada nodo de afuera junto a su vecino
    de adentro; nombres hacia afuera); si para caber la letra queda chica, parte con zoom 0,8 en el centro y el botón
    de la esquina muestra todo. Dibujo con **Cytoscape 3.34.3** (jsDelivr, huella SRI
    `sha256-XztbUpVG1a8fxWKFkK8DO3RRGltveJ9fRoKEWGMii5E=`, unpkg de respaldo), que se carga solo en esta página; sin él,
    queda la lista. La ficha del producto tiene «Ver en el mapa». `combo` (campo con sugerencias) pasó a `ui.js`.
  - `#/trivia?tipo=mezcla|tipo|moa|ing&tema=<id de categoría>` **Trivia** (27-10-2026, idea de Cristóbal, «tipo
    JetPunk»; `assets/js/vistas/trivia.js`): 10 preguntas de 4 alternativas sobre el catálogo: tipo de producto, grupo
    de modo de acción, ingrediente activo y «¿qué producto tiene tal ingrediente?», con filtro por fungicidas,
    insecticidas, herbicidas o acaricidas. Reloj, puntaje, repaso al final y récord por modalidad en el equipo
    (`localStorage` `trivia-v1`). Para no tener dos respuestas correctas: las preguntas de grupo usan solo códigos
    actuales (números, «M03», «4A»; no «G1» ni «HRAC A») y tratan «IRAC 3» = «IRAC 3A»; los ingredientes se comparan
    por sus primeras 6 letras («Pidiflumetofen» = «Pidiflumetofeno»); productos con nombre de archivo («20241202…») y
    con ingredientes sin grupo ni grupo químico (lecturas basura) no entran.
  - `#/aplicar?…`, `#/productos?…` y `#/buscar` (links antiguos) se abren en el inicio con los mismos filtros
    (`ANTIGUAS` en `app.js`; `empresa=<id>` antiguo se traduce al nombre corto).
  - `#/producto/<id>?cultivo=<id>` ficha: ingredientes, empresas y roles, líneas de uso por cultivo (el cultivo que se
    venía mirando va primero y abierto), seguridad, documentos. «Volver a la tabla» vuelve con los filtros puestos.
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
    - **02-11-2026** (Cristóbal: «una metodología más fácil, una línea de tiempo, que aparezca rápido qué controla y qué
      son, qué cosas no repetir»): **línea de tiempo** (`lineaDeTiempo`: del trasplante a la cosecha, una marca por día
      con un cuadrito por producto del color de su comité, marcas de trasplante, hoy y cosecha, y debajo la carencia de
      cada producto en carriles, roja si pasa la cosecha; en el celular se desliza); **«Qué no repetir»** (`noRepetir`:
      códigos de la última aplicación y cuántas veces se usó cada código, por familia); el formulario parte por **«1. Qué
      quieres controlar»** (plagas de las etiquetas para el cultivo del plan): muestra los productos que la controlan,
      primero los que no repiten el código de la última aplicación (los que repiten van al final con «repite código»), y
      elige solo el uso de la etiqueta para esa plaga; al elegir producto, **«Qué es» y «Controla en…»** (`fichaRapida`)
      y aviso si repite código. En cada aplicación, «Controla:» en vez de «Uso:». El calendario del mes quedó plegado
      bajo la lista.
- **Códigos de modo de acción unidos (27-10-2026, con el «sí, únelos» de Cristóbal):** las etiquetas traen el mismo
  grupo con el código actual o con el antiguo (FRAC «G1» = 3, «C2» = 7, «C3» = 11…; HRAC «A» = 1, «B» = 2, «K3» = 15…).
  Tabla `moa_equivalencias` (sistema, código de la etiqueta, código actual, `ingrediente_id` si vale solo para un
  ingrediente, nota), sacada de la FRAC Code List y de la clasificación HRAC 2020; migración `moa_equivalencias`.
  `active_ingredients.mechanism_group` **no se toca** (sigue con lo que dice la etiqueta). `db.js` pone en cada
  ingrediente `moa` = código actual, `moaEtiqueta` y `moaNota`; los chips muestran «HRAC 1 (A)» (actual y, entre
  paréntesis, el de la etiqueta) y la ficha lo explica. Por ingrediente: tebuconazol «G» → FRAC 3 (su etiqueta dice
  «Grupo G, Clase 1»), fenhexamida «G3» → 17, etofumesato y molinato «N» → 15, aclonifeno «F3» → 32 (N y F3 se
  repartieron en varios grupos nuevos).
  **Revisión del 02-11-2026** (con el «Sí, los 12» de Cristóbal; migración `moa_correcciones_grupos`): cada código raro
  se comparó con su etiqueta. Generales: «E3 grupo 2» → FRAC 2 (iprodiona), «E14» → HRAC 14 (carfentrazona), «2B» →
  HRAC 2 (tritosulfurón). Por ingrediente: penconazol «G3» → FRAC 3 (CANDADO dice «G3 (Triazoles)», error; SOLVIT dice
  3), fenpirazamina «G3» → 17, glufosinato de amonio «K1» → 10 (FASCINATE 150 SL trae «HRAC K1, WSSA 3», error), MCPA
  «0» → 4 (es la letra O), dicamba-sodio «40» → 4, etaboxam «U5» → 22, fosetilo «33» → P07. `codigo_actual` vacío =
  **sin grupo**: cloquintocet-mexilo (protector; ADMITT le pone «4» por error); la ficha dice «Sin grupo» y lo que trae
  la etiqueta. Único dato corregido: propamocarb «4» → «F4» (así dice Previcur Energy; se había leído mal). FRAC P01
  (acibenzolar) y BM01 (quillay) son códigos actuales: quedan igual. Para buscar más: grupos que no calcen con
  `^(FRAC|IRAC|HRAC) (M\d{2}|\d{1,2}[A-Z]?|UN)$` después de las equivalencias, y mirar a mano los de formato correcto
  (así salieron el glufosinato y el cloquintocet). Con su «Sí, todo» (migración `correccion_topas_e_irac_romanos`):
  IRAC en número romano, etoprofós «I» y fenamifós «Ib» → 1B.
  **Revisión completa del 11-11-2026** (Cristóbal: «revisa todo el contenido de la tabla de los códigos… todo lo que
  no tenga modo de acción búscalo… y ponlo»): 358 ingredientes sin código. Cada uno se clasificó desde las listas
  oficiales (FRAC Code List 2024, IRAC MoA 11.5 de feb. 2026 y su lista de nematicidas 2.2, HRAC 2024; las de IRAC y
  HRAC se leyeron de los PDF oficiales) en la tabla `moa_clasificacion`, generada por `scripts/moa/clasificacion.py`
  (cada fila con su nota; **no editar la migración a mano: cambiar el script**). `active_ingredients` no se toca.
  Criterios: biológicos de hongos y bacterias contra enfermedades → FRAC BM02 (Bacillus, Trichoderma, Aureobasidium…);
  extractos de planta → BM01 (fungicidas) o IRAC UNE (insecticidas); extractos cítricos y ácidos orgánicos (BC-1000,
  Status) → FRAC NC; aceite mineral → IRAC UNM; fumigantes → IRAC 8A/8B/8F y 24A; nematicidas solo de suelo → IRAC N-…;
  ácidos grasos y napropamida → HRAC 0 (desconocido); amitrol → HRAC 34. Lo que ningún comité clasifica va con `tipo`
  (regulador, feromona, coadyuvante, protector, rodenticida, preservante de madera, biocida, desinfectante,
  molusquicida, bioestimulante, biológico, aditivo, postcosecha, no clasificado). Un ingrediente puede tener dos
  códigos (fenazaquina IRAC 21A y FRAC 39; geraniol UNE y BM01): el producto usa el del sistema de su categoría
  (`db.js → codigosDelProducto`). La ficha dice de dónde sale («La etiqueta no trae el código: es el de la lista
  oficial…»). Códigos raros unidos con `moa_equivalencias`: FRAC F-49 → 49, HRAC 29 L → 29, HRAC I18 → 18, aceite
  parafínico IRAC UN → UNM (11.5). Queda sin nada «Concentración» (no es un ingrediente: error de lectura).
  **Familias:** en IRAC el modo de acción es el número («IRAC 4A» y «4D» son el grupo 4; «IRAC 3» = «3A»):
  `familiaMoa`/`familias` en `db.js`. La tabla agrupa y filtra por familia, y las alertas de rotación del plan
  comparan familias (antes «HRAC A» seguido de «HRAC 1» o «IRAC 4A» de «4D» no avisaban). Etiqueta nueva con un
  código antiguo que no está en la tabla: queda como viene (agregar la fila si corresponde, con su fuente).
- **Empresa (nombre corto):** `db.js → nombreCorto()`: marcas conocidas («Syngenta», «Bayer», «UPL»…) y, si no, el
  nombre sin «S.A.», «Ltda.», «Chile», rubro, etc. (una o dos palabras). Se usa la primera empresa del producto
  (orden de `rango_rol_empresa`: titular, registrante, distribuidor, importador…).
- **Dosis «desde – hasta»** (`ui.js → dosisRango`, `resumenDosis`; desde el 11-11-2026 la tabla del buscador ya no muestra la dosis, la función queda): mínimo y máximo de `dose_min`/`dose_max` por unidad
  y base (L/ha, cc/100 L, kg/ha, %…), sin mezclar ni convertir unidades; las dosis con base «otro» o sin unidad no
  entran al rango («Ver en la etiqueta» si no queda ninguna). Regla 1: «Revisado» solo si todas las líneas del
  resumen están aprobadas (sin alerta de confianza desde el 10-11-2026).
- Datos: al abrir se cargan las listas chicas (vistas `v_sitio_*`, `categories`, `active_ingredients`,
  `companies`, reingreso de `product_safety_profiles`); las líneas de uso se piden por cultivo, objetivo o
  producto. Todo paginado de a 1.000 filas (límite de la API) en `db.js → todas()`.
- **Carga rápida (31-10-2026, a partir de un video que mandó Cristóbal, «4 señales de que tu app fue vibecodeada»:
  marketing con IA, interfaz en degradé, sin favicon y carga deficiente; las dos primeras ya estaban bien):**
  - Copia del catálogo en **IndexedDB** (`agroquimicos-cache`, almacén `copias`, clave `CLAVE_CACHE`; antes en
    `localStorage`, que tiene ~5 MB para todo `criquelmem19.github.io` y ahí van los planes: la copia ya pesaba 2 MB).
    Si hay copia, el sitio se dibuja con ella al tiro (~1 s) y baja el catálogo por detrás: si cambió, vuelve a dibujar
    la página, salvo que la persona ya la haya tocado (`tocada` en `app.js`; lo nuevo se ve en la página siguiente).
    Sin conexión: queda la copia y aparece el aviso (supabase-js reintenta ~8 s antes de rendirse). Sin copia, se espera
    la descarga como antes. **Si cambia la forma de `descargarCatalogo`, subir `CLAVE_CACHE` (v4…).**
  - **Caída del 06-11-2026:** con ~40 mil líneas y 150 mil `use_targets`, las vistas `v_sitio_*` recalculan todo en cada
    consulta y, todas a la vez, pasaban los **3 s de `statement_timeout` de `anon`** (error 57014): el sitio decía «No se
    pudieron cargar los datos» o «Sin conexión». Además, la fecha del pie venía de `v_estado_datos`, que ya no alcanza
    nunca, y su error botaba todo el catálogo. Arreglo: `descargarCatalogo` pide **por etapas** (productos y listas
    chicas; resumen y cultivos; objetivos de a 2 páginas), `todas()` reintenta hasta 3 veces el 57014, y la fecha sale de
    `products.updated_at` y no es indispensable. Primera visita: ~6 s (5 de 5 sin cortes); con copia guardada, al tiro.
    **Copias ya calculadas (11-11-2026, con el «Sí, arréglalo» de Cristóbal):** `v_sitio_productos` ya tardaba 2,8–4,4 s
    por página y el sitio cargaba solo por los reintentos. Ahora el sitio lee **`mv_sitio_productos`,
    `mv_sitio_resumen_productos`, `mv_sitio_cultivos` y `mv_sitio_objetivos`** (vistas materializadas de las `v_sitio_*`,
    con índice único por `id`), que **pg_cron renueva cada 15 minutos** (tarea `renovar-copias-sitio` →
    `renovar_copias_sitio()`, `REFRESH … CONCURRENTLY`, sin bloquear lecturas; la llave pública no la puede llamar).
    (y desde la misma tarde `mv_sitio_objetivo_producto`, para el buscador por plaga).
    Cada consulta tarda milisegundos, así que `descargarCatalogo` pide todo a la vez: primera visita ~2 s (3 de 3, 0
    errores; antes ~5 s con cortes). Lo nuevo de la base (recopilador, correcciones) aparece en el sitio **hasta 15
    minutos después**; para verlo al tiro, `select public.renovar_copias_sitio();` como `postgres` (`comun.sql`). Si se
    cambia una `v_sitio_*`, recrear su copia (la copia guarda las columnas que tenía). Migración
    `copias_sitio_materializadas`. El advisor de seguridad muestra el WARN «materialized view in API» de las cuatro:
    intencional (son datos públicos, igual que las vistas).
  - `index.html`: supabase-js con `defer`, `preconnect` a Supabase y `modulepreload` de todos los módulos (al
    agregar un módulo, sumarlo ahí).
- **Íconos:** `icono.svg` (pestaña; el logo nuevo del 10-11-2026, esmeralda, más claro si el equipo está en modo oscuro) +
  `icono-32.png` de respaldo, `icono-180.png` (iPhone, `apple-touch-icon`) e `icono-192/512.png` (Android,
  `manifest.webmanifest`, sin `display`: se abre como página normal para poder copiar el link). Los PNG se hacen con
  `scripts/iconos.py` (Pillow del venv), con el mismo dibujo que `#logo-crm` de `index.html`.
- Las piezas que cumplen las reglas 1–3 están en `assets/js/ui.js` (`estadoRevision`, `dosis`,
  `carencia`, `reingreso`, `linkPdf`, `urlDeLinea`). Usarlas siempre; no mostrar dosis ni carencia «a mano».
  `carencia`, `mojamiento`, `intervalo` y `metodo` muestran el valor con su cita «…» (pág. N) desde
  `field_citations` (`citaDe`); carencia condicionada → «Depende: ver condición en la etiqueta» + cita.
- En la ficha y en el plan la dosis se muestra **como texto de la etiqueta** (`dose_raw`); en la tabla del inicio,
  «desde – hasta» con los números leídos (pedido de Cristóbal, 27-10-2026).
- Seguridad del código: los textos de la base nunca se insertan como HTML (`h()` en `ui.js`).
- Diseño: ver «Reglas de estética». La página «Estado de los datos» se eliminó (la vista
  `v_estado_datos` sigue en la base, pero el sitio ya no la usa: pasa los 3 s de la llave pública).

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

## Recopilador del SAG (empezado el 22-10-2026)

Meta: todos los productos con etiqueta publicada por el SAG en la base, con los datos de su etiqueta y la cita
(texto y página) de cada uno; cada lote se carga apenas está listo. Reglas: las de la Fase 2 (solo lo que dice la
etiqueta, sin cita no hay dato, todo «pendiente», no pisar valores existentes ni tocar líneas revisadas). La HDS
solo completa la seguridad que la etiqueta no trae.

**Carpeta de datos** (fuera de OneDrive y del repo; variable `AGRO_DATOS`): `C:\Users\crisa\agroquimicos-datos\`.
`sag/listado_<fecha>.json` (+ páginas HTML), `sag/pdf/<id>.pdf` (1.567 PDF, 1,5 GB), `sag/texto/<id>/`
(`lectura.json`, `layout.json`, `paginas.json`, `etiqueta.txt`, `hds.txt`, `p<N>.jpg`, `ocr_p<N>.json`),
`sag/extraido/<id>.json` (subagentes), `sag/verificado/`, `sag/sql/`, `sag/diferencias.csv`,
`sag/autorizados_sin_etiqueta.csv`, `sag/problemas.csv`, `oficiales/` (listas del SAG), `base/` (PDF del bucket
para comparar), `piloto/`, `venv/` (pypdfium2 4.30.0 + Pillow). `<id>` = `sag_inventario.id`. Al repo van solo
scripts y CLAUDE.md.

**Estado (en la base, `sag_inventario.estado`):** nuevo → descargado → texto → cargado (producto nuevo) o
diferencias (su N° SAG ya estaba: solo se agrega el documento del SAG y se anotan diferencias). Aparte:
no_etiqueta, error_descarga (13 sin link + 1 roto), duplicado (mismo sha256), ya_en_base (mismo PDF que un
documento), version_anterior (hay una etiqueta más nueva del mismo N° SAG), ilegible. Todo se retoma desde aquí.
`prioridad` (menor primero): vigente en la planilla e insecticida/fungicida/herbicida/acaricida 0xxx, otros
vigentes 1xxx, sin dato 2xxx, cancelados 3xxx; dentro, más nuevas primero. Lo nuevo que crea el recopilador
(cultivos, objetivos, ingredientes, empresas, categorías) queda en `recopilador_revision`.

**Scripts** (`scripts/recopilador/`, cada uno explica su uso arriba; Python con `-I`; los marcados (venv) con
`C:\Users\crisa\agroquimicos-datos\venv\Scripts\python.exe`):
1. `inventario_sag.py`: recorre el listado del SAG (109 páginas de 15) con pausa → `sag/listado_<fecha>.json`.
2. `listas_oficiales.py`: baja planilla de autorizados, abejas, cancelados, prohibidos y restringidos (toma el link
   más nuevo de la página de registros) → `oficiales/`; `oficiales.py` los lee.
3. `cruzar_inventario.py`: listado → `sag_inventario` (no retrocede estados; lo que desaparece queda
   `en_listado = false`) y cruce provisorio por nombre.
4. `descargar.py` (venv): baja los «nuevo» con 1 s de pausa y reintentos; sha256 y páginas; marca duplicados.
5. `textos.py` (venv): texto por página, páginas sin texto, etiqueta/HDS (la HDS repite «NCh2245»/«Hoja de
   datos de seguridad» en cada página), N° SAG y «solo exportación» por regex, `p<N>.jpg` de las páginas de
   etiqueta (2.000 px); cruce firme por N° SAG (planilla, cancelados, productos) y versiones anteriores.
   **Con el Python del sistema no hace las imágenes y no avisa** (falta pypdfium2): usar siempre el venv.
6. `ocr.py` (venv): OCR de Windows de las páginas sin texto que están antes de la HDS. Si casi no lee letras,
   prueba la página girada (escaneos de lado) y guarda el giro en `ocr_p<N>.json`; `p<N>.jpg` y `recorte.py`
   usan la página derecha. `--rehacer`: repite las páginas que ya pasaron por OCR y siguen sin texto.
   **Desde el 23-10-2026** lee a ~7.000 px y en mosaico 2×2, y se queda con la lectura con más letras (a 300 ppp
   leía basura: PUNTO 70 WP, 127 palabras contra 923). `--mejorar` repite con esa lectura las páginas OCR antiguas
   (ya se hizo con todas las etiquetas en «texto»). No usarlo en etiquetas extraídas y sin cargar: sus citas salieron
   del OCR anterior y dejarían de calzar. **Segunda lectura con Tesseract** (`--psm 11`, texto disperso): lee las
   cifras sueltas de los cuadros que Windows se salta, y al revés; va en `ocr_p<N>.json` («tesseract») y al final del
   texto de la página, tras «--- segunda lectura (Tesseract) ---». `--tesseract` la agrega sin repetir Windows
   (~27 s por página); `--forzar --ids …` también en páginas con capa de texto cuyo cuadro es una imagen (409).
   Releer una etiqueta ya cargada ya no le cambia el estado (`textos.anotar` no retrocede «cargado»/«diferencias»).
7. `lote.py --agentes 2 --por 4`: elige las siguientes etiquetas por prioridad y escribe el encargo de cada
   subagente (y el comando de carga). Salta las que tienen páginas sin OCR; una página que ya pasó por OCR y
   quedó sin texto (en blanco) no frena. `--empresa syngenta`: solo esa empresa (parte del nombre en el listado
   del SAG; hay variantes como «Syngenta S.A»/«SYNGENTA S.A», el filtro las junta). `--nuevos`: sin las de productos
   cuyo N° SAG ya está en el catálogo (esas solo agregan el documento y anotan diferencias). Ojo: una etiqueta que un
   subagente todavía no termina no tiene JSON y `lote.py` la vuelve a ofrecer; no repetirla en otro encargo.
8. `cargar.py <carpeta> --ids … --lote … --modelo …`: verifica (`verificar.py`) y carga, una transacción por
   etiqueta. `--ensayo`: solo escribe el SQL. `--completar` (25-10-2026): con una extracción nueva de una etiqueta
   ya «cargado», llena solo campos vacíos de las líneas que calzan en página, n.° de fila, cultivo y (si las dos
   tienen) algún objetivo; nunca reemplaza un valor ni su cita, no agrega líneas y anota la corrida en
   `extraction_runs` (`raw_output.completar`). Muestra antes → después por campo. Con `--ensayo` lo aplica en una
   transacción que se deshace y cuenta los valores o citas que cambiarían (tiene que dar 0). `--reemplazar` (solo con
   el «sí» de Cristóbal): oculta las líneas «pendiente» del documento (`rechazado`, no se borran) y carga las de la
   extracción nueva; se niega si quedarían menos líneas con dosis o con carencia (salvo `--forzar`); con `--ensayo`
   muestra antes → después y los cultivos que quedarían sin líneas. Desde el 02-11-2026 también con etiquetas
   «diferencias» (producto de la carga original): oculta las líneas «pendiente» de todo el producto y carga las de la
   etiqueta del SAG (así se hizo con CUPROFORTE, 569). `--agregar` (10-11-2026): con una etiqueta ya «cargado»,
   carga solo las líneas que faltan (página, n.° de fila y cultivo que el documento no tiene), sin tocar las cargadas; sirve
   cuando la verificación botó filas por el nombre del cultivo y se corrigió el JSON (antes `--ensayo`: 0 valores cambiados).
9. `reporte.py`: números para el informe (inventario, cobertura, autorizados sin etiqueta, problemas).
Auxiliares: `comun.py`, `expandir.py` (fila × cultivo y su carencia; «cereza (7)» calza con «Cerezo»),
`recorte.py` (zoom de una zona para los subagentes), `calce.py` (extracción nueva contra líneas cargadas),
`turno.py` (una sola sesión automática a la vez), `encargo_codex.md` (lo que lee Codex),
`base_pdf.py`, `comparar_piloto.py`,
`instrucciones_extraccion.md` (lo que leen los subagentes; esquema `recopilador-v1`).

**Extracción:** cada subagente lee las instrucciones, `etiqueta.txt` y las imágenes `p<N>.jpg` (en el texto las
celdas de varias líneas se descuadran; la imagen muestra qué dosis y carencia van con qué cultivo) y escribe un
JSON por etiqueta, sin devolverlo. `verificar.py` busca cada cita en el texto de su página (orden de lectura,
-layout u OCR; sin distinguir mayúsculas, espacios ni guiones de corte; en el OCR también acepta cifras leídas como
letras, «O días» = 0 y «lOO» = 100, `verificar.ocr_digitos`): si no está, el dato se borra. Los números
deben estar en la cita (una dosis armada «185 cc/hL» vale si «185» y «cc/hL» están en los fragmentos de la fila).
Cultivos, objetivos, empresas e ingredientes deben estar escritos en la página. Se guarda en `extraction_runs`
(versión `recopilador-sag-v1`, modelo y resumen de lo descartado).

**Límites de uso (plan Pro de Cristóbal):** el 22-10-2026, 10 subagentes en paralelo agotaron la ventana de 5
horas en ~20 minutos y el límite semanal quedó en 71 %. Por eso: pocos subagentes a la vez (2–3), 3–5
etiquetas cada uno (cada etiqueta agrega 20–50 mil tokens al contexto del subagente), revisar el uso con
`get_usage` antes de cada tanda y parar cerca de 80 %. Orquestar desde una sesión nueva: en una sesión con
contexto grande cada llamada cuesta mucho.

**Piloto (22-10-2026):** Opus, Sonnet y Haiku sobre 20 etiquetas. **Decisión: Haiku para el grueso** (con la verificación de citas la calidad alcanza y gasta mucho menos); Opus o Sonnet solo para etiquetas difíciles. Lo caro es la conversación larga del orquestador, no Haiku. Detalle en `docs/historia.md`.

**Prioridad a mano:** los 22 productos del plan de Cristóbal que faltaban en el catálogo van primero
(`prioridad` negativa; `textos.py` respeta las negativas). PUNTO 70 WG estaba como «no_etiqueta» por su tema;
`cruzar_inventario.py` ahora también acepta archivos que dicen «etiqueta»/«HDS».

**Cómo seguir** (lo hacen solas las sesiones automáticas, ver «Sesiones automáticas»; igual si Cristóbal escribe
«Sigue con el recopilador del SAG»). `py` = Python del sistema con `-I`; `venv` = el de la carpeta de datos.
0. `py scripts/recopilador/turno.py tomar`: si sale con 1, otra sesión está trabajando → terminar sin hacer nada.
   Al final (también si algo falla a medias) siempre `turno.py soltar`.
1. `get_usage`: si la ventana de 5 h está en 70 % o más, o el semanal en 90 % o más, soltar el turno y terminar
   **sin correo**. Durante el trabajo, no lanzar subagentes nuevos con 5 h ≥ 78 % o semanal ≥ 90 % (el 10 % que
   queda es para que Cristóbal use Claude).
2. Si hay filas «nuevo» o «descargado» (etiquetas nuevas del SAG): `descargar.py`, `textos.py`, `ocr.py` (venv).
3. Cargar lo que quedó escrito y sin cargar: `lote.py --sin-cargar extraido` (subagentes de una sesión que se cortó;
   `--modelo claude-haiku-5-5`) y `lote.py --sin-cargar extraido_codex` (Codex: carpeta `extraido_codex`,
   `--modelo openai-codex`). Las primeras 20 de Codex: control al azar solo de ellas (paso 7) antes de seguir
   cargando de Codex; si el control sale mal, dejar de cargarlas y avisar en el correo.
4. **Orden** (Cristóbal: por empresa, 25-10-2026; canceladas y sin planilla al final, 26-10-2026): la empresa de
   «Estado del recopilador» con `--nuevos --vigentes`. Cuando ya no entregue etiquetas, la primera de
   `lote.py --empresas` (anotarla en el Estado). Sin vigentes nuevas en ninguna: las de productos que ya estaban
   (`--vigentes` sin `--nuevos`); al final todo lo demás (sin `--vigentes`).
5. Tandas: `lote.py --empresa <e> --nuevos --vigentes --agentes 3 --por 4` y 3 subagentes **Haiku** (`model: haiku`,
   `general-purpose`) con los encargos tal cual. Cuando uno avisa que terminó: cargar sus etiquetas
   (`cargar.py "C:\Users\crisa\agroquimicos-datos\sag\extraido" --ids … --lote AAAA-MM-DD-n --modelo
   claude-haiku-5-5`) y, si el uso alcanza, pedir `--agentes 1 --por 4` y lanzar otro. `lote.py` reserva lo que
   entrega (12 h), así que nunca repite una etiqueta que otro subagente o Codex tiene. No leer transcripciones.
6. Lo que avisan los subagentes: «0 usos» porque el cuadro es imagen → renombrar su JSON a `<id>.sin_cuadro.json`,
   `ocr.py --tesseract --forzar --ids <id>` (venv) y darla en otro encargo con una nota (citar desde «segunda
   lectura»). Una etiqueta entera sin carencia → buscar en su texto una leyenda («N.C.: No corresponde», «sin
   restricción») y completar con `cargar.py --completar` (antes `--ensayo`: tiene que dar 0 valores cambiados;
   guardar el JSON original como `<id>.antes.json`). Un dato deducido y no dicho (máximos, intervalos) → quitarlo
   del JSON antes de cargar. **Nunca** borrar, reemplazar (`--reemplazar`) ni vaciar valores ya cargados sin el
   «sí» de Cristóbal: dejarlo como pregunta en el correo.
7. Control al azar cada ~100 etiquetas cargadas desde el último (ver Estado): `control.py --n 30` (o `--lote …`) y un
   subagente **Sonnet** con el encargo que imprime; después `control.py --resumen …`. Anotar en el Estado.
8. Al final: `reporte.py`; actualizar «Estado del recopilador» (corto) y agregar el detalle de la sesión al final de
   `docs/historia.md`; commit y push; `turno.py soltar`; **correo a Cristóbal** (ver «Sesiones automáticas»).

**Sesiones automáticas** (desde el 26-10-2026, pedido de Cristóbal: «deja todo programado para hacerlo de la forma
más eficiente»; creada con su «sí» el 26-10-2026): tarea programada `recopilador-sag` de la app de Claude
(`C:\Users\crisa\.claude\scheduled-tasks\recopilador-sag\SKILL.md`, en modo automático; copia del texto en
`C:\Users\crisa\agroquimicos-datos\tarea_programada.txt`, fuera del repo porque trae su correo), 4 veces al día a
las 01:20, 07:20, 13:20 y 19:20 (hora de Chile): con 6 horas entre una y otra cada sesión parte con la ventana de 5 h
renovada. Corre solo si el computador está prendido y la app de Claude abierta (si estaba
cerrada, corre al abrirla; `turno.py` evita que dos trabajen a la vez). Cada sesión es nueva (contexto chico).
Al terminar manda un correo a Cristóbal con el conector de Gmail (su dirección está en la tarea, **no aquí: el repo
es público**): corto, en español de Chile y sin jerga: etiquetas y productos de la sesión, cuántas quedan y fecha
estimada, uso, y las preguntas que necesitan su «sí». Sin conector: dejar el texto en `sag/avisos/<fecha>.txt`.

**Codex (ChatGPT) en paralelo** (desde el 26-10-2026, idea de Cristóbal para terminar antes): Codex tiene su propio
límite. Cristóbal le pega: «Lee y sigue `scripts\recopilador\encargo_codex.md`». Codex toma UPL (`--salida
extraido_codex --sin-base`; luego la primera de `--empresas`), escribe solo JSON en `sag/extraido_codex/` y se
verifica con `verificar.py`; Claude carga lo suyo en el paso 3 con la misma verificación. Codex **no tiene acceso
a la base** (en su entorno no está `LOCALAPPDATA` y la CLI de Supabase no aparece: 26-10-2026, `FileNotFoundError`):
`lote.py` lee la cola de la copia `sag/cola.json`, que se renueva cada vez que Claude corre `lote.py`.
**Desde el 10-11-2026 Codex no tiene cola** (Cristóbal pidió que Claude hiciera las de UPL): las sesiones no esperan a Codex.
Un JSON de Codex de una etiqueta que ya está «cargado» no se carga de nuevo (`--sin-cargar` solo entrega las que siguen en
«texto»): moverlo a `sag/extraido_codex/repetidos/` (autorizado por Cristóbal; no se borra). Al 10-11 no había ninguno.

**Estado del recopilador:** ver el final de este archivo.

## Fase 2 — estado (hecha el 20-10-2026)

Carencia de 2 % a 89,5 % de las líneas de la carga original, con cita y página; además mojamiento, método e intervalo (scripts en `scripts/fase2/`, datos en `datos/fase2/`). Todo quedó «pendiente». Procedimiento, decisiones («COND» = carencia condicionada) y plan original: `docs/historia.md`.

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
- Muchos subagentes a la vez con el plan Pro: 10 en paralelo agotaron la ventana de 5 horas en ~20 minutos y
  ninguno terminó su lote (22-10-2026).
- Dos `supabase db query` al mismo tiempo (se anulan el usuario temporal): usar siempre `comun.sql()`.
- Exigir que la dosis sea texto literal: en los cuadros la cifra está en la celda y la unidad en el
  encabezado; se verifica que cada número de la dosis esté en las citas de la fila.
- Comparar números «sueltos» (sin separadores): «2 - 2,5» quedaba «225» y se perdían dosis. `verificar.numeros_de`.
- Sacar con el OCR de Windows las cifras sueltas de los cuadros escaneados (23-10-2026, PUNTO 70 WP y la 343):
  recortar a la zona con texto, 600–900 ppp, trozos de 1.000–3.500 px y quitar la marca de agua naranja
  («USO EXCLUSIVO SAG», canal rojo) apenas suman palabras y siguen sin leer «Vides», «10-15» o «0,7-0,9».
  Lo resolvió Tesseract en modo texto disperso (`--psm 11`); su modo normal (`--psm 3`) tampoco las lee.
- Calzar las líneas de una extracción nueva con las ya cargadas solo por n.° de fila y cultivo (`--completar` antes
  del 25-10-2026): otra extracción numera las filas distinto y podía poner la dosis de una fila en otra del mismo
  cultivo. Ahora también exige la misma página y algún objetivo en común.
- Pedir todo el catálogo a la vez con la llave pública (06-11-2026): se cortan consultas a los 3 s. Y que un dato de
  adorno (la fecha del pie) pueda botar el sitio: lo que no es indispensable no debe lanzar error.
- Cargar una tanda sin mirar antes qué descarta la verificación (10-11-2026): se pierden filas enteras por una llamada «(*)»
  en el nombre del cultivo o dosis por no citar el encabezado de la columna, y ya cargadas solo se arreglan con `--agregar`
  o con `--reemplazar` (que necesita el «sí» de Cristóbal).
- Correr `ocr.py`/`textos.py` creyendo que no tocan el inventario: al final rehacen el cruce por N° SAG (versiones anteriores
  y producto de cada fila). Desde el 10-11-2026 ese cruce no cambia las filas ya cargadas.

## Estado del recopilador (10-11-2026, ~18:20, después de la sesión 24)

- **11-11-2026 (sesión interactiva, revisión de la tabla de códigos):** dosis completadas con `cargar.py --completar`
  (0 valores cambiados) en 24 productos que no tenían ninguna: 12 cuya dosis se había leído pero la verificación la
  botó porque la unidad estaba en el encabezado (se agregó el encabezado a la cita; `sag/extraido_dosis/`, lote
  `2026-11-11-dosis`, 263 líneas) y 12 releídos desde la imagen por 5 subagentes Sonnet (`sag/extraido_dosis2/`, lote
  `2026-11-11-dosis2`, 322 líneas; las pastas de poda quedan con el texto «Pintar… sobre el corte»). Siguen sin dosis
  (solo en la imagen o con el OCR roto): 3 TAEX (149), Coraza (533), PODASTIK PLUS (1238), NEW CH-CFI (1126), Regalis
  Plus (1361), STATUS DP (1488), TENSCAP (1577), TRIFORM-30/35 (1651/1652). Ingredientes agregados (con cita) a 11
  productos que no tenían: Acronis, CUPROSAN EXTRA, Bravo 720, Celest XL, Cercobin M, Convey (topramezona, nueva), KEEP,
  MODDUS EVO, Serifel, TRICHO-D y TRICHODERMA PASTA (lote `2026-11-11-ingredientes`). **25 productos ocultos** con su
  «Sí, ocúltalos» (ver «Productos ocultos»). Siguen sin ingrediente 4 productos reales del SAG: Absoluto 20% SL (el
  texto de su etiqueta no trae la composición), MODDUS 250 EC (sin extracción: mismo PDF que uno de la base), GRANDEVO WG
  y BIRD SHIELD (problema del N° SAG, ver preguntas).
- Frase de Cristóbal para seguir a mano: **«Sigue con el recopilador del SAG»** → «Cómo seguir». Ahora corre solo
  (ver «Sesiones automáticas»). El detalle de cada sesión va al final de `docs/historia.md` (la más nueva arriba).
- **Sesión 9** (28-10, 13:21–~13:46): 43 etiquetas (Sumitomo) y un control; se cortó sin soltar el turno, sin commit ni
  correo (`turno.py` reemplazó el candado abandonado). **Sesión 10** (29-10, 07:57–~09:05): 80 etiquetas (75 + 5 de Codex),
  1.612 líneas, lotes `2026-10-29-10a` a `-10t` y `2026-10-29-10codex`. Uso: 5 h de 1 a 71 %, semanal de 74 a 83 %.
  **Sesión 11** (29-10, 13:22–~14:00): 34 etiquetas (29 + 5 de Codex), 1.417 líneas, lotes `2026-10-29-11a` a `-11h` y
  `2026-10-29-11codex`; paró por el límite semanal (de 85 a 89 %). **Sesión 12** (30-10, ~07:20–~08:30): 11 etiquetas
  (7 de Point + 4 de Codex), 482 líneas, lotes `2026-10-30-12a`, `-12b` y `2026-10-30-12codex`; paró en 91 % semanal.
  **Sesión 13** (01-11, ~12:30–~17:55): 56 etiquetas (55 + 1 de Codex), 5.422 líneas, lotes `2026-11-01-13a` a `-13n` y
  `2026-11-01-13codex`; Point y Albaugh terminadas. Uso: 5 h de 4 a 32 % (se renovó a mitad), semanal de 2 a 14 %.
  **Sesión 14** (02-11, ~08:00–~08:50): 72 etiquetas (Haiku), 1.993 líneas, lotes `2026-11-02-14a` a `-14q`; Solchem,
  Arysta, Acres y Sipcam terminadas. Uso: 5 h de 2 a 86 %, semanal de 14 a 26 %. **Sesión 15** (02-11, ~13:20–~14:15):
  95 etiquetas + 1 con diferencias (Haiku), 1.942 líneas, lotes `2026-11-02-15a` a `-15z`; Degesch, Gowan, AgroFresh,
  Makhteshim Agan, Summit Agro y Oscar Ham terminadas, y varias empresas chicas. Uso: 5 h de 2 a ~77 %, semanal de 27 a ~37 %. **Sesión 16** (03-11, ~13:15–~14:15): 100 etiquetas (Haiku; 2 con
  Sonnet), ~2.500 líneas, lotes `2026-11-03-16a` a `-16zc`; ~32 empresas chicas (Albaugh, Protección de Madera, Monsanto,
  Nutrien, ISK, Kerley, KPC, Trical, Urrejola, TotalEnergies…). Uso: 5 h de 2 a ~76 %, semanal de 40 a ~50 %.
  **Sesión 17** (03-11, ~15:30–~18:05): 76 etiquetas cargadas (68 Haiku/Sonnet + 8 de Codex) y 16 con diferencias
  (productos que ya estaban), ~2.160 líneas, lotes `2026-11-03-17a` a `-17w` y `2026-11-03-17codex`; se acabaron las
  vigentes nuevas fuera de UPL y se empezó con las de productos que ya estaban. Uso: 5 h de 2 a 79 %, semanal de 50 a 61 %.
  **Sesión 18** (04-11, ~11:00–~13:00): 93 etiquetas vigentes de productos que ya estaban (Haiku): 91 con diferencias
  (solo documento y diferencias anotadas) y 2 cargadas como producto nuevo (1130 NIMITZ 480 EC, 3 líneas; 714, 49 líneas),
  lotes `2026-11-04-18a` a `-18x`. Uso: 5 h de 2 a ~80 %, semanal de 61 a ~72 %.
  **Sesión 19** (04-11, ~13:20–~15:20): 94 etiquetas: 10 de Codex (UPL, 531 líneas) + 1 no es etiqueta; las últimas 23
  vigentes de productos que ya estaban (diferencias) y 56 canceladas o sin planilla cargadas (1.908 líneas, Haiku); lotes
  `2026-11-04-19a` a `-19v` y `2026-11-04-19codex`. Uso: 5 h de 12 a 74 %, semanal de 73 a 81 %.
  **Sesión 20** (05-11, ~08:12–~08:35): 36 etiquetas: 20 de Codex (UPL, 867 líneas) y 16 canceladas o sin planilla (Haiku,
  347 líneas), lotes `2026-11-05-20a` a `-20d` y `2026-11-05-20codex`, y control al azar; paró por el semanal. Uso: 5 h de 2 a
  16 %, semanal de 87 a 89 %.
  **Sesión 21** (05-11, ~13:22–~13:40): 20 etiquetas: 8 de Codex (UPL, 492 líneas) y 12 canceladas o sin planilla (Haiku,
  214 líneas), lotes `2026-11-05-21a` a `-21c`, `2026-11-05-21codex` y `-21codex2`; paró al llegar a 90 % semanal. Uso: 5 h de
  2 a 9 %, semanal de 89 a 90 %.
  **Sesión 22** (09-11, ~10:20–~12:30; Cristóbal estuvo conectado y pidió revisar BASTA): 100 etiquetas: 6 de Codex (UPL, 185
  líneas) y 94 canceladas o sin planilla (Haiku): 88 cargadas (1.557 líneas), 3 con diferencias y 3 que no son etiqueta; lotes
  `2026-11-09-22a` a `-22x` y `2026-11-09-22codex`; control al azar. Uso: 5 h de 2 a ~72 %, semanal de 0 a ~10 %.
  **BASTA 14 SL (inventario 327):** extracción nueva con Sonnet en `sag/extraido/327.json` (original `327.sonnet.json`;
  se corrigieron a mano las citas «O días» → «0 días», los cultivos de la fila del desmanche y el máximo por cultivo, filas
  1b/2b). **Hecho con el «sí» de Cristóbal (09-11):** `cargar.py --reemplazar` (lote `2026-11-09-basta`): 18 líneas
  ocultas (`rechazado`), 40 visibles, carencia en 39 (bordes de canales no trae). `--reemplazar` no llena el producto: el
  N° SAG 3328 (autorizado, vence 2030-05-18) y el glufosinato-amonio (15 % p/v, HRAC «10/H») se agregaron con la
  migración `basta_registro_e_ingrediente` (solo campos vacíos, con cita).
  **Sesión 23** (10-11, ~10:10–~11:00): 44 etiquetas (Haiku): las 29 canceladas o sin planilla que quedaban y 15 de
  Sumitomo/FMC que `lote_resto.py` excluía (ya no las excluye); 38 cargadas y 6 con diferencias, 944 líneas, lotes
  `2026-11-10-23a` a `-23j`; control al azar. Uso: 5 h de 0 a ~32 %, semanal de 28 a ~33 %.
  **Sesión 24** (10-11, ~12:40–~13:30; Cristóbal: «haz tú los de Codex… sube todo lo que quede de UPL»): 61 etiquetas de
  UPL (16 subagentes Haiku): 59 cargadas y 2 con diferencias (180, 183), 1.430 líneas, lotes `2026-11-10-24a` a `-24p` y
  `-24agregar`; tras renovarse la ventana, Cristóbal pidió seguir «sin subagentes, solo con Opus»: las 6 últimas las leyó
  el orquestador (lote `-24q`, modelo `claude-opus-5-5`, 128 líneas). **UPL terminada** (salvo 1327 RADICAL, problema). Código nuevo:
  `"objetivos_de_fila"` (celda de malezas compartida), `cargar.py --agregar`, y el cruce de `textos.py` ya no devuelve a
  «texto» una versión antigua cuando la más nueva está cargada ni le cambia el producto a una etiqueta cargada.
- **Codex:** 20 cargadas y **control al azar hecho** (30-10, `sag/control/2026-10-30_0804_revision.json`: 22 de 30 sin
  observaciones, 0 valores contradictorios, solo datos que faltan): lo suyo quedó todo cargado. **Codex ya no tiene cola** (10-11-2026: Claude tomó UPL; `encargo_codex.md` le dice que no pida más).
- **Siguiente (en este orden):** **la carga del listado del SAG está terminada salvo 13 etiquetas problema**, que
  necesitan arreglar código: **páginas de etiqueta marcadas como HDS por `textos.py`** (JSON como `<id>.pagina_hds.json`):
  932 JANUS 480 FS (Bayer, cuadro en la pág. 19), 532 y 1692 VALIS M (FMC), 509 Clorotalonil 720 SC (Point); de Anasac,
  1059/1060 METRICLAN; **páginas escaneadas de lado** que `ocr.py` no gira bien (ni Sonnet las lee): 464 CHAMP DP WG, 648
  DiTera WG, 817 GIBGRO 10LS (Sumitomo), 673 DUOMAX 425 SC, 1123 NEMATON y 602 DECCOAZOX 25 SC (JSON como
  `<id>.girada.json`/`.sin_cuadro.json`); y **1327 RADICAL (UPL)**: escaneada, el OCR (también Tesseract) no lee las dosis
  ni la carencia (`1327.sin_cuadro.json`). Todas en `PROB` de `lote_resto.py`. Después: las diferencias de los productos
  que ya estaban y el workflow mensual (ver «Falta»). **Antes de cargar cualquier etiqueta, mirar qué bota la verificación**
  (si bota filas por el nombre del cultivo o dosis porque la unidad está en el encabezado, corregir el JSON; ya cargada,
  `cargar.py --agregar`) **y comparar el N° SAG del JSON con el del inventario**: `textos.py` lee mal algunos («2.000-0023»
  de THIOPRON quedó 2000, el de MAULER; ABAMITE ME quedó 2460, el de CASORON); la planilla del SAG (`oficiales.py`) manda.
  Revisar las 5 etiquetas con N° 2000 marcadas «versión anterior» (142, 794, 878, 879, 1166): probablemente mal leído.
  **Ojo: `lote.py --help` no muestra ayuda, reserva 8 etiquetas** (soltarlas con `lote_resto.py unreserve <ids>`).
- **Cola:** 13 en «texto», todas etiquetas problema.
- Inventario: 1.634 filas; 13 en «texto», 1.360 cargadas, 159 diferencias, 68 no son etiqueta, 8 versiones
  anteriores, 14 sin PDF, 5 ilegibles, 5 duplicados, 2 ya en la base.
- Base: 1.509 productos (1.469 con N° SAG), 44.283 líneas visibles; dosis 93,8 %, carencia 90,2 %; 137 MB.
- Control al azar de la sesión 24: no tocaba (59 cargadas desde el último); el próximo, con las de UPL de esta sesión.
- Último control al azar: 10-11-2026 10:31, de la sesión 23 (`sag/control/2026-11-10_1031_revision.json`): 29 de 30 sin
  observaciones (24 de FLECHA 9.6 EC, 747); falta la dosis de papa de ACECLAN 70 WP (167: 90–110 g/ha, el OCR de la pág. 2
  está revuelto). El siguiente, con lo nuevo de Codex.
- Antes: 09-11-2026 12:19, con 1.256 cargadas (`sag/control/2026-11-09_1219_revision.json`): 21 de 30 sin
  observaciones; faltan intervalos (4), mojamientos (4), 2 carencias (1152 guindo 1 día, 201 cerezo «no se considera»);
  865 almendro con el intervalo de cerezo (20–30 días: ¿quitar?), 1607 TITAN SG objetivo «#», 1648 TRIFLUREX repollo
  guarda solo la dosis de suelo pesado.
- Antes: 05-11-2026 08:15, de la sesión 19 (`sag/control/2026-11-05_0815_revision.json`): 19 de 30 sin
  observaciones; 9 líneas con datos que faltan (dosis, carencia, máximos, intervalos, mojamiento) y 2 con objetivo «#» que la
  etiqueta no trae (CARFEX, 438).
- Antes: 03-11-2026 17:55, de las sesiones 16 y 17 (`sag/control/2026-11-03_1755_revision.json`): 18 de
  30 sin observaciones, 0 valores que contradigan la etiqueta; faltan 6 dosis (o sin unidad), 4 carencias, 2 máximos, 1
  mojamiento. Antes: 03-11-2026 10:15, de la sesión 15
  (`sag/control/2026-11-03_1015_revision.json`): 14 de 30 sin observaciones, 0 valores que contradigan la etiqueta. Antes: 02-11-2026 14:05, con ~840 cargadas, 30 líneas de la sesión 14
  (`sag/control/2026-11-02_1405_revision.json`): 20 sin observaciones, 3 valores que no calzan (ver preguntas), el resto
  datos que faltan. Antes: 02-11 08:34 (sesión 13, 21 de
  30 sin observaciones). Antes: 01-11 12:34
  (sesión 10, 16 de 30 sin observaciones, faltan mojamientos). Anterior: 29-10 08:48, con ~545 cargadas, 30 líneas de la sesión 8
  (`sag/control/2026-10-29_0848_revision.json`): 20 sin observaciones, 0 valores que contradigan la etiqueta; faltan datos
  (6 dosis, 4 carencias, 1 intervalo, 2 objetivos, 1 método). El de la sesión 9 (28-10 13:23, `…_1323_revision.json`): 14 de
  30 sin observaciones, casi todo datos que faltan, y 3 valores dudosos (ver preguntas). Ojo con Haiku: pone máx. = mín.
  cuando la etiqueta dice «mínimo X» (mojamiento, intervalo): revisarlo en el JSON antes de cargar.
- Preguntas abiertas para Cristóbal: **GLIFOGLEX 480 SL (821)** (tabla por grupo de malezas: ¿`--reemplazar`?);
  **vaciar el método «Aplicación terrestre»** de ALION 500 SC, ESPLANADE 500 SC y AGRITOX 750 (arroz) (no está en la
  etiqueta); **KNOCKOUT (964) kiwi**: mojamiento 1.500–2.000 en la base y 1.500–2.500 en la etiqueta (¿corregir?);
  **MCPA 750 SL (1043)**: objetivo «#» (¿quitar?); **761 Remolacha** (la etiqueta dice 113 días y también «no corresponde»:
  quedó sin carencia); **1401 RUKARB** (¿50 WP u 85 WP?); del control del 02-11 14:05: **825 GLIFOSATO 75,7 % SG**
  (objetivo «#»), **1579 TERBUTILAZINA 75 DF** (nogal con «Siete venas» y «Chinilla», de la fila de avellano), **1154
  NUZOLE** (granado, dosis «60» sin unidad: cc/100 L); **1465/1467** (1-MCP: ¿«no aplica» por «no deja residuos
  detectables»?); ACTELLIC AGRO (188); Agrocup (207); revisar
  `recopilador_revision`; del control del 03-11: **855 HARVISTA** (peral, máx. 1 aplicación que la etiqueta no dice:
  ¿quitar?), **1009 MAGISTER** (pomelo y tangerina, dosis sin unidad: cc/100 L), **447 CAVALIER** (carencia «no aplica»);
  de la sesión 16: **1456** (carencia 120 días en el cuadro y «60 días» en una nota), **382** (0 días y «hasta 14 días antes»);
  de la sesión 17: **1243 POKER 240 EC remolacha** (113 días y también «no corresponde», igual que 761: quedó sin carencia),
  **1363** (Botrytis: «hasta 3» y «hasta 4» aplicaciones; se cargó 3), **coadyuvantes, preservantes de madera y trampas sin
  cultivo** (901, 1365, 1673, 1208, 1210: quedan con 0 líneas; ¿cómo mostrarlos?); de la sesión 20: **1551 TAMENKILL** (0 líneas:
  el subagente puso cada cultivo con su paréntesis y la verificación los botó; arreglar el JSON y `--reemplazar`), **438 CARFEX**
  (objetivo «#»: ¿quitar?), **1590** (autorización «2.747-O», cargada 2747); de la sesión 22: **1667** (la «carencia» de 7 días es hasta el pastoreo; la etiqueta la titula «Período de
  carencia»), **1580 TERCEL 50 WP** (iprodiona con «FRAC F1» en la etiqueta: no está en `moa_equivalencias`); de la sesión 23:
  **284** (carencia «N.C.» sin leyenda en la etiqueta: quedó sin carencia; ¿«no aplica»?), **646 DIPEL WG** melón y sandía
  (dosis 250–500 y 500 de una celda: se cargó 250–500 para los dos).; de la sesión 24: **BIRD SHIELD
  con el N° SAG 1880, que es de ACRAMITE 480 SC** (su etiqueta, 378, no trae número y el cargador tomó el del inventario, que
  estaba mal): ACRAMITE 480 SC (180) quedó como «diferencias» de BIRD SHIELD y no entró como producto; ¿quitarle el número a
  BIRD SHIELD y cargar ACRAMITE 480 SC (10 usos ya leídos en `extraido/180.json`)?; **OXUS (1181), RAPTOR (1344) y RIPPER
  FULL SL (1380)** sin malezas por fila (celda compartida): ¿volver a leerlas y `--reemplazar`?; **SEMPRA y SEMPRA WG (1424,
  1425)**: «No se establece período de carencia» (¿«no aplica»?); **productos que juntan etiquetas distintas** porque
  `sag_inventario.registro_sag` estaba mal (el número no está en el texto de 51 de 1.379 etiquetas): 1880 BIRD SHIELD + SULTAN
  (1516) + ACRAMITE, 3590 TIGER 700 EC + ASULOX (274), 1615 RIMON + NIMITZ + PEDESTAL, 2857 RAPIZENT + CADILAC, 1591 DIAZOL +
  ETANIS, 2426 ORIUS + ATLAS, 2756 AZUFRE FLO + AZUFRE FLOABLE AN: revisar uno por uno con él (y que `cargar.py` no use el
  número del inventario si no está escrito en la etiqueta); **N° SAG con «-O»** guardados como «1648-» o «2460-0»: no
  calzan con la planilla del SAG y el producto queda «no figura» (unos 40 productos): ¿normalizarlos?
- Etiquetas flojas: COLT 45 WP (515); BACIFRUIT SC (315); AQUILES 24 EC (261); TOXIMOL (1620, segundo cuadro pág. 4); 591;
  RANGO 480 SL (1337); NEXUS 50 SL (1129); 1717; 542; de la sesión 8: 828/829/830 GLIFOSPEC, 1382 RIPPER MAX, 1148 NUMEK,
  1176 OVERKILL (cuadro aéreo), 1452 SIMAZINA, 640, 940, 647, 1699; de la sesión 10: 197 y 1708 VERPEZU (0 líneas), 639,
  1163/1164 ORIUS, 1107, 1736 VYDATE L, 288 AVENUE, 831 GLYPHOGAN; de la sesión 11: 1133 (1 línea), 1354 (2), 1610 TOPGUARD
  (3), 1725 VINCIT FLO (1 uso), 755, 1398, 1399, 1400 (dosis sin unidad); de la sesión 12: 1237 (Codex, 0 líneas), 1542
  (dosis de tomate), 157; de la sesión 13: 832 y 873 (0 líneas), 176 ACIGIB (falta uva de mesa), 470, 1621, 1351,
  888, 1386; de la sesión 14: 951 (0 líneas), 1010, 1000, 1306, 629, 1012, 507; de la sesión 15: 631, 632, 1171, 1297,
  1691, 1741, 1743, 1004, 1209, 1211 (0 líneas: raticidas, madera, trampas), 523 («Uha»), 986,
  1567, 1648; de la sesión 16: 1650, 1446, 339, 1522, 1390 y 1218 (cientos de líneas), y las de madera, raticidas y
  coadyuvantes con 0–2 líneas (ver `docs/historia.md`); de la sesión 17: 1651 y 1652 TRIFORM (1 línea sin dosis), 1577
  TENSCAP (sin dosis), 1636 (0 líneas), 1605 (fila 15 sin cargar), 306, 1389 y 1391 (faltan filas de malezas), 277 (cereales
  sin dosis); de la sesión 20: 1551 y 378 (0 líneas), 1432 (dosis de 3 filas: el OCR no trae «1,0»), 1589 y 1590 (cuadros
  desordenados), 1523 (dosis sin unidad); de la sesión 23: 1331 RAK Pomáceas (0 líneas: feromona en
  cápsulas/ha), 1488 STATUS DP (sin dosis: la segunda lectura tampoco lee «2,0 – 2,5 kg/ha»; en `PROB`), 167 ACECLAN 70 WP
  (OCR revuelto: varias filas sin dosis), 166 (misma etiqueta sin cuadro, quedó como diferencias), 1464 SIZER 70 WG (sin dosis:
  el OCR lee «25» por «2,5»), 1612 (dosis «15a2,0»), 747 FLECHA 9.6 EC (568 líneas, revisada en el control: bien).; de la sesión 24 (UPL): 1585 TERWEED (38 de 60 líneas sin dosis: celda combinada),
  444 CASORON 4G (sin dosis: g/m² solo en la imagen), 583 CYANAMIDA 50% (OCR dañado: solo vides con dosis), 564 CUPROBORDOLES
  (6 sin dosis), 1188 PANTERA 12 EC (dosis por zona en observaciones), 785 FUNGICUP WG (sin carencia), 866 HIDROXICOBRE 50% WG
  (20 sin objetivo), 319 BALEAR 720 SC y 1072 MICROTHIOL (falta el cuadro aéreo), 558 CRUSADER (vides sin dosis), 1083 MIXER y
  1684 UNIFILM 707 (coadyuvantes, 0 líneas), 1236/1238/1240 PODASTIK (pasta para cortes, sin dosis numérica), 212 ALIADO
  (faltan cereales), 155 ABAMITE ME (47 de 89 líneas sin dosis: esas cifras solo se leen en la imagen), 1495 STIK
  (coadyuvante, 0 líneas).
- **CUPROFORTE (569), 02-11-2026, con el «sí» de Cristóbal:** sus 59 líneas de la carga original eran texto OCR revuelto
  (ningún cultivo real); `cargar.py --reemplazar --forzar` las ocultó y cargó 21 de la etiqueta del SAG (lote
  `2026-11-02-cuproforte`). En `569.json` se separaron cultivos («Naranjo Limonero» → Naranjo y Limonero, «Nectarines y
  Durazneros») y se agregaron a la cita las dosis de nogal y nectarines y la de avellano en cc/100 L, todas escritas en
  la página (original en `569.antes.json`). Faltan olivo y berries: el PDF trae dos capas de texto revueltas
  («AOrláivnodanos») y la verificación no los encuentra.
- Falta: las diferencias de los productos que ya estaban (incluido ACABAN, inventario 161) y, al terminar, el
  workflow mensual.

## Pendiente

- **Borrar definitivamente** las Edge Functions `export-csv` y `agro-script` (hoy desactivadas: exigen
  JWT y responden «Función retirada»). El MCP no tiene herramienta para borrar: usar la CLI de Supabase
  (`supabase functions delete <nombre> --project-ref cejkhfugaobfqnjpkgpl`) o el panel.
- La CLI de Supabase ya tiene sesión (22-10-2026): sirve para subir PDF al bucket y borrar las funciones.
- ACABAN® 050 SC **versión 16-06-2025**: está en el listado del SAG (`sag_inventario` 161). Al procesar su
  N° SAG (1447, ya en la base) el recopilador agrega ese documento y anota las diferencias con las 56 líneas
  aprobadas (no las toca).
- **Recopilador:** seguir con los lotes (ver «Recopilador del SAG» y la frase para continuar al final del
  informe de cada sesión). Cuando termine la carga completa: workflow mensual de GitHub Actions que revise el
  listado del SAG sin IA y anote lo nuevo en un CSV del repo con un aviso; luego, toxicidad en abejas en el sitio.
  Revisar `recopilador_revision` (cultivos/objetivos nuevos) y `sag/diferencias.csv` con Cristóbal.
- **Productos del plan de Cristóbal que no están en el catálogo** (21-10-2026). Él pidió «búscalos y
  agrégalos». Plaguicidas (necesitan su etiqueta oficial: buscarla en SAG o en el sitio del fabricante,
  pedir permiso para descargar, subir al bucket con la CLI y extraer con cita): RAYO, MOSPILAN, PREVICUR,
  PUNTO 70, LUNA EXPERIENCE, MURALLA DELTA, CONFIDOR 200 SL, CONFIDOR 350, PIRIMOR, ZERO, ABAMAX 1,8 EC,
  BULLDOCK, GLADIADOR, IMPULSO 25 SC, METALAXIL MZ 58, KASUMIN, AZUFRE FLOABLE AN 600, AZUFRE 80%,
  CITROLIV, BC-1000, ENTONEM, CONDOR SHIELD. Fertilizantes, bioestimulantes y coadyuvantes (SILWET,
  ZOBERAMINOL, CALCIO-BORO, DEFENDER MANGANESO, VITANICA RZ, SAGASTIM, FLOWER POWER, FRUTALIV, STIMULATE,
  ULTRASOL, MEZCLA 17-20-20) quedan como «fuera del catálogo». **22-10-2026:** el recopilador ya cargó todos los
  plaguicidas de esta lista que están en el listado del SAG; PUNTO 70 WP (23-10) quedó con pocas dosis (cuadro
  escaneado); ver «Estado del recopilador».
- **Cuadros escaneados (23-10-2026):** resuelto con la segunda lectura de Tesseract (`ocr.py --tesseract`). Las 10
  etiquetas cargadas que quedaron flojas se volvieron a extraer y se completaron el 25-10-2026 (dosis 64 → 127 de 227
  líneas) y 4 se reemplazaron con su «sí» (PUNTO 70 WP, ABAMECTIN 18 EC, 184, 325; ver «Estado del recopilador»).
  163 y 485 quedan con la carga vieja completada: para mejorarlas haría falta otra lectura (Sonnet) que no pierda
  Duraznero (163) ni las carencias (485). La 409 (BUMPER
  25 % EC) no está cargada: su intento sin cuadro quedó como `sag/extraido/409.sin_cuadro.json`, así que `lote.py`
  la vuelve a tomar cuando le toque a su empresa.
- Revisión humana: para que una línea diga «Revisado» alguien tiene que compararla con la etiqueta
  (hoy solo las 56 de ACABAN). Quitar `noindex` lo decide Cristóbal.
- Limpieza de datos (con su visto bueno): cultivos-frase, duplicados de cultivos, objetivos y productos,
  ingredientes basura, métodos antiguos con basura.
- Mejoras posibles: modo sin conexión completo (service worker), imagen para compartir por WhatsApp,
  favoritos por celular.
