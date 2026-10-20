"""Reemplaza en el corpus el texto de una página cuya capa de texto viene dañada (letras duplicadas o
revueltas) por el OCR de su imagen (ocr_imagen.ps1 sobre render_pagina.py).

Uso:  python -I scripts/fase2/parchar_corpus.py <corpus.json> <prefijo_doc> <pagina> <ocr.json>
"""
import json
import sys


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    corpus_json, prefijo, pagina, ocr_json = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
    corpus = json.load(open(corpus_json, encoding="utf-8"))
    doc = next(k for k in corpus if k.startswith(prefijo))
    lineas = json.load(open(ocr_json, encoding="utf-8-sig"))["lineas"]
    corpus[doc][pagina - 1] = {"pagina": pagina, "fuente": "ocr", "texto": "\n".join(lineas)}
    with open(corpus_json, "w", encoding="utf-8") as f:
        json.dump(corpus, f, ensure_ascii=False)
    print(f"{doc} pág. {pagina}: {len(lineas)} líneas de OCR")


if __name__ == "__main__":
    main()
