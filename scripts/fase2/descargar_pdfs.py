"""Descarga los PDF del bucket `etiquetas` a una carpeta local y verifica su sha256.

Uso:  python -I scripts/fase2/descargar_pdfs.py <carpeta_destino>

Lee la lista de documentos con la llave pública (la tabla `documents` es de lectura
pública). Guarda cada PDF como <document_id>.pdf y un documentos.json con los metadatos.
No usar una carpeta dentro de OneDrive: son ~100 MB.
"""
import hashlib
import json
import os
import sys
import urllib.parse
import urllib.request

URL = "https://cejkhfugaobfqnjpkgpl.supabase.co"
LLAVE = "sb_publishable_dzR4zTF-RcJGyw6Fq1LCRA_lAf1tpF8"


def api(ruta):
    pedido = urllib.request.Request(f"{URL}/rest/v1/{ruta}", headers={"apikey": LLAVE})
    with urllib.request.urlopen(pedido, timeout=60) as r:
        return json.load(r)


def sha256(ruta):
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for bloque in iter(lambda: f.read(1 << 20), b""):
            h.update(bloque)
    return h.hexdigest()


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    destino = sys.argv[1]
    os.makedirs(destino, exist_ok=True)
    docs = api("documents?select=id,product_id,document_type,filename,storage_path,page_count,sha256"
               "&storage_path=not.is.null&order=id")
    with open(os.path.join(destino, "documentos.json"), "w", encoding="utf-8") as f:
        json.dump(docs, f, ensure_ascii=False, indent=1)

    malos = []
    for i, d in enumerate(docs, 1):
        ruta = os.path.join(destino, d["id"] + ".pdf")
        esperado = (d["sha256"] or "").strip().lower()
        if not (os.path.exists(ruta) and sha256(ruta) == esperado):
            url = urllib.parse.quote(d["storage_path"], safe=":/%")
            with urllib.request.urlopen(url, timeout=120) as r, open(ruta, "wb") as f:
                f.write(r.read())
        real = sha256(ruta)
        estado = "ok" if real == esperado else f"HUELLA DISTINTA (esperada {esperado[:12]}, real {real[:12]})"
        if real != esperado:
            malos.append(d["id"])
        print(f"{i:3d}/{len(docs)} {d['id']} {os.path.getsize(ruta):>9,d} B {estado}", flush=True)
    print(f"Listo: {len(docs)} documentos, {len(malos)} con huella distinta.")


if __name__ == "__main__":
    main()
