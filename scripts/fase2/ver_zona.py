"""Recorta de la imagen de una página escaneada la zona donde el OCR leyó un texto, para revisarla a ojo.

Uso:  python -I scripts/fase2/ver_zona.py <carpeta_trabajo> <prefijo_doc> <pagina> <texto> [lineas_extra] [salida.png]
Busca la primera línea OCR que contiene <texto> (sin importar mayúsculas) y recorta desde ahí
hacia abajo <lineas_extra> líneas (por defecto 8), con un margen.
"""
import glob
import json
import os
import subprocess
import sys


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    trabajo, prefijo, pagina, texto = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4].lower()
    extra = int(sys.argv[5]) if len(sys.argv) > 5 else 8
    archivos = glob.glob(os.path.join(trabajo, "ocr", f"{prefijo}*_p{pagina}.json"))
    if not archivos:
        raise SystemExit("No hay OCR para esa página.")
    doc = os.path.basename(archivos[0]).rsplit("_p", 1)[0]
    salida = sys.argv[6] if len(sys.argv) > 6 else os.path.join(trabajo, "zonas", f"{doc}_p{pagina}_{texto[:20].replace(' ', '_')}.png")
    os.makedirs(os.path.dirname(salida), exist_ok=True)
    datos = json.load(open(archivos[0], encoding="utf-8-sig"))
    lineas = datos[0]["lineas"]
    i = next((k for k, l in enumerate(lineas) if texto in l["texto"].lower()), None)
    if i is None:
        raise SystemExit("No encontré ese texto en el OCR de la página.")
    grupo = lineas[i:i + extra + 1]
    x1 = min(l["x"] for l in grupo) - 40
    y1 = min(l["y"] for l in grupo) - 30
    x2 = max(l["x"] + l["ancho"] for l in grupo) + 40
    y2 = max(l["y"] + l["alto"] for l in grupo) + 30
    for l in grupo:
        print(l["texto"])
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "recortar.ps1")
    imagen = os.path.join(trabajo, "img", f"{doc}_p{pagina}.png")
    escala = min(1.0, 1800 / max(1, x2 - x1))
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script, "-Imagen", imagen,
                        "-X", str(x1), "-Y", str(y1), "-Ancho", str(x2 - x1), "-Alto", str(y2 - y1),
                        "-Salida", salida, "-Escala", str(escala)], capture_output=True)
    print(r.stdout.decode("utf-8", "replace").strip() or r.stderr.decode("utf-8", "replace")[:300])


if __name__ == "__main__":
    main()
