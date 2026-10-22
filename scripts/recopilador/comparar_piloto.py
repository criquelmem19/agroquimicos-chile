"""Piloto del recopilador: verifica las extracciones de cada modelo y las compara con la base y entre sí.

Uso:  python -I scripts/recopilador/comparar_piloto.py <carpeta_piloto> <modelo_referencia> [otros modelos...]

- <carpeta_piloto>/<modelo>/*.json → verificar.py → *.verificado.json.
- Con la base: documentos «base:<uuid>» (líneas de ese documento) y del SAG cuyo producto ya está
  (líneas del producto). Por cultivo compara dosis (mín–máx) y carencia (días, NA, condicional).
- Entre modelos: por documento y cultivo, mismas dosis y carencias que el modelo de referencia.
- Escribe <carpeta_piloto>/reporte_piloto.txt y lo muestra.
"""
import collections
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import expandir  # noqa: E402
import verificar  # noqa: E402
from comun import consola_utf8, leer_json, lit, sql  # noqa: E402


def num(x):
    return None if x is None else float(x)


def resumen_ext(ver):
    """{cultivo_clave: {"nombre", "dosis": set((min,max)), "carencia": set(valores)}}"""
    out = {}
    for l in expandir.lineas(ver):
        k = expandir.clave_cultivo(l["cultivo"])
        r = out.setdefault(k, {"nombre": l["cultivo"], "dosis": set(), "carencia": set(), "n": 0})
        r["n"] += 1
        d = l["uso"].get("dosis") or {}
        r["dosis"].add((num(d.get("min")), num(d.get("max"))))
        r["carencia"].add(expandir.valor_carencia(l["carencia"]) if l["carencia"] else
                          ("CONFLICTO" if l["conflicto_carencia"] else None))
    return out


def resumen_base(filas):
    out = {}
    for f in filas:
        k = expandir.clave_cultivo(f["cultivo"])
        r = out.setdefault(k, {"nombre": f["cultivo"], "dosis": set(), "carencia": set(), "n": 0, "aprobadas": 0})
        r["n"] += 1
        r["aprobadas"] += f["review_status"] == "aprobado"
        r["dosis"].add((num(f["dose_min"]), num(f["dose_max"])))
        r["carencia"].add("NA" if f["na"] else ("COND" if f["cond"] else (int(f["dias"]) if f["dias"] is not None else None)))
    return out


def comparar(a, b):
    """Cuenta cultivos en común y acuerdos de dosis y carencia; devuelve también las diferencias."""
    comunes = sorted(set(a) & set(b))
    dif, dosis_ok, car_ok = [], 0, 0
    for k in comunes:
        da = {x for x in a[k]["dosis"] if x != (None, None)}
        db = {x for x in b[k]["dosis"] if x != (None, None)}
        ok_d = da == db or (da and db and da <= db) or (da and db and db <= da)
        ca, cb = a[k]["carencia"] - {None}, b[k]["carencia"] - {None}
        ok_c = ca == cb
        dosis_ok += bool(ok_d)
        car_ok += ok_c
        if not ok_d or not ok_c:
            dif.append(f"{a[k]['nombre']}: dosis {sorted(da, key=str)} vs {sorted(db, key=str)}; "
                       f"carencia {sorted(ca, key=str)} vs {sorted(cb, key=str)}")
    return comunes, dosis_ok, car_ok, dif


def main():
    consola_utf8()
    carpeta, modelos = sys.argv[1], sys.argv[2:]
    ext = collections.defaultdict(dict)  # ext[modelo][id] = verificado
    for m in modelos:
        for f in sorted(os.listdir(os.path.join(carpeta, m))):
            if f.endswith(".json") and not f.endswith(".verificado.json"):
                try:
                    v = verificar.verificar_archivo(os.path.join(carpeta, m, f))
                    ext[m][str(v["id"])] = v
                except Exception as e:  # noqa: BLE001
                    print(f"!! {m}/{f}: {type(e).__name__}: {e}")
    ids = sorted({i for m in ext for i in ext[m]})

    # Líneas de la base para comparar
    docs = [i[5:] for i in ids if i.startswith("base:")]
    sag = [i for i in ids if i.isdigit()]
    prod_sag = {str(r["id"]): r["producto_id"] for r in sql(
        "select id, producto_id from public.sag_inventario where id in (" + ",".join(sag or ["0"]) + ")")}
    filas = sql(f"""
select pu.source_document_id::text doc, pu.product_id::text prod, c.name::text cultivo, pu.dose_raw,
       pu.dose_min, pu.dose_max, pu.withholding_period_days dias, pu.withholding_not_applicable na,
       (pu.field_citations->'carencia'->>'condicional') cond, pu.review_status
from public.product_uses pu join public.crops c on c.id = pu.crop_id
where pu.review_status <> 'rechazado' and (pu.source_document_id::text in ({','.join(lit(d) for d in docs) or "''"})
   or pu.product_id::text in ({','.join(lit(p) for p in prod_sag.values() if p) or "''"}))""", "piloto_base")
    por_doc = collections.defaultdict(list)
    for f in filas:
        por_doc["base:" + (f["doc"] or "")].append(f)
        for i, p in prod_sag.items():
            if p and p == f["prod"]:
                por_doc[i].append(f)

    rep = []
    total = collections.Counter()
    for m in modelos:
        rep.append(f"\n######## Modelo {m}: comparación con la base")
        for i in ids:
            v = ext[m].get(i)
            if v is None:
                rep.append(f"== {i}: SIN ARCHIVO")
                continue
            notas = v.get("verificacion", [])
            desc = sum(1 for n in notas if "descartado" in n["estado"])
            if i not in por_doc:
                rep.append(f"== {i}: {len(v.get('usos', []))} filas, {len(expandir.lineas(v))} líneas, "
                           f"{desc} datos descartados (sin líneas en la base para comparar)")
                continue
            a, b = resumen_base(por_doc[i]), resumen_ext(v)
            comunes, dosis_ok, car_ok, dif = comparar(a, b)
            total[m, "cultivos_base"] += len(a)
            total[m, "comunes"] += len(comunes)
            total[m, "dosis_ok"] += dosis_ok
            total[m, "car_ok"] += car_ok
            rep.append(f"== {i}: base {len(a)} cultivos ({sum(x['n'] for x in a.values())} líneas, "
                       f"{sum(x['aprobadas'] for x in a.values())} aprobadas) / extraídos {len(b)} cultivos "
                       f"({sum(x['n'] for x in b.values())} líneas); en común {len(comunes)}; dosis igual {dosis_ok}; "
                       f"carencia igual {car_ok}; {desc} datos descartados")
            faltan = [a[k]["nombre"] for k in set(a) - set(b)]
            sobran = [b[k]["nombre"] for k in set(b) - set(a)]
            if faltan:
                rep.append("   cultivos de la base que no salieron: " + ", ".join(sorted(faltan)))
            if sobran:
                rep.append("   cultivos nuevos en la extracción: " + ", ".join(sorted(sobran)))
            rep.extend("   ≠ " + d for d in dif)
        rep.append(f"TOTAL {m}: cultivos base {total[m, 'cultivos_base']}, en común {total[m, 'comunes']}, "
                   f"dosis igual {total[m, 'dosis_ok']}, carencia igual {total[m, 'car_ok']}")

    ref = modelos[0]
    for m in modelos[1:]:
        rep.append(f"\n######## {m} contra {ref} (todos los documentos)")
        t = collections.Counter()
        for i in ids:
            if i not in ext[ref] or i not in ext[m]:
                continue
            a, b = resumen_ext(ext[ref][i]), resumen_ext(ext[m][i])
            comunes, dosis_ok, car_ok, dif = comparar(a, b)
            t["ref"] += len(a)
            t["comunes"] += len(comunes)
            t["dosis"] += dosis_ok
            t["car"] += car_ok
            rep.append(f"== {i}: {ref} {len(a)} cultivos, {m} {len(b)}; en común {len(comunes)}; "
                       f"dosis igual {dosis_ok}; carencia igual {car_ok}")
            rep.extend("   ≠ " + d for d in dif[:8])
        rep.append(f"TOTAL {m} vs {ref}: cultivos {t['ref']}, en común {t['comunes']}, dosis igual {t['dosis']}, "
                   f"carencia igual {t['car']}")
    texto = "\n".join(rep)
    with open(os.path.join(carpeta, "reporte_piloto.txt"), "w", encoding="utf-8") as f:
        f.write(texto)
    print(texto)


if __name__ == "__main__":
    main()
