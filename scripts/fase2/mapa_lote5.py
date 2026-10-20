"""Mapa de carencias, lote 5: etiquetas con la carencia como columna del cuadro de usos.
Cada valor se leyó en la imagen de la página (render_pagina.py) y la cita junta las partes literales:
celda de cultivo … encabezado de la columna … valor."""
from mapa_carencias import R, doc

TABLA = "Valor leído en la columna de carencia del cuadro de usos, revisado contra la imagen de la página."

doc("e73f6fd6", "GRANDEVO WG", 2, notas=TABLA, reglas=[
    R(["*"], "NA", ["Carencia (Días)", "N.C.: No corresponde."]),
])

doc("544733e7", "Fast Plus", 2, enc={"C": "CARENCIA (días)"}, notas=TABLA, reglas=[
    R(["Peral", "Manzano", "Membrillero"], 10, ["Peral, Manzano, Membrillo", "CARENCIA (días)", "10"]),
    R(["Vid"], 10, "Vid: 10 Kiwi: 14", "C"),
    R(["Kiwi"], 14, "Vid: 10 Kiwi: 14", "C"),
    R(["Frambuesa", "Frutilla", "Mora"], 3, "Frambuesa: 3, Frutilla: 3 Arándano: 10, Zarzaparrilla: 10, Mora: 3", "C"),
    R(["Arándano", "Zarzaparrila"], 10, "Frambuesa: 3, Frutilla: 3 Arándano: 10, Zarzaparrilla: 10, Mora: 3", "C"),
    R(["Almendro", "Nectarino", "Cerezo", "Damasco", "Duraznero"], 7, "Almendro, Nectarino, Cerezo, Damasco, Durazno: 7 Nogal: 14, Ciruelo: 21", "C"),
    R(["Nogal"], 14, "Almendro, Nectarino, Cerezo, Damasco, Durazno: 7 Nogal: 14, Ciruelo: 21", "C"),
    R(["Ciruelo"], 21, "Almendro, Nectarino, Cerezo, Damasco, Durazno: 7 Nogal: 14, Ciruelo: 21", "C"),
    R(["Naranjo", "Limonero", "Pomelo", "Mandarino", "Clementina", "Tangelo"], 7, ["Naranjo, Limonero, Pomelo, Mandarina, Clementina, Tangelo", "CARENCIA (días)", "7"]),
    R(["Granado"], 18, ["Granados", "CARENCIA (días)", "18"]),
    R(["Palto", "Chirimoyo"], 14, ["Palto, Chirimoyo", "CARENCIA (días)", "14"]),
    R(["Tomate", "Pimiento"], 3, "Tomate: 3, Pimiento: 3, Apio: 10", "C"),
    R(["Apio"], 10, "Tomate: 3, Pimiento: 3, Apio: 10", "C"),
    R(["Melón", "Sandía", "Zapallito Pepino"], 3, "Melón, Sandía, Zapallito, Pepino: 3 Zapallo: 7", "C"),
    R(["Zapallo"], 7, "Melón, Sandía, Zapallito, Pepino: 3 Zapallo: 7", "C"),
    R(["Remolacha azucarera", "Betarraga", "Acelga", "Espinaca", "Arveja", "Lechuga"], 10,
      ["Remolacha azucarera, Betarraga, Acelga, Espinaca, Arveja, Lechuga", "CARENCIA (días)", "10"]),
    R(["Maíz"], 18, ["Maiz", "CARENCIA (días)", "18"]),
    R(["Clavel", "Rosal", "Crisantemo"], "NA", ["Clavel, Rosa, Crisantemo", "N.C.: No Corresponde."]),
    R(["Kale"], 5, ["Kale", "CARENCIA (días)", "5"]),
])

doc("7bd96a72", "Strepto Plus", 2, notas=TABLA, reglas=[
    R(["*"], "NA", ["CARENCIA", "NC: No corresponde por época de aplicación."]),
    R(["Nogal"], 120, ["Nogal", "CARENCIA", "120"], prioridad=2),
])

doc("b1103b4a", "Consul 65 WP", 1, notas=TABLA, reglas=[
    R(["Manzano", "Peral"], 7, ["MANZANO PERAL", "CARENCIA (días) 7"]),
    R(["Duraznero", "Nectarino"], 11, ["DURAZNERO NECTARINO", "CARENCIA (días)", "11"]),
    R(["Cerezo"], 11, ["CEREZO", "CARENCIA (días)", "11"]),
    R(["Kiwi"], 11, ["KIWI", "CARENCIA (días)", "11"]),
    R(["Olivo"], 244, ["OLIVO", "Carencia (días) 244"]),
])

doc("563df7aa", "SPIRIT 500 SC", 3, enc={"C": "Carencia (Días)"}, notas=TABLA, reglas=[
    R(["Naranjo", "Mandarino", "Manzano", "Nectarino", "Cerezo"], 5, ["Carencia (Días) 5 5 5 5"]),
    R(["Almendro"], 3, ["Almendro", "Carencia (Días) 5 5 5 5 3 3"]),
    R(["Nogal"], 1, ["Nogal", "Carencia (Días) 5 5 5 5 3 3 1"]),
])

doc("a6a39d9e", "CUPROFORTE", 3, notas="La capa de texto del PDF viene dañada: la página se leyó con OCR desde la imagen y se revisó a ojo.", reglas=[
    R(["*"], "NA", "Período de carencia: CUPROFORTE@ no tiene restricciones de carencia.",
      corregida="Período de carencia: CUPROFORTE® no tiene restricciones de carencia."),
])
