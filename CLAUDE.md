# Agroquímicos CRM — memoria del proyecto

Leer completo antes de tocar algo. Última actualización: 26-10-2026.
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
- Se mantienen: letra de 17 px y alto contraste (se usa al sol), barra inferior en celular (Inicio y Plan).
- **Menú simple y tabla ancha (pedido del 27-10-2026):** solo «Inicio» y «Plan de aplicaciones». El inicio usa todo el
  ancho de la pantalla (`--ancho-max` 1600 px; `ANCHA = true` en la vista); el resto de las páginas, 1180 px.
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

- `index.html`: una sola página, `noindex`, carga supabase-js y `assets/js/app.js`.
- Rutas con `#` (funcionan en GitHub Pages sin configuración):
  - `#/?cultivo=<id>&objetivo=<id>&oq=<texto>&cat=<id>&q=<texto>&empresa=<nombre corto>&moa=<clave>|sin&ing=<id>&orden=nombre|empresa|moa|cultivos&todos=1`
    **Inicio = «¿Qué aplico?»** (rehecho el 27-10-2026 a pedido de Cristóbal; vista `assets/js/vistas/inicio.js`):
    filtros arriba (cultivo y plaga/enfermedad/maleza con sugerencias; tipo de producto; texto; en «Más filtros»
    empresa y modo de acción) y una tabla con **una fila por producto**: Producto (+ categoría), Empresa (nombre corto),
    Modo de acción, Tipo (código de formulación: WP, SC…), Ingrediente activo (solo nombres), Etiqueta (PDF),
    Reg. SAG, Cultivos (3 y un botón «+X» que muestra el resto) y Dosis «desde – hasta», más un botón al plan.
    **Sin carencia ni reingreso en esta tabla** (pidió sacarlos; siguen en la ficha y en el plan). Con cultivo u
    objetivo, cultivos y dosis salen solo de las líneas que calzan (Enter en el objetivo = «Todos los que dicen…»).
    Los productos que no se usan en Chile quedan ocultos con un botón para mostrarlos. Debajo de 1.100 px la tabla se
    vuelve tarjetas (dos por fila en tablet). Ya no existen la rotación de grupos ni el buscador general.
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
- **Empresa (nombre corto):** `db.js → nombreCorto()`: marcas conocidas («Syngenta», «Bayer», «UPL»…) y, si no, el
  nombre sin «S.A.», «Ltda.», «Chile», rubro, etc. (una o dos palabras). Se usa la primera empresa del producto
  (orden de `rango_rol_empresa`: titular, registrante, distribuidor, importador…).
- **Dosis «desde – hasta»** (`ui.js → dosisRango`, `resumenDosis`): mínimo y máximo de `dose_min`/`dose_max` por unidad
  y base (L/ha, cc/100 L, kg/ha, %…), sin mezclar ni convertir unidades; las dosis con base «otro» o sin unidad no
  entran al rango («Ver en la etiqueta» si no queda ninguna). Regla 1: «Revisado» solo si todas las líneas del
  resumen están aprobadas; si alguna tiene confianza < 0,80, alerta.
- Datos: al abrir se cargan las listas chicas (vistas `v_sitio_*`, `categories`, `active_ingredients`,
  `companies`, reingreso de `product_safety_profiles`); las líneas de uso se piden por cultivo, objetivo o
  producto. Todo paginado de a 1.000 filas (límite de la API) en `db.js → todas()`.
- Sin conexión: si falla la carga, usa la última copia guardada en `localStorage` y lo avisa.
- Las piezas que cumplen las reglas 1–3 están en `assets/js/ui.js` (`estadoRevision`, `dosis`,
  `carencia`, `reingreso`, `linkPdf`, `urlDeLinea`). Usarlas siempre; no mostrar dosis ni carencia «a mano».
  `carencia`, `mojamiento`, `intervalo` y `metodo` muestran el valor con su cita «…» (pág. N) desde
  `field_citations` (`citaDe`); carencia condicionada → «Depende: ver condición en la etiqueta» + cita.
- En la ficha y en el plan la dosis se muestra **como texto de la etiqueta** (`dose_raw`); en la tabla del inicio,
  «desde – hasta» con los números leídos (pedido de Cristóbal, 27-10-2026).
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
   muestra antes → después y los cultivos que quedarían sin líneas.
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

## Estado del recopilador (26-10-2026, 14:20, después de la sesión 6, la primera automática)

- Frase de Cristóbal para seguir a mano: **«Sigue con el recopilador del SAG»** → «Cómo seguir». Ahora corre solo
  (ver «Sesiones automáticas»). El detalle de cada sesión va al final de `docs/historia.md`.
- **Sesión 6** (26-10, 13:20–14:20, automática): 100 etiquetas (Anasac completa y 11 de Bayer), 3.987 líneas, lotes
  `2026-10-26-6a` a `-6z`. Uso: 5 h de 1 a ~72 %, semanal de 25 a ~35 %.
- **Codex:** 4 de las 20 antes de su control al azar (lote `2026-10-26-codex-1`); en esta sesión no había nada suyo sin
  cargar. **Codex: UPL** (110).
- **Empresa actual: Bayer** (56 vigentes de productos nuevos). Anasac y Syngenta: terminadas (de Anasac quedan solo
  1059/1060, METRICLAN 48 SC: la etiqueta viene partida en dos PDF —parte 1 sin cuadro, parte 2 con el cuadro en
  imagen—; las dos como `.sin_cuadro.json` y la 1060 ya con la segunda lectura de Tesseract). Después: BASF 58,
  Agrospec 55, Sumitomo 48, Corteva 48…
- **Cola:** 857 vigentes de productos nuevos; además ~110 de productos que ya estaban y 236 canceladas o que no
  figuran en la planilla. Ritmo: ~100 por sesión y ~650 por semana (límite semanal); Codex suma aparte. Estimado:
  ~8 de noviembre.
- Inventario: 1.634 filas; 1.206 en «texto», 279 cargadas, 10 diferencias, 63 no son etiqueta, 50 versiones
  anteriores, 14 sin PDF, 5 ilegibles, 5 duplicados, 2 ya en la base.
- Base: 430 productos (400 con N° SAG), 13.957 líneas visibles; dosis 95,2 %, carencia 89,1 %; 60 MB.
- Último control al azar: 26-10-2026 14:15, con 279 cargadas, 30 líneas de la sesión 6
  (`sag/control/2026-10-26_1416_revision.json`): 22 sin observaciones, 0 valores que contradigan la etiqueta; faltan
  datos (5 carencias, 1 mojamiento, 1 máximo) y 2 métodos «Al follaje» no escritos (BELENUS 30 WG). El siguiente con
  ~380. Desde ahora `control.py` nombra los archivos con fecha y hora (el de la mañana se sobrescribió; su revisión
  quedó) y `--lote` acepta patrón (`2026-10-26-6%`).
- Preguntas abiertas para Cristóbal: **GLIFOGLEX 480 SL (821)**: la tabla de dosis por grupo de malezas quedó como 9
  líneas por frutal, cada una con la dosis de un grupo pero sin decir cuál (el control lo marcó): ¿reemplazarlas
  (`--reemplazar`) por líneas con el grupo de malezas como objetivo?; ACTELLIC AGRO (188); Agrocup (207); revisar
  `recopilador_revision`.
- Etiquetas flojas: COLT 45 WP (515); BACIFRUIT SC (315); AQUILES 24 EC (261); de la sesión 6: TOXIMOL (1620) tiene un
  segundo cuadro en la pág. 4 sin cargar; 591 (3 de 6 cultivos: Zapallos, Pepino y Melón tuna solo en la imagen);
  RANGO 480 SL (1337) sin dosis ni carencia («N.C.» sin leyenda); NEXUS 50 SL (1129) sin carencia («no se establecen
  carencias»); 1717 (cebo para avispas) sin líneas; 542 (CPPU) sin carencia de Arándano y Cerezo.
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
- TOPAS 200 EW no tiene grupo de modo de acción en los datos (penconazol sin grupo): revisar su etiqueta.
- Limpieza de datos (con su visto bueno): cultivos-frase, duplicados de cultivos, objetivos y productos,
  ingredientes basura, métodos antiguos con basura.
- Mejoras posibles: modo sin conexión completo (service worker), imagen para compartir por WhatsApp,
  favoritos por celular.
