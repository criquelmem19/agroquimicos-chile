"""Lote sin las empresas que hace Codex ni las etiquetas problema (sesión 18, 04-11-2026).

Uso:  python -I scripts/recopilador/lote_resto.py <agentes> <por> [--todas] [--contar]
      python -I scripts/recopilador/lote_resto.py unreserve 1,2,3

- Toma la cola de lote.cola() sin UPL (Codex), Sumitomo ni FMC y sin las etiquetas problema de «Estado del recopilador»
  (PROB). Solo vigentes salvo --todas. Reserva lo que entrega (lote.reservar) e imprime los encargos de lote.encargo().
- --contar: solo cuenta las pendientes. unreserve: suelta reservas hechas por error.
"""
import os
import re
import sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lote
from comun import consola_utf8, leer_json, escribir_json
consola_utf8()
a = sys.argv[1:]
if a and a[0] == "unreserve":
    r = leer_json(lote.RESERVAS, {})
    for i in a[1].split(","): r.pop(i, None)
    escribir_json(lote.RESERVAS, r); print("ok"); sys.exit()
agentes, por = int(a[0]), int(a[1])
vig = "--todas" not in a
EXCL = ("upl", "sumitomo", "fmc")
PROB = {602,464,509,532,1692,932,648,817,1059,1060,409,673,1123}
listas = lote.hechas()
filas = [f for f in lote.cola() if not any(e in (f["empresa"] or "").lower() for e in EXCL)
         and (not vig or lote.vigente(f)) and f["id"] not in PROB]
pend = [f for f in filas if f["id"] not in listas and not lote.falta_ocr(f["id"])]
if "--contar" in a:
    print(len(pend), "pendientes;", sum(1 for f in pend if f["en_catalogo"]), "en catálogo"); sys.exit()
eleg = [f["id"] for f in pend][:agentes*por]
lote.reservar(eleg, "extraido")
for k in range(agentes):
    g = eleg[k*por:(k+1)*por]
    if g:
        print(f"===== Subagente {k+1} (ids {','.join(map(str,g))}) =====")
        print(lote.encargo(g)); print()
