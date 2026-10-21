"""Genera el INSERT de un archivo de candidatos (datos/fase2/<campo>_<v>.json, formato de
exportar_candidatos.py) para cargarlo a `use_field_candidates` con execute_sql, sin la extensión http.
Para lotes chicos (decenas o pocos cientos de filas): las citas repetidas van una sola vez. Los lotes
grandes se cargan con cargar_candidatos.sql (la base lee el archivo desde GitHub).

Uso:  python -I scripts/fase2/sql_candidatos.py <archivo.json> > carga.sql
"""
import json
import sys


def lit(x):
    return "null" if x is None else "'" + str(x).replace("'", "''") + "'"


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    citas = {}
    filas = []
    for uso, doc, valor, valor_max, cita, pagina, fuente, nota in d["filas"]:
        k = citas.setdefault((cita, pagina, fuente, nota), len(citas))
        filas.append(f"({lit(uso)}, {lit(doc)}, {lit(valor)}, {lit(valor_max)}, {k})")
    tabla_citas = ",\n".join(f"({k}, {lit(c)}, {p}, {lit(f)}, {lit(n)})" for (c, p, f, n), k in citas.items())
    tabla_filas = ",\n".join(filas)
    print(f"""with c(k, cita, pagina, fuente, nota) as (values
{tabla_citas}
), v(uso, doc, valor, valor_max, k) as (values
{tabla_filas}
), ins as (
  insert into public.use_field_candidates
    (extractor_version, product_use_id, document_id, field_name, value_min, value_max, value_text,
     not_applicable, quote, page, source, notes)
  select {lit(d['extractor'])}, v.uso::uuid, v.doc::uuid, {lit(d['campo'])},
         case when v.valor ~ '^[0-9.]+$' then v.valor::numeric end,
         case when v.valor_max ~ '^[0-9.]+$' then v.valor_max::numeric end,
         case when v.valor = 'COND' then 'condicionada'
              when v.valor !~ '^[0-9.]+$' and v.valor <> 'NA' then v.valor end,
         coalesce(v.valor = 'NA', false), c.cita, c.pagina, c.fuente, c.nota
  from v join c using (k)
  on conflict (extractor_version, product_use_id, field_name) do nothing
  returning field_name
)
select field_name, count(*) from ins group by 1;""")


if __name__ == "__main__":
    main()
