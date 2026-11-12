// Planes en la cuenta (12-11-2026, Cristóbal: «cada persona tiene que poder ver el plan que ha guardado en sus
// perfiles»). Los planes siguen guardándose en el equipo (plan.js) y, con sesión, también en la tabla
// `planes_usuario` (una fila por persona, solo ella la lee y la escribe).
// - Al entrar: se bajan los planes de la cuenta y se juntan con los del equipo (de cada plan, la versión más nueva).
//   Si los del equipo eran de otra cuenta, se reemplazan por los de quien entró.
// - Cada cambio se sube solo, un momento después.
// - Al cerrar sesión, si ya estaba todo guardado en la cuenta, el equipo queda sin planes (no los ve quien venga después).
// Nada de aquí lanza errores hacia el sitio.
import { cliente } from './db.js';
import { usuario, alCambiarCuenta } from './cuenta.js';
import * as P from './plan.js';

// 'local' (sin sesión), 'cargando', 'guardando', 'guardado' o 'error'
let estado = 'local';
let idVisto = null;
let espera = null;
const oyentes = new Set();

function avisar(cambiaronPlanes = false) {
  for (const fn of [...oyentes]) {
    try { fn(cambiaronPlanes); } catch (e) { console.error(e); }
  }
}
function poner(nuevo, cambiaronPlanes = false) {
  if (estado === nuevo && !cambiaronPlanes) return;
  estado = nuevo;
  avisar(cambiaronPlanes);
}

export const estadoNube = () => estado;
// fn(cambiaronPlanes): avisa cuando cambia el estado; `true` si llegaron planes distintos desde la cuenta.
export function alCambiarNube(fn) {
  oyentes.add(fn);
  return () => oyentes.delete(fn);
}

async function subir() {
  const u = usuario();
  if (!u || P.duenoPlanes() !== u.id) return;
  poner('guardando');
  try {
    const db = await cliente();
    const { error } = await db.from('planes_usuario').upsert({ user_id: u.id, datos: P.estadoPlanes() }, { onConflict: 'user_id' });
    if (error) throw error;
    if (usuario() && usuario().id === u.id && !espera) poner('guardado');
  } catch (e) {
    console.error(e);
    poner('error');
  }
}

function programarSubida() {
  const u = usuario();
  if (!u || P.duenoPlanes() !== u.id) return;
  clearTimeout(espera);
  poner('guardando');
  espera = setTimeout(() => { espera = null; subir(); }, 1200);
}

async function bajar(u) {
  poner('cargando');
  try {
    const db = await cliente();
    const { data, error } = await db.from('planes_usuario').select('datos').maybeSingle();
    if (error) throw error;
    if (!usuario() || usuario().id !== u.id) return;
    const remoto = data ? data.datos : null;
    const antes = JSON.stringify(P.estadoPlanes().planes);
    const dueno = P.duenoPlanes();
    let hayQueSubir;
    if (dueno && dueno !== u.id) {
      // Los planes del equipo eran de otra cuenta: quedan los de quien entró.
      P.reemplazarPlanes(remoto);
      hayQueSubir = false;
    } else {
      hayQueSubir = P.fusionarPlanes(remoto) || !data;
    }
    P.ponerDueno(u.id);
    const cambiaron = JSON.stringify(P.estadoPlanes().planes) !== antes;
    if (hayQueSubir && P.estadoPlanes().planes.length) {
      poner('guardando', cambiaron);
      await subir();
    } else {
      poner('guardado', cambiaron);
    }
  } catch (e) {
    console.error(e);
    poner('error');
  }
}

function revisarSesion() {
  const u = usuario();
  const id = u ? u.id : null;
  if (id === idVisto) return;
  const anterior = idVisto;
  idVisto = id;
  if (id) {
    bajar(u);
    return;
  }
  // Cerró sesión. Si todo estaba guardado en su cuenta, el equipo queda limpio; si no, se dejan para no perder nada.
  clearTimeout(espera);
  espera = null;
  const limpio = anterior && estado === 'guardado' && P.duenoPlanes() === anterior;
  if (limpio) P.reemplazarPlanes(null);
  poner('local', Boolean(limpio));
}

let iniciado = false;
export function iniciarPlanesNube() {
  if (iniciado) return;
  iniciado = true;
  try {
    P.alGuardarPlanes(programarSubida);
    alCambiarCuenta(revisarSesion);
    revisarSesion();
    // Al volver a la pestaña con algo sin subir (se cortó la conexión), se intenta de nuevo.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && estado === 'error' && usuario()) subir();
    });
  } catch (e) {
    console.error(e);
  }
}
