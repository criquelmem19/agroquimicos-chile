# Cuentas, productos guardados y panel de actividad (diseño, 11-11-2026)

Pedido de Cristóbal (fase de prueba): poder crear usuarios con correo y contraseña; un botón «Guardar» en cada producto
(antes del de agregar al plan); una página con los productos guardados en una tabla por categoría; y una página solo
para el administrador con la actividad del sitio. Este documento es el contrato entre las partes: base, sitio y panel.

## Decisiones

- **Supabase Auth**, correo y contraseña. Sin correo de confirmación mientras dure la prueba (la cuenta queda activa al
  crearla; `supabase/config.toml`). Contraseña de 8 caracteres o más. Sin recuperación de contraseña por ahora.
- En el navegador sigue yendo solo la llave pública. Todo lo privado se protege con RLS y funciones en la base.
- El administrador se marca en la base por su `user_id` (tabla `administradores`), nunca por correo ni en el código.
- La actividad sin sesión lleva solo el identificador al azar del equipo (`localStorage`), sin datos personales. **Con
  sesión queda ligada a la cuenta**: el administrador ve el correo junto a lo que la persona buscó, vio o guardó. La
  página de crear cuenta lo dice en una línea.
- La sesión se guarda en el `localStorage` del origen `criquelmem19.github.io`, que comparten todas las páginas de
  GitHub Pages de esa cuenta: no publicar ahí otros sitios con código de terceros (más adelante, dominio propio).

## Base (migración `cuentas_guardados_actividad`)

- `productos_guardados (user_id uuid default auth.uid() → auth.users on delete cascade, product_id uuid → products on
  delete cascade, creado timestamptz default now(), primary key (user_id, product_id))`. RLS: cada persona ve, agrega y
  quita solo lo suyo (rol `authenticated`). Sin permisos para `anon`.
- `administradores (user_id uuid primary key → auth.users on delete cascade, creado)`. RLS sin políticas, sin permisos.
- `actividad (id bigint identity, creado timestamptz default now(), tipo text, user_id uuid → auth.users on delete set
  null, dispositivo uuid, ruta text, producto_id uuid → products on delete set null, detalle text)`. RLS sin políticas,
  sin permisos. `tipo`: `visita`, `busqueda`, `producto`, `etiqueta`, `guardar`, `quitar`, `plan`, `registro`, `ingreso`.
- `es_admin() → boolean` (SECURITY DEFINER, `search_path` vacío, estable). La pueden llamar `anon` y `authenticated`.
- `registrar_evento(p_tipo text, p_ruta text default null, p_producto uuid default null, p_detalle text default null,
  p_dispositivo uuid default null) → void` (SECURITY DEFINER, `search_path` vacío). Nunca lanza error por datos malos:
  si el tipo no es válido, no hace nada; corta `ruta` a 60 y `detalle` a 200 caracteres; si el producto no existe lo
  deja en null; toma el usuario de `auth.uid()`. Topes contra abuso: no anota si ya hay 5.000 eventos en las últimas
  24 horas en total, ni si ese equipo o ese usuario lleva 60 o más en el último minuto; sin equipo ni sesión no anota
  nada. La tabla `actividad` no se borra sola (pendiente decidir con Cristóbal cuánto tiempo guardar). La pueden llamar
  `anon` y `authenticated`.
- `admin_panel() → jsonb` (SECURITY DEFINER, `search_path` vacío, estable). Si quien llama no es administrador, lanza
  un error con `errcode 42501`. Solo `authenticated`. Días según la hora de Chile (`America/Santiago`). Devuelve:

```json
{
  "generado": "2026-11-11T20:00:00Z",
  "totales": {
    "usuarios": 0, "usuarios_7d": 0, "guardados": 0, "usuarios_con_guardados": 0,
    "visitas_hoy": 0, "visitas_7d": 0, "visitas_30d": 0,
    "personas_hoy": 0, "personas_7d": 0, "personas_30d": 0
  },
  "por_dia": [{ "dia": "2026-11-11", "visitas": 0, "personas": 0, "busquedas": 0, "registros": 0 }],
  "usuarios": [{ "id": "uuid", "correo": "a@b.cl", "creado": "…", "ultimo_ingreso": "…", "guardados": 0, "eventos_30d": 0, "admin": false }],
  "mas_guardados": [{ "producto_id": "uuid", "nombre": "…", "n": 0 }],
  "mas_vistos": [{ "producto_id": "uuid", "nombre": "…", "n": 0 }],
  "etiquetas": [{ "producto_id": "uuid", "nombre": "…", "n": 0 }],
  "busquedas": [{ "texto": "…", "n": 0 }],
  "secciones": [{ "ruta": "buscar", "n": 0 }],
  "reciente": [{ "creado": "…", "tipo": "visita", "ruta": "buscar", "detalle": null, "producto": null, "correo": null }]
}
```

  `personas` = distintos `coalesce(user_id, dispositivo)`. `por_dia`: los últimos 30 días, en orden, con los días en
  cero. `usuarios`: los más nuevos primero (máx. 500). `mas_guardados`: todos los tiempos, 20. `mas_vistos` (tipo
  `producto`), `etiquetas` (tipo `etiqueta`), `busquedas` (tipo `busqueda`, por `lower(btrim(detalle))`, 30) y
  `secciones` (tipo `visita`): últimos 30 días. `reciente`: los últimos 100 eventos.

## Sitio

Módulo `assets/js/cuenta.js` (estado de la sesión, guardados y eventos). Lo usan todas las vistas:

```js
export async function iniciarCuenta()             // una vez al partir (app.js). Lee la sesión guardada, escucha los cambios,
                                                  // carga los guardados y si es administrador. No lanza.
export function usuario()                         // { id, correo } o null
export function esAdmin()                         // boolean
export function alCambiarCuenta(fn)               // avisa cuando cambia la sesión, los guardados o el administrador;
                                                  // devuelve una función para dejar de escuchar
export async function crearCuenta(correo, clave)  // { ok: true } o { ok: false, mensaje } (mensaje en español)
export async function entrar(correo, clave)       // igual
export async function salir()
export function guardados()                       // Map: id de producto → fecha ISO en que se guardó
export function estaGuardado(productoId)          // boolean
export async function alternarGuardado(productoId)// con sesión. { ok, guardado, mensaje } ; cambia el estado al tiro y lo
                                                  // devuelve si la base falla. Anota el evento «guardar» o «quitar».
export function registrarEvento(tipo, { ruta, producto, detalle } = {})  // no espera ni lanza
export function rutaCuenta(volver, guardar)       // '#/cuenta?volver=<hash actual>&guardar=<id de producto>'
export async function panelAdmin()                // el objeto de admin_panel(); lanza Error con mensaje en español
```

- `assets/js/guardar.js`: `botonGuardar(producto, { conTexto })` → el botón (marcador) que guarda o quita. Sin sesión,
  lleva a `rutaCuenta(location.hash, producto.id)`: al entrar o crear la cuenta, el producto queda guardado y se vuelve
  a donde estaba.
- Rutas nuevas: `#/cuenta` (`vistas/cuenta.js`), `#/guardados` (`vistas/guardados.js`, en el menú después de
  «Buscador») y `#/admin` (`vistas/admin.js`, sin menú: se llega desde «Mi cuenta» si es administrador).
- La cabecera lleva un botón de cuenta (ícono de persona) antes del de modo claro/oscuro.
- Eventos: `visita` en cada cambio de página (ruta = sección), `busqueda` (texto del buscador, 2 s después de dejar de
  escribir, 3 letras o más), `producto` (ficha vista), `etiqueta` (PDF abierto), `plan` (botón del plan), `guardar`,
  `quitar`, `registro` e `ingreso`.

## Reglas del código (resumen de CLAUDE.md)

- Sitio estático: HTML, CSS y módulos ES, sin compilación ni librerías nuevas. Los elementos se crean con `h()` de
  `assets/js/ui.js`; **nunca** `innerHTML` con textos de la base o de la persona (correos, búsquedas).
- Textos en español de Chile, cortos, sin signos de exclamación ni punto final en textos cortos, sin MAYÚSCULAS.
- Estilos: solo variables de `assets/css/app.css` (`--tinta`, `--superficie`, `--acento`, `--marca`, `--linea`,
  `--radio`…), nunca colores fijos; medidas en px sobre la grilla de 4; pesos 400, 500 y 600; botones en píldora;
  transiciones solo de color, fondo, borde o transform (150 ms). Tiene que verse bien en celular (375 px) y en modo
  oscuro (las variables ya lo resuelven).
