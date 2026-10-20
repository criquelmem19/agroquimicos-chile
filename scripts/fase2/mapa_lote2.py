"""Mapa de carencias, lote 2. "COND" = la etiqueta da una carencia que depende de algo que la
línea no dice (uva de mesa o vinífera, dosis menor o mayor…): se guarda la cita, sin número."""
from mapa_carencias import R, doc, CARENCIA_DIAS

doc("8d111bf0", "TOPAS 200 EW", 1, enc={"C": "Período de carencia:"},
    notas="Frejol: la etiqueta distingue frejol verde (30) de frejol seco (7).", reglas=[
    R(["Remolacha", "Papa"], 30, "remolacha, papa, frejol verde: 30 días", "C"),
    R(["Vid"], 21, "uva: 21 días", "C"),
    R(["Manzano", "Peral", "Duraznero", "Nectarino", "Ciruelo", "Cerezo", "Damasco", "Almendro", "Frambuesa"], 14, "manzana, pera, frutas de carozo, frambuesa: 14 días", "C"),
    R(["Pimiento", "Frutilla", "Arveja", "Alcachofa"], 7, "pimentón, frutilla, arveja, alcachofa, frejol seco: 7 días", "C"),
    R(["Melón", "Sandía", "Zapallo", "Tomate"], 3, "melón, sandía, zapallo, tomate: 3 días", "C"),
    R(["Frejol"], "COND", ["remolacha, papa, frejol verde: 30 días", "pimentón, frutilla, arveja, alcachofa, frejol seco: 7 días"], "C"),
])

doc("5746c539", "MIRAVIS PRIME", 2, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Manzano", "Peral"], 30, "manzana, pera: 30 días", "C"),
    R(["Vid"], 21, "uva: 21 días", "C"),
    R(["Almendro"], 14, "lechuga (distintas a las Romanas), almendra: 14 días", "C"),
    R(["Tomate"], 10, "tomate: 10 días", "C"),
    R(["Arándano", "Papa"], 7, "arándano, papa, lechuga Romana: 7 días", "C"),
    R(["Cerezo", "Duraznero", "Nectarino", "Ciruelo", "Damasco"], 3, "cereza, durazno, nectarín, ciruela, damasco: 3 días", "C"),
    R(["Lechuga"], "COND", ["lechuga (distintas a las Romanas), almendra: 14 días", "arándano, papa, lechuga Romana: 7 días"], "C"),
])

doc("6400975a", "MINECTO PRO", 2, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Damasco"], 50, "50 días para Damasco", "C"),
    R(["Ciruelo"], 40, "40 días para Ciruela", "C"),
    R(["Manzano", "Peral", "Membrillero"], 35, "35 días para Manzana, Pera y Membrillo", "C"),
    R(["Cebolla"], 30, "30 días para Cebolla", "C"),
    R(["Vid"], 28, "28 días para Uva", "C"),
    R(["Duraznero", "Nectarino", "Avellano Europeo", "Arándano"], 21, "21 días para Durazno, Nectarino, Avellano y Arándanos", "C"),
    R(["Cerezo", "Nogal"], 14, "14 días para Cereza y Nuez", "C"),
    R(["Almendro"], 5, "5 días para Almendra", "C"),
    R(["Papa"], 0, "0 días para Papa", "C"),
])

doc("d2537ac8", "SCHOLAR 230 SC", 1, reglas=[
    R(["Arándano", "Cerezo", "Ciruelo", "Clementina", "Damasco", "Duraznero", "Granado", "Kiwi", "Limonero", "Mandarino", "Manzano",
       "Membrillero", "Naranjo", "Nectarino", "Peral", "Pomelo", "Tangelo", "Tangerina"], 0,
      "Período de carencia (días entre la aplicación y consumo): 0 días; es un producto para post-cosecha de frutas."),
    R(["Lilium"], "NA", "Para Lilium no corresponde indicarlo pues no se consume."),
])

doc("a97fa117", "Turbine", 2, reglas=[
    R(["Melón", "Sandía", "Pepino", "Zapallo", "Repollo", "Coliflor", "Brócoli", "Repollo de Bruselas", "Tomate", "Tomate bajo", "Naranjo",
       "Mandarino", "Clementina", "Limonero"], 0,
      "Periodo de Carencia: Melón, Sandía, Pepino, Zapallo Repollo, Coliflor, Brócoli, Repollo de Bruselas, Tomate, Naranjos, Mandarinos, Clementinos y Limoneros: 0 días."),
    R(["Papa", "Lechuga"], 7, "Papa y Lechuga: 7 días"),
    R(["Nectarino", "Duraznero", "Ciruelo", "Cerezo"], 14, "Nectarino, Durazno, Ciruela, Cereza: 14 días"),
    R(["Nogal", "Avellano Europeo"], 40, "Nogal y Avellano europeo: 40 días"),
    R(["Lilium"], "NA", "Lilium: No corresponde."),
])

doc("d0f7d426", "Ultraspray", 2, reglas=[
    R(["*"], 0, "Carencia: 0 días. Puede ser aplicado hasta la cosecha."),
])

doc("00b600d8", "Cuproso Flo", 2, reglas=[
    R(["*"], "NA", "Periodo de carencia: No tiene restricciones de carencia en los cultivos recomendados."),
])

doc("88c31014", "SWITCH 62.5 WG", 1, enc={"C": "Período de carencia para mercado local (días recomendados de espera entre la última aplicación y la cosecha):"},
    notas="Lechuga: la etiqueta distingue romanas (5) de arrepolladas (10).", reglas=[
    R(["Tomate"], 1, "tomates: 1 día", "C"),
    R(["Vid"], 2, "uvas: 2 días", "C"),
    R(["Arándano"], 3, "arándanos: 3 días", "C"),
    R(["Frambuesa", "Frutilla"], 5, "lechugas Romanas (incluye Escarola), frambuesa y frutilla: 5 días", "C"),
    R(["Ajo", "Berenjena", "Cebolla", "Repollo", "Zapallo italiano", "Manzano", "Peral", "Membrillero"], 7,
      "ajo, berenjena, cebolla, repollo, zapallo italiano, manzanas, peras y membrillo: 7 días", "C"),
    R(["Mora"], 10, "lechugas arrepolladas (incluye Española, Francesa, Milanesa), moras: 10 días", "C"),
    R(["Zapallo", "Pepino", "Pimiento", "Papa", "Kiwi", "Frejol"], 14, "zapallo de invierno (calabaza), pepino, pimiento, papa, kiwi y frejol o poroto: 14 días", "C"),
    R(["Brócoli", "Coliflor", "Bunching"], 21, "brócoli, coliflor y bunching: 21 días", "C"),
    R(["Apio"], 28, "apio: 28 días", "C"),
    R(["Arveja"], 36, "arveja: 36 días", "C"),
    R(["Lechuga"], "COND", ["lechugas Romanas (incluye Escarola), frambuesa y frutilla: 5 días",
                            "lechugas arrepolladas (incluye Española, Francesa, Milanesa), moras: 10 días"], "C"),
])

doc("458efae7", "CHESS", 1, enc={"C": "Período de carencia (días de intervalo entre la última aplicación y la cosecha):"}, reglas=[
    R(["Tomate", "Pimiento"], 3, "tomate, pimentón (3)", "C"),
    R(["Papa"], 7, "papa (7)", "C"),
    R(["Repollo"], 14, "repollo (14)", "C"),
    R(["Frejol"], 21, "frejol (21)", "C"),
    R(["Melón", "Duraznero"], 28, "melón, duraznero (28)", "C"),
    R(["Clavelón", "Crisantemo", "Gerbera", "Gladiolo", "Ilusión", "Iris", "Narciso", "Rosal", "Tulipán"], "NA", "Ornamentales: no corresponde.", "C"),
])

doc("6205f49e", "Cobre Premium", 1, reglas=[
    R(["Almendro", "Arándano", "Cerezo", "Ciruelo", "Clementina", "Damasco", "Duraznero", "Frambuesa", "Guindo", "Kiwi", "Limonero", "Mandarino",
       "Manzano", "Mora", "Naranjo", "Nectarino", "Nogal", "Peral", "Pomelo", "Vid"], "NA",
      "Período de carencia: no tiene restricciones de carencia en los frutales recomendados."),
    R(["Papa"], 14, "Para papa, se recomienda dejar 14 días entre la última aplicación y la cosecha y para tomate 7 días."),
    R(["Tomate"], 7, "Para papa, se recomienda dejar 14 días entre la última aplicación y la cosecha y para tomate 7 días."),
    R(["Pino"], "NA", "No corresponden restricciones para plantaciones forestales."),
])

doc("8c462f0c", "PROCLAIM FORTE", 1, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"},
    notas="Vid sin distinguir mesa/vinífera y nectarín/durazno según dosis: se muestra la condición de la etiqueta.", reglas=[
    R(["Vid"], "COND", "uva de mesa: 60 días; uva vinífera: 14 días", "C"),
    R(["Ciruelo", "Cerezo", "Damasco", "Plumcot"], 30, "ciruela, cereza, damasco, plumcot: 30 días", "C"),
    R(["Nectarino", "Duraznero"], "COND", "nectarín, durazno: 10 días si se utiliza la dosis menor y 30 días si se utiliza la dosis mayor", "C"),
    R(["Manzano", "Peral", "Membrillero"], 9, "manzana, pera, membrillo: 9 días", "C"),
    R(["Almendro"], 7, "almendra: 7 días", "C"),
    R(["Papa"], 3, "papa: 3 días", "C"),
    R(["Tomate", "Nogal"], 1, "tomate, nuez: 1 día", "C"),
])

doc("92bb8fe4", "20241202 Botristop", 2, reglas=[
    R(["*"], 0, "Período de carencia: 0 días."),
])

doc("97df8511", "Comet", 3, enc={"C": "Respete los siguientes días de carencia:"},
    notas="Etiqueta escaneada: texto leído con OCR y revisado contra la imagen.", reglas=[
    R(["Tomate"], 1, "tomate: 1;", "C"),
    R(["Bunching", "Cebolla", "Ajo", "Apio", "Brócoli", "Lechuga", "Damasco", "Cerezo", "Ciruelo", "Plumcot", "Duraznero", "Nectarino", "Arándano"], 7,
      "bunching, cebolla, ajo, apio, brócoli, lechuga, damasco, cerezo, ciruelo, plumcot, pluot, durazno, nectarines, arándano: 7;", "C"),
    R(["Alcachofa", "Maíz"], 20, "alcachofa, maíz: 20;", "C"),
    R(["Almendro"], 24, "almendro: 24,", "C"),
    R(["Olivo", "Peral"], "NA", "olivo, perales: no aplica,", "C"),
    R(["Nogal"], 60, "nogal: 60,", "C"),
    R(["Manzano"], 30, "manzano: 30", "C"),
])

doc("52cee0b1", "VOLIAM FLEXI 300 SC", 1, enc={"C": "Período de carencia: (días de espera recomendados entre la última aplicación y la cosecha):"}, reglas=[
    R(["Duraznero", "Nectarino", "Ciruelo", "Cerezo", "Damasco"], 9, "Duraznero, Nectarino, Ciruelo, Cerezo, Damasco (9 días)", "C"),
    R(["Nogal", "Vid"], 14, "Nogal, Vides (14 días)", "C"),
    R(["Manzano", "Peral", "Membrillero", "Remolacha"], 30, "Manzano, Peral, Membrillo, Remolacha (30 días)", "C"),
    R(["Tomate"], 1, "Tomate (1 día)", "C"),
    R(["Maíz", "Tabaco"], "NA", "Maíz, Tabaco (no corresponde por el momento de la aplicación)", "C"),
])

doc("764e5410", "PROCLAIM 05 SG", 1, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Tomate", "Pimiento", "Berenjena"], 7, "Tomate, Pimiento, Berenjena (7)", "C"),
    R(["Repollito de Bruselas"], 10, "Repollito de Bruselas (10)", "C"),
    R(["Brócoli", "Coliflor", "Repollo"], 7, "Brócoli, Coliflor, Repollo (7)", "C"),
    R(["Achicoria", "Apio", "Lechuga", "Espinaca"], 7, "Achicoria, Apio, Lechuga, Espinaca (7)", "C"),
    R(["Melón", "Pepino", "Pepino dulce", "Sandía", "Zapallo", "Zapallo italiano"], 7, "Cucurbitáceas (Melón, Pepino, Pepino dulce, Sandía, Zapallo, Zapallo italiano) (7)", "C"),
    R(["Clavel", "Crisantemo", "Rosal", "Ornamental"], 3, "Flores (Clavel, Crisantemo, Rosa) y Ornamentales (3)", "C"),
    R(["Papa", "Remolacha"], 7, "Papa, Remolacha (7)", "C"),
])

doc("b210a1e3", "GOLD 48 (Ridomil Gold 480 SL)", 8, enc={"C": "Período de carencia (días de espera recomendados entre la última aplicación y la cosecha):"}, reglas=[
    R(["Kiwi"], 14, "espárrago, arándano, frutilla, kiwi (14)", "C"),
    R(["Palto"], 28, "palta (28)", "C"),
    R(["Manzano", "Peral", "Membrillero", "Nogal", "Almendro", "Cerezo", "Ciruelo", "Damasco", "Duraznero", "Guindo", "Nectarino", "Vid"], 30,
      "manzana, pera, membrillo, nuez, almendra, cereza, ciruela, damasco, durazno, guindo, nectarino, clementina, limón, mandarina, naranja, pomelo, tangelo, tangerina, uva (30)", "C"),
])

doc("c9d4f9e3", "AMISTAR OPTI", 1, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Arveja"], 14, "arveja (14)", "C"),
    R(["Repollo", "Coliflor"], 10, "repollo y coliflor (10)", "C"),
    R(["Pimiento", "Repollito de Bruselas", "Brócoli", "Zapallo"], 7, "pimiento, repollito de Bruselas, brócoli, zapallo (7)", "C"),
    R(["Frejol", "Garbanzo", "Haba", "Lenteja"], 6, "poroto, garbanzo, haba, lenteja (6)", "C"),
    R(["Zapallo italiano", "Pepino"], 5, "zapallito italiano, pepino de ensalada (5)", "C"),
    R(["Cebolla", "Ajo", "Bunching", "Chalota", "Puerro"], 3, "cebolla, ajo, bunching, chalota y puerro (3)", "C"),
    R(["Tomate", "Melón", "Sandía"], 1, "tomate, melón, sandía (1)", "C"),
    R(["Papa"], 0, "papa (0)", "C"),
])

doc("6f7e22c3", "AMPLIGO 150 ZC", 2, enc={"C": "Período de carencia: (días de espera recomendados entre la última aplicación y la cosecha y solo aplicable para tratamientos al follaje):"},
    notas="Solo para tratamientos al follaje.", reglas=[
    R(["Duraznero", "Nectarino", "Ciruelo", "Cerezo", "Damasco", "Almendro", "Nogal"], 2, "frutos de carozo, nogal (2 días)", "C", "metodo:^(?!.*suelo)"),
    R(["Manzano", "Peral"], 4, "pomáceas (4 días)", "C", "metodo:^(?!.*suelo)"),
    R(["Tomate"], 7, "tomates (7 días)", "C", "metodo:^(?!.*suelo)"),
])

doc("72866182", "Cercobin M", 1, enc={"C": "Periodo de Carencia"},
    notas="Etiqueta escaneada: texto leído con OCR y revisado contra la imagen.", reglas=[
    R(["Duraznero", "Nectarino", "Almendro", "Ciruelo", "Damasco", "Cerezo", "Manzano", "Peral", "Vid", "Frutilla"], 7,
      "Duraznero, nectarino, almendro, ciruelo, damasco, cerezo, manzano, peral, vides y frutillas: 7 días;", "C"),
    R(["Tomate", "Pimiento", "Lechuga", "Arrepollada", "Alcachofa", "Melón", "Sandía", "Zapallo"], 3,
      "tomate, pimiento, lechuga arrepollada, alcachofa, melón, sandia, zapallo: 3 días;", "C"),
    R(["Remolacha"], 55, "remolacha: 55 días;", "C"),
    R(["Trigo"], 35, "trigo: 35 días;", "C"),
    R(["Viveros", "forestales"], "NA", "viveros forestales: no aplica periodos de carencia.", "C"),
])
