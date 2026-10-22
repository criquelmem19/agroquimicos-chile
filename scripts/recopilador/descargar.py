"""Paso 2 del recopilador: baja los PDF del inventario en estado «nuevo». Sin IA.

Uso:  <datos>/venv/Scripts/python.exe -I scripts/recopilador/descargar.py [--limite N] [--pausa 1.0] [--ids 1,2,3]

- Toma de la base las filas «nuevo» en orden de prioridad (o las de --ids) y baja cada PDF a
  <datos>/sag/pdf/<id>.pdf, con pausa entre descargas y reintentos (comun.bajar).
- Calcula sha256, tamaño y páginas (pypdfium2, del venv de la carpeta de datos).
- Cada 20 archivos anota en la base: «descargado», o «error_descarga» con el motivo (link roto,
  no es PDF…). Después marca «duplicado» (mismo sha256 que otra fila del inventario, la más antigua
  queda) y «ya_en_base» (sha256 ya está en documents).
- Se puede cortar y retomar: un PDF ya bajado no se vuelve a bajar.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import LinkRoto, bajar, consola_utf8, lit, ruta, sha256_de, sql  # noqa: E402


def paginas_de(archivo):
    try:
        import pypdfium2 as pdfium
        pdf = pdfium.PdfDocument(archivo)
        n = len(pdf)
        pdf.close()
        return n
    except Exception:  # noqa: BLE001 - PDF dañado o sin pypdfium2: se sabrá al sacar el texto
        return None


def anotar(resultados):
    if not resultados:
        return
    filas = ",\n".join(
        f"({r['id']}, {lit(r['estado'])}, {lit(r.get('motivo'))}, {lit(r.get('sha256'))}, "
        f"{lit(r.get('bytes'))}::int, {lit(r.get('paginas'))}::smallint)" for r in resultados)
    sql(f"""update public.sag_inventario i set estado = v.estado, motivo = v.motivo, sha256 = v.sha,
       bytes = v.bytes, paginas = v.paginas, actualizado = now()
from (values {filas}) as v(id, estado, motivo, sha, bytes, paginas)
where i.id = v.id;""", "descarga")


def marcar_duplicados():
    filas = sql("""
with d as (
  update public.sag_inventario i set estado = 'duplicado', duplicado_de = o.primero,
         motivo = 'Mismo archivo (sha256) que la fila ' || o.primero, actualizado = now()
  from (select sha256, min(id) primero from public.sag_inventario where sha256 is not null group by 1) o
  where i.sha256 = o.sha256 and i.id <> o.primero and i.estado in ('descargado', 'texto')
  returning i.id
) select count(*) n from d;""", "duplicados")
    # En otra sentencia: Postgres no aplica dos UPDATE a la misma fila en una sola sentencia.
    filas2 = sql("""
with e as (
  update public.sag_inventario i set estado = 'ya_en_base', documento_id = doc.id, producto_id = doc.product_id,
         motivo = 'El mismo PDF ya está en la base (documents)', actualizado = now()
  from public.documents doc
  where doc.sha256 = i.sha256 and i.estado in ('descargado', 'texto')
  returning i.id
) select count(*) n from e;""", "ya_en_base")
    return {"duplicados": filas[0]["n"], "ya_en_base": filas2[0]["n"]}


def main():
    consola_utf8()
    args = sys.argv[1:]
    limite = int(args[args.index("--limite") + 1]) if "--limite" in args else None
    pausa = float(args[args.index("--pausa") + 1]) if "--pausa" in args else 1.0
    if "--ids" in args:
        ids = [int(x) for x in args[args.index("--ids") + 1].split(",")]
        pendientes = sql(f"select id, url from public.sag_inventario where id in ({','.join(map(str, ids))}) order by id")
    else:
        pendientes = sql("select id, url from public.sag_inventario where estado = 'nuevo' "
                         "order by prioridad nulls last, id" + (f" limit {limite}" if limite else ""))
    print(f"Por bajar: {len(pendientes)}", flush=True)
    resultados, ok, malos = [], 0, 0
    for n, fila in enumerate(pendientes, 1):
        destino = ruta("sag", "pdf", f"{fila['id']}.pdf")
        r = {"id": fila["id"]}
        try:
            if os.path.exists(destino):
                with open(destino, "rb") as f:
                    datos = f.read()
            else:
                datos = bajar(fila["url"])
                time.sleep(pausa)
            if not datos.lstrip()[:5].startswith(b"%PDF"):
                raise ValueError("lo bajado no es un PDF")
            if not os.path.exists(destino):
                with open(destino + ".tmp", "wb") as f:
                    f.write(datos)
                os.replace(destino + ".tmp", destino)
            r.update(estado="descargado", sha256=sha256_de(datos), bytes=len(datos), paginas=paginas_de(destino))
            ok += 1
        except LinkRoto as e:
            r.update(estado="error_descarga", motivo=f"Link roto ({e})")
            malos += 1
        except Exception as e:  # noqa: BLE001
            r.update(estado="error_descarga", motivo=f"{type(e).__name__}: {e}"[:300])
            malos += 1
        resultados.append(r)
        if len(resultados) >= 20:
            anotar(resultados)
            resultados = []
        if n % 20 == 0 or n == len(pendientes):
            print(f"  {n}/{len(pendientes)}: {ok} bajados, {malos} con error", flush=True)
    anotar(resultados)
    print("Duplicados y ya cargados:", marcar_duplicados())


if __name__ == "__main__":
    main()
