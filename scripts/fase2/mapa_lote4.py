"""Mapa de carencias, lote 4 (resto de las etiquetas con párrafo de carencia)."""
from mapa_carencias import R, doc, CARENCIA_DIAS

OCR = "Etiqueta escaneada: texto leído con OCR y revisado contra la imagen."
NO_CORRESPONDE = "Período de carencia: no corresponde debido a la naturaleza de la aplicación."

doc("04bf101f", "Agrocopper Sp", 2, reglas=[
    R(["*"], 0, "Carencia (Días): 0 días."),
])

doc("fb48027e", "MIRAVIS DUO", 2, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Manzano", "Peral"], 60, "manzana, pera: 60", "C"),
    R(["Vid"], 10, "uva: 10", "C"),
    R(["Cerezo", "Papa"], 7, "cereza, papa: 7", "C"),
    R(["Tomate"], 0, "tomate: 0", "C"),
])

doc("397513af", "KONAN 240 SC", 2, enc={"C": "Carencia (días)"},
    notas="Carencia en la columna del cuadro de usos.", reglas=[
    R(["Vid"], 21, ["Cultivo Vides de mesa, para vino y para pisco", "Carencia (días) 21"]),
    R(["Cerezo", "Nogal", "Limonero"], 7, "Cerezas, nueces, limones: 7", "C"),
    R(["Manzano", "Peral", "Almendro", "Ciruelo", "Nectarino", "Duraznero", "Damasco"], 14,
      "Manzanas, peras, almendras, ciruelas, nectarines, duraznos y damascos: 14", "C"),
    R(["Naranjo"], 15, "Naranjas: 15", "C"),
    R(["Clementina", "Mandarino"], 20, "Clementinas, mandarinas: 20", "C"),
])

doc("28051591", "GRADUATE A+", 1, reglas=[
    R(["*"], "NA", "Período de carencia (días entre la última aplicación y la cosecha): No corresponde, ya que es un producto de post cosecha"),
])

doc("8428b843", "Polisulfuro De Calcio", 1, reglas=[
    R(["*"], "NA", "Período de carencia (días): No corresponde debido a que las aplicaciones de este producto son en invierno y principios de primavera."),
])

doc("0e06407a", "CRUISER 350 FS", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("a119aaeb", "Cantus", 1, enc={"C": "Período de Carencia: Respete carencia de"}, notas=OCR, reglas=[
    R(["Vid"], 2, "2 días para vides;", "C"),
    R(["Arándano", "Frambuesa", "Tomate"], 0, "0 días para arándanos, frambuesas y tomates;", "C"),
    R(["Cerezo", "Duraznero", "Nectarino", "Ciruelo", "Papa"], 3, "3 días para cerezos, duraznos, nectarinos, ciruelos y papas;", "C"),
    R(["Damasco"], 60, "60 días para damascos;", "C"),
    R(["Almendro"], 100, "100 días para almendros.", "C"),
    R(["Acelga", "Espinaca"], 20, "Acelga y Espinaca: 20 días.", "C"),
])

doc("9099ebc7", "SORBA 050 EC", 1, enc={"C": "Período de carencia (días de intervalo entre la última aplicación y la cosecha):"}, reglas=[
    R(["Manzano", "Peral"], 18, "manzana, pera (18)", "C"),
    R(["Almendro", "Cerezo", "Ciruelo", "Damasco", "Duraznero", "Nectarino"], 28, "almendra, cereza, ciruela, damasco, durazno, nectarín (28)", "C"),
    R(["Repollo"], 14, "repollo (14)", "C"),
    R(["Tomate"], 3, "tomate (3)", "C"),
    R(["Papa"], "NA", "papa (no corresponde)", "C"),
])

doc("1ea81d77", "Comet WG", 2, enc={"C": "Periodo de carencia:"},
    notas=OCR + " Algunos cultivos vienen partidos en los datos («Melon y», «italiano», «Vides (mesa», «pisquera)», «vinifera»).", reglas=[
    R(["Arveja"], 40, "Arveja: 40 días,", "C"),
    R(["Cebolla"], 7, "Cebolla: 7 días,", "C"),
    R(["Tomate"], 1, "Tomate: 1 día,", "C"),
    R(["Zapallo", "Pepino", "Sandía", "Melon y", "italiano"], 0, "Zapallo, Zapallo italiano, Pepino, Melón y Sandía: 0 días.", "C"),
    R(["Vides (mesa", "pisquera)", "vinifera"], "COND",
      "Vides: el periodo de carencia depende de la variedad y de la zona de producción, pudiendo variar entre 60 días para variedades de cosecha temprana y 120 días para variedades de cosecha tardía.", "C"),
])

doc("f7986888", "SHIRLAN 500 SC", 2, enc={"C": "Período de carencia: (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Papa"], 7, "papas (7)", "C"),
    R(["Manzano"], 21, "manzanas (21)", "C"),
    R(["Vid"], 21, "vid vinífera (21)", "C", "fuente:vin[ií]fera"),
    R(["Vid"], "COND", "vides de mesa (hasta el despliegue de las primeras hojas de la vid (etapa fenológica BBCH11))", "C", "fuente:de mesa"),
    R(["Remolacha"], 30, "remolacha (30)", "C"),
    R(["Arándano"], 32, "arándano (32)", "C"),
    R(["Tulipán", "Lilium"], "NA", "bulbos de tulipán y lilium (no corresponde)", "C"),
])

doc("8b03bbe4", "Katana Syngenta", 1, enc={"C": "Período de carencia:"}, reglas=[
    R(["Vid"], 75, "Viñedos y parronales (75 días)", "C"),
    R(["Naranjo", "Mandarino", "Clementina", "Limonero"], 45, "Naranjos, mandarinos, clementinas y limoneros (45 días)", "C"),
    R(["Olivo"], 20, "olivos (20 días)", "C"),
    R(["Avellano Europeo"], 130, "avellano europeo (130 días)", "C"),
    R(["Palto"], 0, "palto (0 días)", "C"),
    R(["Nogal"], 130, "nogales (130 días)", "C"),
    R(["Arándano"], 122, "arándanos (122 días)", "C"),
    R(["Sitios eriazos agrícolas**"], "NA", "sitios eriazos (no corresponde).", "C"),
])

doc("09dccdd6", "REVUS 250 SC", 1, enc={"C": "Período de carencia: (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Cebolla"], 1, "cebollas (1 día)", "C"),
    R(["Papa", "Lechuga", "Melón", "Pepino", "Sandía", "Zapallo", "Zapallo italiano"], 3, "papas, lechugas, cucurbitáceas (3 días)", "C"),
    R(["Tomate"], 14, "tomates (14)", "C"),
    R(["Pino"], "NA", "Pinos: no aplica.", "C"),
])

doc("b340997e", "REFLECT XTRA", 1, enc={"C": "Período de carencia para mercado local (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Raps"], 56, "raps (56 días)", "C"),
    R(["Trigo"], 30, "trigo (30 días)", "C"),
    R(["Pimiento"], 28, "pimentón (28 días)", "C"),
    R(["Tomate"], 1, "tomate (1 día)", "C"),
    R(["Papa", "Lechuga"], "NA", "papas y lechuga no corresponde por la forma y momento de aplicación.", "C"),
])

doc("8315f2bc", "Bellis", 5, enc={"C": "Períodos de Carencia: Respete las siguientes carencias:"}, notas=OCR, reglas=[
    R(["Duraznero", "Nectarino", "Damasco", "Ciruelo"], 7, "durazno, nectarino, damasco y ciruelo: 7 días;", "C"),
    R(["Frambuesa", "Arándano"], 0, "frambuesos, arándanos, frutillas, cerezos, guindos: 0 días;", "C"),
    R(["Vid"], 2, "vides: 2 días;", "C"),
    R(["Almendro"], 24, "almendros: 24 días;", "C"),
])

doc("cafcdfd1", "Acronis", 2, notas=OCR, reglas=[
    R(["*"], "NA", "Períodos de carencias: Por su forma de aplicación nq se consideran —períodos de carencia.",
      corregida="Períodos de carencias: Por su forma de aplicación no se consideran períodos de carencia."),
])

doc("445188d8", "DIVIDEND 150 FS", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("b1747b74", "Vaniva 450 SC", 1, enc={"C": "Período de carencia:"}, reglas=[
    R(["Papa"], 88, "Papa: 88 días;", "C"),
    R(["Tomate"], 77, "Tomate: 77 días,", "C"),
    R(["Vid"], 70, "Vides (uva de mesa y vino): 70 días;", "C"),
    R(["Limonero", "Naranjo", "Mandarino", "Clementina"], 60, "Limones, Naranjas, Mandarinas, Clementinas: 60 días.", "C"),
])

doc("974111ad", "Forum SC", 2, notas=OCR, reglas=[
    R(["Papa", "Tomate", "Ajo", "Cebolla", "Pimiento", "Lechuga", "Bunching", "Puerro"], 7,
      "Períodos de carencia: Respete carencia de 7 días en papa, tomate, ajo, cebolla, pimentón, lechugas, bunching (Cebollín Japonés) y puerro."),
    R(["*"], "NA", "Cuando Forum@ SC es aplicado en el surco no aplica perlodo de carencia, por el momento específico de aplicación.",
      cond="texto:surco", prioridad=2,
      corregida="Cuando Forum® SC es aplicado en el surco no aplica período de carencia, por el momento específico de aplicación."),
])

doc("c7510836", "MODDUS 250 EC", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("92a09e44", "CULTAR", 1, reglas=[
    R(["Duraznero", "Nectarino", "Nogal", "Palto"], 60, "Período de carencia: 60 días (Duraznero, Nectarino, Nogal, Palto (aplicación foliar)."),
    R(["Cerezo"], "NA", "Para Cerezo no corresponde indicar periodo de carencia ya que es una aplicación de post cosecha."),
])

doc("ff96d081", "BION 50 WG", 1, enc={"C": "Período de carencia:"}, reglas=[
    R(["Tomate"], 14, "Tomate: 14 días;", "C"),
    R(["Avellano Europeo"], 30, "Avellano: 30 días;", "C"),
    R(["Kiwi"], "COND", "Kiwi: aplicar solo hasta pre-floración;", "C"),
    R(["Nogal"], 125, "Nogal: 125 días;", "C"),
    R(["Cerezo"], "NA", "Cerezo en aplicación de post cosecha (sobre el árbol y sin fruta presente): no corresponde, por la naturaleza de la aplicación,", "C",
      "fuente:post ?cosecha"),
    R(["Cerezo"], 74, "Cerezo: aplicación en floración: 74 días.", "C", "fuente:floraci[oó]n"),
])

doc("ff49a59d", "REFLECT TOP", 1, reglas=[
    R(["Manzano", "Peral", "Membrillero"], 28,
      "Período de carencia para mercado local (días entre la última aplicación y la cosecha): 28 días para manzana, pera y membrillo."),
])

doc("81fae4bb", "CAIMAN 70 WG", 1, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde, debido a la naturaleza de la aplicación."),
])

doc("8586e287", "CALLISTO 480 SC", 2, enc={"C": "Período de carencia:"}, reglas=[
    R(["Eucalipto", "Pino", "Maíz"], "NA", "en el caso de plantaciones forestales y maíz no corresponde;", "C"),
    R(["Arándano"], 45, "cranberries 45 días;", "C", "fuente:Cranberr"),
    R(["Avena"], 50, "avena: 50 días.", "C"),
])

doc("11123e0b", "Kocide 2000", 1, reglas=[R(["*"], "NA", "PERIODO DE CARENCIA: Sin restricciones.")])

doc("0ed7d1e7", "SWITCH ONE", 1, enc={"C": "Período de carencia para mercado local (días recomendados de espera entre la última aplicación y la cosecha):"},
    notas="La etiqueta escribe «arándano, pera; uva: 3 días»: para arándano y pera se muestra la cita sin asumir el número.", reglas=[
    R(["Duraznero"], 7, "durazno: 7 días;", "C"),
    R(["Vid"], 3, "arándano, pera; uva: 3 días;", "C"),
    R(["Arándano", "Peral"], "COND", "arándano, pera; uva: 3 días;", "C"),
    R(["Cerezo", "Manzano"], 0, "cereza, manzana: 0 días.", "C"),
])

doc("9654c070", "MIRAVIS AEON", 1, enc={"C": "Período de carencia (días entre la última aplicación y la cosecha):"}, reglas=[
    R(["Trigo", "Cebada", "Avena"], 30, "trigo, cebada y avena: 30 días;", "C"),
    R(["Raps"], 55, "raps o canola: 55 días.", "C"),
])

doc("0428c731", "SCHOLAR RTU", 1, reglas=[
    R(["*"], 0, "Período de carencia (días entre la aplicación y consumo): 0 días; es un producto para postcosecha de frutas."),
])

doc("fedb22f4", "KEEP", 2, notas="Coadyuvante: hay que respetar la carencia del producto con que se mezcle.", reglas=[
    R(["*"], "NA", "Período de Carencia: No tiene carencia. Debe observarse la carencia del producto fitosanitario con que se le mezcle."),
])

doc("377b5ca9", "VIBRANCE GOLD", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("1b5760b2", "CELEST", 1, reglas=[R(["*"], "NA", "Período de carencia: no se indica por la naturaleza de la aplicación.")])

doc("a89e7dab", "FOLIO GOLD 440 SC", 1, enc={"C": "Período de carencia (días de espera recomendados entre la última aplicación y la cosecha):"}, reglas=[
    R(["Arveja"], 21, "arveja (21)", "C"),
    R(["Papa"], 7, "papa (7)", "C"),
    R(["Tomate"], 3, "tomate (3)", "C"),
    R(["Cebolla"], 0, "cebolla (0)", "C"),
])

doc("c36fa908", "ARTEA 330 EC", 1, reglas=[
    R(["*"], 30, "Período de carencia: se recomienda dejar un intervalo de 30 días entre la última aplicación y la cosecha del cereal."),
])

doc("07f61bfe", "AXIAL 050 EC", 1, reglas=[R(["*"], "NA", "Período de carencia: no corresponde por la naturaleza de la aplicación.")])

doc("5f48ba32", "MODDUS EVO", 1, reglas=[
    R(["Trigo"], 60, "Período de carencia: 60 días para Trigo y 82 días para Cebada y Avena"),
    R(["Cebada", "Avena"], 82, "Período de carencia: 60 días para Trigo y 82 días para Cebada y Avena"),
])

doc("14258f30", "Eurolightning (Imazapir)", 4, notas=OCR, reglas=[
    R(["*"], "NA", "Períodos de carencias: No aplicable por el momento de aplicación."),
])

doc("3ee9dadf", "Frontier P", 3, notas=OCR + " «industrial}» es parte del nombre «Achicoria industrial» que vino partido en los datos.", reglas=[
    R(["Maíz"], "NA", "Período de Carencia: Para Maíz no corresponde debido a la forma de aplicación."),
    R(["Achicoria", "industrial}"], 58, "Achicoria industrial: 58 días."),
])

doc("63948e5c", "ELATUS", 1, enc={"C": "Período de carencia:"}, reglas=[
    R(["Trigo", "Cebada"], 35, "trigo, cebada: 35 días;", "C"),
    R(["Papa"], "NA", "papa: no corresponde por la forma y momento de aplicación.", "C"),
])

doc("3299db3c", "Dash HC", 2, notas="Coadyuvante: la carencia depende del producto con que se use.", reglas=[
    R(["*"], "COND", "Período de carencia Por la forma de uso, el período de carencia, depende del fitosanitario con que sea utlizado Dash® HC."),
])

doc("25509f7b", "GESAPRIM 90 WG", 1, reglas=[
    R(["*"], "NA", "Período de carencia: por corresponde por la naturaleza de la aplicación.",
      nota="La etiqueta dice «por corresponde» (error de tipeo evidente por «no corresponde»)."),
])

doc("65c3842a", "MINECTO STAR", 1, enc={"C": "Período de carencia: (días recomendados de espera entre la última aplicación y la cosecha):"}, reglas=[
    R(["Tomate"], 3, "tomate: 3;", "C"),
    R(["Papa"], 7, "papa: 7.", "C"),
])

doc("cae9ced7", "VIBRANCE", 6, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("fef19b8a", "SCORE BETA 475 EC", 1, reglas=[
    R(["Remolacha", "Achicoria Industrial"], 21,
      "Período de carencia: para remolacha y achicoria industrial se recomienda dejar un intervalo de 21 días entre la última aplicación y la cosecha."),
])

doc("9baa93f8", "FORTENZA SEMILLERO", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])
doc("7a7634a7", "FLEX", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("1957e1b9", "Break", 2, notas=OCR + " Coadyuvante: hay que respetar la carencia del producto con que se mezcle.", reglas=[
    R(["*"], "NA", ["Períodos de Carencias", "No aplicable. Se debe respetar la carencia del producto fitosanitario con que sea mezclado Break."]),
])

doc("7f2c6756", "DYNASTY 10 FS", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("b235dd94", "Caramba 90 SL", 2, enc={"C": "Período de carencia:"}, notas=OCR, reglas=[
    R(["Trigo", "Remolacha"], 42, "Trigo, remolacha, raps:42 días;", "C", corregida="Trigo, remolacha, raps: 42 días;"),
])

doc("6b47d5c8", "TRAXOS 050 EC", 1, reglas=[R(["*"], "NA", "Período de carencia: no corresponde por la naturaleza de la aplicación.")])

doc("e84ae296", "ORONDIS ULTRA", 1, reglas=[
    R(["Cebolla", "Tomate"], 7, "Período de carencia (días entre la última aplicación y la cosecha): cebolla, tomate: 7 días."),
])

doc("37cea1cd", "TOPIK 240 EC", 1, reglas=[R(["*"], "NA", "Período de carencia: no corresponde por la naturaleza de la aplicación.")])
doc("930b542c", "FALCON GOLD", 1, reglas=[R(["*"], "NA", NO_CORRESPONDE)])

doc("13429cf5", "ELIBRA", 1, reglas=[
    R(["Maíz"], 41, "Período de carencia: no aplicar en maíces con más de 8 hojas (41 días)."),
])

doc("cbc87a0e", "CELEST QUATTRO SEMILLERO", 1, reglas=[R(["*"], "NA", "Período de carencia: no se indica por la naturaleza de la aplicación.")])

doc("7e1cddf1", "SWITCH DRY", 1, reglas=[
    R(["Vid"], 2, "Período de carencia: en vides se recomienda dejar un intervalo de 2 días entre la última aplicación y la cosecha."),
])

doc("42f0c737", "CARIAL PLUS", 1, reglas=[
    R(["Papa"], 21, "Período de carencia (días entre la última aplicación y la cosecha): papas (21)."),
])

doc("7f0b0bce", "TASPA 500 EC", 1, reglas=[
    R(["Raps"], 30, "Período de carencia (días recomendados de espera entre la última aplicación y la cosecha): Raps: 30"),
])

doc("647d7f67", "Convey", 2, notas=OCR, reglas=[
    R(["Maíz"], 59, ["Períodos de carencias", "Respete carencia de 59 días."]),
])

doc("c8c84818", "AM GOLD 6", 5, reglas=[
    R(["*"], "NA", "Período de carencia: no corresponde debido a la naturaleza y época de aplicación."),
])
