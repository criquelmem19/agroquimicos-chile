"""Mapa de carencias leído etiqueta por etiqueta (Fase 2, extractor «carencia-fase2-v1»).

Cada documento (prefijo de su id en `documents`) tiene reglas. Una regla dice:
  - a qué cultivos aplica (nombres exactos de la tabla `crops`; "*" = todos los del documento),
  - el valor: días (int) o "NA" (la etiqueta dice que no corresponde / no aplica),
  - la cita literal de la etiqueta (se comprueba que exista tal cual en la página),
  - opcionalmente un encabezado (otra parte literal de la misma página, se une con « … »),
  - opcionalmente una condición sobre el texto de la línea de uso, para usos distintos de un
    mismo cultivo (ej. follaje vs riego, desecante vs control de malezas).
Condición: "campo:regex" o lista de ellas (basta que una calce). Campos: metodo, momento,
fuente (texto leído de la etiqueta), obs, dosis, fila (source_table_row), texto (todos),
dosis_sm (la dosis, solo si la línea no tiene método).
Si a una línea le calzan reglas con distinto valor, gana la de mayor prioridad (las que tienen
condición valen más); si aun así hay empate con valores distintos, la línea queda sin carencia
(conflicto). Lo que la etiqueta no dice, no se llena.
"""

MAPA = {}


def R(cultivos, valor, cita, enc=None, cond=None, pag=None, prioridad=None, nota=None, corregida=None):
    """corregida: para etiquetas escaneadas, el texto real revisado a ojo contra la imagen cuando el OCR
    leyó mal una letra (ej. «O días» → «0 días»). Se verifica `cita` (lo que leyó el OCR) y se guarda `corregida`."""
    return dict(cultivos=cultivos, valor=valor, cita=cita, enc=enc, cond=cond, pag=pag, nota=nota, corregida=corregida,
                prioridad=(prioridad if prioridad is not None else (1 if cond else 0)))


def doc(prefijo, producto, pagina, reglas, enc=None, notas=None, extractor="carencia-fase2-v1"):
    """extractor: versión con que se cargan las reglas de este documento (los lotes nuevos usan una propia)."""
    MAPA[prefijo] = dict(producto=producto, pagina=pagina, reglas=reglas, enc=enc or {}, notas=notas, extractor=extractor)


CARENCIA_DIAS = "Período de carencia (días recomendados de espera entre la última aplicación y la cosecha):"

# ---------------------------------------------------------------------------------------------
doc("fa6b5056", "ACTARA 25 WG", 3, enc={
    "F": "Período de carencia para mercado local: (días de espera recomendados entre la última aplicación y la cosecha y solo aplicable para tratamientos al follaje):",
    "R": "Período de carencias para mercado local para aplicaciones vía riego:",
}, notas="Follaje y vía riego tienen listas distintas. Al suelo y en bandejas: la etiqueta no da carencia.",
    reglas=[
    R(["Granado"], 70, "granado (70 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Limonero", "Mandarino", "Naranjo", "Pomelo"], 32, "cítricos (32 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Maíz", "Lupino"], 30, "maíz, lupino (30 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Olivo", "Avellano Europeo"], 28, "olivo, avellana europea (28 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Manzano", "Peral"], 21, "pomáceas (21 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Duraznero", "Nectarino", "Ciruelo", "Cerezo", "Damasco", "Almendro", "Vid", "Palto", "Tabaco", "Frejol", "Lenteja", "Soya", "Espárrago"], 14,
      "frutas de carozo, uvas, paltas, tabaco, poroto (excepto granado), lenteja, soya y espárrago (14 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Mora", "Frambuesa"], 10, "mora y frambuesa(10 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Alcachofa", "Apio", "Lechuga", "Arándano", "Col forrajera"], 7, "alcachofa, apio, lechuga, crucíferas y arándanos (7 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Ají", "Ajo", "Berenjena", "Pimiento", "Tomate"], 3, "ají, ajo, berenjena, pimiento y tomate (3 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Frutilla"], 1, "frutilla (1día)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Papa", "Repollo", "Coliflor", "Brócoli", "Repollito de Bruselas"], 0, "papas, repollo, coliflor, brócoli y repollito de bruselas (0 días)", "F", ["metodo:follaje", "dosis_sm:100 ?L|hL"]),
    R(["Duraznero", "Nectarino", "Ciruelo", "Cerezo", "Damasco", "Almendro", "Manzano", "Peral", "Vid"], 21, "frutas de carozo, pomáceas y vides (21 días)", "R", "metodo:riego"),
    R(["Palto"], 60, "paltos (60 días)", "R", "metodo:riego"),
    R(["Tomate", "Pimiento", "Ají", "Berenjena", "Apio", "Alcachofa"], 7, "tomate, pimiento, ají, berenjena, apio, alcachofa (7 días)", "R", "metodo:riego"),
    R(["Repollo", "Coliflor", "Brócoli", "Repollito de Bruselas"], 0, "repollo, coliflor, brócoli y repollito de bruselas (0 días). Para cultivos de exportación", "R", "metodo:riego"),
])

doc("c2e63901", "TOUCHDOWN IQ 500 SL", 1, enc={"C": CARENCIA_DIAS},
    notas="Los cultivos anuales figuran en el cuadro como «Pre-siembra y pre-emergencia»: no corresponde carencia.",
    reglas=[
    R(["Manzano", "Peral", "Membrillero", "Clementina", "Limonero", "Mandarino", "Naranjo", "Pomelo", "Tangelo", "Tangerina", "Nogal",
       "Almendro", "Cerezo", "Ciruelo", "Damasco", "Duraznero", "Guindo", "Nectarino", "Arándano", "Frambuesa", "Frutilla", "Mora", "Kiwi",
       "Baby Kiwi", "Chirimoyo", "Granado", "Higo", "Avellano Europeo", "Caqui", "Papayo", "Olivo", "Palto", "Pecano"], 7,
      "manzana, pera, membrillo, clementina, limonero, mandarino, naranjo, pomelo, tangelo, tangerina, nogal, almendro, cerezo, ciruelo, damasco, duraznero, guindo, nectarino, arándano, frambuesa, frutilla, mora, kiwi, baby kiwi, chirimoyo, granado, higo, avellano, caqui, papayo, olivo, palto, pecano, pistacho, mango, vides (7)", "C"),
    R(["Trigo", "Cebada", "Centeno", "Triticale", "Garbanzo", "Frejol", "Lenteja", "Lupino", "Maíz", "Maravilla", "Papa", "Remolacha", "Sorgo", "Soya"], "NA",
      "Los cultivos aplicados en presiembra, preemergencia y forestales no corresponde indicar carencia debido a la naturaleza de la aplicación.",
      nota="En el cuadro de usos este cultivo figura en «Pre-siembra y pre-emergencia de cultivos como: - Avena, Trigo, Cebada, Centeno, Triticale, Garbanzo, Frejol, Lenteja, Lupino, Maíz, Maravilla, Papa, Remolacha, Sorgo, Soya» (pág. 1)."),
])

doc("b3731587", "KARATE CON TECNOLOGIA ZEON", 2, enc={"C": "Período de carencia: La carencia para los cultivos recomendados es de:"},
    notas="Vid aparece solo como «Vides»: la carencia distingue vinífera/pisquera (4) de mesa (21), queda sin dato.",
    reglas=[
    R(["Remolacha", "Achicoria Industrial", "Praderas", "Alfalfa", "Lotera", "Vicia", "Trébol", "Ballica", "Pasto ovillo", "Bromo", "Festuca", "Betarraga", "Lechuga"], 1,
      "1 día para remolacha, achicoria industrial, praderas o empastadas (alfalfa, lotera, vicia, trébol, ballica, pasto ovillo, pasto miel, bromo, festuca, avena), betarraga y lechuga", "C"),
    R(["Avena"], 1, "1 día para remolacha, achicoria industrial, praderas o empastadas (alfalfa, lotera, vicia, trébol, ballica, pasto ovillo, pasto miel, bromo, festuca, avena), betarraga y lechuga", "C", "fuente:^Praderas"),
    R(["Brócoli", "Coliflor", "Repollo", "Arándano", "Frambuesa", "Frutilla", "Mora"], 3, "3 días para crucíferas (brócoli, coliflor, repollo), berries (arándano, frambuesa, frutilla y mora)", "C"),
    R(["Melón", "Sandía", "Pepino", "Zapallo", "Tomate", "Pimiento"], 5, "5 días para cucurbitáceas (melón, sandía, pepino, zapallo), tomate y pimiento", "C"),
    R(["Almendro", "Raps", "Papa"], 7, "7 días para almendro, raps o canola, y papas", "C"),
    R(["Manzano", "Membrillero", "Peral", "Duraznero", "Damasco", "Cerezo", "Guindo", "Ciruelo", "Nectarino"], 4,
      "4 días para frutos pomáceos (manzana, membrillo, pera), frutos de carozo (durazno, damasco, cereza, guinda, ciruela, nectarino), vides (vinífera y pisquera)", "C"),
    R(["Espinaca", "Acelga"], 10, "10 días para espinaca y acelga", "C"),
    R(["Nogal", "Palto", "Cebolla", "Ajo", "Alcachofa", "Apio", "Rúcula", "Zanahoria"], 14, "14 días para nueces, paltas, cebolla, ajo, alcachofa, apio, rúcula y zanahoria", "C"),
    R(["Maíz", "Repollito de Bruselas", "Arveja", "Haba", "Lenteja", "Frejol", "Soya"], 21, "21 días para maíz, repollito de bruselas y leguminosas (arveja, haba, lenteja, poroto, soya) y vid de mesa", "C"),
    R(["Cebada", "Centeno", "Trigo", "Triticale", "Maravilla", "Tabaco"], 30, "30 días para cereales (avena, cebada, centeno, trigo, triticale), maravilla y tabaco", "C"),
    R(["Avena"], 30, "30 días para cereales (avena, cebada, centeno, trigo, triticale), maravilla y tabaco", "C", "fuente:^Cereales"),
    R(["Kiwi"], 90, "90 días para kiwis", "C"),
    R(["Vid"], "COND", ["4 días para frutos pomáceos (manzana, membrillo, pera), frutos de carozo (durazno, damasco, cereza, guinda, ciruela, nectarino), vides (vinífera y pisquera)",
                        "21 días para maíz, repollito de bruselas y leguminosas (arveja, haba, lenteja, poroto, soya) y vid de mesa"], "C"),
    R(["Eucalipto", "Pino", "Alelí", "Alstroemeria", "Clavel", "Crisantemo", "Estátice", "Gladiolo", "Ilusión", "Leucadendron", "Lilium", "Lisianthus",
       "Peonía", "Protea", "Rosal", "Tulipán"], "NA", "Forestales y Flores: no corresponde.", "C"),
])

doc("147e9dec", "ENGEO 247 ZC", 2, enc={"C": "Período de carencia:"},
    notas="Maíz: la etiqueta distingue maíz cereal (14) de maíz dulce/choclo (30) y las líneas no lo separan: sin dato.",
    reglas=[
    R(["Remolacha", "Acelga", "Achicoria Industrial", "Ajo", "Alcachofa", "Apio", "Cebolla", "Trigo", "Avena", "Cebada", "Centeno", "Triticale",
       "Arveja", "Frejol", "Garbanzo", "Haba", "Lenteja", "Lupino", "Repollito de Bruselas", "Zapallo", "Zapallo italiano", "Sandía", "Melón",
       "Pepino", "Pepino dulce", "Arándano", "Frambuesa", "Frutilla", "Mora", "Papa", "Soya"], 14,
      "remolacha, acelga, achicoria raíz (industrial), ajo, alcachofa, apio, cebolla, trigo, avena, cebada, centeno, triticale, maíz (cereal), arveja, frejol, garbanzo, haba, lenteja, lupino, repollito de Bruselas, zapallo, zapallo italiano, sandía, melón, pepino, pepino dulce, arándano, frambuesa, frutilla, mora, papa, soya (14)", "C"),
    R(["Espinaca", "Rúcula"], 21, "espinaca, rúcula (21)", "C"),
    R(["Endibia", "Radicchio"], 28, "endibia y radichio (28)", "C"),
    R(["Coliflor", "Lechuga", "Brócoli", "Repollo", "Berenjena"], 7, "achicoria hoja, coliflor, lechuga, brócoli, repollo, berenjena (7)", "C"),
    R(["Pimiento", "Ají"], 5, "pimentón, ají (5)", "C"),
    R(["Tomate"], 2, "tomate (2)", "C"),
    R(["Tabaco"], "NA", "tabaco, no corresponde debido al momento de aplicación.", "C"),
    R(["Col forrajera"], "NA", "Col forrajera no corresponde porque no es un alimento de consumo humano.", "C"),
    R(["Maíz"], "COND", ["remolacha, acelga, achicoria raíz (industrial), ajo, alcachofa, apio, cebolla, trigo, avena, cebada, centeno, triticale, maíz (cereal), arveja, frejol, garbanzo, haba, lenteja, lupino, repollito de Bruselas, zapallo, zapallo italiano, sandía, melón, pepino, pepino dulce, arándano, frambuesa, frutilla, mora, papa, soya (14)",
                         "maíz dulce/choclo (30)"], "C"),
])

doc("1da3de20", "VERTIMEC 018 EC", 2, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"},
    notas="Vid aparece solo como «Vides»: la etiqueta distingue uva de mesa (28) de vinífera (7), sin dato.",
    reglas=[
    R(["Kiwi"], 35, "kiwi (35)", "C"),
    R(["Granado"], 30, "granada (30)", "C"),
    R(["Ciruelo"], 28, "ciruela, uva de mesa (28)", "C"),
    R(["Manzano", "Peral", "Membrillero", "Palto"], 21, "manzanas, peras, membrillo, paltas (21)", "C"),
    R(["Lima", "Limonero", "Naranjo", "Mandarino", "Pomelo", "Tangelo", "Tangerina", "Clementina", "Chirimoyo"], 20,
      "lima, limón, naranjo, mandarino, pomelo, tangelo, tangerina, clementina, chirimoya (20)", "C"),
    R(["Acelga", "Espinaca", "Arveja", "Maíz", "Apio", "Alcachofa", "Zapallo", "Pepino", "Zapallo italiano", "Sandía", "Melón", "Pepino dulce"], 15,
      "acelga, espinaca, arveja, maíz, apio, alcachofa, zapallo, pepino, zapallo italiano, sandía, melón, pepino dulce (15)", "C"),
    R(["Arándano", "Duraznero", "Cerezo", "Damasco", "Nectarino"], 14, "arándano, durazno, cereza, damasco, nectarín (14)", "C"),
    R(["Remolacha", "Betarraga", "Lechuga", "Zarzaparrilla"], 10, "remolacha, beterraga, lechuga, zarzaparrilla (10)", "C"),
    R(["Tomate", "Pimiento", "Frutilla", "Mora"], 7, "uva vinífera, tomate, pimiento, frutilla, mora (7)", "C"),
    R(["Frambuesa"], 3, "frambuesa (3)", "C"),
    R(["Nogal"], 2, "nueces (2)", "C"),
    R(["Almendro", "Papa"], 0, "almendras, papa (0 días)", "C"),
    R(["Clavel", "Crisantemo", "Rosal", "Clavelón", "Gerbera", "Gladiolo", "Ilusión", "Narciso", "Tulipán", "Ornamental"], "NA",
      "Flores (clavel, crisantemo, rosa, otras) y Ornamentales (No corresponde)", "C"),
    R(["Vid"], "COND", ["ciruela, uva de mesa (28)", "uva vinífera, tomate, pimiento, frutilla, mora (7)"], "C"),
])

doc("6225266d", "Winspray Miscible Coa", 2, notas="Aceite mineral: la etiqueta dice que no tiene restricciones de carencia.",
    reglas=[
    R(["Almendro", "Arándano", "Cerezo", "Ciruelo", "Duraznero", "Frambuesa", "Kiwi", "Limonero", "Mandarino", "Manzano", "Mora", "Naranjo",
       "Nectarino", "Olivo", "Palto", "Peral", "Remolacha", "Vid", "Zarzaparrilla"], "NA",
      "Carencias: WINSPRAY® MISCIBLE COA no tiene restricciones de carencia debido a que no deja residuos peligrosos en los cultivos."),
])

doc("a95fff1e", "AGRIMEK", 2, enc={"C": "Período de carencia para mercado local (días entre la última aplicación y la cosecha):"},
    notas="Vid aparece solo como «Vides»: la etiqueta distingue vinífera (7) de mesa (28), sin dato.",
    reglas=[
    R(["Tomate", "Pimiento", "Papa", "Almendro"], 0, "tomate, pimiento, papa y almendra (0 días)", "C"),
    R(["Nogal"], 2, "nuez (2 días)", "C"),
    R(["Frutilla", "Lechuga", "Arveja"], 7, "uva vinífera, frutilla, lechuga y arveja (7 días)", "C"),
    R(["Frambuesa", "Mora"], 8, "frambuesa y mora (8 días)", "C"),
    R(["Zarzaparrilla", "Remolacha", "Betarraga", "Apio"], 10, "zarzaparrilla, remolacha, beterraga y apio (10 días)", "C"),
    R(["Arándano", "Cerezo", "Acelga", "Espinaca"], 14, "arándano, cereza, acelga y espinaca (14 días)", "C"),
    R(["Maíz", "Melón", "Pepino", "Pepino dulce", "Sandía", "Zapallo", "Zapallo italiano"], 15, "maíz, melón, pepino, pepino dulce, sandía, zapallo y zapallo italiano (15 días)", "C"),
    R(["Lima", "Limonero", "Naranjo", "Mandarino", "Pomelo", "Tangelo", "Tangerina", "Clementina"], 20, "lima, limón, naranja, mandarina, pomelo, tangelo, tangerina y clementina (20 días)", "C"),
    R(["Manzano", "Peral", "Membrillero", "Damasco", "Duraznero", "Nectarino", "Palto"], 21, "manzana, pera, membrillo, damasco, durazno, nectarino y palta (21 días)", "C"),
    R(["Ciruelo"], 28, "ciruela y uva de mesa (28 días)", "C"),
    R(["Granado"], 30, "granada (30 días)", "C"),
    R(["Kiwi"], 42, "kiwi (42 días)", "C"),
    R(["Chirimoyo"], 78, "chirimoya (78 días)", "C"),
    R(["Vid"], "COND", ["uva vinífera, frutilla, lechuga y arveja (7 días)", "ciruela y uva de mesa (28 días)"], "C"),
])

doc("f50d45a7", "DUAL GOLD 960 EC", 2, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la naturaleza y época de aplicación."),
])

doc("06d27282", "AMISTAR TOP", 2, enc={"C": CARENCIA_DIAS},
    notas="Heridas de poda: no corresponde. Flores: la etiqueta no da carencia.",
    reglas=[
    R(["Nogal"], 29, "nogal (29)", "C"),
    R(["Vid", "Remolacha"], 28, "uvas, remolacha (28)", "C"),
    R(["Arándano"], 49, "arándanos (49)", "C"),
    R(["Mora", "Frambuesa", "Frutilla", "Zanahoria", "Sandía"], 14, "moras, frambuesas, frutillas, zanahoria, sandía (14)", "C"),
    R(["Cerezo", "Tomate"], 10, "cerezo, tomate (10)", "C"),
    R(["Achicoria Industrial", "Betarraga", "Zapallo", "Zapallo italiano", "Melón", "Pepino", "Alcachofa"], 7, "achicoria industrial, betarraga, zapallo, zapallo italiano, melón, pepino, alcachofa (7)", "C"),
    R(["Ciruelo", "Duraznero", "Nectarino"], 1, "ciruelo, durazno, nectarino (1)", "C"),
    R(["Damasco", "Olivo"], 5, "damasco, olivos (5)", "C"),
    R(["Pimiento"], 3, "pimiento (3)", "C"),
    R(["Papa"], 0, "papa (0)", "C"),
    R(["*"], "NA", "Para tratamientos de heridas de poda: no corresponde por el momento de aplicación.", None, "fuente:heridas de poda"),
])

doc("fe0fc3eb", "SELECRON 720 EC", 2, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Tomate"], 7, "tomate: 7", "C"),
    R(["Cebolla"], 14, "cebolla: 14", "C"),
    R(["Papa", "Sandía", "Nogal"], 21, "papa, sandía, nuez: 21", "C"),
    R(["Zapallo", "Haba", "Brócoli", "Coliflor", "Repollo", "Remolacha", "Maíz"], 28, "zapallo calabaza, haba, brócoli, coliflor, repollo, remolacha, maíz: 28", "C"),
    R(["Vid", "Kiwi", "Manzano", "Peral", "Membrillero", "Almendro", "Ciruelo", "Damasco", "Duraznero", "Nectarino"], "NA",
      "uva, kiwi, manzana, pera, membrillo, almendra, ciruela, damasco, durazno, nectarino: no corresponde, debido a la naturaleza de la aplicación.", "C"),
])

doc("6182e8cf", "TECTO 500 SC", 1, enc={"C": "Período de carencia (días de intervalo entre la última aplicación y la cosecha):"},
    notas="«Sin restricción» se guarda como «no aplica» con la cita. Flores y bulbos: la etiqueta no da carencia.",
    reglas=[
    R(["Clementina", "Limonero", "Mandarino", "Naranjo", "Pomelo", "Tangelo", "Tangerina", "Manzano", "Peral", "Membrillero", "Palto", "Papa"], "NA",
      "cítricos, manzanas, peras, membrillos, paltas, papa (sin restricción)", "C"),
    R(["Trigo"], 30, "trigo (30 días)", "C"),
    R(["Ajo", "Cebolla"], 60, "ajo, cebolla (60 días)", "C"),
])

doc("83a84168", "LAUDENTO 200 SC", 2, enc={"C": "Período de carencia: (días recomendados de espera entre la última aplicación y la cosecha):"}, reglas=[
    R(["Clementina", "Lima", "Limonero", "Mandarino", "Naranjo", "Pomelo", "Tangelo", "Tangerina"], 7, "cítricos: 7", "C"),
    R(["Avellano Europeo"], 22, "avellano europeo: 22", "C"),
    R(["Almendro", "Nogal"], 30, "almendro, nogal: 30", "C"),
    R(["Cebolla"], 20, "cebolla: 20", "C"),
    R(["Papa", "Tomate"], 14, "papa y tomate: 14", "C"),
    R(["Repollo", "Coliflor", "Brócoli", "Kale", "Rúcula"], 7, "repollo, coliflor, brócoli, kale, rúcula: 7", "C"),
    R(["Vid", "Manzano", "Peral", "Cerezo", "Arándano"], "NA", "vid, manzana, pera, cereza y arándano: no corresponde por el momento de aplicación.", "C"),
])

doc("9e052fae", "SCORE 250 EC", 1, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Zanahoria"], 28, "zanahoria: 28", "C"),
    R(["Alcachofa", "Espárrago", "Brócoli", "Zapallo"], 21, "alcachofa, espárrago, brócoli y zapallo invierno (calabaza): 21", "C"),
    R(["Manzano", "Peral", "Membrillero", "Arándano", "Frambuesa", "Frutilla", "Mora", "Frejol", "Garbanzo", "Lenteja", "Ajo", "Cebolla", "Chalota",
       "Zapallo italiano", "Apio", "Repollo", "Repollito de Bruselas", "Coliflor", "Sandía"], 14,
      "manzana, pera, membrillo, arándano, frambuesa, frutilla, mora, poroto, garbanzo, lenteja, ajo, cebolla, chalota, zapallo italiano, apio, repollo, repollito de Bruselas, coliflor y sandía: 14", "C"),
    R(["Tomate"], 12, "tomate:12", "C"),
    R(["Lechuga", "Haba", "Arveja", "Melón", "Vid", "Pepino"], 7, "lechuga, haba, arveja, melón, vides y pepino: 7", "C"),
    R(["Pimiento"], 3, "pimiento: 3", "C"),
    R(["Papa"], 0, "papa: 0", "C"),
])

doc("82413cff", "Borneo 11 SC", 2, enc={"C": "Períodos de Carencia: Respete los siguientes periodos de carencia:"}, reglas=[
    R(["Vid", "Manzano", "Peral", "Almendro", "Nogal", "Naranjo", "Clementina", "Mandarino", "Tangelo", "Pomelo"], 3,
      "uva de mesa, vid vinífera, manzano, pera, almendro, nogal, naranjo, clementino, mandarino, tangelo, pomelo: 3 días", "C"),
    R(["Limonero"], 70, "limón: 70 días", "C"),
    R(["Cerezo", "Ciruelo", "Duraznero", "Damasco", "Nectarino"], 60, "cerezo, ciruelo, durazno, damasco, nectarin: 60 días", "C"),
    R(["Kiwi"], 100, "kiwi: 100 días", "C"),
])

doc("d045516c", "REGLONE", 1, enc={
    "D": "Cuando REGLONE® es aplicado como desecante de cultivos se aplican las siguientes carencias:",
}, notas="Tabla 3 del cuadro = desecante; tabla 4 = control de malezas (no corresponde carencia).",
    reglas=[
    R(["Raps"], 6, "Raps (6)", "D", "fila:^t3\\."),
    R(["Trigo", "Cebada", "Avena"], 5, "Trigo, Cebada y Avena (5)", "D", "fila:^t3\\."),
    R(["Centeno", "Triticale"], 30, "Centeno y Triticale (30)", "D", "fila:^t3\\."),
    R(["Maravilla", "Papa"], 7, "Maravilla y Papa (7)", "D", "fila:^t3\\."),
    R(["Alfalfa", "Trébol", "Semilleros de Leguminosas: Alfalfa", "Semilleros de Leguminosas: Trébol", "Almendro", "Arándano", "Avellano Europeo",
       "Baby Kiwi", "Caqui", "Castaño", "Cerezo", "Chirimoyo", "Ciruelo", "Clementina", "Damasco", "Duraznero", "Frambuesa", "Frutilla", "Granado",
       "Guindo", "Higo", "Kiwi", "Lima", "Limonero", "Mandarino", "Manzano", "Membrillero", "Mora", "Naranjo", "Nectarino", "Nogal", "Níspero",
       "Olivo", "Palto", "Papayo", "Peral", "Pistacho", "Pomelo", "Tangelo", "Tangerina", "Vid", "Trigo", "Cebada", "Avena", "Centeno", "Triticale",
       "Raps", "Maravilla", "Papa", "Tomate", "Maíz", "Cebolla", "Arroz", "Sorgo"], "NA",
      "Los cultivos donde se aplica para el control de malezas: Semillero de alfalfa, semillero de trébol, praderas de alfalfa, frutales, cereales, raps, maravilla, papa, tomate, maíz y cebolla, no corresponde indicar carencia debido a la naturaleza de la aplicación.",
      None, "fila:^t4\\."),
])
