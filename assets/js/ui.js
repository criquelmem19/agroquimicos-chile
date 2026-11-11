// Piezas de interfaz compartidas: creación de elementos, íconos, formatos y
// la forma de mostrar dosis, carencia, reingreso, etc. (reglas del sitio).
import { queHace, nombreClave, tipoDeClave, TIPOS } from './moa.js';

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
  // Hoja con lupa (columna «Etiqueta» del buscador; Cristóbal, 11-11-2026: «simple, con poco detalle pero claro»).
  // PDF relleno (columna «Etiqueta» del buscador, 11-11-2026: «un ícono de PDF como relleno»): hoja llena del color del
  // texto y «PDF» calado en el color de fondo (.icono-claro).
  pdfLleno: '<path d="M6.5 2h8.25L20 7.25V20.5a1.5 1.5 0 0 1-1.5 1.5h-12A1.5 1.5 0 0 1 5 20.5v-17A1.5 1.5 0 0 1 6.5 2z" fill="currentColor" stroke="none"/><path class="icono-pliegue" d="M14.75 2v4a1.25 1.25 0 0 0 1.25 1.25H20"/><text class="icono-claro" x="12.5" y="17.6" text-anchor="middle">PDF</text>',
  etiqueta: '<path d="M11 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5v2.5"/><path d="M14 3v5h5"/><path d="M8.5 11.5h5M8.5 15h2"/><circle cx="16.5" cy="16.5" r="3"/><path d="m18.7 18.7 2.3 2.3"/>',
  alerta: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.6v.01"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  luna: '<path d="M20 14.6A8 8 0 1 1 9.4 4a6.6 6.6 0 0 0 10.6 10.6z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  flecha: '<path d="m9 6 6 6-6 6"/>',
  arriba: '<path d="M12 19V5"/><path d="m6 11 6-6 6 6"/>',
  abajo: '<path d="M12 5v14"/><path d="m6 13 6 6 6-6"/>',
  orden: '<path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/>',
  escudo: '<path d="M12 3 5 6v6c0 4.5 3 7.6 7 9 4-1.4 7-4.5 7-9V6z"/>',
  rotar: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  calendario: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 17.2h.01M12 17.2h.01"/>',
  mas: '<path d="M12 5v14M5 12h14"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M12 7.8v.01"/>',
  basura: '<path d="M4 7h16M10 11v6M14 11v6"/><path d="m6 7 1 12.4A2 2 0 0 0 9 21h6a2 2 0 0 0 2-1.6L18 7"/><path d="M9 7V4.5h6V7"/>',
  lapiz: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  imprimir: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  descargar: '<path d="M12 4v11"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/>',
  cerrar: '<path d="M6 6l12 12M18 6 6 18"/>',
  trofeo: '<path d="M8 4h8v5.5a4 4 0 0 1-8 0z"/><path d="M8 6H5.5a3 3 0 0 0 3 4M16 6h2.5a3 3 0 0 1-3 4"/><path d="M12 13.5V17M8.5 20.5h7M10 17h4v3.5h-4z"/>',
  libro: '<path d="M12 7v13"/><path d="M3.5 5.5h5A3.5 3.5 0 0 1 12 9a3.5 3.5 0 0 1 3.5-3.5h5V18h-5.5a3 3 0 0 0-3 3 3 3 0 0 0-3-3H3.5z"/>',
  casa: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6H9v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  mapa: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="18" cy="8" r="2.5"/><circle cx="9.5" cy="18" r="2.5"/><path d="M8.5 6.8l7 .9M6.7 8.9l1.9 6.7M16.4 9.9l-5.3 6.3"/>',
};

export function icono(nombre) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '1.5',
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
// Sin el aviso «Confianza baja» (Cristóbal, 10-11-2026: «no pongas este tipo de mensajes, hace que todo se vea más feo»).
function estado(revisado) {
  return h('span', { class: 'estado-linea' }, revisado
    ? h('span', { class: 'etiqueta etq-ok', title: 'Una persona la comparó con la etiqueta' }, icono('check'), 'Revisado')
    : h('span', { class: 'etiqueta etq-auto', title: 'Leído de la etiqueta por un programa. Nadie lo ha revisado todavía.' }, 'Extraído automáticamente'));
}

export function estadoRevision(u) {
  return estado(u.review_status === 'aprobado');
}

export function dosis(u) {
  const texto = limpio(u.dose_raw);
  return h('div', { class: 'valor' },
    texto ? h('span', { class: 'valor-texto' }, texto) : h('span', { class: 'sin-dato' }, 'Sin dato, verificar etiqueta'),
    estadoRevision(u));
}

// ---------- Dosis «desde – hasta» (tabla del inicio) ----------
// Se arma con los números leídos de la etiqueta (dose_min/dose_max), agrupados por unidad: nunca se
// mezclan unidades ni se convierten. Las dosis sin unidad clara («g» sin decir por qué) no entran al rango.

const BASES_DOSIS = { por_ha: '/ha', por_100_l: '/100 L', por_l: '/L', por_100_kg_semilla: '/100 kg semilla' };
const UNIDADES = { k: 'kg', kg: 'kg', g: 'g', gr: 'g', gramos: 'g', mg: 'mg', l: 'L', lt: 'L', ml: 'mL', cc: 'cc', cm3: 'cc' };
// Unidades que se cuentan (feromonas, tabletas de fumigación…): «300 difusores/ha».
const CONTABLES = /^(dispositivos?|difusores?|unidades?|tabletas?|pastillas?|latas?( puffer)?|bolsitas?|placas?|sobres?|trampas?)$/i;

function unidadDosis(unidad, base) {
  const u = limpio(unidad).replace(/\s+de producto comercial$/i, '');
  // Concentraciones (reguladores, postcosecha): la base no cambia nada.
  const conc = u.toLowerCase().replace(/\s+/g, ' ');
  if (/^ppm( i\.? ?a\.?)?$/.test(conc)) return conc === 'ppm' ? 'ppm' : 'ppm i.a.';
  if (conc === 'ppb') return 'ppb';
  if (base === 'porcentaje') return !u || u === '%' ? '%' : null;
  if (!u) return null;
  const conocida = UNIDADES[u.toLowerCase()];
  if (conocida) return BASES_DOSIS[base] ? `${conocida}${BASES_DOSIS[base]}` : null;
  // Ingrediente activo: «g i.a./ha».
  const ia = u.match(/^(g|kg|l|cc|ml)\s*i\.?\s*a\.?$/i);
  if (ia) return BASES_DOSIS[base] ? `${UNIDADES[ia[1].toLowerCase()]} i.a.${BASES_DOSIS[base]}` : null;
  if (CONTABLES.test(u)) return BASES_DOSIS[base] ? `${u.toLowerCase()}${BASES_DOSIS[base]}` : null;
  // Unidades que ya traen la base: «cc/hL», «g/m2».
  if (u.includes('/')) return base === 'por_100_l' ? u.replace(/\/hl$/i, '/100 L') : u;
  return null;
}

const NBSP = '\u00a0';
// Despu\u00e9s de la raya \u00ab\u2013\u00bb el navegador puede cortar aunque siga un espacio duro: la \u00abuni\u00f3n\u00bb lo impide.
const UNION = '\u2060';

// grupos: [{u, b, min, max, n}] (de la vista o de resumenDosis). Une los que quedan con la misma unidad.
export function rangosDosis(grupos) {
  const m = new Map();
  for (const g of grupos) {
    const unidad = unidadDosis(g.u, g.b);
    if (!unidad || g.min == null) continue;
    const x = m.get(unidad);
    if (x) { x.min = Math.min(x.min, g.min); x.max = Math.max(x.max, g.max); x.n += g.n; } else m.set(unidad, { unidad, min: Number(g.min), max: Number(g.max), n: g.n });
  }
  return [...m.values()].sort((a, b) => b.n - a.n)
    // Las cifras («100 – 150») y la unidad («cc/100 L») no se cortan por dentro; si no cabe, la unidad baja entera.
    .map((r) => `${r.min === r.max ? num(r.min) : `${num(r.min)}${NBSP}–${UNION}${NBSP}${num(r.max)}`} ${r.unidad.replace(/ (L|kg)\b/, `${NBSP}$1`)}`);
}

// Resumen de un grupo de líneas de uso: dosis por unidad y su estado de revisión. texto: la dosis de la etiqueta más
// repetida entre las líneas que no entran a un rango (sin número o sin unidad clara), como v_sitio_dosis_texto.
export function resumenDosis(lineas) {
  const m = new Map();
  const textos = new Map();
  for (const u of lineas) {
    const t = limpio(u.dose_raw).slice(0, 120);
    if (t && ((u.dose_min ?? u.dose_max) == null || u.dose_basis === 'otro' || !limpio(u.dose_unit))) textos.set(t, (textos.get(t) || 0) + 1);
  }
  const texto = [...textos].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  let aprobadas = 0;
  for (const u of lineas) {
    if (u.review_status === 'aprobado') aprobadas += 1;
    const a = u.dose_min ?? u.dose_max;
    const b = u.dose_max ?? u.dose_min;
    if (a == null) continue;
    const clave = `${u.dose_unit}|${u.dose_basis}`;
    const x = m.get(clave);
    if (x) { x.min = Math.min(x.min, a); x.max = Math.max(x.max, b); x.n += 1; } else m.set(clave, { u: u.dose_unit, b: u.dose_basis, min: Number(a), max: Number(b), n: 1 });
  }
  return { grupos: [...m.values()], n: lineas.length, aprobadas, texto: texto ? texto[0] : null };
}

// Regla 1 en una dosis resumida: «Revisado» solo si todas sus líneas fueron revisadas por una persona.
export function estadoResumen(r) {
  return estado(Boolean(r.n && r.aprobadas === r.n));
}

// max: cuántos rangos (uno por unidad) se ven; el resto, con «+N» y en el texto que aparece al pasar el mouse.
// soloRevisado: sin «Extraído automáticamente» (tabla del buscador, pedido de Cristóbal el 11-11-2026: «no pongas la
// frase de extraído automáticamente»); «Revisado» se sigue mostrando cuando una persona revisó todas las líneas.
export function dosisRango(r, max = 2, { soloRevisado = false } = {}) {
  if (!r || !r.n) return h('span', { class: 'tenue' }, 'Sin usos registrados');
  const rangos = rangosDosis(r.grupos);
  const textos = rangos.slice(0, max).map((t) => h('span', { class: 'rango' }, t));
  // Sin rango: el texto de la dosis tal como lo dice la etiqueta («1 tableta por cada 15 m3»).
  const etiqueta = !textos.length && r.texto ? limpio(r.texto) : null;
  return h('div', { class: 'valor', title: rangos.length ? rangos.join(' · ') : etiqueta },
    textos.length
      ? h('span', { class: 'rangos' }, textos, rangos.length > max ? h('span', { class: 'rango-mas' }, `+${rangos.length - max}`) : null)
      : etiqueta ? h('span', { class: 'rango recorte-2' }, etiqueta)
        : h('span', { class: 'sin-dato' }, 'Sin dosis en los datos'),
    soloRevisado && !(r.n && r.aprobadas === r.n) ? null : estadoResumen(r));
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

// Todos los productos de un código en el buscador (en IRAC manda el número: «IRAC 4A» lleva a todo el grupo 4).
export function rutaMoa(clave) {
  return ruta('buscar', { moa: String(clave).replace(/^(IRAC \d+)[A-Z]$/, '$1') });
}

// Un código de modo de acción. Es un botón que lleva a todos los productos de ese código, en cualquier parte del sitio
// (Cristóbal, 10-11-2026). enlace: false solo cuando va dentro de otro botón o link.
// Los productos sin código llevan un chip gris con lo que son («Regulador», «Feromona»: clave «tipo:regulador»).
export function chipMoa(k, { enlace = true, antes = null } = {}) {
  const que = queHace(k);
  const t = tipoDeClave(k);
  const nombre = nombreClave(k);
  const todos = t ? `Ver todos: ${(TIPOS[t] || {}).nombre || nombre}, sin código FRAC, IRAC ni HRAC` : `Ver todos los ${k}`;
  const titulo = [enlace ? todos : nombre, que,
    antes ? `En la etiqueta: ${antes.join(', ')} (código antiguo; equivalencia de la tabla oficial)` : null].filter(Boolean).join('. ');
  return h(enlace ? 'a' : 'span', { class: claseMoa(k), href: enlace ? rutaMoa(k) : null, title: titulo },
    nombre, antes ? h('small', { class: 'moa-antes' }, `(${antes.map((x) => x.split(' ')[1]).join('/')})`) : null);
}

// etiquetas (opcional): Map código actual → cómo viene escrito en la etiqueta (código antiguo, ej. «HRAC A»).
export function chipsMoa(lista, etiquetas, { enlace = true } = {}) {
  if (!lista || !lista.length) return null;
  return h('span', { class: 'lista-moa' }, lista.map((k) => chipMoa(k, { enlace, antes: etiquetas && etiquetas.get(k) })));
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
    h('p', null, h('strong', null, 'No se pudieron cargar los datos. '), 'Puede ser tu conexión o el servidor. Intenta de nuevo.'),
    h('p', { class: 'chico' }, `Detalle técnico: ${texto}`),
    h('button', { class: 'boton', type: 'button', onclick: () => location.reload() }, 'Reintentar'));
}

// Pantalla de carga: «esqueleto» de bloques grises con la forma de lo que viene (pedido de Cristóbal, 31-10-2026:
// la ruedita con texto se veía tediosa). El texto queda solo para los lectores de pantalla.
// forma: 'inicio' (filtros y filas de productos; igual al de index.html), 'lista' (líneas de uso, plan) o 'texto'.
export function cargando(texto = 'Cargando…', forma = 'texto') {
  const filas = forma === 'texto'
    ? [1, 2, 3].map(() => h('span', { class: 'esq' }))
    : Array.from({ length: forma === 'inicio' ? 6 : 4 }, () => h('div', { class: 'esq-fila' },
      Array.from({ length: forma === 'inicio' ? 6 : 2 }, () => h('span', { class: 'esq' }))));
  return h('div', { class: `esqueleto esqueleto-${forma}`, role: 'status', 'aria-busy': 'true' },
    h('span', { class: 'solo-lector' }, texto),
    forma === 'inicio' ? [h('div', { class: 'esq-panel' }, [1, 2, 3, 4, 5, 6].map(() => h('span'))), h('span', { class: 'esq esq-cuenta' })] : null,
    filas);
}

// Aviso emergente abajo de la pantalla (sobre la barra del celular), que se cierra solo.
export function notificar(contenido, ms = 6000) {
  let zona = document.querySelector('.avisos-flotantes');
  if (!zona) {
    zona = h('div', { class: 'avisos-flotantes', role: 'status', 'aria-live': 'polite' });
    document.body.append(zona);
  }
  const t = h('div', { class: 'flotante' }, h('div', { class: 'flotante-texto' }, contenido),
    h('button', { type: 'button', class: 'flotante-cerrar', 'aria-label': 'Cerrar aviso', onclick: () => t.remove() }, icono('cerrar')));
  zona.append(t);
  setTimeout(() => t.remove(), ms);
  return t;
}

// Burbuja junto a un botón (ej. todos los cultivos de una fila, sin agrandar la fila). Se cierra al tocar fuera, con
// Escape o al mover la página. Una sola abierta a la vez.
let globoAbierto = null;
export function globo(boton, contenido) {
  if (globoAbierto) {
    const era = globoAbierto.boton;
    globoAbierto.cerrar();
    if (era === boton) return;
  }
  const caja = h('div', { class: 'globo', role: 'dialog' }, contenido);
  document.body.append(caja);
  const r = boton.getBoundingClientRect();
  const izq = Math.max(8, Math.min(r.left, window.innerWidth - caja.offsetWidth - 8));
  const cabeAbajo = r.bottom + 8 + caja.offsetHeight < window.innerHeight;
  caja.style.left = `${izq}px`;
  caja.style.top = `${cabeAbajo ? r.bottom + 8 : Math.max(8, r.top - 8 - caja.offsetHeight)}px`;
  boton.setAttribute('aria-expanded', 'true');
  const fuera = (e) => { if (!caja.contains(e.target) && !boton.contains(e.target)) cerrar(); };
  const tecla = (e) => { if (e.key === 'Escape') { cerrar(); boton.focus(); } };
  const mover = (e) => { if (!caja.contains(e.target)) cerrar(); };
  function cerrar() {
    caja.remove();
    boton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', fuera, true);
    document.removeEventListener('keydown', tecla, true);
    window.removeEventListener('scroll', mover, true);
    window.removeEventListener('resize', cerrar);
    globoAbierto = null;
  }
  document.addEventListener('pointerdown', fuera, true);
  document.addEventListener('keydown', tecla, true);
  window.addEventListener('scroll', mover, true);
  window.addEventListener('resize', cerrar);
  globoAbierto = { boton, cerrar };
}

export function retrasar(fn, ms = 150) {
  let t = null;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

// Campo con sugerencias (cultivo y objetivo en el inicio; buscador del mapa). opciones(texto) devuelve
// [{ etiqueta, detalle, clase, accion }]. Con `elegido`, muestra lo elegido y un botón para quitarlo (link `quitar`).
export function combo({ id, titulo, placeholder, elegido, opciones, quitar }) {
  if (elegido) {
    return h('div', { class: 'filtro filtro-ancho' },
      h('span', { class: 'filtro-titulo' }, titulo),
      h('div', { class: 'combo-elegido' },
        h('strong', null, elegido),
        h('a', { class: 'combo-quitar', href: quitar, 'aria-label': `Quitar ${titulo.toLowerCase()}`, title: 'Quitar' }, icono('cerrar'))));
  }
  const entrada = h('input', {
    class: 'entrada', id, type: 'search', placeholder, autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search',
  });
  const lista = h('ul', { class: 'combo-lista', hidden: true });
  const caja = h('div', { class: 'combo' }, entrada, lista);
  const pintar = () => {
    vaciar(lista);
    const ops = opciones(entrada.value);
    if (!ops.length) lista.append(h('li', null, h('div', { class: 'opcion tenue' }, 'Sin coincidencias. Prueba con otra palabra.')));
    for (const o of ops) {
      lista.append(h('li', null, h('button', {
        type: 'button', class: `opcion ${o.clase || ''}`, onmousedown: (e) => e.preventDefault(), onclick: o.accion,
      }, h('span', null, o.etiqueta), o.detalle ? h('small', null, o.detalle) : null)));
    }
    lista.hidden = false;
  };
  entrada.addEventListener('focus', pintar);
  entrada.addEventListener('input', retrasar(pintar, 80));
  caja.addEventListener('focusout', (e) => { if (!caja.contains(e.relatedTarget)) lista.hidden = true; });
  caja.addEventListener('keydown', (e) => {
    const botones = [...lista.querySelectorAll('button.opcion')];
    const i = botones.indexOf(document.activeElement);
    if (e.key === 'Escape') { lista.hidden = true; entrada.focus(); }
    else if (e.key === 'Enter' && document.activeElement === entrada) { e.preventDefault(); if (botones[0]) botones[0].click(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); (botones[i + 1] || botones[0])?.focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (i > 0) botones[i - 1].focus(); else entrada.focus(); }
  });
  return h('div', { class: 'filtro filtro-ancho' }, h('label', { class: 'filtro-titulo', for: id }, titulo), caja);
}

// ---------- Dibujos de los comités ----------
// Hongo (FRAC), insecto (IRAC) y maleza (HRAC), solo líneas. Los usa el inicio (en su cuadrito de color) y, chicos y del
// color de su comité, la tabla del buscador antes del nombre de cada producto y la página de cada grupo (11-11-2026).
const DIBUJOS_COMITE = {
  frac: '<path d="M8 31c0-13 11-22 24-22s24 9 24 22c0 2-2 3-4 3H12c-2 0-4-1-4-3z"/><path d="M24 34v14c0 4 4 7 8 7s8-3 8-7V34"/><circle cx="22" cy="21" r="3"/><circle cx="36" cy="16" r="2.5"/><circle cx="44" cy="25" r="3"/><path d="M10 58h44"/>',
  irac: '<ellipse cx="32" cy="38" rx="13" ry="16"/><circle cx="32" cy="17" r="6"/><path d="M32 23v31"/><path d="M19 31l-9-5M19 39H8M20 47l-8 6M45 31l9-5M45 39h11M44 47l8 6"/><path d="M29 12l-5-7M35 12l5-7"/>',
  hrac: '<path d="M8 57h48"/><path d="M32 57V28"/><path d="M32 42c-10 0-16-6-17-14 9 0 16 5 17 14z"/><path d="M32 35c9 0 15-6 16-13-9 0-15 5-16 13z"/><path d="M14 57c0-8 2-14 6-18M50 57c0-8-2-13-6-17M21 57c0-5 1-9 3-11"/>',
};

export function dibujoComite(clase, claseCss = 'md-dibujo', grosor = '2.5') {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', 'stroke-width': grosor,
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: claseCss,
  })) s.setAttribute(k, v);
  s.innerHTML = DIBUJOS_COMITE[clase] || '';
  return s;
}

// ---------- Lista desplegable con varias opciones (filtros del buscador) ----------
// Pedido de Cristóbal (11-11-2026): «las listas desplegables de los filtros son horribles, hazlas todas iguales, modernas,
// pudiendo seleccionar varias cosas». Un botón con lo elegido; al tocarlo se abre un panel con un buscador arriba y la
// lista con casillas (en el celular, una hoja desde abajo). Lo elegido se aplica al cerrar: «Listo», Esc o tocar afuera.
// opciones(texto) → [{ valor, etiqueta, detalle, clase }]; elegidos: [{ valor, etiqueta }]; alAplicar(elegidos).
let selectorAbierto = null;

export function selectorMultiple({ id, titulo, vacio = 'Todos', buscar = 'Buscar…', opciones, elegidos = [], alAplicar }) {
  const inicial = elegidos.map((e) => e.valor).sort().join('|');
  const seleccion = new Map(elegidos.map((e) => [e.valor, e]));
  const valor = h('span', { class: 'sm-valor' });
  const boton = h('button', {
    type: 'button', class: 'sm-boton', id, 'aria-haspopup': 'listbox', 'aria-expanded': 'false',
  }, valor, icono('chevron'));
  const entrada = h('input', {
    class: 'sm-buscar', type: 'search', placeholder: buscar, autocomplete: 'off', spellcheck: 'false',
    'aria-label': `Buscar en ${titulo.toLowerCase()}`, enterkeyhint: 'search',
  });
  const lista = h('div', { class: 'sm-lista', role: 'listbox', 'aria-multiselectable': 'true', 'aria-label': titulo });
  const cuenta = h('span', { class: 'sm-cuenta' });
  const panel = h('div', { class: 'sm-panel', hidden: true, role: 'dialog', 'aria-label': titulo },
    h('div', { class: 'sm-cabeza' }, h('strong', null, titulo), cuenta),
    h('div', { class: 'busqueda sm-busqueda' }, icono('buscar'), entrada),
    lista,
    h('div', { class: 'sm-pie' },
      h('button', { type: 'button', class: 'boton-texto', onclick: () => { seleccion.clear(); pintar(); } }, 'Quitar todo'),
      h('button', { type: 'button', class: 'boton boton-primario boton-chico', onclick: () => cerrar() }, 'Listo')));
  const caja = h('div', { class: 'filtro sm' },
    h('label', { class: 'filtro-titulo', for: id }, titulo),
    h('div', { class: 'sm-ancla' }, boton, panel));

  function pintarBoton() {
    const xs = [...seleccion.values()];
    valor.textContent = !xs.length ? vacio : xs.length === 1 ? xs[0].etiqueta : `${xs[0].etiqueta} +${xs.length - 1}`;
    valor.title = xs.map((x) => x.etiqueta).join(', ');
    boton.classList.toggle('sm-con', xs.length > 0);
  }
  function pintar() {
    vaciar(lista);
    const ops = opciones(entrada.value) || [];
    // Lo elegido va siempre arriba (para poder quitarlo aunque no calce con lo escrito).
    const vistos = new Set(ops.map((o) => o.valor));
    const todas = [...[...seleccion.values()].filter((e) => !vistos.has(e.valor)), ...ops];
    if (!todas.length) lista.append(h('p', { class: 'sm-nada' }, 'Nada calza con lo escrito'));
    for (const o of todas) {
      const marcado = seleccion.has(o.valor);
      lista.append(h('button', {
        type: 'button', role: 'option', 'aria-selected': String(marcado), class: `sm-opcion${o.clase ? ` ${o.clase}` : ''}`,
        onclick: () => {
          if (seleccion.has(o.valor)) seleccion.delete(o.valor); else seleccion.set(o.valor, { valor: o.valor, etiqueta: o.etiqueta });
          pintar();
        },
      }, h('span', { class: 'sm-casilla', 'aria-hidden': 'true' }, marcado ? icono('check') : null),
      h('span', { class: 'sm-etiqueta' }, o.etiqueta), o.detalle ? h('span', { class: 'sm-detalle' }, o.detalle) : null));
    }
    cuenta.textContent = seleccion.size ? `${seleccion.size} elegido${seleccion.size === 1 ? '' : 's'}` : '';
    pintarBoton();
  }
  const fuera = (e) => { if (!caja.contains(e.target)) cerrar(); };
  const teclas = (e) => { if (e.key === 'Escape') { e.preventDefault(); cerrar(); boton.focus(); } };
  function abrir() {
    if (selectorAbierto && selectorAbierto !== cerrar) selectorAbierto();
    selectorAbierto = cerrar;
    entrada.value = '';
    panel.hidden = false;
    caja.classList.add('sm-abierto');
    boton.setAttribute('aria-expanded', 'true');
    pintar();
    // En el celular el teclado taparía la lista: allí no se enfoca el buscador solo.
    if (!matchMedia('(max-width: 699px)').matches) entrada.focus();
    document.addEventListener('pointerdown', fuera, true);
    document.addEventListener('keydown', teclas, true);
  }
  function cerrar() {
    if (panel.hidden) return;
    panel.hidden = true;
    caja.classList.remove('sm-abierto');
    boton.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', fuera, true);
    document.removeEventListener('keydown', teclas, true);
    if (selectorAbierto === cerrar) selectorAbierto = null;
    const ahora = [...seleccion.keys()].sort().join('|');
    if (ahora !== inicial) alAplicar([...seleccion.values()]);
  }
  boton.addEventListener('click', () => (panel.hidden ? abrir() : cerrar()));
  entrada.addEventListener('input', retrasar(pintar, 100));
  pintarBoton();
  return caja;
}
