"""Paso 4b del recopilador: verifica cada cita de los JSON de la extracción contra el texto del PDF. Sin IA.

Uso:  python -I scripts/recopilador/verificar.py <archivo.json | carpeta> [--salida <carpeta>]

- Cada cita (texto o lista de fragmentos) debe estar en la página indicada: en el texto del PDF (orden de
  lectura o -layout) o en el OCR de esa página. Se comparan sin distinguir mayúsculas, tildes de símbolos
  («º»/«°», comillas, guiones), espacios ni cortes de palabra con guion. Si la cita está en otra página
  del mismo PDF, se corrige la página. Si no está en ninguna, el dato se borra.
- Los números deben salir de la cita: dosis (en el texto de la dosis), carencia, mojamiento, intervalo,
  máximo de aplicaciones y reingreso (horas, o días × 24). «No aplica» exige una frase como «no
  corresponde». Cultivos, objetivos, empresas e ingredientes deben aparecer escritos en la página.
- Escribe <id>.verificado.json (el JSON limpio, con «verificacion»: lista de lo corregido o borrado).
"""
import json
import os
import re
import sys
import unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, consola_utf8, escribir_json, leer_json  # noqa: E402

SIMBOLOS = str.maketrans({"º": "°", "˚": "°", "“": '"', "”": '"', "„": '"', "«": '"', "»": '"', "‘": "'",
                          "’": "'", "´": "'", "`": "'", "–": "-", "—": "-", "−": "-", "‐": "-", "‑": "-",
                          "­": "", " ": " ", "…": "...", "ﬁ": "fi", "ﬂ": "fl"})
NO_APLICA = re.compile(r"no\s+corresponde|no\s+posee|sin\s+carencia|exent|no\s+aplica|no\s+tiene|no\s+requiere|"
                       r"\bn\s*/\s*a\b|sin\s+restricci|no\s+hay\s+carencia|0\s*\(cero\)|"
                       r"no\s+se\s+consideran?\s+(?:los\s+)?per[ií]odos?\s+de\s+carencia", re.I)
# En el OCR, cifras leídas como letras: «O días» (0), «lOO» (100). Solo palabras hechas de esas letras y
# dígitos que tengan un dígito o una O/I mayúscula (así «lo» y «o» no cambian).
CIFRA_OCR = re.compile(r"(?<![^\W\d_])[0-9OolI|](?:[0-9OolI|.,]*[0-9OolI|])?(?![^\W\d_])")


def ocr_digitos(texto):
    def cambiar(m):
        s = m.group()
        if not re.search(r"[0-9OI]", s):
            return s
        return s.translate(str.maketrans("OolI|", "00111"))
    return CIFRA_OCR.sub(cambiar, texto or "")


def plano(s):
    s = unicodedata.normalize("NFKC", s or "").translate(SIMBOLOS).lower()
    s = re.sub(r"(\w)-\s*\n\s*(\w)", r"\1\2", s)
    return re.sub(r"\s+", " ", s).strip()


def suelto(s):
    """Solo letras y dígitos (sin tildes): «Nº 1.873» → «n1873»."""
    s = unicodedata.normalize("NFKD", plano(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", s)


def singular(s):
    """tomates → tomate, nogales → nogal, limones → limon, vides → vid, nueces → nuez."""
    if len(s) <= 3:
        return s
    if s.endswith("ces"):
        return s[:-3] + "z"
    if re.search(r"[lnrdj]es$", s):
        return s[:-2]
    return s[:-1] if s.endswith("s") else s


def formas_numero(x):
    """Cómo puede estar escrito un número en una etiqueta chilena: 1500 → 1500, 1.500; 0.5 → 0,5."""
    if x is None:
        return []
    x = float(x)
    formas = set()
    if x.is_integer():
        n = int(x)
        formas |= {str(n), f"{n:,}".replace(",", ".")}
    else:
        t = f"{x:.4f}".rstrip("0").rstrip(".")
        formas |= {t.replace(".", ","), t}
        if t.startswith("0."):
            formas.add(t[1:].replace(".", ","))
    return [suelto(f) for f in formas]


PALABRAS = {1: r"una|un|[uú]nica|sola", 2: r"dos", 3: r"tres", 4: r"cuatro", 5: r"cinco", 6: r"seis", 7: r"siete",
            8: r"ocho", 9: r"nueve", 10: r"diez", 12: r"doce", 14: r"catorce", 15: r"quince", 20: r"veinte",
            21: r"veinti[uú]n|veintiuno", 30: r"treinta"}


def numero_chileno(s):
    """'1.500' → 1500; '1,5' → 1.5; '0,40' → 0.4."""
    s = s.strip()
    if re.fullmatch(r"\d{1,3}(\.\d{3})+", s):
        return float(s.replace(".", ""))
    return float(s.replace(",", "."))


def numeros_de(texto):
    """Cifras de un texto chileno, con sus lecturas posibles: «1.500» → 1500 (y 1.5), «2 - 2,5» → 2 y 2.5."""
    out = set()
    for m in re.finditer(r"\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:[.,]\d+)?", unicodedata.normalize("NFKC", texto or "")):
        s = m.group()
        try:
            out.add(numero_chileno(s))
        except ValueError:
            pass
        if re.fullmatch(r"\d+\.\d+", s):  # «9.6 EC» o «1.5 L»: punto decimal
            out.add(float(s))
    return out


def numero_en(x, texto):
    """La cifra está en el texto como número completo (7 no calza dentro de 75 ni «2» con «2,5»). Si no,
    también vale el número escrito en palabras («sólo una vez por temporada»)."""
    if x is not None and any(abs(v - float(x)) < 1e-9 for v in numeros_de(texto)):
        return True
    if x is None or float(x) not in PALABRAS:
        return False
    w = PALABRAS[int(x)]
    t = plano(texto)
    # «una vez», «dos aplicaciones», «máximo una»: la palabra junto a vez/aplicación o a máximo/solo
    if re.search(rf"\b(?:{w})\s+(?:sola\s+|[uú]nica\s+)?(?:vez|veces|aplicaci)|(?:m[aá]ximo|s[oó]lo)\s+(?:de\s+)?(?:{w})\b", t):
        return True
    return not re.search(r"\d", texto or "") and bool(re.search(rf"\b(?:{w})\b", t))


def dosis_valida(doc, texto_dosis, fragmentos, p):
    """La dosis vale si está tal cual en la página, o si cada trozo suyo (separado por paréntesis o «;»)
    está en la página o tiene todos sus números en los fragmentos de la fila (cifra de la celda + unidad
    del encabezado)."""
    if doc.ubicar(texto_dosis, p) is not None:
        return True
    partes = [x for x in re.split(r"\s*[;()]\s*", texto_dosis) if suelto(x)]
    for parte in partes:
        if doc.ubicar(parte, p) is not None:
            continue
        cifras = re.findall(r"\d+(?:[.,]\d+)*", parte)
        if not cifras or not all(numero_en(numero_chileno(n), fragmentos) for n in cifras):
            return False
    return bool(partes)


class Documento:
    def __init__(self, carpeta):
        self.carpeta = carpeta
        lectura = leer_json(os.path.join(carpeta, "lectura.json"), [])
        layout = leer_json(os.path.join(carpeta, "layout.json"), [])
        self.paginas = {}
        for n in range(1, max(len(lectura), len(layout)) + 1):
            textos = [lectura[n - 1] if n <= len(lectura) else "", layout[n - 1] if n <= len(layout) else ""]
            ocr = leer_json(os.path.join(carpeta, f"ocr_p{n}.json"))
            if ocr:  # lectura de Windows y la segunda de Tesseract (ocr.py)
                for t in (ocr.get("texto", ""), ocr.get("tesseract", "")):
                    textos += [t, ocr_digitos(t)]
            self.paginas[n] = {"plano": [plano(t) for t in textos], "suelto": "".join(suelto(t) + "|" for t in textos)}

    def en_pagina(self, fragmento, n):
        if n not in self.paginas:
            return False
        p = self.paginas[n]
        f = plano(fragmento)
        if any(f in t for t in p["plano"]):
            return True
        fs = suelto(fragmento)
        return bool(fs) and fs in p["suelto"]

    def ubicar(self, cita, n):
        """Devuelve la página donde están todos los fragmentos (primero la indicada) o None."""
        frags = [cita] if isinstance(cita, str) else list(cita or [])
        frags = [f for f in frags if isinstance(f, str) and f.strip()]
        if not frags or len(suelto(" ".join(frags))) < 4:
            return None
        orden = ([n] if isinstance(n, int) else []) + [k for k in self.paginas if k != n]
        for k in orden:
            if all(self.en_pagina(f, k) for f in frags):
                return k
        return None

    def escrito(self, nombre, n):
        """El nombre aparece en la página (o en cualquier página del PDF), tolerando plural/singular."""
        s = suelto(nombre)
        if len(s) < 3:
            return False
        variantes = {s, singular(s)}
        paginas = ([self.paginas[n]] if n in self.paginas else []) + list(self.paginas.values())
        return any(v and v in p["suelto"] for v in variantes for p in paginas)


class Verificador:
    def __init__(self, doc):
        self.doc = doc
        self.notas = []

    def nota(self, campo, estado, motivo=""):
        self.notas.append({"campo": campo, "estado": estado, "motivo": motivo})

    def cita(self, campo, d, requerido=True):
        """Comprueba d = {"c", "p", ...}. Devuelve d (con p corregida) o None."""
        if not isinstance(d, dict) or "c" not in d:
            if requerido and d is not None:
                self.nota(campo, "descartado", "sin cita")
            return None
        p = d.get("p")
        k = self.doc.ubicar(d["c"], p if isinstance(p, int) else None)
        if k is None:
            self.nota(campo, "descartado", f"cita no encontrada: «{str(d['c'])[:80]}»")
            return None
        if k != p:
            self.nota(campo, "pagina_corregida", f"{p} → {k}")
            d = dict(d, p=k)
        return d

    def numero(self, campo, d, *claves, dias_a_horas=False):
        texto = " ".join(d["c"]) if isinstance(d["c"], list) else d["c"]
        for clave in claves:
            x = d.get(clave)
            if x is None:
                continue
            if not isinstance(x, (int, float)):
                self.nota(campo, "descartado", f"{clave} no es número")
                return None
            ok = numero_en(x, texto) or (dias_a_horas and x % 24 == 0 and numero_en(x / 24, texto))
            if not ok:
                self.nota(campo, "descartado", f"{clave}={x} no está en la cita")
                return None
        return d


def limpiar(j, doc):
    v = Verificador(doc)
    out = {k: j.get(k) for k in ("esquema", "id", "es_etiqueta", "motivo_no_etiqueta") if k in j}
    if not j.get("es_etiqueta", True):
        out["verificacion"] = []
        return out

    # Producto
    prod = {}
    for clave, d in (j.get("producto") or {}).items():
        if clave == "categorias":
            cats = [c for i, c in enumerate(d or []) if v.cita(f"producto.categorias[{i}]", c)]
            cats = [c for c in cats if c.get("v") and suelto(c["v"])[:6] in suelto(" ".join(c["c"]) if isinstance(c["c"], list) else c["c"])]
            if cats:
                prod["categorias"] = cats
            continue
        d = v.cita(f"producto.{clave}", d)
        if not d:
            continue
        if clave == "registro_sag":
            num = re.sub(r"\D", "", str(d.get("v") or ""))
            if not num or not numero_en(int(num), " ".join(d["c"]) if isinstance(d["c"], list) else d["c"]):
                v.nota("producto.registro_sag", "descartado", "el número no está en la cita")
                continue
            d["v"] = re.sub(r"[^\d-]", "", str(d["v"]))
        if clave in ("inflamable", "corrosivo", "explosivo", "solo_exportacion") and not isinstance(d.get("v"), bool):
            v.nota(f"producto.{clave}", "descartado", "valor no es sí/no")
            continue
        prod[clave] = d
    out["producto"] = prod

    # Ingredientes
    ings = []
    for i, ing in enumerate(j.get("ingredientes") or []):
        base = v.cita(f"ingredientes[{i}]", {"c": ing.get("c") or ing.get("nombre"), "p": ing.get("p")})
        if not base or not ing.get("nombre") or not doc.escrito(ing["nombre"], base["p"]):
            v.nota(f"ingredientes[{i}]", "descartado", f"«{ing.get('nombre')}» no está escrito en la etiqueta")
            continue
        nuevo = {"nombre": ing["nombre"], "c": base["c"], "p": base["p"]}
        for clave in ("concentracion", "nombre_quimico", "grupo"):
            d = v.cita(f"ingredientes[{i}].{clave}", ing.get(clave), requerido=False)
            if d and clave == "grupo":
                texto = suelto(" ".join(d["c"]) if isinstance(d["c"], list) else d["c"])
                if not d.get("v") or suelto(str(d["v"])) not in texto:
                    v.nota(f"ingredientes[{i}].grupo", "descartado", "el grupo no está en la cita")
                    d = None
            if d:
                nuevo[clave] = d
        ings.append(nuevo)
    out["ingredientes"] = ings

    # Empresas
    emps = []
    for i, e in enumerate(j.get("empresas") or []):
        d = v.cita(f"empresas[{i}]", e)
        if d and e.get("nombre") and doc.escrito(e["nombre"], d["p"]):
            emps.append(d)
        elif d:
            v.nota(f"empresas[{i}]", "descartado", f"«{e.get('nombre')}» no está escrito en la etiqueta")
    out["empresas"] = emps

    # Usos
    usos = []
    for i, u in enumerate(j.get("usos") or []):
        campo = f"usos[{u.get('fila', i)}]"
        base = v.cita(campo, {"c": u.get("c"), "p": u.get("p")})
        if not base:
            continue
        p = base["p"]
        cultivos = u.get("cultivos") or []
        if isinstance(u.get("cultivos_de_fila"), str):  # «mismos cultivos que la fila N» (herbicidas con listas largas)
            previa = next((x for x in j.get("usos") or [] if str(x.get("fila")) == u["cultivos_de_fila"]), None)
            cultivos = (previa or {}).get("cultivos") or []
        cultivos = [c for c in cultivos if isinstance(c, str) and c.strip()]
        quedan = [c for c in cultivos if doc.escrito(c, p)]
        for c in set(cultivos) - set(quedan):
            v.nota(campo, "cultivo_descartado", f"«{c}» no está escrito en la etiqueta")
        if not quedan:
            v.nota(campo, "descartado", "sin cultivos verificados")
            continue
        objetivos = []
        for o in u.get("objetivos") or []:
            if not isinstance(o, dict) or not o.get("nombre"):
                continue
            if doc.escrito(o["nombre"], p) or (o.get("cientifico") and doc.escrito(o["cientifico"], p)):
                if o.get("cientifico") and not doc.escrito(o["cientifico"], p):
                    o = {k: x for k, x in o.items() if k != "cientifico"}
                objetivos.append(o)
            else:
                v.nota(campo, "objetivo_descartado", f"«{o['nombre']}» no está escrito en la etiqueta")
        nuevo = {"fila": str(u.get("fila", i + 1)), "cultivos": quedan, "objetivos": objetivos,
                 "c": base["c"], "p": p}
        for clave in ("cuadro", "tipo_objetivo"):
            if u.get(clave):
                nuevo[clave] = u[clave]
        dosis = u.get("dosis")
        if isinstance(dosis, dict) and dosis.get("texto"):
            # La dosis puede venir armada con la cifra de la celda y la unidad del encabezado («185» +
            # «Dosis cc/hL» → «185 cc/hL»): vale si cada número de la dosis está en los fragmentos de la fila.
            fragmentos = " ".join(base["c"]) if isinstance(base["c"], list) else base["c"]
            if not dosis_valida(doc, dosis["texto"], fragmentos, p):
                v.nota(campo + ".dosis", "descartado", f"dosis «{dosis['texto']}» no está en la página ni en la cita de la fila")
            else:
                d2 = dict(dosis)
                for clave in ("min", "max"):
                    x = d2.get(clave)
                    if x is not None and (not isinstance(x, (int, float)) or not numero_en(x, dosis["texto"])):
                        v.nota(campo + ".dosis", "numero_descartado", f"{clave}={x} no está en «{dosis['texto']}»")
                        d2[clave] = None
                if d2.get("min") is not None and d2.get("max") is not None and d2["min"] > d2["max"]:
                    d2["min"], d2["max"] = None, None
                    v.nota(campo + ".dosis", "numero_descartado", "mínimo mayor que máximo")
                nuevo["dosis"] = d2
        for clave in ("observaciones", "momento", "metodo"):
            d = v.cita(f"{campo}.{clave}", u.get(clave), requerido=False)
            if d:
                nuevo[clave] = d
        for clave, nums in (("max_aplicaciones", ("v",)), ("intervalo", ("min", "max")), ("mojamiento", ("min", "max"))):
            d = v.cita(f"{campo}.{clave}", u.get(clave), requerido=False)
            if d:
                d = v.numero(f"{campo}.{clave}", d, *nums)
            if d:
                nuevo[clave] = d
        carencias = []
        for k, ca in enumerate(u.get("carencia") or []):
            d = carencia_valida(v, f"{campo}.carencia[{k}]", ca)
            if d:
                cs = [c for c in (d.get("cultivos") or ["*"]) if c == "*" or c in cultivos]
                if not cs:
                    v.nota(f"{campo}.carencia[{k}]", "descartado", "cultivos que no son de la fila")
                    continue
                carencias.append(dict(d, cultivos=cs))
        if carencias:
            nuevo["carencia"] = carencias
        usos.append(nuevo)
    out["usos"] = usos

    carencias = []
    for k, ca in enumerate(j.get("carencias") or []):
        d = carencia_valida(v, f"carencias[{k}]", ca)
        if d:
            carencias.append(d)
    out["carencias"] = carencias

    # Seguridad
    seg = {}
    for clave, d in (j.get("seguridad") or {}).items():
        if clave in ("advertencias", "telefonos"):
            lista = [x for k, x in enumerate(d or []) if v.cita(f"seguridad.{clave}[{k}]", x)]
            if clave == "telefonos":
                lista = [x for x in lista if x.get("numero") and suelto(x["numero"])
                         in suelto(" ".join(x["c"]) if isinstance(x["c"], list) else x["c"])]
            if lista:
                seg[clave] = lista
            continue
        d = v.cita(f"seguridad.{clave}", d)
        if d and clave == "reingreso":
            d = v.numero("seguridad.reingreso", d, "horas", dias_a_horas=True)
        if d:
            seg[clave] = d
    out["seguridad"] = seg
    out["problemas"] = j.get("problemas") or []
    out["verificacion"] = v.notas
    return out


def carencia_valida(v, campo, ca):
    d = v.cita(campo, ca)
    if not d:
        return None
    texto = " ".join(d["c"]) if isinstance(d["c"], list) else d["c"]
    if d.get("no_aplica"):
        if not NO_APLICA.search(plano(texto)):
            v.nota(campo, "descartado", "dice «no aplica» pero la cita no lo dice")
            return None
        return {k: x for k, x in d.items() if k not in ("dias", "condicional")}
    if d.get("condicional"):
        return {k: x for k, x in d.items() if k not in ("dias", "no_aplica")}
    if not isinstance(d.get("dias"), (int, float)):
        v.nota(campo, "descartado", "sin días, no aplica ni condicional")
        return None
    return v.numero(campo, d, "dias")


def carpeta_texto(id_):
    s = str(id_)
    if s.startswith("base:"):
        return os.path.join(DATOS, "base", "texto", s[5:])
    return os.path.join(DATOS, "sag", "texto", s)


def verificar_archivo(ruta_json, salida=None):
    j = leer_json(ruta_json)
    doc = Documento(carpeta_texto(j.get("id")))
    limpio = limpiar(j, doc)
    destino = os.path.join(salida or os.path.dirname(ruta_json),
                           os.path.basename(ruta_json).replace(".json", ".verificado.json"))
    escribir_json(destino, limpio, indent=1)
    return limpio


def resumen(limpio):
    notas = limpio.get("verificacion", [])
    desc = sum(1 for n in notas if n["estado"] in ("descartado", "cultivo_descartado", "objetivo_descartado", "numero_descartado"))
    usos = limpio.get("usos", [])
    return (f"{limpio.get('id')}: {len(usos)} usos, "
            f"{sum(1 for u in usos if u.get('dosis'))} con dosis, "
            f"{sum(1 for u in usos if u.get('carencia'))} con carencia en la fila, "
            f"{len(limpio.get('carencias', []))} carencias generales, {desc} datos descartados, "
            f"{sum(1 for n in notas if n['estado'] == 'pagina_corregida')} páginas corregidas")


def main():
    consola_utf8()
    args = sys.argv[1:]
    salida = args[args.index("--salida") + 1] if "--salida" in args else None
    objetivo = args[0]
    archivos = ([os.path.join(objetivo, f) for f in sorted(os.listdir(objetivo))
                 if f.endswith(".json") and not f.endswith(".verificado.json")]
                if os.path.isdir(objetivo) else [objetivo])
    for a in archivos:
        try:
            print(resumen(verificar_archivo(a, salida)))
        except Exception as e:  # noqa: BLE001
            print(f"{os.path.basename(a)}: ERROR {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
