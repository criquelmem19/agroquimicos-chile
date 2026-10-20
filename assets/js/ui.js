// Piezas de interfaz compartidas: creación de elementos, íconos, formatos y
// la forma de mostrar dosis, carencia, reingreso, etc. (reglas del sitio).
import { UMBRAL_CONFIANZA } from './config.js';

// Crea elementos sin usar innerHTML con datos: el texto de las etiquetas nunca se interpreta como HTML.
export function h(tag, props, ...hijos) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'value') el.value = v;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  agregar(el, hijos);
  return el;
}

export function agregar(el, hijos) {
  for (const c of [hijos].flat(Infinity)) {
    if (c == null || c === false || c === '') continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function vaciar(el) {
  while (el.firstChild) el.firstChild.remove();
  return el;
}

const ICONOS = {
  buscar: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/>',
  brote: '<path d="M12 21v-9"/><path d="M12 12c0-4.2 3-7.2 8-7.2 0 4.2-3 7.2-8 7.2z"/><path d="M12 14.5c0-3.2-2.5-5.7-7-5.7 0 3.2 2.5 5.7 7 5.7z"/>',
  frasco: '<path d="M9 3h6"/><path d="M10 3v5.5L5.6 16.6A2.6 2.6 0 0 0 7.9 20.5h8.2a2.6 2.6 0 0 0 2.3-3.9L14 8.5V3"/><path d="M7.4 14.5h9.2"/>',
  grafico: '<path d="M3 20.5h18"/><path d="M6.5 17V11"/><path d="M12 17V5"/><path d="M17.5 17v-7"/>',
  pdf: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
  alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.6v.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  luna: '<path d="M20 14.6A8 8 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  flecha: '<path d="m9 6 6 6-6 6"/>',
  escudo: '<path d="M12 3 5 6v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6z"/>',
  rotar: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
};

export function icono(nombre) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false',
  })) s.setAttribute(k, v);
  s.innerHTML = ICONOS[nombre] || '';
  return s;
}

// ---------- Formatos ----------

const formatoNumero = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 });
export const num = (x) => formatoNumero.format(Number(x));
export const porcentaje = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
export const plural = (n, uno, varios) => `${num(n)} ${Number(n) === 1 ? uno : varios}`;

export function fecha(valor) {
  if (!valor) return '';
  const d = valor instanceof Date ? valor : new Date(valor);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function limpio(s) {
  return String(s ?? '').replace(/\s+/g, ' ').trim();
}

export function recortar(s, max = 90) {
  const t = limpio(s);
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

// ---------- Rutas (hash) ----------

export function ruta(camino, params) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params || {})) {
    if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) q.set(k, Array.isArray(v) ? v.join(',') : v);
  }
  const s = q.toString();
  return `#/${camino}${s ? `?${s}` : ''}`;
}

// ---------- Piezas de una línea de uso ----------

// Regla 1: nunca una dosis sin su estado. "Revisado" solo si una persona la aprobó.
export function estadoRevision(u) {
  const partes = [];
  if (u.review_status === 'aprobado') {
    partes.push(h('span', { class: 'etiqueta etq-ok', title: 'Una persona la comparó con la etiqueta' }, icono('check'), 'Revisado'));
  } else {
    partes.push(h('span', { class: 'etiqueta etq-auto', title: 'Leído de la etiqueta por un programa. Nadie lo ha revisado todavía.' }, 'Extraído automáticamente'));
  }
  if (u.confidence_score != null && Number(u.confidence_score) < UMBRAL_CONFIANZA) {
    partes.push(h('span', {
      class: 'etiqueta etq-alerta',
      title: `Confianza del extractor: ${num(u.confidence_score)} (bajo ${num(UMBRAL_CONFIANZA)})`,
    }, icono('alerta'), 'Confianza baja: revisa la etiqueta'));
  }
  return h('span', { class: 'estado-linea' }, partes);
}

export function dosis(u) {
  const texto = limpio(u.dose_raw);
  return h('div', { class: 'valor' },
    texto ? h('span', { class: 'valor-texto' }, texto) : h('span', { class: 'sin-dato' }, 'Sin dato, verificar etiqueta'),
    estadoRevision(u));
}

// Cita guardada en field_citations (Fase 2): texto literal de la etiqueta y su página.
export function citaDe(u, campo, url) {
  const c = u.field_citations && u.field_citations[campo];
  if (!c || !limpio(c.cita)) return null;
  const pagina = c.pagina ? (url
    ? h('a', { href: `${url}#page=${c.pagina}`, target: '_blank', rel: 'noopener' }, `pág. ${c.pagina}`)
    : `pág. ${c.pagina}`) : null;
  return h('span', { class: 'cita' }, `Etiqueta: «${recortar(c.cita, 200)}»`, pagina ? [' (', pagina, ')'] : null);
}

function citaCruda(texto, cita) {
  const c = limpio(cita);
  return c && c.toLowerCase() !== texto.toLowerCase() ? h('span', { class: 'cita' }, `Etiqueta: «${recortar(c, 160)}»`) : null;
}

function valorConCita(texto, cita) {
  return h('div', { class: 'valor' }, h('span', { class: 'valor-texto' }, texto), cita);
}

// Regla 2: la carencia nunca queda en blanco.
// Hay tres casos: días o «no aplica» (con cita); «depende» (la etiqueta pone una condición que la
// línea no permite resolver, ej. uva de mesa vs vinífera: se muestra la cita sin número); y sin dato.
export function carencia(u, url) {
  if (u.withholding_period_days != null || u.withholding_not_applicable) {
    const texto = u.withholding_period_days != null ? plural(u.withholding_period_days, 'día', 'días') : 'No aplica';
    return valorConCita(texto, citaDe(u, 'carencia', url) || citaCruda(texto, u.withholding_period_raw));
  }
  const c = u.field_citations && u.field_citations.carencia;
  if ((c && c.condicional) || limpio(u.withholding_period_raw)) {
    return h('div', { class: 'valor' },
      h('span', { class: 'sin-dato' }, 'Depende: ver condición en la etiqueta'),
      citaDe(u, 'carencia', url) || citaCruda('', u.withholding_period_raw),
      linkPdf(url, (c && c.pagina) || u.source_page, 'Ver etiqueta'));
  }
  return h('div', { class: 'valor' },
    h('span', { class: 'sin-dato' }, 'Sin dato, verificar etiqueta'),
    linkPdf(url, u.source_page, 'Ver etiqueta'));
}

export function reingreso(horas, url) {
  if (horas != null) return h('div', { class: 'valor' }, h('span', { class: 'valor-texto' }, plural(horas, 'hora', 'horas')));
  return h('div', { class: 'valor' }, h('span', { class: 'sin-dato' }, 'Sin dato, ver etiqueta'), url ? linkPdf(url, null, 'Ver etiqueta') : null);
}

export function mojamiento(u, url) {
  const a = u.water_volume_min_l_ha;
  const b = u.water_volume_max_l_ha;
  let t = null;
  if (a != null && b != null) t = Number(a) === Number(b) ? `${num(a)} L/ha` : `${num(a)} a ${num(b)} L/ha`;
  else if (a != null) t = `mínimo ${num(a)} L/ha`;
  else if (b != null) t = `hasta ${num(b)} L/ha`;
  return t ? valorConCita(t, citaDe(u, 'mojamiento', url)) : h('span', { class: 'sin-dato' }, 'Sin dato');
}

export function intervalo(u, url) {
  const a = u.interval_min_days;
  const b = u.interval_max_days;
  let t = null;
  if (a != null && b != null) t = Number(a) === Number(b) ? `cada ${plural(a, 'día', 'días')}` : `cada ${num(a)} a ${plural(b, 'día', 'días')}`;
  else if (a != null) t = `cada ${plural(a, 'día', 'días')} o más`;
  else if (b != null) t = `cada ${plural(b, 'día', 'días')} como máximo`;
  return t ? valorConCita(t, citaDe(u, 'intervalo', url)) : h('span', { class: 'sin-dato' }, 'Sin dato');
}

export function metodo(u, url, max = 200) {
  const t = limpio(u.application_method);
  return t ? valorConCita(recortar(t, max), citaDe(u, 'metodo', url)) : h('span', { class: 'sin-dato' }, 'Sin dato');
}

export function maxAplicaciones(u) {
  if (u.maximum_applications_per_season == null) return h('span', { class: 'sin-dato' }, 'Sin dato');
  const extra = limpio(u.season_restriction);
  return h('span', { class: 'valor-texto' }, `${num(u.maximum_applications_per_season)}${extra ? ` (${extra})` : ''}`);
}

export function textoOSinDato(s, max) {
  const t = limpio(s);
  return t ? h('span', null, max ? recortar(t, max) : t) : h('span', { class: 'sin-dato' }, 'Sin dato');
}

// Regla 3: todo producto y toda línea con link a su etiqueta PDF.
export function linkPdf(url, pagina, texto = 'Etiqueta PDF') {
  if (!url) return h('span', { class: 'pdf-falta' }, 'PDF no disponible en el sistema');
  const destino = pagina ? `${url}#page=${pagina}` : url;
  return h('a', { class: 'pdf', href: destino, target: '_blank', rel: 'noopener' },
    icono('pdf'), pagina ? `${texto} (pág. ${pagina})` : texto);
}

export function urlDeLinea(cat, u) {
  const d = cat.documentos.get(u.source_document_id);
  if (d && d.url) return d.url;
  const p = cat.productos.get(u.product_id);
  return p && p.etiqueta ? p.etiqueta.url : null;
}

export function claseMoa(clave) {
  const s = String(clave || '').split(' ')[0];
  return s === 'FRAC' ? 'moa moa-frac' : s === 'IRAC' ? 'moa moa-irac' : s === 'HRAC' ? 'moa moa-hrac' : 'moa moa-otro';
}

export function chipsMoa(lista) {
  if (!lista || !lista.length) return null;
  return h('span', { class: 'lista-moa' }, lista.map((k) => h('span', { class: claseMoa(k), title: 'Grupo de modo de acción' }, k)));
}

export function ingredientesTexto(p) {
  if (!p.ings.length) return 'Sin ingrediente activo registrado';
  return p.ings.map((x) => (x.conc ? `${x.ing.nombre} (${limpio(x.conc)})` : x.ing.nombre)).join(' + ');
}

export function etiquetasCategoria(p) {
  return p.categorias.map((c) => h('span', { class: 'etiqueta categoria' }, c.nombre));
}

export function mensajeError(err) {
  const texto = err && err.message ? err.message : String(err);
  return h('div', { class: 'nota nota-peligro', role: 'alert' },
    h('p', null, h('strong', null, 'No se pudieron cargar los datos. '), 'Revisa tu conexión e intenta de nuevo.'),
    h('p', { class: 'chico' }, `Detalle técnico: ${texto}`),
    h('button', { class: 'boton', type: 'button', onclick: () => location.reload() }, 'Reintentar'));
}

export function cargando(texto = 'Cargando…') {
  return h('div', { class: 'cargando', role: 'status' }, h('span', { class: 'ruedita', 'aria-hidden': 'true' }), texto);
}

export function retrasar(fn, ms = 150) {
  let t = null;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}
