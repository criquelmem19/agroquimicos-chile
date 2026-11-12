// Plan de aplicaciones: calendario por cultivo y temporada, con alertas según la etiqueta
// (mismo grupo IRAC/FRAC/HRAC, máximo por temporada, intervalo y carencia antes de la cosecha).
// Se guarda en este equipo. Parámetros: producto=<id>&uso=<id> (llega con el uso elegido desde
// «¿Qué aplico?» o la ficha), abrir=<clave> (link personal con planes guardados en la base).
// 02-11-2026 (pedido de Cristóbal: «una metodología más fácil, una línea de tiempo, que aparezca rápido qué controla y
// qué son, qué cosas no repetir»): línea de tiempo con las carencias, «Qué no repetir» y formulario que parte por la
// plaga (muestra primero los productos que no repiten el código de la última aplicación).
// 12-11-2026 (Cristóbal: «algo súper simple que te vaya preguntando cosas… que me vaya mostrando a la derecha al tiro
// contra qué estoy aplicando, cuántas veces y con qué tipo de modo de acción»): una frase que explica qué es, un
// asistente de tres preguntas (contra qué, con qué producto, cuándo) que ofrece cualquier producto y no solo los del
// cultivo, el resumen al lado y los planes guardados en la cuenta (planNube.js).
import { usosPorCultivo, usosPorProducto, planGuardado, familiaMoa, productosPorObjetivo } from '../db.js';
import { filtrar, palabras, normalizar, raiz } from '../buscador.js';
import * as P from '../plan.js';
import { estadoNube, alCambiarNube } from '../planNube.js';
import { usuario, rutaCuenta } from '../cuenta.js';
import {
  h, icono, ruta, plural, recortar, limpio, vaciar, cargando, retrasar, notificar,
  dosis, carencia, linkPdf, urlDeLinea, chipsMoa, ingredientesTexto,
} from '../ui.js';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const NIVEL_CLASE = { peligro: 'nota-peligro', alerta: 'nota-alerta', info: 'nota-info', ok: 'nota-ok' };
const NIVEL_TEXTO = { peligro: 'No cumple la etiqueta', alerta: 'Revisar', info: 'Para saber', ok: 'Cumple' };
const TIPOS = ['Insecticida', 'Acaricida', 'Fungicida', 'Bactericida', 'Herbicida', 'Fertilizante', 'Bioestimulante', 'Coadyuvante', 'Otro'];

const mesPorPlan = new Map();

// ---------- Piezas ----------

function sistema(moa) {
  const s = moa[0] ? moa[0].split(' ')[0].toLowerCase() : 'otro';
  return ['frac', 'irac', 'hrac'].includes(s) ? s : 'otro';
}

function nombreObjetivos(cat, u, max = 3) {
  const nombres = (u.objetivos || []).map((t) => cat.objetivos.get(t)).filter(Boolean).map((o) => recortar(o.nombre, 50));
  if (!nombres.length) return 'Sin objetivo en los datos';
  return nombres.slice(0, max).join(' · ') + (nombres.length > max ? ` y ${nombres.length - max} más` : '');
}

// Regla 1 del sitio: la dosis de la etiqueta siempre va con su estado.
function textoDosis(u) {
  const estado = u.review_status === 'aprobado' ? 'revisada' : 'extraída automáticamente';
  return `${recortar(u.dose_raw || 'dosis sin dato, verificar etiqueta', 60)} (${estado})`;
}

function textoCarencia(u) {
  if (u.withholding_period_days != null) return `carencia ${plural(u.withholding_period_days, 'día', 'días')}`;
  if (u.withholding_not_applicable) return 'carencia: no aplica';
  return 'carencia: ver etiqueta';
}

function nombreCultivoPlan(cat, plan) {
  const nombres = P.cultivosDelPlan(plan).map((id) => cat.cultivos.get(id)).filter(Boolean).map((c) => c.nombre);
  if (!nombres.length) return '';
  const base = nombres.length > 2 ? `${nombres[0]} y ${nombres.length - 1} más` : nombres.join(' y ');
  return plan.destino === 'semillero' ? `${base} semillero` : base;
}

function listaAlertas(alertas) {
  if (!alertas.length) return null;
  return h('ul', { class: 'alertas-plan' }, alertas.map((a) => h('li', { class: `alerta-plan ${NIVEL_CLASE[a.nivel]}` },
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
    lista.hidden = !ops.length && !limpio(entrada.value);
    if (!ops.length) {
      lista.append(h('li', null, h('div', { class: 'opcion tenue' }, 'Sin coincidencias')));
      return;
    }
    for (const o of ops) {
      lista.append(h('li', null, h('button', { type: 'button', class: `opcion ${o.clase || ''}`, onclick: o.accion },
        h('span', null, o.etiqueta), o.detalle ? h('small', null, o.detalle) : null)));
    }
  };
  entrada.addEventListener('input', retrasar(pintar, 100));
  pintar();
  const campo = h('div', { class: 'campo' }, h('label', { for: id }, etiqueta), entrada, lista);
  campo.repintar = pintar;
  return campo;
}

function opcionesCultivo(cat, texto, alElegir) {
  const lista = [...cat.cultivos.values()].filter((c) => c.nLineas > 0 && !c.esFrase);
  const t = limpio(texto);
  const elegidos = t ? filtrar(lista, t, (c) => c.palabras, (c) => c.nLineas, 30) : lista.sort((a, b) => b.nLineas - a.nLineas).slice(0, 12);
  return elegidos.map((c) => ({ etiqueta: recortar(c.nombre, 60), detalle: plural(c.nProductos, 'producto', 'productos'), accion: () => alElegir(c.id) }));
}

// Líneas de la etiqueta de un producto para los cultivos del plan.
function lineasDelProducto(usosCultivo, productoId) {
  return usosCultivo.get(productoId) || [];
}

function etiquetaUso(cat, plan, u) {
  const varios = P.cultivosDelPlan(plan).length > 1;
  const c = cat.cultivos.get(u.crop_id);
  return `${varios && c ? `${c.nombre}: ` : ''}${nombreObjetivos(cat, u, 3)}`;
}

// ---------- Calendario del mes ----------

function calendarioMes(cat, plan, alertas, mes, alCambiarMes, alElegir) {
  const [y, m] = mes.split('-').map(Number);
  const primero = new Date(y, m - 1, 1);
  const inicio = new Date(primero);
  inicio.setDate(1 - ((primero.getDay() + 6) % 7)); // lunes de la primera semana
  const porFecha = new Map();
  for (const a of P.ordenadas(plan)) {
    const f = P.fechaDe(plan, a);
    if (!f) continue;
    if (!porFecha.has(f)) porFecha.set(f, []);
    porFecha.get(f).push(a);
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
      const clases = ['dia', delMes ? '' : 'dia-fuera', iso === hoy ? 'dia-hoy' : '', iso === plan.cosecha ? 'dia-cosecha' : '', iso === plan.trasplante ? 'dia-trasplante' : ''].filter(Boolean).join(' ');
      const visibles = aps.slice(0, 3);
      fila.push(h('td', { class: clases },
        h('span', { class: 'dia-num' }, String(d.getDate())),
        iso === plan.trasplante ? h('span', { class: 'dia-marca' }, 'Trasplante') : null,
        iso === plan.cosecha ? h('span', { class: 'dia-marca' }, 'Cosecha') : null,
        visibles.map((a) => {
          const grave = (alertas.get(a.id) || []).some(P.esGrave);
          const moa = P.gruposDe(cat, a);
          const nombre = P.nombreDe(cat, a);
          return h('button', {
            type: 'button', class: `cal-ap cal-${sistema(moa)}${grave ? ' cal-grave' : ''}`,
            title: `${nombre}${moa.length ? ` · ${moa.join(', ')}` : ''}${grave ? ' · con alertas' : ''}`,
            onclick: () => alElegir(a.id),
          }, h('span', { class: 'cal-ap-nombre' }, recortar(nombre, 20)), grave ? h('span', { class: 'cal-ap-alerta', 'aria-label': 'con alertas' }, '!') : null);
        }),
        aps.length > visibles.length ? h('button', { type: 'button', class: 'cal-mas', onclick: () => alElegir(aps[3].id) }, `+${aps.length - visibles.length}`) : null));
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

// ---------- Línea de tiempo ----------
// Del trasplante (o la primera aplicación) a la cosecha. Cada día de aplicación es una marca con un cuadrito por producto
// (color de su comité); debajo, la carencia de cada producto, en rojo si pasa la fecha de cosecha.

const MAX_CARRILES = 6;

function lineaDeTiempo(cat, plan, alertas, alElegir) {
  const aps = P.ordenadas(plan).filter((a) => P.fechaDe(plan, a));
  if (!aps.length) return null;
  const finCarencia = (a) => (a.linea && a.linea.withholding_period_days != null
    ? P.sumarDias(P.fechaDe(plan, a), a.linea.withholding_period_days) : null);
  const extremos = [plan.trasplante, plan.cosecha, ...aps.map((a) => P.fechaDe(plan, a)), ...aps.map(finCarencia)].filter(Boolean).sort();
  const inicio = P.sumarDias(extremos[0], -3);
  const termino = P.sumarDias(extremos[extremos.length - 1], 3);
  const total = Math.max(1, P.diasEntre(inicio, termino));
  const pos = (iso) => (P.diasEntre(inicio, iso) / total) * 100;

  const meses = [];
  const d = P.aFecha(inicio);
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  while (P.isoLocal(d) <= termino) {
    meses.push(h('span', { class: 'lt-mes', style: `left:${pos(P.isoLocal(d))}%` }, `${MESES[d.getMonth()].slice(0, 3)} ${String(d.getFullYear()).slice(2)}`));
    d.setMonth(d.getMonth() + 1);
  }

  const porDia = new Map();
  for (const a of aps) {
    const f = P.fechaDe(plan, a);
    if (!porDia.has(f)) porDia.set(f, []);
    porDia.get(f).push(a);
  }
  const marcas = [...porDia].map(([f, lista]) => h('button', {
    type: 'button', class: 'lt-dia', style: `left:${pos(f)}%`,
    title: `${P.fechaCorta(f)}: ${lista.map((a) => `${P.nombreDe(cat, a)}${P.gruposDe(cat, a).length ? ` (${P.gruposDe(cat, a).join(', ')})` : ''}`).join(' + ')}`,
    'aria-label': `${P.fechaCorta(f)}: ${plural(lista.length, 'producto', 'productos')}. Ver en la lista`,
    onclick: () => alElegir(lista[0].id),
  }, lista.slice(0, 4).map((a) => h('span', {
    class: `lt-producto lt-${sistema(P.gruposDe(cat, a))}${(alertas.get(a.id) || []).some(P.esGrave) ? ' lt-grave' : ''}`,
  })), lista.length > 4 ? h('small', null, `+${lista.length - 4}`) : null));

  // Carencias en carriles, para que no se tapen entre ellas.
  const carriles = [];
  const barras = [];
  for (const a of aps) {
    const f = P.fechaDe(plan, a);
    const hasta = finCarencia(a);
    if (!hasta || hasta === f) continue;
    let c = carriles.findIndex((ocupado) => ocupado < f);
    if (c === -1) {
      if (carriles.length >= MAX_CARRILES) continue;
      c = carriles.length;
      carriles.push(hasta);
    } else carriles[c] = hasta;
    const pasa = plan.cosecha && hasta > plan.cosecha;
    barras.push(h('button', {
      type: 'button', class: `lt-carencia${pasa ? ' lt-pasa' : ''}`,
      style: `left:${pos(f)}%;width:${pos(hasta) - pos(f)}%;top:${c * 12}px`,
      title: `${P.nombreDe(cat, a)}: carencia ${plural(a.linea.withholding_period_days, 'día', 'días')}, hasta el ${P.fechaCorta(hasta)}${pasa ? '. Pasa la fecha de cosecha' : ''}`,
      'aria-label': `Carencia de ${P.nombreDe(cat, a)} hasta el ${P.fechaCorta(hasta)}${pasa ? ', pasa la cosecha' : ''}`,
      onclick: () => alElegir(a.id),
    }));
  }

  const hito = (iso, texto, clase) => (iso && iso >= inicio && iso <= termino
    ? h('span', { class: `lt-hito ${clase}${pos(iso) > 85 ? ' lt-hito-der' : ''}`, style: `left:${pos(iso)}%` }, h('span', null, texto)) : null);
  const muestra = (clase, texto) => h('span', null, h('i', { class: clase }), texto);
  return h('section', { class: 'linea-tiempo', 'aria-label': 'Línea de tiempo del plan' },
    h('div', { class: 'lt-scroll' }, h('div', { class: 'lt-lienzo', style: `min-width:${Math.min(Math.max(total * 5, 320), 2400)}px` },
      h('div', { class: 'lt-meses' }, meses),
      h('div', { class: 'lt-pista' },
        hito(plan.trasplante, 'Trasplante', 'lt-trasplante'),
        hito(P.hoy(), 'Hoy', 'lt-hoy'),
        hito(plan.cosecha, plan.destino === 'semillero' ? 'Cosecha de semilla' : 'Cosecha', 'lt-cosecha'),
        marcas),
      barras.length ? h('div', { class: 'lt-carencias', style: `height:${carriles.length * 12}px` }, barras) : null)),
    h('div', { class: 'lt-leyenda' },
      muestra('lt-producto lt-frac', 'FRAC'), muestra('lt-producto lt-irac', 'IRAC'), muestra('lt-producto lt-hrac', 'HRAC'),
      muestra('lt-producto lt-otro', 'Sin código'),
      barras.length ? [muestra('lt-carencia-muestra', 'Carencia'), muestra('lt-carencia-muestra lt-pasa', 'Pasa la cosecha')] : null,
      plan.cosecha ? null : h('span', { class: 'tenue' }, 'Pon la fecha de cosecha para ver si alcanzan las carencias')));
}

// ---------- Resumen al lado ----------
// 12-11-2026 (Cristóbal: «que me vaya mostrando a la derecha al tiro contra qué estoy aplicando, cuántas veces y con qué
// tipo de modo de acción»). Se dibuja de nuevo con cada respuesta del asistente: lo que se está por agregar va como «+1».

function ultimaJornada(plan) {
  const aps = P.ordenadas(plan);
  if (!aps.length) return [];
  const clave = P.claveDia(plan, aps[aps.length - 1]);
  return aps.filter((a) => P.claveDia(plan, a) === clave);
}

const familiasDe = (cat, a) => [...new Set(P.gruposDe(cat, a).map(familiaMoa))];
const mayuscula = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// Contra qué va una aplicación: lo que escribió la persona o, si no, los objetivos del uso de la etiqueta.
function objetivosDeAp(cat, a) {
  const texto = limpio(a.objetivo);
  if (texto) return texto.split(/[,;·/+]|\s+y\s+/i).map(limpio).filter(Boolean).slice(0, 6);
  const u = a.linea;
  if (u && (u.objetivos || []).length) {
    return u.objetivos.map((t) => cat.objetivos.get(t)).filter(Boolean).map((o) => o.nombre).slice(0, 4);
  }
  return [];
}

function resumenLado(cat, plan, alertas, borrador) {
  const aps = P.ordenadas(plan);
  const contra = new Map(); // nombre normalizado → { nombre, n, mas, codigos }
  const codigos = new Map(); // familia → { n, mas, ultima }
  let sinObjetivo = 0;
  const sumar = (a, nueva) => {
    const fams = familiasDe(cat, a);
    for (const k of fams) {
      const x = codigos.get(k) || { n: 0, mas: 0, ultima: null };
      if (nueva) x.mas += 1; else { x.n += 1; x.ultima = a; }
      codigos.set(k, x);
    }
    const objs = objetivosDeAp(cat, a);
    if (!objs.length && !nueva) sinObjetivo += 1;
    for (const nombre of objs) {
      const clave = normalizar(nombre);
      if (!clave) continue;
      const x = contra.get(clave) || { nombre: mayuscula(recortar(nombre, 40)), n: 0, mas: 0, codigos: new Set() };
      if (nueva) x.mas += 1; else x.n += 1;
      for (const k of fams) x.codigos.add(k);
      contra.set(clave, x);
    }
  };
  for (const a of aps) sumar(a, false);
  if (borrador) sumar(borrador, true);

  const evitar = new Set(ultimaJornada(plan).flatMap((a) => familiasDe(cat, a)));
  const graves = [...alertas.values()].flat().filter(P.esGrave);
  const peligros = graves.filter((x) => x.nivel === 'peligro').length;
  const productos = new Set(aps.map((a) => a.productoId || `x:${normalizar(P.nombreDe(cat, a))}`)).size;
  const veces = (x) => h('span', { class: 'pl-veces' },
    x.n ? h('strong', null, `${x.n} ${x.n === 1 ? 'vez' : 'veces'}`) : null,
    x.mas ? h('span', { class: 'pl-mas' }, x.n ? `+${x.mas}` : 'nuevo') : null);
  const orden = (a, b) => (b[1].n + b[1].mas) - (a[1].n + a[1].mas);

  return h('aside', { class: 'tarjeta plan-lado', 'aria-label': 'Resumen del plan', 'aria-live': 'polite' },
    h('h2', null, 'Tu plan hasta ahora'),
    aps.length
      ? h('p', { class: 'pl-totales' }, `${plural(aps.length, 'aplicación', 'aplicaciones')} · ${plural(productos, 'producto', 'productos')}`)
      : (borrador ? null : h('p', { class: 'chico tenue' }, 'Aquí vas a ver contra qué aplicas, cuántas veces y con qué modo de acción')),
    aps.length ? h('p', { class: `pl-estado ${peligros ? 'pl-peligro' : graves.length ? 'pl-alerta' : 'pl-ok'}` },
      icono(graves.length ? 'alerta' : 'check'),
      graves.length
        ? `${plural(graves.length, 'alerta', 'alertas')}${peligros ? ` (${peligros} no ${peligros === 1 ? 'cumple' : 'cumplen'} la etiqueta)` : ''}`
        : 'Sin alertas') : null,
    contra.size ? h('section', null,
      h('h3', null, 'Contra qué'),
      h('ul', { class: 'pl-lista' }, [...contra].sort(orden).map(([, x]) => h('li', { class: x.mas ? 'pl-nuevo' : null },
        h('span', { class: 'pl-nombre' }, x.nombre), veces(x),
        x.codigos.size ? h('span', { class: 'pl-codigos' }, chipsMoa([...x.codigos])) : null)))) : null,
    codigos.size ? h('section', null,
      h('h3', null, 'Modos de acción'),
      h('ul', { class: 'pl-lista' }, [...codigos].sort(orden).map(([k, x]) => h('li', { class: x.mas ? 'pl-nuevo' : null },
        chipsMoa([k]), veces(x),
        evitar.has(k) ? h('span', { class: 'pl-aviso' }, x.mas ? 'Va en la última aplicación: lo estás repitiendo' : 'Va en la última aplicación: no lo repitas en la próxima')
          : (x.ultima ? h('span', { class: 'chico tenue' }, `última: ${P.cuando(plan, x.ultima)}`) : null))))) : null,
    sinObjetivo ? h('p', { class: 'chico tenue' }, `${plural(sinObjetivo, 'aplicación', 'aplicaciones')} sin indicar contra qué`) : null,
    codigos.size ? h('a', { class: 'enlace-icono chico', href: '#/' }, '¿Por qué no repetir?', icono('flecha')) : null);
}

// ---------- Lista por día (cada día es una mezcla) ----------

function filaProducto(cat, plan, a, alertas, usosCultivo, alCambiar) {
  const p = a.productoId ? cat.productos.get(a.productoId) : null;
  const u = a.linea;
  const url = u ? urlDeLinea(cat, u) : (p && p.etiqueta ? p.etiqueta.url : null);
  const moa = P.gruposDe(cat, a);
  const editor = h('div', { class: 'editor-ap', hidden: true });

  const abrirEditor = () => {
    if (!editor.hidden) { editor.hidden = true; return; }
    const fecha = h('input', { class: 'entrada', type: 'date', value: P.fechaDe(plan, a) || '' });
    const dia = h('input', { class: 'entrada', type: 'number', inputmode: 'numeric', step: '1', value: P.ddtDe(plan, a) ?? '' });
    fecha.addEventListener('change', () => { if (plan.trasplante && P.esFecha(fecha.value)) dia.value = P.diasEntre(plan.trasplante, fecha.value); });
    dia.addEventListener('input', () => { if (plan.trasplante && dia.value !== '') fecha.value = P.sumarDias(plan.trasplante, Number(dia.value)); });
    const lineas = a.productoId ? lineasDelProducto(usosCultivo, a.productoId) : [];
    const sel = h('select', { class: 'selector' },
      h('option', { value: '' }, 'Sin elegir uso'),
      lineas.map((x) => h('option', { value: x.id, selected: u && u.id === x.id },
        `${recortar(etiquetaUso(cat, plan, x), 70)} — ${textoDosis(x)} · ${textoCarencia(x)}`)));
    const dosisPlan = h('input', { class: 'entrada', type: 'text', value: a.dosisPlan || '', maxlength: '80' });
    const objetivo = h('input', { class: 'entrada', type: 'text', value: a.objetivo || '', maxlength: '160' });
    const nota = h('input', { class: 'entrada', type: 'text', value: a.nota || '', maxlength: '200' });
    vaciar(editor).append(
      h('div', { class: 'editor-campos' },
        h('label', { class: 'campo' }, 'Fecha', fecha),
        h('label', { class: 'campo' }, 'Día desde el trasplante', dia),
        lineas.length ? h('label', { class: 'campo campo-ancho' }, 'Uso de la etiqueta', sel) : null,
        h('label', { class: 'campo' }, 'Dosis de tu plan', dosisPlan),
        h('label', { class: 'campo' }, 'Objetivo', objetivo),
        h('label', { class: 'campo campo-ancho' }, 'Nota', nota)),
      h('div', { class: 'acciones' },
        h('button', { type: 'button', class: 'boton boton-primario', onclick: () => {
          const cambios = { dosisPlan: limpio(dosisPlan.value), objetivo: limpio(objetivo.value), nota: limpio(nota.value) };
          if (dia.value !== '') Object.assign(cambios, { ddt: Number(dia.value), fecha: plan.trasplante ? null : (P.esFecha(fecha.value) ? fecha.value : null) });
          else if (P.esFecha(fecha.value)) Object.assign(cambios, { fecha: fecha.value, ddt: null });
          else { fecha.focus(); return; }
          if (lineas.length) cambios.linea = P.lineaResumida(sel.value ? lineas.find((x) => x.id === sel.value) : null);
          P.editarAplicacion(plan.id, a.id, cambios);
          alCambiar();
        } }, 'Guardar cambios'),
        h('button', { type: 'button', class: 'boton', onclick: () => { editor.hidden = true; } }, 'Cancelar')));
    editor.hidden = false;
  };

  const tipo = P.tipoDe(cat, a);
  const datos = [];
  if (a.dosisPlan) datos.push(h('div', null, h('dt', null, 'Dosis de tu plan'), h('dd', null, a.dosisPlan)));
  if (u) {
    datos.push(h('div', null, h('dt', null, 'Dosis de la etiqueta'), h('dd', null, dosis(u))));
    datos.push(h('div', null, h('dt', null, 'Carencia'), h('dd', null, carencia(u, url))));
  }
  if (a.objetivo) datos.push(h('div', null, h('dt', null, 'Objetivo'), h('dd', null, a.objetivo)));
  if (a.alternativa) datos.push(h('div', null, h('dt', null, 'Alternativa Syngenta'), h('dd', null, a.alternativa)));

  return h('article', { class: 'ap', id: `ap-${a.id}`, tabindex: '-1' },
    h('div', { class: 'ap-titulo' },
      p ? h('a', { href: ruta(`producto/${p.id}`) }, p.nombre) : h('strong', null, P.nombreDe(cat, a)),
      moa.length ? chipsMoa(moa) : null,
      tipo ? h('span', { class: 'etiqueta etq-neutra' }, tipo) : null,
      p ? null : h('span', { class: 'etiqueta etq-externo' }, 'Fuera del catálogo')),
    p ? h('p', { class: 'chico tenue' }, ingredientesTexto(p))
      : (a.externo && a.externo.ingrediente ? h('p', { class: 'chico tenue' }, a.externo.ingrediente) : null),
    u ? h('p', { class: 'ap-uso' }, h('strong', null, 'Controla: '), etiquetaUso(cat, plan, u)) : null,
    datos.length ? h('dl', { class: 'ap-datos' }, datos) : null,
    listaAlertas(alertas),
    a.nota ? h('p', { class: 'ap-nota' }, h('strong', null, 'Nota: '), a.nota) : null,
    h('div', { class: 'ap-pie' },
      p || u ? linkPdf(url, u ? u.source_page : null) : h('span'),
      h('span', { class: 'ap-acciones' },
        h('button', { type: 'button', class: 'boton boton-chico', onclick: abrirEditor }, icono('lapiz'), a.productoId && !u ? 'Elegir uso' : 'Editar'),
        h('button', { type: 'button', class: 'boton boton-chico', onclick: () => {
          if (window.confirm(`¿Quitar ${P.nombreDe(cat, a)} (${P.cuando(plan, a)}) del plan?`)) {
            P.quitarAplicacion(plan.id, a.id);
            alCambiar();
          }
        } }, icono('basura'), 'Quitar'))),
    editor);
}

function listaPorDia(cat, plan, alertas, usosCultivo, alCambiar) {
  const aps = P.ordenadas(plan);
  if (!aps.length) {
    return h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'Todavía no hay aplicaciones en este plan.')));
  }
  const dias = [];
  for (const a of aps) {
    const clave = P.claveDia(plan, a);
    if (!dias.length || dias[dias.length - 1].clave !== clave) dias.push({ clave, aps: [] });
    dias[dias.length - 1].aps.push(a);
  }
  const bloques = [];
  let mesActual = null;
  for (const dia of dias) {
    const a0 = dia.aps[0];
    const f = P.fechaDe(plan, a0);
    const ddt = P.ddtDe(plan, a0);
    const mes = f ? f.slice(0, 7) : 'sin';
    if (mes !== mesActual) {
      mesActual = mes;
      if (f) {
        const [y, m] = mes.split('-').map(Number);
        bloques.push(h('h3', { class: 'lista-mes' }, `${MESES[m - 1].charAt(0).toUpperCase()}${MESES[m - 1].slice(1)} ${y}`));
      } else if (plan.trasplante == null) {
        bloques.push(h('h3', { class: 'lista-mes' }, 'Por días desde el trasplante'));
      }
    }
    const etapas = [...new Set(dia.aps.map((x) => x.etapa).filter(Boolean))];
    const equipos = [...new Set(dia.aps.map((x) => x.equipo).filter(Boolean))];
    const numeros = [...new Set(dia.aps.map((x) => x.numero).filter((n) => n != null))];
    const fd = f ? P.aFecha(f) : null;
    bloques.push(h('section', { class: 'jornada', 'aria-label': f ? P.fechaCorta(f) : `Día ${ddt}` },
      h('header', { class: 'jornada-cabeza' },
        h('div', { class: 'ap-fecha', 'aria-hidden': 'true' },
          fd ? [h('span', { class: 'ap-dia' }, String(fd.getDate())), h('span', { class: 'ap-mes' }, MESES[fd.getMonth()].slice(0, 3)), h('span', { class: 'ap-sem' }, DIAS[(fd.getDay() + 6) % 7])]
            : [h('span', { class: 'ap-mes' }, 'día'), h('span', { class: 'ap-dia' }, ddt != null ? String(ddt) : '–')]),
        h('div', { class: 'jornada-datos' },
          h('strong', null, [f ? P.fechaCorta(f) : null, ddt != null ? `día ${ddt} desde el trasplante` : null].filter(Boolean).join(' · ') || 'Sin fecha'),
          h('span', { class: 'chico tenue' }, [
            numeros.length ? `Aplicación n.° ${numeros.join(', ')}` : null,
            etapas.join(' · ') || null,
            equipos.join(' · ') || null,
            plural(dia.aps.length, 'producto', 'productos'),
          ].filter(Boolean).join(' · ')))),
      dia.aps.map((a) => filaProducto(cat, plan, a, alertas.get(a.id) || [], usosCultivo, alCambiar))));
  }
  return h('div', { class: 'lista-aps' }, bloques);
}

// ---------- Asistente para agregar (una pregunta a la vez) ----------
// 12-11-2026 (Cristóbal: «algo súper simple que te vaya preguntando cosas, que no sea tipo si yo pongo canola solo
// producto de canola, porque hay veces que uno puede aplicar más cosas»). Tres preguntas: contra qué, con qué producto
// y cuándo. Los productos con uso en el cultivo del plan van primero, pero se puede elegir cualquiera del catálogo o
// uno de fuera. Cada respuesta se avisa con alBorrador para que el resumen del lado se actualice.

const fechaPorPlan = new Map(); // la última fecha usada en cada plan: el producto siguiente parte con la misma (mezcla)

function asistente(cat, plan, usosCultivo, pre, alAgregar, alBorrador) {
  const cultivo = nombreCultivoPlan(cat, plan);
  const estado = {
    paso: pre.productoId ? 3 : 1,
    objetivo: '',
    controlan: null, // productos cuyas etiquetas nombran el objetivo (en cualquier cultivo); null mientras llega
    productoId: pre.productoId || null,
    externo: null,
    linea: pre.linea || null,
    otras: null, // líneas de la etiqueta en otros cultivos, si el producto no tiene uso en el cultivo del plan
  };
  // Códigos de la última aplicación: los productos que los repiten van al final y con aviso.
  const evitar = new Set(ultimaJornada(plan).flatMap((a) => familiasDe(cat, a)));
  const repite = (p) => p.familias.filter((k) => evitar.has(k));

  // Plagas, enfermedades y malezas de las etiquetas para el cultivo del plan (por nombre) y sus productos.
  const enCultivo = new Map();
  for (const [pid, lineas] of usosCultivo) {
    for (const u of lineas) {
      for (const t of u.objetivos || []) {
        const o = cat.objetivos.get(t);
        const k = o ? normalizar(o.nombre) : '';
        if (!k) continue;
        if (!enCultivo.has(k)) enCultivo.set(k, { nombre: o.nombre, productos: new Set() });
        enCultivo.get(k).productos.add(pid);
      }
    }
  }
  // Todas las del catálogo, juntando las variantes del mismo nombre.
  let nombres = null;
  const listaNombres = () => {
    if (!nombres) {
      const m = new Map();
      for (const o of cat.objetivos.values()) {
        const k = normalizar(o.nombre);
        if (!k) continue;
        const x = m.get(k) || { clave: k, nombre: o.nombre, palabras: o.palabras, n: 0 };
        x.n += o.nProductos || 0;
        m.set(k, x);
      }
      nombres = [...m.values()];
    }
    return nombres;
  };
  const claves = new Map();
  const palabrasDe = (p) => {
    if (!claves.has(p.id)) claves.set(p.id, p.palabras.concat(...p.ings.map((x) => palabras(x.ing.nombre)), palabras(p.moa.join(' '))));
    return claves.get(p.id);
  };
  const visibles = [...cat.productos.values()].filter((p) => !p.oculto);

  const conDia = Boolean(plan.trasplante) || plan.aplicaciones.some((a) => a.ddt != null);
  const previa = fechaPorPlan.get(plan.id) || {};
  const fecha = h('input', { class: 'entrada', type: 'date', id: 'f-fecha', value: previa.fecha || (plan.trasplante && previa.dia != null ? P.sumarDias(plan.trasplante, previa.dia) : P.hoy()) });
  const dia = h('input', { class: 'entrada', type: 'number', id: 'f-dia', inputmode: 'numeric', step: '1', placeholder: 'Ej: 15', value: previa.dia ?? '' });
  const dosisPlan = h('input', { class: 'entrada', type: 'text', id: 'f-dosis', placeholder: 'Ej: 20 g / 100 L', maxlength: '80' });
  const objetivoTexto = h('input', { class: 'entrada', type: 'text', id: 'f-objetivo', placeholder: 'Ej: pulgón, trips', maxlength: '160' });
  const nota = h('input', { class: 'entrada', type: 'text', id: 'f-nota', placeholder: 'Opcional', maxlength: '200' });
  const zonaUso = h('div');
  const zonaAvisos = h('div', { 'aria-live': 'polite' });
  const respuestas = h('ul', { class: 'as-respuestas' });
  const zona = h('div', { class: 'as-paso' });
  const cuenta = h('span', { class: 'as-cuenta' });
  let listaProductos = null; // el campo de productos, para volver a dibujar su lista cuando llega «controlan»

  const cuandoNueva = () => {
    if (conDia && dia.value !== '') return { ddt: Number(dia.value), fecha: plan.trasplante ? null : (P.esFecha(fecha.value) ? fecha.value : null) };
    if (P.esFecha(fecha.value)) return { fecha: fecha.value, ddt: null };
    return null;
  };
  const nueva = () => ({
    ...(cuandoNueva() || { fecha: null, ddt: null }),
    productoId: estado.productoId, externo: estado.externo, linea: estado.linea,
    dosisPlan: limpio(dosisPlan.value), objetivo: limpio(objetivoTexto.value), nota: limpio(nota.value),
  });
  const hayProducto = () => Boolean(estado.productoId || (estado.externo && estado.externo.nombre));
  const borrador = () => alBorrador(hayProducto() ? nueva() : (estado.objetivo ? { objetivo: estado.objetivo, externo: { tipo: 'Fertilizante' } } : null));

  function avisos() {
    vaciar(zonaAvisos);
    borrador();
    const c = cuandoNueva();
    if (estado.paso !== 3 || !c || !hayProducto()) return;
    const lista = P.alertasDeNueva(plan, cat, nueva(), { usosCultivo });
    const graves = lista.filter(P.esGrave);
    if (graves.length) {
      zonaAvisos.append(h('div', { class: 'previa previa-alerta' },
        h('p', null, h('strong', null, `Ojo: ${plural(graves.length, 'alerta', 'alertas')} si lo agregas`)), listaAlertas(graves)));
    }
  }
  fecha.addEventListener('change', () => { if (plan.trasplante && P.esFecha(fecha.value)) dia.value = P.diasEntre(plan.trasplante, fecha.value); avisos(); });
  dia.addEventListener('input', () => { if (plan.trasplante && dia.value !== '') fecha.value = P.sumarDias(plan.trasplante, Number(dia.value)); avisos(); });
  objetivoTexto.addEventListener('input', retrasar(borrador, 300));

  // ----- Pregunta 1: contra qué -----
  const elegirObjetivo = (nombre) => {
    estado.objetivo = nombre;
    estado.controlan = null;
    objetivoTexto.value = recortar(nombre, 160);
    if (nombre) {
      const palabrasNombre = normalizar(nombre).split(' ').filter(Boolean);
      const texto = (palabrasNombre.length === 1 ? raiz(palabrasNombre[0]) : palabrasNombre.join(' ')).slice(0, 60);
      if (texto.length >= 3) {
        productosPorObjetivo(texto).then((s) => {
          if (estado.objetivo !== nombre) return;
          estado.controlan = s;
          if (estado.paso === 2 && listaProductos && listaProductos.isConnected) listaProductos.repintar();
        });
      } else estado.controlan = new Set();
    }
    if (hayProducto() && !estado.linea && estado.productoId) elegirLinea();
    estado.paso = hayProducto() ? 3 : 2;
    pintar(true);
  };

  const pasoObjetivo = () => {
    const delCultivo = [...enCultivo.entries()].map(([clave, x]) => ({ clave, nombre: x.nombre, n: x.productos.size }));
    const opcion = (x, enEste) => ({
      etiqueta: recortar(x.nombre, 70),
      detalle: enEste ? `${plural(enEste.productos.size, 'producto', 'productos')} en ${cultivo}` : plural(x.n, 'producto', 'productos'),
      accion: () => elegirObjetivo(x.nombre),
    });
    return h('div', null,
      buscadorOpciones({
        id: 'as-objetivo', etiqueta: '¿Contra qué vas a aplicar?', placeholder: 'Plaga, enfermedad o maleza. Ej: pulgón, oídio, ballica',
        opciones: (texto) => {
          const t = limpio(texto);
          if (!t) return delCultivo.sort((a, b) => b.n - a.n).slice(0, 5).map((x) => opcion(x, enCultivo.get(x.clave)));
          const ops = filtrar(listaNombres(), t, (x) => x.palabras, (x) => (enCultivo.has(x.clave) ? 100000 : 0) + x.n, 12)
            .map((x) => opcion(x, enCultivo.get(x.clave)));
          ops.push({ etiqueta: `Usar «${recortar(t, 60)}» tal como lo escribí`, clase: 'opcion-todos', accion: () => elegirObjetivo(t) });
          return ops;
        },
      }),
      h('button', { type: 'button', class: 'boton-texto', onclick: () => elegirObjetivo('') }, 'No es contra una plaga (fertilizante u otro)'));
  };

  // ----- Pregunta 2: con qué producto -----
  // El uso de la etiqueta que calza con lo que se quiere controlar; si el producto tiene uno solo, ese.
  function elegirLinea() {
    const lineas = lineasDelProducto(usosCultivo, estado.productoId);
    const clave = normalizar(estado.objetivo);
    estado.linea = (clave && lineas.find((u) => (u.objetivos || []).some((t) => {
      const o = cat.objetivos.get(t);
      return o && normalizar(o.nombre).includes(clave);
    }))) || (lineas.length === 1 ? lineas[0] : null);
  }

  const elegirProducto = (p) => {
    estado.productoId = p.id;
    estado.externo = null;
    estado.otras = null;
    elegirLinea();
    estado.paso = 3;
    pintar(true);
    // Sin uso en el cultivo del plan: se ofrecen los usos de la etiqueta en otros cultivos (para la carencia).
    if (!lineasDelProducto(usosCultivo, p.id).length) {
      usosPorProducto(p.id).then((ls) => {
        if (estado.productoId !== p.id) return;
        estado.otras = ls;
        if (estado.paso === 3) pintarUso();
      }, () => {});
    }
  };

  const pasoProducto = () => {
    const clave = normalizar(estado.objetivo);
    // Productos cuya etiqueta lo nombra para el cultivo del plan.
    const enEste = new Set();
    if (clave) for (const [k, x] of enCultivo) if (k.includes(clave)) for (const id of x.productos) enEste.add(id);
    const rango = (p) => (enEste.has(p.id) ? 0 : estado.controlan && estado.controlan.has(p.id) ? 1 : usosCultivo.has(p.id) ? 2 : 3);
    const orden = (a, b) => rango(a) - rango(b) || (repite(a).length > 0) - (repite(b).length > 0) || (b.nLineas || 0) - (a.nLineas || 0);
    const marca = (p) => {
      const r = rango(p);
      if (r === 0) return `lo controla en ${cultivo}`;
      if (r === 1) return cultivo ? 'lo controla en otro cultivo' : 'lo controla';
      if (r === 2) return `con uso en ${cultivo}`;
      return '';
    };
    const opcion = (p) => ({
      etiqueta: p.nombre,
      clase: repite(p).length ? 'opcion-repite' : '',
      detalle: [p.moa.length ? p.moa.join(' + ') : 'sin código', marca(p), repite(p).length ? 'repite código' : ''].filter(Boolean).join(' · '),
      accion: () => elegirProducto(p),
    });
    listaProductos = buscadorOpciones({
      id: 'f-producto', etiqueta: '¿Con qué producto?', placeholder: 'Nombre, ingrediente o código (ej: FRAC 3)',
      opciones: (texto) => {
        const t = limpio(texto);
        if (t) {
          const ops = filtrar(visibles, t, palabrasDe, (p) => (3 - rango(p)) * 100000 + (p.nLineas || 0), 30).map(opcion);
          ops.push({
            etiqueta: `Agregar «${recortar(t, 60)}» como producto fuera del catálogo`, clase: 'opcion-todos',
            accion: () => {
              estado.productoId = null; estado.linea = null; estado.otras = null;
              estado.externo = { nombre: t, ingrediente: '', tipo: estado.objetivo ? 'Insecticida' : 'Fertilizante' };
              estado.paso = 3;
              pintar(true);
            },
          });
          return ops;
        }
        if (clave) {
          const lista = visibles.filter((p) => enEste.has(p.id) || (estado.controlan && estado.controlan.has(p.id))).sort(orden).slice(0, 40);
          if (!lista.length && !estado.controlan) return [{ etiqueta: 'Buscando los productos que lo controlan…', clase: 'tenue', accion: () => {} }];
          return lista.map(opcion);
        }
        return visibles.filter((p) => usosCultivo.has(p.id)).sort(orden).slice(0, 15).map(opcion);
      },
    });
    return h('div', null, listaProductos,
      h('p', { class: 'chico tenue as-pista' }, clave
        ? 'Primero van los que lo controlan según su etiqueta. Escribe para buscar cualquier otro producto'
        : 'Escribe para buscar cualquier producto, aunque no sea del cultivo del plan'));
  };

  // ----- Pregunta 3: cuándo (y el uso de la etiqueta) -----
  function pintarUso() {
    vaciar(zonaUso);
    if (!estado.productoId) return;
    let lineas = lineasDelProducto(usosCultivo, estado.productoId);
    const deOtro = !lineas.length;
    if (deOtro) lineas = estado.otras || [];
    if (estado.linea && !lineas.some((u) => u.id === estado.linea.id)) lineas = [estado.linea, ...lineas];
    if (!lineas.length) return;
    const texto = (u) => {
      const c = cat.cultivos.get(u.crop_id);
      return `${deOtro && c ? `${recortar(c.nombre, 30)}: ` : ''}${etiquetaUso(cat, plan, u)}`;
    };
    const titulo = deOtro ? `Uso de la etiqueta (no tiene para ${cultivo || 'el cultivo del plan'}; puedes elegir uno de otro cultivo)` : 'Uso de la etiqueta';
    if (lineas.length <= 4 && !deOtro) {
      zonaUso.append(h('fieldset', { class: 'campo usos' },
        h('legend', null, titulo),
        lineas.map((u) => {
          const radio = h('input', { type: 'radio', name: 'f-uso', value: u.id, checked: estado.linea && estado.linea.id === u.id });
          radio.addEventListener('change', () => { estado.linea = u; avisos(); });
          return h('label', { class: 'uso-opcion' }, radio,
            h('span', null, h('strong', null, texto(u)), h('span', { class: 'chico tenue' }, ` · ${textoDosis(u)} · ${textoCarencia(u)}`)));
        })));
      return;
    }
    const sel = h('select', { class: 'selector', id: 'f-uso' },
      h('option', { value: '' }, 'Sin elegir uso'),
      lineas.slice(0, 200).map((u) => h('option', { value: u.id, selected: estado.linea && estado.linea.id === u.id },
        `${recortar(texto(u), 70)} — ${textoDosis(u)} · ${textoCarencia(u)}`)));
    sel.addEventListener('change', () => { estado.linea = lineas.find((u) => u.id === sel.value) || null; avisos(); });
    zonaUso.append(h('div', { class: 'campo' }, h('label', { for: 'f-uso' }, titulo), sel));
  }

  const pasoCuando = () => {
    const p = estado.productoId ? cat.productos.get(estado.productoId) : null;
    let ficha = null;
    if (p) {
      const repetidos = repite(p);
      ficha = h('div', { class: 'ficha-rapida' },
        h('p', null, [p.categorias.map((c) => c.nombre).join(', '), p.formulacionCodigo, ingredientesTexto(p)].filter(Boolean).join(' · ')),
        repetidos.length ? h('p', { class: 'nota nota-alerta' }, icono('alerta'), ` Repite ${repetidos.join(' y ')}, igual que la última aplicación. Para la misma plaga conviene otro código`) : null);
    } else if (estado.externo) {
      const x = estado.externo;
      const ing = h('input', { class: 'entrada', type: 'text', value: x.ingrediente, maxlength: '120', placeholder: 'Ej: imidacloprid' });
      const tipo = h('select', { class: 'selector' }, TIPOS.map((t) => h('option', { value: t, selected: x.tipo === t }, t)));
      const actualizar = () => { Object.assign(x, { ingrediente: limpio(ing.value), tipo: tipo.value }); avisos(); };
      ing.addEventListener('input', retrasar(actualizar, 250));
      tipo.addEventListener('change', actualizar);
      ficha = h('div', { class: 'form-grid' },
        h('label', { class: 'campo' }, 'Ingrediente activo (para saber su modo de acción)', ing),
        h('label', { class: 'campo' }, 'Tipo', tipo));
    }
    pintarUso();
    return h('div', null,
      ficha,
      h('div', { class: 'form-grid as-cuando' },
        h('div', { class: 'campo' }, h('label', { for: 'f-fecha' }, '¿Cuándo lo vas a aplicar?'), fecha),
        conDia ? h('div', { class: 'campo' }, h('label', { for: 'f-dia' }, 'o día desde el trasplante'), dia) : null),
      zonaUso,
      h('details', { class: 'as-detalle' },
        h('summary', null, 'Más detalle (dosis de tu plan, nota)'),
        h('div', { class: 'form-grid' },
          h('div', { class: 'campo' }, h('label', { for: 'f-dosis' }, 'Dosis de tu plan'), dosisPlan),
          h('div', { class: 'campo' }, h('label', { for: 'f-objetivo' }, 'Contra qué'), objetivoTexto)),
        h('div', { class: 'campo' }, h('label', { for: 'f-nota' }, 'Nota'), nota)),
      zonaAvisos,
      h('div', { class: 'acciones' }, h('button', { type: 'submit', class: 'boton boton-primario' }, icono('mas'), 'Agregar al plan')));
  };

  // ----- Armado -----
  const respuesta = (rotulo, contenido, alCambiar) => h('li', null,
    h('span', { class: 'as-rotulo' }, rotulo), h('span', { class: 'as-valor' }, contenido),
    h('button', { type: 'button', class: 'boton boton-chico', onclick: alCambiar }, 'Cambiar'));

  function pintar(enfocar) {
    vaciar(respuestas);
    vaciar(zona);
    cuenta.textContent = `Pregunta ${estado.paso} de 3`;
    if (estado.paso > 1 && !pre.productoId) {
      respuestas.append(respuesta('Contra qué', estado.objetivo ? mayuscula(recortar(estado.objetivo, 60)) : 'No es contra una plaga', () => { estado.paso = 1; pintar(true); }));
    }
    if (estado.paso > 2) {
      const p = estado.productoId ? cat.productos.get(estado.productoId) : null;
      respuestas.append(respuesta('Producto',
        p ? [h('strong', null, p.nombre), ' ', chipsMoa(p.moa)] : [h('strong', null, estado.externo ? estado.externo.nombre : 'Producto'), ' ', h('span', { class: 'etiqueta etq-externo' }, 'Fuera del catálogo')],
        () => { estado.productoId = null; estado.externo = null; estado.linea = null; estado.otras = null; estado.paso = 2; pintar(true); }));
    }
    respuestas.hidden = !respuestas.children.length;
    zona.append(estado.paso === 1 ? pasoObjetivo() : estado.paso === 2 ? pasoProducto() : pasoCuando());
    avisos();
    if (enfocar) {
      const campo = zona.querySelector('input[type=search], input[type=date]');
      if (campo) campo.focus({ preventScroll: true });
    }
  }

  const form = h('form', { class: 'tarjeta form-plan asistente', novalidate: true },
    h('h2', { class: 'form-titulo' }, icono('mas'), 'Agregar un producto', cuenta),
    respuestas, zona);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (estado.paso !== 3 || !hayProducto()) return;
    const c = cuandoNueva();
    if (!c) { fecha.focus(); return; }
    fechaPorPlan.set(plan.id, { fecha: P.esFecha(fecha.value) ? fecha.value : null, dia: conDia && dia.value !== '' ? Number(dia.value) : null });
    alAgregar(nueva());
  });

  if (estado.productoId && !estado.linea) elegirLinea();
  if (estado.productoId && !lineasDelProducto(usosCultivo, estado.productoId).length) {
    const id = estado.productoId;
    usosPorProducto(id).then((ls) => { if (estado.productoId === id) { estado.otras = ls; if (estado.paso === 3) pintarUso(); } }, () => {});
  }
  pintar(false);
  return form;
}

// ---------- Exportar ----------

function descargarCsv(cat, plan, alertas) {
  const filas = [['Fecha', 'Día desde trasplante', 'Etapa', 'N.° aplicación', 'Producto', 'Tipo', 'Ingrediente activo', 'Grupo de modo de acción',
    'Dosis de tu plan', 'Objetivo', 'Equipo', 'Alternativa Syngenta', 'Dosis de la etiqueta', 'Estado', 'Carencia', 'Alertas', 'Nota']];
  for (const a of P.ordenadas(plan)) {
    const p = a.productoId ? cat.productos.get(a.productoId) : null;
    const u = a.linea;
    const f = P.fechaDe(plan, a);
    filas.push([
      f ? P.fechaCorta(f) : '', P.ddtDe(plan, a) ?? '', a.etapa || '', a.numero ?? '', P.nombreDe(cat, a), P.tipoDe(cat, a),
      p ? ingredientesTexto(p) : (a.externo && a.externo.ingrediente) || '', P.gruposDe(cat, a).join(' + '),
      a.dosisPlan || '', a.objetivo || '', a.equipo || '', a.alternativa || '',
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

async function abrirGuardados(clave, zona) {
  let datos = null;
  try {
    datos = await planGuardado(clave);
  } catch (e) {
    zona.append(h('div', { class: 'nota nota-alerta' }, 'No se pudo abrir tu plan guardado. Revisa la conexión e intenta de nuevo con el mismo link.'));
    return;
  }
  const lista = datos && Array.isArray(datos.planes) ? datos.planes : [];
  if (!lista.length) {
    zona.append(h('div', { class: 'nota nota-alerta' }, 'Ese link no tiene planes guardados.'));
    return;
  }
  const r = P.importarPlanes(lista);
  if (r.existentes.length) {
    const nombres = r.existentes.map((p) => `«${p.nombre}»`).join(' y ');
    if (window.confirm(`Este equipo ya tiene ${nombres}. ¿Reemplazarlo por la versión guardada? (Se pierden los cambios hechos en este equipo.)`)) {
      P.importarPlanes(r.existentes, { reemplazar: true });
    }
  }
  if (r.nuevos.length) notificar(h('p', null, h('strong', null, `Plan cargado: ${r.nuevos.map((p) => p.nombre).join(' y ')}.`)), 5000);
}

let datosAbiertos = false; // si la persona dejó abiertos los datos del plan, siguen abiertos al redibujar

export async function render(main, ctx) {
  const { cat, params } = ctx;
  // Dónde quedan guardados los planes: en la cuenta (planNube.js) o solo en este equipo.
  const nube = h('p', { class: 'plan-nube', role: 'status' });
  const pintarNube = () => {
    vaciar(nube);
    const e = estadoNube();
    if (!usuario()) {
      nube.append(icono('info'), h('span', null, 'Tus planes se guardan solo en este equipo. ',
        h('a', { href: rutaCuenta('#/plan') }, 'Entra a tu cuenta'), ' para verlos desde cualquier parte'));
    } else if (e === 'guardado') {
      nube.append(icono('check'), h('span', null, 'Guardado en tu cuenta'));
    } else if (e === 'error') {
      nube.append(icono('alerta'), h('span', null, 'No se pudo guardar en tu cuenta. Queda en este equipo y se intenta de nuevo'));
    } else {
      nube.append(icono('rotar'), h('span', null, 'Guardando en tu cuenta…'));
    }
  };
  pintarNube();
  main.append(
    h('h1', null, 'Plan de aplicaciones'),
    h('p', { class: 'plan-intro' }, 'El calendario de lo que vas a aplicar en tu cultivo. Dices contra qué y con qué producto, y el plan te avisa si repites un modo de acción o si no alcanza la carencia'),
    nube);
  const zona = h('div', null, cargando('Preparando tu plan…', 'lista'));
  main.append(zona);

  if (params.get('abrir')) {
    const avisoZona = h('div');
    main.insertBefore(avisoZona, zona);
    await abrirGuardados(params.get('abrir'), avisoZona);
    if (!ctx.vigente()) return;
    ctx.cambiarParams({});
  }

  // Llega un uso elegido desde otra vista: el asistente parte con ese producto y uso.
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
    if (!cat.productos.has(pre.productoId)) delete pre.productoId;
    else if (!P.planActivo()) {
      const c = pre.linea ? cat.cultivos.get(pre.linea.crop_id) : null;
      P.crearPlan({ nombre: `${c ? c.nombre : 'Plan'} ${P.temporada()}`, cultivoId: c ? (c.esFrase ? c.bases[0] || null : c.id) : null });
    }
    ctx.cambiarParams({});
  }

  let turno = 0;
  const pintar = async (opciones = {}) => {
    const miTurno = ++turno;
    const plan = P.planActivo();
    const vigente = () => ctx.vigente() && miTurno === turno;

    if (!plan) {
      vaciar(zona);
      const semillero = h('input', { type: 'checkbox', id: 'p-semillero' });
      zona.append(h('div', { class: 'tarjeta vacio-plan' },
        h('h2', null, 'Crea tu primer plan'),
        buscadorOpciones({
          id: 'p-cultivo-nuevo', etiqueta: '¿Para qué cultivo es?', placeholder: 'Ej: lechuga, cerezo, canola',
          opciones: (t) => opcionesCultivo(cat, t, (id) => {
            const c = cat.cultivos.get(id);
            const destino = semillero.checked ? 'semillero' : 'consumo';
            P.crearPlan({ nombre: `${c.nombre}${destino === 'semillero' ? ' semillero' : ''} ${P.temporada()}`, cultivoId: id, destino });
            pintar();
          }),
        }),
        h('label', { class: 'casilla' }, semillero, 'Es semillero (producción de semilla)'),
        h('p', { class: 'chico tenue' }, 'El cultivo sirve para sugerirte productos y revisar las carencias. Igual vas a poder agregar cualquier producto'),
        h('button', { type: 'button', class: 'boton', onclick: () => { P.crearPlan({ nombre: `Plan ${P.temporada()}` }); pintar(); } }, 'Crear sin cultivo por ahora')));
      return;
    }

    // Líneas de la etiqueta para los cultivos del plan (para sugerir productos y elegir usos) y las de otros
    // cultivos que estén en el plan, al día.
    const usosCultivo = new Map();
    let sinConexion = false;
    try {
      const porId = new Map();
      for (const cid of P.cultivosDelPlan(plan)) {
        const c = cat.cultivos.get(cid);
        for (const u of await usosPorCultivo(cid, c ? c.variantes : [])) {
          if (porId.has(u.id)) continue; // «Manzanos, perales…» sale con Manzano y con Peral
          porId.set(u.id, u);
          if (!usosCultivo.has(u.product_id)) usosCultivo.set(u.product_id, []);
          usosCultivo.get(u.product_id).push(u);
        }
      }
      const otros = [...new Set(plan.aplicaciones.filter((a) => a.linea && !porId.has(a.linea.id)).map((a) => a.productoId).filter(Boolean))];
      for (const pid of otros) for (const u of await usosPorProducto(pid)) porId.set(u.id, u);
      P.refrescarLineas(plan, porId);
    } catch (e) {
      sinConexion = true;
    }
    if (!vigente()) return;
    vaciar(zona);
    if (!P.almacenamientoDisponible()) {
      zona.append(h('div', { class: 'nota nota-alerta' }, 'Este navegador no deja guardar datos (¿modo incógnito?): el plan se perderá al cerrar la página.'));
    }
    if (sinConexion) zona.append(h('div', { class: 'nota nota-alerta' }, 'Sin conexión: se muestran los datos guardados con cada aplicación.'));

    const alertas = P.calcularAlertas(plan, cat, { usosCultivo: sinConexion ? null : usosCultivo });

    // Barra de planes
    const todos = P.planes();
    const selPlan = h('select', { class: 'selector', 'aria-label': 'Plan', id: 'p-sel' },
      todos.map((x) => h('option', { value: x.id, selected: x.id === plan.id }, `${x.nombre} (${x.aplicaciones.length})`)));
    selPlan.addEventListener('change', () => { P.activar(selPlan.value); pintar(); });
    zona.append(h('div', { class: 'barra-plan' },
      todos.length > 1 ? h('label', { class: 'campo-linea', for: 'p-sel' }, 'Plan', selPlan) : null,
      h('button', { type: 'button', class: 'boton boton-chico', onclick: () => {
        P.crearPlan({ nombre: `Plan ${P.temporada()}` });
        datosAbiertos = true;
        pintar({ enfocarNombre: true });
      } }, icono('mas'), 'Nuevo plan')));

    // Datos del plan (plegados: una línea con lo que tiene)
    const nombre = h('input', { class: 'entrada', id: 'p-nombre', type: 'text', value: plan.nombre, maxlength: '80' });
    nombre.addEventListener('change', () => { P.editarPlan(plan.id, { nombre: limpio(nombre.value) || plan.nombre }); pintar(); });
    const destino = h('select', { class: 'selector', id: 'p-destino' },
      h('option', { value: 'consumo', selected: plan.destino !== 'semillero' }, 'Consumo'),
      h('option', { value: 'semillero', selected: plan.destino === 'semillero' }, 'Semillero (producción de semilla)'));
    destino.addEventListener('change', () => { P.editarPlan(plan.id, { destino: destino.value }); pintar(); });
    const trasplante = h('input', { class: 'entrada', id: 'p-trasplante', type: 'date', value: plan.trasplante || '' });
    trasplante.addEventListener('change', () => { P.editarPlan(plan.id, { trasplante: P.esFecha(trasplante.value) ? trasplante.value : null }); pintar(); });
    const cosecha = h('input', { class: 'entrada', id: 'p-cosecha', type: 'date', value: plan.cosecha || '' });
    cosecha.addEventListener('change', () => { P.editarPlan(plan.id, { cosecha: P.esFecha(cosecha.value) ? cosecha.value : null }); pintar(); });
    const cultivos = P.cultivosDelPlan(plan).map((id) => cat.cultivos.get(id)).filter(Boolean);
    const campoCultivo = cultivos.length
      ? h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, cultivos.length > 1 ? 'Cultivos' : 'Cultivo'),
        h('div', { class: 'elegido' }, h('strong', null, nombreCultivoPlan(cat, plan)),
          cultivos.length > 1 ? h('span', { class: 'chico' }, cultivos.map((c) => c.nombre).join(', ')) : null,
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => { P.editarPlan(plan.id, { cultivoId: null, otrosCultivos: [] }); pintar(); } }, 'Cambiar')))
      : buscadorOpciones({ id: 'p-cultivo', etiqueta: 'Cultivo (sirve para sugerirte productos; igual puedes agregar cualquiera)', placeholder: 'Ej: lechuga, cerezo, canola', opciones: (t) => opcionesCultivo(cat, t, (id) => { P.editarPlan(plan.id, { cultivoId: id, otrosCultivos: [] }); pintar(); }) });
    const lineaDatos = [
      nombreCultivoPlan(cat, plan) || 'sin cultivo',
      plan.trasplante ? `trasplante ${P.fechaCorta(plan.trasplante)}` : null,
      plan.cosecha ? `cosecha ${P.fechaCorta(plan.cosecha)}` : 'sin fecha de cosecha',
    ].filter(Boolean).join(' · ');
    const datos = h('details', { class: 'tarjeta datos-plan', open: datosAbiertos || null },
      h('summary', null,
        h('span', { class: 'dp-nombre' }, h('strong', null, plan.nombre), h('span', { class: 'chico tenue' }, lineaDatos)),
        h('span', { class: 'dp-editar' }, icono('lapiz'), 'Datos del plan')),
      h('div', { class: 'form-grid' },
        h('div', { class: 'campo' }, h('label', { for: 'p-nombre' }, 'Nombre del plan'), nombre),
        h('div', { class: 'campo' }, h('label', { for: 'p-destino' }, 'Destino'), destino),
        h('div', { class: 'campo' }, h('label', { for: 'p-trasplante' }, 'Fecha de trasplante'), trasplante),
        h('div', { class: 'campo' }, h('label', { for: 'p-cosecha' }, plan.destino === 'semillero' ? 'Fecha de cosecha de semilla' : 'Fecha de cosecha'), cosecha)),
      campoCultivo);
    datos.addEventListener('toggle', () => { datosAbiertos = datos.open; });
    zona.append(datos);

    const elegir = (id) => {
      const el = document.getElementById(`ap-${id}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
    };
    const aps = P.ordenadas(plan);

    // A la izquierda, las preguntas para agregar; a la derecha, el resumen, que cambia con cada respuesta.
    const lado = h('div', { class: 'plan-lado-zona' });
    const pintarLado = (borrador) => { vaciar(lado).append(resumenLado(cat, plan, alertas, borrador)); };
    const alAgregar = (nueva) => {
      const lista = P.alertasDeNueva(plan, cat, nueva, { usosCultivo });
      const a = P.agregarAplicacion(plan.id, nueva);
      const f = P.fechaDe(plan, a);
      if (f) mesPorPlan.set(plan.id, f.slice(0, 7));
      const graves2 = lista.filter(P.esGrave);
      notificar(h('div', null,
        h('p', null, h('strong', null, `Agregado: ${P.nombreDe(cat, a)} (${P.cuando(plan, a)}).`)),
        graves2.length ? listaAlertas(graves2) : null), graves2.length ? 12000 : 4000);
      pintar();
    };
    const asis = asistente(cat, plan, usosCultivo, opciones.pre || {}, alAgregar, pintarLado);

    const resto = h('div', { class: 'plan-resto' });
    if (aps.length) {
      resto.append(h('h2', { class: 'titulo-seccion' }, 'Línea de tiempo'),
        lineaDeTiempo(cat, plan, alertas, elegir)
          || h('p', { class: 'nota nota-info' }, 'Pon la fecha de trasplante en los datos del plan para ver las aplicaciones en la línea de tiempo.'));
    }
    // Lista por día y, plegado, el calendario del mes (si hay fechas).
    const conFecha = aps.filter((a) => P.fechaDe(plan, a));
    let zonaCal = null;
    if (conFecha.length) {
      let mes = mesPorPlan.get(plan.id);
      if (!mes) {
        const proxima = conFecha.find((a) => P.fechaDe(plan, a) >= P.hoy()) || conFecha[conFecha.length - 1];
        mes = P.fechaDe(plan, proxima).slice(0, 7);
      }
      const cal = h('div');
      const pintarCal = (m) => {
        mesPorPlan.set(plan.id, m);
        vaciar(cal).append(calendarioMes(cat, plan, alertas, m, pintarCal, elegir));
      };
      pintarCal(mes);
      zonaCal = h('details', { class: 'plegable-cal' }, h('summary', null, icono('calendario'), 'Ver el calendario del mes'), cal);
    }
    resto.append(
      h('h2', { class: 'titulo-seccion' }, 'Aplicaciones', h('span', { class: 'contador' }, `(${aps.length})`)),
      zonaCal || h('span'),
      listaPorDia(cat, plan, alertas, usosCultivo, () => pintar()),
      h('div', { class: 'barra-plan barra-plan-pie' },
        aps.length ? h('button', { type: 'button', class: 'boton boton-chico', onclick: () => window.print() }, icono('imprimir'), 'Imprimir o guardar PDF') : null,
        aps.length ? h('button', { type: 'button', class: 'boton boton-chico', onclick: () => descargarCsv(cat, plan, alertas) }, icono('descargar'), 'Descargar para Excel') : null,
        h('button', { type: 'button', class: 'boton boton-chico boton-peligro', onclick: () => {
          if (window.confirm(`¿Borrar el plan «${plan.nombre}» y sus ${plan.aplicaciones.length} aplicaciones? No se puede deshacer.`)) {
            P.borrarPlan(plan.id);
            pintar();
          }
        } }, icono('basura'), 'Borrar este plan')));

    zona.append(h('div', { class: 'plan-cols' }, h('div', { class: 'plan-asistente' }, asis), lado, resto));

    if (opciones.enfocarNombre) nombre.select();
  };

  // Llegan los planes de la cuenta (al entrar) o cambia el estado del guardado.
  const dejar = alCambiarNube((cambiaron) => {
    if (!ctx.vigente()) { dejar(); return; }
    pintarNube();
    if (cambiaron) pintar();
  });

  await pintar({ pre });
}
