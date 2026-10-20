"""Extrae el texto de cada página de los PDF con pdftotext.

Uso:  python -I scripts/fase2/extraer_texto.py <carpeta_pdfs> <salida.json> [lectura|layout|raw]

Modo por defecto: "lectura" (orden de lectura; separa las columnas de la etiqueta y deja
párrafos limpios, lo mejor para buscar la carencia). "layout" conserva la posición en la página.

La salida es {document_id: [texto_pagina_1, texto_pagina_2, ...]}.
Muestra las páginas con muy poco texto (probablemente escaneadas: hay que leerlas como imagen u OCR).
"""
import json
import os
import shutil
import subprocess
import sys

POSIBLES = [r"C:\Program Files\Git\mingw64\bin\pdftotext.exe", "/mingw64/bin/pdftotext"]


def ejecutable():
    exe = shutil.which("pdftotext")
    if exe:
        return exe
    for p in POSIBLES:
        if os.path.exists(p):
            return p
    raise SystemExit("No encontré pdftotext (viene con Git for Windows).")


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    carpeta, salida = sys.argv[1], sys.argv[2]
    modo = sys.argv[3] if len(sys.argv) > 3 else "lectura"
    opciones = {"lectura": [], "layout": ["-layout"], "raw": ["-raw"]}[modo]
    exe = ejecutable()
    with open(os.path.join(carpeta, "documentos.json"), encoding="utf-8") as f:
        docs = json.load(f)
    resultado = {}
    escaneadas = []
    for d in docs:
        pdf = os.path.join(carpeta, d["id"] + ".pdf")
        r = subprocess.run([exe, *opciones, "-enc", "UTF-8", pdf, "-"], capture_output=True, timeout=180)
        texto = r.stdout.decode("utf-8", errors="replace")
        paginas = texto.split("\f")
        if paginas and not paginas[-1].strip():
            paginas = paginas[:-1]
        resultado[d["id"]] = paginas
        for i, p in enumerate(paginas, 1):
            if len(p.strip()) < 80:
                escaneadas.append((d["id"], i, len(p.strip())))
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(resultado, f, ensure_ascii=False)
    total = sum(len(p) for p in resultado.values())
    print(f"{len(resultado)} documentos, {total} páginas.")
    print(f"Páginas con muy poco texto: {len(escaneadas)}")
    for doc, pag, n in escaneadas:
        print(f"  {doc} pág. {pag}: {n} caracteres")


if __name__ == "__main__":
    main()
