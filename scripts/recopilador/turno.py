"""Candado de las sesiones automáticas del recopilador: una sola orquesta a la vez. Sin IA.

Uso:  python -I scripts/recopilador/turno.py tomar   → sale con 0 si tomó el turno, 1 si otra sesión lo tiene
      python -I scripts/recopilador/turno.py soltar  → libera el turno al terminar

- Escribe <datos>/sag/turno.lock con la hora de inicio. Un candado de más de 6 horas se da por abandonado (la
  ventana de uso es de 5 horas: una sesión que no lo soltó ya terminó o se cortó).
- Si la app estaba cerrada, las tareas atrasadas pueden partir juntas al abrirla: así no repiten las mismas
  etiquetas ni cargan dos veces.
"""
import datetime
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from comun import DATOS, consola_utf8  # noqa: E402

ARCHIVO = os.path.join(DATOS, "sag", "turno.lock")
VENCE = datetime.timedelta(hours=6)


def main():
    consola_utf8()
    accion = sys.argv[1] if len(sys.argv) > 1 else ""
    ahora = datetime.datetime.now()
    if accion == "tomar":
        if os.path.exists(ARCHIVO):
            desde = datetime.datetime.fromtimestamp(os.path.getmtime(ARCHIVO))
            if ahora - desde < VENCE:
                print(f"Turno ocupado desde {desde:%d-%m %H:%M}: otra sesión está trabajando.")
                sys.exit(1)
            print(f"Candado abandonado (desde {desde:%d-%m %H:%M}): se reemplaza.")
        with open(ARCHIVO, "w", encoding="utf-8") as f:
            f.write(ahora.isoformat(timespec="seconds"))
        print("Turno tomado.")
    elif accion == "soltar":
        if os.path.exists(ARCHIVO):
            os.remove(ARCHIVO)
        print("Turno liberado.")
    else:
        print(__doc__)
        sys.exit(2)


if __name__ == "__main__":
    main()
