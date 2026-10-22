// Plan de aplicaciones: calendario por cultivo y temporada, guardado en este equipo (localStorage, sin
// cuentas). Cada aplicación va por fecha o por días desde el trasplante (con la fecha de trasplante del
// plan, la fecha sale sola). El producto puede ser del catálogo (con su uso de la etiqueta) o propio
// (fuera del catálogo, con los datos de la planilla). Las alertas comparan el plan con lo que dice la
// etiqueta (grupo de modo de acción, máximo por temporada, intervalo, carencia); no agregan recomendaciones.
import { normalizar } from './buscador.js';

const CLAVE = 'planes-v1';

// Campos de la línea de uso que se guardan junto a cada aplicación, para mostrarla sin conexión.
// Con conexión se reemplazan por los datos al día de la base.
const CAMPOS_LINEA = [
  'id', 'product_id', 'crop_id', 'dose_raw', 'withholding_period_days', 'withholding_not_applicable',
  'withholding_period_raw', 'maximum_applications_per_season', 'season_restriction', 'interval_min_days',
  'interval_max_days', 'source_document_id', 'source_page', 'confidence_score', 'review_status',
  'field_citations', 'objetivos',
];

// Tipos de producto que no tienen grupo de modo de acción (no generan alertas de rotación).
const SIN_MODO_ACCION = /fertiliz|bioestim|coadyuv|adherent|nutri/i;

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

export function crearPlan({ nombre, cultivoId = null, destino = 'consumo' }) {
  const e = leer();
  const p = {
    id: nuevoId('p'), nombre: nombre || `Plan ${temporada()}`, cultivoId, otrosCultivos: [], destino,
    trasplante: null, cosecha: null, creado: Date.now(), aplicaciones: [],
  };
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

// Planes que llegan guardados (link personal). Los que ya están en este equipo se dejan como están,
// salvo que se pida reemplazarlos.
export function importarPlanes(lista, { reemplazar = false } = {}) {
  const e = leer();
  const resultado = { nuevos: [], existentes: [] };
  for (const p of lista) {
    const i = e.planes.findIndex((x) => x.id === p.id);
    if (i === -1) {
      e.planes.push(p);
      resultado.nuevos.push(p);
    } else if (reemplazar) {
      e.planes[i] = p;
      resultado.nuevos.push(p);
    } else {
      resultado.existentes.push(p);
    }
  }
  if (lista.length) e.activo = lista[0].id;
  guardar();
  return resultado;
}

export function agregarAplicacion(planId, datos) {
  const p = leer().planes.find((x) => x.id === planId);
  if (!p) return null;
  const a = {
    id: nuevoId('a'), fecha: datos.fecha || null, ddt: datos.ddt ?? null,
    productoId: datos.productoId || null, externo: datos.externo || null, linea: lineaResumida(datos.linea),
    dosisPlan: datos.dosisPlan || '', objetivo: datos.objetivo || '', nota: datos.nota || '', creado: Date.now(),
  };
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

// ---------- Lectura de un plan ----------

export const cultivosDelPlan = (plan) => [plan.cultivoId, ...(plan.otrosCultivos || [])].filter(Boolean);

// Fecha de la aplicación: la suya, o la del trasplante + días.
export function fechaDe(plan, a) {
  if (a.ddt != null && plan.trasplante) return sumarDias(plan.trasplante, a.ddt);
  return a.fecha || null;
}

// Días desde el trasplante: los suyos, o los que salen de la fecha.
export function ddtDe(plan, a) {
  if (a.ddt != null) return a.ddt;
  if (a.fecha && plan.trasplante) return diasEntre(plan.trasplante, a.fecha);
  return null;
}

// Clave del día de aplicación (las aplicaciones del mismo día son una mezcla).
export function claveDia(plan, a) {
  const f = fechaDe(plan, a);
  if (f) return f;
  const d = ddtDe(plan, a);
  return d != null ? `d${d}` : 'sin';
}

export function cuando(plan, a) {
  const f = fechaDe(plan, a);
  const d = ddtDe(plan, a);
  if (f && d != null) return `${fechaCorta(f)}, día ${d}`;
  if (f) return fechaCorta(f);
  return d != null ? `día ${d}` : 'sin fecha';
}

export function ordenadas(plan) {
  return [...plan.aplicaciones].sort((a, b) => {
    const fa = fechaDe(plan, a);
    const fb = fechaDe(plan, b);
    if (fa && fb && fa !== fb) return fa < fb ? -1 : 1;
    const da = ddtDe(plan, a);
    const db = ddtDe(plan, b);
    if (da != null && db != null && da !== db) return da - db;
    if (fa && !fb) return -1;
    if (!fa && fb) return 1;
    return (a.orden ?? a.creado) - (b.orden ?? b.creado);
  });
}

export function nombreDe(cat, a) {
  if (a.productoId) {
    const p = cat.productos.get(a.productoId);
    return p ? p.nombre : 'Producto';
  }
  return (a.externo && a.externo.nombre) || 'Producto';
}

export const esExterno = (a) => !a.productoId;

export function tipoDe(cat, a) {
  if (a.productoId) {
    const p = cat.productos.get(a.productoId);
    return p && p.categorias.length ? p.categorias.map((c) => c.nombre).join(', ') : '';
  }
  return (a.externo && a.externo.tipo) || '';
}

// Grupo de modo de acción de un ingrediente escrito a mano (planilla): se busca el ingrediente en el
// catálogo, cuyos grupos salen de las etiquetas. Tolera errores comunes de tipeo (tiametexam, azoxystrobina).
function claveIngrediente(s) {
  return normalizar(s).replace(/y/g, 'i').replace(/[^a-z]/g, '');
}

export function gruposPorIngrediente(cat, texto) {
  if (!texto) return [];
  if (!cat._indiceIngredientes) {
    cat._indiceIngredientes = [...cat.ingredientes.values()].filter((i) => i.moa)
      .map((i) => ({ clave: claveIngrediente(i.nombre), moa: i.moa }))
      .filter((i) => i.clave.length >= 6);
  }
  const partes = String(texto).split(/[+/,;-]|\sy\s/i).map(claveIngrediente).filter((p) => p.length >= 6);
  const grupos = new Set();
  for (const p of partes) {
    for (const i of cat._indiceIngredientes) {
      if (p.slice(0, 6) === i.clave.slice(0, 6)) grupos.add(i.moa);
    }
  }
  return [...grupos];
}

export function gruposDe(cat, a) {
  if (a.productoId) {
    const p = cat.productos.get(a.productoId);
    return p ? p.moa : [];
  }
  const x = a.externo || {};
  if (SIN_MODO_ACCION.test(x.tipo || '')) return [];
  return gruposPorIngrediente(cat, x.ingrediente);
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
// usosCultivo (opcional): Map producto → líneas de la etiqueta para los cultivos del plan.
export function calcularAlertas(plan, cat, { usosCultivo = null } = {}) {
  const lista = ordenadas(plan);
  const por = new Map(lista.map((a) => [a.id, []]));
  const nombre = (a) => nombreDe(cat, a);
  const usosGrupo = new Map();
  const porProducto = new Map();
  const cultivos = cultivosDelPlan(plan);
  const nombreCultivos = cultivos.map((id) => cat.cultivos.get(id)).filter(Boolean).map((c) => c.nombre);
  let diaActual = null;
  let mismoDia = [];
  let diaAnterior = [];

  for (const a of lista) {
    const add = (nivel, tipo, texto) => por.get(a.id).push({ nivel, tipo, texto });
    const clave = claveDia(plan, a);
    if (clave !== diaActual) {
      diaAnterior = mismoDia;
      mismoDia = [];
      diaActual = clave;
    }
    const moa = gruposDe(cat, a);
    const u = a.linea;
    const nombreAp = nombre(a);

    // Grupo de modo de acción repetido: en la misma mezcla, en la aplicación anterior o antes en el plan.
    for (const x of mismoDia) {
      const comunes = moa.filter((k) => gruposDe(cat, x).includes(k));
      if (comunes.length) add('alerta', 'moa-mezcla', `${comunes.join(' y ')} también va en esta mezcla (${nombre(x)}).`);
    }
    const anteriores = diaAnterior.filter((x) => moa.some((k) => gruposDe(cat, x).includes(k)));
    for (const x of anteriores) {
      const comunes = moa.filter((k) => gruposDe(cat, x).includes(k));
      add('alerta', 'moa-seguido', `Repite ${comunes.join(' y ')} con la aplicación anterior (${nombre(x)}, ${cuando(plan, x)}).`);
    }
    for (const k of moa) {
      const previas = (usosGrupo.get(k) || []).filter((x) => !diaAnterior.includes(x) && !mismoDia.includes(x));
      if (previas.length) add('alerta', 'moa-ya', `${k} ya está en el plan: ${previas.map((x) => `${nombre(x)} (${cuando(plan, x)})`).join(', ')}.`);
    }

    // El producto del catálogo no tiene usos en la etiqueta para los cultivos del plan.
    if (a.productoId && !u && usosCultivo && cultivos.length && !(usosCultivo.get(a.productoId) || []).length) {
      add('alerta', 'sin-registro', `La etiqueta no tiene usos para ${nombreCultivos.join(', ') || 'el cultivo del plan'}.`);
    }
    // El producto no se puede usar en Chile (solo exportación, autorización cancelada o sustancia prohibida).
    const enCatalogo = a.productoId ? cat.productos.get(a.productoId) : null;
    if (enCatalogo && enCatalogo.noDisponible) {
      add('peligro', 'no-disponible', `${enCatalogo.nombre} no se puede usar en Chile: ${enCatalogo.noDisponible}.`);
    }
    // El uso elegido es de otro cultivo.
    if (u && cultivos.length && u.crop_id && !cultivos.includes(u.crop_id)) {
      const c = cat.cultivos.get(u.crop_id);
      add('alerta', 'otro-cultivo', `Este uso de la etiqueta es para ${c ? c.nombre : 'otro cultivo'}, no para ${nombreCultivos.join(', ')}.`);
    }

    // Máximo de aplicaciones por temporada e intervalo, con las aplicaciones del mismo producto.
    const claveProd = a.productoId || `x:${normalizar(nombreAp)}`;
    const mismas = porProducto.get(claveProd) || [];
    if (u && u.maximum_applications_per_season != null && mismas.length + 1 > u.maximum_applications_per_season) {
      add('peligro', 'maximo', `La etiqueta permite máximo ${u.maximum_applications_per_season} por temporada${u.season_restriction ? ` (${u.season_restriction})` : ''}; esta es la aplicación n.° ${mismas.length + 1} de ${nombreAp} en el plan.`);
    }
    const previa = mismas[mismas.length - 1];
    if (u && previa && u.interval_min_days != null) {
      const fa = fechaDe(plan, a);
      const fp = fechaDe(plan, previa);
      const da = ddtDe(plan, a);
      const dp = ddtDe(plan, previa);
      const d = fa && fp ? diasEntre(fp, fa) : (da != null && dp != null ? da - dp : null);
      if (d != null && d < u.interval_min_days) {
        add('alerta', 'intervalo', `Solo ${d} ${d === 1 ? 'día' : 'días'} desde la aplicación anterior de ${nombreAp} (${cuando(plan, previa)}); la etiqueta indica ${textoIntervalo(u)}.`);
      }
    }

    // Carencia frente a la fecha de cosecha del plan.
    const fecha = fechaDe(plan, a);
    if (u && plan.cosecha && fecha) {
      const quedan = diasEntre(fecha, plan.cosecha);
      const c = u.field_citations && u.field_citations.carencia;
      if (quedan < 0) {
        add('info', 'despues-cosecha', 'Queda después de la fecha de cosecha del plan.');
      } else if (u.withholding_period_days != null) {
        const dias = u.withholding_period_days;
        if (quedan < dias) {
          add('peligro', 'carencia', `No alcanza la carencia: la etiqueta pide ${dias} ${dias === 1 ? 'día' : 'días'} y quedan ${quedan} hasta la cosecha (${fechaCorta(plan.cosecha)}).`);
        } else {
          add('ok', 'carencia-ok', `Carencia ${dias} ${dias === 1 ? 'día' : 'días'}: quedan ${quedan} hasta la cosecha. Último día para aplicar: ${fechaCorta(sumarDias(plan.cosecha, -dias))}.`);
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
    porProducto.set(claveProd, [...mismas, a]);
    mismoDia.push(a);
  }
  for (const l of por.values()) l.sort((x, y) => NIVELES[x.nivel] - NIVELES[y.nivel]);
  return por;
}

// Alertas que tendría una aplicación nueva, sin guardarla (para avisar antes de agregarla).
export function alertasDeNueva(plan, cat, nueva, opciones) {
  const id = '__nueva__';
  const copia = {
    ...plan,
    aplicaciones: [...plan.aplicaciones, { ...nueva, id, linea: lineaResumida(nueva.linea), creado: Date.now(), orden: Number.MAX_SAFE_INTEGER }],
  };
  return calcularAlertas(copia, cat, opciones).get(id) || [];
}

export const esGrave = (al) => al.nivel === 'peligro' || al.nivel === 'alerta';
