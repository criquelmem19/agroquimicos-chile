// Plan de aplicaciones: calendario por cultivo y temporada, con alertas según la etiqueta
// (mismo grupo IRAC/FRAC/HRAC, máximo por temporada, intervalo y carencia antes de la cosecha).
// Se guarda solo en este equipo. Parámetros: producto=<id>&uso=<id> (llega con el uso ya elegido
// desde «¿Qué aplico?» o la ficha de un producto).
import { usosPorCultivo, usosPorProducto } from '../db.js';
import { filtrar, palabras, normalizar } from '../buscador.js';
import * as P from '../plan.js';
import { UMBRAL_CONFIANZA } from '../config.js';
import {
  h, icono, ruta, plural, recortar, limpio, vaciar, cargando, retrasar, notificar,
  dosis, carencia, linkPdf, urlDeLinea, chipsMoa, ingredientesTexto,
} from '../ui.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const NIVEL_CLASE = { peligro: 'nota-peligro', alerta: 'nota-alerta', info: 'nota-info', ok: 'nota-ok' };
const NIVEL_TEXTO = { peligro: 'No cumple la etiqueta', alerta: 'Revisar', info: 'Para saber', ok: 'Cumple' };

const mesPorPlan = new Map();

// ---------- Piezas ----------

function sistema(p) {
  const k = p && p.moa[0];
  const s = k ? k.split(' ')[0].toLowerCase() : 'otro';
  return ['frac', 'irac', 'hrac'].includes(s) ? s : 'otro';
}

function nombreObjetivos(cat, u, max = 3) {
  const nombres = (u.objetivos || []).map((t) => cat.objetivos.get(t)).filter(Boolean).map((o) => recortar(o.nombre, 50));
  if (!nombres.length) return 'Sin objetivo en los datos';
  return nombres.slice(0, max).join(' · ') + (nombres.length > max ? ` y ${nombres.length - max} más` : '');
}

// Regla 1 del sitio: la dosis siempre va con su estado.
function textoDosis(u) {
  const estado = u.review_status === 'aprobado' ? 'revisada' : 'extraída automáticamente';
  const baja = u.confidence_score != null && Number(u.confidence_score) < UMBRAL_CONFIANZA ? ', confianza baja' : '';
  return `${recortar(u.dose_raw || 'dosis sin dato, verificar etiqueta', 60)} (${estado}${baja})`;
}

function textoCarencia(u) {
  if (u.withholding_period_days != null) return `carencia ${plural(u.withholding_period_days, 'día', 'días')}`;
  if (u.withholding_not_applicable) return 'carencia: no aplica';
  return 'carencia: ver etiqueta';
}

function listaAlertas(alertas, { soloGraves = false } = {}) {
  const l = soloGraves ? alertas.filter(P.esGrave) : alertas;
  if (!l.length) return null;
  return h('ul', { class: 'alertas-plan' }, l.map((a) => h('li', { class: `alerta-plan ${NIVEL_CLASE[a.nivel]}` },
    h('span', { class: 'alerta-nivel' }, a.nivel === 'ok' ? icono('check') : icono('alerta'), NIVEL_TEXTO[a.nivel]),
    h('span', null, a.texto))));
}

// Campo de búsqueda con lista de opciones (cultivos, productos).
function buscadorOpciones({ id, etiqueta, placeholder, opciones }) {
  const entrada = h('input', { class: 'entrada', type: 'search', id, placeholder, autocomplete: 'off', spellcheck: 'false' });
  const lista = h('ul', { class: 'opciones' });
  const pintar = () => {
    vaciar(lista);
    const ops = opciones(entrada.value);
    if (!ops.length) {
      lista.append(h('li', null, h('div', { class: 'opcion tenue' }, 'Sin coincidencias. Prueba con otra palabra.')));
      return;
    }
    for (const o of ops) {
      lista.append(h('li', null, h('button', { type: 'button', class: 'opcion', onclick: o.accion },
        h('span', null, o.etiqueta), o.detalle ? h('small', null, o.detalle) : null)));
    }
  };
  entrada.addEventListener('input', retrasar(pintar, 100));
  pintar();
  return h('div', { class: 'campo' }, h('label', { for: id }, etiqueta), entrada, lista);
}

function opcionesCultivo(cat, texto, alElegir) {
  const lista = [...cat.cultivos.values()].filter((c) => c.nLineas > 0 && !c.esFrase);
  const t = limpio(texto);
  const elegidos = t ? filtrar(lista, t, (c) => c.palabras, (c) => c.nLineas, 30) : lista.sort((a, b) => b.nLineas - a.nLineas).slice(0, 12);
  return elegidos.map((c) => ({ etiqueta: recortar(c.nombre, 60), detalle: plural(c.nProductos, 'producto', 'productos'), accion: () => alElegir(c.id) }));
}

// ---------- Calendario del mes ----------

function calendarioMes(cat, plan, alertas, mes, alCambiarMes, alElegir) {
  const [y, m] = mes.split('-').map(Number);
  const primero = new Date(y, m - 1, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // lunes de la primera semana
  const porFecha = new Map();
  for (const a of P.ordenadas(plan)) {
    if (!porFecha.has(a.fecha)) porFecha.set(a.fecha, []);
    porFecha.get(a.fecha).push(a);
  }
  const hoy = P.hoy();
  const semanas = [];
  const d = new Date(inicio);
  do {
    const fila = [];
    for (let i = 0; i < 7; i += 1) {
      const iso = P.isoLocal(d);
      const delMes = d.getMonth() === m - 1;
      const aps = porFecha.get(iso) || [];
      const clases = ['dia', delMes ? '' : 'dia-fuera', iso === hoy ? 'dia-hoy' : '', iso === plan.cosecha ? 'dia-cosecha' : ''].filter(Boolean).join(' ');
      fila.push(h('td', { class: clases },
        h('span', { class: 'dia-num' }, String(d.getDate())),
        iso === plan.cosecha ? h('span', { class: 'dia-marca' }, 'Cosecha') : null,
        aps.map((a) => {
          const p = cat.productos.get(a.productoId);
          const grave = (alertas.get(a.id) || []).some(P.esGrave);
          return h('button', {
            type: 'button', class: `cal-ap cal-${sistema(p)}${grave ? ' cal-grave' : ''}`,
            title: `${p ? p.nombre : 'Producto'}${p && p.moa.length ? ` · ${p.moa.join(', ')}` : ''}${grave ? ' · tiene alertas' : ''}`,
            onclick: () => alElegir(a.id),
          }, h('span', { class: 'cal-ap-nombre' }, recortar(p ? p.nombre : 'Producto', 22)), grave ? h('span', { class: 'cal-ap-alerta', 'aria-label': 'con alertas' }, '!') : null);
        })));
      d.setDate(d.getDate() + 1);
    }
    semanas.push(h('tr', null, fila));
  } while (d.getMonth() === m - 1);

  const mover = (n) => {
    const x = new Date(y, m - 1 + n, 1);
    alCambiarMes(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  };
  return h('section', { class: 'calendario', 'aria-label': 'Calendario del mes' },
    h('div', { class: 'cal-cabeza' },
      h('button', { type: 'button', class: 'boton-redondo', 'aria-label': 'Mes anterior', onclick: () => mover(-1) }, h('span', { class: 'girar' }, icono('flecha'))),
      h('h2', { class: 'cal-titulo' }, `${MESES[m - 1]} ${y}`),
      h('button', { type: 'button', class: 'boton-redondo', 'aria-label': 'Mes siguiente', onclick: () => mover(1) }, icono('flecha')),
      h('button', { type: 'button', class: 'boton boton-chico', onclick: () => alCambiarMes(hoy.slice(0, 7)) }, 'Hoy')),
    h('table', { class: 'cal-tabla' },
      h('thead', null, h('tr', null, DIAS.map((x) => h('th', { scope: 'col' }, x)))),
      h('tbody', null, semanas)));
}

// ---------- Lista de aplicaciones ----------

function tarjetaAplicacion(cat, plan, a, alertas, alCambiar) {
  const p = cat.productos.get(a.productoId);
  const u = a.linea;
  const url = u ? urlDeLinea(cat, u) : (p && p.etiqueta ? p.etiqueta.url : null);
  const f = P.aFecha(a.fecha);
  const editor = h('div', { class: 'editor-ap', hidden: true });

  const abrirEditor = async () => {
    if (!editor.hidden) { editor.hidden = true; return; }
    vaciar(editor).append(cargando('Cargando los usos…'));
    editor.hidden = false;
    let lineas = [];
    try {
      const todas = await usosPorProducto(a.productoId);
      lineas = plan.cultivoId ? todas.filter((x) => x.crop_id === plan.cultivoId) : todas;
    } catch (e) { /* sin conexión: solo se puede cambiar la fecha y la nota */ }
    const fecha = h('input', { class: 'entrada', type: 'date', value: a.fecha, required: true });
    const nota = h('input', { class: 'entrada', type: 'text', value: a.nota || '', placeholder: 'Ej: cuartel 3, mezcla con…', maxlength: '200' });
    const sel = h('select', { class: 'selector' },
      h('option', { value: '' }, 'Sin elegir uso'),
      lineas.map((x) => h('option', { value: x.id, selected: u && u.id === x.id },
        `${recortar(nombreObjetivos(cat, x, 2), 70)} — ${textoDosis(x)} · ${textoCarencia(x)}`)));
    vaciar(editor).append(
      h('div', { class: 'editor-campos' },
        h('label', { class: 'campo' }, 'Fecha', fecha),
        lineas.length ? h('label', { class: 'campo' }, 'Uso de la etiqueta (plaga, dosis y carencia)', sel) : null,
        h('label', { class: 'campo' }, 'Nota', nota)),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'boton boton-primario', onclick: () => {
          if (!P.esFecha(fecha.value)) { fecha.focus(); return; }
          const linea = sel.value ? lineas.find((x) => x.id === sel.value) : (lineas.length ? null : a.linea);
          P.editarAplicacion(plan.id, a.id, { fecha: fecha.value, nota: limpio(nota.value), linea: P.lineaResumida(linea) });
          alCambiar();
        } }, 'Guardar cambios'),
        h('button', { type: 'button', class: 'boton', onclick: () => { editor.hidden = true; } }, 'Cancelar')));
  };

  return h('article', { class: 'ap', id: `ap-${a.id}`, tabindex: '-1' },
    h('div', { class: 'ap-fecha', 'aria-hidden': 'true' },
      h('span', { class: 'ap-dia' }, String(f.getDate())),
      h('span', { class: 'ap-mes' }, MESES[f.getMonth()].slice(0, 3)),
      h('span', { class: 'ap-sem' }, DIAS[(f.getDay() + 6) % 7])),
    h('div', { class: 'ap-cuerpo' },
      h('p', { class: 'oculto' }, P.fechaCorta(a.fecha)),
      h('div', { class: 'ap-titulo' },
        p ? h('a', { href: ruta(`producto/${p.id}`) }, p.nombre) : h('strong', null, 'Producto que ya no está en el catálogo'),
        p ? chipsMoa(p.moa) : null),
      p ? h('p', { class: 'chico tenue' }, ingredientesTexto(p)) : null,
      u ? h('p', { class: 'ap-uso' }, h('strong', null, 'Controla: '), nombreObjetivos(cat, u)) : null,
      u ? h('dl', { class: 'ap-datos' },
        h('div', null, h('dt', null, 'Dosis'), h('dd', null, dosis(u))),
        h('div', null, h('dt', null, 'Carencia'), h('dd', null, carencia(u, url))))
        : null,
      listaAlertas(alertas),
      a.nota ? h('p', { class: 'ap-nota' }, h('strong', null, 'Nota: '), a.nota) : null,
      h('div', { class: 'ap-pie' },
        linkPdf(url, u ? u.source_page : null),
        h('span', { class: 'ap-acciones' },
          h('button', { type: 'button', class: 'boton boton-chico', onclick: abrirEditor }, icono('lapiz'), 'Editar'),
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => {
            if (window.confirm(`¿Quitar ${p ? p.nombre : 'esta aplicación'} del ${P.fechaCorta(a.fecha)} del plan?`)) {
              P.quitarAplicacion(plan.id, a.id);
              alCambiar();
            }
          } }, icono('basura'), 'Quitar'))),
      editor));
}

function listaAplicaciones(cat, plan, alertas, alCambiar) {
  const aps = P.ordenadas(plan);
  if (!aps.length) {
    return h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'Todavía no hay aplicaciones en este plan.')),
      h('p', { class: 'chico' }, 'Agrega la primera con el formulario de arriba.'));
  }
  const bloques = [];
  let mesActual = null;
  for (const a of aps) {
    const mes = a.fecha.slice(0, 7);
    if (mes !== mesActual) {
      mesActual = mes;
      const [y, m] = mes.split('-').map(Number);
      bloques.push(h('h3', { class: 'lista-mes' }, `${MESES[m - 1]} ${y}`));
    }
    bloques.push(tarjetaAplicacion(cat, plan, a, alertas.get(a.id) || [], alCambiar));
  }
  return h('div', { class: 'lista-aps' }, bloques);
}

// ---------- Formulario para agregar ----------

function formulario(cat, plan, lineasCultivo, pre, alAgregar) {
  const estado = {
    fecha: pre.fecha || P.hoy(),
    productoId: pre.productoId || null,
    linea: pre.linea || null,
    todos: false,
  };
  const zonaProducto = h('div');
  const zonaUso = h('div');
  const zonaAvisos = h('div', { 'aria-live': 'polite' });
  const fecha = h('input', { class: 'entrada', type: 'date', id: 'f-fecha', value: estado.fecha, required: true });
  const nota = h('input', { class: 'entrada', type: 'text', id: 'f-nota', placeholder: 'Opcional. Ej: cuartel 3, mezcla con…', maxlength: '200' });
  const boton = h('button', { type: 'submit', class: 'boton boton-primario' }, icono('mas'), 'Agregar al plan');

  const productosDelCultivo = new Map();
  for (const u of lineasCultivo || []) {
    if (!productosDelCultivo.has(u.product_id)) productosDelCultivo.set(u.product_id, []);
    productosDelCultivo.get(u.product_id).push(u);
  }
  // Se busca por nombre, ingrediente activo o grupo («frac 3»).
  const claves = new Map();
  const palabrasDe = (p) => {
    if (!claves.has(p.id)) claves.set(p.id, p.palabras.concat(...p.ings.map((x) => palabras(x.ing.nombre)), palabras(p.moa.join(' '))));
    return claves.get(p.id);
  };

  const avisos = () => {
    vaciar(zonaAvisos);
    if (!estado.productoId) return;
    const lista = P.alertasDeNueva(plan, cat, { fecha: estado.fecha, productoId: estado.productoId, linea: estado.linea, nota: '' });
    const graves = lista.filter(P.esGrave);
    zonaAvisos.append(graves.length
      ? h('div', { class: 'previa previa-alerta' }, h('p', null, h('strong', null, `Ojo: ${plural(graves.length, 'alerta', 'alertas')} si la agregas`)), listaAlertas(lista))
      : h('div', { class: 'previa previa-ok' }, h('p', null, icono('check'), h('strong', null, ' Sin alertas'), ' con lo que ya tiene el plan.'), listaAlertas(lista)));
  };

  const pintarUso = () => {
    vaciar(zonaUso);
    if (!estado.productoId) return;
    if (!plan.cultivoId) {
      zonaUso.append(h('p', { class: 'nota nota-info' }, 'Elige el cultivo del plan (arriba) para ver los usos de la etiqueta: plaga, dosis y carencia.'));
      return;
    }
    let lineas = productosDelCultivo.get(estado.productoId) || [];
    if (estado.linea && !lineas.some((u) => u.id === estado.linea.id)) lineas = [estado.linea, ...lineas];
    if (!lineas.length) {
      zonaUso.append(h('p', { class: 'nota nota-alerta' }, 'Este producto no tiene usos registrados para el cultivo del plan. Revisa la etiqueta antes de aplicarlo.'));
      return;
    }
    if (lineas.length === 1 && !estado.linea) estado.linea = lineas[0];
    const cultivo = cat.cultivos.get(plan.cultivoId);
    zonaUso.append(h('fieldset', { class: 'campo usos' },
      h('legend', null, `Uso de la etiqueta en ${cultivo ? cultivo.nombre : 'el cultivo'}`),
      lineas.map((u) => {
        const radio = h('input', { type: 'radio', name: 'f-uso', value: u.id, checked: estado.linea && estado.linea.id === u.id });
        radio.addEventListener('change', () => { estado.linea = u; avisos(); });
        return h('label', { class: 'uso-opcion' }, radio,
          h('span', null, h('strong', null, nombreObjetivos(cat, u, 3)),
            h('span', { class: 'chico tenue' }, ` · ${textoDosis(u)} · ${textoCarencia(u)}`)));
      })));
  };

  const pintarProducto = () => {
    vaciar(zonaProducto);
    if (estado.productoId) {
      const p = cat.productos.get(estado.productoId);
      zonaProducto.append(h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Producto'),
        h('div', { class: 'elegido' },
          h('span', null, h('strong', null, p ? p.nombre : 'Producto'), ' ', p ? chipsMoa(p.moa) : null,
            p ? h('span', { class: 'chico' }, ` · ${ingredientesTexto(p)}`) : null),
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => {
            estado.productoId = null; estado.linea = null; pintarProducto(); pintarUso(); avisos();
          } }, 'Cambiar'))));
      return;
    }
    const conCultivo = plan.cultivoId && !estado.todos;
    const base = conCultivo ? [...productosDelCultivo.keys()].map((id) => cat.productos.get(id)).filter(Boolean) : [...cat.productos.values()];
    const cultivo = plan.cultivoId ? cat.cultivos.get(plan.cultivoId) : null;
    zonaProducto.append(buscadorOpciones({
      id: 'f-producto',
      etiqueta: conCultivo ? `Producto (${plural(base.length, 'registrado', 'registrados')} para ${cultivo ? cultivo.nombre : 'el cultivo'})` : 'Producto',
      placeholder: 'Nombre, ingrediente o grupo (ej: FRAC 3)',
      opciones: (texto) => {
        const t = limpio(texto);
        const lista = t
          ? filtrar(base, t, palabrasDe, (p) => p.nLineas, 30)
          : [...base].sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es')).slice(0, 15);
        return lista.map((p) => ({
          etiqueta: p.nombre,
          detalle: p.moa.length ? p.moa.join(' + ') : 'sin grupo',
          accion: () => {
            estado.productoId = p.id;
            estado.linea = null;
            pintarProducto(); pintarUso(); avisos();
            const r = zonaUso.querySelector('input[type=radio]');
            (r || boton).focus();
          },
        }));
      },
    }));
    if (plan.cultivoId) {
      zonaProducto.append(h('button', { type: 'button', class: 'boton-texto', onclick: () => { estado.todos = !estado.todos; pintarProducto(); } },
        estado.todos ? 'Ver solo los registrados para el cultivo' : 'Buscar entre todos los productos'));
    }
  };

  fecha.addEventListener('change', () => { if (P.esFecha(fecha.value)) { estado.fecha = fecha.value; avisos(); } });

  const form = h('form', { class: 'tarjeta form-plan', novalidate: true },
    h('h2', { class: 'form-titulo' }, icono('mas'), 'Agregar una aplicación'),
    h('div', { class: 'form-grid' },
      h('div', { class: 'campo' }, h('label', { for: 'f-fecha' }, 'Fecha'), fecha),
      h('div', { class: 'campo' }, h('label', { for: 'f-nota' }, 'Nota'), nota)),
    zonaProducto, zonaUso, zonaAvisos,
    h('div', { class: 'acciones' }, boton));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!P.esFecha(fecha.value)) { fecha.focus(); return; }
    if (!estado.productoId) {
      const b = form.querySelector('#f-producto');
      if (b) b.focus();
      return;
    }
    alAgregar({ fecha: fecha.value, productoId: estado.productoId, linea: estado.linea, nota: limpio(nota.value) });
  });

  pintarProducto();
  pintarUso();
  avisos();
  return form;
}

// ---------- Exportar ----------

function descargarCsv(cat, plan, alertas) {
  const filas = [['Fecha', 'Producto', 'Grupo de modo de acción', 'Controla', 'Dosis (texto de la etiqueta)', 'Estado', 'Carencia', 'Alertas', 'Nota']];
  for (const a of P.ordenadas(plan)) {
    const p = cat.productos.get(a.productoId);
    const u = a.linea;
    filas.push([
      P.fechaCorta(a.fecha), p ? p.nombre : '', p ? p.moa.join(' + ') : '', u ? nombreObjetivos(cat, u, 10) : 'Sin uso elegido',
      u ? limpio(u.dose_raw) || 'Sin dato, verificar etiqueta' : '', u ? (u.review_status === 'aprobado' ? 'Revisado' : 'Extraído automáticamente') : '',
      u ? (u.withholding_period_days != null ? `${u.withholding_period_days} días` : u.withholding_not_applicable ? 'No aplica' : 'Sin dato, verificar etiqueta') : '',
      (alertas.get(a.id) || []).filter(P.esGrave).map((x) => x.texto).join(' | '), a.nota || '',
    ]);
  }
  const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const enlace = h('a', { href: URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' })), download: `${limpio(plan.nombre).replace(/[^\w\- ]+/g, '').replace(/\s+/g, '-') || 'plan'}.csv` });
  document.body.append(enlace);
  enlace.click();
  setTimeout(() => { URL.revokeObjectURL(enlace.href); enlace.remove(); }, 1000);
}

// ---------- Vista ----------

export async function render(main, ctx) {
  const { cat, params } = ctx;
  main.append(
    h('div', { class: 'portada-seccion' },
      h('h1', null, 'Plan de aplicaciones'),
      h('p', { class: 'bajada' }, 'Tu calendario de aplicaciones por cultivo. Avisa si repites el grupo IRAC, FRAC o HRAC, si pasas el máximo o el intervalo de la etiqueta, o si no alcanzas la carencia antes de cosechar.')));
  const zona = h('div', null, cargando('Preparando tu plan…'));
  main.append(zona);

  // Llega un uso elegido desde otra vista: se prepara el formulario con ese producto y uso.
  const pre = {};
  if (params.get('producto')) {
    pre.productoId = params.get('producto');
    if (params.get('uso')) {
      try {
        const lineas = await usosPorProducto(pre.productoId);
        pre.linea = lineas.find((u) => u.id === params.get('uso')) || null;
      } catch (e) { /* sin conexión: solo el producto */ }
    }
    if (!ctx.vigente()) return;
    if (!P.planActivo()) {
      const c = pre.linea ? cat.cultivos.get(pre.linea.crop_id) : null;
      P.crearPlan({ nombre: `${c ? c.nombre : 'Plan'} ${P.temporada()}`, cultivoId: c && !c.esFrase ? c.id : null });
    }
    ctx.cambiarParams({});
  }

  let sinConexion = false;
  const pintar = async (opciones = {}) => {
    const plan = P.planActivo();
    vaciar(zona);
    if (!P.almacenamientoDisponible()) {
      zona.append(h('div', { class: 'nota nota-alerta' }, 'Este navegador no deja guardar datos (¿modo incógnito?): el plan se perderá al cerrar la página.'));
    }
    zona.append(h('div', { class: 'nota nota-info' },
      h('p', null, h('strong', null, 'Tu plan se guarda solo en este equipo. '),
        'Las alertas comparan tu plan con los datos leídos de las etiquetas, que pueden tener errores: antes de aplicar, confirma siempre en la etiqueta oficial.')));

    if (!plan) {
      zona.append(h('div', { class: 'tarjeta vacio-plan' },
        h('h2', null, 'Crea tu primer plan'),
        h('p', null, 'Un plan es un cultivo en una temporada (por ejemplo, «Cerezo huerto norte 2026-27»).'),
        buscadorOpciones({
          id: 'p-cultivo-nuevo', etiqueta: '¿Para qué cultivo?', placeholder: 'Ej: cerezo, uva, papa',
          opciones: (t) => opcionesCultivo(cat, t, (id) => {
            const c = cat.cultivos.get(id);
            P.crearPlan({ nombre: `${c.nombre} ${P.temporada()}`, cultivoId: id });
            pintar();
          }),
        }),
        h('button', { type: 'button', class: 'boton', onclick: () => { P.crearPlan({ nombre: `Plan ${P.temporada()}` }); pintar(); } }, 'Crear sin cultivo por ahora')));
      return;
    }

    // Líneas del cultivo (para elegir usos) y las de otros cultivos que estén en el plan, al día.
    let lineasCultivo = [];
    try {
      if (plan.cultivoId) lineasCultivo = await usosPorCultivo(plan.cultivoId);
      const porId = new Map(lineasCultivo.map((u) => [u.id, u]));
      const otros = [...new Set(plan.aplicaciones.filter((a) => a.linea && !porId.has(a.linea.id)).map((a) => a.productoId))];
      for (const pid of otros) for (const u of await usosPorProducto(pid)) porId.set(u.id, u);
      P.refrescarLineas(plan, porId);
      sinConexion = false;
    } catch (e) {
      sinConexion = true;
    }
    if (!ctx.vigente()) return;
    if (sinConexion) zona.append(h('div', { class: 'nota nota-alerta' }, 'Sin conexión: se muestran los datos guardados con cada aplicación. Pueden no estar al día.'));

    const alertas = P.calcularAlertas(plan, cat);
    const cultivo = plan.cultivoId ? cat.cultivos.get(plan.cultivoId) : null;

    // Barra de planes
    const todos = P.planes();
    const selPlan = h('select', { class: 'selector', 'aria-label': 'Plan', id: 'p-sel' },
      todos.map((x) => h('option', { value: x.id, selected: x.id === plan.id }, `${x.nombre} (${x.aplicaciones.length})`)));
    selPlan.addEventListener('change', () => { P.activar(selPlan.value); pintar(); });
    zona.append(h('div', { class: 'barra-plan' },
      todos.length > 1 ? h('label', { class: 'campo-linea', for: 'p-sel' }, 'Plan', selPlan) : null,
      h('button', { type: 'button', class: 'boton boton-chico', onclick: () => {
        P.crearPlan({ nombre: `Plan ${P.temporada()}` });
        pintar({ enfocarNombre: true });
      } }, icono('mas'), 'Nuevo plan')));

    // Datos del plan
    const nombre = h('input', { class: 'entrada', id: 'p-nombre', type: 'text', value: plan.nombre, maxlength: '80' });
    nombre.addEventListener('change', () => { P.editarPlan(plan.id, { nombre: limpio(nombre.value) || plan.nombre }); pintar(); });
    const cosecha = h('input', { class: 'entrada', id: 'p-cosecha', type: 'date', value: plan.cosecha || '' });
    cosecha.addEventListener('change', () => { P.editarPlan(plan.id, { cosecha: P.esFecha(cosecha.value) ? cosecha.value : null }); pintar(); });
    const campoCultivo = cultivo
      ? h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, 'Cultivo'),
        h('div', { class: 'elegido' }, h('strong', null, cultivo.nombre),
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => { P.editarPlan(plan.id, { cultivoId: null }); pintar(); } }, 'Cambiar')))
      : buscadorOpciones({ id: 'p-cultivo', etiqueta: 'Cultivo', placeholder: 'Ej: cerezo, uva, papa', opciones: (t) => opcionesCultivo(cat, t, (id) => { P.editarPlan(plan.id, { cultivoId: id }); pintar(); }) });
    zona.append(h('section', { class: 'tarjeta datos-plan', 'aria-label': 'Datos del plan' },
      h('div', { class: 'form-grid' },
        h('div', { class: 'campo' }, h('label', { for: 'p-nombre' }, 'Nombre del plan'), nombre),
        h('div', { class: 'campo' }, h('label', { for: 'p-cosecha' }, 'Fecha estimada de cosecha'), cosecha,
          h('small', { class: 'tenue' }, plan.cosecha ? 'Con ella se revisa la carencia de cada aplicación.' : 'Ponla para revisar la carencia de cada aplicación.'))),
      campoCultivo));

    // Resumen de alertas
    const graves = [...alertas.values()].flat().filter(P.esGrave);
    const peligros = graves.filter((x) => x.nivel === 'peligro').length;
    zona.append(h('div', { class: `resumen-plan ${peligros ? 'con-peligro' : graves.length ? 'con-alerta' : 'sin-alertas'}`, role: 'status' },
      h('span', { class: 'resumen-ico' }, graves.length ? icono('alerta') : icono('check')),
      h('span', null,
        h('strong', null, plan.aplicaciones.length ? plural(plan.aplicaciones.length, 'aplicación', 'aplicaciones') : 'Plan vacío'),
        plan.aplicaciones.length ? (graves.length ? ` · ${plural(graves.length, 'alerta', 'alertas')}${peligros ? ` (${peligros} ${peligros === 1 ? 'no cumple' : 'no cumplen'} la etiqueta)` : ''}` : ' · sin alertas') : '')));

    // Formulario
    const alAgregar = (nueva) => {
      const lista = P.alertasDeNueva(plan, cat, nueva);
      const a = P.agregarAplicacion(plan.id, nueva);
      mesPorPlan.set(plan.id, nueva.fecha.slice(0, 7));
      const p = cat.productos.get(nueva.productoId);
      const graves2 = lista.filter(P.esGrave);
      notificar(h('div', null,
        h('p', null, h('strong', null, `Agregado: ${p ? p.nombre : 'producto'} el ${P.fechaCorta(nueva.fecha)}.`)),
        graves2.length ? listaAlertas(graves2) : h('p', null, 'Sin alertas con lo que ya tiene el plan.')), graves2.length ? 12000 : 5000);
      pintar({ enfocar: a.id });
    };
    zona.append(formulario(cat, plan, lineasCultivo, opciones.pre || {}, alAgregar));

    // Calendario y lista
    const aps = P.ordenadas(plan);
    let mes = mesPorPlan.get(plan.id);
    if (!mes) {
      const proxima = aps.find((a) => a.fecha >= P.hoy()) || aps[aps.length - 1];
      mes = (proxima ? proxima.fecha : P.hoy()).slice(0, 7);
    }
    const zonaCal = h('div');
    const elegir = (id) => {
      const el = document.getElementById(`ap-${id}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
    };
    const pintarCal = (m) => {
      mesPorPlan.set(plan.id, m);
      vaciar(zonaCal).append(calendarioMes(cat, plan, alertas, m, pintarCal, elegir));
    };
    pintarCal(mes);
    zona.append(
      h('h2', { class: 'titulo-seccion' }, 'Calendario'),
      zonaCal,
      h('h2', { class: 'titulo-seccion' }, 'Aplicaciones', h('span', { class: 'contador' }, `(${aps.length})`)),
      listaAplicaciones(cat, plan, alertas, () => pintar()),
      h('div', { class: 'barra-plan barra-plan-pie' },
        h('button', { type: 'button', class: 'boton boton-chico', onclick: () => window.print() }, icono('imprimir'), 'Imprimir o guardar PDF'),
        h('button', { type: 'button', class: 'boton boton-chico', onclick: () => descargarCsv(cat, plan, alertas) }, icono('descargar'), 'Descargar para Excel'),
        h('button', { type: 'button', class: 'boton boton-chico boton-peligro', onclick: () => {
          if (window.confirm(`¿Borrar el plan «${plan.nombre}» y sus ${plan.aplicaciones.length} aplicaciones? No se puede deshacer.`)) {
            P.borrarPlan(plan.id);
            pintar();
          }
        } }, icono('basura'), 'Borrar este plan')));

    if (opciones.enfocarNombre) nombre.select();
    if (opciones.enfocar) elegir(opciones.enfocar);
  };

  await pintar({ pre });
}
