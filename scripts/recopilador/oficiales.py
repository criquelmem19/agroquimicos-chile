"""Lectura de las listas oficiales del SAG que deja listas_oficiales.py en <datos>/oficiales/. Sin IA.

autorizados()  → {n_sag: {nsag, nombre, aptitud, sustancias, concentracion, formulacion, titular,
                  primera, vence}}    (planilla resumida de plaguicidas autorizados)
abejas()       → {n_sag: {nombre, toxicidad, avisaje}}
cancelados()   → {n_sag: {nsag, fecha_limite, texto}}   (lista de autorización cancelada o expirada)
prohibidos()   → texto normalizado de la primera columna (sustancias y sinónimos), para buscar ingredientes
"""
import datetime
import os
import re
import subprocess

from comun import leer_json, norm, pdftotext, ruta


def nsag(x):
    """Normaliza un N° SAG: 1002 → '1002'; '1.002' → '1002'; '20069-0' queda igual."""
    if x is None:
        return None
    if isinstance(x, float) and x.is_integer():
        x = int(x)
    s = re.sub(r"[\s.]", "", str(x)).strip()
    return s or None


def fecha_excel(x):
    if isinstance(x, (int, float)) and 20000 < x < 80000:
        return (datetime.date(1899, 12, 30) + datetime.timedelta(days=int(x))).isoformat()
    if isinstance(x, str):
        m = re.match(r"(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})", x.strip())
        if m:
            return datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
    return None


def _filas(nombre):
    hojas = leer_json(ruta("oficiales", nombre + ".json"), {})
    filas = next(iter(hojas.values()), []) if hojas else []
    if not filas:
        return [], []
    return [norm(str(c or "")) for c in filas[0]], filas[1:]


def _col(encabezado, patron):
    for i, c in enumerate(encabezado):
        if re.search(patron, c):
            return i
    raise KeyError(patron)


def autorizados():
    enc, filas = _filas("autorizados")
    c = {k: _col(enc, p) for k, p in {
        "nsag": r"^n.? ?sag", "nombre": r"nombre", "aptitud": r"aptitud", "sustancias": r"sustancia",
        "concentracion": r"concentraci", "formulacion": r"formulaci", "titular": r"titular",
        "primera": r"primera", "vence": r"vencimiento"}.items()}
    out = {}
    for f in filas:
        f = f + [None] * (len(enc) - len(f))
        n = nsag(f[c["nsag"]])
        if not n:
            continue
        out[n] = {"nsag": n, **{k: (str(f[i]).strip() if f[i] is not None else None)
                                for k, i in c.items() if k not in ("nsag", "primera", "vence")},
                  "primera": fecha_excel(f[c["primera"]]), "vence": fecha_excel(f[c["vence"]])}
    return out


def abejas():
    enc, filas = _filas("abejas")
    i_n, i_nom = _col(enc, r"^n.? ?sag"), _col(enc, r"nombre")
    i_tox, i_av = _col(enc, r"toxicidad"), _col(enc, r"avisaje")
    out = {}
    for f in filas:
        f = f + [None] * (len(enc) - len(f))
        n = nsag(f[i_n])
        if n:
            out[n] = {"nombre": f[i_nom], "toxicidad": f[i_tox], "avisaje": f[i_av]}
    return out


def _texto_pdf(nombre, modo):
    destino = ruta("oficiales", f"{nombre}_{modo}.txt")
    if not os.path.exists(destino):
        subprocess.run([pdftotext(), f"-{modo}", "-enc", "UTF-8", ruta("oficiales", nombre + ".pdf"), destino],
                       check=True, timeout=300)
    with open(destino, encoding="utf-8") as f:
        return f.read()


def cancelados():
    """Cada registro empieza con el N° SAG y termina con la fecha límite (dd-mm-aaaa)."""
    out, buf = {}, None
    for linea in _texto_pdf("cancelados", "raw").splitlines():
        linea = linea.strip()
        if buf is None:
            if not re.match(r"^\d{3,5}(?:-\d)?(\s|$)", linea):
                continue
            buf = []
        buf.append(linea)
        m = re.search(r"(\d{2})-(\d{2})-(\d{4})\s*$", linea)
        if m:
            texto = " ".join(buf)
            n = nsag(texto.split()[0])
            out[n] = {"nsag": n, "texto": texto,
                      "fecha_limite": datetime.date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()}
            buf = None
    return out


def prohibidos():
    """Primera columna de la lista (nombre común y sinónimos), normalizada, para buscar ingredientes."""
    partes = []
    for linea in _texto_pdf("prohibidos", "table").splitlines():
        if not linea.strip() or linea.startswith(" "):
            continue
        partes.append(re.split(r"\s{3,}", linea.strip())[0])
    return " " + norm(" ".join(partes)) + " "


def contiene_prohibido(ingrediente, texto_prohibidos):
    n = norm(ingrediente)
    return len(n) >= 4 and f" {n} " in texto_prohibidos
