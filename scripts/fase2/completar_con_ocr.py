"""Completa con OCR (Windows) las páginas que no tienen texto y arma un corpus único.

Uso:  python -I scripts/fase2/completar_con_ocr.py <carpeta_pdfs> <textos.json> <salida_corpus.json> <carpeta_trabajo>

Salida: {document_id: [{"pagina": N, "fuente": "pdf" | "ocr", "texto": "..."}]}
Las imágenes de las páginas leídas con OCR quedan en <carpeta_trabajo>/img para revisarlas a ojo.
"""
import json
import os
import subprocess
import sys

MINIMO = 80  # caracteres; bajo esto la página se considera sin texto


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    carpeta_pdfs, textos_json, salida, trabajo = sys.argv[1:5]
    script = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ocr_windows.ps1")
    with open(textos_json, encoding="utf-8") as f:
        textos = json.load(f)
    carpeta_ocr = os.path.join(trabajo, "ocr")
    carpeta_img = os.path.join(trabajo, "img")
    os.makedirs(carpeta_ocr, exist_ok=True)

    corpus = {}
    for doc, paginas in textos.items():
        vacias = [i + 1 for i, p in enumerate(paginas) if len(p.strip()) < MINIMO]
        ocr = {}
        # Una llamada por página: con muchas páginas seguidas el OCR de Windows a veces falla.
        for n in vacias:
            destino = os.path.join(carpeta_ocr, f"{doc}_p{n}.json")
            if not os.path.exists(destino):
                try:
                    r = subprocess.run(
                        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
                         "-Pdf", os.path.join(carpeta_pdfs, doc + ".pdf"), "-Paginas", str(n),
                         "-Salida", destino, "-CarpetaImagenes", carpeta_img],
                        capture_output=True, timeout=180)
                except subprocess.TimeoutExpired:
                    print("SIN OCR (demoró demasiado)", doc, n, flush=True)
                    continue
                if r.returncode != 0 or not os.path.exists(destino):
                    print("ERROR", doc, n, r.stderr.decode("utf-8", "replace")[:300], flush=True)
                    continue
            with open(destino, encoding="utf-8-sig") as f:
                for p in json.load(f):
                    ocr[p["pagina"]] = "\n".join(l["texto"] for l in (p.get("lineas") or []))
        if vacias:
            print(f"OCR {doc}: páginas {vacias}", flush=True)
        corpus[doc] = [
            {"pagina": i + 1, "fuente": "ocr", "texto": ocr[i + 1]} if (i + 1) in ocr
            else {"pagina": i + 1, "fuente": "pdf", "texto": p}
            for i, p in enumerate(paginas)
        ]
    with open(salida, "w", encoding="utf-8") as f:
        json.dump(corpus, f, ensure_ascii=False)
    n_ocr = sum(1 for v in corpus.values() for p in v if p["fuente"] == "ocr")
    print(f"Corpus listo: {len(corpus)} documentos, {n_ocr} páginas con OCR.")


if __name__ == "__main__":
    main()
