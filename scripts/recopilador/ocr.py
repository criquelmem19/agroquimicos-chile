"""Paso 2c del recopilador: OCR de las páginas sin texto (etiquetas escaneadas). Sin IA.

Uso:  <datos>/venv/Scripts/python.exe -I scripts/recopilador/ocr.py [--ids 1,2,3] [--todas]

- Busca en <datos>/sag/texto/*/paginas.json las páginas «sin_texto» de las filas en estado «texto»
  (o de --ids; --todas incluye también las páginas de la HDS).
- Renderiza cada página con pypdfium2 (venv de la carpeta de datos) y la lee con el OCR de Windows en
  español (scripts/fase2/ocr_imagen.ps1), una página por llamada y con tope de tiempo.
- Guarda <datos>/sag/texto/<id>/ocr_p<N>.json ({"texto", "lineas"}) y p<N>.jpg (imagen reducida, para que
  el subagente mire la página cuando el OCR no basta), reemplaza el texto de la página en lectura.json
  (fuente «ocr») y vuelve a clasificar las páginas y a escribir etiqueta.txt (textos.py).
"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textos  # noqa: E402
from comun import DATOS, consola_utf8, escribir_json, leer_json, ruta, sql  # noqa: E402

PS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fase2", "ocr_imagen.ps1")
MAX_LADO = 9000


def ocr_pagina(pdf_path, n, carpeta):
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_path)
    pagina = pdf[n - 1]
    escala = min(300 / 72, MAX_LADO / max(pagina.get_size()))
    imagen = pagina.render(scale=escala).to_pil()
    pdf.close()
    png = os.path.join(carpeta, f"ocr_p{n}.png")
    imagen.save(png)
    chica = imagen.copy()
    chica.thumbnail((textos.LADO_IMAGEN, textos.LADO_IMAGEN))
    chica.convert("RGB").save(os.path.join(carpeta, f"p{n}.jpg"), quality=82)
    salida = os.path.join(carpeta, f"ocr_p{n}_crudo.json")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS,
                        "-Imagen", png, "-Salida", salida], capture_output=True, text=True, timeout=300)
    os.remove(png)
    if not os.path.exists(salida):
        raise RuntimeError((r.stderr or r.stdout).strip()[:300])
    with open(salida, encoding="utf-8-sig") as f:
        lineas = json.load(f).get("lineas") or []
    os.remove(salida)
    if isinstance(lineas, str):
        lineas = [lineas]
    datos = {"texto": "\n".join(lineas), "lineas": lineas}
    escribir_json(os.path.join(carpeta, f"ocr_p{n}.json"), datos)
    return datos["texto"]


def main():
    consola_utf8()
    args = sys.argv[1:]
    todas = "--todas" in args
    if "--ids" in args:
        ids = [int(x) for x in args[args.index("--ids") + 1].split(",")]
    else:
        ids = [f["id"] for f in sql("select id from public.sag_inventario where estado = 'texto' "
                                    "and paginas_sin_texto > 0 order by prioridad nulls last, id")]
    print(f"Documentos con páginas sin texto: {len(ids)}", flush=True)
    resultados = []
    for k, doc in enumerate(ids, 1):
        carpeta = os.path.join(DATOS, "sag", "texto", str(doc))
        info = leer_json(os.path.join(carpeta, "paginas.json"))
        if not info:
            continue
        lectura = leer_json(os.path.join(carpeta, "lectura.json"))
        # Sin --todas, solo las páginas antes de que empiece la HDS (la parte de la etiqueta).
        inicio_hds = min([p["pagina"] for p in info if p["tipo"] == "hds"] or [10 ** 6])
        hechas = 0
        for p in info:
            if p["tipo"] != "sin_texto" or p["fuente"] == "ocr" or (not todas and p["pagina"] > inicio_hds):
                continue
            try:
                lectura[p["pagina"] - 1] = ocr_pagina(ruta("sag", "pdf", f"{doc}.pdf"), p["pagina"], carpeta)
                p["fuente"] = "ocr"
                hechas += 1
            except Exception as e:  # noqa: BLE001
                print(f"  {doc} pág. {p['pagina']}: sin OCR ({e})", flush=True)
        if hechas:
            escribir_json(os.path.join(carpeta, "lectura.json"), lectura)
            escribir_json(os.path.join(carpeta, "paginas.json"), info, indent=0)
        resultados.append(textos.procesar({"id": doc}, pdf=ruta("sag", "pdf", f"{doc}.pdf"), carpeta=carpeta))
        print(f"  {k}/{len(ids)} doc {doc}: {hechas} páginas con OCR", flush=True)
        if len(resultados) >= 20:
            textos.anotar(resultados)
            resultados = []
    textos.anotar(resultados)
    print("Cruce por N° SAG:", textos.cruzar_por_registro())


if __name__ == "__main__":
    main()
