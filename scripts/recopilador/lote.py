"""Arma el siguiente lote de extracción: elige etiquetas por prioridad y escribe el encargo de cada subagente.

Uso:  python -I scripts/recopilador/lote.py [--agentes 2] [--por 4] [--ids 1,2,3] [--empresa syngenta] [--nuevos]
          [--vigentes] [--salida extraido_codex] [--sin-reservar] [--sin-base]
      python -I scripts/recopilador/lote.py --empresas [--sin-base]
      python -I scripts/recopilador/lote.py --sin-cargar extraido_codex

- Toma filas en estado «texto» con páginas de etiqueta, sin JSON en <datos>/sag/extraido/, en orden de
  prioridad (vigentes en la planilla; insecticidas, fungicidas, herbicidas y acaricidas; más nuevas).
  --empresa: solo las de esa empresa (parte del nombre en el listado del SAG). --nuevos: sin las de productos
  cuyo N° SAG ya está en el catálogo (esas solo agregan el documento y anotan diferencias). --vigentes: solo las
  vigentes en la planilla de autorizados (prioridad < 2000); las canceladas y las que no figuran van al final.
  --salida extraido_codex: el encargo escribe ahí (Codex).
  Salta las que todavía tienen páginas sin texto (falta ocr.py).
- No ofrece las que ya tienen JSON (en extraido/ o extraido_codex/) ni las reservadas: cada etiqueta entregada
  queda reservada 12 horas en <datos>/sag/reservas.json, así los subagentes, las sesiones automáticas y Codex
  nunca toman la misma (aunque trabajen a la vez). --ids no reserva ni mira reservas. --sin-reservar: solo mirar
  (para contar la cola sin apartar nada).
- Imprime un encargo por subagente (para pegar en la herramienta Agent) y al final el comando de carga.
- La cola se lee de la base y queda copiada en <datos>/sag/cola.json. --sin-base (Codex, que no tiene acceso a la
  base) usa esa copia; también se usa sola si la CLI de Supabase no está.
- --empresas: pendientes (vigentes, de productos nuevos, sin JSON ni reserva) por empresa, de más a menos.
- --sin-cargar <carpeta>: ids con JSON en <datos>/sag/<carpeta> cuya etiqueta sigue en «texto» (para cargarlos).
"""
import datetime
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, consola_utf8, escribir_json, leer_json, sql  # noqa: E402

REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PYV = os.path.join(DATOS, "venv", "Scripts", "python.exe")
COLA = os.path.join(DATOS, "sag", "cola.json")
RESERVAS = os.path.join(DATOS, "sag", "reservas.json")
DURA = datetime.timedelta(hours=12)


def reservadas():
    """Ids entregados en las últimas 12 horas (por cualquier sesión o por Codex)."""
    ahora = datetime.datetime.now()
    return {int(i) for i, r in leer_json(RESERVAS, {}).items()
            if ahora - datetime.datetime.fromisoformat(r["desde"]) < DURA}


def reservar(ids, quien):
    ahora = datetime.datetime.now()
    vigentes = {i: r for i, r in leer_json(RESERVAS, {}).items()
                if ahora - datetime.datetime.fromisoformat(r["desde"]) < DURA}
    for i in ids:
        vigentes[str(i)] = {"quien": quien, "desde": ahora.isoformat(timespec="seconds")}
    escribir_json(RESERVAS, vigentes)


def cola(sin_base=False):
    """Etiquetas en «texto» con páginas de etiqueta, en orden de prioridad. Se leen de la base y se guardan en
    <datos>/sag/cola.json; sin acceso a la base (Codex, o si la CLI de Supabase no está) se usa esa copia: las que
    se cargaron después ya tienen JSON y hechas() las deja fuera."""
    if not sin_base:
        try:
            filas = sql("""select i.id, i.empresa, i.prioridad,
  exists (select 1 from public.products p where p.registration_number = i.registro_sag) as en_catalogo
from public.sag_inventario i
where i.estado = 'texto' and coalesce(array_length(i.paginas_etiqueta, 1), 0) > 0
order by i.prioridad nulls last, i.id""", "cola")
            escribir_json(COLA, {"fecha": datetime.datetime.now().isoformat(timespec="seconds"), "filas": filas})
            return filas
        except Exception as e:  # sin la CLI de Supabase (p. ej., en Codex)
            print(f"(Sin acceso a la base: {type(e).__name__}. Se usa la copia guardada de la cola.)", file=sys.stderr)
    guardada = leer_json(COLA)
    if not guardada:
        sys.exit(f"No hay {COLA}: una sesión de Claude tiene que correr lote.py primero.")
    return guardada["filas"]


def vigente(f):
    return f["prioridad"] is not None and f["prioridad"] < 2000


def falta_ocr(i):
    """Hay una página sin texto (y sin OCR) antes de que empiece la HDS: la etiqueta está incompleta.
    Si ocr.py ya la leyó y no encontró texto (página en blanco), no frena: el subagente tiene su imagen."""
    carpeta = os.path.join(DATOS, "sag", "texto", str(i))
    info = leer_json(os.path.join(carpeta, "paginas.json"), [])
    inicio_hds = min([p["pagina"] for p in info if p["tipo"] == "hds"] or [10 ** 6])
    return any(p["tipo"] == "sin_texto" and p["pagina"] < inicio_hds
               and not os.path.exists(os.path.join(carpeta, f"ocr_p{p['pagina']}.json")) for p in info)


def hechas():
    """Etiquetas que ya tienen JSON (de los subagentes o de Codex) o están reservadas: no se vuelven a ofrecer."""
    ids = reservadas()
    for carpeta in ("extraido", "extraido_codex"):
        d = os.path.join(DATOS, "sag", carpeta)
        if os.path.isdir(d):
            ids |= {int(f[:-5]) for f in os.listdir(d) if f.endswith(".json") and f[:-5].isdigit()}
    return ids


def encargo(ids, salida="extraido"):
    lineas = [
        "Eres un subagente extractor del proyecto Agroquímicos CRM (etiquetas de plaguicidas de Chile). Lee primero, "
        f"completas, las instrucciones en {os.path.join(REPO, 'scripts', 'recopilador', 'instrucciones_extraccion.md')} "
        "y síguelas al pie de la letra.", "",
        "Etiquetas que te tocan. Procésalas una por una, en este orden; escribe el JSON de cada una (herramienta "
        "Write) antes de pasar a la siguiente:"]
    for k, i in enumerate(ids, 1):
        lineas.append(f"{k}. id {i} — carpeta {os.path.join(DATOS, 'sag', 'texto', str(i))} — escribe "
                      f"{os.path.join(DATOS, 'sag', salida, f'{i}.json')}")
    lineas += ["", 'En el campo "id" del JSON pon exactamente el número indicado.',
               f'Para acercar una zona de una página: {PYV} -I "{os.path.join(REPO, "scripts", "recopilador", "recorte.py")}" '
               "<id> <página> <x0> <y0> <x1> <y1>.",
               "No modifiques ningún otro archivo. No muestres el JSON en tu respuesta: al final responde solo una "
               "línea por etiqueta (id · N usos · problemas principales)."]
    return "\n".join(lineas)


def main():
    consola_utf8()
    args = sys.argv[1:]
    agentes = int(args[args.index("--agentes") + 1]) if "--agentes" in args else 2
    por = int(args[args.index("--por") + 1]) if "--por" in args else 4
    salida = args[args.index("--salida") + 1] if "--salida" in args else "extraido"
    if "--sin-cargar" in args:  # JSON ya escritos cuya etiqueta sigue en «texto» (p. ej., los de Codex)
        d = os.path.join(DATOS, "sag", args[args.index("--sin-cargar") + 1])
        ids = sorted(int(f[:-5]) for f in os.listdir(d) if f.endswith(".json") and f[:-5].isdigit()) if os.path.isdir(d) else []
        filas = sql(f"select id from public.sag_inventario where estado = 'texto' and id in ({','.join(map(str, ids)) or 'null'})",
                    "sin cargar") if ids else []
        print(",".join(str(f["id"]) for f in sorted(filas, key=lambda f: f["id"])))
        return
    if "--empresas" in args:  # pendientes por empresa (vigentes y de productos nuevos), para elegir la siguiente
        listas = hechas()
        conteo = {}
        for f in cola("--sin-base" in args):
            if f["id"] not in listas and vigente(f) and not f["en_catalogo"]:
                empresa = re.sub(r"[ .,]+(s\.?a\.?|ltda\.?|spa)?[ .]*$", "", (f["empresa"] or "(sin empresa)").lower())
                conteo[empresa] = conteo.get(empresa, 0) + 1
        for empresa, n in sorted(conteo.items(), key=lambda x: -x[1]):
            print(f"{n:5d}  {empresa}")
        return
    if "--ids" in args:
        elegidas = [int(x) for x in args[args.index("--ids") + 1].split(",")]
    else:
        listas = hechas()
        empresa = args[args.index("--empresa") + 1].lower() if "--empresa" in args else ""
        filas = [f for f in cola("--sin-base" in args)
                 if empresa in (f["empresa"] or "").lower()  # una empresa a la vez (Cristóbal, 25-10-2026)
                 and not ("--nuevos" in args and f["en_catalogo"])  # las de productos que ya estaban solo anotan diferencias
                 and not ("--vigentes" in args and not vigente(f))]  # canceladas y sin planilla al final (26-10-2026)
        elegidas = [f["id"] for f in filas if f["id"] not in listas and not falta_ocr(f["id"])][:agentes * por]
        if "--sin-reservar" not in args:
            reservar(elegidas, salida)
    for a in range(agentes):
        grupo = elegidas[a * por:(a + 1) * por]
        if grupo:
            print(f"===== Subagente {a + 1} (ids {','.join(map(str, grupo))}) =====")
            print(encargo(grupo, salida))
            print()
    print("Después, cargar con:")
    print(f'python -I "{os.path.join(REPO, "scripts", "recopilador", "cargar.py")}" "{os.path.join(DATOS, "sag", salida)}" '
          f"--ids {','.join(map(str, elegidas))} --lote <fecha-n> --modelo <modelo>")


if __name__ == "__main__":
    main()
