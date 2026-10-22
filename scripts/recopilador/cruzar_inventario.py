"""Paso 1b del recopilador: carga el listado del SAG a `sag_inventario` y lo cruza con las listas
oficiales y con la base. Sin IA. Se puede correr las veces que haga falta (no retrocede estados).

Uso:  python -I scripts/recopilador/cruzar_inventario.py [listado.json]

- Sin argumento usa el listado más nuevo de <datos>/sag/ (inventario_sag.py) y las listas de
  <datos>/oficiales/ (listas_oficiales.py).
- Filas nuevas: «nuevo» si parece etiqueta (tema «Etiquetas», o sin tema pero con empresa) y es PDF;
  «no_etiqueta» si no; «error_descarga» si el listado no trae link (url = sin-link:<nombre>|<empresa>).
- Cruce por nombre con la planilla de autorizados y con los cancelados (provisorio: el cruce firme es
  por el N° SAG leído de la etiqueta, en textos.py). Prioridad: vigentes primero; insecticidas,
  fungicidas, herbicidas y acaricidas antes; etiquetas más nuevas antes.
- Filas que ya no aparecen en el listado quedan con en_listado = false.
"""
import collections
import datetime
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import oficiales  # noqa: E402
from comun import DATOS, consola_utf8, leer_json, lit, norm, sql  # noqa: E402

CUATRO = re.compile(r"insectic|fungic|herbic|acaric", re.I)
NO_ETIQUETA_TIPOS = {"Informes", "Guías y Manuales", "Material de Difusión", "Fichas Técnicas"}
MESES = {"ene": 1, "feb": 2, "mar": 3, "abr": 4, "may": 5, "jun": 6, "jul": 7, "ago": 8, "sep": 9,
         "set": 9, "oct": 10, "nov": 11, "dic": 12}


def fecha_de_archivo(archivo):
    """Fecha en el nombre del archivo, si la trae (04-10-2026, 20.01.2026, 20241202, 24062026…)."""
    base = os.path.splitext(archivo)[0]
    cands = []
    for d, m, a in re.findall(r"(?<!\d)(\d{1,2})[-._ ](\d{1,2})[-._ ](20\d{2})(?!\d)", base):
        cands.append((int(a), int(m), int(d)))
    for a, m, d in re.findall(r"(?<!\d)(20\d{2})[-._]?(\d{2})[-._]?(\d{2})(?!\d)", base):
        cands.append((int(a), int(m), int(d)))
    for d, m, a in re.findall(r"(?<!\d)(\d{2})(\d{2})(20\d{2})(?!\d)", base):
        cands.append((int(a), int(m), int(d)))
    for fecha in cands:
        try:
            f = datetime.date(*fecha)
            if datetime.date(2000, 1, 1) <= f <= datetime.date.today() + datetime.timedelta(days=60):
                return f.isoformat()
        except ValueError:
            pass
    return None


def es_candidata(f):
    if f["tema"] == "Etiquetas" or re.search(r"etiq|hds|msds", f.get("archivo") or "", re.I):
        return True
    return not f["tema"] and bool(f["empresa"]) and f["tipo"] not in NO_ETIQUETA_TIPOS


def emparejar(nombre, empresa, indice):
    """Busca por nombre normalizado (igual, o uno empieza con el otro); desempata por la empresa."""
    n = norm(nombre)
    cands = indice.get(n, [])
    if not cands:
        cands = [x for k, xs in indice.items() for x in xs
                 if len(k) >= 4 and (n.startswith(k + " ") or k.startswith(n + " "))]
    if len(cands) > 1 and empresa:
        e = norm(empresa).split()[:1]
        mismos = [x for x in cands if e and norm(x.get("titular") or "").split()[:1] == e]
        cands = mismos or cands
    return cands[0] if len(cands) == 1 else None


def main():
    consola_utf8()
    archivo = sys.argv[1] if len(sys.argv) > 1 else sorted(glob.glob(os.path.join(DATOS, "sag", "listado_*.json")))[-1]
    listado = leer_json(archivo)
    fecha_listado = listado["fecha"]
    aut = oficiales.autorizados()
    canc = oficiales.cancelados()
    indice_aut = collections.defaultdict(list)
    for x in aut.values():
        indice_aut[norm(x["nombre"])].append(x)
    indice_canc = collections.defaultdict(list)
    for x in canc.values():
        # nombre comercial: lo que va entre el N° y el primer ingrediente; se compara por prefijo
        indice_canc[norm(" ".join(x["texto"].split()[1:4]))].append(x)

    filas = []
    for f in listado["filas"]:
        enlaces = ([f["url"]] if f["url"] else []) + f.get("otros_enlaces", [])
        for k, url in enumerate(enlaces or [None]):
            g = dict(f)
            g["url"] = url or f"sin-link:{norm(f['nombre'])}|{norm(f['empresa'] or '')}"
            if k:
                g["nombre"] = f"{f['nombre']} (link {k + 1})"
                g["archivo"] = os.path.basename(url)
            ext = os.path.splitext(g["archivo"] or "")[1].lower()
            if not url:
                g["estado"], g["motivo"] = "error_descarga", "El listado del SAG no trae link al PDF"
            elif ext != ".pdf":
                g["estado"], g["motivo"] = "no_etiqueta", f"No es PDF ({ext or 'sin extensión'})"
            elif not es_candidata(g):
                g["estado"], g["motivo"] = "no_etiqueta", f"Listado: tema «{g['tema']}», tipo «{g['tipo']}», sin empresa"
            else:
                g["estado"], g["motivo"] = "nuevo", None
            a = emparejar(f["nombre"], f["empresa"], indice_aut) if g["estado"] != "no_etiqueta" else None
            c = None
            if g["estado"] != "no_etiqueta":
                n = norm(f["nombre"])
                c = next((x for k2, xs in indice_canc.items() for x in xs if k2.startswith(n) or n.startswith(k2)), None)
            g["aut"], g["canc"] = a, c
            g["fecha"] = fecha_de_archivo(g["archivo"] or "")
            grupo = (0 if a and CUATRO.search(a["aptitud"] or "") else 1 if a else 3 if c else 2)
            anio = int((g["fecha"] or "")[:4] or g["anio"] or 2000)
            g["prioridad"] = None if g["estado"] == "no_etiqueta" else grupo * 1000 + (2100 - anio)
            filas.append(g)
    # Un mismo PDF puede aparecer en dos filas (link extra de una fila = link principal de otra).
    vistas, unicas = set(), []
    for g in sorted(filas, key=lambda g: " (link " in g["nombre"]):
        if g["url"] not in vistas:
            vistas.add(g["url"])
            unicas.append(g)
    print(f"Filas repetidas por url (se cargan una vez): {len(filas) - len(unicas)}")
    filas = unicas

    valores = ",\n".join(
        "(" + ", ".join([
            lit(g["url"]), lit(g["archivo"] or ""), lit(g["nombre"]), lit(g["tema"] or None),
            f"{lit(g['anio'])}::smallint", lit(g["empresa"]), lit(g["observaciones"] or None),
            f"{lit(g['pagina_listado'])}::smallint", f"{lit(g['fila_listado'])}::smallint", lit(g["estado"]), lit(g["motivo"]),
            lit(g["aut"]["nsag"] if g["aut"] else None), lit(g["aut"]["nombre"] if g["aut"] else None),
            lit(g["aut"]["aptitud"] if g["aut"] else None), lit(g["aut"]["titular"] if g["aut"] else None),
            f"{lit(g['aut']['vence'] if g['aut'] else None)}::date",
            f"{lit(g['canc']['fecha_limite'] if g['canc'] else None)}::date",
            f"{lit(g['fecha'])}::date", f"{lit(g['prioridad'])}::int"]) + ")"
        for g in filas)
    resumen = sql(f"""
with v(url, archivo, nombre, tema, anio, empresa, observaciones, pagina, fila, estado, motivo,
       a_nsag, a_nombre, a_aptitud, a_titular, a_vence, c_limite, fecha, prioridad) as (values
{valores}
), up as (
  insert into public.sag_inventario as i (url, archivo, nombre, tema, anio, empresa, observaciones,
    pagina_listado, fila_listado, estado, motivo, autorizado_nsag, autorizado_nombre, autorizado_aptitud,
    autorizado_titular, autorizado_vence, cancelado_fecha_limite, fecha_etiqueta, prioridad,
    visto_primera, visto_ultima)
  select url, archivo, nombre, tema, anio, empresa, observaciones, pagina, fila, estado, motivo,
    a_nsag, a_nombre, a_aptitud, a_titular, a_vence, c_limite, fecha, prioridad,
    {lit(fecha_listado)}::date, {lit(fecha_listado)}::date
  from v
  on conflict (url) do update set
    archivo = excluded.archivo, nombre = excluded.nombre, tema = excluded.tema, anio = excluded.anio,
    empresa = excluded.empresa, observaciones = excluded.observaciones,
    pagina_listado = excluded.pagina_listado, fila_listado = excluded.fila_listado,
    visto_ultima = excluded.visto_ultima, en_listado = true,
    autorizado_nsag = case when i.registro_sag is null then excluded.autorizado_nsag else i.autorizado_nsag end,
    autorizado_nombre = case when i.registro_sag is null then excluded.autorizado_nombre else i.autorizado_nombre end,
    autorizado_aptitud = case when i.registro_sag is null then excluded.autorizado_aptitud else i.autorizado_aptitud end,
    autorizado_titular = case when i.registro_sag is null then excluded.autorizado_titular else i.autorizado_titular end,
    autorizado_vence = case when i.registro_sag is null then excluded.autorizado_vence else i.autorizado_vence end,
    cancelado_fecha_limite = case when i.registro_sag is null then excluded.cancelado_fecha_limite else i.cancelado_fecha_limite end,
    fecha_etiqueta = coalesce(i.fecha_etiqueta, excluded.fecha_etiqueta),
    prioridad = case when i.registro_sag is null then excluded.prioridad else i.prioridad end,
    actualizado = now()
  returning (xmax = 0) as nueva
), fuera as (
  update public.sag_inventario set en_listado = false, actualizado = now()
  where visto_ultima < {lit(fecha_listado)}::date and en_listado
  returning id
)
select (select count(*) from up where nueva) nuevas, (select count(*) from up where not nueva) actualizadas,
       (select count(*) from fuera) ya_no_aparecen;""", "inventario")
    print("Base:", resumen)

    # Resumen para Cristóbal
    estados = collections.Counter(g["estado"] for g in filas)
    cand = [g for g in filas if g["estado"] == "nuevo"]
    con_aut = [g for g in cand if g["aut"]]
    nsag_listado = {g["aut"]["nsag"] for g in con_aut}
    productos_base = sql("select commercial_name::text nombre, registration_number reg from public.products")
    nombres_base = {norm(p["nombre"]) for p in productos_base}
    regs_base = {oficiales.nsag(p["reg"]) for p in productos_base if p["reg"]}
    ya_en_base = [g for g in cand if norm(g["nombre"]) in nombres_base or (g["aut"] and g["aut"]["nsag"] in regs_base)]
    print(f"Filas del listado (con links extra): {len(filas)}")
    print("Estados iniciales:", dict(estados))
    print(f"Etiquetas por bajar: {len(cand)}; calzan por nombre con la planilla de autorizados: {len(con_aut)} "
          f"({len(nsag_listado)} productos distintos); con la lista de cancelados: {sum(1 for g in cand if g['canc'])}")
    print(f"Ya en la base (por nombre o N° SAG, provisorio): {len(ya_en_base)}")
    print(f"Autorizados en la planilla: {len(aut)}; sin etiqueta en el listado (por nombre, provisorio): "
          f"{len(set(aut) - nsag_listado)}")


if __name__ == "__main__":
    main()
