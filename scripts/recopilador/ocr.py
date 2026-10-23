"""Paso 2c del recopilador: OCR de las páginas sin texto (etiquetas escaneadas). Sin IA.

Uso:  <datos>/venv/Scripts/python.exe -I scripts/recopilador/ocr.py [--ids 1,2,3] [--todas] [--rehacer] [--mejorar]
          [--tesseract] [--forzar]

- Busca en <datos>/sag/texto/*/paginas.json las páginas «sin_texto» de las filas en estado «texto»
  (o de --ids; --todas incluye también las páginas de la HDS; --rehacer repite las que ya pasaron por OCR
  y siguen sin texto; --mejorar repite todas las que pasaron por OCR antes del 23-10-2026, con la lectura
  nueva: no usarlo en etiquetas ya extraídas sin cargar, porque sus citas salieron del OCR anterior).
- Si casi no lee letras, prueba la página girada (escaneos de lado) y guarda el giro en ocr_p<N>.json.
- Lee la página a ~7.000 px y también en 4 partes (2×2, con borde): a 300 ppp (3.500 px) el OCR de Windows
  leía basura en los escaneos (PUNTO 70 WP: 127 palabras contra 923). Se queda con la lectura con más letras.
- Segunda lectura con Tesseract (modo texto disperso, --psm 11; <datos>/tessdata con spa de tessdata_best):
  lee las cifras sueltas de los cuadros que Windows se salta («Vides», «10-15» en PUNTO 70 WP), y Windows
  algunas que Tesseract no. Se guarda en ocr_p<N>.json («tesseract») y se agrega al texto de la página después
  de una línea «--- segunda lectura (Tesseract) ---». --tesseract la agrega a las páginas OCR que no la tienen
  (sin repetir la de Windows); con --forzar y --ids, también a las páginas de etiqueta con capa de texto (cuadro
  de usos que es una imagen dentro de una página con texto, como la 409).
- Renderiza cada página con pypdfium2 (venv de la carpeta de datos) y la lee con el OCR de Windows en
  español (scripts/fase2/ocr_imagen.ps1), una página por llamada y con tope de tiempo.
- Guarda <datos>/sag/texto/<id>/ocr_p<N>.json ({"texto", "lineas"}) y p<N>.jpg (imagen reducida, para que
  el subagente mire la página cuando el OCR no basta), reemplaza el texto de la página en lectura.json
  (fuente «ocr») y vuelve a clasificar las páginas y a escribir etiqueta.txt (textos.py).
"""
import json
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import textos  # noqa: E402
from comun import DATOS, consola_utf8, escribir_json, leer_json, ruta, sql  # noqa: E402

PS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fase2", "ocr_imagen.ps1")
TESSERACT = r"C:\Program Files\Tesseract-OCR\tesseract.exe"  # winget UB-Mannheim.TesseractOCR 5.4.0
TESSDATA = os.path.join(DATOS, "tessdata")
SEPARADOR = textos.SEPARADOR
MAX_LADO = 9000
LADO_OCR = 7000  # px del lado mayor para leer (el OCR de Windows acepta hasta 10.000)
BORDE = 60  # px que se repiten entre las partes del mosaico, para no cortar letras
MIN_LETRAS = 200  # menos que esto: la página puede estar escaneada de lado


def leer_imagen(imagen, carpeta, n):
    """OCR de Windows sobre una imagen PIL; devuelve las líneas leídas."""
    png = os.path.join(carpeta, f"ocr_p{n}.png")
    imagen.save(png)
    salida = os.path.join(carpeta, f"ocr_p{n}_crudo.json")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", PS,
                        "-Imagen", png, "-Salida", salida], capture_output=True, text=True, timeout=300)
    os.remove(png)
    if not os.path.exists(salida):
        raise RuntimeError((r.stderr or r.stdout).strip()[:300])
    with open(salida, encoding="utf-8-sig") as f:
        lineas = json.load(f).get("lineas") or []
    os.remove(salida)
    return [lineas] if isinstance(lineas, str) else lineas


def leer_tesseract(imagen, carpeta, n):
    """Tesseract en español, modo texto disperso; devuelve el texto sin líneas en blanco ("" si no está)."""
    if not os.path.exists(TESSERACT):
        return ""
    png = os.path.join(carpeta, f"tess_p{n}.png")
    imagen.convert("L").save(png)
    try:
        r = subprocess.run([TESSERACT, png, "stdout", "--tessdata-dir", TESSDATA, "-l", "spa", "--psm", "11"],
                           capture_output=True, timeout=900)
    finally:
        os.remove(png)
    return re.sub(r"\n\s*\n+", "\n", r.stdout.decode("utf-8", errors="replace")).strip()


def con_tesseract(texto, tess):
    base = (texto or "").split(SEPARADOR)[0]
    return base + SEPARADOR + tess if tess else base


def agregar_tesseract(pdf_path, n, carpeta, texto):
    """Solo la segunda lectura, con el giro ya guardado: devuelve el texto de la página con ella al final."""
    import pypdfium2 as pdfium
    ocr = leer_json(os.path.join(carpeta, f"ocr_p{n}.json")) or {"texto": "", "lineas": [], "giro": 0}
    pdf = pdfium.PdfDocument(pdf_path)
    pagina = pdf[n - 1]
    imagen = pagina.render(scale=min(LADO_OCR, MAX_LADO) / max(pagina.get_size())).to_pil()
    pdf.close()
    if ocr.get("giro"):
        imagen = imagen.rotate(ocr["giro"], expand=True)
    ocr["tesseract"] = leer_tesseract(imagen, carpeta, n)
    escribir_json(os.path.join(carpeta, f"ocr_p{n}.json"), ocr)
    return con_tesseract(texto, ocr["tesseract"])


def letras(lineas):
    return sum(c.isalpha() for linea in lineas for c in linea)


def leer_mosaico(imagen, carpeta, n, partes=2):
    """OCR de la imagen en partes × partes trozos (de arriba abajo, de izquierda a derecha)."""
    ancho, alto = imagen.size
    lineas = []
    for i in range(partes):
        for j in range(partes):
            caja = (max(0, ancho * j // partes - BORDE), max(0, alto * i // partes - BORDE),
                    min(ancho, ancho * (j + 1) // partes + BORDE), min(alto, alto * (i + 1) // partes + BORDE))
            lineas += leer_imagen(imagen.crop(caja), carpeta, n)
    return lineas


def ocr_pagina(pdf_path, n, carpeta):
    """Si la página derecha casi no da texto, prueba girada (etiquetas escaneadas de lado) y se queda con
    el giro que más letras lee. p<N>.jpg se guarda con ese giro, para que el subagente la vea derecha."""
    import pypdfium2 as pdfium
    pdf = pdfium.PdfDocument(pdf_path)
    pagina = pdf[n - 1]
    escala = min(LADO_OCR, MAX_LADO) / max(pagina.get_size())
    imagen = pagina.render(scale=escala).to_pil()
    pdf.close()
    giro, lineas = 0, leer_imagen(imagen, carpeta, n)
    if letras(lineas) < MIN_LETRAS:
        for g in (270, 90, 180):  # PIL gira en sentido antihorario: 270 = 90° a la derecha
            otras = leer_imagen(imagen.rotate(g, expand=True), carpeta, n)
            if letras(otras) > letras(lineas):
                giro, lineas = g, otras
    derecha = imagen.rotate(giro, expand=True) if giro else imagen
    mosaico = leer_mosaico(derecha, carpeta, n)
    lectura = "mosaico" if letras(mosaico) > letras(lineas) else "pagina"
    if lectura == "mosaico":
        lineas = mosaico
    chica = derecha.copy()
    chica.thumbnail((textos.LADO_IMAGEN, textos.LADO_IMAGEN))
    chica.convert("RGB").save(os.path.join(carpeta, f"p{n}.jpg"), quality=82)
    datos = {"texto": "\n".join(lineas), "lineas": lineas, "giro": giro, "lectura": lectura, "lado": LADO_OCR,
             "tesseract": leer_tesseract(derecha, carpeta, n)}
    escribir_json(os.path.join(carpeta, f"ocr_p{n}.json"), datos)
    return con_tesseract(datos["texto"], datos["tesseract"])


def main():
    consola_utf8()
    args = sys.argv[1:]
    todas = "--todas" in args
    rehacer = "--rehacer" in args
    mejorar = "--mejorar" in args
    tesseract = "--tesseract" in args
    forzar = "--forzar" in args and "--ids" in args
    if "--ids" in args:
        ids = [int(x) for x in args[args.index("--ids") + 1].split(",")]
    elif mejorar or tesseract:
        ids = [f["id"] for f in sql("select id from public.sag_inventario where estado = 'texto' "
                                    "order by prioridad nulls last, id")]
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
            previo = leer_json(os.path.join(carpeta, f"ocr_p{p['pagina']}.json")) or {}
            mejorable = mejorar and p["fuente"] == "ocr" and previo.get("lado") != LADO_OCR
            sin_tess = tesseract and "tesseract" not in previo and (p["fuente"] == "ocr" or
                                                                     (forzar and p["tipo"] == "etiqueta"))
            if not (mejorable or sin_tess) and (p["tipo"] != "sin_texto" or (p["fuente"] == "ocr" and not rehacer)) \
                    or (not todas and p["pagina"] > inicio_hds):
                continue
            pdf = ruta("sag", "pdf", f"{doc}.pdf")
            try:
                if sin_tess and not mejorable and p["tipo"] != "sin_texto":
                    lectura[p["pagina"] - 1] = agregar_tesseract(pdf, p["pagina"], carpeta, lectura[p["pagina"] - 1])
                else:
                    lectura[p["pagina"] - 1] = ocr_pagina(pdf, p["pagina"], carpeta)
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
