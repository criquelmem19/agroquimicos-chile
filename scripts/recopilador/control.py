"""Control de calidad del recopilador: líneas al azar de lo cargado, para que un subagente que no extrajo
las compare con la etiqueta (texto e imagen de la página). Sin IA en este script.

Uso:  python -I scripts/recopilador/control.py [--n 30] [--lote LOTE]
      python -I scripts/recopilador/control.py --resumen <archivo_revision.json>

- Elige N líneas al azar de documentos cargados por el recopilador (o de un lote) y escribe
  <datos>/sag/control/<fecha>.json con lo que dice la base de cada línea y dónde mirar (carpeta, página, imagen).
- Imprime el encargo para el subagente revisor (Sonnet): debe escribir <fecha>_revision.json con, por línea,
  {"linea": id, "ok": true/false, "errores": [{"campo", "en_base", "en_etiqueta", "cita"}]}.
- --resumen cuenta los errores por campo para el informe y para decidir si hay que corregir o reextraer.
"""
import collections
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, consola_utf8, escribir_json, leer_json, lit, ruta, sql  # noqa: E402


def main():
    consola_utf8()
    args = sys.argv[1:]
    if "--resumen" in args:
        rev = leer_json(args[args.index("--resumen") + 1], [])
        errores = collections.Counter(e.get("campo") for r in rev for e in r.get("errores") or [])
        ok = sum(1 for r in rev if r.get("ok"))
        print(f"Líneas revisadas: {len(rev)}; sin errores: {ok} ({100 * ok / max(1, len(rev)):.0f} %)")
        for campo, n in errores.most_common():
            print(f"  {campo}: {n}")
        return
    n = int(args[args.index("--n") + 1]) if "--n" in args else 30
    lote = args[args.index("--lote") + 1] if "--lote" in args else None
    filas = sql(f"""select pu.id, i.id inventario, pu.source_page pagina, c.name::text cultivo, pu.dose_raw dosis,
  pu.withholding_period_days dias, pu.withholding_not_applicable no_aplica, pu.withholding_period_raw cita_carencia,
  pu.water_volume_min_l_ha moj_min, pu.water_volume_max_l_ha moj_max, pu.interval_min_days int_min,
  pu.interval_max_days int_max, pu.maximum_applications_per_season max_ap, pu.application_method metodo,
  (select string_agg(t.common_name::text, ', ') from public.use_targets ut join public.targets t on t.id = ut.target_id
    where ut.product_use_id = pu.id) objetivos, p.commercial_name::text producto
from public.product_uses pu
join public.sag_inventario i on i.documento_id = pu.source_document_id and i.estado = 'cargado'
join public.crops c on c.id = pu.crop_id join public.products p on p.id = pu.product_id
where {('i.lote = ' + lit(lote)) if lote else 'true'}
order by random() limit {n}""", "control")
    for f in filas:
        carpeta = os.path.join(DATOS, "sag", "texto", str(f["inventario"]))
        f["carpeta"] = carpeta
        f["imagen"] = os.path.join(carpeta, f"p{f['pagina']}.jpg")
    fecha = datetime.date.today().isoformat()
    destino = ruta("sag", "control", f"{fecha}.json")
    escribir_json(destino, filas, indent=1)
    print(f"{len(filas)} líneas en {destino}\n")
    print("Encargo para el subagente revisor (Sonnet):\n")
    print(f"""Eres revisor de calidad del proyecto Agroquímicos CRM. En {destino} hay {len(filas)} líneas de uso que un
programa leyó de etiquetas de plaguicidas chilenas. Para cada línea, abre la imagen de la página indicada
(campo «imagen»; si la letra es chica usa {os.path.join(DATOS, 'venv', 'Scripts', 'python.exe')} -I
"{os.path.join(os.path.dirname(os.path.abspath(__file__)), 'recorte.py')}" <inventario> <pagina> <x0> <y0> <x1> <y1>)
y el texto en <carpeta>/etiqueta.txt, y compara con la etiqueta: cultivo, objetivos, dosis, carencia (días o
«no aplica»), mojamiento, intervalo, máximo de aplicaciones y método. Un campo vacío no es error salvo que la
etiqueta sí traiga el dato para esa fila (anótalo como «falta»). No uses conocimiento general: solo la etiqueta.
Escribe {destino.replace('.json', '_revision.json')} con una lista: {{"linea": id, "ok": true/false,
"errores": [{{"campo": ..., "en_base": ..., "en_etiqueta": ..., "cita": texto de la etiqueta}}]}}.
No muestres el JSON en tu respuesta: responde solo cuántas líneas están bien y los errores más importantes.""")


if __name__ == "__main__":
    main()
