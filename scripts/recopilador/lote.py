"""Arma el siguiente lote de extracción: elige etiquetas por prioridad y escribe el encargo de cada subagente.

Uso:  python -I scripts/recopilador/lote.py [--agentes 2] [--por 4] [--ids 1,2,3]

- Toma filas en estado «texto» con páginas de etiqueta, sin JSON en <datos>/sag/extraido/, en orden de
  prioridad (vigentes en la planilla; insecticidas, fungicidas, herbicidas y acaricidas; más nuevas).
  Salta las que todavía tienen páginas sin texto (falta ocr.py).
- Imprime un encargo por subagente (para pegar en la herramienta Agent) y al final el comando de carga.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, consola_utf8, leer_json, sql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYV = os.path.join(DATOS, "venv", "Scripts", "python.exe")


def falta_ocr(i):
    """Hay una página sin texto (y sin OCR) antes de que empiece la HDS: la etiqueta está incompleta.
    Si ocr.py ya la leyó y no encontró texto (página en blanco), no frena: el subagente tiene su imagen."""
    carpeta = os.path.join(DATOS, "sag", "texto", str(i))
    info = leer_json(os.path.join(carpeta, "paginas.json"), [])
    inicio_hds = min([p["pagina"] for p in info if p["tipo"] == "hds"] or [10 ** 6])
    return any(p["tipo"] == "sin_texto" and p["pagina"] < inicio_hds
               and not os.path.exists(os.path.join(carpeta, f"ocr_p{p['pagina']}.json")) for p in info)


def encargo(ids):
    lineas = [
        "Eres un subagente extractor del proyecto Agroquímicos CRM (etiquetas de plaguicidas de Chile). Lee primero, "
        f"completas, las instrucciones en {os.path.join(REPO, 'scripts', 'recopilador', 'instrucciones_extraccion.md')} "
        "y síguelas al pie de la letra.", "",
        "Etiquetas que te tocan. Procésalas una por una, en este orden; escribe el JSON de cada una (herramienta "
        "Write) antes de pasar a la siguiente:"]
    for k, i in enumerate(ids, 1):
        lineas.append(f"{k}. id {i} — carpeta {os.path.join(DATOS, 'sag', 'texto', str(i))} — escribe "
                      f"{os.path.join(DATOS, 'sag', 'extraido', f'{i}.json')}")
    lineas += ["", 'En el campo "id" del JSON pon exactamente el número indicado.',
               f'Para acercar una zona de una página: {PYV} -I "{os.path.join(REPO, "scripts", "recopilador", "recorte.py")}" '
               "<id> <página> <x0> <y0> <x1> <y1>.",
               "No modifiques ningún otro archivo. No muestres el JSON en tu respuesta: al final responde solo una "
               "línea por etiqueta (id · N usos · problemas principales)."]
    return "\n".join(lineas)


def main():
    consola_utf8()
    args = sys.argv[1:]
    agentes = int(args[args.index("--agentes") + 1]) if "--agentes" in args else 2
    por = int(args[args.index("--por") + 1]) if "--por" in args else 4
    if "--ids" in args:
        elegidas = [int(x) for x in args[args.index("--ids") + 1].split(",")]
    else:
        hechas = {int(f[:-5]) for f in os.listdir(os.path.join(DATOS, "sag", "extraido"))
                  if f.endswith(".json") and f[:-5].isdigit()} if os.path.isdir(os.path.join(DATOS, "sag", "extraido")) else set()
        filas = sql("""select id from public.sag_inventario
where estado = 'texto' and coalesce(array_length(paginas_etiqueta, 1), 0) > 0
order by prioridad nulls last, id""", "lote")
        elegidas = [f["id"] for f in filas if f["id"] not in hechas and not falta_ocr(f["id"])][:agentes * por]
    for a in range(agentes):
        grupo = elegidas[a * por:(a + 1) * por]
        if grupo:
            print(f"===== Subagente {a + 1} (ids {','.join(map(str, grupo))}) =====")
            print(encargo(grupo))
            print()
    print("Después, cargar con:")
    print(f'python -I "{os.path.join(REPO, "scripts", "recopilador", "cargar.py")}" "{os.path.join(DATOS, "sag", "extraido")}" '
          f"--ids {','.join(map(str, elegidas))} --lote <fecha-n> --modelo <modelo>")


if __name__ == "__main__":
    main()
