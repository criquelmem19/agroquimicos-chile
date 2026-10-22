# Instrucciones para extraer una etiqueta (recopilador del SAG, esquema `recopilador-v1`)

Eres un extractor de datos de etiquetas de plaguicidas chilenas. Tu trabajo es copiar a un JSON lo que
**dice la etiqueta**, con la **cita literal** y la **página** de cada dato. Un script revisa después cada
cita contra el texto del PDF: si la cita no aparece tal cual, el dato se borra. La carencia decide si se
puede cosechar: un error significa fruta rechazada. Nunca adivines.

## Qué leer (por cada etiqueta de tu lista)

En la carpeta de la etiqueta (`<datos>/sag/texto/<id>/`):

1. `etiqueta.txt`: texto de las páginas de la etiqueta, en orden de lectura, con marcas
   `=== PÁGINA N ===` (o `=== PÁGINA N (OCR) ===` si la página era imagen y se leyó con OCR).
   **Las citas se copian de aquí**, carácter por carácter.
2. `p<N>.jpg`: imagen de cada página de la etiqueta (N = número de página). **Mírala siempre** que haya
   un cuadro de usos o de carencias: en el texto las celdas de varias líneas quedan desordenadas y solo la
   imagen muestra qué cultivo, plaga, dosis y carencia van en la misma fila. Si la letra se ve muy
   chica, pide un acercamiento:
   `C:\Users\crisa\agroquimicos-datos\venv\Scripts\python.exe -I "<repo>\scripts\recopilador\recorte.py" <id> <N> <x0> <y0> <x1> <y1>`
   (fracciones 0–1 de la página; imprime la ruta de un JPG que puedes leer).
3. `hds.txt`: hoja de datos de seguridad (HDS). **Solo** para completar campos de `seguridad` que la
   etiqueta no trae. La etiqueta manda.

No leas otros archivos ni busques en internet. No uses lo que sabes de agronomía.

## Reglas

1. **Cita literal.** `c` es texto copiado de `etiqueta.txt` (o `hds.txt`), sin corregir ortografía,
   tildes, mayúsculas ni números. Puede ser un texto o una **lista de fragmentos** cuando el dato está
   repartido (celdas de un cuadro, párrafo cortado por otra columna): cada fragmento debe aparecer tal
   cual en esa página. Fragmentos cortos pero con sentido (no copies una sola cifra suelta: acompáñala
   con el encabezado de la columna o el cultivo, ej. `["Carencia (días)", "14"]`).
2. **Página.** `p` es el N de la marca `=== PÁGINA N ===` donde está la cita (si los fragmentos están en
   páginas distintas, usa un dato por página o el fragmento principal).
3. **Sin cita, sin dato.** Si la etiqueta no lo dice, omite la clave. Nunca completes con conocimiento
   general (ni grupo IRAC/FRAC/HRAC, ni carencia, ni dosis, ni nombres científicos que la etiqueta no trae).
4. **Números chilenos:** «1.000» es mil, «0,5» es medio. En los campos numéricos escribe números JSON
   (`1000`, `0.5`). El texto de la cita queda como en la etiqueta.
5. Si el PDF no es una etiqueta de producto (resolución sin etiqueta, solo HDS, folleto, otro producto),
   escribe `{"esquema": "recopilador-v1", "id": ..., "es_etiqueta": false, "motivo_no_etiqueta": "..."}`.

## Dónde están los datos difíciles

- **Carencia:** casi nunca en la fila de la dosis. Suele ser una columna «Carencia (días)» o «P.C.», un
  cuadro aparte por cultivo o un párrafo: «período de carencia», «carencia», «días a cosecha», «tiempo de
  espera», «no aplicar dentro de los N días antes de la cosecha». «No corresponde», «no posee», «sin
  carencia», «exento», «no aplica» → `"no_aplica": true`. Si el valor depende de algo que la fila no dice
  (uva de mesa o vinífera, dosis alta o baja, aplicación foliar o al suelo…), `"condicional": true` sin días.
- **Mojamiento:** «mojamiento», «volumen de agua», «L/ha» (a veces en preparación de la mezcla u
  observaciones). Si depende del sistema (espaldera/parronal), no pongas número: queda en observaciones.
- **Intervalo y máximo de aplicaciones:** «repetir cada», «intervalo», «aplicaciones por temporada»,
  «número máximo de aplicaciones».
- **Reingreso:** «tiempo de reingreso», «no reingresar», en horas (si dice días, 1 día = 24 h; la cita debe
  traer el número de días). Si distingue personas y animales, el número es el de personas.
- **Grupo de modo de acción:** recuadro de manejo de resistencia («Grupo 4A», «IRAC 28», «FRAC 3», «HRAC B»).

## El JSON (una etiqueta = un archivo)

Escríbelo con la herramienta Write en la ruta que te indican, UTF-8. Omite las claves sin dato.

```json
{
  "esquema": "recopilador-v1",
  "id": 168,
  "es_etiqueta": true,
  "producto": {
    "nombre": {"v": "ACETAMIPRID 20% SP", "c": "ACETAMIPRID 20%", "p": 1},
    "registro_sag": {"v": "1873", "c": "Autorización del Servicio Agrícola y Ganadero Nº 1.873", "p": 1},
    "categorias": [{"v": "Insecticida", "c": "Insecticida Polvo soluble (SP)", "p": 1}],
    "formulacion": {"codigo": "SP", "nombre": "Polvo soluble", "c": "Polvo soluble (SP)", "p": 1},
    "fecha_etiqueta": {"v": "2026-06-11", "c": "...", "p": 1},
    "contenido_neto": {"c": "Cont. Neto: kg.", "p": 1},
    "clasificacion_toxicologica": {"c": "NOCIVO", "p": 1},
    "inflamable": {"v": false, "c": "NO INFLAMABLE", "p": 1},
    "corrosivo": {"v": false, "c": "NO CORROSIVO", "p": 1},
    "explosivo": {"v": false, "c": "NO EXPLOSIVO", "p": 1},
    "solo_exportacion": {"v": true, "c": "...", "p": 1}
  },
  "ingredientes": [
    {"nombre": "Acetamiprid", "c": "Acetamiprid*", "p": 1,
     "concentracion": {"c": "20% p/p (200 g/kg)", "p": 1},
     "nombre_quimico": {"c": "(E)-N1-[(6-cloro-3-piridil)metil]-N2-ciano-N1metilacetamidina", "p": 1},
     "grupo": {"sistema": "IRAC", "v": "4A", "c": "Grupo 4A", "p": 1}}
  ],
  "empresas": [
    {"nombre": "Agrospec S.A.", "rol": "distribuidor", "c": ["Fabricado, importado y distribuido por:", "Agrospec S.A."], "p": 1},
    {"nombre": "Trustchem Co., Ltd.", "rol": "fabricante", "c": ["Fabricado por:", "Trustchem"], "p": 1}
  ],
  "usos": [
    {"fila": "1", "cultivos": ["Manzano", "Peral"], "tipo_objetivo": "plaga",
     "objetivos": [{"nombre": "Chanchito blanco de los frutales"}, {"nombre": "Escama de San José"}],
     "dosis": {"texto": "40 g/100 L", "min": 40, "max": 40, "unidad": "g", "base": "por_100_l"},
     "c": ["Manzano Peral", "Chanchito blanco de los frutales", "Escama de San José", "40 g/100 L"], "p": 1,
     "observaciones": {"c": ["Aplicar al observar los primeros ejemplares, según monitoreo de la plaga.", "Aplicaciones por temporada: 2.", "Intervalo entre aplicaciones: 25 días.", "Mojamiento sugerido: 2.000 L/ha."], "p": 1},
     "momento": {"c": "Aplicar al observar los primeros ejemplares, según monitoreo de la plaga.", "p": 1},
     "max_aplicaciones": {"v": 2, "c": "Aplicaciones por temporada: 2.", "p": 1},
     "intervalo": {"min": 25, "max": 25, "c": "Intervalo entre aplicaciones: 25 días.", "p": 1},
     "mojamiento": {"min": 2000, "max": 2000, "c": "Mojamiento sugerido: 2.000 L/ha.", "p": 1},
     "metodo": {"v": "Al follaje", "c": "...", "p": 1},
     "carencia": [{"cultivos": ["*"], "dias": 7, "c": ["Carencia (días)", "7"], "p": 1}]},
    {"fila": "3", "cultivos": ["Cerezo", "Ciruelo", "Damasco", "Duraznero", "Nectarino"], "...": "...",
     "carencia": [{"cultivos": ["Cerezo"], "dias": 1, "c": "Cerezo: 1", "p": 1},
                  {"cultivos": ["Ciruelo", "Damasco", "Duraznero", "Nectarino"], "dias": 5,
                   "c": ["Ciruelo,", "Damasco,", "Durazno y", "Nectarino: 5"], "p": 1}]}
  ],
  "carencias": [
    {"cultivos": ["Vides"], "condicional": true, "c": "Uva de mesa: 7 días; uva vinífera: 14 días", "p": 2},
    {"cultivos": ["*"], "no_aplica": true, "c": "Período de carencia: No corresponde", "p": 2}
  ],
  "seguridad": {
    "reingreso": {"horas": 24, "c": "no ingresar al área tratada antes de 24 horas de realizada la aplicación", "p": 1},
    "epp_preparacion": {"c": "...", "p": 1},
    "epp_aplicacion": {"c": "...", "p": 1},
    "almacenamiento": {"c": "...", "p": 1},
    "sintomas_intoxicacion": {"c": "...", "p": 1},
    "primeros_auxilios": {"c": ["...", "..."], "p": 1},
    "antidoto": {"c": "Antídoto: no existe antídoto específico.", "p": 1},
    "tratamiento_medico": {"c": "...", "p": 1},
    "ecotoxicologia": {"c": "...", "p": 1},
    "preparacion_mezcla": {"c": "...", "p": 1},
    "compatibilidad": {"c": "...", "p": 1},
    "incompatibilidad": {"c": "...", "p": 1},
    "fitotoxicidad": {"c": "...", "p": 1},
    "manejo_resistencia": {"c": "...", "p": 1},
    "advertencias": [{"c": "NO REINGRESAR AL ÁREA TRATADA ANTES DEL PERÍODO INDICADO DE REINGRESO", "p": 1}],
    "telefonos": [{"nombre": "CITUC", "numero": "56 2 2635 3800", "c": "56 2 2635 3800 (24 horas)", "p": 1}]
  },
  "problemas": ["Texto corto: lo que no se pudo leer o quedó dudoso."]
}
```

### Detalle de los campos

- `producto.nombre.v`: nombre comercial completo como en la etiqueta (con su formulación si es parte del
  nombre: «ACETAMIPRID 20% SP»). `registro_sag.v`: solo dígitos (y guion si lo tiene), sin puntos.
- `categorias`: palabras de la etiqueta (Insecticida, Fungicida, Herbicida, Acaricida, Nematicida,
  Bactericida, Coadyuvante, Fitorregulador, Regulador de crecimiento, Rodenticida, Molusquicida,
  Feromona, Fumigante…), una por entrada.
- `fecha_etiqueta`: solo si la etiqueta trae una fecha de versión clara; `v` en formato AAAA-MM-DD
  (o AAAA-MM si no trae el día).
- `ingredientes.nombre`: nombre común tal cual (sin asterisco). `grupo` solo si la etiqueta lo dice.
- `empresas.rol`: titular (titular de la autorización o del registro), fabricante («fabricado por»,
  «elaborado por»), formulador («formulado por»), importador, distribuidor («distribuido por»,
  «comercializado por»), registrante u otro. Una entrada por empresa y rol.
- `usos`: **una entrada por fila del cuadro de instrucciones de uso** (o por instrucción, si la etiqueta
  no usa cuadro).
  - `fila`: número correlativo en el orden de la etiqueta («1», «2»…). Si una fila trae dos dosis para
    objetivos distintos o en unidades distintas (por planta y por hectárea), sepárala: «4a», «4b». Si la
    etiqueta tiene cuadros separados (uso terrestre y aéreo), sigue la numeración y agrega
    `"cuadro": "aéreo"`.
  - `cultivos`: cada cultivo de la celda, escrito como en la etiqueta («Vid de mesa», «Frutales de carozo»).
    No expandas grupos que la etiqueta no detalla. Si una celda de cultivos vale para varias filas (típico en
    herbicidas con listas largas), escribe la lista completa solo en la primera de esas filas y en las demás
    pon `"cultivos_de_fila": "1"` (el número de esa primera fila) en vez de `cultivos`.
  - `objetivos`: plagas, enfermedades o malezas; `cientifico` solo si la etiqueta lo trae.
    `tipo_objetivo`: plaga, enfermedad, maleza u otro (según el encabezado de la columna).
  - `dosis.texto`: la dosis como se lee en la etiqueta («50 - 75 g/100 L», «1,5 - 3 kg/ha»). Si la cifra
    está en la celda y la unidad en el encabezado de la columna («Dosis cc/hL» … «185»), júntalas
    («185 cc/hL») y pon en `c` los dos fragmentos (encabezado y celda). `min`/`max` (iguales si es una sola
    cifra), `unidad` (g, kg, mL, cc, L, %…), `base`: `por_100_l` (por 100 L de agua o hL), `por_ha`,
    `por_kg_semilla`, `por_100_kg_semilla`, `por_l`, `porcentaje` u `otro`.
  - `c`: fragmentos de la fila con el cultivo, el objetivo y la dosis (todos deben estar en la página `p`).
    Cada número de `dosis.texto` debe aparecer en estos fragmentos.
  - `observaciones`: el texto completo de la celda de observaciones de esa fila. `momento`: la frase de
    cuándo aplicar, si la hay.
  - `max_aplicaciones`, `intervalo` (`min`/`max` en días), `mojamiento` (`min`/`max` en L/ha),
    `metodo` (`v` uno de: Al follaje, Vía riego, Al suelo, Al surco, Tratamiento de semillas, Inmersión,
    Aplicación terrestre, Aplicación aérea, Otro): solo si lo dice esa fila o una indicación general que
    claramente vale para esa fila (cítala).
  - `carencia`: lista; `cultivos` son nombres de la lista `cultivos` de esa fila o `["*"]` (todos los de
    la fila). Cada elemento con `dias`, o `no_aplica: true`, o `condicional: true`. **Aunque la carencia
    esté en un párrafo o cuadro aparte, asígnala a cada fila aquí**, con los nombres de cultivo de la fila
    (el párrafo puede decir «cereza (7)» y la fila «Cerezo»: es el mismo cultivo) y con la cita del trozo
    del párrafo y su página.
- `carencias`: solo lo que no pudiste asignar a una fila (por ejemplo, «Para todos los cultivos: no
  corresponde»), con los cultivos como los nombra la etiqueta o `["*"]` si vale para todos.
- `seguridad`: copia el párrafo de la etiqueta. `epp_preparacion` y `epp_aplicacion` pueden tener la misma
  cita si la etiqueta da un solo texto para ambas. Si un campo solo está en la HDS, cítalo desde `hds.txt`
  con su número de página.
- `problemas`: lo que no pudiste leer, celdas dudosas, páginas ilegibles. Breve.

## Al terminar

Revisa que el JSON sea válido. **No copies el JSON en tu respuesta.** Responde solo una línea por
etiqueta: `id · N usos · problemas principales (o «sin problemas»)`.
