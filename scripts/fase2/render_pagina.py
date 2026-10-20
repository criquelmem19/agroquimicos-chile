"""Convierte una página de un PDF en imagen PNG (para leer tablas a ojo). Requiere pypdfium2 y Pillow.

Uso:  python -I scripts/fase2/render_pagina.py <archivo.pdf> <pagina> <salida.png> [escala] [x0 y0 x1 y1]
La escala por defecto es 2.5 (~180 dpi). x0..y1 (fracciones 0-1 de ancho/alto) recortan una zona.
"""
import sys

import pypdfium2 as pdfium


def main():
    pdf, pagina, salida = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    escala = float(sys.argv[4]) if len(sys.argv) > 4 else 2.5
    doc = pdfium.PdfDocument(pdf)
    img = doc[pagina - 1].render(scale=escala).to_pil()
    if len(sys.argv) > 8:
        x0, y0, x1, y1 = (float(v) for v in sys.argv[5:9])
        w, h = img.size
        img = img.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    img.save(salida)
    print(salida, img.size)


if __name__ == "__main__":
    main()
