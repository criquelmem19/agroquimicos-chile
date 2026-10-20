"""Extrae mojamiento (L/ha), intervalo entre aplicaciones (días) y método de aplicación desde el
texto de cada línea de uso (la fila del cuadro de la etiqueta: source_text, observations,
application_timing), con patrones estrictos. Solo acepta un valor si la frase citada existe tal
cual (salvo espacios) en el texto del PDF. Si una línea trae valores distintos, no se llena.

Uso:  python -I scripts/fase2/extraer_otros.py <lineas.json> <corpus.json> <carpeta_salida>
Salida: mojamiento_v1.json, intervalo_v1.json, metodo_v1.json (formato de exportar_candidatos.py)
y reporte_otros_v1.txt con conteos y conflictos con valores existentes.
"""
import collections
import json
import os
import re
import sys

EXTRACTOR = "campos-fase2-v1"


def norm(s):
    return re.sub(r"\s+", " ", s or "").strip()


def numero(s):
    """'1.500' → 1500; '1,5' → 1.5; '2000' → 2000."""
    s = s.strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return float(s.replace(".", ""))
    return float(s.replace(",", "."))


NUM = r"\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?"
RANGO = rf"({NUM})\s*(?:-|–|a|y|al)\s*({NUM})"

# ---------- Mojamiento ----------
# El número debe ir pegado a una unidad de volumen de agua por hectárea y cerca de una palabra clave.
UNIDAD_AGUA = r"(?:L|l|lt|lts|litros)\.?\s*(?:de\s+)?(?:agua\s*)?/\s*(?:ha|há|hectárea)|(?:L|l|lt|lts|litros)\.?\s+de\s+agua\s+por\s+hect[aá]rea|(?:L|l|lt|lts|litros)\s+(?:de\s+)?agua\s*/\s*ha"
CLAVE_AGUA = r"mojamiento|volumen|agua|caldo"
P_MOJ = re.compile(
    rf"(?P<pre>(?:m[ií]nimo|m[aá]ximo|sugerido|entre|de|con|usar|utilizar|aplicar)?\s*(?:de\s+)?)"
    rf"(?:(?P<a>{NUM})\s*(?:L|l|lt|lts|litros)?\.?\s*(?:-|–|a|y|al)\s*)?(?P<b>{NUM})\s*(?:{UNIDAD_AGUA})", re.I)
UMBRAL_CONCENTRACION = re.compile(
    r"vol[uú]men(?:es)?[^.]{0,30}(?:mayor|superior|sobre|menor|inferior)|respet\w*\s+(?:las?\s+)?dosis\s+por\s+concentraci", re.I)
GRUPO_ANTES = re.compile(
    r"(?:pom[aá]ceas|carozos?|c[ií]tricos|berries|vin[ií]fera|de mesa|kiwis?|cereales|cruc[ií]feras|hortalizas|frutales|"
    r"parr[oó]n(?:es)?|espalderas?|paltos?|granados?|tomates?|chirimoyos?|praderas?)\s*:?\s*$", re.I)
# «Para volúmenes (de agua) mayores de 1.500 L/ha respetar la dosis por concentración»: no es un mojamiento recomendado.
NO_ES_MOJAMIENTO = re.compile(r"vol[uú]men(?:es)?\s+(?:de\s+agua\s+)?(?:mayor(?:es)?|superior(?:es)?|sobre|menor(?:es)?|inferior(?:es)?)", re.I)


def mojamiento(texto):
    """Devuelve lista de (min, max, inicio, fin) encontrados."""
    out = []
    for m in P_MOJ.finditer(texto):
        ventana = texto[max(0, m.start() - 70):m.end() + 10].lower()
        if not re.search(CLAVE_AGUA, ventana):
            continue
        if NO_ES_MOJAMIENTO.search(texto[max(0, m.start() - 45):m.start() + 1]):
            continue
        inicio_num = m.start("a") if m.group("a") else m.start("b")
        if re.search(r"(?:mayor|superior|sobre|m[aá]s de|menor|inferior)(?:es)?\s*(?:de|a)?\s*$", texto[max(0, inicio_num - 25):inicio_num], re.I):
            continue
        # Toda la frase habla de umbrales para respetar la dosis por concentración: no es un mojamiento recomendado.
        if UMBRAL_CONCENTRACION.search(frase(texto, m.start(), m.end())):
            continue
        # Cifra precedida por un cultivo o grupo («crucíferas 1000 L/ha», «Pomáceas: 1500 L/ha»): depende del cultivo.
        if GRUPO_ANTES.search(texto[max(0, inicio_num - 30):inicio_num]):
            continue
        b = numero(m.group("b"))
        a = numero(m.group("a")) if m.group("a") else None
        # Menos de 20 L/ha suele ser dosis, salvo que la unidad diga «agua» (aplicación aérea: «12 L agua/ha»).
        minimo = 5 if re.search(r"agua", texto[m.end("b"):m.end()], re.I) else 20
        if b < minimo or (a is not None and a < minimo):
            continue
        if a is not None and a > b:  # rango al revés: probable error de la etiqueta
            continue
        # «mínimo»/«máximo» en la misma cláusula y sin otra cifra entre medio (si no, califica a otra cosa:
        # «máximo 3 aplicaciones con 1000 L/ha»); «desde»/«hasta» solo pegados a la cifra.
        previo = texto[max(0, inicio_num - 80):inicio_num]
        corte = max(previo.rfind(x) for x in (". ", ", ", "; ", "|", "\n"))
        previo = previo[corte + 1:] if corte >= 0 else previo
        calif = None
        for q in re.finditer(r"m[ií]nim|m[aá]xim", previo, re.I):
            if not re.search(r"\d", previo[q.end():]):
                calif = "min" if q.group().lower() in ("minim", "mínim") else "max"
        if re.search(r"desde\s*$", previo, re.I):
            calif = "min"
        elif re.search(r"hasta\s*$", previo, re.I):
            calif = "max"
        despues = texto[m.end():m.end() + 20].lower()
        if re.search(r"^\s*(?:o\s+(?:superior|m[aá]s)|como\s+m[ií]nimo)", despues):
            calif = "min"
        elif re.search(r"^\s*como\s+m[aá]ximo", despues):
            calif = "max"
        if a is not None:
            vmin, vmax = min(a, b), max(a, b)
        elif calif == "min":
            vmin, vmax = b, None
        elif calif == "max":
            vmin, vmax = None, b
        else:
            vmin, vmax = b, b
        out.append((vmin, vmax, m.start(), m.end()))
    return out


# ---------- Intervalo ----------
P_INT = [
    re.compile(rf"cada\s+{RANGO}\s*d[ií]as", re.I),
    re.compile(rf"cada\s+({NUM})\s*d[ií]as", re.I),
    re.compile(rf"intervalos?\s+(?:m[ií]nimos?\s+)?(?:de\s+|entre\s+)?(?:al\s+menos\s+)?{RANGO}\s*d[ií]as", re.I),
    re.compile(rf"intervalos?\s+(?:m[ií]nimos?\s+)?(?:de\s+)?(?:al\s+menos\s+)?({NUM})\s*d[ií]as", re.I),
    re.compile(rf"espaciad[ao]s?\s+(?:por|cada|en)\s+({NUM})\s*d[ií]as", re.I),
    re.compile(rf"repetir\s+(?:la\s+aplicaci[oó]n\s+)?a\s+los\s+({NUM})\s*d[ií]as", re.I),
]


def intervalo(texto):
    out = []
    for p in P_INT:
        for m in p.finditer(texto):
            g = [x for x in m.groups() if x]
            if len(g) == 2:
                a, b = numero(g[0]), numero(g[1])
                if a > b:  # «intervalo de 14 a 1 días»: probable error de la etiqueta, no se interpreta
                    continue
                vmin, vmax = a, b
            else:
                v = numero(g[0])
                previo = texto[max(0, m.start() - 5):m.end()].lower()
                if re.search(r"m[ií]nim|al menos", previo):
                    vmin, vmax = v, None
                else:
                    vmin, vmax = v, v
                despues = texto[m.end():m.end() + 25].lower()
                if re.search(r"como m[aá]ximo", despues):
                    vmin, vmax = None, v
            if (vmin or 0) > 365 or (vmax or 0) > 365:
                continue
            out.append((vmin, vmax, m.start(), m.end()))
    # quitar coincidencias solapadas (la de rango gana a la simple)
    out.sort(key=lambda x: (x[2], -(x[3] - x[2])))
    limpio = []
    for x in out:
        if limpio and x[2] < limpio[-1][3]:
            continue
        limpio.append(x)
    return limpio


# ---------- Método ----------
METODOS = [
    ("Al follaje", r"\bal follaje\b|aplicaci[oó]n foliar\b|aspersi[oó]n foliar|pulverizaci[oó]n foliar|v[ií]a foliar"),
    ("Vía riego", r"v[ií]a riego|riego por goteo|a trav[eé]s del sistema de riego|fertirriego|quimigaci[oó]n|al riego\b"),
    ("Al suelo", r"aplicar al suelo|aplicaci[oó]n(?:es)? al suelo|\bal suelo:|dirigid[oa] al suelo|\bdrench\b|incorporad[oa] al suelo"),
    ("Al surco", r"\bal surco\b|en el surco|fondo y paredes del surco"),
    ("Tratamiento de semillas", r"tratamiento de (?:la )?semillas?|desinfecci[oó]n de (?:la )?semillas?|sobre (?:las )?semillas"),
    ("Inmersión", r"\binmersi[oó]n\b|\bsumergi[rd]"),
    ("Aplicación terrestre", r"aplicaci[oó]n(?:es)? terrestres?|v[ií]a terrestre|equipos? terrestres?|a[eé]reas?\s+(?:y/o|o|y)\s+terrestres?"),
    ("Aplicación aérea", r"aplicaci[oó]n(?:es)? a[eé]reas?|v[ií]a a[eé]rea|terrestres?\s+(?:y/o|o|y)\s+a[eé]reas?"),
]


NEGACION_METODO = re.compile(r"evit|escurr|complement|no aplicar|sin mojar|no mojar", re.I)
# Precauciones generales («Para aplicaciones aéreas prohíbase… cuando el viento supere…»): no dicen cómo aplicar.
PRECAUCION = re.compile(r"proh[ií]b|velocidad del viento|deriva", re.I)


def metodo(texto):
    out = []
    for nombre, patron in METODOS:
        for m in re.finditer(patron, texto, re.I):
            if NEGACION_METODO.search(texto[max(0, m.start() - 45):m.start()]):
                continue
            if PRECAUCION.search(frase(texto, m.start(), m.end())):
                continue
            out.append((nombre, m.start(), m.end()))
    return out


def frase(texto, ini, fin, max_largo=240):
    """Frase (entre separadores) que contiene la coincidencia, recortada si es muy larga."""
    izq = max(texto.rfind(". ", 0, ini), texto.rfind("|", 0, ini), texto.rfind("\n", 0, ini))
    izq = 0 if izq < 0 else izq + 1
    cands = [p for p in (texto.find(". ", fin), texto.find("|", fin), texto.find("\n", fin)) if p >= 0]
    der = min(cands) + 1 if cands else len(texto)
    s = norm(texto[izq:der]).strip(" |")
    if len(s) > max_largo:
        centro = norm(texto[ini:fin])
        k = max(0, s.find(centro))
        a = max(0, k - 90)
        if a > 0 and s[a - 1] != " ":  # empezar en una palabra completa
            sp = s.find(" ", a, k + 1)
            if sp >= 0:
                a = sp + 1
        b = a + max_largo
        if b < len(s) and s[b] != " ":  # terminar en una palabra completa
            sp = s.rfind(" ", k + len(centro), b)
            if sp > 0:
                b = sp
        s = s[a:b].strip()
    return s


def clausula(texto, ini, fin):
    """Como frase(), pero cortando también en comas y punto y coma."""
    seps = (". ", "|", "\n", ", ", "; ", ": ")
    izq = max(texto.rfind(x, 0, ini) for x in seps)
    izq = 0 if izq < 0 else izq + 1
    cands = [p for p in (texto.find(x, fin) for x in seps) if p >= 0]
    der = min(cands) if cands else len(texto)
    return norm(texto[izq:der]).strip(" |,;:")


def ventana_corta(texto, ini, fin):
    """Desde la palabra clave más cercana antes de la coincidencia hasta el final de la coincidencia."""
    previo = texto[max(0, ini - 60):ini]
    m = None
    for m in re.finditer(r"(?i)mojamiento|volumen|agua|intervalo|cada|espaciad|repetir|aplic", previo):
        pass
    a = (ini - len(previo) + m.start()) if m else ini
    return norm(texto[a:fin])


def main():
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    lineas_json, corpus_json, salida = sys.argv[1:4]
    datos = json.load(open(lineas_json, encoding="utf-8"))
    corpus = json.load(open(corpus_json, encoding="utf-8"))
    paginas_norm = {d: [norm(p["texto"]) for p in ps] for d, ps in corpus.items()}
    fuente_pag = {d: [p["fuente"] for p in ps] for d, ps in corpus.items()}

    resultados = {"mojamiento": [], "intervalo": [], "metodo": []}
    conteo = collections.Counter()
    conflictos = collections.defaultdict(list)

    def ubicar(doc, cita, pag_linea):
        pags = paginas_norm.get(doc) or []
        orden = ([pag_linea - 1] if pag_linea and 0 < pag_linea <= len(pags) else []) + list(range(len(pags)))
        for i in orden:
            if cita and cita in pags[i]:
                return i + 1
        return None

    for l in datos["lineas"]:
        doc = l["source_document_id"]
        textos = [l.get("observations") or "", l.get("application_timing") or "", l.get("source_text") or ""]
        for campo, extractor in (("mojamiento", mojamiento), ("intervalo", intervalo), ("metodo", metodo)):
            hallazgos = []
            for t in textos:
                for h in extractor(t):
                    hallazgos.append((t, h))
            if not hallazgos:
                continue
            if campo == "metodo":
                valores = sorted({h[0] for _, h in hallazgos}, key=[m[0] for m in METODOS].index)
                valor = " / ".join(valores)
                vmin = vmax = None
            else:
                pares = {(h[0], h[1]) for _, h in hallazgos}
                if len(pares) > 1:
                    conteo[f"{campo}: varios valores (no se llena)"] += 1
                    continue
                vmin, vmax = next(iter(pares))
                valor = None
            # cita: la frase de la primera coincidencia, que debe existir en el PDF
            citas = []
            for t, h in hallazgos:
                ini, fin = (h[1], h[2]) if campo == "metodo" else (h[2], h[3])
                for c in (frase(t, ini, fin), clausula(t, ini, fin), ventana_corta(t, ini, fin)):
                    if c and len(c) >= 8 and c not in citas:
                        citas.append(c)
            cita = None
            pagina = None
            for c in citas:
                p = ubicar(doc, c, l.get("source_page"))
                if p:
                    cita, pagina = c, p
                    break
            if not cita:
                conteo[f"{campo}: cita no encontrada en el PDF (no se llena)"] += 1
                continue
            # comparar con lo que ya tiene la línea
            if campo == "mojamiento":
                hoy = (l["water_volume_min_l_ha"], l["water_volume_max_l_ha"])
                vacio = hoy == (None, None)
                igual = not vacio and tuple(float(x) if x is not None else None for x in hoy) == (vmin, vmax)
            elif campo == "intervalo":
                hoy = (l["interval_min_days"], l["interval_max_days"])
                vacio = hoy == (None, None)
                igual = not vacio and tuple(float(x) if x is not None else None for x in hoy) == (vmin, vmax)
            else:
                hoy = (l.get("application_method") or "").strip()
                vacio = not hoy
                igual = not vacio and hoy.lower() == valor.lower()
            if not vacio:
                conteo[f"{campo}: ya tenía valor ({'igual' if igual else 'distinto'})"] += 1
                if not igual:
                    conflictos[campo].append((l["id"], hoy, (valor if campo == "metodo" else (vmin, vmax)), cita))
                continue
            conteo[f"{campo}: candidato para línea vacía"] += 1
            resultados[campo].append({
                "product_use_id": l["id"], "document_id": doc,
                "valor": valor if campo == "metodo" else vmin, "valor_max": vmax,
                "cita": cita, "pagina": pagina,
                "fuente": fuente_pag.get(doc, ["pdf"] * 99)[pagina - 1] if doc in fuente_pag else "pdf",
                "nota": "Extraído del texto de la fila del cuadro de usos.",
            })

    os.makedirs(salida, exist_ok=True)
    for campo, filas in resultados.items():
        ruta = os.path.join(salida, f"{campo}_v1.json")
        with open(ruta, "w", encoding="utf-8") as f:
            json.dump({"extractor": EXTRACTOR, "candidatos": filas}, f, ensure_ascii=False)
    with open(os.path.join(salida, "reporte_otros_v1.txt"), "w", encoding="utf-8") as f:
        for k, v in sorted(conteo.items()):
            f.write(f"{k}: {v}\n")
        for campo, lista in conflictos.items():
            f.write(f"\nConflictos {campo} (valor que ya tenía → valor leído):\n")
            for uid, hoy, nuevo, cita in lista:
                f.write(f"  {uid}: {hoy} → {nuevo} | «{cita}»\n")
    for k, v in sorted(conteo.items()):
        print(f"{k}: {v}")


if __name__ == "__main__":
    main()
