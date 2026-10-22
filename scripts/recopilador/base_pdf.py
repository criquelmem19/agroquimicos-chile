"""Baja PDF que ya están en la base (bucket `etiquetas`) y les saca el texto e imágenes como a los del SAG.
Sirve para el piloto (comparar la extracción con lo que ya hay) y para revisar diferencias. Sin IA.

Uso:  <datos>/venv/Scripts/python.exe -I scripts/recopilador/base_pdf.py <document_id> [<document_id> ...]
Salida: <datos>/base/pdf/<document_id>.pdf y <datos>/base/texto/<document_id>/ (igual que textos.py).
El id para los JSON de extracción de estos documentos es «base:<document_id>».
"""
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textos  # noqa: E402
from comun import bajar, consola_utf8, lit, ruta, sha256_de, sql  # noqa: E402


def main():
    consola_utf8()
    ids = sys.argv[1:]
    docs = sql("select id, filename, storage_path, sha256 from public.documents where id in ("
               + ",".join(lit(i) for i in ids) + ")")
    for d in docs:
        pdf = ruta("base", "pdf", f"{d['id']}.pdf")
        if not os.path.exists(pdf):
            datos = bajar(urllib.parse.quote(d["storage_path"], safe=":/%"))
            if sha256_de(datos) != (d["sha256"] or "").strip():
                print(f"!! {d['id']}: el sha256 no coincide con el registrado")
            with open(pdf, "wb") as f:
                f.write(datos)
        r = textos.procesar({"id": d["id"]}, pdf=pdf, carpeta=os.path.dirname(ruta("base", "texto", d["id"], "x")))
        print(f"{d['id']} {d['filename']}: etiqueta {r['etiqueta']}, hds {r['hds']}, "
              f"sin texto {r['sin_texto']}, N° SAG {r['registro']}")


if __name__ == "__main__":
    main()
