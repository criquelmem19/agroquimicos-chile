"""Compara una extracción nueva de etiquetas ya cargadas con sus líneas en la base. Sin IA; no toca la base.

Uso:  python -I scripts/recopilador/calce.py 1312,152,163

- Por etiqueta: líneas de la extracción nueva (ya verificada) y cuántas traen dosis y carencia; líneas cargadas;
  cuántas calzan por página, n.° de fila y cultivo (lo que usa cargar.py --completar) y cuántas quedan solo en la
  nueva (con dosis) o solo en la cargada. Si muchas no calzan, la extracción nueva numeró las filas de otra forma
  y --completar no alcanza a usarlas.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import expandir  # noqa: E402
import verificar  # noqa: E402
from cargar import Catalogo  # noqa: E402
from comun import consola_utf8, ruta, sql  # noqa: E402


def main():
    consola_utf8()
    cat = Catalogo()
    for i in map(int, sys.argv[1].split(",")):
        ver = verificar.verificar_archivo(os.path.join(ruta("sag", "extraido"), f"{i}.json"),
                                          os.path.dirname(ruta("sag", "verificado", "x")))
        nuevas = {}
        for l in expandir.lineas(ver):
            cultivo, _ = cat.cultivo(l["cultivo"])
            nuevas[(l["uso"]["p"], str(l["uso"]["fila"]), cultivo)] = (
                bool((l["uso"].get("dosis") or {}).get("texto")), bool(l["carencia"]))
        cargadas = {(r["p"], r["f"], r["c"]): (r["d"], r["k"]) for r in sql(f"""select pu.source_page as p,
  pu.source_table_row as f, c.name::text as c, btrim(coalesce(pu.dose_raw, '')) <> '' as d,
  (pu.withholding_period_days is not null or pu.withholding_not_applicable or pu.withholding_period_raw is not null) as k
from public.product_uses pu join public.crops c on c.id = pu.crop_id
join public.sag_inventario i on i.documento_id = pu.source_document_id where i.id = {i}""", "calce")}
        solo_nuevas = set(nuevas) - set(cargadas)
        print(f"{i}: nuevas {len(nuevas)} (con dosis {sum(v[0] for v in nuevas.values())}, carencia "
              f"{sum(v[1] for v in nuevas.values())}); cargadas {len(cargadas)}; calzan {len(set(nuevas) & set(cargadas))}; "
              f"solo en la nueva {len(solo_nuevas)} (con dosis {sum(nuevas[k][0] for k in solo_nuevas)}); "
              f"solo en la cargada {len(set(cargadas) - set(nuevas))}")


if __name__ == "__main__":
    main()
