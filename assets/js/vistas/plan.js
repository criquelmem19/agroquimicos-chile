// Plan de aplicaciones: calendario por cultivo y temporada, con alertas según la etiqueta
// (mismo grupo IRAC/FRAC/HRAC, máximo por temporada, intervalo y carencia antes de la cosecha).
// Se guarda en este equipo. Parámetros: producto=<id>&uso=<id> (llega con el uso elegido desde
// «¿Qué aplico?» o la ficha), abrir=<clave> (link personal con planes guardados en la base).
import { usosPorCultivo, usosPorProducto, planGuardado } from '../db.js';
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
  const baja = u.confidence_score != null && Number(u.confidence_score) < UMBRAL_CONFIANZA ? ', confianza baja' : '';
  return `${recortar(u.dose_raw || 'dosis sin dato, verificar etiqueta', 60)} (${estado}${baja})`;
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
    if (!ops.length) {
      lista.append(h('li', null, h('div', { class: 'opcion tenue' }, 'Sin coincidencias.')));
      return;
    }
    for (const o of ops) {
      lista.append(h('li', null, h('button', { type: 'button', class: `opcion ${o.clase || ''}`, onclick: o.accion },
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
    u ? h('p', { class: 'ap-uso' }, h('strong', null, 'Uso: '), etiquetaUso(cat, plan, u)) : null,
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

// ---------- Formulario para agregar ----------

function formulario(cat, plan, usosCultivo, pre, alAgregar) {
  const estado = {
    productoId: pre.productoId || null,
    linea: pre.linea || null,
    externo: null,
    todos: false,
  };
  const zonaProducto = h('div');
  const zonaUso = h('div');
  const zonaAvisos = h('div', { 'aria-live': 'polite' });
  const fecha = h('input', { class: 'entrada', type: 'date', id: 'f-fecha', value: plan.trasplante ? '' : P.hoy() });
  const dia = h('input', { class: 'entrada', type: 'number', id: 'f-dia', inputmode: 'numeric', step: '1', placeholder: 'Ej: 15' });
  const dosisPlan = h('input', { class: 'entrada', type: 'text', id: 'f-dosis', placeholder: 'Ej: 20 g / 100 L', maxlength: '80' });
  const objetivo = h('input', { class: 'entrada', type: 'text', id: 'f-objetivo', placeholder: 'Ej: pulgón, trips', maxlength: '160' });
  const nota = h('input', { class: 'entrada', type: 'text', id: 'f-nota', placeholder: 'Opcional', maxlength: '200' });
  const boton = h('button', { type: 'submit', class: 'boton boton-primario' }, icono('mas'), 'Agregar al plan');
  fecha.addEventListener('change', () => { if (plan.trasplante && P.esFecha(fecha.value)) dia.value = P.diasEntre(plan.trasplante, fecha.value); avisos(); });
  dia.addEventListener('input', () => { if (plan.trasplante && dia.value !== '') fecha.value = P.sumarDias(plan.trasplante, Number(dia.value)); avisos(); });

  const productosDelCultivo = [...usosCultivo.keys()].map((id) => cat.productos.get(id)).filter(Boolean);
  const claves = new Map();
  const palabrasDe = (p) => {
    if (!claves.has(p.id)) claves.set(p.id, p.palabras.concat(...p.ings.map((x) => palabras(x.ing.nombre)), palabras(p.moa.join(' '))));
    return claves.get(p.id);
  };

  const cuandoNueva = () => {
    if (dia.value !== '') return { ddt: Number(dia.value), fecha: plan.trasplante ? null : (P.esFecha(fecha.value) ? fecha.value : null) };
    if (P.esFecha(fecha.value)) return { fecha: fecha.value, ddt: null };
    return null;
  };

  function avisos() {
    vaciar(zonaAvisos);
    const c = cuandoNueva();
    if (!c || (!estado.productoId && !estado.externo)) return;
    const lista = P.alertasDeNueva(plan, cat, { ...c, productoId: estado.productoId, externo: estado.externo, linea: estado.linea }, { usosCultivo });
    const graves = lista.filter(P.esGrave);
    zonaAvisos.append(graves.length
      ? h('div', { class: 'previa previa-alerta' }, h('p', null, h('strong', null, `Ojo: ${plural(graves.length, 'alerta', 'alertas')} si la agregas`)), listaAlertas(lista))
      : h('div', { class: 'previa previa-ok' }, h('p', null, icono('check'), h('strong', null, ' Sin alertas'), ' con lo que ya tiene el plan.'), listaAlertas(lista)));
  }

  const pintarUso = () => {
    vaciar(zonaUso);
    if (!estado.productoId) return;
    if (!P.cultivosDelPlan(plan).length) {
      zonaUso.append(h('p', { class: 'chico tenue' }, 'Elige el cultivo del plan para ver los usos de la etiqueta.'));
      return;
    }
    let lineas = lineasDelProducto(usosCultivo, estado.productoId);
    if (estado.linea && !lineas.some((u) => u.id === estado.linea.id)) lineas = [estado.linea, ...lineas];
    if (!lineas.length) {
      zonaUso.append(h('p', { class: 'nota nota-alerta' }, `La etiqueta no tiene usos para ${nombreCultivoPlan(cat, plan) || 'este cultivo'}.`));
      return;
    }
    if (lineas.length === 1 && !estado.linea) estado.linea = lineas[0];
    zonaUso.append(h('fieldset', { class: 'campo usos' },
      h('legend', null, 'Uso de la etiqueta'),
      lineas.map((u) => {
        const radio = h('input', { type: 'radio', name: 'f-uso', value: u.id, checked: estado.linea && estado.linea.id === u.id });
        radio.addEventListener('change', () => { estado.linea = u; avisos(); });
        return h('label', { class: 'uso-opcion' }, radio,
          h('span', null, h('strong', null, etiquetaUso(cat, plan, u)),
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
    if (estado.externo) {
      const x = estado.externo;
      const nombre = h('input', { class: 'entrada', type: 'text', value: x.nombre, maxlength: '80', placeholder: 'Nombre comercial' });
      const ing = h('input', { class: 'entrada', type: 'text', value: x.ingrediente, maxlength: '120', placeholder: 'Ej: imidacloprid' });
      const tipo = h('select', { class: 'selector' }, TIPOS.map((t) => h('option', { value: t, selected: x.tipo === t }, t)));
      const actualizar = () => { Object.assign(x, { nombre: limpio(nombre.value), ingrediente: limpio(ing.value), tipo: tipo.value }); avisos(); };
      nombre.addEventListener('input', retrasar(actualizar, 200));
      ing.addEventListener('input', retrasar(actualizar, 200));
      tipo.addEventListener('change', actualizar);
      zonaProducto.append(h('div', { class: 'form-grid' },
        h('label', { class: 'campo' }, 'Producto (fuera del catálogo)', nombre),
        h('label', { class: 'campo' }, 'Ingrediente activo', ing),
        h('label', { class: 'campo' }, 'Tipo', tipo),
        h('div', { class: 'campo' }, h('span', { class: 'campo-etiqueta' }, ' '),
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => { estado.externo = null; pintarProducto(); avisos(); } }, 'Buscar en el catálogo'))));
      nombre.focus();
      return;
    }
    const conCultivo = P.cultivosDelPlan(plan).length && !estado.todos;
    const base = conCultivo ? productosDelCultivo : [...cat.productos.values()];
    zonaProducto.append(buscadorOpciones({
      id: 'f-producto',
      etiqueta: conCultivo ? `Producto (${plural(base.length, 'registrado', 'registrados')} para ${nombreCultivoPlan(cat, plan)})` : 'Producto',
      placeholder: 'Nombre, ingrediente o grupo (ej: FRAC 3)',
      opciones: (texto) => {
        const t = limpio(texto);
        const lista = t
          ? filtrar(base, t, palabrasDe, (p) => p.nLineas, 30)
          : [...base].sort((a, b) => normalizar(a.nombre).localeCompare(normalizar(b.nombre), 'es')).slice(0, 15);
        const ops = lista.map((p) => ({
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
        if (t) {
          ops.push({
            etiqueta: `Agregar «${t}» como producto fuera del catálogo`, clase: 'opcion-todos',
            accion: () => { estado.externo = { nombre: t, ingrediente: '', tipo: 'Insecticida' }; pintarProducto(); avisos(); },
          });
        }
        return ops;
      },
    }));
    if (P.cultivosDelPlan(plan).length) {
      zonaProducto.append(h('button', { type: 'button', class: 'boton-texto', onclick: () => { estado.todos = !estado.todos; pintarProducto(); } },
        estado.todos ? 'Ver solo los registrados para el cultivo' : 'Buscar entre todos los productos'));
    }
  };

  const form = h('form', { class: 'tarjeta form-plan', novalidate: true },
    h('h2', { class: 'form-titulo' }, icono('mas'), 'Agregar una aplicación'),
    h('div', { class: 'form-grid' },
      h('div', { class: 'campo' }, h('label', { for: 'f-fecha' }, 'Fecha'), fecha),
      h('div', { class: 'campo' }, h('label', { for: 'f-dia' }, 'o día desde el trasplante'), dia)),
    zonaProducto, zonaUso,
    h('div', { class: 'form-grid' },
      h('div', { class: 'campo' }, h('label', { for: 'f-dosis' }, 'Dosis de tu plan'), dosisPlan),
      h('div', { class: 'campo' }, h('label', { for: 'f-objetivo' }, 'Objetivo'), objetivo)),
    h('div', { class: 'campo' }, h('label', { for: 'f-nota' }, 'Nota'), nota),
    zonaAvisos,
    h('div', { class: 'acciones' }, boton));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const c = cuandoNueva();
    if (!c) { fecha.focus(); return; }
    if (!estado.productoId && !(estado.externo && estado.externo.nombre)) {
      const b = form.querySelector('#f-producto');
      if (b) b.focus();
      return;
    }
    alAgregar({ ...c, productoId: estado.productoId, externo: estado.externo, linea: estado.linea, dosisPlan: limpio(dosisPlan.value), objetivo: limpio(objetivo.value), nota: limpio(nota.value) });
  });

  pintarProducto();
  pintarUso();
  avisos();
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

export async function render(main, ctx) {
  const { cat, params } = ctx;
  main.append(h('h1', null, 'Plan de aplicaciones'));
  const zona = h('div', null, cargando('Preparando tu plan…'));
  main.append(zona);

  if (params.get('abrir')) {
    const avisoZona = h('div');
    main.insertBefore(avisoZona, zona);
    await abrirGuardados(params.get('abrir'), avisoZona);
    if (!ctx.vigente()) return;
    ctx.cambiarParams({});
  }

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

  const pintar = async (opciones = {}) => {
    const plan = P.planActivo();
    vaciar(zona);
    if (!P.almacenamientoDisponible()) {
      zona.append(h('div', { class: 'nota nota-alerta' }, 'Este navegador no deja guardar datos (¿modo incógnito?): el plan se perderá al cerrar la página.'));
    }

    if (!plan) {
      const semillero = h('input', { type: 'checkbox', id: 'p-semillero' });
      zona.append(h('div', { class: 'tarjeta vacio-plan' },
        h('h2', null, 'Crea tu primer plan'),
        buscadorOpciones({
          id: 'p-cultivo-nuevo', etiqueta: '¿Para qué cultivo?', placeholder: 'Ej: lechuga, cerezo, papa',
          opciones: (t) => opcionesCultivo(cat, t, (id) => {
            const c = cat.cultivos.get(id);
            const destino = semillero.checked ? 'semillero' : 'consumo';
            P.crearPlan({ nombre: `${c.nombre}${destino === 'semillero' ? ' semillero' : ''} ${P.temporada()}`, cultivoId: id, destino });
            pintar();
          }),
        }),
        h('label', { class: 'casilla' }, semillero, 'Es semillero (producción de semilla)'),
        h('button', { type: 'button', class: 'boton', onclick: () => { P.crearPlan({ nombre: `Plan ${P.temporada()}` }); pintar(); } }, 'Crear sin cultivo por ahora')));
      return;
    }

    // Líneas de la etiqueta para los cultivos del plan (para elegir usos) y las de otros cultivos que
    // estén en el plan, al día.
    const usosCultivo = new Map();
    let sinConexion = false;
    try {
      const porId = new Map();
      for (const cid of P.cultivosDelPlan(plan)) {
        for (const u of await usosPorCultivo(cid)) {
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
    if (!ctx.vigente()) return;
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
        pintar({ enfocarNombre: true });
      } }, icono('mas'), 'Nuevo plan')));

    // Datos del plan
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
      : buscadorOpciones({ id: 'p-cultivo', etiqueta: 'Cultivo', placeholder: 'Ej: lechuga, cerezo, papa', opciones: (t) => opcionesCultivo(cat, t, (id) => { P.editarPlan(plan.id, { cultivoId: id, otrosCultivos: [] }); pintar(); }) });
    zona.append(h('section', { class: 'tarjeta datos-plan', 'aria-label': 'Datos del plan' },
      h('div', { class: 'form-grid' },
        h('div', { class: 'campo' }, h('label', { for: 'p-nombre' }, 'Nombre del plan'), nombre),
        h('div', { class: 'campo' }, h('label', { for: 'p-destino' }, 'Destino'), destino),
        h('div', { class: 'campo' }, h('label', { for: 'p-trasplante' }, 'Fecha de trasplante'), trasplante),
        h('div', { class: 'campo' }, h('label', { for: 'p-cosecha' }, plan.destino === 'semillero' ? 'Fecha de cosecha de semilla' : 'Fecha de cosecha'), cosecha)),
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
      const lista = P.alertasDeNueva(plan, cat, nueva, { usosCultivo });
      const a = P.agregarAplicacion(plan.id, nueva);
      const f = P.fechaDe(plan, a);
      if (f) mesPorPlan.set(plan.id, f.slice(0, 7));
      const graves2 = lista.filter(P.esGrave);
      notificar(h('div', null,
        h('p', null, h('strong', null, `Agregado: ${P.nombreDe(cat, a)} (${P.cuando(plan, a)}).`)),
        graves2.length ? listaAlertas(graves2) : h('p', null, 'Sin alertas con lo que ya tiene el plan.')), graves2.length ? 12000 : 5000);
      pintar({ enfocar: a.id });
    };
    zona.append(formulario(cat, plan, usosCultivo, opciones.pre || {}, alAgregar));

    // Calendario (si hay fechas) y lista por día
    const aps = P.ordenadas(plan);
    const conFecha = aps.filter((a) => P.fechaDe(plan, a));
    const elegir = (id) => {
      const el = document.getElementById(`ap-${id}`);
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); el.focus({ preventScroll: true }); }
    };
    zona.append(h('h2', { class: 'titulo-seccion' }, 'Calendario'));
    if (conFecha.length) {
      let mes = mesPorPlan.get(plan.id);
      if (!mes) {
        const proxima = conFecha.find((a) => P.fechaDe(plan, a) >= P.hoy()) || conFecha[conFecha.length - 1];
        mes = P.fechaDe(plan, proxima).slice(0, 7);
      }
      const zonaCal = h('div');
      const pintarCal = (m) => {
        mesPorPlan.set(plan.id, m);
        vaciar(zonaCal).append(calendarioMes(cat, plan, alertas, m, pintarCal, elegir));
      };
      pintarCal(mes);
      zona.append(zonaCal);
    } else if (aps.length) {
      zona.append(h('p', { class: 'nota nota-info' }, 'Pon la fecha de trasplante para ver las aplicaciones en el calendario.'));
    }
    zona.append(
      h('h2', { class: 'titulo-seccion' }, 'Aplicaciones', h('span', { class: 'contador' }, `(${aps.length})`)),
      listaPorDia(cat, plan, alertas, usosCultivo, () => pintar()),
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
