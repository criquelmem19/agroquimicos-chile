"""Exporta los candidatos (salida de aplicar_mapa.py) a un JSON compacto para cargarlos en la tabla
`use_field_candidates`. El archivo queda en el repositorio como registro auditable de la extracción.

Uso:  python -I scripts/fase2/exportar_candidatos.py <candidatos.json> <salida.json> <campo>
Campo: carencia | mojamiento | metodo | intervalo
Formato: {"extractor": ..., "campo": ..., "filas": [[product_use_id, document_id, valor, valor_max, cita, pagina, fuente, nota], ...]}
valor: número (días o L/ha), "NA" (no aplica), "COND" (carencia condicionada) o texto (método).
"""
import json
import sys


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    entrada, salida, campo = sys.argv[1], sys.argv[2], sys.argv[3]
    datos = json.load(open(entrada, encoding="utf-8"))
    filas = []
    for c in datos["candidatos"]:
        filas.append([c["product_use_id"], c["document_id"], c["valor"], c.get("valor_max"), c["cita"], c["pagina"],
                      "ocr" if c.get("fuente") == "ocr" else "texto", c.get("nota")])
    filas.sort(key=lambda f: f[0])
    with open(salida, "w", encoding="utf-8") as f:
        json.dump({"extractor": datos["extractor"], "campo": campo, "filas": filas}, f, ensure_ascii=False, separators=(",", ":"))
    print(f"{len(filas)} filas → {salida}")


if __name__ == "__main__":
    main()
