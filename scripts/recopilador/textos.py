"""Paso 2b del recopilador: texto por página de los PDF bajados, sin IA.

Uso:  python -I scripts/recopilador/textos.py [--ids 1,2,3] [--rehacer]

Para cada fila «descargado» del inventario (o las de --ids):
- pdftotext en orden de lectura y con disposición física (-layout), una entrada por página.
- Marca las páginas sin texto (< 80 caracteres: escaneadas, van a ocr.py) y clasifica cada página
  como etiqueta, hds (hoja de datos de seguridad) u otro (resoluciones, portadas) con palabras clave.
- Lee del texto, con expresiones regulares: N° de autorización SAG y si dice «solo para exportación».
- Escribe en <datos>/sag/texto/<id>/: lectura.json y layout.json (lista de páginas), paginas.json
  (por página: caracteres, tipo, fuente) y etiqueta.txt / hds.txt (lo que leen los subagentes, con
  marcas «=== PÁGINA N ===»).
- Anota en la base: estado «texto» (o «no_etiqueta» si ninguna página es de etiqueta y todas tienen
  texto), páginas, N° SAG y el cruce firme con la planilla de autorizados, cancelados y productos ya
  cargados. Al final marca «version_anterior» las etiquetas más antiguas de un mismo N° SAG.
"""
import collections
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oficiales  # noqa: E402
from comun import consola_utf8, escribir_json, leer_json, lit, pdftotext, ruta, sql  # noqa: E402
from descargar import marcar_duplicados  # noqa: E402

MINIMO = 80
SEPARADOR = "\n--- segunda lectura (Tesseract) ---\n"  # ocr.py: el texto de Tesseract va después
HDS = [r"hoja de datos de seguridad", r"hoja de seguridad", r"ficha (?:de|con) datos de seguridad", r"safety data sheet",
       r"\bm?sds\b", r"\bhds\b", r"\bfds\b", r"nch\s*2245", r"secci[oó]n\s*(?:n[°º]\s*)?\d{1,2}\s*[:.\-]",
       r"identificaci[oó]n del producto(?: qu[ií]mico)? y (?:del proveedor|de la (?:compa[ñn][ií]a|empresa))",
       r"identificaci[oó]n de (?:los )?peligros", r"propiedades f[ií]sicas y qu[ií]micas", r"estabilidad y reactividad",
       r"informaci[oó]n toxicol[oó]gica", r"informaci[oó]n ecol[oó]gica", r"informaci[oó]n (?:sobre|relativa al?) (?:el )?transporte",
       r"informaci[oó]n reglamentaria", r"control(?:es)? de (?:la )?exposici[oó]n", r"medidas (?:para|de) (?:la )?lucha contra (?:el )?(?:incendio|fuego)",
       r"medidas (?:que se deben tomar )?en caso de (?:derrame|vertido)", r"manipulaci[oó]n y almacenamiento",
       r"composici[oó]n\s*/\s*informaci[oó]n", r"consideraciones (?:sobre|relativas a) (?:la )?(?:disposici[oó]n|eliminaci[oó]n)"]
ETIQUETA = [r"instrucciones de uso", r"cuadro de (?:instrucciones|usos)", r"per[ií]odo de carencia", r"carencia",
            r"reingreso", r"lea (?:atenta|cuidadosa)mente (?:la|esta) etiqueta", r"autorizaci[oó]n (?:del )?servicio agr[ií]cola",
            r"autorizaci[oó]n s\.?a\.?g", r"\bdosis\b", r"mojamiento", r"compatibilidad", r"fitotoxicidad",
            r"precauciones", r"contenido neto", r"triple lavado", r"en caso de intoxicaci[oó]n", r"\bcultivos?\b",
            r"no inflamable|no corrosivo|no explosivo", r"manejo de (?:la )?resistencia"]
RESOLUCION = [r"resoluci[oó]n exenta", r"\bvistos?\s*:", r"\bconsiderando\s*:", r"\bresuelvo\s*:", r"an[oó]tese"]
REGISTRO = [
    re.compile(r"autorizaci[oó]n\s+(?:del\s+)?(?:servicio\s+agr[ií]cola\s+y\s+ganadero|s\.?\s?a\.?\s?g\.?)[\s,:]*"
               r"(?:\(?s\.?a\.?g\.?\)?\s*)?(?:n[°ºo]\.?|nro\.?|n[uú]mero|no\.)?\s*:?\s*(\d[\d.]{2,6}(?:-\d)?)\b", re.I),
    re.compile(r"(?:registro|autorizaci[oó]n)\s+s\.?\s?a\.?\s?g\.?\s*(?:n[°ºo]\.?|nro\.?)?\s*:?\s*(\d[\d.]{2,6}(?:-\d)?)\b", re.I),
    re.compile(r"(?:n[°ºo]\.?|nro\.?)\s*(?:de\s+)?(?:autorizaci[oó]n|registro)\s*(?:s\.?a\.?g\.?)?\s*:?\s*(\d[\d.]{2,6}(?:-\d)?)\b", re.I),
]
EXPORTACION = re.compile(r"(?:s[oó]lo|solamente|exclusivo|exclusivamente|uso exclusivo)\s+(?:para\s+)?(?:la\s+)?exportaci[oó]n"
                         r"|producto\s+(?:para|de)\s+exportaci[oó]n|prohibid[oa]\s+su\s+(?:venta\s+y\s+)?uso\s+en\s+chile", re.I)


def paginas_pdf(pdf, modo):
    opciones = {"lectura": [], "layout": ["-layout"]}[modo]
    r = subprocess.run([pdftotext(), *opciones, "-enc", "UTF-8", pdf, "-"], capture_output=True, timeout=300)
    paginas = r.stdout.decode("utf-8", errors="replace").split("\f")
    if paginas and not paginas[-1].strip():
        paginas = paginas[:-1]
    return paginas


def puntaje(texto, patrones):
    t = texto.lower()
    return sum(1 for p in patrones if re.search(p, t))


FIRMA_HDS = re.compile(r"nch\s*2245|hoja\s+de\s+(?:datos\s+de\s+)?seguridad|ficha\s+(?:de|con)\s+datos\s+de\s+seguridad|"
                       r"safety\s+data\s+sheet|\(\s*m?sds\s*\)|\(\s*fds\s*\)|\bhds\b", re.I)


def clasificar(paginas):
    """La HDS suele venir después de la etiqueta y repite un encabezado en cada página («NCh2245»,
    «Hoja de datos de seguridad»). Desde la primera página con esa firma (o con 3+ secciones típicas de
    HDS y pocas palabras de etiqueta) todo es HDS, salvo una página que sea claramente de etiqueta."""
    tipos, firma = [], []
    for t in paginas:
        h, e, r = puntaje(t, HDS), puntaje(t, ETIQUETA), puntaje(t, RESOLUCION)
        cabeza = " ".join(t.strip().splitlines()[:6])
        es_hds = bool(FIRMA_HDS.search(cabeza)) or (h >= 3 and e <= 3) or (h >= 5 and h > e)
        firma.append(es_hds)
        if len(re.sub(r"\s", "", t)) < MINIMO:
            tipos.append("sin_texto")
        elif r >= 2 and e < 4:
            tipos.append("otro")
        else:
            tipos.append((h, e))
    inicio_hds = next((i for i, (x, f) in enumerate(zip(tipos, firma)) if f and x != "sin_texto"), None)
    for i, x in enumerate(tipos):
        if not isinstance(x, tuple):
            continue
        h, e = x
        if inicio_hds is None or i < inicio_hds:
            tipos[i] = "etiqueta" if e >= 1 or h <= 1 else "otro"
        else:
            tipos[i] = "etiqueta" if (not firma[i] and e >= 5 and h <= 1) else "hds"
    return tipos


def registro(textos):
    vistos = collections.Counter()
    for t in textos:
        plano = re.sub(r"\s+", " ", t)
        for p in REGISTRO:
            for m in p.finditer(plano):
                n = oficiales.nsag(m.group(1))
                if n and 3 <= len(n.split("-")[0]) <= 5:
                    vistos[n] += 1
    return vistos.most_common(1)[0][0] if vistos else None


LADO_IMAGEN = 2000  # px del lado mayor: a este tamaño se leen los cuadros de uso de una etiqueta de ~33 cm


def imagenes(pdf_path, numeros, carpeta):
    """p<N>.jpg de las páginas de etiqueta, para que el subagente vea la estructura de los cuadros
    (las celdas de varias líneas se descuadran en el texto). Requiere pypdfium2 (venv de los datos)."""
    faltan = [n for n in numeros if not os.path.exists(os.path.join(carpeta, f"p{n}.jpg"))]
    if not faltan:
        return
    try:
        import pypdfium2 as pdfium
    except ImportError:
        return
    pdf = pdfium.PdfDocument(pdf_path)
    for n in faltan:
        pagina = pdf[n - 1]
        imagen = pagina.render(scale=LADO_IMAGEN / max(pagina.get_size())).to_pil()
        imagen.convert("RGB").save(os.path.join(carpeta, f"p{n}.jpg"), quality=82)
    pdf.close()


def archivo_lectura(paginas, numeros, fuentes):
    partes = []
    for n in numeros:
        partes.append(f"=== PÁGINA {n}{' (OCR)' if fuentes[n - 1] == 'ocr' else ''} ===\n{paginas[n - 1].strip()}\n")
    return "\n".join(partes)


def procesar(fila, rehacer=False, pdf=None, carpeta=None):
    """fila = {"id": ...} del inventario. pdf y carpeta permiten procesar otros PDF (ej. los del bucket)."""
    carpeta = carpeta or os.path.dirname(ruta("sag", "texto", str(fila["id"]), "x"))
    os.makedirs(carpeta, exist_ok=True)
    pdf = pdf or ruta("sag", "pdf", f"{fila['id']}.pdf")
    previo = leer_json(os.path.join(carpeta, "paginas.json"))
    if previo and not rehacer:
        lectura = leer_json(os.path.join(carpeta, "lectura.json"))
        fuentes = [p["fuente"] for p in previo]
    else:
        lectura = paginas_pdf(pdf, "lectura")
        escribir_json(os.path.join(carpeta, "lectura.json"), lectura)
        escribir_json(os.path.join(carpeta, "layout.json"), paginas_pdf(pdf, "layout"))
        fuentes = ["pdf"] * len(lectura)
        # El OCR de ocr.py se conserva si ya existía
        for n, p in enumerate(previo or [], 1):
            ocr = leer_json(os.path.join(carpeta, f"ocr_p{n}.json"), {})
            if p.get("fuente") == "ocr" and n <= len(lectura):
                fuentes[n - 1] = "ocr"
                lectura[n - 1] = ocr.get("texto", lectura[n - 1])
            if ocr.get("tesseract") and n <= len(lectura):  # segunda lectura (ocr.py), también en páginas con texto
                lectura[n - 1] += SEPARADOR + ocr["tesseract"]
    tipos = clasificar(lectura)
    info = [{"pagina": i + 1, "caracteres": len(re.sub(r"\s", "", t)), "tipo": tipos[i], "fuente": fuentes[i]}
            for i, t in enumerate(lectura)]
    escribir_json(os.path.join(carpeta, "paginas.json"), info, indent=0)
    etiqueta = [p["pagina"] for p in info if p["tipo"] == "etiqueta"]
    hds = [p["pagina"] for p in info if p["tipo"] == "hds"]
    sin_texto = [p["pagina"] for p in info if p["tipo"] == "sin_texto"]
    with open(os.path.join(carpeta, "etiqueta.txt"), "w", encoding="utf-8") as f:
        f.write(archivo_lectura(lectura, etiqueta, fuentes))
    with open(os.path.join(carpeta, "hds.txt"), "w", encoding="utf-8") as f:
        f.write(archivo_lectura(lectura, hds, fuentes))
    imagenes(pdf, etiqueta, carpeta)
    textos_etiqueta = [lectura[n - 1] for n in (etiqueta or range(1, len(lectura) + 1))]
    exportacion = None
    for t in textos_etiqueta:
        m = EXPORTACION.search(re.sub(r"\s+", " ", t))
        if m:
            exportacion = m.group(0)
            break
    if etiqueta:
        estado, motivo = "texto", None
    elif sin_texto:
        estado, motivo = "texto", "Páginas sin texto: falta OCR (ocr.py)"
    else:
        estado, motivo = "no_etiqueta", "Ninguna página parece etiqueta (" + ", ".join(sorted(set(tipos))) + ")"
    return {"id": fila["id"], "estado": estado, "motivo": motivo, "paginas": len(lectura),
            "sin_texto": len(sin_texto), "etiqueta": etiqueta, "hds": hds,
            "registro": registro(textos_etiqueta + [lectura[n - 1] for n in hds]),
            "exportacion": exportacion}


def anotar(resultados):
    if not resultados:
        return
    filas = ",\n".join(
        f"({r['id']}, {lit(r['estado'])}, {lit(r['motivo'])}, {r['paginas']}::smallint, {r['sin_texto']}::smallint, "
        f"array[{','.join(map(str, r['etiqueta']))}]::smallint[], array[{','.join(map(str, r['hds']))}]::smallint[], "
        f"{lit(r['registro'])}, {lit(bool(r['exportacion']))})" for r in resultados)
    # Lo ya cargado no vuelve a «texto» (ocr.py --tesseract puede releer etiquetas cargadas).
    sql(f"""update public.sag_inventario i set
       estado = case when i.estado in ('cargado', 'diferencias') then i.estado else v.estado end,
       motivo = case when i.estado in ('cargado', 'diferencias') then i.motivo else coalesce(v.motivo, i.motivo) end,
       paginas = v.paginas, paginas_sin_texto = v.sin_texto, paginas_etiqueta = v.etiqueta, paginas_hds = v.hds,
       registro_sag = coalesce(v.registro, i.registro_sag), solo_exportacion = v.exportacion, actualizado = now()
from (values {filas}) as v(id, estado, motivo, paginas, sin_texto, etiqueta, hds, registro, exportacion)
where i.id = v.id;""", "textos")


def cruzar_por_registro():
    """Cruce firme por N° SAG: planilla de autorizados, cancelados, productos ya cargados y versiones."""
    aut = oficiales.autorizados()
    canc = oficiales.cancelados()
    filas = sql("select id, registro_sag from public.sag_inventario where registro_sag is not null")
    valores = []
    for f in filas:
        a, c = aut.get(f["registro_sag"]), canc.get(f["registro_sag"])
        valores.append("(" + ", ".join([str(f["id"]), lit(a["nsag"] if a else None), lit(a["nombre"] if a else None),
                                         lit(a["aptitud"] if a else None), lit(a["titular"] if a else None),
                                         f"{lit(a['vence'] if a else None)}::date",
                                         f"{lit(c['fecha_limite'] if c else None)}::date"]) + ")")
    if not valores:
        return {}
    # Tres sentencias separadas: Postgres no aplica dos UPDATE a la misma fila en una sola sentencia.
    a = sql(f"""
with v(id, nsag, nombre, aptitud, titular, vence, limite) as (values {','.join(valores)}),
a as (
  update public.sag_inventario i set autorizado_nsag = v.nsag, autorizado_nombre = v.nombre,
         autorizado_aptitud = v.aptitud, autorizado_titular = v.titular, autorizado_vence = v.vence,
         cancelado_fecha_limite = v.limite,
         prioridad = case when i.prioridad < 0 then i.prioridad  -- prioridad puesta a mano (ej. plan de Cristóbal)
                          else (case when v.nsag is not null and v.aptitud ~* 'insectic|fungic|herbic|acaric' then 0
                                     when v.nsag is not null then 1 when v.limite is not null then 3 else 2 end) * 1000
                               + (2100 - coalesce(extract(year from i.fecha_etiqueta)::int, i.anio, 2000)) end,
         actualizado = now()
  from v where v.id = i.id returning i.id
) select count(*) n from a;""", "cruce_registro")
    p = sql("""
with p as (
  update public.sag_inventario i set producto_id = pr.id, actualizado = now()
  from public.products pr
  where pr.registration_number = i.registro_sag and i.producto_id is distinct from pr.id
  returning i.id
) select count(*) n from p;""", "cruce_productos")
    ver = sql("""
with orden as (
  select id, registro_sag, row_number() over (partition by registro_sag
           order by coalesce(fecha_etiqueta, make_date(coalesce(anio, 2000), 1, 1)) desc, id desc) n
  from public.sag_inventario where registro_sag is not null and estado in ('texto', 'version_anterior')
), ver as (
  update public.sag_inventario i set
    estado = case when o.n = 1 then 'texto' else 'version_anterior' end,
    duplicado_de = case when o.n = 1 then null
                        else (select o2.id from orden o2 where o2.registro_sag = o.registro_sag and o2.n = 1) end,
    motivo = case when o.n = 1 then null else 'Hay una etiqueta más nueva del mismo N° SAG' end,
    actualizado = now()
  from orden o where o.id = i.id and i.estado <> case when o.n = 1 then 'texto' else 'version_anterior' end
  returning i.id
) select count(*) n from ver;""", "versiones")
    return {"cruzadas": a[0]["n"], "con_producto_en_base": p[0]["n"], "cambios_de_version": ver[0]["n"]}


def main():
    consola_utf8()
    args = sys.argv[1:]
    rehacer = "--rehacer" in args
    print("Duplicados y ya cargados:", marcar_duplicados())
    if "--ids" in args:
        ids = args[args.index("--ids") + 1]
        filas = sql(f"select id from public.sag_inventario where id in ({ids}) order by id")
    else:
        filas = sql("select id from public.sag_inventario where estado = 'descargado' order by prioridad nulls last, id")
    print(f"Documentos: {len(filas)}", flush=True)
    resultados, conteo = [], collections.Counter()
    for n, f in enumerate(filas, 1):
        try:
            r = procesar(f, rehacer)
        except Exception as e:  # noqa: BLE001
            r = {"id": f["id"], "estado": "ilegible", "motivo": f"No se pudo sacar el texto: {e}"[:300], "paginas": 0,
                 "sin_texto": 0, "etiqueta": [], "hds": [], "registro": None, "exportacion": None}
        conteo[r["estado"]] += 1
        conteo["con N° SAG"] += bool(r["registro"])
        conteo["con páginas sin texto"] += bool(r["sin_texto"])
        conteo["solo exportación"] += bool(r["exportacion"])
        resultados.append(r)
        if len(resultados) >= 50:
            anotar(resultados)
            resultados = []
        if n % 100 == 0:
            print(f"  {n}/{len(filas)} {dict(conteo)}", flush=True)
    anotar(resultados)
    print(dict(conteo))
    print("Cruce por N° SAG:", cruzar_por_registro())


if __name__ == "__main__":
    main()
