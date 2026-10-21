"""Mapa de carencias, lote 6 (extractor «carencia-fase2-v2», 21-10-2026): etiquetas cuya carencia no se
podía leer en la capa de texto del PDF. La página se leyó con OCR completo (ocr_paginas_completas.py),
se revisó a ojo contra la imagen y se reemplazó en el corpus (parchar_corpus.py)."""
from mapa_carencias import R, doc

V2 = "carencia-fase2-v2"

doc("6d8d554a", "Biocap", 2, extractor=V2,
    notas="La carencia está en una columna de la pág. 2 que no tiene capa de texto: leída con OCR y revisada contra la imagen.",
    reglas=[
    R(["*"], 0, "Carencia: No posee (0 días)."),
])

doc("bf76f814", "FALCON", 1, extractor=V2,
    notas="La capa de texto trae espacios dentro de las palabras («car encia»): página leída con OCR y revisada contra la imagen.",
    reglas=[
    R(["Trigo", "Cebada", "Papa"], "NA", "Período de carencia: no corresponde debido a la naturaleza de la aplicación."),
])
