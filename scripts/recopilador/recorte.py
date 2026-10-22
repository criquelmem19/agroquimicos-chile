"""Acercamiento de una zona de una página (para cuando la letra del cuadro se ve muy chica en p<N>.jpg).

Uso:  <datos>/venv/Scripts/python.exe -I scripts/recopilador/recorte.py <id> <pagina> <x0> <y0> <x1> <y1>
      x0 y0 x1 y1: fracciones de la página (0 a 1) desde la esquina superior izquierda.
      <id>: N° del inventario (PDF en <datos>/sag/pdf/<id>.pdf) o ruta completa a un PDF.
Escribe <carpeta del texto>/zoom_p<pagina>_<x0>_<y0>.jpg (~2000 px de ancho) e imprime la ruta.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, leer_json  # noqa: E402


def main():
    doc, pagina = sys.argv[1], int(sys.argv[2])
    x0, y0, x1, y1 = (float(v) for v in sys.argv[3:7])
    import pypdfium2 as pdfium
    if os.path.exists(doc):
        pdf_path, carpeta = doc, os.path.dirname(os.path.abspath(doc))
    else:
        pdf_path = os.path.join(DATOS, "sag", "pdf", f"{doc}.pdf")
        carpeta = os.path.join(DATOS, "sag", "texto", doc)
    # Página escaneada de lado: ocr.py la giró y p<N>.jpg quedó derecha; las fracciones se miden sobre esa.
    giro = leer_json(os.path.join(carpeta, f"ocr_p{pagina}.json"), {}).get("giro", 0)
    pdf = pdfium.PdfDocument(pdf_path)
    p = pdf[pagina - 1]
    ancho, alto = p.get_size()
    if giro in (90, 270):
        ancho = alto
    escala = min(8.0, 2000 / (ancho * max(0.05, x1 - x0)))
    imagen = p.render(scale=escala).to_pil()
    if giro:
        imagen = imagen.rotate(giro, expand=True)
    w, h = imagen.size
    recorte = imagen.crop((int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)))
    salida = os.path.join(carpeta, f"zoom_p{pagina}_{x0:.2f}_{y0:.2f}.jpg")
    recorte.convert("RGB").save(salida, quality=85)
    print(salida)


if __name__ == "__main__":
    main()
