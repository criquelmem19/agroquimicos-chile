// Cuentas, productos guardados y actividad (11-11-2026; contrato en docs/cuentas.md).
// Estado de la sesión de Supabase Auth, los productos que guardó la persona, si es administrador y el registro de
// eventos. Nada de aquí lanza errores hacia el sitio: si algo falla, el sitio sigue funcionando sin cuenta.
import { cliente } from './db.js';
import { ruta } from './ui.js';

let usuarioActual = null; // { id, correo }
let admin = false;
let mapaGuardados = new Map(); // id de producto → fecha ISO
const oyentes = new Set();
let cargaId = null;
let cargaPromesa = null;
let listaResolver = null;
const lista = new Promise((r) => { listaResolver = r; });

// ---------- Link de recuperación de contraseña ----------
// El correo trae un link al sitio con `?token_hash=…&type=recovery` (plantilla propia, supabase/plantillas) o, con la
// plantilla de Supabase, `#access_token=…&type=recovery`. Se lee aquí, antes de que el sitio mire la dirección, y se
// saca de la barra al tiro. 'pendiente' → 'lista' (ya se puede poner la contraseña nueva) o 'vencido'.
let datosLink = null;
let estadoRecuperacion = null;
try {
  const consulta = new URLSearchParams(location.search);
  const trozo = location.hash.startsWith('#/') ? '' : location.hash.replace(/^#/, '');
  const enHash = new URLSearchParams(trozo);
  if (consulta.get('token_hash') && consulta.get('type') === 'recovery') {
    datosLink = { token_hash: consulta.get('token_hash') };
  } else if (enHash.get('type') === 'recovery' && enHash.get('access_token') && enHash.get('refresh_token')) {
    datosLink = { access_token: enHash.get('access_token'), refresh_token: enHash.get('refresh_token') };
  } else if (trozo && (enHash.get('error_code') || enHash.get('error'))) {
    estadoRecuperacion = 'vencido';
  }
  if (datosLink) estadoRecuperacion = 'pendiente';
  if (estadoRecuperacion) history.replaceState(null, '', `${location.pathname}#/cuenta?modo=nueva`);
} catch (e) { /* sin link */ }

export function recuperacion() { return estadoRecuperacion; }
export function terminarRecuperacion() { estadoRecuperacion = null; }

async function usarLink(db) {
  if (!datosLink) return;
  const d = datosLink;
  datosLink = null;
  try {
    const r = d.token_hash
      ? await db.auth.verifyOtp({ token_hash: d.token_hash, type: 'recovery' })
      : await db.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token });
    if (r.error || !r.data || !r.data.session) throw r.error || new Error('sin sesión');
    aplicarSesion(r.data.session);
    estadoRecuperacion = 'lista';
  } catch (e) {
    console.error(e);
    estadoRecuperacion = 'vencido';
  }
}

function avisar() {
  for (const fn of [...oyentes]) {
    try { fn(); } catch (e) { console.error(e); }
  }
}

export function usuario() { return usuarioActual; }
export function esAdmin() { return admin; }
export function guardados() { return mapaGuardados; }
export function estaGuardado(productoId) { return mapaGuardados.has(productoId); }
// Extra al contrato: promesa que se cumple cuando ya se leyó la sesión guardada (para que una página no parpadee
// con «Entrar» antes de saber si hay sesión).
export function cuentaLista() { return lista; }

export function alCambiarCuenta(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

// ---------- Sesión ----------

function aplicarSesion(sesion) {
  const u = sesion && sesion.user ? sesion.user : null;
  if (!u) {
    const habia = usuarioActual || mapaGuardados.size || admin;
    usuarioActual = null;
    admin = false;
    mapaGuardados = new Map();
    cargaId = null;
    cargaPromesa = null;
    if (habia) avisar();
    return;
  }
  const correo = u.email || '';
  if (usuarioActual && usuarioActual.id === u.id) {
    if (usuarioActual.correo !== correo) { usuarioActual = { id: u.id, correo }; avisar(); }
    return;
  }
  usuarioActual = { id: u.id, correo };
  admin = false;
  mapaGuardados = new Map();
  avisar();
}

// Trae los guardados y si es administrador. Dos llamadas seguidas para la misma persona comparten el trabajo.
function cargarDatos() {
  const u = usuarioActual;
  if (!u) return Promise.resolve();
  if (cargaId === u.id && cargaPromesa) return cargaPromesa;
  cargaId = u.id;
  cargaPromesa = (async () => {
    try {
      const db = await cliente();
      const [g, a] = await Promise.all([
        db.from('productos_guardados').select('product_id, creado'),
        db.rpc('es_admin'),
      ]);
      if (!usuarioActual || usuarioActual.id !== u.id) return;
      if (g.error || a.error || !Array.isArray(g.data)) {
        // Falló: se deja en limpio para reintentar en la próxima llamada o cambio de sesión.
        if (cargaId === u.id) { cargaId = null; cargaPromesa = null; }
        return;
      }
      mapaGuardados = new Map(g.data.map((f) => [f.product_id, f.creado]));
      admin = a.data === true;
      avisar();
    } catch (e) {
      console.error(e);
      if (cargaId === u.id) { cargaId = null; cargaPromesa = null; }
    }
  })();
  return cargaPromesa;
}

export async function iniciarCuenta() {
  try {
    const db = await cliente();
    // Dentro de este aviso no se llama con await a otras funciones de Supabase (se traba): se deja para después.
    db.auth.onAuthStateChange((evento, sesion) => {
      aplicarSesion(sesion);
      setTimeout(() => { cargarDatos(); }, 0);
    });
    await usarLink(db);
    const { data } = await db.auth.getSession();
    aplicarSesion(data && data.session);
    await cargarDatos();
  } catch (e) {
    console.error(e);
  } finally {
    listaResolver();
  }
}

// ---------- Entrar, crear cuenta y salir ----------

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MENSAJE_GENERICO = 'No se pudo completar. Intenta de nuevo en un momento';

function traducir(err) {
  const msg = String((err && err.message) || '').toLowerCase();
  const codigo = String((err && (err.code || err.error_code)) || '').toLowerCase();
  const estado = err && err.status;
  if (estado === 429 || codigo.includes('rate_limit') || msg.includes('rate limit') || msg.includes('too many')) {
    return 'Demasiados intentos. Espera un momento y prueba de nuevo';
  }
  if (codigo === 'email_address_not_authorized' || msg.includes('not authorized')) {
    return 'Por ahora no se puede mandar el correo a esa dirección. Escríbele al administrador del sitio';
  }
  if (codigo === 'same_password' || msg.includes('different from the old')) return 'Usa una contraseña distinta a la anterior';
  if (codigo === 'invalid_credentials' || msg.includes('invalid login credentials')) return 'Correo o contraseña incorrectos';
  if (codigo === 'user_already_exists' || msg.includes('already registered') || msg.includes('already been registered')) {
    return 'Ese correo ya tiene cuenta. Entra con tu contraseña';
  }
  if (codigo === 'email_not_confirmed' || msg.includes('not confirmed')) return 'Revisa tu correo para confirmar la cuenta y después entra';
  if (codigo === 'weak_password' || msg.includes('password should') || msg.includes('weak')) {
    return msg.includes('at least') || msg.includes('characters')
      ? 'La contraseña tiene que ser de 8 caracteres o más'
      : 'La contraseña es muy débil. Prueba con otra más larga';
  }
  if (codigo === 'signup_disabled' || msg.includes('signups not allowed') || msg.includes('signup is disabled')) {
    return 'Por ahora no se pueden crear cuentas nuevas';
  }
  if (msg.includes('invalid email') || msg.includes('unable to validate email') || codigo === 'email_address_invalid') {
    return 'Ese correo no parece válido';
  }
  if (estado === 0 || msg.includes('failed to fetch') || msg.includes('network') || msg.includes('retryable') || msg.includes('conexión')) {
    return 'No hay conexión. Revisa tu internet y prueba de nuevo';
  }
  return MENSAJE_GENERICO;
}

function validar(correo, clave) {
  if (!RE_CORREO.test(correo)) return 'Escribe un correo válido, por ejemplo nombre@correo.cl';
  if (typeof clave !== 'string' || clave.length < 8) return 'La contraseña tiene que ser de 8 caracteres o más';
  return null;
}

export async function crearCuenta(correo, clave) {
  const email = String(correo || '').trim();
  const falla = validar(email, clave);
  if (falla) return { ok: false, mensaje: falla };
  try {
    const db = await cliente();
    const { data, error } = await db.auth.signUp({ email, password: clave });
    if (error) return { ok: false, mensaje: traducir(error) };
    if (!data || !data.session) return { ok: false, mensaje: 'Revisa tu correo para confirmar la cuenta y después entra' };
    aplicarSesion(data.session);
    await cargarDatos();
    registrarEvento('registro');
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(e) };
  }
}

export async function entrar(correo, clave) {
  const email = String(correo || '').trim();
  const falla = validar(email, clave);
  if (falla) return { ok: false, mensaje: falla };
  try {
    const db = await cliente();
    const { data, error } = await db.auth.signInWithPassword({ email, password: clave });
    if (error) return { ok: false, mensaje: traducir(error) };
    aplicarSesion(data && data.session);
    await cargarDatos();
    registrarEvento('ingreso');
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(e) };
  }
}

// Manda el correo con el link para poner una contraseña nueva. No dice si el correo tiene cuenta o no.
export async function pedirRecuperacion(correo) {
  const email = String(correo || '').trim();
  if (!RE_CORREO.test(email)) return { ok: false, mensaje: 'Escribe un correo válido, por ejemplo nombre@correo.cl' };
  try {
    const db = await cliente();
    const { error } = await db.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}${location.pathname}` });
    if (error) return { ok: false, mensaje: traducir(error) };
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(e) };
  }
}

// Con sesión (la del link del correo o la de siempre): pone una contraseña nueva.
export async function cambiarClave(clave) {
  if (typeof clave !== 'string' || clave.length < 8) return { ok: false, mensaje: 'La contraseña tiene que ser de 8 caracteres o más' };
  if (!usuarioActual) return { ok: false, mensaje: 'El link venció. Pide otro correo' };
  try {
    const db = await cliente();
    const { error } = await db.auth.updateUser({ password: clave });
    if (error) return { ok: false, mensaje: traducir(error) };
    estadoRecuperacion = null;
    return { ok: true };
  } catch (e) {
    return { ok: false, mensaje: traducir(e) };
  }
}

export async function salir() {
  try {
    const db = await cliente();
    const { error } = await db.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (e) {
    console.error(e);
    // Aunque falle, se borra la sesión guardada en el equipo.
    try {
      for (const k of Object.keys(localStorage)) {
        if (k.startsWith('sb-') && k.endsWith('-auth-token')) localStorage.removeItem(k);
      }
    } catch (e2) { /* nada */ }
  }
  aplicarSesion(null);
}

// ---------- Guardados ----------

export async function alternarGuardado(productoId) {
  if (!usuarioActual) return { ok: false, guardado: false, mensaje: 'Entra a tu cuenta para guardar productos' };
  if (!productoId) return { ok: false, guardado: false, mensaje: 'No se pudo guardar este producto' };
  const antes = mapaGuardados.get(productoId);
  const eraGuardado = antes !== undefined;
  // Optimista: se cambia al tiro y se devuelve si la base falla.
  if (eraGuardado) mapaGuardados.delete(productoId);
  else mapaGuardados.set(productoId, new Date().toISOString());
  avisar();
  try {
    const db = await cliente();
    const { error } = eraGuardado
      ? await db.from('productos_guardados').delete().eq('product_id', productoId)
      : await db.from('productos_guardados').insert({ product_id: productoId });
    // 23505: ya estaba guardado en la base; queda como guardado.
    if (error && !(error.code === '23505' && !eraGuardado)) throw error;
    registrarEvento(eraGuardado ? 'quitar' : 'guardar', { producto: productoId });
    return { ok: true, guardado: !eraGuardado };
  } catch (e) {
    if (eraGuardado) mapaGuardados.set(productoId, antes);
    else mapaGuardados.delete(productoId);
    avisar();
    const mensaje = traducir(e);
    return { ok: false, guardado: eraGuardado, mensaje: mensaje === MENSAJE_GENERICO ? 'No se pudo guardar el cambio. Intenta de nuevo' : mensaje };
  }
}

// ---------- Actividad ----------

let dispositivoId;
function nuevoUuid() {
  return (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.floor(Math.random() * 16);
      return (c === 'x' ? r : (r & 3) | 8).toString(16);
    });
}
function dispositivo() {
  if (dispositivoId) return dispositivoId;
  let d = null;
  try {
    d = localStorage.getItem('dispositivo');
    if (!d || !/^[0-9a-f-]{36}$/i.test(d)) {
      d = nuevoUuid();
      localStorage.setItem('dispositivo', d);
    }
  } catch (e) {
    // Sin localStorage: un identificador en memoria, el mismo durante la visita.
    if (!d || !/^[0-9a-f-]{36}$/i.test(d)) d = nuevoUuid();
  }
  dispositivoId = d;
  return dispositivoId;
}

// No espera ni lanza: la actividad nunca puede romper el sitio.
// En el computador de desarrollo (localhost) no se anota nada: las pruebas no ensucian la actividad real.
const EN_DESARROLLO = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

export function registrarEvento(tipo, { ruta: rutaEvento, producto, detalle } = {}) {
  if (EN_DESARROLLO) return;
  try {
    cliente().then((db) => db.rpc('registrar_evento', {
      p_tipo: tipo,
      p_ruta: rutaEvento == null ? null : String(rutaEvento),
      p_producto: producto || null,
      p_detalle: detalle == null ? null : String(detalle),
      p_dispositivo: dispositivo(),
    })).then(() => {}, () => {});
  } catch (e) { /* nada */ }
}

export function rutaCuenta(volver, guardar) {
  return ruta('cuenta', { volver: volver || location.hash || '#/', guardar });
}

export async function panelAdmin() {
  let respuesta;
  try {
    const db = await cliente();
    respuesta = await db.rpc('admin_panel');
  } catch (e) {
    throw new Error('No se pudo cargar la actividad. Revisa tu conexión');
  }
  if (respuesta.error) {
    if (String(respuesta.error.code) === '42501') throw new Error('Esta página es solo para el administrador');
    throw new Error('No se pudo cargar la actividad. Intenta de nuevo');
  }
  return respuesta.data;
}
