// Plan de aplicaciones: un calendario por cultivo y temporada, guardado solo en este equipo
// (localStorage, sin cuentas). Las alertas comparan el plan con lo que dice la etiqueta
// (grupo de modo de acción, máximo por temporada, intervalo, carencia); no agregan recomendaciones propias.

const CLAVE = 'planes-v1';

// Campos de la línea de uso que se guardan junto a cada aplicación, para mostrarla sin conexión.
// Con conexión se reemplazan por los datos al día de la base.
const CAMPOS_LINEA = [
  'id', 'product_id', 'crop_id', 'dose_raw', 'withholding_period_days', 'withholding_not_applicable',
  'withholding_period_raw', 'maximum_applications_per_season', 'season_restriction', 'interval_min_days',
  'interval_max_days', 'source_document_id', 'source_page', 'confidence_score', 'review_status',
  'field_citations', 'objetivos',
];

let estado = null;
let disponible = true;

// ---------- Fechas (siempre 'AAAA-MM-DD', en hora local) ----------

export function isoLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export const hoy = () => isoLocal(new Date());
export function aFecha(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
// Días desde `a` hasta `b` (positivo si b es posterior).
export function diasEntre(a, b) {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
export function sumarDias(iso, n) {
  const d = aFecha(iso);
  d.setDate(d.getDate() + n);
  return isoLocal(d);
}
export const esFecha = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(aFecha(s).getTime());
export const fechaCorta = (iso) => aFecha(iso).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Temporada agrícola del hemisferio sur: de julio a junio («2026-27»).
export function temporada(iso = hoy()) {
  const d = aFecha(iso);
  const y = d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
  return `${y}-${String(y + 1).slice(2)}`;
}

// ---------- Almacenamiento ----------

function leer() {
  if (estado) return estado;
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) || 'null');
    if (x && Array.isArray(x.planes)) estado = x;
  } catch (e) {
    disponible = false;
  }
  if (!estado) estado = { version: 1, activo: null, planes: [] };
  return estado;
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
    disponible = true;
  } catch (e) {
    disponible = false;
  }
}

export const almacenamientoDisponible = () => { leer(); return disponible; };

const nuevoId = (prefijo) => `${prefijo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function lineaResumida(u) {
  if (!u) return null;
  const x = {};
  for (const k of CAMPOS_LINEA) if (u[k] !== undefined) x[k] = u[k];
  return x;
}

// ---------- Planes ----------

export function planes() {
  return leer().planes;
}

export function planActivo() {
  const e = leer();
  return e.planes.find((p) => p.id === e.activo) || e.planes[0] || null;
}

export function activar(id) {
  leer().activo = id;
  guardar();
}

export function crearPlan({ nombre, cultivoId = null, cosecha = null }) {
  const e = leer();
  const p = { id: nuevoId('p'), nombre: nombre || `Plan ${temporada()}`, cultivoId, cosecha, creado: Date.now(), aplicaciones: [] };
  e.planes.push(p);
  e.activo = p.id;
  guardar();
  return p;
}

export function editarPlan(id, cambios) {
  const p = leer().planes.find((x) => x.id === id);
  if (!p) return null;
  Object.assign(p, cambios);
  guardar();
  return p;
}

export function borrarPlan(id) {
  const e = leer();
  e.planes = e.planes.filter((p) => p.id !== id);
  if (e.activo === id) e.activo = e.planes[0] ? e.planes[0].id : null;
  guardar();
}

export function agregarAplicacion(planId, { fecha, productoId, linea = null, nota = '' }) {
  const p = leer().planes.find((x) => x.id === planId);
  if (!p) return null;
  const a = { id: nuevoId('a'), fecha, productoId, linea: lineaResumida(linea), nota: nota || '', creado: Date.now() };
  p.aplicaciones.push(a);
  guardar();
  return a;
}

export function editarAplicacion(planId, apId, cambios) {
  const p = leer().planes.find((x) => x.id === planId);
  const a = p && p.aplicaciones.find((x) => x.id === apId);
  if (!a) return null;
  Object.assign(a, cambios);
  guardar();
  return a;
}

export function quitarAplicacion(planId, apId) {
  const p = leer().planes.find((x) => x.id === planId);
  if (!p) return;
  p.aplicaciones = p.aplicaciones.filter((a) => a.id !== apId);
  guardar();
}

// Reemplaza las líneas guardadas por las de la base (por si se corrigió una carencia o una dosis).
export function refrescarLineas(plan, lineasPorId) {
  let cambio = false;
  for (const a of plan.aplicaciones) {
    if (!a.linea) continue;
    const u = lineasPorId.get(a.linea.id);
    if (!u) continue;
    const nueva = lineaResumida(u);
    if (JSON.stringify(nueva) !== JSON.stringify(a.linea)) {
      a.linea = nueva;
      cambio = true;
    }
  }
  if (cambio) guardar();
  return cambio;
}

export function ordenadas(plan) {
  return [...plan.aplicaciones].sort((a, b) => a.fecha.localeCompare(b.fecha) || a.creado - b.creado);
}

// ---------- Alertas ----------

function textoIntervalo(u) {
  const a = u.interval_min_days;
  const b = u.interval_max_days;
  if (a != null && b != null) return a === b ? `cada ${a} días` : `cada ${a} a ${b} días`;
  if (a != null) return `cada ${a} días o más`;
  return null;
}

const NIVELES = { peligro: 0, alerta: 1, info: 2, ok: 3 };

// Devuelve un Map: id de aplicación → lista de {nivel, tipo, texto}, de lo más grave a lo menos.
// nivel: 'peligro' (no cumple la etiqueta), 'alerta' (revisar), 'info' (para saber), 'ok' (cumple).
export function calcularAlertas(plan, cat) {
  const lista = ordenadas(plan);
  const por = new Map(lista.map((a) => [a.id, []]));
  const nombre = (a) => (cat.productos.get(a.productoId) || { nombre: 'Producto' }).nombre;
  const usosGrupo = new Map();
  const porProducto = new Map();
  const cultivoPlan = plan.cultivoId ? cat.cultivos.get(plan.cultivoId) : null;
  let anterior = null;

  for (const a of lista) {
    const add = (nivel, tipo, texto) => por.get(a.id).push({ nivel, tipo, texto });
    const p = cat.productos.get(a.productoId);
    const moa = p ? p.moa : [];
    const u = a.linea;

    // Mismo grupo de modo de acción que la aplicación anterior, o ya usado antes en el plan.
    if (anterior) {
      const pa = cat.productos.get(anterior.productoId);
      const comunes = pa ? moa.filter((k) => pa.moa.includes(k)) : [];
      if (comunes.length) {
        add('alerta', 'moa-seguido', `Repite ${comunes.join(' y ')} con la aplicación anterior (${nombre(anterior)}, ${fechaCorta(anterior.fecha)}).`);
      }
    }
    for (const k of moa) {
      const previas = (usosGrupo.get(k) || []).filter((x) => x !== anterior);
      if (previas.length) {
        add('alerta', 'moa-ya', `${k} ya está en el plan: ${previas.map((x) => `${nombre(x)} (${fechaCorta(x.fecha)})`).join(', ')}.`);
      }
    }
    if (p && !moa.length) add('info', 'sin-grupo', 'Sin grupo de modo de acción en los datos: revísalo en la etiqueta.');

    // Máximo de aplicaciones por temporada e intervalo, comparando con aplicaciones del mismo producto.
    const mismas = porProducto.get(a.productoId) || [];
    if (u && u.maximum_applications_per_season != null && mismas.length + 1 > u.maximum_applications_per_season) {
      add('peligro', 'maximo', `La etiqueta permite máximo ${u.maximum_applications_per_season} por temporada${u.season_restriction ? ` (${u.season_restriction})` : ''}; esta es la aplicación n.° ${mismas.length + 1} de ${nombre(a)} en el plan.`);
    }
    const previa = mismas[mismas.length - 1];
    if (u && previa && u.interval_min_days != null) {
      const d = diasEntre(previa.fecha, a.fecha);
      if (d < u.interval_min_days) {
        add('alerta', 'intervalo', `Solo ${d} ${d === 1 ? 'día' : 'días'} desde la aplicación anterior de ${nombre(a)} (${fechaCorta(previa.fecha)}); la etiqueta indica ${textoIntervalo(u)}.`);
      }
    }

    // El uso elegido es de otro cultivo.
    if (u && cultivoPlan && u.crop_id && u.crop_id !== cultivoPlan.id) {
      const c = cat.cultivos.get(u.crop_id);
      add('alerta', 'otro-cultivo', `Este uso de la etiqueta es para ${c ? c.nombre : 'otro cultivo'}, no para ${cultivoPlan.nombre}.`);
    }

    // Carencia frente a la fecha de cosecha del plan.
    if (!u) {
      add('info', 'sin-linea', 'Sin uso elegido: elige la plaga, enfermedad o maleza para ver dosis, carencia y máximos de la etiqueta.');
    } else if (plan.cosecha) {
      const quedan = diasEntre(a.fecha, plan.cosecha);
      const c = u.field_citations && u.field_citations.carencia;
      if (quedan < 0) {
        add('info', 'despues-cosecha', 'Esta aplicación queda después de la fecha de cosecha del plan.');
      } else if (u.withholding_period_days != null) {
        const dias = u.withholding_period_days;
        if (quedan < dias) {
          add('peligro', 'carencia', `No alcanza la carencia: la etiqueta pide ${dias} ${dias === 1 ? 'día' : 'días'} y quedan ${quedan} hasta la cosecha (${fechaCorta(plan.cosecha)}).`);
        } else {
          add('ok', 'carencia-ok', `Carencia: pide ${dias} ${dias === 1 ? 'día' : 'días'} y quedan ${quedan} hasta la cosecha. Último día para aplicar: ${fechaCorta(sumarDias(plan.cosecha, -dias))}.`);
        }
      } else if (u.withholding_not_applicable) {
        add('ok', 'carencia-ok', 'Carencia: la etiqueta dice que no aplica.');
      } else if (c && c.condicional) {
        add('alerta', 'carencia-depende', 'La carencia depende de una condición de la etiqueta: revísala antes de cosechar.');
      } else {
        add('alerta', 'carencia-sin-dato', 'Sin dato de carencia: verifícala en la etiqueta antes de cosechar.');
      }
    }

    for (const k of moa) {
      if (!usosGrupo.has(k)) usosGrupo.set(k, []);
      usosGrupo.get(k).push(a);
    }
    porProducto.set(a.productoId, [...mismas, a]);
    anterior = a;
  }
  for (const l of por.values()) l.sort((x, y) => NIVELES[x.nivel] - NIVELES[y.nivel]);
  return por;
}

// Alertas que tendría una aplicación nueva, sin guardarla (para avisar antes de agregarla).
export function alertasDeNueva(plan, cat, nueva) {
  const id = '__nueva__';
  const copia = { ...plan, aplicaciones: [...plan.aplicaciones, { ...nueva, id, linea: lineaResumida(nueva.linea), creado: Date.now() }] };
  return calcularAlertas(copia, cat).get(id) || [];
}

export const esGrave = (al) => al.nivel === 'peligro' || al.nivel === 'alerta';
