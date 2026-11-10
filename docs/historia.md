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

## Recopilador: sesión 24 (10-11-2026, a pedido de Cristóbal: UPL sin esperar a Codex)

- ~12:40–~13:30, desde una sesión abierta por Cristóbal («haz tú los de Codex, me da igual si se repiten… sube todo lo que
  quede de UPL»). Uso al empezar: 5 h 0 %, semanal 33 %. Codex no tenía nada escrito sin cargar; ninguna de las 67 de UPL
  estaba reservada. Se reservaron todas para esta sesión y se repartieron con `--ids`.
- 16 subagentes Haiku (14 de 4 y 2 de 5; 3 a la vez): lotes `2026-11-10-24a` a `-24p`. 61 etiquetas: 59 cargadas y 2 con
  diferencias (180 ACRAMITE 480 SC, 183 ACRAMITE 50 WP); 1.430 líneas (1.303 con dosis, 1.387 con carencia, 1.130 con objetivo).
- Arreglos a mano antes de cargar (original como `<id>.antes.json`): 558 CRUSADER (dosis comparadas con la imagen; la unidad
  se cita como la lee el OCR, «9/100 L de agua»), 785, 866, 1072 y 564 (encabezado «g/100 L» agregado a la cita de la fila),
  446 («Arándanos»), 1684 UNIFILM 707 (su «cultivo» era «Mezclas con Insecticidas…»: se cargó sin líneas, como los otros
  coadyuvantes). Después de cargar, con `--agregar` (lote `-24agregar`): 1367 RELIK +3 líneas, 377 BIOZYME TF +2, 660 DOGMA +2.
- Sin cargar: 1327 RADICAL (escaneada; ni Tesseract lee dosis ni carencia: a `PROB`), 442 CARPOVIRUSINE ULTRA y 1495 STIK
  (cuadro como imagen; se les hizo `ocr.py --tesseract --forzar` y quedaron listas para releer). Sin leer por el tope de uso:
  869 HOOK, 1061 METRIPHAR 480 SC, 1591 THIOPRON 825 SC y 155 ABAMITE ME. 212 ALIADO y 1238 PODASTIK PLUS se releyeron en la
  misma sesión con la segunda lectura y se cargaron.
- Código: `verificar.py` acepta `"objetivos_de_fila"` (y las instrucciones lo piden para la celda de malezas compartida);
  `cargar.py --agregar`; `textos.py`: el cruce ya no pasa a «texto» una versión antigua cuando la más nueva está cargada (al
  correr `ocr.py` volvieron 181, 445 y 559: se devolvieron a «versión anterior») ni cambia el producto de una fila cargada;
  `lote_resto.py` ya no excluye UPL; `encargo_codex.md` le dice a Codex que no pida más.
- Inventario: en 14 etiquetas de la sesión el N° SAG del inventario se corrigió al de la etiqueta (p. ej. 1711 VERTICAL 2763
  → 2924, 444 CASORON 4G 2460 → 3668, 441 190 → 1903).
- Hallazgo (no corregido, pregunta para Cristóbal): `cargar.py` usa el N° SAG del inventario cuando el JSON no trae uno, y en
  algunas filas ese número estaba mal: «BIRD SHIELD» quedó con el 1880 de ACRAMITE 480 SC, y hay otros 6 productos que juntan
  etiquetas distintas (lista en «Preguntas abiertas» de CLAUDE.md).
- Sin control al azar (no tocaba). JSON repetidos de Codex: ninguno.
- Uso al terminar: 5 h ~88 %, semanal ~45 %.

## Recopilador: sesión 23 (10-11-2026, automática)

- ~10:10–~11:00. Sin etiquetas nuevas del SAG ni extracciones sin cargar. Uso al empezar: 5 h 0 %, semanal 28 %.
- Las 29 canceladas o sin planilla que quedaban (`lote_resto.py`, 6 subagentes Haiku de 4–5): lotes `2026-11-10-23a` a
  `-23g`. 1464 SIZER 70 WG con la nota «citar desde la segunda lectura»: 10 líneas, pero sin dosis (Tesseract lee «25»
  por «2,5»). 1488 STATUS DP: `ocr.py --tesseract --forzar` no agregó nada (ya tenía la segunda lectura y tampoco lee la
  dosis); se cargó sin dosis y quedó en `PROB`. 166 y 167 ACECLAN 70 WP (mismo N° SAG): se cargó primero 167 (con cuadro,
  37 líneas) y 166 (sin cuadro) quedó como diferencias. 284: «N.C.» sin leyenda, sin carencia (pregunta). 747 FLECHA 9.6 EC:
  568 líneas (herbicida con lista larga de cultivos).
- `lote_resto.py` excluía Sumitomo y FMC desde la sesión 18 y dejó fuera 15 etiquetas sin JSON (5 vigentes de productos que
  ya estaban y 10 canceladas de Sumitomo). Se reservaron a mano y se hicieron con 3 Haiku (lotes `-23h` a `-23j`): 11
  cargadas, 4 con diferencias. Ahora `EXCL` solo tiene UPL.
- Control al azar (Sonnet) de 30 líneas de la sesión: 29 bien; falta la dosis de papa de 167 (90–110 g/ha).
- Total: 44 etiquetas, 38 cargadas y 6 con diferencias, 944 líneas. Quedan 79 en «texto»: 67 de UPL (Codex) y 12 problema.
- Uso al terminar: 5 h ~32 %, semanal ~33 %.

## Recopilador: sesión 22 (09-11-2026, automática, con Cristóbal conectado)

~10:20–~12:30. Uso: 5 h de 2 a ~72 %, semanal de 0 a ~10 %. 100 etiquetas: 94 cargadas, 3 con diferencias, 3 no son etiqueta.

- Codex (UPL): 635, 645, 668, 992, 1006, 1029 (lote `2026-11-09-22codex`, 185 líneas).
- Haiku, canceladas o sin planilla (lotes `-22a` a `-22x`, 1.557 líneas): 1726, 1727, 1749, 248, 251, 266, 294, 296, 297, 318,
  332, 375, 603, 658, 672, 393, 394, 431, 562, 691, 696, 697, 783, 934, 959, 1005, 1036, 800, 810, 839, 933, 1251, 1366, 1410,
  1185, 1227, 1233, 1246, 1102, 1104, 1119, 1144, 1549, 1618, 1619, 1667, 1702, 1703, 1747, 1751, 1486, 398, 1637, 477, 624,
  585, 1139, 1241, 1305, 1350, 1638, 864, 925, 975, 1317, 1643, 316, 1112, 1430, 848, 1057, 931, 1085, 298, 916, 769, 1245,
  1580, 1659, 1027, 1330, 1007, 1195, 1476, 1489, 1490, 1492, 1581. Diferencias: 1033, 392, 1454. No son etiqueta: 169
  (embalaje de exportación), 1555 (tarifas del SAG), 728 (resolución).
- Arreglos antes de cargar: 1749 arándano sin mojamiento («entre 600 L», sin máximo); 1410 sin mojamiento (eran volúmenes de
  riego). 1486: la pág. 2 era imagen con 92 letras de capa; `ocr.py --forzar` y `--tesseract --forzar`, y se volvió a extraer.
- Apartadas: 602 DECCOAZOX (escaneo de lado, `602.girada.json`, en `PROB` de `lote_resto.py`); 1464 SIZER 70 WG (cuadro en
  imagen, `1464.sin_cuadro.json`; ya tiene la segunda lectura de Tesseract y se soltó la reserva).
- BASTA 14 SL (327): Cristóbal pidió revisarlo. El producto viene de la carga original: 18 líneas con confianza 0,74, sin N° SAG
  ni ingrediente, sin cerezo, vid, canola ni bordes, sin la dosis de desmanche (2 %), sin máximos ni mojamiento; las carencias
  que tiene calzan con la etiqueta. Extracción nueva con Sonnet y arreglos a mano (citas «0 días» de la lectura de Windows,
  cultivos de la fila 2 en vez de `cultivos_de_fila`, filas 1b/2b para el máximo de 2 aplicaciones). Ensayo de `--reemplazar`:
  18 → 40 líneas, carencia 17 → 39. Con el «sí» de Cristóbal se aplicó `--reemplazar` (lote `2026-11-09-basta`) y la
  migración `basta_registro_e_ingrediente` (N° SAG 3328 y glufosinato-amonio, que `--reemplazar` no llena). «Canola»
  quedó en el cultivo Raps.
- Control al azar (Sonnet, `sag/control/2026-11-09_1219_revision.json`): 21 de 30 sin observaciones; casi todo datos que
  faltan; 865 almendro con el intervalo de cerezo, 1607 objetivo «#», 1648 solo la dosis de suelo pesado.
- Ojo con `cultivos_de_fila`: si se separa una fila en dos con distintos cultivos, quitar esa clave (verificar.py la usa en vez
  de `cultivos`).

## Recopilador: sesión 21 (05-11-2026, automática)

~13:22–~13:40. Partió con el semanal en 89 % y llegó a 90 % con la primera tanda: no se lanzaron más subagentes.

- Codex (UPL): 153, 154, 1431, 1481, 1656, 1660 (lote `2026-11-05-21codex`, 489 líneas) y 214, 383 (`-21codex2`, 3 líneas).
- Haiku, canceladas o sin planilla: 1685, 1694, 1709, 1719 (`-21a`, 43 líneas); 1597, 1630, 1639, 1640 (`-21b`, 68); 1641, 1642, 1657, 1674 (`-21c`, 103).
- Avisos de los subagentes: 1709 VERPEZU AYR escribe el ingrediente «Florilpicoxamida» (copiado tal cual); 1719 VEXOR 500 SC trae HRAC «Grupo 29 L» (tal cual); 1597 carozos con carencia condicionada (7 días fresco, 14 deshidratado) y sin mojamiento; 1685 sin mojamiento (depende del equipo); 1641 fila 13b con dosis mezclada con observaciones en el texto.
- Sin control al azar: el siguiente toca con ~1.240 cargadas.

## Recopilador: sesión 20 (05-11-2026, automática)

~08:12–~08:35. Partió con el semanal en 87 % (subió 6 puntos desde la sesión 19 sin cargas del recopilador) y paró en 89 % para no pasar de 90 %.

- Codex: 20 etiquetas de UPL, 867 líneas (lote `2026-11-05-20codex`).
- Haiku: 16 canceladas o sin planilla, 347 líneas (lotes `2026-11-05-20a` a `-20d`): 1303, 1304, 1321, 1359, 1510, 1511, 1514, 1523, 1387, 1428, 1432, 1468, 1527, 1551, 1589, 1590.
- 1551 TAMENKILL quedó con 0 líneas: los 4 usos traían el cultivo con su paréntesis completo y `verificar.py` no lo encontró escrito así, porque en el cuadro está en varias líneas. El JSON sigue en `sag/extraido/1551.json`.
- Control al azar de la sesión 19: 19 de 30 sin observaciones (`sag/control/2026-11-05_0815_revision.json`).

## Recopilador: sesión 19 (04-11-2026, automática)

- ~13:20–~15:20. 94 etiquetas. Codex: 10 cargadas de UPL (531 líneas, lote `2026-11-04-19codex`) y 1686 no es etiqueta.
- Haiku (19 subagentes de 3–4 etiquetas, nunca más de 3 a la vez): las últimas 23 vigentes de productos que ya estaban
  (todas «diferencias»: solo documento y diferencias anotadas) y luego canceladas o sin planilla con `lote_resto.py --todas`:
  56 cargadas como producto nuevo (1.908 líneas), 4 más con diferencias. Lotes `2026-11-04-19a` a `-19v`.
- Ajustes antes de cargar: 206 AGROCOPPER SP, Anasac «distribuidor» (deducido) → «otro» (`206.antes.json`); 938 KALIGREEN
  TOP, fila 5 (tomate y otros): se quitó Botritis porque el subagente le puso la dosis del oídio (`938.antes.json`).
- 335 y 354: cuadro en imagen → `ocr.py --tesseract --forzar` y nueva extracción citando la segunda lectura (3 y 29 líneas).
- 673 DUOMAX 425 SC y 1123 NEMATON: pág. 1 de lado, OCR basura → `<id>.girada.json`, agregadas a `PROB` de `lote_resto.py`.
- Flojas: 889 IMIDACLOPRID 70 % WP Agrospec (OCR dañado, faltan carencias; solo diferencias), 479 (faltan dosis; diferencias),
  1050/1202/1665 (sin cuadro; diferencias), 334 (1 línea, fila 3 sin cultivo visible), 336 (cítricos «14.0000 ppm»),
  512 COBRE PREMIUM (carencia «no aplica» por «frutales recomendados», incluye vides y berries), 977 (2 intervalos quitados),
  1180 (berries sin carencia), 1178/1179 OXI-CUP (nota de mojamiento y máximo sin asignar).
- Sin control al azar (paró por uso con 1.106 cargadas). Uso: 5 h de 12 a 74 %, semanal de 73 a 81 %.

## Recopilador: sesión 18 (04-11-2026, automática)

~11:00–~13:00. 93 etiquetas vigentes de productos que ya estaban en el catálogo, con 24 subagentes Haiku de 4 (lotes
`2026-11-04-18a` a `-18x`): 91 quedaron «diferencias» (se agregó el documento del SAG y se anotaron las diferencias con
las líneas que ya estaban, sin tocarlas; entre ellas ACABAN 050 SC, inventario 161, versión 16-06-2025, 13 diferencias)
y 2 entraron como producto nuevo: 1130 NIMITZ 480 EC (3 líneas) y 714 (49 líneas, cuadro en imagen: `ocr.py --tesseract
--forzar` y otro encargo citando desde la segunda lectura). El filtro de la sesión 17 quedó como
`scripts/recopilador/lote_resto.py`. `lote.py --help` reservó 8 etiquetas por error (no tiene ayuda): se soltaron.
Sin control al azar (no hubo líneas nuevas que revisar). Uso: 5 h de 2 a ~80 %, semanal de 61 a ~72 %.
- Puntos a revisar cuando se comparen las diferencias: 1416 SCHOLAR 230 SC (arándano «350 - 1304 cc/100 L», posible
  error de la etiqueta), 1504 STREPTO PLUS (nogal «120» sin unidad), 811 GESAPRIM 90 WG («por corresponde» = no corresponde),
  1534 (carencia «para mercado local»), 1617 (vides «hasta 4» aplicaciones y máximo general 3).

## Recopilador: sesión 17 (03-11-2026, automática)

~15:30–~18:05. 76 etiquetas cargadas (68 de subagentes + 8 de Codex: 1025, 1169, 1296, 1302, 1375, 1473, 1516, 1531) y 16
con diferencias (productos que ya estaban: solo se agregó el documento), ~2.160 líneas, lotes `2026-11-03-17a` a `-17w`
(Haiku; `-17a`, `-17o`, `-17s` y `-17v` con Sonnet) y `2026-11-03-17codex`. Se acabaron las vigentes nuevas fuera de UPL
(que hace Codex): las últimas empresas chicas (Trical, ISK, Nutrien, Point, Anasac, Kimitec, Farmex, Nichino, Protecsa…).
Después se empezó con las vigentes de productos que ya estaban. Como `lote.py` no excluye empresas, se usó un script en el
scratchpad que filtraba `lote.cola()` sin UPL, Sumitomo y FMC ni las etiquetas problema conocidas y reservaba con
`lote.reservar`. Uso: 5 h de 2 a 79 %, semanal de 50 a 61 %.
- 776 y 1216 (pendientes de la sesión 16) cargadas con Sonnet desde la segunda lectura (18 y 35 líneas).
- Cuadros en imagen: 306, 1389, 1391, 1577, 314, 1651, 1652, 277, 368, 411, 432 → `<id>.sin_cuadro.json`, `ocr.py
  --tesseract --forzar` y Sonnet. Quedaron parciales: TRIFORM-30/35 (1651/1652) con 1 línea sin dosis (se quitó la fila
  «Generales», cultivo mal partido; originales en `<id>.antes.json`), 1577 TENSCAP sin dosis, 1389/1391 sin varias filas de
  malezas, 277 cereales sin dosis.
- 1243 POKER 240 EC: remolacha con 113 días y también «no corresponde» (igual que 761) → se quitó la carencia de remolacha
  del JSON antes de cargar (original en `1243.antes.json`).
- Control al azar de las sesiones 16 y 17 (`sag/control/2026-11-03_1755_revision.json`): 18 de 30 sin observaciones, 0
  valores que contradigan la etiqueta. Faltan: carencias de TAEX 3 (149, pino: «no es aplicable»), POWER 48 SL (1258,
  nogal 3 días), ROUNDUP AMONIO (1389, tangelo «no tiene carencia») y CREZYMAX (551, uva); dosis de TENSCAP (1577, rosal
  50 cc/hL) y PURE SPRAY 22 E (1313, peral); dosis sin unidad en PROBLAD (1278, manzano, L/ha) y POKER (1243, pecano, L/ha);
  máximos de 305 y 550; mojamiento de 1116; la dosis de suelos livianos de BASAMID (326).
- Flojas: 1636 (0 líneas), 901, 1365, 1673, 1208, 1210 (coadyuvante, feromonas y trampas sin cultivo: 0 líneas), 1605 (fila
  15 sin cultivo tras el salto de página), 903 (manzano: dos dosis asignadas por orden de la celda).

## Recopilador: sesión 16 (03-11-2026, automática)

~13:15–~14:15. 100 etiquetas cargadas + 1 que no es etiqueta (1254, pliego de imprenta de POMARSOL), ~2.500 líneas,
lotes `2026-11-03-16a` a `-16zc` (Haiku; `-16x` con Sonnet). Empresas: Albaugh (las 8 que quedaban), Protección de
Madera, Monsanto, Nutrien, ISK, Kerley, Comercial KPC, Trical, Urrejola, TotalEnergies, Quimetal, New Tech Agro,
Agrium, Clariant, Eastman, Pilarquim, Keytox, Gastón Toledo, Díaz y García, BTS Intrade, Biogram, Newpat, YPF,
Mitsui, Agria, AQL, Innoprint, CS Asesorías, Marketing Arm, Citrex, Agroenzymas y Agroconnexion.
Uso: 5 h de 2 a ~76 %, semanal de 40 a ~50 %.
- Control al azar de la sesión 15 (`sag/control/2026-11-03_1015_revision.json`): 14 de 30 sin observaciones, 0 valores
  que contradigan la etiqueta; faltan máximos (7), mojamientos (3), objetivos (3), 2 carencias, 2 intervalos. Dudoso:
  HARVISTA 1,3 SC (855) peral con máx. 1 aplicación que la etiqueta no dice; MAGISTER 20 SC (1009) pomelo y tangerina
  con dosis sin unidad (cc/100 L); CAVALIER 240 EC (447) sin carencia y la etiqueta dice que no corresponde.
- Cuadros imagen: 1632 y 1650 → Tesseract y nueva extracción (1650 quedó con 1 línea: el cuadro sigue sin cifras
  citables). 474 (pág. 1 sin OCR) → `ocr.py --forzar` + Tesseract y cargada (7 líneas). 976 y 171 (Agrospec): Haiku
  dejó la mitad de los cuadros → Sonnet (76 y 72 líneas). **Sin cargar, para la próxima sesión: 776 y 1216**
  (cultivos solo en la imagen; ya tienen la segunda lectura de Tesseract; JSON parcial como `<id>.sin_cuadro.json`).
- Flojas: 1650 TRIFORM-15 (1 línea), 1446 (coadyuvante sin cultivos, 0 líneas), 1443/1742/1744/1602/1603/1134–1136
  (preservantes de madera, 0–1 línea), 600/601/1384 y 898 (raticidas y coadyuvante, 0 líneas), 984 y 1538
  (coadyuvantes, 2 líneas; 1538 tiene marca de agua «BORRADOR»), 339 (avena sin dosis), 1390 ROUNDUP CONTROLMAX
  (491 líneas: 35 cultivos × grupos de malezas) y 1218 (468 líneas, mismo caso), 1456 (carencia 120 días en el cuadro
  y «60 días» en una nota: se cargó 120), 382 (carencia 0 días y «hasta 14 días antes de la cosecha»), 1522 (perales y
  nogales con dos dosis apiladas: solo quedó la primera).

## Recopilador: sesión 15 (02-11-2026, automática)

- ~13:20–~14:15 (hora de Chile). Uso al empezar: 5 h 2 %, semanal 27 %; al terminar: 5 h ~77 %, semanal ~37 % (se dejó
  de lanzar subagentes al llegar a 75 %). Sin etiquetas nuevas del SAG ni JSON pendientes.
- **95 etiquetas cargadas + 1 con diferencias (569, su N° SAG ya estaba), 1.942 líneas**, todas de Haiku (lotes
  `2026-11-02-15a` a `-15z`). **Degesch, Gowan, AgroFresh, Makhteshim Agan, Summit Agro y Oscar Ham terminadas**;
  además ADAMA (8 nuevas), KPC, Agria, Manejo Integrado de Plagas, Pilarquim, Protección de Madera, CSR Consulting y
  Agroconnexion (4). Productos 917 → 1.012.
- Segunda lectura (Tesseract) para 986 LINUREX, 1648, 425 CAPSILUS, 569 y 194 ACUTE (cuadro en imagen o texto revuelto);
  se dieron de nuevo con una nota y salieron bien (569 sin las 15 filas del cuadro aéreo).
- Arreglos antes de cargar (JSON original en `<id>.antes.json`): 765 FORTUNA GLOBO, se quitó la carencia de pepino dulce
  (la etiqueta lo pone en las listas de 5 y de 7 días); 1277 PRIVENT, sin carencia en las filas 6 y 7 (tizones: la
  etiqueta da 4/7/14 días foliar y 21 para lo demás, y esas filas no dicen el método).
- 1465 y 1467 (AgroFresh, 1-MCP): carencia «no aplica» con la cita «no permite encontrar residuos detectables» (está bajo
  «Periodo de Carencia»).
- **Control al azar** (30 líneas de la sesión 14, `sag/control/2026-11-02_1405_revision.json`, Sonnet): 20 sin
  observaciones; 3 valores que no calzan (825 GLIFOSATO 75,7 % SG objetivo «#»; 1579 TERBUTILAZINA 75 DF nogal con
  «Siete venas» y «Chinilla», que son de la fila de avellano; 1154 NUZOLE granado, dosis «60» sin unidad: es cc/100 L);
  el resto, datos que faltan (dosis y carencias de 941 KANEMITE, 834, 1201, 922, 669, 1154, 365).
- Flojas: 631 y 632 (raticidas, 0 líneas); 1171, 1297, 1691, 1741, 1743, 1004 (preservantes de madera, 0 líneas) y 1209,
  1211 (trampas de feromona, 0 líneas); 523 (unidad «Uha» tal cual en el texto, es L/ha en la imagen); 698 («Uha» leído
  como L/ha); 569 (falta el cuadro aéreo); 986 (14 filas sin dosis: cifras solo en la imagen); 1567 (2 dosis solo en la
  imagen); 1648 (achicoria y trigo sin dosis).

## Recopilador: sesión 14 (02-11-2026, automática)

- ~08:00–~08:50 (hora de Chile). Uso al empezar: 5 h 2 %, semanal 14 %; al terminar: 5 h 86 %, semanal 26 % (se dejó de
  lanzar subagentes al pasar 78 %). Sin etiquetas nuevas del SAG ni JSON pendientes (tampoco de Codex).
- **72 etiquetas, 1.993 líneas**, todas de Haiku (lotes `2026-11-02-14a` a `-14q`): **Solchem, Arysta, Acres y Sipcam
  terminadas**; 3 de Degesch (629, 1012, 1013). Productos 845 → 917.
- Al empezar, un `lote.py --help` (no tiene ayuda: arma un lote) reservó 8 etiquetas; se liberaron a mano en
  `sag/reservas.json`. No usar `--help` con `lote.py`.
- **Control al azar** (30 líneas de la sesión 13, `sag/control/2026-11-02_0834_revision.json`, Sonnet): 21 sin
  observaciones, 0 valores que contradigan la etiqueta; faltan datos (4 intervalos, 1 carencia de manzano en 761, 1
  máximo, 1 mojamiento, 1 dosis en 883 IMAXI duraznero) y un objetivo mal escrito («Hualcho» por «Hualcacho», 535).
- Arreglos antes de cargar (JSON original en `<id>.antes.json`): 1154 y 922, se quitó la carencia de las líneas de
  postcosecha (la etiqueta la da para el uso en campo); 1320, Almendros separado de las filas 8 y 9 sin el mojamiento
  «Manzano, Peral y Carozos» (almendro no aparece ahí).
- Flojas: 951 KATHON 886 F (0 líneas, preservante de madera); 1010 MAGNACIDE H (sin dosis numérica, remite al manual);
  1000 (1 línea, «de 6 a 3 semanas»); 1306 PUGIL 50 SC (ajo: observación 7 días y carencia 5); 629 DETIA GAS (nueces:
  5 días en el cuadro y 120 horas en la nota); 1012 (filas 7 y 8 con dosis «2,3» sin unidad en la celda); 507 (páginas
  2 y 3 leídas de la imagen).

## Recopilador: sesión 13 (01-11-2026, automática)

- ~12:30–~17:55 (hora de Chile; la ventana de 5 h se renovó a mitad de la sesión). Uso al empezar: 5 h 4 %, semanal 2 %
  (recién renovado); al terminar: 5 h 32 %, semanal 14 %. Sin etiquetas nuevas del SAG.
- **56 etiquetas, 5.422 líneas**: 1 de Codex (1020, lote `2026-11-01-13codex`) y 55 de Haiku (lotes `2026-11-01-13a`
  a `-13n`). **Point terminada** (salvo 509, apartada por la página marcada como HDS) y **Albaugh terminada**.
  Un subagente se colgó (sin escribir nada) y sus 4 etiquetas se dieron de nuevo.
- **Control al azar** (30 líneas de la sesión 10, `sag/control/2026-11-01_1234_revision.json`, Sonnet): 16 sin
  observaciones, 0 valores que contradigan la etiqueta; faltan datos (9 mojamientos, 3 objetivos, 2 dosis, 2 carencias,
  1 máximo).
- Arreglos antes de cargar (JSON original en `sag/<id>.antes.json`): 643, se quitó Pimentón de la carencia escrita para
  «Pimiento»; 761, Remolacha sin carencia (la etiqueta dice 113 días y también «no corresponde»: pregunta); 861, la
  celda de malezas común del cuadro se copió a todas las filas (el subagente usó un campo `objetivos_de_fila` que el
  verificador no conoce); 884, 888, 973 y 1386, mojamientos e intervalos «mínimo X» quedaron sin máximo (Haiku ponía
  máx. = mín.); 1386 fila 1, mojamiento «En 400 L de agua» quitado (no dice por hectárea).
- Flojas: 832 GLYRUK SL y 873 HUMEASIL (0 líneas: cuadro sin cultivos o coadyuvante); 176 ACIGIB 4 % SL (falta el cuadro
  de uva de mesa); 470 (bolsa «2530 kg» en la capa de texto, «25-30 kg» en la imagen); 1621 (N° SAG «3.1 64» con
  espacio); 1401 RUKARB (el frente dice 50 WP y el resto 85 WP); 1351 y 888 (dos dosis de una celda separadas por
  posición); 1386 (fila de tomate emparejada con la imagen).

## Recopilador: sesión 12 (30-10-2026, automática)

- ~07:20–~08:30 (hora de Chile). Uso al empezar: 5 h 2 %, semanal 89 %; al terminar: 5 h 11 %, semanal 91 % (se paró
  por el límite semanal; se renueva el 31-10 a las 12:00). Sin etiquetas nuevas del SAG.
- Codex: 4 cargadas (1235, 1237, 1239, 1262; lote `2026-10-30-12codex`): con eso van 20. 1237 quedó con 0 líneas.
- **Control al azar de Codex** (30 líneas de sus lotes, `sag/control/2026-10-30_0804_revision.json`, Sonnet): 22 sin
  observaciones, 0 valores que contradigan la etiqueta; faltan datos (6 mojamientos, 3 intervalos, 2 máximos, 1 método).
  Codex puede seguir cargándose.
- **11 etiquetas** (7 de Haiku de Point, lotes `2026-10-30-12a` y `-12b`, y 4 de Codex), 482 líneas. Point: quedan 20
  (509 sigue apartada por la página marcada como HDS).
- Para revisar: 1542, dosis de tomate «(8-10 g/10 L)» que no calza con 75–100 g/hL; 157 y 1542, carencia escrita para
  «Vides» asignada a las filas de uva; 157 fila 7, celda de cultivos ambigua; 790, máximos por temporada sacados del
  «Modo de aplicación» (fila 3).

## Recopilador: sesión 11 (29-10-2026, automática)

- 13:22–~14:00 (hora de Chile). Uso al empezar: 5 h 2 %, semanal 85 %; al terminar: 5 h 28 %, semanal 89 % (se paró por
  el límite semanal; se renueva el 31-10 a las 12:00). Sin etiquetas nuevas del SAG.
- Codex: 5 cargadas (649, 1019, 1026, 1028, 1133; lote `2026-10-29-11codex`): van 16 de las 20 antes de su control. 1133
  quedó con 1 línea.
- **34 etiquetas** (29 de Haiku, lotes `2026-10-29-11a` a `-11h`, y 5 de Codex), 1.417 líneas, todas de productos nuevos.
  **FMC terminada**; **Point empezada** (3; quedan 27). 8 tandas de Haiku (máx. 3 a la vez).
- Apartadas sin cargar (`<id>.pagina_hds.json`): 532 y 1692 VALIS M (FMC) y 509 Clorotalonil 720 SC (Point): `textos.py`
  marcó como HDS páginas que son de la etiqueta (la pág. 1 con el producto y, en 532, las instrucciones de uso), así que
  el subagente no tuvo N° SAG, ingredientes ni el cuadro. Igual que 932 JANUS: falta corregir la clasificación.
- Correcciones antes de cargar (JSON original como `<id>.original.json`): 590 DAGGER 50 % WP: quitada la «carencia» de
  1 día con cultivos «*» (la etiqueta habla de un «período de resguardo» en post-cosecha, no de carencia, y con «*» se
  aplicaba a todos los cultivos). 504 y 590: ligaduras «ﬂ»/«ﬁ» cambiadas por «fl»/«fi» (si no, se creaba el cultivo
  «Coliﬂor» aparte).
- Para revisar: 1395 (FMC) dice «Almendro: 132 días» de carencia en la capa de texto del PDF (se cargó tal cual); 1762
  ZORO, carencia escrita para «nuez» asignada a Nogal; 1737 WARRANT, riego 1 L/ha asignado a las 3 plagas de tomate.
- Flojas: 1133 (1 línea), 1354 (2), 1610 TOPGUARD (3), 1725 VINCIT FLO (1 uso, semilla), 755 (filas en cc/ha y L/ha sin
  cargar), 1398, 1399 y 1400 (dosis sin unidad en varias filas).

## Recopilador: sesión 10 (29-10-2026, automática)

- 07:57–~09:05 (hora de Chile). Uso al empezar: 5 h 1 %, semanal 74 %. El candado de `turno.py` venía de la **sesión 9**
  (28-10, 13:21): esa sesión cargó 43 etiquetas (Sumitomo casi entera, lote `2026-10-28-9…`), hizo el control al azar de
  la sesión 8 (`sag/control/2026-10-28_1323_revision.json`) y se cortó a las ~13:46 sin soltar el turno, sin commit, sin
  actualizar CLAUDE.md y sin correo (lo más probable: límite de uso). Esta sesión cargó lo que dejó escrito (1763, 1764).
- Control de la sesión 9 (30 líneas de la sesión 8): 14 sin observaciones. Casi todo son datos que faltan (carencias
  «no corresponde» de CLETODIM 240 EC 498, dosis de GLIFOSPEC 48% SL 826, máximos e intervalos). **Valores dudosos:**
  KNOCKOUT (964) kiwi, mojamiento 1.500–2.000 en la base y 1.500–2.500 en la etiqueta; MCPA 750 SL (1043) con un objetivo
  «#»; AGRITOX 750 (204) arroz con método «Aplicación terrestre» que la etiqueta no dice para arroz. No se corrigen sin el
  «sí» de Cristóbal.
- Codex: 5 cargadas (722, 736, 746, 786, 970; lote `2026-10-29-10codex`): van 11 de las 20 antes de su control.
- Sumitomo: quedaban 3 (464 CHAMP DP WG, 648 DiTera WG, 817 GIBGRO 10LS). Un Sonnet tampoco las pudo leer: la pág. 1 está de
  lado y las dos lecturas son basura. Quedan como `<id>.sin_cuadro.json` y `<id>.sin_cuadro2.json` (`lote.py` las vuelve a
  ofrecer): hace falta que `ocr.py` pruebe el otro giro (90° y 270°).
- **80 etiquetas** (75 de Haiku/Sonnet, lotes `2026-10-29-10a` a `-10t`, y 5 de Codex), 1.612 líneas, todas de productos
  nuevos. **Corteva terminada** (35), **ADAMA (Makhteshim Agan) terminada** (38), **FMC empezada** (8; quedan 27). 21 tandas
  de Haiku (máx. 3 a la vez) y 2 de Sonnet (Sumitomo y el control). Uso al terminar: 5 h 71 %, semanal 83 %.
- Correcciones antes de cargar (JSON original como `<id>.original.json`): 286 y 287 AVAUNT: quitado el intervalo «Frutales:
  18 días» de vid, arándano y avellano (la etiqueta no dice si van dentro de «Frutales»). Cuadros imagen resueltos con la segunda lectura de Tesseract (`ocr.py --tesseract --forzar`) y otra
  tanda: 799 GALIGAN, 831 GLYPHOGAN, 1163/1164 ORIUS, 638/639 (diazinon), 1449, 1679 TYLLANEX, 280, 966 (1679 además con
  `--rehacer`: su OCR estaba vacío).
- Control al azar (30 líneas de la sesión 8, `sag/control/2026-10-29_0848_revision.json`): 20 sin observaciones, **0 valores
  que contradigan la etiqueta**; faltan dosis (6: IMIDACLOPRID 70% WP coliflor, POLISULFURO peral, VERTICE postcosecha,
  ESPIRODICLOFEN berros, GLIFOSPEC PLUS por maleza), carencias (CLETODIM nogal y GLIFOSPEC PLUS «no corresponde», IPRODION
  arándano 1 día, CLORANTRANILIPROL repollo 3 días), 1 intervalo, 2 objetivos y 1 método.
- Flojas: 197 (0 líneas tras la verificación), 1708 VERPEZU SC (0 líneas), 639 (sin las filas de riego ni las de L/ha),
  1163/1164 ORIUS (cereales y uva sin dosis), 1107 (2 filas sin dosis), 1736 VYDATE L (carencias «NC» sin leyenda), 288 AVENUE
  (máximo: «no más de dos» en el texto y «hasta 3» en el cuadro; se cargó 3), 831 GLYPHOGAN (dosis con base «otro»).

## Recopilador: sesión 8 (28-10-2026, automática)

- 07:32–~08:35. Uso al empezar: 5 h 2 %, semanal 53 %. Nada nuevo en el listado del SAG. Codex: 2 cargadas (426, 568;
  lote `2026-10-28-8codex`): van 6 de las 20 antes de su control.
- Control al azar (30 líneas de la sesión 7, `sag/control/2026-10-28_0734_revision.json`): 21 sin observaciones, 0 valores
  que contradigan la etiqueta. Faltan datos: carencia «no corresponde» (ALION 218 manzano, ESPLANADE 709 pino, BACARA FORTE
  312 triticale), máximo (218 y APACHE PLUS 252 ajo), mojamiento (MELYRA 1046 y BELT 342 cerezo) y métodos. **Método escrito
  sin respaldo:** «Aplicación terrestre» en ALION 500 SC (manzano y bordes de camino) y ESPLANADE 500 SC (pino): se le
  pregunta a Cristóbal si se vacía.
- 28 tandas de Haiku (máx. 3 a la vez, 3–4 etiquetas) y 1 de Sonnet (860 HERBADOX: 9 usos, 5 con dosis). **111
  etiquetas** (lotes `2026-10-28-8a` a `-8za`): 109 productos nuevos y 2 «diferencias» (327 BASTA 14 SL y 829 GLIFOSPEC 75%
  SG PLUS: su N° SAG ya estaba). BASF terminada, Agrospec terminada, Sumitomo empezada (quedan 28). 739 FASTAC cargada con la
  segunda lectura de Tesseract. Uso al terminar: 5 h ~72 %, semanal ~62 %.
- Correcciones antes de cargar (JSON original como `<id>.original.json`): 1271 PRIAXOR: quitadas las dosis de Papas y Trigo
  aéreo (citaban la cifra de otra fila); 1461 SITOFEX: quitada la carencia de Red Globe (la etiqueta dice «38 días en vides»
  y no rotula Red Globe como vid); 918: quitado el mojamiento de Maravilla (tomado por cercanía); 971: quitado el método de
  Ajo; 1247 POLISULFURO: quitadas las dosis de Cerezo y Duraznero/Nectarino (el subagente dudó de qué dosis va con qué
  objetivo); 751: quitada la dosis de Pino/Eucalipto (ambigua) y la fila «Porotillo»; 1176 OVERKILL: quitado el mojamiento
  de Raps/Trigo (60 en el texto, 200 en la imagen); 498 CLETODIM: quitado el cuadro aéreo (cultivos por fila no claros);
  826 GLIFOSPEC 48% SL: quitadas todas las dosis (no se sabe qué dosis va con qué maleza).
- Apartada: **464 CHAMP DP WG** (`464.sin_cuadro.json`): la pág. 1 está escaneada de lado y el OCR quedó en basura (giro 0):
  repetir el OCR girado.
- Flojas: 828/829/830 GLIFOSPEC y 1382 RIPPER MAX (escaneos; muchas dosis solo en la imagen), 1148 NUMEK (faltan vides,
  cítricos, berries, remolacha, pimiento y aéreos), 1176 (pág. 3, cuadro aéreo, sin extraer), 1452 SIMAZINA (bloque de frutales
  sin cargar), 640 y 940 (cuadros desordenados, carencias por imagen), 647 (dosis de cereales), 1699 (carencias de berries).

## Recopilador: sesión 7 (27-10-2026, automática)

- 12:57–~14:00. Uso al empezar: 5 h 2 %, semanal 40 % (las sesiones de 19:20, 01:20 y 07:20 no corrieron: no hay
  commits ni avisos entre la 6 y esta). 21 tandas de Haiku (máx. 3 a la vez, 4 etiquetas, 190–285 mil tokens cada
  una). **81 etiquetas** (lotes `2026-10-27-7a` a `-7u`): 80 productos nuevos y 1 «diferencias» (516 COMET, ya estaba);
  798 líneas. Bayer terminada (salvo 932) y 25 de BASF. Nada nuevo en el listado del SAG; nada de Codex sin cargar.
  Uso al terminar: 5 h ~75 %, semanal ~50 % (~1,2 % semanal cada 10 etiquetas). Sin control al azar (91 desde el
  último; toca en la próxima).
- Correcciones antes de cargar (JSON original como `<id>.original.txt`): 1698 VAYEGO papa: quitado el intervalo
  «7–21» (la etiqueta da dos intervalos según la presión, 7–14 y 14–21; el subagente los juntó); 936: quitado el
  máximo 2 de la fila Trigo/Cebada/Triticale/Centeno (la etiqueta dice máximo 1 en cebada).
- Apartadas: **932 JANUS 480 FS** (`932.pagina_hds.json`): el cuadro está en la pág. 19 y `textos.py` la marcó como HDS
  (está entre páginas de etiqueta; el PDF trae la HDS delante); hace falta reclasificarla. **739 FASTAC 100 EC**
  (cuadro en imagen, 0 usos) → `.sin_cuadro.json` y segunda lectura de Tesseract hecha (3 páginas). **860 HERBADOX 45
  CS** (2 de ~17 filas: cuadros de las págs. 2 y 3 ilegibles) → `.sin_cuadro.json`; `ocr.py --tesseract --forzar` no
  leyó ninguna página (tienen capa de texto): falta otra lectura (Sonnet con las imágenes).
- Flojas: 900 (coadyuvante, cuadro sin cultivo: 0 líneas); 516 COMET, 1729 VIVARUS, 358 BETRATON y 1066 MIBELYA con
  dosis que solo están en la imagen (sin dosis en algunas filas); 530 y 636 (concentración por ingrediente dudosa por
  OCR); 1415 SCENIC (concentraciones sin confirmar con la imagen).

## Recopilador: sesión 6 (26-10-2026, primera sesión automática)

- 13:20–14:20. Uso al empezar: 5 h 1 %, semanal 25 %. 26 tandas de Haiku (máx. 3 a la vez, 4 etiquetas cada una,
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
