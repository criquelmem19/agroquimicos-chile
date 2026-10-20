"""Muestra las líneas de uso de un documento (por prefijo de su id), agrupadas por cultivo,
con método, momento y el texto leído de la etiqueta. Ayuda a escribir las condiciones del mapa.

Uso:  python -I scripts/fase2/ver_lineas.py <lineas.json> <prefijo_doc> [ancho]
"""
import json
import sys


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    datos = json.load(open(sys.argv[1], encoding="utf-8"))
    prefijo = sys.argv[2]
    ancho = int(sys.argv[3]) if len(sys.argv) > 3 else 110
    cultivos = {c["id"]: c["name"] for c in datos["cultivos"]}
    lineas = [l for l in datos["lineas"] if (l["source_document_id"] or "").startswith(prefijo)]
    lineas.sort(key=lambda l: (cultivos[l["crop_id"]], l["source_page"] or 0, str(l["source_table_row"])))
    for l in lineas:
        t = " ".join(str(l.get(k) or "") for k in ("source_text",)).replace("\n", " ")
        print(f"{cultivos[l['crop_id']][:24]:24} p{l['source_page']} {str(l['source_table_row'])[:7]:7} "
              f"met={str(l['application_method'])[:28]:28} mom={str(l['application_timing'])[:40]:40} | {t[:ancho]}")
    print(f"({len(lineas)} líneas)")


if __name__ == "__main__":
    main()
