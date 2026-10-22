"""Resumen del recopilador para el informe de fin de sesión. Sin IA.

Uso:  python -I scripts/recopilador/reporte.py

Muestra el inventario por estado, la cobertura de la base (productos, líneas, dosis y carencia) y escribe
en <datos>/sag/: autorizados_sin_etiqueta.csv (planilla del SAG sin etiqueta en el listado) y
problemas.csv (links rotos, sin link, ilegibles, no etiqueta) para revisar en Excel.
"""
import csv
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oficiales  # noqa: E402
from comun import consola_utf8, ruta, sql  # noqa: E402


def main():
    consola_utf8()
    estados = sql("select estado, count(*) n from public.sag_inventario group by 1 order by 2 desc", "rep_estados")
    print("Inventario:", ", ".join(f"{e['estado']} {e['n']}" for e in estados),
          f"(total {sum(e['n'] for e in estados)})")
    base = sql("""select (select count(*) from public.products) productos,
  (select count(*) from public.products where registration_number is not null) con_registro,
  count(*) lineas, count(*) filter (where dose_min is not null) con_dosis,
  count(*) filter (where withholding_period_days is not null or withholding_not_applicable) con_carencia,
  pg_size_pretty(pg_database_size(current_database())) tam_base
from public.product_uses where review_status <> 'rechazado'""", "rep_base")[0]
    print(f"Base: {base['productos']} productos ({base['con_registro']} con N° SAG), {base['lineas']} líneas; "
          f"dosis {100 * base['con_dosis'] / max(1, base['lineas']):.1f} %, carencia "
          f"{100 * base['con_carencia'] / max(1, base['lineas']):.1f} %; base de datos {base['tam_base']}")

    regs = {r["registro_sag"] for r in sql("select distinct registro_sag from public.sag_inventario "
                                           "where registro_sag is not null", "rep_regs")}
    regs |= {r["registration_number"] for r in sql("select registration_number from public.products "
                                                   "where registration_number is not null", "rep_prod")}
    aut = oficiales.autorizados()
    sin = [a for n, a in sorted(aut.items(), key=lambda x: x[1]["nombre"] or "") if n not in regs]
    with open(ruta("sag", "autorizados_sin_etiqueta.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["N° SAG", "nombre", "aptitud", "titular", "vence"])
        for a in sin:
            w.writerow([a["nsag"], a["nombre"], a["aptitud"], a["titular"], a["vence"]])
    print(f"Planilla de autorizados: {len(aut)}; sin etiqueta en el listado ni en la base: {len(sin)} "
          f"(lista en {ruta('sag', 'autorizados_sin_etiqueta.csv')})")

    problemas = sql("""select id, estado, nombre, empresa, url, motivo from public.sag_inventario
where estado in ('error_descarga', 'ilegible', 'no_etiqueta') order by estado, nombre""", "rep_problemas")
    with open(ruta("sag", "problemas.csv"), "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        w.writerow(["inventario", "estado", "nombre", "empresa", "url", "motivo"])
        for p in problemas:
            w.writerow([p["id"], p["estado"], p["nombre"], p["empresa"], p["url"], p["motivo"]])
    print(f"Problemas (links rotos, ilegibles, no etiqueta): {len(problemas)} (lista en {ruta('sag', 'problemas.csv')})")


if __name__ == "__main__":
    main()
