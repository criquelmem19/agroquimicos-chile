"""Paso 5 del recopilador: verifica y carga a la base las etiquetas extraídas. Sin IA.

Uso:  python -I scripts/recopilador/cargar.py <carpeta_json> [--ids 1,2,3] [--lote NOMBRE] [--modelo MODELO] [--ensayo]

- Toma <carpeta_json>/<id>.json (lo que escribieron los subagentes), lo verifica (verificar.py) y lo carga
  en una transacción por etiqueta. --ensayo solo escribe el SQL en <datos>/sag/sql/ (no toca la base).
- Producto nuevo (su N° SAG no está en products): crea producto, documento (URL oficial del SAG, sin subir
  el PDF), categorías, ingredientes, empresas, líneas de uso con sus objetivos, perfil de seguridad y la
  corrida en extraction_runs. Todo «pendiente». Las citas van en field_citations.
- Producto que ya está en la base: no toca sus datos. Agrega el documento del SAG y escribe las
  diferencias (dosis y carencia por cultivo) en <datos>/sag/diferencias.csv. Estado «diferencias».
- Cultivos, objetivos, empresas e ingredientes se buscan primero en la base (nombre sin tildes ni
  mayúsculas, plural/singular; cultivos también por sus alias). Lo nuevo queda en recopilador_revision.
- Inventario: «cargado» o «diferencias», con producto, documento, lote y versión del extractor.
- --completar (etiquetas ya «cargado», con una extracción nueva): solo llena campos vacíos de las líneas que
  calzan (página, fila, cultivo y objetivo); no agrega líneas ni reemplaza valores o citas. Muestra cuánto ganó.
  Con --ensayo lo aplica en una transacción que se deshace y cuenta los valores que cambiarían (debe ser 0).
"""
import csv
import datetime
import json
import os
import re
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import expandir  # noqa: E402
import oficiales  # noqa: E402
import verificar  # noqa: E402
from comun import consola_utf8, leer_json, lit, norm, ruta, sql  # noqa: E402
from verificar import suelto  # noqa: E402

EXTRACTOR = "recopilador-sag-v1"
CATEGORIAS = {  # palabra de la etiqueta (normalizada) → categoría existente
    "insecticida": "Insecticida", "fungicida": "Fungicida", "herbicida": "Herbicida", "acaricida": "Acaricida",
    "nematicida": "Nematicida", "bactericida": "Bactericida", "coadyuvante": "Coadyuvante",
    "bioestimulante": "Bioestimulante", "fitorregulador": "Hormona", "regulador de crecimiento": "Hormona",
    "regulador de crecimiento vegetal": "Hormona", "hormona": "Hormona", "insecticida sanitario": "Insecticida sanitario",
}
METODOS = {"Al follaje", "Vía riego", "Al suelo", "Al surco", "Tratamiento de semillas", "Inmersión",
           "Aplicación terrestre", "Aplicación aérea", "Otro"}
BASES = {"por_100_l", "por_l", "por_ha", "por_100_kg_semilla", "por_kg_semilla", "porcentaje", "otro"}
SUFIJOS_EMPRESA = r"\b(s ?a|s ?p ?a|ltda|limitada|chile|sociedad anonima|co|ltd|inc|llc|gmbh|ag|corp|corporation|s ?r ?l|s ?a ?c|cia)\b"


def texto(c):
    return " … ".join(x.strip() for x in c) if isinstance(c, list) else (c or "").strip()


def cita(d, fuente_pag=None, **extra):
    out = {"cita": texto(d["c"]), "pagina": d["p"], "extractor": EXTRACTOR}
    if fuente_pag:
        out["fuente"] = fuente_pag
    out.update({k: v for k, v in extra.items() if v is not None})
    return out


def capitalizar(nombre):
    n = re.sub(r"\s+", " ", nombre).strip(" .,;:")
    return n[:1].upper() + n[1:].lower() if n.isupper() else n[:1].upper() + n[1:]


class Catalogo:
    def __init__(self):
        filas = sql("""select json_build_object(
  'cultivos', (select json_agg(json_build_object('n', name::text, 'a', aliases)) from public.crops),
  'objetivos', (select json_agg(json_build_object('c', common_name::text, 's', scientific_name::text)) from public.targets),
  'empresas', (select json_agg(legal_name::text) from public.companies),
  'ingredientes', (select json_agg(json_build_object('n', common_name::text, 'g', mechanism_group, 's', mechanism_system)) from public.active_ingredients),
  'categorias', (select json_agg(name::text) from public.categories),
  'registros', (select json_agg(json_build_object('r', registration_number, 'id', id, 'n', commercial_name::text)) from public.products where registration_number is not null),
  'sin_registro', (select json_agg(json_build_object('id', id, 'n', commercial_name::text)) from public.products where registration_number is null)
) as c""", "catalogo")[0]["c"]
        if isinstance(filas, str):
            filas = json.loads(filas)
        self.cultivos = {}
        for c in filas["cultivos"] or []:
            for nombre in [c["n"]] + list(c["a"] or []):
                self.cultivos.setdefault(expandir.clave_cultivo(nombre), c["n"])
        self.objetivos = {(suelto(o["c"]), suelto(o["s"] or "")): (o["c"], o["s"]) for o in filas["objetivos"] or []}
        self.empresas = {self.clave_empresa(e): e for e in filas["empresas"] or []}
        self.ingredientes = {suelto(i["n"]): i for i in filas["ingredientes"] or []}
        self.categorias = {suelto(c): c for c in filas["categorias"] or []}
        self.registros = {r["r"]: r for r in filas["registros"] or []}
        # Productos cargados antes sin N° SAG: si llega su etiqueta, se reconocen por el nombre (no se duplican).
        self.sin_registro = {suelto(p["n"]): p for p in filas["sin_registro"] or []}

    @staticmethod
    def clave_empresa(nombre):
        return re.sub(r"\s+", "", re.sub(SUFIJOS_EMPRESA, " ", norm(nombre)))

    def cultivo(self, nombre):
        k = expandir.clave_cultivo(nombre)
        if k in self.cultivos:
            return self.cultivos[k], False
        nuevo = capitalizar(nombre)
        self.cultivos[k] = nuevo
        return nuevo, True

    def objetivo(self, comun, cientifico):
        k = (suelto(comun), suelto(cientifico or ""))
        if k in self.objetivos:
            return self.objetivos[k][0], self.objetivos[k][1], False
        nuevo = (capitalizar(comun), (cientifico or "").strip() or None)
        self.objetivos[k] = nuevo
        return nuevo[0], nuevo[1], True

    def empresa(self, nombre):
        k = self.clave_empresa(nombre)
        if k in self.empresas:
            return self.empresas[k], False
        nuevo = re.sub(r"\s+", " ", nombre).strip(" ,;:")
        self.empresas[k] = nuevo
        return nuevo, True

    def ingrediente(self, nombre):
        k = suelto(nombre)
        if k in self.ingredientes:
            return self.ingredientes[k]["n"], False
        nuevo = capitalizar(nombre.strip(" *"))
        self.ingredientes[k] = {"n": nuevo, "g": None, "s": None}
        return nuevo, True

    def categoria(self, palabra):
        n = norm(palabra)
        for clave in sorted(CATEGORIAS, key=len, reverse=True):
            if n == clave or n.startswith(clave + " "):
                return CATEGORIAS[clave], False
        k = suelto(palabra)
        if k in self.categorias:
            return self.categorias[k], False
        nuevo = capitalizar(palabra)
        self.categorias[k] = nuevo
        return nuevo, True


def concentraciones(c):
    t = texto(c).lower().replace(",", ".")
    pv = re.search(r"(\d+(?:\.\d+)?)\s*%\s*(?:\()?p\s*/\s*v", t)
    gl = re.search(r"(\d+(?:\.\d+)?)\s*g\s*/\s*l\b", t)
    return (float(pv.group(1)) if pv else None), (float(gl.group(1)) if gl else None)


def fecha_completa(v):
    try:
        return datetime.date.fromisoformat(str(v)).isoformat()
    except (TypeError, ValueError):
        return None


class Carga:
    """Arma el SQL de una etiqueta (producto nuevo)."""

    def __init__(self, cat, inv, ver, modelo, lote, info_paginas):
        self.cat, self.inv, self.ver, self.modelo, self.lote = cat, inv, ver, modelo, lote
        self.ocr = {p["pagina"] for p in info_paginas if p.get("fuente") == "ocr"}
        self.hds = set(inv.get("paginas_hds") or [])
        self.sql = []
        self.revision = []  # (tipo, nombre, motivo)
        self.p_id, self.d_id = str(uuid.uuid4()), str(uuid.uuid4())
        self.completar_doc = None  # documento ya cargado cuyas líneas solo se completan (--completar)

    def fuente(self, p):
        return "hds" if p in self.hds else ("ocr" if p in self.ocr else None)

    def nuevo(self, tipo, nombre, motivo):
        self.revision.append((tipo, nombre, motivo))

    def armar(self, oficial):
        v, inv, cat = self.ver, self.inv, self.cat
        pr = v.get("producto") or {}
        fc = {}
        for clave in ("nombre", "registro_sag", "formulacion", "fecha_etiqueta", "contenido_neto",
                      "clasificacion_toxicologica", "inflamable", "corrosivo", "explosivo", "solo_exportacion"):
            if pr.get(clave):
                fc[clave] = cita(pr[clave], self.fuente(pr[clave]["p"]))
        if pr.get("categorias"):
            fc["categorias"] = [cita(c) for c in pr["categorias"]]
        nombre = (pr.get("nombre") or {}).get("v") or inv["nombre"]
        if not pr.get("nombre"):
            fc["nombre"] = {"fuente": "listado del SAG", "extractor": EXTRACTOR}
        registro = (pr.get("registro_sag") or {}).get("v") or inv.get("registro_sag")
        if registro and not pr.get("registro_sag"):
            fc["registro_sag"] = {"fuente": "texto de la etiqueta (leído por script)", "extractor": EXTRACTOR}
        form = pr.get("formulacion") or {}
        solo_exp = bool((pr.get("solo_exportacion") or {}).get("v")) or bool(inv.get("solo_exportacion"))
        a, c, b = oficial["aut"].get(registro), oficial["canc"].get(registro), oficial["abejas"].get(registro)
        estado = "autorizado" if a else ("cancelado" if c else "no_figura")
        prohibida = next((i["nombre"] for i in v.get("ingredientes") or []
                          if oficiales.contiene_prohibido(i["nombre"], oficial["prohibidos"])), None)
        fecha = fecha_completa((pr.get("fecha_etiqueta") or {}).get("v"))
        self.sql.append(f"""insert into public.products (id, commercial_name, registration_number, formulation_code,
  formulation_name, label_version_date, net_content_raw, hazard_classification, is_flammable, is_corrosive, is_explosive,
  field_citations, sag_estado, sag_vencimiento, sag_fecha_limite, solo_exportacion, sustancia_prohibida,
  toxicidad_abejas, avisaje_abejas)
values ({lit(self.p_id)}, {lit(nombre)}, {lit(registro)}, {lit(form.get('codigo'))}, {lit(form.get('nombre'))},
  {lit(fecha)}::date, {lit(texto(pr['contenido_neto']['c']) if pr.get('contenido_neto') else None)},
  {lit(texto(pr['clasificacion_toxicologica']['c']) if pr.get('clasificacion_toxicologica') else None)},
  {lit((pr.get('inflamable') or {}).get('v'))}, {lit((pr.get('corrosivo') or {}).get('v'))}, {lit((pr.get('explosivo') or {}).get('v'))},
  {lit(fc)}, {lit(estado)}, {lit(a['vence'] if a else None)}::date, {lit(c['fecha_limite'] if c else None)}::date,
  {lit(solo_exp)}, {lit(prohibida)}, {lit(b['toxicidad'] if b else None)}, {lit(b['avisaje'] if b else None)});""")
        paginas_et = ",".join(map(str, inv.get("paginas_etiqueta") or []))
        paginas_hds = ",".join(map(str, inv.get("paginas_hds") or []))
        nota = (f"Listado de etiquetas del SAG (visto el {inv['visto_ultima']}). Páginas de etiqueta: {paginas_et or '—'}"
                + (f"; hoja de seguridad: {paginas_hds}" if paginas_hds else "") + ".")
        self.sql.append(f"""insert into public.documents (id, product_id, document_type, filename, storage_path, source_url,
  sha256, version_date, page_count, notes)
values ({lit(self.d_id)}, {lit(self.p_id)}, 'etiqueta', {lit(inv['archivo'])}, null, {lit(inv['url'])},
  {lit(inv['sha256'])}, {lit(fecha)}::date, {lit(inv.get('paginas'))}, {lit(nota)});""")
        self.categorias(pr.get("categorias") or [])
        self.ingredientes(v.get("ingredientes") or [])
        self.empresas(v.get("empresas") or [])
        n_lineas = self.usos()
        self.seguridad(v.get("seguridad") or {})
        return n_lineas

    def categorias(self, cats):
        nombres = []
        for c in cats:
            n, es_nueva = self.cat.categoria(c["v"])
            if es_nueva:
                self.sql.append(f"insert into public.categories (name) values ({lit(n)}) on conflict (name) do nothing;")
                self.nuevo("categoria", n, f"Categoría nueva, la etiqueta dice «{texto(c['c'])}»")
            nombres.append(n)
        if nombres:
            self.sql.append(f"""insert into public.product_categories (product_id, category_id)
select {lit(self.p_id)}, id from public.categories where name in ({','.join(lit(n) for n in sorted(set(nombres)))})
on conflict do nothing;""")

    def ingredientes(self, ings):
        vistos = set()
        for i in ings:
            n, es_nuevo = self.cat.ingrediente(i["nombre"])
            if suelto(n) in vistos:
                continue
            vistos.add(suelto(n))
            if es_nuevo:
                self.sql.append(f"insert into public.active_ingredients (common_name) values ({lit(n)}) on conflict (common_name) do nothing;")
                self.nuevo("ingrediente", n, f"Ingrediente nuevo, la etiqueta dice «{texto(i['c'])}»")
            fc = {"nombre": cita(i)}
            conc = i.get("concentracion")
            pv, gl = concentraciones(conc["c"]) if conc else (None, None)
            if conc:
                fc["concentracion"] = cita(conc)
            if i.get("nombre_quimico"):
                fc["nombre_quimico"] = cita(i["nombre_quimico"])
            if i.get("grupo"):
                fc["grupo"] = cita(i["grupo"], sistema=i["grupo"].get("sistema"), grupo=i["grupo"].get("v"))
            self.sql.append(f"""insert into public.product_active_ingredients (product_id, active_ingredient_id, concentration_raw,
  concentration_percent_pv, concentration_g_l, chemical_name_raw, field_citations)
select {lit(self.p_id)}, id, {lit(texto(conc['c']) if conc else '')}, {lit(pv)}, {lit(gl)},
  {lit(texto(i['nombre_quimico']['c']) if i.get('nombre_quimico') else None)}, {lit(fc)}
from public.active_ingredients where common_name = {lit(n)} on conflict do nothing;""")
            g = i.get("grupo")
            sistema = (g or {}).get("sistema")
            if g and g.get("v") and sistema in ("IRAC", "FRAC", "HRAC"):
                grupo = re.sub(r"^(grupo|group)\s*", "", str(g["v"]), flags=re.I).strip()
                self.sql.append(f"""update public.active_ingredients set mechanism_group = {lit(grupo)}, mechanism_system = {lit(sistema)},
  field_citations = field_citations || jsonb_build_object('grupo', {lit(cita(g, documento=self.d_id))}), updated_at = now()
where common_name = {lit(n)} and mechanism_group is null;""")

    def empresas(self, emps):
        vistos = set()
        for e in emps:
            rol = e.get("rol") if e.get("rol") in ("titular", "registrante", "fabricante", "formulador", "importador",
                                                    "distribuidor", "otro") else "otro"
            n, es_nueva = self.cat.empresa(e["nombre"])
            if (n, rol) in vistos:
                continue
            vistos.add((n, rol))
            if es_nueva:
                self.sql.append(f"insert into public.companies (legal_name) values ({lit(n)}) on conflict (legal_name) do nothing;")
                self.nuevo("empresa", n, f"Empresa nueva, la etiqueta dice «{texto(e['c'])}»")
            self.sql.append(f"""insert into public.product_companies (product_id, company_id, role, field_citations)
select {lit(self.p_id)}, id, {lit(rol)}, {lit({'rol': cita(e)})} from public.companies where legal_name = {lit(n)}
on conflict do nothing;""")

    def usos(self):
        filas, objetivos, vistos = [], [], set()
        objetivos_completar = []  # (línea, objetivo, científico): para calzar líneas con --completar
        for l in expandir.lineas(self.ver):
            u = l["uso"]
            cultivo, es_nuevo = self.cat.cultivo(l["cultivo"])
            if es_nuevo:
                self.sql.append(f"insert into public.crops (name) values ({lit(cultivo)}) on conflict (name) do nothing;")
                self.nuevo("cultivo", cultivo, f"Cultivo nuevo, la etiqueta dice «{l['cultivo']}»")
            clave = (u["p"], u["fila"], suelto(cultivo))
            if clave in vistos:
                continue
            vistos.add(clave)
            uid = str(uuid.uuid4())
            fc = {}
            d = u.get("dosis") or {}
            if d.get("texto"):
                fc["dosis"] = {"cita": d["texto"], "pagina": u["p"], "extractor": EXTRACTOR}
            for campo in ("mojamiento", "intervalo", "metodo", "max_aplicaciones", "momento", "observaciones"):
                if u.get(campo):
                    fc[campo] = cita(u[campo], self.fuente(u[campo]["p"]))
            car = l["carencia"]
            dias = na = None
            raw = None
            if car:
                fc["carencia"] = cita(car, self.fuente(car["p"]), condicional=True if car.get("condicional") else None)
                raw = texto(car["c"])
                if car.get("no_aplica"):
                    na = True
                elif not car.get("condicional"):
                    dias = int(car["dias"])
            elif l["conflicto_carencia"]:
                fc["carencia_conflicto"] = True
            metodo = (u.get("metodo") or {}).get("v")
            mo, it, ma = u.get("mojamiento") or {}, u.get("intervalo") or {}, u.get("max_aplicaciones") or {}
            base = d.get("base") if d.get("base") in BASES else ("otro" if d.get("texto") else None)
            confianza = 0.75 if u["p"] in self.ocr else 0.85
            # Herbicidas: la celda de cultivos puede listar 80 cultivos y se repetiría en cada línea. En el
            # texto de origen va solo el cultivo de la línea (también está escrito en esa página).
            frags = u["c"] if isinstance(u["c"], list) else [u["c"]]
            cortos = [f for f in frags if not (len(f) > 200 and sum(suelto(c) in suelto(f) for c in u["cultivos"]) >= 4)]
            fuente = texto([l["cultivo"]] + cortos) if len(cortos) < len(frags) else texto(frags)
            filas.append("(" + ", ".join([
                lit(uid), lit(cultivo), lit(f"{self.inv['id']}-{u['fila']}"), lit(d.get("texto") or ""),
                f"{lit(d.get('min'))}::numeric", f"{lit(d.get('max'))}::numeric", lit(d.get("unidad")), lit(base),
                f"{lit(mo.get('min'))}::numeric", f"{lit(mo.get('max'))}::numeric",
                lit(metodo if metodo in METODOS else None),
                lit(texto(u['momento']['c']) if u.get("momento") else None),
                lit(texto(u['observaciones']['c']) if u.get("observaciones") else None),
                f"{lit(dias)}::int", lit(bool(na)), lit(raw),
                f"{lit(int(ma['v']) if isinstance(ma.get('v'), (int, float)) and ma['v'] > 0 else None)}::smallint",
                f"{lit(int(it['min']) if isinstance(it.get('min'), (int, float)) else None)}::int",
                f"{lit(int(it['max']) if isinstance(it.get('max'), (int, float)) else None)}::int",
                f"{lit(u['p'])}::int", lit(u["fila"]), lit(fuente), f"{confianza}::numeric", lit(fc)]) + ")")
            for o in u.get("objetivos") or []:
                comun, cient, es_nuevo = self.cat.objetivo(o["nombre"], o.get("cientifico"))
                if es_nuevo:
                    tipo = u.get("tipo_objetivo") if u.get("tipo_objetivo") in ("plaga", "enfermedad", "maleza", "otro") else None
                    self.sql.append(f"""insert into public.targets (common_name, scientific_name, target_type)
values ({lit(comun)}, {lit(cient)}, {lit(tipo)}) on conflict do nothing;""")
                    self.nuevo("objetivo", comun + (f" ({cient})" if cient else ""), "Objetivo nuevo")
                objetivos.append(f"({lit(uid)}::uuid, {lit(comun)}, {lit(cient)})")
                objetivos_completar.append((uid, comun, cient))
        columnas = """v(id, cultivo, codigo, dosis, dmin, dmax, unidad, base, mmin, mmax, metodo, momento,
  obs, dias, na, raw, maxap, imin, imax, pagina, fila, fuente, confianza, citas)"""
        if filas and self.completar_doc:
            # Solo llena lo vacío de líneas ya cargadas de este documento; nunca reemplaza un valor. La línea
            # nueva calza con la cargada si coinciden página, n.° de fila y cultivo, y (si las dos tienen
            # objetivos) al menos un objetivo: una extracción nueva puede numerar las filas de otra forma.
            vacia = "pu.withholding_period_days is null and not pu.withholding_not_applicable and pu.withholding_period_raw is null"
            vacios = {  # cita nueva → solo si ese campo estaba vacío (si no, se queda la cita del valor que ya estaba)
                "dosis": "btrim(coalesce(pu.dose_raw, '')) = ''",
                "mojamiento": "pu.water_volume_min_l_ha is null and pu.water_volume_max_l_ha is null",
                "intervalo": "pu.interval_min_days is null and pu.interval_max_days is null",
                "metodo": "pu.application_method is null", "momento": "pu.application_timing is null",
                "observaciones": "pu.observations is null", "max_aplicaciones": "pu.maximum_applications_per_season is null",
                "carencia": vacia}
            citas = ", ".join(f"'{k}', case when {cond} then v.citas::jsonb -> '{k}' end" for k, cond in vacios.items())
            obj = ",".join(f"({lit(u)}::uuid, {lit(c)})" for u, c, _ in objetivos_completar) or "(null::uuid, null::text)"
            self.sql = [s for s in self.sql if not s.startswith(("insert into public.crops", "insert into public.targets"))]
            self.sql.append(f"""with o(u, comun) as (values {obj})
update public.product_uses pu set
  dose_raw = case when btrim(coalesce(pu.dose_raw, '')) = '' then v.dosis else pu.dose_raw end,
  dose_min = case when pu.dose_min is null and pu.dose_max is null then v.dmin else pu.dose_min end,
  dose_max = case when pu.dose_min is null and pu.dose_max is null then v.dmax else pu.dose_max end,
  dose_unit = coalesce(pu.dose_unit, v.unidad), dose_basis = coalesce(pu.dose_basis, v.base),
  water_volume_min_l_ha = case when pu.water_volume_min_l_ha is null and pu.water_volume_max_l_ha is null then v.mmin else pu.water_volume_min_l_ha end,
  water_volume_max_l_ha = case when pu.water_volume_min_l_ha is null and pu.water_volume_max_l_ha is null then v.mmax else pu.water_volume_max_l_ha end,
  application_method = coalesce(pu.application_method, v.metodo), application_timing = coalesce(pu.application_timing, v.momento),
  observations = coalesce(pu.observations, v.obs),
  withholding_period_days = case when {vacia} then v.dias else pu.withholding_period_days end,
  withholding_not_applicable = case when {vacia} then v.na else pu.withholding_not_applicable end,
  withholding_period_raw = case when {vacia} then v.raw else pu.withholding_period_raw end,
  maximum_applications_per_season = coalesce(pu.maximum_applications_per_season, v.maxap),
  interval_min_days = case when pu.interval_min_days is null and pu.interval_max_days is null then v.imin else pu.interval_min_days end,
  interval_max_days = case when pu.interval_min_days is null and pu.interval_max_days is null then v.imax else pu.interval_max_days end,
  field_citations = (pu.field_citations - case when {vacia} and v.raw is not null then 'carencia_conflicto' else '' end)
    || jsonb_strip_nulls(jsonb_build_object({citas})),
  updated_at = now()
from (values {','.join(filas)}) as {columnas}
join public.crops c on c.name = v.cultivo
where pu.source_document_id = {lit(self.completar_doc)}::uuid and pu.source_table_row = v.fila and pu.crop_id = c.id
  and pu.source_page = v.pagina and pu.review_status = 'pendiente'
  and (not exists (select 1 from o where o.u = v.id::uuid)
       or not exists (select 1 from public.use_targets ut where ut.product_use_id = pu.id)
       or exists (select 1 from o join public.targets t on t.common_name = o.comun
                  join public.use_targets ut on ut.target_id = t.id and ut.product_use_id = pu.id where o.u = v.id::uuid));""")
            return len(filas)
        if filas:
            self.sql.append(f"""insert into public.product_uses (id, product_id, crop_id, source_use_code, dose_raw, dose_min, dose_max,
  dose_unit, dose_basis, water_volume_min_l_ha, water_volume_max_l_ha, application_method, application_timing,
  observations, withholding_period_days, withholding_not_applicable, withholding_period_raw,
  maximum_applications_per_season, interval_min_days, interval_max_days, source_document_id, source_page,
  source_table_row, source_text, confidence_score, review_status, field_citations)
select v.id::uuid, {lit(self.p_id)}::uuid, c.id, v.codigo, v.dosis, v.dmin, v.dmax, v.unidad, v.base, v.mmin, v.mmax, v.metodo,
  v.momento, v.obs, v.dias, v.na, v.raw, v.maxap, v.imin, v.imax, {lit(self.d_id)}::uuid, v.pagina, v.fila, v.fuente,
  v.confianza, 'pendiente', v.citas
from (values {','.join(filas)}) as v(id, cultivo, codigo, dosis, dmin, dmax, unidad, base, mmin, mmax, metodo, momento,
  obs, dias, na, raw, maxap, imin, imax, pagina, fila, fuente, confianza, citas)
join public.crops c on c.name = v.cultivo;""")
        if objetivos:
            self.sql.append(f"""insert into public.use_targets (product_use_id, target_id)
select v.u, t.id from (values {','.join(objetivos)}) as v(u, comun, cient)
join public.targets t on t.common_name = v.comun and t.scientific_name is not distinct from v.cient::citext
on conflict do nothing;""")
        return len(filas)

    def seguridad(self, s):
        if not s:
            return
        fc = {}
        for clave, d in s.items():
            if clave in ("advertencias", "telefonos"):
                fc[clave] = [cita(x, self.fuente(x["p"])) for x in d]
            else:
                fc[clave] = cita(d, self.fuente(d["p"]))
        t = lambda k: texto(s[k]["c"]) if s.get(k) else None  # noqa: E731
        reingreso = (s.get("reingreso") or {}).get("horas")
        primeros = {"general": t("primeros_auxilios")} if s.get("primeros_auxilios") else {}
        contactos = [{"nombre": x.get("nombre"), "telefono": x.get("numero")} for x in s.get("telefonos") or []]
        avisos = [texto(x["c"]) for x in s.get("advertencias") or []]
        self.sql.append(f"""insert into public.product_safety_profiles (product_id, source_document_id, reentry_hours, ppe_preparation,
  ppe_application, storage, poisoning_symptoms, first_aid, antidote, emergency_medical_treatment, ecotoxicology,
  mix_preparation, compatibility, incompatibility, phytotoxicity, resistance_management, warnings, emergency_contacts,
  field_citations)
values ({lit(self.p_id)}, {lit(self.d_id)}, {lit(reingreso)}::numeric, {lit(t('epp_preparacion'))}, {lit(t('epp_aplicacion'))},
  {lit(t('almacenamiento'))}, {lit(t('sintomas_intoxicacion'))}, {lit(primeros)}, {lit(t('antidoto'))},
  {lit(t('tratamiento_medico'))}, {lit(t('ecotoxicologia'))}, {lit(t('preparacion_mezcla'))}, {lit(t('compatibilidad'))},
  {lit(t('incompatibilidad'))}, {lit(t('fitotoxicidad'))}, {lit(t('manejo_resistencia'))},
  array[{','.join(lit(a) for a in avisos)}]::text[], {lit(contactos)}, {lit(fc)});""")

    def cierre(self, estado, extra=""):
        notas = self.ver.get("verificacion", [])
        resumen = {"usos": len(self.ver.get("usos", [])), "lineas": len(expandir.lineas(self.ver)),
                   "descartados": sum(1 for n in notas if "descartado" in n["estado"]),
                   "notas": notas[:60], "problemas": self.ver.get("problemas", [])[:20]}
        self.sql.append(f"""insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output,
  started_at, finished_at)
values ({lit(self.d_id)}, 'validado', {lit(EXTRACTOR)}, {lit(self.modelo)}, {lit(resumen)}, now(), now());""")
        for tipo, nombre, motivo in self.revision:
            self.sql.append(f"""insert into public.recopilador_revision (tipo, nombre, documento_id, motivo)
values ({lit(tipo)}, {lit(nombre)}, {lit(self.d_id)}, {lit(motivo)});""")
        self.sql.append(f"""update public.sag_inventario set estado = {lit(estado)}, producto_id = {lit(self.p_id)},
  documento_id = {lit(self.d_id)}, lote = {lit(self.lote)}, extractor_version = {lit(EXTRACTOR)},
  motivo = {lit(extra or None)}, actualizado = now()
where id = {self.inv['id']};""")


def diferencias(cat, inv, ver, producto, lote, modelo, salida_csv):
    """Producto ya en la base: agrega el documento del SAG y anota diferencias de dosis y carencia."""
    filas = sql(f"""select c.name::text cultivo, pu.dose_raw, pu.dose_min, pu.dose_max, pu.withholding_period_days dias,
  pu.withholding_not_applicable na, pu.field_citations->'carencia'->>'condicional' cond
from public.product_uses pu join public.crops c on c.id = pu.crop_id
where pu.product_id = {lit(producto['id'])} and pu.review_status <> 'rechazado'""", "dif_base")
    base = {}
    for f in filas:
        k = expandir.clave_cultivo(f["cultivo"])
        b = base.setdefault(k, {"nombre": f["cultivo"], "dosis": set(), "carencia": set()})
        b["dosis"].add(f["dose_raw"])
        b["carencia"].add("No corresponde" if f["na"] else ("Depende" if f["cond"] else
                          (f"{f['dias']} días" if f["dias"] is not None else "Sin dato")))
    ext = {}
    for l in expandir.lineas(ver):
        k = expandir.clave_cultivo(l["cultivo"])
        e = ext.setdefault(k, {"nombre": l["cultivo"], "dosis": set(), "carencia": set(), "citas": set()})
        e["dosis"].add((l["uso"].get("dosis") or {}).get("texto") or "Sin dato")
        c = l["carencia"]
        e["carencia"].add("No corresponde" if c and c.get("no_aplica") else ("Depende" if c and c.get("condicional")
                          else (f"{c['dias']} días" if c else "Sin dato")))
        if c:
            e["citas"].add(f"«{texto(c['c'])}» (pág. {c['p']})")
    nuevas = []
    for k in sorted(set(base) | set(ext)):
        b, e = base.get(k), ext.get(k)
        if not b:
            nuevas.append([e["nombre"], "cultivo", "no está en la base", "; ".join(sorted(e["dosis"])), ""])
        elif not e:
            nuevas.append([b["nombre"], "cultivo", "; ".join(sorted(b["dosis"])), "no está en la etiqueta del SAG", ""])
        else:
            if {suelto(x) for x in b["dosis"]} != {suelto(x) for x in e["dosis"]}:
                nuevas.append([b["nombre"], "dosis", "; ".join(sorted(b["dosis"])), "; ".join(sorted(e["dosis"])), ""])
            if b["carencia"] != e["carencia"]:
                nuevas.append([b["nombre"], "carencia", "; ".join(sorted(b["carencia"])), "; ".join(sorted(e["carencia"])),
                               " ".join(sorted(e["citas"]))])
    nuevo_archivo = not os.path.exists(salida_csv)
    with open(salida_csv, "a", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";")
        if nuevo_archivo:
            w.writerow(["producto", "registro", "cultivo", "dato", "en la base", "en la etiqueta del SAG", "cita",
                        "etiqueta del SAG", "fecha del archivo", "inventario"])
        for d in nuevas:
            w.writerow([producto["n"], inv.get("registro_sag"), *d, inv["url"], inv.get("fecha_etiqueta") or "", inv["id"]])
    d_id = str(uuid.uuid4())
    sentencias = [f"""insert into public.documents (id, product_id, document_type, filename, storage_path, source_url, sha256,
  page_count, notes)
values ({lit(d_id)}, {lit(producto['id'])}, 'etiqueta', {lit(inv['archivo'])}, null, {lit(inv['url'])}, {lit(inv['sha256'])},
  {lit(inv.get('paginas'))}, {lit('Etiqueta del listado del SAG (otra versión). Los datos del producto vienen de la otra etiqueta; las diferencias quedaron para revisión.')})
on conflict (sha256) do nothing;""",
                  f"""insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output, started_at, finished_at)
select id, 'validado', {lit(EXTRACTOR)}, {lit(modelo)}, {lit({'diferencias': len(nuevas), 'lineas': len(expandir.lineas(ver))})}, now(), now()
from public.documents where sha256 = {lit(inv['sha256'])};""",
                  f"""update public.sag_inventario set estado = 'diferencias', producto_id = {lit(producto['id'])},
  documento_id = (select id from public.documents where sha256 = {lit(inv['sha256'])}), lote = {lit(lote)},
  extractor_version = {lit(EXTRACTOR)}, motivo = {lit(f'Producto ya en la base: {len(nuevas)} diferencias anotadas')}, actualizado = now()
where id = {inv['id']};"""]
    return sentencias, len(nuevas)


def main():
    consola_utf8()
    args = sys.argv[1:]
    carpeta = args[0]
    lote = args[args.index("--lote") + 1] if "--lote" in args else datetime.date.today().isoformat()
    modelo = args[args.index("--modelo") + 1] if "--modelo" in args else None
    ensayo = "--ensayo" in args
    if "--ids" in args:
        ids = [int(x) for x in args[args.index("--ids") + 1].split(",")]
    else:
        ids = sorted(int(f[:-5]) for f in os.listdir(carpeta) if re.fullmatch(r"\d+\.json", f))
    invs = {r["id"]: r for r in sql(f"""select id, url, archivo, nombre, estado, registro_sag, sha256, paginas,
  paginas_etiqueta, paginas_hds, solo_exportacion, fecha_etiqueta, visto_ultima, producto_id
from public.sag_inventario where id in ({','.join(map(str, ids)) or '0'})""", "inventario_carga")}
    oficial = {"aut": oficiales.autorizados(), "canc": oficiales.cancelados(), "abejas": oficiales.abejas(),
               "prohibidos": oficiales.prohibidos()}
    cat = Catalogo()
    csv_dif = ruta("sag", "diferencias.csv")
    total = {"cargadas": 0, "diferencias": 0, "no_etiqueta": 0, "omitidas": 0, "errores": 0, "lineas": 0}
    if "--completar" in args:
        # Etiquetas ya cargadas: con el verificador mejorado se llenan campos que quedaron vacíos.
        # --ensayo: aplica dentro de una transacción que se deshace y muestra cómo quedaría (no toca la base).
        docs = {r["id"]: r for r in sql(f"select id, producto_id, documento_id from public.sag_inventario "
                                        f"where estado = 'cargado' and id in ({','.join(map(str, ids)) or '0'})")}
        for i in ids:
            if i not in docs:
                print(f"{i}: se omite (no está «cargado»)")
        campos = ("lineas", "dosis", "carencia", "mojamiento", "intervalo", "metodo")
        # En el ensayo también cuenta las líneas en que cambiaría un valor o una cita que ya estaba (debe ser 0).
        reemplazos = " or ".join([f"(a.{c} is not null and a.{c} is distinct from p.{c})" for c in (
            "dose_min", "dose_max", "dose_unit", "dose_basis", "water_volume_min_l_ha", "water_volume_max_l_ha",
            "application_method", "application_timing", "observations", "withholding_period_days",
            "withholding_period_raw", "maximum_applications_per_season", "interval_min_days", "interval_max_days")] + [
            "(btrim(coalesce(a.dose_raw, '')) <> '' and a.dose_raw is distinct from p.dose_raw)",
            "(a.withholding_not_applicable and not p.withholding_not_applicable)",
            "exists (select 1 from jsonb_object_keys(a.field_citations) k where k <> 'carencia_conflicto' "
            "and a.field_citations -> k is distinct from p.field_citations -> k)"])
        for i, r in docs.items():
            def medir(extra=""):
                return f"""select count(*) as lineas,
  count(*) filter (where btrim(coalesce(dose_raw, '')) <> '') as dosis,
  count(*) filter (where withholding_period_days is not null or withholding_not_applicable or withholding_period_raw is not null) as carencia,
  count(*) filter (where water_volume_min_l_ha is not null or water_volume_max_l_ha is not null) as mojamiento,
  count(*) filter (where interval_min_days is not null or interval_max_days is not null) as intervalo,
  count(*) filter (where application_method is not null) as metodo{extra}
from public.product_uses where source_document_id = {lit(r['documento_id'])}::uuid;"""
            try:
                ver = verificar.verificar_archivo(os.path.join(carpeta, f"{i}.json"), os.path.dirname(ruta("sag", "verificado", "x")))
                carga = Carga(cat, invs[i], ver, modelo, lote,
                              leer_json(os.path.join(verificar.carpeta_texto(i), "paginas.json"), []))
                carga.p_id, carga.d_id, carga.completar_doc = r["producto_id"], r["documento_id"], r["documento_id"]
                n = carga.usos()
                notas = ver.get("verificacion", [])
                carga.sql.append(f"""insert into public.extraction_runs (document_id, status, extractor_version, model_name, raw_output,
  started_at, finished_at)
values ({lit(carga.d_id)}, 'validado', {lit(EXTRACTOR)}, {lit(modelo)}, {lit({
                    "completar": True, "lote": lote, "usos": len(ver.get("usos", [])), "lineas": n,
                    "descartados": sum(1 for x in notas if "descartado" in x["estado"]), "notas": notas[:60],
                    "problemas": ver.get("problemas", [])[:20]})}, now(), now());""")
                antes = sql(medir(), f"medir_{i}")[0]
                texto_sql = "\n".join(carga.sql) + "\n"
                with open(ruta("sag", "sql", f"completar_{i}.sql"), "w", encoding="utf-8") as f:
                    f.write("begin;\n" + texto_sql + "commit;\n")
                if ensayo:
                    copia = (f"create temp table antes_c on commit drop as select * from public.product_uses "
                             f"where source_document_id = {lit(r['documento_id'])}::uuid;\n")
                    extra = f""",
  (select count(*) from antes_c a join public.product_uses p using (id) where {reemplazos}) as reemplazados"""
                    despues = sql("begin;\n" + copia + texto_sql + medir(extra) + "\nrollback;\n", f"ensayo_completar_{i}")[0]
                else:
                    sql("begin;\n" + texto_sql + "commit;\n", f"completar_{i}")
                    despues = sql(medir(), f"medir_{i}")[0]
                cambios = ", ".join(f"{c} {antes[c]}→{despues[c]}" for c in campos)
                if ensayo:
                    cambios += f"; valores o citas que ya estaban y cambiarían: {despues['reemplazados']}"
                print(f"{i}: {'ENSAYO, ' if ensayo else ''}{n} líneas en la extracción nueva; {cambios}", flush=True)
            except Exception as e:  # noqa: BLE001
                print(f"{i}: ERROR al completar: {str(e)[:400]}", flush=True)
        return
    for i in ids:
        inv = invs.get(i)
        if not inv or inv["estado"] not in ("texto", "extraido", "validado"):
            print(f"{i}: se omite (estado {inv and inv['estado']})")
            total["omitidas"] += 1
            continue
        try:
            ver = verificar.verificar_archivo(os.path.join(carpeta, f"{i}.json"), os.path.dirname(ruta("sag", "verificado", "x")))
        except Exception as e:  # noqa: BLE001
            print(f"{i}: ERROR al verificar: {e}")
            total["errores"] += 1
            continue
        if not ver.get("es_etiqueta", True):
            sentencias = [f"""update public.sag_inventario set estado = 'no_etiqueta', motivo = {lit('Extracción: ' + (ver.get('motivo_no_etiqueta') or 'no es etiqueta'))},
  lote = {lit(lote)}, extractor_version = {lit(EXTRACTOR)}, actualizado = now() where id = {i};"""]
            clave = "no_etiqueta"
            n = 0
        else:
            registro = ((ver.get("producto") or {}).get("registro_sag") or {}).get("v") or inv.get("registro_sag")
            existente = cat.registros.get(registro) if registro else None
            if not existente:
                nombre_et = ((ver.get("producto") or {}).get("nombre") or {}).get("v") or inv["nombre"]
                existente = cat.sin_registro.get(suelto(nombre_et))
            if existente:
                sentencias, n = diferencias(cat, inv, ver, existente, lote, modelo, csv_dif)
                clave = "diferencias"
            else:
                carga = Carga(cat, inv, ver, modelo, lote, leer_json(os.path.join(verificar.carpeta_texto(i), "paginas.json"), []))
                n = carga.armar(oficial)
                carga.cierre("cargado")
                sentencias = carga.sql
                clave = "cargadas"
                if registro:
                    cat.registros[registro] = {"r": registro, "id": carga.p_id, "n": inv["nombre"]}
        texto_sql = "begin;\n" + "\n".join(sentencias) + "\ncommit;\n"
        with open(ruta("sag", "sql", f"{i}.sql"), "w", encoding="utf-8") as f:
            f.write(texto_sql)
        if ensayo:
            print(f"{i}: SQL listo ({clave}, {n} líneas o diferencias)")
            continue
        try:
            sql(texto_sql, f"carga_{i}")
            total[clave] += 1
            total["lineas"] += n if clave == "cargadas" else 0
            print(f"{i}: {clave} ({n} {'líneas' if clave == 'cargadas' else 'diferencias'})", flush=True)
        except Exception as e:  # noqa: BLE001
            total["errores"] += 1
            print(f"{i}: ERROR al cargar: {str(e)[:400]}", flush=True)
            cat = Catalogo()  # lo nuevo de esta etiqueta no quedó: se vuelve a leer lo que hay
    print("Resumen:", total)


if __name__ == "__main__":
    main()
