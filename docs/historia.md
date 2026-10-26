# Historia del proyecto (no se carga sola)

Lo que se sacó de CLAUDE.md el 26-10-2026 para que cada sesión y cada subagente lean menos. Leer solo si hace falta el detalle.

## Recopilador: piloto del 22-10-2026

**Piloto (22-10-2026):** 20 etiquetas (10 ya en la base, incluida ACABAN con sus 56 líneas aprobadas, y 10
nuevas, una escaneada) con Opus, Sonnet y Haiku; el límite de uso cortó la mayoría a medias. Resultados:
Opus en Cuproso Flo 22/22 cultivos con dosis y carencia iguales a la base; en Antracol separó la dosis por ha y
por 100 L y asignó la carencia por cultivo (Sonnet la dejó vacía). Haiku (instrucciones nuevas): Strepto Plus
14/14 carencias iguales (las 7 diferencias de dosis son errores de la base: la etiqueta dice «Preventivo: 60 /
Curativo: 120» y la base guardó 60); Dormex 8/8 carencias, 7/8 dosis; Scholar 19/19 dosis y carencias (Haiku:
~130 mil tokens por etiqueta); ACABAN (instrucciones viejas) 37/50 dosis
y 36/50 carencias contra las aprobadas (fallaban flores: «flores» no asignado a cada fila, ya corregido).
Lo que salió del piloto: dosis armada (cifra + unidad del encabezado), números en palabras («sólo una vez»),
fruta ↔ planta en la carencia, plural/singular, `cultivos_de_fila` (herbicidas con ~80 cultivos por celda) y
carencia asignada en cada fila. **Decisión: Haiku para el grueso** (con la verificación de citas la calidad
alcanza y gasta mucho menos); Opus o Sonnet solo para etiquetas que el control muestre difíciles. La medición de
uso mostró que lo caro era la conversación larga del orquestador, no Haiku.

## Fase 2 (20 y 21-10-2026)

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

## Recopilador: sesión 6 (26-10-2026, primera sesión automática)

- 13:20–15:00. Uso al empezar: 5 h 1 %, semanal 25 %. 26 tandas de Haiku (máx. 3 a la vez, 4 etiquetas cada una,
  160–275 mil tokens por subagente) + 1 reextracción con Sonnet (1337) + control al azar con Sonnet. 100 etiquetas
  cargadas (lotes `2026-10-26-6a` a `-6z`), 3.987 líneas: Anasac completa y 11 de Bayer. Nada nuevo en el listado
  del SAG; nada de Codex sin cargar. Uso al terminar: 5 h ~72 %, semanal ~35 % (~1 % semanal cada 10 etiquetas).
- Correcciones del orquestador antes de cargar (el JSON original quedó como `<id>.antes.json.bak`):
  1084 método «Aplicación terrestre» (deducido) → texto literal «Con equipos herbicidas de barra»; 821 GLIFOGLEX:
  quitadas las dosis de Eucaliptos y Bordes de canales (asignadas por posición desde la tabla por maleza);
  1042 MCPA 750 SL: la celda MALEZAS es una sola para todas las filas → lista completa en cada fila; 1129 NEXUS:
  Vides «4,0 / 5,0» (dos dosis según forma de aplicar, no un rango).
- Revisados y dejados como estaban (la etiqueta lo dice): KIMURA 300 SC arándano 170 días; SHIELD BRITE y CLIP
  «350 - 1304 cc/100 L» (error de tipeo probable de la etiqueta); 490 mandarinos 130 días; 222 intervalos por fila;
  858 HAZARD «Frutales (mencionados en el cuadro)»; 1622 «No corresponde por la naturaleza de la aplicación».
- Al protocolo de cuadro en imagen (`.sin_cuadro.json` + `ocr.py --tesseract --forzar`): 591 y 542 (reextraídas y
  cargadas en la misma sesión), 1059/1060 (METRICLAN 48 SC, etiqueta partida en dos PDF; quedan pendientes).
  1337 (RANGO 480 SL) salió con 1 uso → `1337.incompleto.json` y Sonnet: 4 usos sin dosis (la tabla por maleza no
  dice a qué uso va).
- Control al azar (30 líneas de la sesión, Sonnet): 22 sin observaciones; 0 valores contrarios a la etiqueta; 5
  carencias faltantes (N.C. sin leyenda en 1337 y 821; BELENUS tomate 3 días), 2 métodos deducidos («Al follaje»,
  BELENUS), 2 líneas de GLIFOGLEX con dosis de un grupo de malezas sin el grupo, 1 mojamiento y 1 máximo faltantes.
- `control.py`: archivos con fecha y hora (la muestra de la mañana `2026-10-26.json` se sobrescribió; su revisión
  `2026-10-26_revision.json` está intacta) y `--lote` con patrón SQL (`%`).

## Recopilador: sesión 5 (26-10-2026)

- Sesión 5 (26-10-2026), todo con Haiku (lotes `2026-10-26-1` a `-16`):
  - **66 etiquetas, 66 productos nuevos, 2.586 líneas**, 0 errores de carga: los 10 últimos de Syngenta (ACTELLIC
    AGRO, SCHOLAR 50 WP, TOUCHDOWN IQ, KLERAT MINIBLOQUES y PELLETS, TERVIGO, TREFINTI, GRO-STOP FOG y 300 EC,
    VIBRANCE PREMIUM) y 56 de Anasac. RANGO 75 WG (1.047 líneas) y RANGO FULL (482) son glifosatos: la dosis cambia
    por grupo de malezas y se repite en cada cultivo. Comprobado en el sitio: la ficha de RANGO 75 WG carga las 1.047.
  - **Control al azar** (`control.py --n 30`, revisor Sonnet, `sag/control/2026-10-26_revision.json`): **0 valores
    equivocados** en 30 líneas; 25 completas y 5 con un dato que la etiqueta trae y la base no («falta»: PUNTO 70 WP
    olivo sin dosis, mojamiento y máximo; AZUFRE FLOABLE AN 600 arveja sin mojamiento ni método; AGIL 100 EC máximo;
    PUNTO 70 WG método; BONNUS 400 SC mojamiento). **Assure Pro** (inventario 272) guardaba mojamiento 100–150 L/ha
    que en la etiqueta es un «volumen mínimo» según la zona (100 con buena pluviometría, 150 en zonas áridas): **con el
    «sí» de Cristóbal se vació en sus 812 líneas** (migración `correccion_mojamiento_assure_pro`; el valor anterior
    quedó en `use_field_candidates.existing_value`, extractor `correccion-recopilador-v1`). Dudosos, sin corregir
    (preguntar a Cristóbal): ACTELLIC AGRO (188) pone la carencia de «aplicación directa a los granos» en
    la fila de granos ensacados; Agrocup (207) naranjo: máximo e intervalo de una celda que comparten tres
    enfermedades. Se agregaron dos reglas a `instrucciones_extraccion.md` para que no se repitan.
  - **«N.C.»**: RANGO 75 WG quedó con 0 carencias porque el subagente citó solo «Carencia: N.C.» (el verificador no lo
    acepta, bien). La leyenda «N.C.: No corresponde» está en la misma página: se agregó a las citas
    (`sag/extraido/1339.json`; el original quedó como `1339.sin_leyenda.json`) y `--completar` llenó las 1.047 (ensayo:
    0 valores cambiados). Igual con PINOGARD 75 DF (1220): «Tiempo de carencia: sin restricción.» (general, pág. 2) →
    6 líneas «no aplica» (`1220.sin_carencia.json`). Las instrucciones ahora piden citar la leyenda junto a «N.C.».
  - **Cuadros que son imagen en páginas con texto** (como la 409): 515 COLT 45 WP y 315 BACIFRUIT SC. Se les hizo
    `ocr.py --tesseract --forzar --ids …` y se volvieron a extraer (los intentos sin cuadro: `<id>.sin_cuadro.json`).
    COLT quedó con 3 líneas con dosis pero **sin carencia** (los días solo se ven en la imagen); BACIFRUIT con 2 de 4
    usos (la celda «Vid de mesa, vid vinífera, vid pisquera» no pasó). No se detectan antes: el subagente avisa con
    «0 usos». Una medición de imágenes con pypdfium2 no los encontró (el cuadro no es una imagen simple).
  - 791 FUROR 75 DF: se quitó un «máximo 2 aplicaciones» que el subagente dedujo de «dosis parcializada en dos
    aplicaciones» (no es un máximo de la etiqueta).
  - Sin carencia, y está bien: KLERAT MINIBLOQUES («no se indican por la naturaleza de la aplicación»), GRO-STOP
    (condicional por dosis).
  - Uso: 5 h de 2 a 76 % y semanal de 12 a 22 % para 66 etiquetas + el control; 3 subagentes a la vez × 4 etiquetas
    (230–360 mil tokens cada uno, ~4 % de la ventana cada uno). Se lanzó uno nuevo cada vez que otro terminaba.

## Recopilador: sesiones 4, 3 y 2

Sesión 4 (25-10-2026), para la historia, todo con Haiku:
  - **Etiquetas flojas** (cuadros escaneados, ahora con la segunda lectura de Tesseract): se volvieron a extraer
    10 (1312 PUNTO 70 WP, 152 ABAMECTIN 18 EC, 163, 184, 325, 343, 370, 389, 410 y 485 CITROLIV EMULSIBLE+; los
    JSON anteriores quedaron como `sag/extraido/<id>.sesion3.json`) y se completaron con `--completar` (lote
    `2026-10-25-1`, solo en `extraction_runs`): **líneas con dosis 64 → 127 de 227**, sin cambiar ningún valor ni
    cita (ensayo: 0). PUNTO 70 WP 12 → 19 de 50; ABAMECTIN 26 → 46 de 56; 163 1 → 11; 370 11 → 19 (todas);
    389 2 → 7; 325 2 → 7; 485 5 → 8; 410 1 → 3 (todas); 343 0 → 2; 184 4 → 5. Carencia: igual (lo que falta no
    tiene cita). La extracción nueva numeró las filas distinto en varias y muchas líneas no calzaban (`calce.py
    <ids>` compara página, fila y cultivo). **Con el «sí» de Cristóbal (25-10-2026: «reemplaza las líneas viejas…
    ocultas, no borradas») se reemplazaron** con `cargar.py --reemplazar` (lote `2026-10-25-6`) las 4 que mejoraban
    sin perder cultivos: **PUNTO 70 WP** 50 → 59 líneas, dosis 19 → 38, carencia 29 → 38; **ABAMECTIN 18 EC** dosis
    y carencia 46 → 55; **184** (Acrobat MZ) dosis 5 → 9; **325** (Basagran) dosis 7 → 12, carencia 12 → 17. Las 127
    líneas viejas quedaron `rechazado` (ocultas, `reviewed_by` = «recopilador: reemplazada por una lectura nueva»),
    no se borraron. Se pierde el método en varias (la lectura vieja lo sacaba del título del cuadro). No se
    reemplazaron: 163 (Duraznero quedaba sin líneas), 485 (perdía las 28 carencias), 370 (sin ganancia); siguen
    completadas. Comprobado en el sitio: la ficha de PUNTO 70 WP muestra solo las 59 nuevas. 185 (ACRONIS) y 416 (CALDO
    BORDELÉS VALLÉS) están en «diferencias»: no se rehicieron (`--completar` no aplica, el producto ya estaba).
  - **Syngenta:** 44 etiquetas (lotes `2026-10-25-2` a `-5`): 40 productos nuevos, 809 líneas, **dosis 94,1 %,
    carencia 90,4 %** (ALTO 100 SL, AMISTAR 50 WG, ASTERUS UNO, BANVEL 480 SL, BONTIMA, CAMIX, CELEST XL 035 FS
    COLOURLESS, CELEST 025 FS, CHAIRMAN, CHESS 50 WG, CRUISER 70 WS, DACONIL, DACONIL 500, DIVIDEND 030 FS,
    ELESTAL, FORCE 3 GR, FORTENZA, GRASP 250 SC, INSEGAR 25 WG, INSPIRE SUPER, KARATE ZEON 050 CS, MAINSPRING FLORA,
    NINJA, NIPACIDE P840 N, PAMONA, PICATINA FLORA, PLANET XTRA, REFLECT 125 EC, REVUS TOP, SOLVIT, STADIUM, STEREO,
    SUNJET FLORA, SWITCH PREMIUM, THIOVIT JET, TILT PLUS, TOUCHDOWN IQ 500, VANGARD 50 WG, VERTIMEC FLORA,
    VIBRANCE INTEGRAL); 3 diferencias (TILT 250 EC, CELEST XL 035 FS, SCORE BETA 475 EC: ya estaban); 1 no es
    etiqueta (1756 «Zenit 400 EC» es la resolución del SAG; la etiqueta de ZENIT, N° SAG 2493, no está en el listado).
  - Observado en los subagentes: el ícono de teléfono de las etiquetas Syngenta es un carácter privado (U+F028):
    citan el teléfono en dos fragmentos y pasa. «no se indica por la naturaleza de la aplicación» y «sin
    restricción» no cuentan como «no aplica» en el verificador (bien: no lo dicen). `recopilador_revision` ya tiene
    108 empresas nuevas (Syngenta con planta: «Syngenta S.A. (Monthey)»…): revisar con Cristóbal.
  - Uso: 5 h de 6 a 74 % y semanal de 1 a 10 % para 54 etiquetas (10 flojas + 44); 3 subagentes a la vez × 4
    etiquetas (220–350 mil tokens cada uno, ~4 % de la ventana cada uno). Unas 55–60 etiquetas por ventana y ~500
    por semana: con 1.371 en «texto» (parte son diferencias) faltan ~3 semanas.

Sesión 3 (22-10 en la noche y 23-10), para la historia:
- 51 etiquetas (44 nuevas + 7 diferencias: ACRONIS, AMISTAR TOP, 271, 290,
  416, 422, 401), lotes `2026-10-23-1` a `-5`, todas con Haiku, 2.206 líneas de 41 productos: dosis 84,8 %, carencia
  84,3 %. **PUNTO 70 WP** (último producto del plan de Cristóbal) quedó cargado pero flojo: 50 líneas, 12 con dosis y
  29 con carencia (el cuadro es escaneado, ver «No reintentar»). La primera tanda se cortó al cerrarse la app
  (22-10, 18:20): se relanzó el 23-10; los JSON que alcanzaron a quedar sirvieron.
- Arreglos de la sesión 3: OCR nuevo (`ocr.py`, a ~7.000 px y en mosaico; se releyeron las ~170 etiquetas escaneadas
  en «texto», ~310 páginas, sin IA; aparecieron 5 N° SAG nuevos y 5 versiones anteriores); el verificador acepta
  «O»/«lOO» del OCR como 0/100 y «no se consideran períodos de carencia» como «no aplica»; `textos.py` reconoce
  «Ficha con Datos de Seguridad (FDS)» (solo para lo que se procese desde ahora: en 229, 303, 422 y 423 las
  páginas de la FDS quedaron como etiqueta, sin efecto en las citas).
- **Inventario 409 sin cargar a propósito:** su cuadro de usos es una imagen dentro de una página con texto.
  Ya tiene la segunda lectura (`ocr.py --tesseract --forzar`) y vuelve a la cola. Cargarla sin usos la habría dejado
  así para siempre (`--completar` solo llena líneas existentes).
- Segunda lectura con Tesseract (23-10, después del cierre de la sesión 3): **hecha** en las 174 etiquetas
  escaneadas (319 páginas), en «texto» y ya cargadas, sin errores y sin cambiar estados. Las etiquetas escaneadas
  nuevas la reciben al pasar por `ocr.py` (la hace siempre que lee una página).
- Uso, sesión 3: 51 etiquetas = 5 h de 0 a 76 % y semanal de 80 a 91 %; tandas de 3 subagentes × 4 etiquetas
  (290–400 mil tokens cada uno) = ~15 % de la ventana de 5 h y ~2 % del semanal. Unas 60 etiquetas por ventana;
  el semanal alcanza para ~450 por semana: faltan ~3–4 semanas.

Sesión 2 (22-10-2026), para la historia:
- Cargadas: ANTRACOL 70 % WP y Alsystin 480 SC (piloto); lote `2026-10-22-1`: LUNA EXPERIENCE 400 SC, METALAXIL
  MZ 58 WP, MOSPILAN, MURALLA DELTA 190 OD, ABAMAX 1,8 % EC, PREVICUR ENERGY 840 SL, AZUFRE FLOABLE AN 600 y
  PUNTO 70 DS; lote `2026-10-22-2`: PUNTO 70 WG, RAYO 50 EC, BULLDOCK 125 SC, CITROLIV EMULSIBLE+, CITROLIV
  MISCIBLE, CONFIDOR 350 SC, Confidor Forte 200 SL y ZERO 5 EC; lote `2026-10-22-3`: PIRIMOR, BC-1000,
  GLADIADOR 450 WP, Impulso 25 SC, KASUMIN y ABAMECTIN 18 EC (todos Haiku). Del plan de Cristóbal solo falta
  **PUNTO 70 WP** (primero en la cola). AZUFRE 80 %, ENTONEM y CONDOR SHIELD no aparecen en el listado del SAG
  con ese nombre.
- Base: 175 productos (146 con N° SAG), 3.596 líneas; dosis 94,7 %, carencia 90,4 %; 34 MB. Sesión 2: 14
  etiquetas, 474 líneas; dosis 87 %, carencia 88,6 % (+ 28 «depende»: CITROLIV EMULSIBLE+). Flojas, para rehacer
  con `cargar.py --completar` (Sonnet): ABAMECTIN 18 EC (30 de 56 líneas sin dosis: se extrajo sin `p1.jpg`) y
  CITROLIV EMULSIBLE+ (inventario 485, OCR malo: 23 de 28 sin dosis). CITROLIV MISCIBLE quedó sin carencia (la
  cita no pasó el control). Imidacloprid ya tiene IRAC 4A (de una etiqueta); acetamiprid sigue sin grupo.
- Arreglos de la sesión 2: `lote.py` ya no frena por páginas en blanco (33 etiquetas destrabadas, entre ellas
  PIRIMOR y BC-1000); `ocr.py` gira las páginas escaneadas de lado (8 etiquetas: PUNTO 70 WP, CRUSADER, GOLDAZIM
  500 SC, DEGREE, RADICAL, DOMARK 40 EW, GIBGRO 10 LS, SPROUT NIP 3 EC); se hicieron los `p<N>.jpg` que faltaban
  en 29 documentos. En 5 PDF (inventario 1167, 1189, 1315, 1594, 1718) pypdfium2 ve menos páginas que pdftotext:
  no hay imagen ni recorte, el subagente solo tiene el texto.
- `recopilador_revision`: 223 objetivos, 47 cultivos, 25 empresas y 16 ingredientes nuevos (revisar con Cristóbal).
- Planilla de autorizados: 1.421; 257 sin etiqueta en el listado ni en la base (provisorio: baja a medida que la
  extracción lee el N° SAG). Listas en `sag/autorizados_sin_etiqueta.csv` y `sag/problemas.csv`.
- Uso: sesión 2 (nueva, contexto chico): 14 etiquetas con Haiku = ~24 % de la ventana de 5 h (57 → 81 %) y ~4 %
  del semanal (76 → 80 %); cada subagente de 3–4 etiquetas gastó 320–400 mil tokens. Unas 50 etiquetas por
  ventana de 5 h; el límite semanal deja ~250–350 por semana: la carga completa toma 4–6 semanas.
