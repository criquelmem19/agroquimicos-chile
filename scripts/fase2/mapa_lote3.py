"""Mapa de carencias, lote 3."""
from mapa_carencias import R, doc, CARENCIA_DIAS

FOLIAR = ["metodo:follaje", "dosis_sm:hL|100 ?L"]

doc("20efe56b", "PRIORI", 2, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Trigo", "Cebada", "Avena", "Triticale"], 30, "trigo, cebada, avena y triticale: 30", "C"),
    R(["Lupino"], 21, "lupino: 21", "C"),
    R(["Remolacha", "Raps"], 20, "remolacha, raps o canola: 20", "C"),
    R(["Papa"], 1, "papa: 1", "C"),
    R(["Pino", "Tulipán"], "NA", "Vivero forestal y cultivos ornamentales no corresponde debido a la naturaleza de la aplicación."),
])

doc("1e48f47b", "GESATOP 90 WG", 1, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la época de aplicación."),
])

doc("3be9b74f", "CENTRIC 75 SG", 1, enc={"C": "Período de carencia para mercado local: (días de espera recomendados entre la última aplicación y la cosecha y solo aplicable para tratamientos al follaje):"},
    notas="Solo tratamientos al follaje; vía riego/suelo la etiqueta remite al Departamento Técnico.", reglas=[
    R(["Vid", "Olivo"], 28, "uva y olivo (28 días)", "C", FOLIAR),
    R(["Manzano"], 21, "manzana (21 días)", "C", FOLIAR),
    R(["Naranjo", "Limonero", "Mandarino", "Pomelo"], 32, "naranja, limón, mandarina, pomelo (32 días)", "C", FOLIAR),
])

doc("83eca4be", "WINSPRAY", 2, reglas=[
    R(["*"], 0, "Carencia: 0 días, puede ser aplicado hasta la cosecha."),
])

doc("fb508e34", "PRIORI XTRA", 1, enc={"C": CARENCIA_DIAS}, reglas=[
    R(["Arveja"], 37, "Arvejas (37)", "C"),
    R(["Avena", "Cebada", "Centeno", "Trigo", "Triticale"], 33, "Cereales (33)", "C"),
    R(["Raps", "Maíz"], 30, "Raps y Maíz: (30)", "C"),
    R(["Frejol"], 21, "Poroto (21)", "C"),
    R(["Garbanzo", "Lenteja"], 15, "Garbanzo y Lenteja (15)", "C"),
    R(["Haba", "Soya"], 14, "Haba y Soya (14)", "C"),
    R(["Remolacha"], 60, "Remolacha (60)", "C"),
    R(["Ajo"], 3, "Ajo (3)", "C"),
])

doc("be491b80", "LOGRAN 75 WG", 2, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la naturaleza de la aplicación."),
])

doc("744bbc97", "TILT 250 EC", 1, enc={"C": "Período de carencia: tiempo entre la última aplicación y cosecha:"}, reglas=[
    R(["Almendro", "Apio"], 90, "Almendro, Apio (90 días)", "C"),
    R(["Trigo"], 35, "Trigo (35 días)", "C"),
    R(["Cebada"], 30, "Cebada (30 días)", "C"),
    R(["Cerezo", "Damasco", "Duraznero", "Nectarino"], 3, "Cerezo, Damasco, Duraznero, Nectarino (3 días)", "C"),
])

doc("26937cc8", "Basta 14 SL", 6, enc={"C": "Periodo de carencia:"},
    notas="Etiqueta escaneada: texto leído con OCR y revisado contra la imagen.", reglas=[
    R(["Cerezo", "Ciruelo", "Nectarino", "Damasco"], 8, "Para Cerezo, Ciruelo, Nectarino y Damasco: 8 días", "C"),
    R(["Duraznero"], 14, "Durazno: 14 días", "C"),
    R(["Manzano", "Peral"], 14, "Manzana y Pera: 14 días", "C"),
    R(["Almendro", "Nogal", "Avellano Europeo"], 0, "Almendrp, Nogal y Avellano: O días", "C", corregida="Almendro, Nogal y Avellano: 0 días"),
    R(["Naranjo", "Limonero", "Pomelo"], 0, "Naranjo, Limonero y Pomelo: O días", "C", corregida="Naranjo, Limonero y Pomelo: 0 días"),
    R(["Olivo"], 14, "Olivo: 14 días", "C"),
    R(["Frambuesa", "Arándano", "Elderberries", "Grosella"], 0, "Frambuesa, Arándanos, Elderberries, Gooseberries: 0 días", "C"),
])

doc("d41fd82f", "QUADRIS", 1, enc={"C": CARENCIA_DIAS},
    notas="Papa: 20 días si es foliar, 60 si se aplica al suelo (surco).", reglas=[
    R(["Arándano", "Frambuesa", "Frutilla", "Mora"], 1, "arándanos, frambuesas, frutillas y moras (1)", "C"),
    R(["Cerezo", "Ciruelo", "Damasco", "Duraznero", "Nectarino"], 5, "cerezas, ciruelas, damascos, duraznos, nectarinos (5)", "C"),
    R(["Almendro", "Vid"], 14, "almendras y uvas (14)", "C"),
    R(["Papa"], 60, "Para papas, si la aplicación se realiza foliar se recomienda dejar un intervalo de 20 días entre la última aplicación y la cosecha y 60 días si se aplica al suelo.",
      cond="momento:surco|al suelo", prioridad=2),
    R(["Papa"], 20, "Para papas, si la aplicación se realiza foliar se recomienda dejar un intervalo de 20 días entre la última aplicación y la cosecha y 60 días si se aplica al suelo.",
      cond="fuente:Tizón"),
])

doc("4ad1ca50", "RIDOMIL GOLD MZ 68 WG", 1, enc={"C": "Período de carencia (días de espera recomendados entre la última aplicación y la cosecha):"}, reglas=[
    R(["Vid"], 28, "vides (28)", "C"),
    R(["Arándano", "Frambuesa", "Mora"], 21, "arándano, frambuesa, mora (21)", "C"),
    R(["Repollo", "Coliflor", "Frutilla", "Pimiento"], 14, "repollo, coliflor, frutilla, pimiento o morrón (14)", "C"),
    R(["Espinaca"], 10, "espinaca (10)", "C"),
    R(["Achicoria Industrial"], 8, "achicoria (8)", "C"),
    R(["Papa", "Cebolla", "Ajo"], 7, "papa, cebolla, ajo (7)", "C"),
    R(["Tomate"], 3, "tomate (3)", "C"),
    R(["Pino"], "NA", "pino: no corresponde.", "C"),
])

doc("b3469f2a", "Elmus", 3, enc={"C": "Períodos de carencias"},
    notas="Etiqueta escaneada: texto leído con OCR y revisado contra la imagen (incluido «94 días», tal como está impreso).", reglas=[
    R(["Arándano"], 5, "Arándano: 5 días.", "C"),
    R(["Tomate"], 7, "Tomate: 7 días.", "C"),
    R(["Manzano"], 30, "Manzano: 30 días.", "C"),
    R(["Peral"], 60, "Peral: 60 días.", "C"),
    R(["Nogal", "Almendro"], 60, "Nogal y Almendro: 60 días.", "C"),
    R(["Cebolla"], 15, "Cebolla: 15 días.", "C"),
    R(["Frutilla"], 0, "Frutillas: 0 días.", "C"),
    R(["Grosella"], 4, "Grosellas: 4 días.", "C"),
    R(["Zarzaparrilla"], 21, "Zarzaparrillas: 21 días.", "C"),
    R(["Cerezo"], 2, "Cerezo: 2 días.", "C"),
    R(["Ciruelo"], 5, "Ciruelo: 5 días.", "C"),
    R(["Duraznero", "Nectarino", "Damasco"], 94, "Duraznos, Nectarinos, Damascos: 94 días.", "C"),
    R(["Avellano Europeo", "europeo"], 25, "Avellano europeo: 25 días.", "C"),
])

doc("e93e4022", "CUPRODUL 75 SUPER", 2, reglas=[
    R(["*"], "NA", "Periodo de carencia: no tiene restricciones de carencia en los cultivos recomendados."),
    R(["Tomate"], 14, "En tomates respete carencia de 14 días.", prioridad=2),
])

doc("ddbb8af8", "Dormex", 1, reglas=[
    R(["*"], "NA", "Períodos de carencias: No aplicable, por el momento de aplicación."),
])

doc("db1a21a7", "FORCE 20 CS SEMILLERO", 1, reglas=[
    R(["*"], "NA", "Período de carencia: no se indica por la naturaleza de la aplicación."),
])

doc("cc34485d", "EXCELTO", 2, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la naturaleza de la aplicación."),
])

doc("482d2f65", "CRUISER 600 FS", 1, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la naturaleza de la aplicación."),
])
