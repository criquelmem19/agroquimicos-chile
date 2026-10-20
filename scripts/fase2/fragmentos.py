"""Saca, por documento, los fragmentos de texto donde la etiqueta habla de carencia, junto con
los cultivos de sus líneas de uso. Sirve para leerlos y armar el mapa cultivo → carencia con cita.

Uso:  python -I scripts/fase2/fragmentos.py <corpus.json> <lineas.json> <salida.txt> [patron]
"""
import collections
import json
import re
import sys

PATRON = r"per[ií]odos? de carencia|carencia|d[ií]as? (?:antes|previos?) (?:de|a) (?:la )?cosecha|d[ií]as a cosecha|tiempo de espera"
CORTES = re.compile(
    r"\n\s*(?:Tiempo de reingreso|Reingreso|Importante|Compatibilidad|Incompatibilidad|Fitotoxicidad|"
    r"Preparaci[oó]n de la mezcla|Manejo de (?:la )?resistencia|Precauciones|Riesgos ambientales|"
    r"Lote|Fecha de|Nota[s]? importante|Primeros auxilios|Antídoto|Síntomas)", re.I)


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    corpus_json, lineas_json, salida = sys.argv[1:4]
    patron = re.compile(sys.argv[4] if len(sys.argv) > 4 else PATRON, re.I)
    with open(corpus_json, encoding="utf-8") as f:
        corpus = json.load(f)
    with open(lineas_json, encoding="utf-8") as f:
        datos = json.load(f)
    cultivos = {c["id"]: c["name"] for c in datos["cultivos"]}
    productos = {p["id"]: p["commercial_name"] for p in datos["productos"]}
    por_doc = collections.defaultdict(list)
    for l in datos["lineas"]:
        por_doc[l["source_document_id"]].append(l)

    with open(salida, "w", encoding="utf-8") as out:
        for doc, ls in sorted(por_doc.items(), key=lambda x: -len(x[1])):
            paginas = corpus.get(doc)
            nombres = sorted({productos[l["product_id"]] for l in ls})
            cuenta = collections.Counter(cultivos[l["crop_id"]] for l in ls)
            ya = sum(1 for l in ls if l["withholding_period_days"] is not None or l["withholding_not_applicable"])
            out.write(f"\n{'=' * 100}\nDOC {doc} | {' / '.join(nombres)} | {len(ls)} líneas | ya con carencia: {ya}\n")
            out.write("CULTIVOS: " + "; ".join(f"{c} ({n})" for c, n in sorted(cuenta.items())) + "\n")
            if paginas is None:
                out.write("  (sin PDF en el sistema)\n")
                continue
            vistos = set()
            for p in paginas:
                texto = p["texto"]
                for m in patron.finditer(texto):
                    ini = max(0, texto.rfind("\n", 0, max(0, m.start() - 120)) + 1)
                    fin = min(len(texto), m.start() + 1100)
                    c = CORTES.search(texto, m.end() + 40, fin)
                    if c:
                        fin = c.start()
                    clave = (p["pagina"], ini // 200)
                    if clave in vistos:
                        continue
                    vistos.add(clave)
                    frag = re.sub(r"[ \t]+", " ", texto[ini:fin]).strip()
                    out.write(f"--- pág. {p['pagina']} ({p['fuente']}):\n{frag}\n")
    print("listo")


if __name__ == "__main__":
    main()
