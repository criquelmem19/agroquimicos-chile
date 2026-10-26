# Encargo para Codex: extraer etiquetas del SAG (en paralelo con Claude)

Desde el 26-10-2026 Codex ayuda a Claude a leer etiquetas de plaguicidas publicadas por el SAG. Claude trabaja con
su propio límite de uso; Codex con el suyo. Codex **solo escribe archivos JSON**: Claude los verifica y los carga a
la base. Trabaja con cuidado: la carencia decide si se puede cosechar.

## Reglas

- Lee completas, antes de empezar, las instrucciones de extracción:
  `C:\Users\crisa\OneDrive\Escritorio\Proyectos\Agroquímicos Chile CRM\scripts\recopilador\instrucciones_extraccion.md`.
  Síguelas al pie de la letra: solo lo que dice la etiqueta, cada dato con su cita literal y su página.
- Escribe **solo** en `C:\Users\crisa\agroquimicos-datos\sag\extraido_codex\` (un `<id>.json` por etiqueta) y en
  `C:\Users\crisa\agroquimicos-datos\sag\codex_verif\` (tu verificación). No modifiques ningún otro archivo, no
  uses la base de datos, no hagas commits ni push, no instales nada y no busques en internet.
- Para no chocar con Claude, que trabaja al mismo tiempo: pide las etiquetas **siempre** con `lote.py … --salida
  extraido_codex` (las reserva para ti) y nunca elijas ids a mano; no ejecutes `cargar.py`, `ocr.py`, `textos.py`,
  `descargar.py` ni `turno.py` (reescriben archivos que los subagentes de Claude están leyendo o tocan la base).
  Solo puedes ejecutar `lote.py`, `verificar.py` y `recorte.py`.
- Python: `C:\Users\crisa\AppData\Local\Programs\Python\Python312\python.exe -I …` (ruta completa y siempre con
  `-I`; abajo se abrevia `python`). Para recortes de imagen: `C:\Users\crisa\agroquimicos-datos\venv\Scripts\python.exe -I …`.
- Trabaja desde la carpeta `C:\Users\crisa\OneDrive\Escritorio\Proyectos\Agroquímicos Chile CRM` (la ruta tiene
  espacios y tildes: ponla entre comillas).
- Una tanda de 4 a la vez. Si se te acaba el uso a medias, para: lo que quedó sin JSON vuelve solo a la cola en
  12 horas. La próxima vez, sigue desde el paso 1.

## Cómo trabajar (repetir mientras tengas uso)

1. Pide las siguientes 4 etiquetas (quedan reservadas para ti 12 horas; Claude no las toma):
   `python -I scripts\recopilador\lote.py --empresa upl --nuevos --vigentes --agentes 1 --por 4 --salida extraido_codex --sin-base`
   (`--sin-base`: tú no tienes acceso a la base de datos y no lo necesitas; `lote.py` usa la lista de pendientes
   que Claude deja en `sag\cola.json` y anota tu reserva en `sag\reservas.json`. Esos dos archivos los escribe el
   script, no tú.) Si no entrega ninguna, UPL está terminada: mira
   `python -I scripts\recopilador\lote.py --empresas --sin-base` y usa `--empresa <la primera de la lista>`.
   Si dice que no hay `cola.json`, para y avísale a Cristóbal.
2. El encargo que imprime dice qué carpeta leer y dónde escribir cada JSON. Para cada etiqueta lee `etiqueta.txt`
   y **mira las imágenes `p<N>.jpg`** de su carpeta: en el texto las celdas de los cuadros se descuadran y la imagen
   muestra qué dosis y qué carencia van con qué cultivo. Si la letra es chica, usa `recorte.py` (el encargo dice cómo).
3. Después de escribir cada JSON, compruébalo:
   `python -I scripts\recopilador\verificar.py C:\Users\crisa\agroquimicos-datos\sag\extraido_codex\<id>.json --salida C:\Users\crisa\agroquimicos-datos\sag\codex_verif`
   Abre `codex_verif\<id>.verificado.json` y mira «verificacion»: cada dato borrado es una cita que no está tal cual
   en la página. Corrige la cita en tu JSON (copiándola exacta del texto) y vuelve a comprobar. No inventes una cita
   para salvar un dato: si la etiqueta no lo dice, el dato no va.
4. Si una etiqueta tiene el cuadro de usos solo como imagen (sin texto que citar), no la fuerces: escribe el JSON con
   lo que sí se puede citar y pon en «problemas» «cuadro de usos sin texto». Claude le hace OCR y la repite.
5. Al terminar cada grupo de 4, escribe una línea por etiqueta en
   `C:\Users\crisa\agroquimicos-datos\sag\codex_verif\bitacora.txt`: fecha, id, n.° de usos, problemas principales.

## Errores que ya se vieron (no repetirlos)

- «Carencia: N.C.» sola no basta: cita también la leyenda de la misma página («N.C.: No corresponde»).
- No deduzcas máximos ni intervalos: «dosis parcializada en dos aplicaciones» no es «máximo 2 aplicaciones».
- Un «volumen mínimo» que cambia según la zona no es un rango de mojamiento.
- La carencia dicha para un modo de aplicación (p. ej., «aplicación directa a los granos») va solo en esas filas.
