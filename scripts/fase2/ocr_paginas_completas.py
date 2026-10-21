"""OCR de páginas completas aunque tengan capa de texto: sirve cuando parte de la página es imagen
(BIOCAP pág. 2: la carencia estaba en una columna sin texto) o cuando la capa de texto viene con
espacios dentro de las palabras (FALCON: «car encia: no corres ponde»). Renderiza con pypdfium2 y lee
con el OCR de Windows (ocr_imagen.ps1), una página por llamada y con tope de tiempo.

Uso:  <python del venv con pypdfium2> -I scripts/fase2/ocr_paginas_completas.py <carpeta_pdfs> <carpeta_salida> [<prefijo_doc>[:paginas] ...]
      paginas: lista separada por comas (ej. 6d8d554a:2). Sin ella, todas. Sin prefijos, todos los PDF.
Salida: <carpeta_salida>/<document_id>_p<N>.png y .json ({"lineas": [...]}). No repite páginas ya leídas.
"""
import os
import subprocess
import sys

import pypdfium2 as pdfium

AQUI = os.path.dirname(os.path.abspath(__file__))
MAX_LADO = 9000  # el OCR de Windows rechaza imágenes de más de ~10.000 px por lado


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    carpeta_pdfs, salida, pedidos = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(salida, exist_ok=True)
    pdfs = sorted(f for f in os.listdir(carpeta_pdfs) if f.endswith(".pdf"))
    for pedido in pedidos or [f[:-4] for f in pdfs]:
        prefijo, _, lista = pedido.partition(":")
        nombre = next(f for f in pdfs if f.startswith(prefijo))
        doc_id = nombre[:-4]
        pdf = pdfium.PdfDocument(os.path.join(carpeta_pdfs, nombre))
        paginas = [int(x) for x in lista.split(",")] if lista else range(1, len(pdf) + 1)
        for n in paginas:
            base = os.path.join(salida, f"{doc_id}_p{n}")
            if os.path.exists(base + ".json"):
                continue
            pagina = pdf[n - 1]
            escala = min(4.0, MAX_LADO / max(pagina.get_size()))
            pagina.render(scale=escala).to_pil().save(base + ".png")
            try:
                r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                                    os.path.join(AQUI, "ocr_imagen.ps1"), "-Imagen", base + ".png", "-Salida", base + ".json"],
                                   capture_output=True, text=True, timeout=300)
                print(f"{doc_id[:8]} pág. {n}: {r.stdout.strip() or r.stderr.strip()[:200]}", flush=True)
            except subprocess.TimeoutExpired:
                print(f"{doc_id[:8]} pág. {n}: tiempo agotado", flush=True)


if __name__ == "__main__":
    main()
