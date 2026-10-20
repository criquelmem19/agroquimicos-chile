// "¿Qué puedo aplicar?": se elige cultivo y objetivo (plaga, enfermedad o maleza) y se
// muestra una tabla para decidir y rotar modos de acción.
// Parámetros de la dirección: cultivo=<id>, objetivo=<id>|todos, oq=<texto>, usados=FRAC 3,IRAC 4A, orden=moa|producto|carencia
import { usosPorCultivo, usosPorObjetivos, compararMoa } from '../db.js';
import { filtrar, palabras, puntaje, normalizar } from '../buscador.js';
import {
  h, ruta, plural, recortar, limpio, vaciar, cargando, retrasar,
  dosis, carencia, reingreso, mojamiento, intervalo, maxAplicaciones, textoOSinDato, linkPdf, urlDeLinea,
  chipsMoa, ingredientesTexto, porcentaje,
} from '../ui.js';

const SIN_GRUPO = 'Sin grupo de modo de acción informado';
const MAX_OBJETIVOS_TEXTO = 300;

function ir(params) { location.hash = ruta('aplicar', params); }

// ---------- Selectores ----------

function selector({ numero, titulo, ayuda, placeholder, opciones, id }) {
  const entrada = h('input', {
    class: 'entrada', type: 'search', id, placeholder, autocomplete: 'off', spellcheck: 'false', 'aria-label': titulo,
  });
  const lista = h('ul', { class: 'opciones' });
  const pintar = () => {
    vaciar(lista);
    const ops = opciones(entrada.value);
    if (!ops.length) {
      lista.append(h('li', null, h('div', { class: 'opcion tenue' }, 'Sin coincidencias. Prueba con otra palabra.')));
      return;
    }
    for (const o of ops) {
      lista.append(h('li', null, h('button', { type: 'button', class: `opcion ${o.clase || ''}`, onclick: o.accion },
        h('span', null, o.etiqueta), o.detalle ? h('small', null, o.detalle) : null)));
    }
  };
  entrada.addEventListener('input', retrasar(pintar, 100));
  pintar();
  return h('section', { class: 'paso' },
    h('div', { class: 'paso-titulo' }, h('span', { class: 'paso-num' }, numero), h('label', { for: id }, titulo)),
    ayuda ? h('p', { class: 'chico tenue' }, ayuda) : null,
    entrada, lista);
}

function elegido({ numero, titulo, valor, detalle, cambiar }) {
  return h('section', { class: 'paso' },
    h('div', { class: 'paso-titulo' }, h('span', { class: 'paso-num' }, numero), titulo),
    h('div', { class: 'elegido' },
      h('span', null, h('strong', null, valor), detalle ? h('span', { class: 'chico' }, ` · ${detalle}`) : null),
      h('a', { class: 'boton', href: cambiar }, 'Cambiar')));
}

function opcionesCultivoGlobal(cat, texto, alElegir) {
  const lista = [...cat.cultivos.values()].filter((c) => c.nLineas > 0 && !c.esFrase);
  const t = limpio(texto);
  const elegidos = t
    ? filtrar(lista, t, (c) => c.palabras, (c) => c.nLineas, 40)
    : lista.sort((a, b) => b.nLineas - a.nLineas).slice(0, 15);
  return elegidos.map((c) => ({
    etiqueta: recortar(c.nombre, 70), detalle: plural(c.nProductos, 'producto', 'productos'), accion: () => alElegir(c.id),
  }));
}

function objetivosConLineas(cat) {
  return [...cat.objetivos.values()].filter((o) => o.nLineas > 0);
}

// Nombre común + nombre científico (si no viene ya en el nombre), para distinguir variantes.
function nombreObjetivo(o) {
  const n = limpio(o.nombre);
  const c = limpio(o.cientifico);
  return recortar(c && !normalizar(n).includes(normalizar(c)) ? `${n} (${c})` : n, 90);
}

// Objetivos presentes en un conjunto de líneas, con cuántos productos los controlan.
function objetivosDeLineas(cat, lineas) {
  const m = new Map();
  for (const u of lineas) {
    for (const t of u.objetivos) {
      const o = cat.objetivos.get(t);
      if (!o) continue;
      if (!m.has(t)) m.set(t, { o, productos: new Set(), lineas: 0 });
      const x = m.get(t);
      x.productos.add(u.product_id);
      x.lineas += 1;
    }
  }
  return [...m.values()];
}

function cultivosDeLineas(cat, lineas) {
  const m = new Map();
  for (const u of lineas) {
    const c = cat.cultivos.get(u.crop_id);
    if (!c) continue;
    if (!m.has(c.id)) m.set(c.id, { c, productos: new Set(), lineas: 0 });
    const x = m.get(c.id);
    x.productos.add(u.product_id);
    x.lineas += 1;
  }
  return [...m.values()];
}

// ---------- Tabla de resultados ----------

function textoObjetivos(cat, u, resaltados) {
  const nombres = u.objetivos.map((t) => cat.objetivos.get(t)).filter(Boolean);
  const primero = resaltados ? nombres.filter((o) => resaltados.has(o.id)) : [];
  const resto = nombres.filter((o) => !primero.includes(o));
  const orden = [...primero, ...resto];
  const visibles = orden.slice(0, 4).map((o) => recortar(o.nombre, 60));
  const extra = orden.length - visibles.length;
  return h('span', { class: 'chico' }, visibles.join(' · ') + (extra > 0 ? ` y ${extra} más` : ''));
}

function claveGrupo(p) {
  return p.moa.length ? p.moa.join(' + ') : SIN_GRUPO;
}

function ordenCarencia(u) {
  if (u.withholding_period_days != null) return u.withholding_period_days;
  if (u.withholding_not_applicable) return 100000;
  return 200000;
}

function filaDetalle(cat, u, columnas) {
  const url = urlDeLinea(cat, u);
  const par = (dt, dd) => h('div', null, h('dt', null, dt), h('dd', null, dd));
  return h('tr', { class: 'fila-detalle', hidden: true },
    h('td', { colspan: String(columnas) },
      h('dl', { class: 'detalle-grid' },
        par('Mojamiento', mojamiento(u)),
        par('Intervalo entre aplicaciones', intervalo(u)),
        par('Máximo de aplicaciones', maxAplicaciones(u)),
        par('Momento de aplicación', textoOSinDato(u.application_timing)),
        par('Método de aplicación', textoOSinDato(u.application_method)),
        par('Observaciones', textoOSinDato(u.observations)),
        par('Texto leído de la etiqueta', textoOSinDato(u.source_text)),
        par('Fuente', linkPdf(url, u.source_page)))));
}

function filas(cat, u, op) {
  const p = cat.productos.get(u.product_id);
  const url = urlDeLinea(cat, u);
  const repite = op.usados.size ? p.moa.filter((k) => op.usados.has(k)) : [];
  const detalle = filaDetalle(cat, u, op.columnas);
  const boton = h('button', { type: 'button', class: 'boton-texto', 'aria-expanded': 'false' }, 'Ver detalle');
  boton.addEventListener('click', () => {
    const abrir = detalle.hidden;
    detalle.hidden = !abrir;
    boton.setAttribute('aria-expanded', String(abrir));
    boton.textContent = abrir ? 'Ocultar detalle' : 'Ver detalle';
  });
  const cultivo = cat.cultivos.get(u.crop_id);
  const tr = h('tr', { class: repite.length ? 'repite' : null },
    h('td', { class: 'producto-celda', 'data-etiqueta': 'Producto' },
      h('a', { href: ruta(`producto/${p.id}`) }, p.nombre),
      h('span', { class: 'tenue' }, [p.registro ? `Reg. SAG ${p.registro}` : null, p.formulacionCodigo].filter(Boolean).join(' · ')),
      linkPdf(url, u.source_page),
      repite.length ? h('span', { class: 'aviso-repite' }, `Repite ${repite.join(', ')}, que ya usaste`) : null),
    h('td', { class: 'ing-celda', 'data-etiqueta': 'Ingrediente activo' }, ingredientesTexto(p)),
    h('td', { 'data-etiqueta': 'Modo de acción' }, chipsMoa(p.moa) || h('span', { class: 'tenue chico' }, 'Sin grupo informado')),
    op.mostrarCultivo ? h('td', { 'data-etiqueta': 'Cultivo' }, cultivo ? recortar(cultivo.nombre, 60) : '') : null,
    op.mostrarObjetivos ? h('td', { 'data-etiqueta': 'Controla' }, textoObjetivos(cat, u, op.resaltados)) : null,
    h('td', { 'data-etiqueta': 'Dosis' }, dosis(u)),
    h('td', { 'data-etiqueta': 'Carencia' }, carencia(u, url)),
    h('td', { 'data-etiqueta': 'Reingreso' }, reingreso(p.reingreso, url)),
    h('td', { 'data-etiqueta': 'Más' }, boton));
  return [tr, detalle];
}

function tabla(cat, lineas, op) {
  const cabeceras = ['Producto', 'Ingrediente activo', 'Modo de acción'];
  if (op.mostrarCultivo) cabeceras.push('Cultivo');
  if (op.mostrarObjetivos) cabeceras.push('Controla');
  cabeceras.push('Dosis', 'Carencia', 'Reingreso', '');
  op.columnas = cabeceras.length;

  const nombre = (u) => cat.productos.get(u.product_id).nombre;
  const repite = (u) => op.usados.size && cat.productos.get(u.product_id).moa.some((k) => op.usados.has(k));
  const ordenadas = [...lineas].sort((a, b) => {
    if (op.usados.size) {
      const d = Number(repite(a)) - Number(repite(b));
      if (d) return d;
    }
    if (op.orden === 'carencia') return ordenCarencia(a) - ordenCarencia(b) || nombre(a).localeCompare(nombre(b), 'es');
    if (op.orden === 'producto') return nombre(a).localeCompare(nombre(b), 'es');
    const ga = claveGrupo(cat.productos.get(a.product_id));
    const gb = claveGrupo(cat.productos.get(b.product_id));
    if (ga !== gb) {
      if (ga === SIN_GRUPO) return 1;
      if (gb === SIN_GRUPO) return -1;
      return compararMoa(ga, gb);
    }
    return nombre(a).localeCompare(nombre(b), 'es');
  });

  const cuerpo = h('tbody');
  let grupoActual = null;
  for (const u of ordenadas) {
    if (op.orden === 'moa') {
      const g = claveGrupo(cat.productos.get(u.product_id));
      const clave = `${repite(u) ? 'r' : 'n'}|${g}`;
      if (clave !== grupoActual) {
        grupoActual = clave;
        const quimicos = [...new Set(cat.productos.get(u.product_id).ings.map((x) => x.ing.grupoQuimico).filter(Boolean))];
        cuerpo.append(h('tr', { class: 'fila-grupo' }, h('td', { colspan: String(op.columnas) },
          g, quimicos.length && g !== SIN_GRUPO ? h('span', { class: 'tenue' }, ` · ${quimicos.join(' / ')}`) : null)));
      }
    }
    cuerpo.append(...filas(cat, u, op));
  }
  return h('div', { class: 'tabla-envoltura' },
    h('table', { class: 'tabla' },
      h('thead', null, h('tr', null, cabeceras.map((c) => h('th', { scope: 'col' }, c)))),
      cuerpo));
}

function resultados(zona, cat, lineas, op, ctx, paramsBase) {
  vaciar(zona);
  if (!lineas.length) {
    zona.append(h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'No hay líneas de uso para esta combinación.')),
      h('p', { class: 'chico' }, 'Prueba con otro objetivo o revisa el nombre del cultivo.')));
    return;
  }
  const productos = new Set(lineas.map((u) => u.product_id));
  const grupos = new Map();
  for (const pid of productos) {
    for (const k of cat.productos.get(pid).moa) {
      if (!grupos.has(k)) grupos.set(k, new Set());
      grupos.get(k).add(pid);
    }
  }
  const conCarencia = lineas.filter((u) => u.withholding_period_days != null || u.withholding_not_applicable).length;

  zona.append(
    h('h2', { class: 'titulo-seccion' }, 'Opciones registradas', h('span', { class: 'contador' }, `(${plural(productos.size, 'producto', 'productos')})`)),
    h('div', { class: 'resumen' },
      h('span', null, h('strong', null, plural(lineas.length, 'línea de uso', 'líneas de uso'))),
      h('span', null, h('strong', null, plural(grupos.size, 'grupo', 'grupos')), ' de modo de acción'),
      h('span', null, 'Carencia con dato: ', h('strong', null, `${conCarencia} de ${lineas.length}`))));

  if (porcentaje(conCarencia, lineas.length) < 80) {
    zona.append(h('div', { class: 'nota nota-alerta' },
      h('p', null, h('strong', null, 'Ojo con la carencia. '),
        `Solo ${conCarencia} de ${lineas.length} líneas la tienen en los datos. Donde dice «Sin dato», revísala en la etiqueta antes de decidir (cada línea tiene su link al PDF).`)));
  }

  if (grupos.size) {
    const claves = [...grupos.keys()].sort(compararMoa);
    const pintarRotacion = h('div', { class: 'chips' });
    for (const k of claves) {
      const b = h('button', { type: 'button', class: 'chip', 'aria-pressed': String(op.usados.has(k)) },
        h('span', { class: 'mono' }, k), h('small', null, String(grupos.get(k).size)));
      b.addEventListener('click', () => {
        if (op.usados.has(k)) op.usados.delete(k); else op.usados.add(k);
        ctx.cambiarParams({ ...paramsBase, usados: [...op.usados].join(','), orden: op.orden === 'moa' ? '' : op.orden });
        resultados(zona, cat, lineas, op, ctx, paramsBase);
      });
      pintarRotacion.append(b);
    }
    zona.append(h('section', { class: 'rotacion', 'aria-label': 'Rotación de modos de acción' },
      h('h3', null, 'Rotar modos de acción'),
      h('p', null, 'Marca los grupos que ya usaste en esta temporada. Los productos que repiten un grupo marcado quedan al final y atenuados. El número es la cantidad de productos.'),
      pintarRotacion));
  }

  const orden = h('select', { class: 'selector', 'aria-label': 'Ordenar resultados' },
    [['moa', 'Grupo de modo de acción'], ['producto', 'Nombre del producto'], ['carencia', 'Carencia (menor primero)']]
      .map(([v, t]) => h('option', { value: v, selected: op.orden === v }, t)));
  orden.addEventListener('change', () => {
    op.orden = orden.value;
    ctx.cambiarParams({ ...paramsBase, usados: [...op.usados].join(','), orden: op.orden === 'moa' ? '' : op.orden });
    resultados(zona, cat, lineas, op, ctx, paramsBase);
  });
  zona.append(h('div', { class: 'barra-herramientas' }, h('label', null, 'Ordenar por', orden)));
  zona.append(tabla(cat, lineas, op));
}

// ---------- Vista ----------

export async function render(main, ctx) {
  const { cat, params } = ctx;
  const cultivoId = params.get('cultivo');
  const objetivoParam = params.get('objetivo');
  const oq = limpio(params.get('oq'));
  const op = {
    usados: new Set((params.get('usados') || '').split(',').map((s) => s.trim()).filter(Boolean)),
    orden: ['producto', 'carencia'].includes(params.get('orden')) ? params.get('orden') : 'moa',
  };
  const cultivo = cultivoId ? cat.cultivos.get(cultivoId) : null;
  const todos = objetivoParam === 'todos';
  const objetivo = objetivoParam && !todos ? cat.objetivos.get(objetivoParam) : null;

  main.append(
    h('h1', null, '¿Qué puedo aplicar?'),
    h('p', { class: 'bajada' }, 'Elige el cultivo y lo que quieres controlar. Verás los productos registrados con su ingrediente activo, grupo de modo de acción, dosis, carencia y reingreso.'));

  if ((cultivoId && !cultivo) || (objetivoParam && !todos && !objetivo)) {
    main.append(h('div', { class: 'nota nota-alerta' }, 'No encontramos ese cultivo u objetivo. ', h('a', { href: '#/aplicar' }, 'Empezar de nuevo')));
    return;
  }

  const pasos = h('div', { class: 'pasos' });
  const zona = h('div');
  main.append(pasos, zona);

  // Caso 1: hay cultivo.
  if (cultivo) {
    pasos.append(elegido({
      numero: '1', titulo: 'Cultivo', valor: recortar(cultivo.nombre, 70),
      detalle: cultivo.alias.length ? `también: ${cultivo.alias.slice(0, 3).join(', ')}` : null,
      cambiar: ruta('aplicar', { objetivo: objetivoParam && !todos ? objetivoParam : null, oq: oq || null }),
    }));
    const paso2 = h('div');
    pasos.append(paso2);
    paso2.append(cargando('Buscando las líneas de uso del cultivo…'));
    const lineas = await usosPorCultivo(cultivo.id);
    if (!ctx.vigente()) return;
    vaciar(paso2);
    const presentes = objetivosDeLineas(cat, lineas);

    if (!objetivo && !oq && !todos) {
      paso2.replaceWith(selector({
        numero: '2', titulo: 'Plaga, enfermedad o maleza', id: 'sel-objetivo',
        ayuda: `${plural(presentes.length, 'objetivo registrado', 'objetivos registrados')} para este cultivo. Escribe para filtrar.`,
        placeholder: 'Ej: oídio, pulgón, botritis, malezas de hoja ancha',
        opciones: (texto) => {
          const t = limpio(texto);
          const todosLosQueCalzan = t ? filtrar(presentes, t, (x) => x.o.palabras, (x) => x.productos.size) : null;
          const lista = t ? todosLosQueCalzan.slice(0, 60) : [...presentes].sort((a, b) => b.productos.size - a.productos.size).slice(0, 40);
          const ops = [];
          if (!t) ops.push({ etiqueta: 'Ver todas las líneas de este cultivo', detalle: plural(lineas.length, 'línea', 'líneas'), clase: 'opcion-todos', accion: () => ir({ cultivo: cultivo.id, objetivo: 'todos' }) });
          if (t && todosLosQueCalzan.length >= 2) ops.push({ etiqueta: `Todos los que dicen «${t}»`, detalle: plural(todosLosQueCalzan.length, 'objetivo', 'objetivos'), clase: 'opcion-todos', accion: () => ir({ cultivo: cultivo.id, oq: t }) });
          for (const x of lista) ops.push({ etiqueta: nombreObjetivo(x.o), detalle: plural(x.productos.size, 'producto', 'productos'), accion: () => ir({ cultivo: cultivo.id, objetivo: x.o.id }) });
          return ops;
        },
      }));
      return;
    }

    let filtradas = lineas;
    let resaltados = null;
    let valor = 'Todas las líneas del cultivo';
    if (objetivo) {
      filtradas = lineas.filter((u) => u.objetivos.includes(objetivo.id));
      resaltados = new Set([objetivo.id]);
      valor = nombreObjetivo(objetivo);
    } else if (oq) {
      const q = palabras(oq);
      resaltados = new Set(presentes.filter((x) => puntaje(q, x.o.palabras)).map((x) => x.o.id));
      filtradas = lineas.filter((u) => u.objetivos.some((t) => resaltados.has(t)));
      valor = `Todos los que dicen «${oq}» (${plural(resaltados.size, 'objetivo', 'objetivos')})`;
    }
    paso2.replaceWith(elegido({ numero: '2', titulo: 'Plaga, enfermedad o maleza', valor, cambiar: ruta('aplicar', { cultivo: cultivo.id }) }));
    const paramsBase = { cultivo: cultivo.id, objetivo: objetivoParam, oq };
    resultados(zona, cat, filtradas, { ...op, mostrarCultivo: false, mostrarObjetivos: !objetivo, resaltados }, ctx, paramsBase);
    return;
  }

  // Caso 2: hay objetivo (o texto de objetivos) pero no cultivo.
  if (objetivo || oq) {
    let ids;
    let valor;
    if (objetivo) {
      ids = [objetivo.id];
      valor = nombreObjetivo(objetivo);
    } else {
      ids = filtrar(objetivosConLineas(cat), oq, (o) => o.palabras, (o) => o.nLineas).map((o) => o.id);
      valor = `Todos los que dicen «${oq}» (${plural(ids.length, 'objetivo', 'objetivos')})`;
      if (ids.length > MAX_OBJETIVOS_TEXTO) {
        main.insertBefore(h('div', { class: 'nota nota-alerta' }, `«${oq}» coincide con demasiados objetivos. Escribe algo más específico.`), pasos);
        ids = ids.slice(0, MAX_OBJETIVOS_TEXTO);
      }
    }
    const paso1 = h('div');
    pasos.append(paso1, elegido({ numero: '2', titulo: 'Plaga, enfermedad o maleza', valor, cambiar: '#/aplicar' }));
    paso1.append(cargando('Buscando las líneas de uso…'));
    const lineas = ids.length ? await usosPorObjetivos(ids) : [];
    if (!ctx.vigente()) return;
    const cultivos = cultivosDeLineas(cat, lineas).filter((x) => !x.c.esFrase).sort((a, b) => b.productos.size - a.productos.size);
    paso1.replaceWith(selector({
      numero: '1', titulo: 'Cultivo (opcional)', id: 'sel-cultivo',
      ayuda: `Este objetivo aparece en ${plural(cultivos.length, 'cultivo', 'cultivos')}. Elige uno para acotar la tabla.`,
      placeholder: 'Ej: vid, manzano, papa',
      opciones: (texto) => {
        const t = limpio(texto);
        const lista = t ? filtrar(cultivos, t, (x) => x.c.palabras, (x) => x.productos.size, 40) : cultivos.slice(0, 15);
        return lista.map((x) => ({
          etiqueta: recortar(x.c.nombre, 70), detalle: plural(x.productos.size, 'producto', 'productos'),
          accion: () => ir({ cultivo: x.c.id, objetivo: objetivo ? objetivo.id : null, oq: objetivo ? null : oq }),
        }));
      },
    }));
    const resaltados = new Set(ids);
    const paramsBase = { objetivo: objetivo ? objetivo.id : null, oq: objetivo ? null : oq };
    resultados(zona, cat, lineas, { ...op, mostrarCultivo: true, mostrarObjetivos: !objetivo, resaltados }, ctx, paramsBase);
    return;
  }

  // Caso 3: nada elegido todavía.
  pasos.append(
    selector({
      numero: '1', titulo: 'Cultivo', id: 'sel-cultivo',
      ayuda: 'Los más registrados aparecen primero. Puedes escribir el nombre común (uva, palta, poroto…).',
      placeholder: 'Ej: cerezo, uva, papa, trigo',
      opciones: (texto) => opcionesCultivoGlobal(cat, texto, (id) => ir({ cultivo: id })),
    }),
    selector({
      numero: '2', titulo: 'O parte por la plaga, enfermedad o maleza', id: 'sel-objetivo',
      ayuda: 'Si partes por aquí, después puedes acotar por cultivo.',
      placeholder: 'Ej: oídio, polilla, chinche, ballica',
      opciones: (texto) => {
        const t = limpio(texto);
        const lista = objetivosConLineas(cat);
        if (!t) {
          return lista.sort((a, b) => b.nLineas - a.nLineas).slice(0, 15)
            .map((o) => ({ etiqueta: nombreObjetivo(o), detalle: plural(o.nProductos, 'producto', 'productos'), accion: () => ir({ objetivo: o.id }) }));
        }
        const calzan = filtrar(lista, t, (o) => o.palabras, (o) => o.nLineas);
        const ops = [];
        if (calzan.length >= 2) ops.push({ etiqueta: `Todos los que dicen «${t}»`, detalle: plural(calzan.length, 'objetivo', 'objetivos'), clase: 'opcion-todos', accion: () => ir({ oq: t }) });
        for (const o of calzan.slice(0, 50)) ops.push({ etiqueta: nombreObjetivo(o), detalle: plural(o.nProductos, 'producto', 'productos'), accion: () => ir({ objetivo: o.id }) });
        return ops;
      },
    }));
}
