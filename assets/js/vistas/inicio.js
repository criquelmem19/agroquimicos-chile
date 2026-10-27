// Inicio: tabla de productos (una fila por producto) con filtros por cultivo, plaga/enfermedad/maleza,
// tipo de producto, texto, empresa y modo de acción. Es también «¿Qué aplico?»: con cultivo u objetivo,
// los cultivos y la dosis de cada fila salen solo de las líneas de uso que calzan.
// Parámetros: cultivo=<id>, objetivo=<id>, oq=<texto de objetivo>, cat=<id>, q=<texto>, empresa=<nombre corto>,
// moa=<clave>|sin, ing=<id>, orden=moa|nombre|empresa|tipo|ing|registro|cultivos, inv=1 (orden al revés),
// todos=1 (incluye los que no se usan en Chile)
import { usosPorCultivo, usosPorObjetivos, compararMoa, nombreCorto } from '../db.js';
import { filtrar, palabras, puntaje, normalizar } from '../buscador.js';
import {
  h, icono, ruta, plural, recortar, limpio, vaciar, cargando, retrasar,
  chipsMoa, ingredientesTexto, linkPdf, dosisRango, resumenDosis,
} from '../ui.js';

// La vista usa todo el ancho de la pantalla (app.js).
export const ANCHA = true;

const POR_PAGINA = 100;
const VISIBLES_CULTIVOS = 3;
const MAX_OBJETIVOS_TEXTO = 300;
// Columnas que se ordenan al tocar su título (otro toque invierte el orden). Por defecto, agrupados por modo de acción.
// mayorPrimero: el primer toque ordena de mayor a menor.
const ORDENES = {
  moa: 'Modo de acción (agrupados)',
  nombre: 'Producto',
  empresa: 'Empresa',
  tipo: 'Tipo (WP, SC…)',
  ing: 'Ingrediente activo',
  registro: 'Registro SAG',
  cultivos: 'Cantidad de cultivos',
};
const MAYOR_PRIMERO = new Set(['cultivos']);
// Columnas de la tabla y con qué orden se asocia cada una (null: no se ordena).
const COLUMNAS = [
  ['Producto', 'nombre'], ['Empresa', 'empresa'], ['Modo de acción', 'moa'], ['Tipo', 'tipo'], ['Ingrediente activo', 'ing'],
  ['Etiqueta', null], ['Reg. SAG', 'registro'], ['Cultivos', 'cultivos'], ['Dosis', null], ['', null],
];
const SIN_GRUPO = 'Sin grupo de modo de acción informado';

function ir(params) { location.hash = ruta('', params); }

// Nombre común + nombre científico (si no viene ya en el nombre), para distinguir variantes.
function nombreObjetivo(o) {
  const n = limpio(o.nombre);
  const c = limpio(o.cientifico);
  return recortar(c && !normalizar(n).includes(normalizar(c)) ? `${n} (${c})` : n, 80);
}

// Código de formulación (WP, SC, EC…). Si falta en los datos, el que trae el nombre comercial («PUNTO 70 WP»).
function tipoDe(p) {
  if (p.formulacionCodigo) return p.formulacionCodigo;
  const m = String(p.nombre).match(/\b(SC|EC|WP|SL|WG|WDG|DP|FS|EW|CS|OD|SG|SE|SP|GR|ZC|ME|DC|TB|RB|GB|UL|WS|DS)\b/);
  return m ? m[1] : null;
}

function valorOrden(clave, p, info) {
  if (clave === 'nombre') return p.nombre;
  if (clave === 'empresa') return p.marca;
  if (clave === 'tipo') return tipoDe(p);
  if (clave === 'ing') return p.ings.length ? p.ings.map((x) => x.ing.nombre).join(' + ') : null;
  if (clave === 'registro') return p.registro ? String(p.registro) : null;
  if (clave === 'cultivos') return info.cultivos.length;
  return null;
}

const comparaTexto = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true, ignorePunctuation: true });

// Grupos de modo de acción de un producto como una sola clave («FRAC 7 + FRAC 11»): los que tienen la misma son lo mismo.
const claveGrupo = (p) => p.moa.join(' + ');

function compararGrupos(a, b) {
  if (!a.length || !b.length) return !a.length - !b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const d = compararMoa(a[i], b[i]);
    if (d) return d;
  }
  return a.length - b.length;
}

// ---------- Campo con sugerencias (cultivo, objetivo) ----------

function combo({ id, titulo, placeholder, elegido, opciones, quitar }) {
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

// ---------- Celdas ----------

function listaCultivos(cultivos) {
  if (!cultivos.length) return h('span', { class: 'tenue' }, '—');
  const caja = h('span', { class: 'cultivos' });
  const pintar = (todos) => {
    vaciar(caja);
    const vis = todos ? cultivos : cultivos.slice(0, VISIBLES_CULTIVOS);
    caja.append(vis.map((c) => recortar(c.nombre, 30)).join(', '));
    const resto = cultivos.length - VISIBLES_CULTIVOS;
    if (resto > 0) {
      caja.append(' ', h('button', {
        type: 'button', class: 'mas-cultivos', 'aria-expanded': String(todos),
        title: todos ? 'Mostrar menos' : `Ver los ${cultivos.length} cultivos`, onclick: () => pintar(!todos),
      }, todos ? 'menos' : `+${resto}`));
    }
  };
  pintar(false);
  return caja;
}

// En el celular las celdas sin dato no se muestran (en la tabla quedan con «—»).
const vacia = (clase, valor) => (valor ? clase : `${clase} vacia`);

function fila(p, info, op) {
  const url = p.etiqueta && p.etiqueta.url;
  const principal = p.empresas[0];
  const tipo = tipoDe(p);
  const sistema = op.agrupar && p.moa.length ? String(p.moa[0]).split(' ')[0].toLowerCase() : null;
  return h('tr', { class: op.agrupar ? `en-grupo ${sistema ? `grupo-${sistema}` : 'grupo-sin'}` : null },
    h('td', { class: 'c-producto' },
      h('a', { href: ruta(`producto/${p.id}`, { cultivo: op.cultivoId }) }, p.nombre),
      p.categorias.length ? h('span', { class: 'c-cat' }, p.categorias.map((c) => c.nombre).join(' · ')) : null,
      p.noDisponible ? h('span', { class: 'etiqueta etq-peligro', title: p.noDisponible }, 'No se usa en Chile') : null),
    h('td', { class: vacia('c-empresa', p.marca), 'data-etiqueta': 'Empresa', title: principal ? principal.empresa.nombre : null }, p.marca || '—'),
    h('td', { class: vacia('c-moa', p.moa.length), 'data-etiqueta': 'Modo de acción' },
      chipsMoa(p.moa) || h('span', { class: 'tenue', title: 'Sin grupo de modo de acción informado' }, '—')),
    h('td', { class: vacia('c-tipo', tipo), 'data-etiqueta': 'Tipo', title: p.formulacion || null }, tipo || '—'),
    h('td', { class: 'c-ing', 'data-etiqueta': 'Ingrediente activo', title: ingredientesTexto(p) },
      p.ings.length ? p.ings.map((x) => x.ing.nombre).join(' + ') : h('span', { class: 'tenue' }, 'Sin ingrediente registrado')),
    h('td', { class: 'c-etiqueta', 'data-etiqueta': 'Etiqueta' },
      url ? linkPdf(url, null, 'PDF') : h('span', { class: 'pdf-falta', title: 'PDF no disponible en el sistema' }, 'Sin PDF')),
    h('td', { class: vacia('c-reg', p.registro), 'data-etiqueta': 'Reg. SAG' }, p.registro || '—'),
    h('td', { class: 'c-cultivos', 'data-etiqueta': 'Cultivos' }, listaCultivos(info.cultivos)),
    h('td', { class: 'c-dosis', 'data-etiqueta': 'Dosis' }, dosisRango(info.resumen)),
    h('td', { class: 'c-plan' }, h('a', {
      class: 'boton-redondo', href: ruta('plan', { producto: p.id }),
      title: 'Agregar al plan de aplicaciones', 'aria-label': `Agregar ${p.nombre} al plan de aplicaciones`,
    }, icono('calendario'))));
}

// Título de un grupo de productos con el mismo modo de acción.
function filaGrupo(clave, productos) {
  const moa = clave ? clave.split(' + ') : [];
  const quimicos = [...new Set(productos.flatMap((p) => p.ings.filter((x) => x.ing.moa).map((x) => x.ing.grupoQuimico)).filter(Boolean))];
  return h('tr', { class: 'fila-grupo' }, h('td', { colspan: String(COLUMNAS.length) },
    h('div', { class: 'grupo-titulo' },
      moa.length ? chipsMoa(moa) : h('strong', null, SIN_GRUPO),
      quimicos.length ? h('span', { class: 'grupo-quimico' }, recortar(quimicos.join(' · '), 90)) : null,
      h('span', { class: 'grupo-cuenta' }, plural(productos.length, 'producto', 'productos')))));
}

// alOrdenar(clave): tocar el título de una columna.
function tabla(orden, alOrdenar) {
  return h('table', { class: 'tabla-productos' },
    h('thead', null, h('tr', null, COLUMNAS.map(([titulo, clave]) => {
      if (!clave) return h('th', { scope: 'col', 'aria-label': titulo || 'Agregar al plan', class: titulo ? null : 'c-plan' }, titulo);
      const activa = orden.clave === clave;
      const flecha = activa ? (orden.descendente ? '▼' : '▲') : '↕';
      return h('th', { scope: 'col', 'aria-sort': activa ? (orden.descendente ? 'descending' : 'ascending') : 'none' },
        h('button', {
          type: 'button', class: `orden-col${activa ? ' activa' : ''}`, onclick: () => alOrdenar(clave),
          title: activa ? 'Tocar para invertir el orden' : `Ordenar por ${titulo.toLowerCase()}`,
        }, titulo, h('span', { class: 'flecha', 'aria-hidden': 'true' }, flecha)));
    }))),
    h('tbody'));
}

// ---------- Vista ----------

export async function render(main, ctx) {
  const { cat, params } = ctx;
  const estado = {
    cultivo: params.get('cultivo') || '',
    objetivo: params.get('objetivo') || '',
    oq: limpio(params.get('oq')),
    cat: params.get('cat') || '',
    q: limpio(params.get('q')),
    empresa: params.get('empresa') || '',
    moa: params.get('moa') || '',
    ing: params.get('ing') || '',
    orden: ORDENES[params.get('orden')] ? params.get('orden') : 'moa',
    inv: params.get('inv') === '1',
    todos: params.get('todos') === '1',
  };
  // Links antiguos: empresa por id (#/productos?empresa=<id>).
  if (cat.empresas.has(estado.empresa)) estado.empresa = nombreCorto(cat.empresas.get(estado.empresa).nombre);

  const cultivo = estado.cultivo ? cat.cultivos.get(estado.cultivo) : null;
  const objetivo = estado.objetivo ? cat.objetivos.get(estado.objetivo) : null;
  const ing = estado.ing ? cat.ingredientes.get(estado.ing) : null;
  const conLineas = Boolean(cultivo || objetivo || estado.oq);
  const base = () => ({ cultivo: estado.cultivo, objetivo: estado.objetivo, oq: estado.oq, cat: estado.cat, q: estado.q, empresa: estado.empresa, moa: estado.moa, ing: estado.ing, orden: estado.orden === 'moa' ? '' : estado.orden, inv: estado.inv ? '1' : '', todos: estado.todos ? '1' : '' });

  main.append(h('h1', { class: 'titulo-inicio' }, '¿Qué aplico?'));
  if ((estado.cultivo && !cultivo) || (estado.objetivo && !objetivo)) {
    main.append(h('div', { class: 'nota nota-alerta' }, 'No encontramos ese cultivo u objetivo. ', h('a', { href: '#/' }, 'Empezar de nuevo')));
    return;
  }

  // Líneas de uso (solo si hay cultivo u objetivo): se piden antes de armar los filtros para que las
  // sugerencias muestren solo lo que existe con lo ya elegido.
  const zona = h('div', null, conLineas ? cargando('Buscando los productos registrados…') : null);
  const panel = h('div', { class: 'panel-filtros', role: 'search', hidden: true });
  main.append(panel, zona);

  let lineas = null;
  let resaltados = null;
  let textoObjetivo = objetivo ? nombreObjetivo(objetivo) : '';
  if (conLineas) {
    if (cultivo) {
      lineas = await usosPorCultivo(cultivo.id);
      if (objetivo) resaltados = new Set([objetivo.id]);
      else if (estado.oq) {
        const q = palabras(estado.oq);
        resaltados = new Set();
        for (const u of lineas) for (const t of u.objetivos) { const o = cat.objetivos.get(t); if (o && puntaje(q, o.palabras)) resaltados.add(t); }
      }
    } else {
      let ids = [objetivo && objetivo.id].filter(Boolean);
      if (!objetivo) {
        ids = filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), estado.oq, (o) => o.palabras, (o) => o.nLineas).map((o) => o.id).slice(0, MAX_OBJETIVOS_TEXTO);
      }
      resaltados = new Set(ids);
      lineas = ids.length ? await usosPorObjetivos(ids) : [];
    }
    if (!ctx.vigente()) return;
    if (resaltados) lineas = lineas.filter((u) => u.objetivos.some((t) => resaltados.has(t)));
    if (estado.oq) textoObjetivo = `Todos los que dicen «${estado.oq}» (${plural(resaltados.size, 'objetivo', 'objetivos')})`;
  }

  // ---- Filtros ----
  const objetivosDisponibles = () => {
    if (!cultivo) return [...cat.objetivos.values()].filter((o) => o.nLineas).map((o) => ({ o, n: o.nProductos }));
    const m = new Map();
    for (const u of lineas) for (const t of u.objetivos) {
      const o = cat.objetivos.get(t);
      if (!o) continue;
      if (!m.has(t)) m.set(t, { o, productos: new Set() });
      m.get(t).productos.add(u.product_id);
    }
    return [...m.values()].map((x) => ({ o: x.o, n: x.productos.size }));
  };
  const cultivosDisponibles = () => {
    if (!lineas || cultivo) return [...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase).map((c) => ({ c, n: c.nProductos }));
    const m = new Map();
    for (const u of lineas) {
      const c = cat.cultivos.get(u.crop_id);
      if (!c || c.esFrase) continue;
      if (!m.has(c.id)) m.set(c.id, { c, productos: new Set() });
      m.get(c.id).productos.add(u.product_id);
    }
    return [...m.values()].map((x) => ({ c: x.c, n: x.productos.size }));
  };
  const quitarObjetivo = ruta('', { ...base(), objetivo: '', oq: '' });

  const selCat = h('select', { class: 'selector', id: 'f-cat' },
    h('option', { value: '' }, 'Todos'),
    [...cat.categorias.values()].map((c) => {
      const n = [...cat.productos.values()].filter((p) => p.categorias.includes(c)).length;
      return n ? h('option', { value: c.id, selected: String(c.id) === estado.cat }, `${c.nombre} (${n})`) : null;
    }));
  const texto = h('input', { class: 'entrada', id: 'f-q', type: 'search', value: estado.q, placeholder: 'Buscar…', autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search' });
  const selEmpresa = h('select', { class: 'selector', id: 'f-empresa' },
    h('option', { value: '' }, 'Todas'),
    [...cat.marcas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((m) => h('option', { value: m.nombre, selected: m.nombre === estado.empresa }, `${m.nombre} (${m.productos.length})`)));
  const sinGrupo = [...cat.productos.values()].filter((p) => !p.moa.length).length;
  const selMoa = h('select', { class: 'selector', id: 'f-moa' },
    h('option', { value: '' }, 'Todos'),
    [...cat.gruposMoa.keys()].sort(compararMoa).map((k) => h('option', { value: k, selected: k === estado.moa }, `${k} (${cat.gruposMoa.get(k).productos.length})`)),
    sinGrupo ? h('option', { value: 'sin', selected: estado.moa === 'sin' }, `Sin grupo informado (${sinGrupo})`) : null);

  panel.append(
    h('div', { class: 'filtros-principales' },
      combo({
        id: 'f-cultivo', titulo: 'Cultivo', placeholder: 'Ej: cerezo, uva, trigo',
        elegido: cultivo ? recortar(cultivo.nombre, 50) : null,
        quitar: ruta('', { ...base(), cultivo: '' }),
        opciones: (t) => {
          const lista = cultivosDisponibles();
          const elegidos = limpio(t) ? filtrar(lista, t, (x) => x.c.palabras, (x) => x.n, 40) : lista.sort((a, b) => b.n - a.n).slice(0, 15);
          return elegidos.map((x) => ({ etiqueta: recortar(x.c.nombre, 60), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), cultivo: x.c.id }) }));
        },
      }),
      combo({
        id: 'f-objetivo', titulo: 'Plaga, enfermedad o maleza', placeholder: 'Ej: avenilla, oídio, pulgón',
        elegido: textoObjetivo || null, quitar: quitarObjetivo,
        opciones: (t) => {
          const lista = objetivosDisponibles();
          const q = limpio(t);
          if (!q) return lista.sort((a, b) => b.n - a.n).slice(0, 15).map((x) => ({ etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), objetivo: x.o.id, oq: '' }) }));
          const calzan = filtrar(lista, q, (x) => x.o.palabras, (x) => x.n);
          const ops = [];
          // Los objetivos vienen con muchas variantes («Avenilla», «Avenilla (Avena fatua)»…): primero, todos juntos.
          if (calzan.length >= 2) ops.push({ etiqueta: `Todos los que dicen «${q}»`, detalle: plural(calzan.length, 'objetivo', 'objetivos'), clase: 'opcion-todos', accion: () => ir({ ...base(), objetivo: '', oq: q }) });
          for (const x of calzan.slice(0, 50)) ops.push({ etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), objetivo: x.o.id, oq: '' }) });
          return ops;
        },
      }),
      h('div', { class: 'filtro' }, h('label', { class: 'filtro-titulo', for: 'f-cat' }, 'Tipo'), selCat),
      h('div', { class: 'filtro' }, h('label', { class: 'filtro-titulo', for: 'f-q' }, 'Producto'), texto)),
    h('details', { class: 'mas-filtros', open: Boolean(estado.empresa || estado.moa) },
      h('summary', null, 'Más filtros'),
      h('div', { class: 'filtros-principales' },
        h('div', { class: 'filtro' }, h('label', { class: 'filtro-titulo', for: 'f-empresa' }, 'Empresa'), selEmpresa),
        h('div', { class: 'filtro' }, h('label', { class: 'filtro-titulo', for: 'f-moa' }, 'Modo de acción'), selMoa))));

  panel.hidden = false;

  // ---- Resultados ----
  // Con cultivo u objetivo: cultivos y dosis de cada producto salen de las líneas que calzan.
  const porProducto = new Map();
  if (lineas) {
    for (const u of lineas) {
      if (!porProducto.has(u.product_id)) porProducto.set(u.product_id, []);
      porProducto.get(u.product_id).push(u);
    }
  }
  const ordenCultivos = (ids) => ids.map((id) => cat.cultivos.get(id)).filter((c) => c && !c.esFrase)
    .sort((a, b) => (b.id === estado.cultivo) - (a.id === estado.cultivo) || b.nProductos - a.nProductos || a.nombre.localeCompare(b.nombre, 'es'));
  const infoDe = (p) => {
    if (!lineas) return { cultivos: ordenCultivos(p.cultivoIds), resumen: p.resumenDosis };
    const us = porProducto.get(p.id) || [];
    return { cultivos: ordenCultivos([...new Set(us.map((u) => u.crop_id))]), resumen: resumenDosis(us) };
  };

  const pintar = () => {
    ctx.cambiarParams(base());
    vaciar(zona);
    const q = palabras(estado.q);
    let candidatos = lineas ? [...porProducto.keys()].map((id) => cat.productos.get(id)).filter(Boolean) : [...cat.productos.values()];
    candidatos = candidatos.filter((p) => {
      if (estado.cat && !p.categorias.some((c) => String(c.id) === estado.cat)) return false;
      if (estado.empresa && p.marca !== estado.empresa) return false;
      if (estado.moa === 'sin' && p.moa.length) return false;
      if (estado.moa && estado.moa !== 'sin' && !p.moa.includes(estado.moa)) return false;
      if (ing && !p.ings.some((x) => x.ing === ing)) return false;
      if (q.length && !puntaje(q, p.palabrasTodas)) return false;
      return true;
    });
    const noDisponibles = candidatos.filter((p) => p.noDisponible).length;
    const visibles = estado.todos ? candidatos : candidatos.filter((p) => !p.noDisponible);
    const infos = new Map(visibles.map((p) => [p, infoDe(p)]));
    const nombre = (a, b) => comparaTexto(a.nombre, b.nombre);
    const descendente = MAYOR_PRIMERO.has(estado.orden) !== estado.inv;
    const signo = descendente ? -1 : 1;
    visibles.sort((a, b) => {
      if (estado.orden === 'moa') {
        // Los sin grupo siempre al final; dentro de cada grupo, por nombre.
        const d = compararGrupos(a.moa, b.moa);
        return (a.moa.length && b.moa.length ? d * signo : d) || nombre(a, b);
      }
      const va = valorOrden(estado.orden, a, infos.get(a));
      const vb = valorOrden(estado.orden, b, infos.get(b));
      const faltaA = va == null || va === '';
      const faltaB = vb == null || vb === '';
      if (faltaA || faltaB) return (faltaA - faltaB) || nombre(a, b);
      const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : comparaTexto(va, vb);
      return d * signo || nombre(a, b);
    });
    const ordenar = (clave) => {
      if (estado.orden === clave) estado.inv = !estado.inv;
      else { estado.orden = clave; estado.inv = false; }
      pintar();
    };

    // Barra: cantidad, ingrediente elegido (desde la ficha), los que no se usan en Chile y el orden (en el celular,
    // donde no se ven los títulos de las columnas).
    const orden = h('select', { class: 'selector', 'aria-label': 'Ordenar' },
      Object.entries(ORDENES).map(([v, t]) => h('option', { value: v, selected: v === estado.orden }, t)));
    orden.addEventListener('change', () => { estado.orden = orden.value; estado.inv = false; pintar(); });
    zona.append(h('div', { class: 'barra-tabla' },
      h('p', { class: 'cuenta', 'aria-live': 'polite' }, h('strong', null, plural(visibles.length, 'producto', 'productos'))),
      ing ? h('a', { class: 'chip', 'aria-pressed': 'true', href: ruta('', { ...base(), ing: '' }), title: 'Quitar este filtro' }, `Ingrediente: ${ing.nombre}`, h('small', null, '✕')) : null,
      noDisponibles ? h('button', { type: 'button', class: 'boton-texto chico', onclick: () => { estado.todos = !estado.todos; pintar(); } },
        estado.todos ? `Ocultar ${noDisponibles === 1 ? 'el que no se usa' : `los ${noDisponibles} que no se usan`} en Chile`
          : `Mostrar también ${noDisponibles === 1 ? 'el producto que no se usa' : `los ${noDisponibles} productos que no se usan`} en Chile`) : null,
      h('div', { class: 'orden' }, h('label', null, 'Orden', orden),
        h('button', {
          type: 'button', class: 'boton-redondo', onclick: () => ordenar(estado.orden),
          title: 'Invertir el orden', 'aria-label': `Invertir el orden (ahora ${descendente ? 'de mayor a menor' : 'de menor a mayor'})`,
        }, descendente ? '▼' : '▲'))));

    // Si lo escrito es un cultivo o una plaga, ofrecer ese filtro.
    if (estado.q.length >= 3) {
      const sug = [];
      if (!cultivo) {
        for (const c of filtrar([...cat.cultivos.values()].filter((x) => x.nLineas && !x.esFrase), estado.q, (x) => x.palabras, (x) => x.nProductos, 2)) {
          sug.push(h('a', { class: 'chip', href: ruta('', { ...base(), q: '', cultivo: c.id }) }, `Cultivo: ${recortar(c.nombre, 30)}`));
        }
      }
      if (!objetivo && !estado.oq) {
        const n = filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), estado.q, (o) => o.palabras, (o) => o.nLineas).length;
        if (n) sug.push(h('a', { class: 'chip', href: ruta('', { ...base(), q: '', oq: estado.q }) }, `Plaga, enfermedad o maleza: «${estado.q}»`, h('small', null, plural(n, 'objetivo', 'objetivos'))));
      }
      if (sug.length) zona.append(h('div', { class: 'sugerencias' }, h('span', { class: 'chico tenue' }, '¿Buscabas esto?'), sug));
    }

    if (!visibles.length) {
      zona.append(h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'Ningún producto cumple esos filtros.')),
        h('a', { class: 'boton', href: '#/' }, 'Quitar filtros')));
      return;
    }
    const cuerpo = tabla({ clave: estado.orden, descendente }, ordenar);
    const tbody = cuerpo.querySelector('tbody');
    const masZona = h('div', { class: 'ver-mas-zona' });
    let mostrados = 0;
    const op = { cultivoId: estado.cultivo || null, agrupar: estado.orden === 'moa' };
    // Agrupados por modo de acción: un título antes del primer producto de cada grupo.
    const porGrupo = new Map();
    if (op.agrupar) {
      for (const p of visibles) {
        const k = claveGrupo(p);
        if (!porGrupo.has(k)) porGrupo.set(k, []);
        porGrupo.get(k).push(p);
      }
    }
    let grupoAnterior = null;
    const mostrarMas = () => {
      for (const p of visibles.slice(mostrados, mostrados + POR_PAGINA)) {
        if (op.agrupar && claveGrupo(p) !== grupoAnterior) {
          grupoAnterior = claveGrupo(p);
          tbody.append(filaGrupo(grupoAnterior, porGrupo.get(grupoAnterior)));
        }
        tbody.append(fila(p, infos.get(p), op));
      }
      mostrados += POR_PAGINA;
      vaciar(masZona);
      if (mostrados < visibles.length) {
        masZona.append(h('button', { class: 'boton', type: 'button', onclick: mostrarMas }, `Ver ${Math.min(POR_PAGINA, visibles.length - mostrados)} más`));
      }
    };
    mostrarMas();
    zona.append(cuerpo, masZona);
  };

  selCat.addEventListener('change', () => { estado.cat = selCat.value; pintar(); });
  selEmpresa.addEventListener('change', () => { estado.empresa = selEmpresa.value; pintar(); });
  selMoa.addEventListener('change', () => { estado.moa = selMoa.value; pintar(); });
  texto.addEventListener('input', retrasar(() => { estado.q = limpio(texto.value); pintar(); }, 200));
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); texto.blur(); } });
  pintar();
}
