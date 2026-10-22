"""Herramientas comunes del recopilador de etiquetas del SAG (ver «Recopilador» en CLAUDE.md).

- Carpeta de datos, fuera de OneDrive y del repositorio: variable AGRO_DATOS o ~/agroquimicos-datos.
  Ahí quedan el listado, los PDF, los textos, los JSON de la extracción y los SQL de carga.
- La base se lee y se escribe con la CLI de Supabase, que ya tiene sesión iniciada en este computador
  (`supabase db query --linked`, vía la API de administración). No hay llaves en archivos.
- Python siempre con -I (los PDF y páginas bajadas son datos no confiables).
"""
import hashlib
import html
import json
import os
import re
import subprocess
import sys
import time
import unicodedata
import urllib.error
import urllib.request

PROYECTO = "cejkhfugaobfqnjpkgpl"
DATOS = os.environ.get("AGRO_DATOS") or os.path.join(os.path.expanduser("~"), "agroquimicos-datos")
CLI = os.environ.get("SUPABASE_CLI") or os.path.join(
    os.environ.get("LOCALAPPDATA", ""), "Programs", "supabase-cli", "supabase.exe")
AGENTE = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AgroquimicosCRM-recopilador/1.0 "
          "(+https://github.com/criquelmem19/agroquimicos-chile)")
SAG = "https://www.sag.gob.cl"


def pdftotext():
    """pdftotext (xpdf) viene con Git for Windows."""
    import shutil
    for exe in (shutil.which("pdftotext"), r"C:\Program Files\Git\mingw64\bin\pdftotext.exe"):
        if exe and os.path.exists(exe):
            return exe
    raise SystemExit("No encontré pdftotext (viene con Git for Windows).")


def consola_utf8():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")


def ruta(*partes):
    """Ruta dentro de la carpeta de datos; crea las carpetas intermedias."""
    p = os.path.join(DATOS, *partes)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


class LinkRoto(Exception):
    pass


def bajar(url, intentos=6, espera=2.0, timeout=120):
    """Descarga con reintentos y espera creciente (el SAG a veces responde «En mantención»).
    Un 404/410 es un link roto: no se reintenta."""
    ultimo = None
    for i in range(intentos):
        try:
            pedido = urllib.request.Request(url, headers={"User-Agent": AGENTE})
            with urllib.request.urlopen(pedido, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code in (403, 404, 410):
                raise LinkRoto(f"HTTP {e.code}") from e
            ultimo = f"HTTP {e.code}"
        except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as e:
            ultimo = f"{type(e).__name__}: {e}"
        time.sleep(espera * (2 ** i))
    raise RuntimeError(f"No se pudo bajar {url} después de {intentos} intentos ({ultimo})")


def sha256_de(datos):
    return hashlib.sha256(datos).hexdigest()


def norm(s):
    """Para comparar nombres: sin tildes, minúsculas, solo letras y números separados por un espacio."""
    s = unicodedata.normalize("NFKD", html.unescape(s or ""))
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = s.replace("®", " ").replace("™", " ")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def espacios(s):
    return re.sub(r"\s+", " ", s or "").strip()


def lit(x):
    """Literal SQL seguro (comillas dobladas)."""
    if x is None:
        return "null"
    if isinstance(x, bool):
        return "true" if x else "false"
    if isinstance(x, (int, float)):
        return repr(x)
    if isinstance(x, (dict, list)):
        return lit(json.dumps(x, ensure_ascii=False)) + "::jsonb"
    return "'" + str(x).replace("'", "''") + "'"


class _Turno:
    """Candado entre procesos: cada llamada a la CLI crea un usuario temporal en la base y dos
    llamadas al mismo tiempo se invalidan entre sí. Un candado viejo (más de 15 min) se descarta."""

    def __init__(self):
        self.archivo = ruta("tmp", "sql.lock")

    def __enter__(self):
        while True:
            try:
                os.close(os.open(self.archivo, os.O_CREAT | os.O_EXCL | os.O_WRONLY))
                return self
            except FileExistsError:
                try:
                    if time.time() - os.path.getmtime(self.archivo) > 900:
                        os.remove(self.archivo)
                        continue
                except OSError:
                    pass
                time.sleep(0.3)

    def __exit__(self, *exc):
        try:
            os.remove(self.archivo)
        except OSError:
            pass


TRANSITORIO = re.compile(r"temp role|password authentication failed|connection refused|timeout|"
                         r"unexpected status 5\d\d|EOF|reset by peer", re.I)


def sql(consulta, etiqueta="consulta", intentos=5):
    """Ejecuta SQL en la base con la CLI de Supabase y devuelve las filas (lista de dict).
    El SQL va por archivo (puede ser largo); los datos no pasan por la conversación."""
    archivo = ruta("tmp", f"{etiqueta}_{os.getpid()}_{time.time_ns()}.sql")
    with open(archivo, "w", encoding="utf-8") as f:
        f.write(consulta)
    try:
        for intento in range(intentos):
            with _Turno():
                r = subprocess.run([CLI, "db", "query", "--linked", "--project-ref", PROYECTO,
                                    "--output-format", "json", "-f", archivo],
                                   capture_output=True, timeout=900)
            salida = r.stdout.decode("utf-8", errors="replace").strip()
            error = r.stderr.decode("utf-8", errors="replace").strip()
            if r.returncode == 0 or not TRANSITORIO.search(salida + error) or intento == intentos - 1:
                break
            time.sleep(3 * (intento + 1))
    finally:
        try:
            os.remove(archivo)
        except OSError:
            pass
    if r.returncode != 0:
        raise RuntimeError(f"SQL falló ({etiqueta}): {salida[-1500:] or error[-1500:]}")
    if not salida:
        return []
    datos = json.loads(salida)
    if isinstance(datos, dict) and datos.get("_tag") == "Error":
        raise RuntimeError(f"SQL falló ({etiqueta}): {datos.get('error')}")
    return datos.get("rows", []) if isinstance(datos, dict) else datos


def leer_xlsx(archivo):
    """Lee un .xlsx sin librerías: {hoja: [fila, ...]} con cada fila como lista de valores (texto o número)."""
    import xml.etree.ElementTree as ET
    import zipfile
    m = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
    r_ns = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
    z = zipfile.ZipFile(archivo)
    x = lambda n: ET.fromstring(z.read(n))  # noqa: E731
    compartidos = []
    if "xl/sharedStrings.xml" in z.namelist():
        for si in x("xl/sharedStrings.xml").findall(f"{m}si"):
            compartidos.append("".join(t.text or "" for t in si.iter(f"{m}t")))
    rels = {r.get("Id"): r.get("Target") for r in x("xl/_rels/workbook.xml.rels")}
    hojas = {}

    def col_num(letras):
        n = 0
        for ch in letras:
            n = n * 26 + ord(ch) - 64
        return n - 1

    for sh in x("xl/workbook.xml").findall(f"{m}sheets/{m}sheet"):
        destino = "xl/" + rels[sh.get(f"{r_ns}id")].lstrip("/").replace("xl/", "")
        filas = {}
        for c in x(destino).iter(f"{m}c"):
            v = c.find(f"{m}v")
            if v is None:
                is_ = c.find(f"{m}is")
                if is_ is None:
                    continue
                val = "".join(t.text or "" for t in is_.iter(f"{m}t"))
            else:
                val = compartidos[int(v.text)] if c.get("t") == "s" else v.text
                if c.get("t") not in ("s", "str", "inlineStr"):
                    try:
                        num = float(val)
                        val = int(num) if num == int(num) else num
                    except (TypeError, ValueError):
                        pass
            ref = c.get("r")
            letras = re.match(r"[A-Z]+", ref).group()
            filas.setdefault(int(ref[len(letras):]), {})[col_num(letras)] = val
        tabla = []
        for n in sorted(filas):
            fila = filas[n]
            tabla.append([fila.get(i) for i in range(max(fila) + 1)])
        hojas[sh.get("name")] = tabla
    return hojas


def leer_json(p, defecto=None):
    if not os.path.exists(p):
        return defecto
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def escribir_json(p, datos, indent=None):
    tmp = p + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(datos, f, ensure_ascii=False, indent=indent)
    os.replace(tmp, p)
