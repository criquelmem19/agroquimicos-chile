"""Convierte un JSON verificado (verificar.py) en líneas de uso: una por fila del cuadro y cultivo, con la
carencia que le corresponde. La usan cargar.py y comparar_piloto.py.

Carencia de una línea (fila × cultivo), en este orden:
1. la carencia de la fila para ese cultivo (o la de la fila para todos, «*»);
2. la carencia general de la etiqueta («carencias») para ese cultivo (mismo nombre, sin distinguir
   tildes ni plural) o para todos («*»).
Si en un mismo nivel calzan valores distintos, la línea queda sin carencia y con conflicto.
"""
from verificar import singular, suelto

# Las carencias suelen nombrar la fruta («cereza (7)») y el cuadro de usos la planta («Cerezo»): es el
# mismo cultivo dicho de otra forma. Solo se usa para emparejar nombres dentro de una misma etiqueta.
FRUTO_PLANTA = {
    "cereza": "cerezo", "guinda": "guindo", "ciruela": "ciruelo", "pera": "peral", "manzana": "manzano",
    "durazno": "duraznero", "uva": "vid", "vide": "vid", "naranja": "naranjo", "limon": "limonero",
    "mandarina": "mandarino", "almendra": "almendro", "nuez": "nogal", "avellana": "avellano", "palta": "palto",
    "chirimoya": "chirimoyo", "higo": "higuera", "frambuesa": "frambueso", "membrillo": "membrillero",
    "granada": "granado", "tangerina": "tangerino", "clementina": "clementino", "lucuma": "lucumo",
    "aceituna": "olivo", "nectarin": "nectarino", "pimenton": "pimiento", "esparrago": "esparrago",
}


def clave_cultivo(nombre):
    s = singular(suelto(nombre))
    return FRUTO_PLANTA.get(s, s)


def valor_carencia(c):
    if c.get("no_aplica"):
        return "NA"
    if c.get("condicional"):
        return "COND"
    return c.get("dias")


def elegir(candidatas):
    """De varias carencias que calzan, una sola si todas dicen lo mismo; si no, conflicto."""
    if not candidatas:
        return None, False
    valores = {valor_carencia(c) for c in candidatas}
    if len(valores) == 1:
        return candidatas[0], False
    return None, True


def carencia_para(uso, cultivo, generales):
    propias = uso.get("carencia") or []
    exactas = [c for c in propias if cultivo in (c.get("cultivos") or [])]
    if exactas:
        return elegir(exactas)
    todas = [c for c in propias if "*" in (c.get("cultivos") or ["*"])]
    if todas:
        return elegir(todas)
    k = clave_cultivo(cultivo)
    por_nombre = [c for c in generales if any(clave_cultivo(x) == k for x in c.get("cultivos") or [] if x != "*")]
    if por_nombre:
        return elegir(por_nombre)
    return elegir([c for c in generales if "*" in (c.get("cultivos") or [])])


def lineas(verificado):
    generales = verificado.get("carencias") or []
    out = []
    for uso in verificado.get("usos") or []:
        for cultivo in uso.get("cultivos") or []:
            carencia, conflicto = carencia_para(uso, cultivo, generales)
            out.append({"fila": uso["fila"], "cultivo": cultivo, "uso": uso, "carencia": carencia,
                        "conflicto_carencia": conflicto})
    return out
