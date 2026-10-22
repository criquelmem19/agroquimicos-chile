"""Baja las listas oficiales de plaguicidas del SAG y las deja en JSON. Sin IA.

Uso:  python -I scripts/recopilador/listas_oficiales.py

Busca los links en https://www.sag.gob.cl/ambitos-de-accion/autorizacion-y-evaluacion-de-plaguicidas/registros
(así toma la versión más nueva de cada lista) y guarda en <datos>/oficiales/:
  - autorizados.xlsx  «Planilla resumida de plaguicidas autorizados»
  - abejas.xlsx       «Reporte de plaguicidas clasificados según toxicidad en abejas»
  - cancelados.pdf, prohibidos.pdf, restringidos.pdf
  - listas.json       nombre del archivo original, url y fecha de descarga de cada una
Las planillas se convierten a <nombre>.json (hojas → filas) y los PDF a <nombre>.txt (pdftotext -layout).
"""
import datetime
import html
import os
import re
import subprocess
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import SAG, bajar, consola_utf8, escribir_json, leer_xlsx, pdftotext, ruta  # noqa: E402

PAGINA = SAG + "/ambitos-de-accion/autorizacion-y-evaluacion-de-plaguicidas/registros"
LISTAS = {  # nombre local: patrón del texto del link en la página del SAG
    "autorizados": r"planilla resumida de plaguicidas autorizados",
    "abejas": r"toxicidad en abejas",
    "cancelados": r"plaguicidas cancelados",
    "prohibidos": r"plaguicidas prohibidos",
    "restringidos": r"plaguicidas restringidos",
}


def main():
    consola_utf8()
    pagina = bajar(PAGINA).decode("utf-8", errors="replace")
    enlaces = [(html.unescape(h), " ".join(re.sub(r"<[^>]+>", " ", t).split()))
               for h, t in re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', pagina, re.S)]
    resumen = {}
    for nombre, patron in LISTAS.items():
        candidatos = [(h, t) for h, t in enlaces if re.search(patron, t, re.I) and re.search(r"\.(xlsx|pdf)$", h, re.I)]
        if not candidatos:
            print(f"!! No encontré el link de «{nombre}» en la página del SAG")
            continue
        href, texto = candidatos[0]
        url = urllib.parse.urljoin(SAG + "/", href)
        ext = os.path.splitext(urllib.parse.urlparse(url).path)[1].lower()
        destino = ruta("oficiales", nombre + ext)
        datos = bajar(url)
        with open(destino, "wb") as f:
            f.write(datos)
        resumen[nombre] = {"texto": texto, "url": url,
                           "archivo": urllib.parse.unquote(os.path.basename(urllib.parse.urlparse(url).path)),
                           "bajado": datetime.date.today().isoformat(), "bytes": len(datos)}
        if ext == ".xlsx":
            escribir_json(ruta("oficiales", nombre + ".json"), leer_xlsx(destino))
        else:
            subprocess.run([pdftotext(), "-layout", "-enc", "UTF-8", destino, ruta("oficiales", nombre + ".txt")],
                           check=True, timeout=300)
        print(f"{nombre}: {resumen[nombre]['archivo']} ({len(datos):,} bytes)")
    escribir_json(ruta("oficiales", "listas.json"), resumen, indent=1)


if __name__ == "__main__":
    main()
