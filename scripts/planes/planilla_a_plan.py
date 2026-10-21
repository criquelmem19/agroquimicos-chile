"""Convierte una hoja de una planilla de plan fitosanitario (Excel) en un plan de aplicaciones del sitio.

La hoja tiene una fila de encabezados con columnas como ESTADO FENOLOGICO, N° DE APLICACIÓN, D.D.T.
(días desde el trasplante), PRODUCTO, CLASIFICACION, INGREDIENTE ACTIVO, DOSIS, UM, MOJAMIENTO,
OBJETIVO, EQUIPO DE APLICACIÓN y PRODUCTO SYNGENTA / DOSIS HA (alternativa). Las mezclas se reconocen
por las celdas combinadas (N°, D.D.T. y equipo). Los precios no se copian.

Los productos se buscan en el catálogo por nombre (llave pública); los que no están quedan como
«fuera del catálogo» con los datos de la planilla. Si el plan tiene un solo cultivo, se elige el uso
de la etiqueta cuando hay uno claro (por método y objetivo); si no, queda para elegirlo en el sitio.

Uso:
  python -I scripts/planes/planilla_a_plan.py <planilla.xlsx> <salida.json> \
      --plan "<id>|<nombre>|<hoja fitosanitaria>|<hoja fertilización o ->|<cultivo>[,<otro cultivo>...]|<consumo|semillero>" [--plan ...] \
      [--igual "NOMBRE PLANILLA=Nombre en catálogo" ...]
Salida: {"version": 1, "planes": [...]} en el formato de assets/js/plan.js.
"""
import argparse
import datetime
import json
import re
import sys
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
import zipfile

URL = "https://cejkhfugaobfqnjpkgpl.supabase.co"
LLAVE = "sb_publishable_dzR4zTF-RcJGyw6Fq1LCRA_lAf1tpF8"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
      "r": "http://schemas.openxmlformats.org/officeDocument/2006/relationships"}
CREADO = 1792540800000  # marca fija: el mismo plan importado dos veces tiene los mismos ids


def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def api(ruta):
    filas, desde = [], 0
    while True:
        req = urllib.request.Request(f"{URL}/rest/v1/{ruta}", headers={
            "apikey": LLAVE, "Authorization": f"Bearer {LLAVE}", "Range": f"{desde}-{desde + 999}"})
        with urllib.request.urlopen(req, timeout=60) as r:
            parte = json.load(r)
        filas += parte
        if len(parte) < 1000:
            return filas
        desde += 1000


# ---------- Lectura del Excel (sin librerías externas) ----------

def leer_xlsx(ruta):
    z = zipfile.ZipFile(ruta)
    x = lambda n: ET.fromstring(z.read(n))
    compartidos = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in x("xl/sharedStrings.xml").findall("m:si", NS):
            compartidos.append("".join(t.text or "" for t in si.iter("{%s}t" % NS["m"])))
    rels = {r.get("Id"): r.get("Target") for r in x("xl/_rels/workbook.xml.rels")}
    hojas = {}
    for sh in x("xl/workbook.xml").findall("m:sheets/m:sheet", NS):
        destino = "xl/" + rels[sh.get("{%s}id" % NS["r"])].lstrip("/").replace("xl/", "")
        hoja = x(destino)
        celdas = {}
        for c in hoja.iter("{%s}c" % NS["m"]):
            v = c.find("m:v", NS)
            if v is None:
                continue
            val = compartidos[int(v.text)] if c.get("t") == "s" else v.text
            if c.get("t") not in ("s", "str"):
                try:
                    n = float(val)
                    val = int(n) if n == int(n) else n
                except ValueError:
                    pass
            ref = c.get("r")
            col = re.match(r"[A-Z]+", ref).group()
            celdas[(int(ref[len(col):]), col)] = val
        combinadas = []
        for m in hoja.findall("m:mergeCells/m:mergeCell", NS):
            a, b = m.get("ref").split(":")
            ca, cb = re.match(r"[A-Z]+", a).group(), re.match(r"[A-Z]+", b).group()
            combinadas.append((ca, int(a[len(ca):]), cb, int(b[len(cb):])))
        # comentarios de la hoja
        comentarios = {}
        rel_hoja = destino.replace("worksheets/", "worksheets/_rels/") + ".rels"
        if rel_hoja in z.namelist():
            for r in x(rel_hoja):
                if "comments" in r.get("Target", ""):
                    cm = x("xl/" + r.get("Target").replace("../", ""))
                    for c in cm.iter("{%s}comment" % NS["m"]):
                        texto = "".join(t.text or "" for t in c.iter("{%s}t" % NS["m"]))
                        comentarios[c.get("ref")] = re.sub(r"^[^:\n]+:\s*", "", texto).strip()
        hojas[sh.get("name")] = {"celdas": celdas, "combinadas": combinadas, "comentarios": comentarios}
    return hojas


# ---------- Hoja → aplicaciones ----------

COLUMNAS = {
    "etapa": r"estado fenol", "numero": r"^n .*aplicacion", "ddt": r"^d d t", "producto": r"^producto$",
    "tipo": r"clasificacion", "ingrediente": r"ingrediente", "dosis": r"^dosis$", "um": r"^um$",
    "mojamiento": r"^mojamiento$", "objetivo": r"objetivo", "equipo": r"equipo", "alt": r"producto syngenta",
    "alt_dosis": r"^dosis ha$|^dosis ha |^dosis   ha",
}


def num_texto(v):
    if isinstance(v, (int, float)):
        s = f"{v:.6f}".rstrip("0").rstrip(".")
        return s.replace(".", ",")
    return str(v).strip()


def unidad(u):
    u = norm(u)
    return {"kg": "kg", "lt": "L", "l": "L", "un": "un.", "gr": "g", "g": "g", "cc": "cc"}.get(u, u)


def texto_dosis(d, um, moj):
    if d in (None, ""):
        return ""
    base = f"{num_texto(d)} {unidad(um)}".strip()
    m = norm(moj)
    if isinstance(moj, (int, float)):
        return f"{base} / {num_texto(moj)} L de agua"
    if "ha" in m.split() or m.endswith("ha"):
        return f"{base}/ha"
    return base


def aplicaciones_de_hoja(hoja, prefijo, fertilizacion=False):
    celdas, combinadas, comentarios = hoja["celdas"], hoja["combinadas"], hoja["comentarios"]
    filas = sorted({f for f, _ in celdas})
    encabezado = next(f for f in filas if any(norm(celdas.get((f, c), "")) == "producto" for _, c in celdas))
    cols = {}
    for (f, c), v in celdas.items():
        if f != encabezado:
            continue
        n = norm(v)
        for clave, patron in COLUMNAS.items():
            if clave not in cols and re.search(patron, n):
                cols[clave] = c
    # valor de una celda, mirando también la celda combinada que la cubre
    rangos = {}
    for ca, fa, cb, fb in combinadas:
        if ca == cb:
            for f in range(fa, fb + 1):
                rangos[(f, ca)] = (fa, fb)

    def valor(f, clave):
        c = cols.get(clave)
        if not c:
            return None
        v = celdas.get((f, c))
        if v in (None, "") and (f, c) in rangos:
            v = celdas.get((rangos[(f, c)][0], c))
        return v if v not in ("",) else None

    # grupos de filas (mezclas): unión de los rangos combinados en N°, D.D.T. y equipo
    padre = {}

    def raiz(f):
        while padre.get(f, f) != f:
            f = padre[f]
        return f

    def unir(a, b):
        padre[raiz(b)] = raiz(a)

    for clave in ("numero", "ddt", "equipo"):
        c = cols.get(clave)
        for ca, fa, cb, fb in combinadas:
            if ca == cb == c:
                for f in range(fa + 1, fb + 1):
                    unir(fa, f)
    datos = [f for f in filas if f > encabezado and valor(f, "producto") and not norm(valor(f, "etapa")).startswith("costo")]
    grupos = {}
    grupo_de = {}
    anterior = None
    for f in datos:
        # Una fila sin N°, sin D.D.T. y fuera de celdas combinadas sigue en la mezcla de la fila anterior.
        tiene_info = (f, cols.get("numero")) in rangos or (f, cols.get("ddt")) in rangos or (f, cols.get("equipo")) in rangos \
            or celdas.get((f, cols.get("numero"))) not in (None, "") or celdas.get((f, cols.get("ddt"))) not in (None, "")
        r = raiz(f) if tiene_info or anterior is None else grupo_de[anterior]
        grupos.setdefault(r, []).append(f)
        grupo_de[f] = r
        anterior = f
    etapa_actual = None
    salida = []
    for g, fs in sorted(grupos.items(), key=lambda kv: kv[1][0]):
        ddt = next((valor(f, "ddt") for f in fs if valor(f, "ddt") is not None), None)
        if isinstance(ddt, str):
            ddt = 0 if "trasplant" in norm(ddt) or "transplant" in norm(ddt) else (int(re.sub(r"\D", "", ddt)) if re.search(r"\d", ddt) else None)
        numero = next((valor(f, "numero") for f in fs if valor(f, "numero") is not None), None)
        equipo = next((valor(f, "equipo") for f in fs if valor(f, "equipo") is not None), None)
        for f in fs:
            et = valor(f, "etapa")
            if et:
                etapa_actual = str(et).strip().capitalize()
            alt = valor(f, "alt")
            alt_d = valor(f, "alt_dosis")
            nota = comentarios.get(f"{cols['producto']}{f}", "")
            salida.append({
                "fila": f,
                "ddt": ddt if isinstance(ddt, int) else None,
                "numero": (None if fertilizacion else numero),
                "etapa": etapa_actual,
                "equipo": str(equipo).strip() if equipo else "",
                "producto": re.sub(r"\s+", " ", str(valor(f, "producto"))).strip(),
                "tipo": str(valor(f, "tipo") or ("Fertilizante" if fertilizacion else "")).strip(),
                "ingrediente": re.sub(r"\s+", " ", str(valor(f, "ingrediente") or "")).strip(),
                "dosisPlan": texto_dosis(valor(f, "dosis"), valor(f, "um"), valor(f, "mojamiento")),
                "objetivo": re.sub(r"\s+", " ", str(valor(f, "objetivo") or "")).strip(),
                "alternativa": (f"{str(alt).strip()}{f' ({str(alt_d).strip()})' if alt_d else ''}" if alt else ""),
                "nota": nota,
                "prefijo": prefijo,
            })
    return salida


# ---------- Catálogo ----------

def buscar_producto(nombre, productos, iguales):
    if nombre.upper() in iguales:
        objetivo = norm(iguales[nombre.upper()])
        return next((p for p in productos if norm(p["commercial_name"]) == objetivo), None)
    t = norm(nombre).split()
    candidatos = [p for p in productos if t and all(w in norm(p["commercial_name"]).split() for w in t)]
    return candidatos[0] if len(candidatos) == 1 else None


def metodo_compatible(equipo, linea):
    e = norm(equipo)
    m = norm(linea.get("application_method") or "")
    if "riego" in e:
        return "riego" in m or "goteo" in m
    if "bins" in e or "bandeja" in e or "inmers" in e:
        return "bandeja" in m or "inmers" in m
    return not m or "follaje" in m or "foliar" in m


def elegir_linea(ap, lineas, objetivos):
    candidatas = [u for u in lineas if metodo_compatible(ap["equipo"], u)]
    if not candidatas:
        return None
    if len(candidatas) == 1:
        return candidatas[0]
    palabras = {w[:5] for w in norm(ap["objetivo"]).split() if len(w) >= 4}
    puntaje = []
    for u in candidatas:
        nombres = " ".join(objetivos.get(t["target_id"], "") for t in u.get("use_targets", []))
        pal = {w[:5] for w in norm(nombres).split() if len(w) >= 4}
        puntaje.append((len(palabras & pal), u))
    puntaje.sort(key=lambda x: -x[0])
    if puntaje[0][0] and (len(puntaje) == 1 or puntaje[0][0] > puntaje[1][0]):
        return puntaje[0][1]
    return None


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    ap = argparse.ArgumentParser()
    ap.add_argument("planilla")
    ap.add_argument("salida")
    ap.add_argument("--plan", action="append", required=True)
    ap.add_argument("--igual", action="append", default=[])
    args = ap.parse_args()
    iguales = {a.split("=", 1)[0].strip().upper(): a.split("=", 1)[1].strip() for a in args.igual}

    hojas = leer_xlsx(args.planilla)
    productos = api("products?select=id,commercial_name&order=id")
    cultivos = api("crops?select=id,name&order=id")
    objetivos = {t["id"]: t["common_name"] for t in api("targets?select=id,common_name&order=id")}
    planes = []
    for n_plan, definicion in enumerate(args.plan, start=1):
        pid, nombre, hoja_fito, hoja_fert, nombres_cultivos, destino = [x.strip() for x in definicion.split("|")]
        ids_cultivos = []
        for nc in nombres_cultivos.split(","):
            c = next((c for c in cultivos if norm(c["name"]) == norm(nc)), None)
            if not c:
                sys.exit(f"No encontré el cultivo «{nc}» en el catálogo")
            ids_cultivos.append(c["id"])
        lineas = []
        for cid in ids_cultivos:
            lineas += api(f"product_uses?select=id,product_id,crop_id,application_method,use_targets(target_id)&crop_id=eq.{cid}&review_status=neq.rechazado&order=id")
        filas = aplicaciones_de_hoja(hojas[hoja_fito], "f")
        if hoja_fert != "-":
            filas += aplicaciones_de_hoja(hojas[hoja_fert], "z", fertilizacion=True)
        apps = []
        sin_catalogo = set()
        for i, x in enumerate(filas):
            p = buscar_producto(x["producto"], productos, iguales)
            linea = None
            if p and len(ids_cultivos) == 1:
                propias = [u for u in lineas if u["product_id"] == p["id"]]
                u = elegir_linea(x, propias, objetivos)
                if u:
                    linea = {"id": u["id"], "product_id": u["product_id"], "crop_id": u["crop_id"]}
            if not p:
                sin_catalogo.add(x["producto"])
            apps.append({
                "id": f"a{n_plan}{x['prefijo']}{x['fila']}",
                "fecha": None, "ddt": x["ddt"],
                "productoId": p["id"] if p else None,
                "externo": None if p else {"nombre": x["producto"], "ingrediente": x["ingrediente"], "tipo": x["tipo"].capitalize()},
                "linea": linea,
                "dosisPlan": x["dosisPlan"], "objetivo": x["objetivo"], "equipo": x["equipo"], "etapa": x["etapa"],
                "numero": x["numero"], "alternativa": x["alternativa"], "nota": x["nota"],
                "orden": (0 if x["prefijo"] == "f" else 100000) + x["fila"], "creado": CREADO,
            })
        planes.append({
            "id": pid, "nombre": nombre, "cultivoId": ids_cultivos[0], "otrosCultivos": ids_cultivos[1:],
            "destino": destino, "trasplante": None, "cosecha": None, "creado": CREADO, "aplicaciones": apps,
        })
        en_catalogo = len([a for a in apps if a["productoId"]])
        con_uso = len([a for a in apps if a["linea"]])
        print(f"{nombre}: {len(apps)} aplicaciones ({en_catalogo} con producto del catálogo, {con_uso} con uso elegido)")
        print(f"   fuera del catálogo: {', '.join(sorted(sin_catalogo))}")
    # Sin campos vacíos, para que el archivo sea corto (el sitio los toma como vacíos).
    def compacto(x):
        if isinstance(x, dict):
            return {k: compacto(v) for k, v in x.items() if v not in (None, "", []) or k in ("aplicaciones", "planes")}
        if isinstance(x, list):
            return [compacto(v) for v in x]
        return x
    with open(args.salida, "w", encoding="utf-8") as f:
        json.dump(compacto({"version": 1, "planes": planes}), f, ensure_ascii=False, separators=(",", ":"))


if __name__ == "__main__":
    main()
