"""Paso 1 del recopilador: recorre el listado de publicaciones del SAG y guarda cada fila. Sin IA.

Uso:  python -I scripts/recopilador/inventario_sag.py [--pausa 1.5]

- Listado: https://www.sag.gob.cl/ambitos-de-accion/insumos-y-productos-silvoagricolas/publicaciones
  (al 22-10-2026, 109 páginas de 15 filas; ?page=N con N desde 0).
- Baja cada página con pausa y reintentos. Las páginas quedan en <datos>/sag/listado/<fecha>/ y, si se
  corta, al volver a correrlo el mismo día no repite las ya bajadas.
- Salida: <datos>/sag/listado_<fecha>.json, una fila por documento: nombre, url, archivo, tema, año,
  empresa, observaciones, página y fila del listado. No toca la base (eso es cruzar_inventario.py).
"""
import datetime
import html
import os
import re
import sys
import time
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import SAG, bajar, consola_utf8, escribir_json, espacios, ruta  # noqa: E402

LISTADO = (SAG + "/ambitos-de-accion/insumos-y-productos-silvoagricolas/publicaciones"
           "?field_tema_otros_documentos_target_id=All&field_tipo_de_publicacion_target_id=All"
           "&field_fecha_otros_value=&title=&page={}")


def texto(celda):
    return espacios(html.unescape(re.sub(r"<[^>]+>", " ", celda)))


def filas_de(pagina_html):
    i, j = pagina_html.find("<tbody"), pagina_html.find("</tbody>")
    if i < 0 or j < 0:
        return []
    filas = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", pagina_html[i:j], re.S):
        celdas = dict(re.findall(r'<td[^>]*views-field-([a-z0-9-]+)"[^>]*>(.*?)</td>', tr, re.S))
        titulo = celdas.get("nothing", "")
        enlaces = re.findall(r'<a[^>]*href="([^"]+)"[^>]*>(.*?)</a>', titulo, re.S)
        href, nombre = (enlaces[0][0], texto(enlaces[0][1])) if enlaces else ("", texto(titulo))
        href = html.unescape(href)
        url = urllib.parse.urljoin(SAG + "/", href) if href else ""
        archivo = urllib.parse.unquote(os.path.basename(urllib.parse.urlparse(url).path)) if url else ""
        obs = texto(celdas.get("field-publicacion-observaci-nes", ""))
        anio = texto(celdas.get("field-fecha-otros", ""))
        filas.append({
            "nombre": nombre,
            "url": url,
            "archivo": archivo,
            "tipo": texto(celdas.get("field-tipo-de-publicacion", "")),
            "tema": texto(celdas.get("field-tema-otros-documentos", "")),
            "anio": int(anio) if anio.isdigit() else None,
            "observaciones": obs,
            "empresa": re.sub(r"(?i)^empresa\s*:\s*", "", obs).strip(" .") or None,
            "otros_enlaces": [urllib.parse.urljoin(SAG + "/", html.unescape(h)) for h, _ in enlaces[1:]],
        })
    return filas


def ultima_pagina(pagina_html):
    numeros = [int(n) for n in re.findall(r"[?&]page=(\d+)", pagina_html.replace("&amp;", "&"))]
    return max(numeros) if numeros else 0


def main():
    consola_utf8()
    pausa = float(sys.argv[sys.argv.index("--pausa") + 1]) if "--pausa" in sys.argv else 1.5
    hoy = datetime.date.today().isoformat()
    carpeta = os.path.dirname(ruta("sag", "listado", hoy, "x"))

    def pagina(n):
        archivo = os.path.join(carpeta, f"pagina_{n:03d}.html")
        if os.path.exists(archivo):
            return open(archivo, encoding="utf-8").read()
        contenido = bajar(LISTADO.format(n)).decode("utf-8", errors="replace")
        if "<tbody" not in contenido:
            raise RuntimeError(f"La página {n} no trae la tabla (¿sitio en mantención?)")
        with open(archivo, "w", encoding="utf-8") as f:
            f.write(contenido)
        time.sleep(pausa)
        return contenido

    primera = pagina(0)
    ultima = ultima_pagina(primera)
    print(f"Páginas del listado: 0 a {ultima}", flush=True)
    todas = []
    for n in range(ultima + 1):
        filas = filas_de(pagina(n))
        for k, f in enumerate(filas, 1):
            f["pagina_listado"], f["fila_listado"] = n, k
        todas.extend(filas)
        if n % 10 == 0 or n == ultima:
            print(f"  página {n}: {len(filas)} filas (total {len(todas)})", flush=True)

    # Comprobaciones: la primera y la última página traen filas distintas; urls repetidas.
    p0 = {f["url"] for f in todas if f["pagina_listado"] == 0}
    pu = {f["url"] for f in todas if f["pagina_listado"] == ultima}
    print(f"Primera y última página distintas: {not (p0 & pu)} ({len(p0)} y {len(pu)} filas)")
    urls = [f["url"] for f in todas if f["url"]]
    print(f"Filas: {len(todas)}; con link: {len(urls)}; urls distintas: {len(set(urls))}; "
          f"sin link: {sum(1 for f in todas if not f['url'])}")
    salida = ruta("sag", f"listado_{hoy}.json")
    escribir_json(salida, {"fecha": hoy, "paginas": ultima + 1, "filas": todas}, indent=0)
    print("Listo:", salida)


if __name__ == "__main__":
    main()
