"""Aplica el mapa de carencias (mapa_carencias.py) a las líneas de uso, sin tocar la base.

Uso:  python -I scripts/fase2/aplicar_mapa.py <lineas.json> <corpus.json> <salida_candidatos.json> [reporte.txt]

- Verifica que cada cita (y su encabezado) exista tal cual en la página indicada del PDF
  (solo se normalizan los espacios). Si no está, la regla no se usa y se informa.
- Asigna a cada línea el valor de las reglas que le calzan por cultivo y condición.
- Conflictos (valores distintos con la misma prioridad) quedan fuera y se informan.
"""
import collections
import importlib.util
import json
import os
import re
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
EXTRACTOR = "carencia-fase2-v1"


def cargar_mapa():
    # mapa_carencias.py define las herramientas y el primer lote; mapa_lote*.py agregan más documentos.
    sys.path.insert(0, AQUI)
    import mapa_carencias
    for nombre in sorted(os.listdir(AQUI)):
        if nombre.startswith("mapa_lote") and nombre.endswith(".py"):
            importlib.import_module(nombre[:-3])
    return mapa_carencias.MAPA


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def campos(l):
    metodo = l.get("application_method") or ""
    c = {
        "metodo": metodo,
        "momento": l.get("application_timing") or "",
        "fuente": l.get("source_text") or "",
        "obs": l.get("observations") or "",
        "dosis": l.get("dose_raw") or "",
        "fila": str(l.get("source_table_row") or ""),
        "dosis_sm": "" if metodo else (l.get("dose_raw") or ""),
    }
    c["texto"] = " || ".join(c[k] for k in ("metodo", "momento", "fuente", "obs", "dosis"))
    return c


def calza(cond, c):
    if not cond:
        return True
    for alt in ([cond] if isinstance(cond, str) else cond):
        campo, _, patron = alt.partition(":")
        if re.search(patron, c[campo], re.I):
            return True
    return False


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    lineas_json, corpus_json, salida = sys.argv[1:4]
    reporte_path = sys.argv[4] if len(sys.argv) > 4 else None
    datos = json.load(open(lineas_json, encoding="utf-8"))
    corpus = json.load(open(corpus_json, encoding="utf-8"))
    mapa = cargar_mapa()
    cultivos = {c["id"]: c["name"] for c in datos["cultivos"]}
    por_doc = collections.defaultdict(list)
    for l in datos["lineas"]:
        por_doc[l["source_document_id"]].append(l)

    out = []
    rep = []
    candidatos = []
    total_doc_lineas = 0
    for prefijo, d in mapa.items():
        docs = [k for k in por_doc if k.startswith(prefijo)]
        if len(docs) != 1:
            rep.append(f"!! {prefijo} ({d['producto']}): {len(docs)} documentos con ese prefijo")
            continue
        doc_id = docs[0]
        ls = por_doc[doc_id]
        total_doc_lineas += len(ls)
        nombres_doc = {cultivos[l["crop_id"]].lower() for l in ls}
        paginas = corpus.get(doc_id) or []
        problemas = []
        reglas_ok = []
        for i, r in enumerate(d["reglas"]):
            pag = r["pag"] or d["pagina"]
            texto_pag = norm(paginas[pag - 1]["texto"]) if 0 < pag <= len(paginas) else ""
            fuente_pag = paginas[pag - 1]["fuente"] if 0 < pag <= len(paginas) else "?"
            enc = d["enc"].get(r["enc"]) if r["enc"] else None
            partes = ([enc] if enc else []) + (list(r["cita"]) if isinstance(r["cita"], (list, tuple)) else [r["cita"]])
            faltan = [p for p in partes if norm(p) not in texto_pag]
            if faltan:
                problemas.append(f"   regla {i}: cita no encontrada en pág. {pag}: «{faltan[0][:90]}»")
                continue
            for c in r["cultivos"]:
                if c != "*" and c.lower() not in nombres_doc:
                    problemas.append(f"   regla {i}: cultivo «{c}» no está en las líneas de este documento")
            if r.get("corregida"):
                partes = ([enc] if enc else []) + [r["corregida"]]
            cita = " … ".join(norm(p) for p in partes)
            reglas_ok.append((i, r, cita, pag, fuente_pag))

        resueltas = 0
        conflictos = []
        sin_regla = collections.Counter()
        for l in ls:
            nombre = cultivos[l["crop_id"]]
            c = campos(l)
            calzan = [(r["prioridad"], r["valor"], i, cita, pag, fuente)
                      for i, r, cita, pag, fuente in reglas_ok
                      if ("*" in r["cultivos"] or nombre.lower() in {x.lower() for x in r["cultivos"]}) and calza(r["cond"], c)]
            if not calzan:
                sin_regla[nombre] += 1
                continue
            top = max(x[0] for x in calzan)
            mejores = [x for x in calzan if x[0] == top]
            valores = {x[1] for x in mejores}
            if len(valores) > 1:
                conflictos.append(f"{nombre} [{l['source_table_row']}]: {sorted(map(str, valores))}")
                continue
            _, valor, i, cita, pag, fuente = mejores[0]
            resueltas += 1
            candidatos.append({
                "extractor": d["extractor"],
                "product_use_id": l["id"], "document_id": doc_id, "cultivo": nombre,
                "valor": valor, "cita": cita, "pagina": pag, "fuente": fuente, "regla": i,
                "nota": d["reglas"][i].get("nota") or d.get("notas"),
                "ya_tenia": (l["withholding_period_days"] if l["withholding_period_days"] is not None
                             else ("NA" if l["withholding_not_applicable"] else None)),
            })
        rep.append(f"== {prefijo} {d['producto']}: {resueltas}/{len(ls)} líneas resueltas"
                   + (f", {len(conflictos)} conflictos" if conflictos else ""))
        rep.extend(problemas)
        if conflictos:
            rep.append("   conflictos: " + "; ".join(conflictos[:12]) + (" …" if len(conflictos) > 12 else ""))
        if sin_regla:
            rep.append("   sin regla: " + ", ".join(f"{k} ({v})" for k, v in sorted(sin_regla.items())))

    total = len(datos["lineas"])
    ya = sum(1 for l in datos["lineas"] if l["withholding_period_days"] is not None or l["withholding_not_applicable"])
    nuevas = sum(1 for c in candidatos if c["ya_tenia"] is None and c["valor"] != "COND")
    condicionadas = sum(1 for c in candidatos if c["valor"] == "COND")
    rep.insert(0, f"Documentos en el mapa: {len(mapa)} ({total_doc_lineas} líneas). Candidatos: {len(candidatos)} "
                  f"(nuevos con días o no aplica: {nuevas}; condicionados: {condicionadas}). "
                  f"Cobertura si se aplican: {ya + nuevas}/{total} = {100 * (ya + nuevas) / total:.1f}% (hoy {ya}).")
    with open(salida, "w", encoding="utf-8") as f:
        json.dump({"extractor": EXTRACTOR, "candidatos": candidatos}, f, ensure_ascii=False, indent=0)
    texto = "\n".join(rep)
    if reporte_path:
        with open(reporte_path, "w", encoding="utf-8") as f:
            f.write(texto)
    print(texto)


if __name__ == "__main__":
    main()
