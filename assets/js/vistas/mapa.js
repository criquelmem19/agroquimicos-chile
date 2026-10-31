// Mapa: las conexiones del catálogo como un dibujo interactivo (idea de graphify; pedido de Cristóbal, 31-10-2026).
// Nodos: grupos de modo de acción, ingredientes activos, productos, cultivos y plagas/enfermedades/malezas. Cada unión
// sale de las etiquetas (producto ↔ ingrediente, ingrediente ↔ grupo, línea de uso ↔ cultivo y objetivo); no hay
// dosis ni carencias. Se parte de un nodo y se ven sus vecinos; tocar otro lo pone al centro. Debajo, las mismas
// conexiones como lista (en el celular es más fácil tocar ahí). Los productos que no se usan en Chile no aparecen.
// Parámetro: nodo=<tipo>:<clave> (g:FRAC 3, i:<id>, p:<id>, c:<id>, o:<id>).
// El dibujo usa Cytoscape: se carga solo en esta página, con versión fija y huella SRI (como supabase-js).
import { usosPorProducto, usosPorCultivo, usosPorObjetivos, compararMoa, familiaMoa } from '../db.js';
import { filtrar, palabras } from '../buscador.js';
import { h, icono, ruta, plural, recortar, limpio, combo, claseMoa, cargando } from '../ui.js';

const CYTOSCAPE = '3.34.3';
const CYTOSCAPE_SRI = 'sha256-XztbUpVG1a8fxWKFkK8DO3RRGltveJ9fRoKEWGMii5E=';
const CYTOSCAPE_URLS = [
  `https://cdn.jsdelivr.net/npm/cytoscape@${CYTOSCAPE}/dist/cytoscape.min.js`,
  `https://unpkg.com/cytoscape@${CYTOSCAPE}/dist/cytoscape.min.js`,
];

// Vecinos de cada tipo que entran al dibujo (la lista de abajo los muestra todos, hasta MAX_LISTA).
const MAX_DIBUJO = 24;
const MAX_LISTA = 80;
const ZOOM_LEGIBLE = 0.8;

const TIPOS = {
  g: { nombre: 'Grupo de modo de acción', plural: 'Grupos de modo de acción' },
  i: { nombre: 'Ingrediente activo', plural: 'Ingredientes activos' },
  p: { nombre: 'Producto', plural: 'Productos' },
  c: { nombre: 'Cultivo', plural: 'Cultivos' },
  o: { nombre: 'Plaga, enfermedad o maleza', plural: 'Plagas, enfermedades y malezas' },
};
const ORDEN_TIPOS = ['g', 'i', 'p', 'c', 'o'];

// Colores de la paleta del sitio (app.css). Grupos con el color de su sistema, como en la tabla.
const SISTEMAS = { FRAC: ['#0f55b3', '#e8f1fd'], IRAC: ['#13723d', '#e5f6ea'], HRAC: ['#8a5a12', '#f8eedb'] };
const COLOR = { i: '#6b6962', p: '#141414', c: '#1f9d55', o: '#edc25a' };

const disponible = (p) => p && !p.noDisponible;
const porLineas = (a, b) => (b.nLineas || 0) - (a.nLineas || 0) || a.nombre.localeCompare(b.nombre, 'es');

// ---------- Índice por grupo (una vez por catálogo) ----------

const indices = new WeakMap();
function indice(cat) {
  if (!indices.has(cat)) {
    const grupos = new Map();
    for (const p of cat.productos.values()) {
      if (!disponible(p)) continue;
      for (const k of p.familias) {
        if (!grupos.has(k)) grupos.set(k, { clave: k, productos: [], ingredientes: new Set() });
        grupos.get(k).productos.push(p);
        for (const x of p.ings) if (x.ing.moa && familiaMoa(x.ing.moa) === k) grupos.get(k).ingredientes.add(x.ing);
      }
    }
    const ingredientes = [...cat.ingredientes.values()].filter((x) => x.productos.some(disponible))
      .map((x) => ({ x, palabras: palabras(`${x.nombre} ${x.grupoQuimico || ''}`), n: x.productos.filter(disponible).length }));
    indices.set(cat, { grupos, ingredientes });
  }
  return indices.get(cat);
}

// ---------- Nodos ----------

const nGrupo = (k, n) => ({ id: `g:${k}`, tipo: 'g', nombre: k, n });
const nIng = (x, n) => ({ id: `i:${x.id}`, tipo: 'i', nombre: x.nombre, n });
const nProd = (p) => ({ id: `p:${p.id}`, tipo: 'p', nombre: p.nombre, detalle: p.marca });
const nCultivo = (c, n) => ({ id: `c:${c.id}`, tipo: 'c', nombre: c.nombre, n });
const nObjetivo = (o, n) => ({ id: `o:${o.id}`, tipo: 'o', nombre: o.nombre, n });

function nodoDe(cat, id) {
  const corte = id.indexOf(':');
  const tipo = id.slice(0, corte);
  const k = id.slice(corte + 1);
  if (tipo === 'g') return indice(cat).grupos.has(k) ? nGrupo(k) : null;
  if (tipo === 'i') return cat.ingredientes.has(k) ? nIng(cat.ingredientes.get(k)) : null;
  if (tipo === 'p') return cat.productos.has(k) ? nProd(cat.productos.get(k)) : null;
  if (tipo === 'c') return cat.cultivos.has(k) && !cat.cultivos.get(k).esFrase ? nCultivo(cat.cultivos.get(k)) : null;
  if (tipo === 'o') return cat.objetivos.has(k) ? nObjetivo(cat.objetivos.get(k)) : null;
  return null;
}

// Cuenta productos (distintos y que se usan en Chile) por clave, a partir de líneas de uso.
function contar(cat, usos, claves) {
  const m = new Map();
  for (const u of usos) {
    if (!disponible(cat.productos.get(u.product_id))) continue;
    for (const k of claves(u)) {
      if (!m.has(k)) m.set(k, new Set());
      m.get(k).add(u.product_id);
    }
  }
  return [...m].map(([k, s]) => [k, s.size]).sort((a, b) => b[1] - a[1]);
}

// ---------- Vecindario de un nodo ----------
// nodos: Map id → { ...nodo, nivel } (3 = centro, 2 = primer anillo, 1 = segundo); aristas: Set «a|b»;
// listas: [{ tipo, titulo, items }] para la lista de abajo; info: texto bajo el nombre; enlaces: [{ texto, href }].

async function vecindario(cat, centro) {
  const nodos = new Map([[centro.id, { ...centro, nivel: 3 }]]);
  const aristas = new Set();
  const listas = [];
  const enlaces = [];
  let info = '';
  const poner = (n, nivel) => { if (!nodos.has(n.id)) nodos.set(n.id, { ...n, nivel }); };
  const unir = (a, b) => { if (a !== b && nodos.has(a) && nodos.has(b)) aristas.add(a < b ? `${a}|${b}` : `${b}|${a}`); };
  const lista = (tipo, items, titulo) => { if (items.length) listas.push({ tipo, titulo: titulo || TIPOS[tipo].plural, items }); };
  const k = centro.id.slice(2);

  if (centro.tipo === 'g') {
    const g = indice(cat).grupos.get(k);
    const ings = [...g.ingredientes].map((x) => ({ x, n: x.productos.filter((p) => disponible(p) && p.familias.includes(k)).length }))
      .filter((y) => y.n).sort((a, b) => b.n - a.n);
    const prods = [...g.productos].sort(porLineas);
    const quimicos = [...new Set(ings.map((y) => y.x.grupoQuimico).filter(Boolean))];
    info = [quimicos.join(' · '), plural(prods.length, 'producto', 'productos')].filter(Boolean).join(' · ');
    for (const y of ings.slice(0, MAX_DIBUJO)) { poner(nIng(y.x, y.n), 2); unir(centro.id, `i:${y.x.id}`); }
    for (const p of prods.slice(0, MAX_DIBUJO)) {
      poner(nProd(p), 1);
      const suyos = p.ings.map((x) => `i:${x.ing.id}`).filter((id) => nodos.has(id));
      if (suyos.length) for (const id of suyos) unir(`p:${p.id}`, id); else unir(`p:${p.id}`, centro.id);
    }
    lista('i', ings.map((y) => nIng(y.x, y.n)));
    lista('p', prods.map(nProd));
    enlaces.push({ texto: `Ver los ${plural(prods.length, 'producto', 'productos')} en la tabla`, href: ruta('', { moa: k }) });
  } else if (centro.tipo === 'i') {
    const ing = cat.ingredientes.get(k);
    const grupo = ing.moa ? familiaMoa(ing.moa) : null;
    const prods = ing.productos.filter(disponible).sort(porLineas);
    info = [grupo, ing.grupoQuimico, plural(prods.length, 'producto', 'productos')].filter(Boolean).join(' · ');
    if (grupo) { poner(nGrupo(grupo), 2); unir(centro.id, `g:${grupo}`); lista('g', [nGrupo(grupo)]); }
    // Con qué otros ingredientes viene mezclado en un mismo producto.
    const otros = new Map();
    for (const p of prods) for (const x of p.ings) if (x.ing !== ing) otros.set(x.ing, (otros.get(x.ing) || 0) + 1);
    const mezclas = [...otros].sort((a, b) => b[1] - a[1]);
    for (const p of prods.slice(0, MAX_DIBUJO)) { poner(nProd(p), 2); unir(centro.id, `p:${p.id}`); }
    for (const [x, n] of mezclas.slice(0, MAX_DIBUJO)) {
      poner(nIng(x, n), 1);
      for (const p of prods.slice(0, MAX_DIBUJO)) if (p.ings.some((y) => y.ing === x)) unir(`p:${p.id}`, `i:${x.id}`);
    }
    lista('p', prods.map(nProd));
    lista('i', mezclas.map(([x, n]) => nIng(x, n)), 'Viene mezclado con');
    enlaces.push({ texto: `Ver los ${plural(prods.length, 'producto', 'productos')} en la tabla`, href: ruta('', { ing: k }) });
  } else if (centro.tipo === 'p') {
    const p = cat.productos.get(k);
    info = [p.marca, p.formulacionCodigo, p.registro ? `Reg. SAG ${p.registro}` : null].filter(Boolean).join(' · ');
    for (const x of p.ings) {
      poner(nIng(x.ing), 2);
      unir(centro.id, `i:${x.ing.id}`);
      if (x.ing.moa) { poner(nGrupo(familiaMoa(x.ing.moa)), 1); unir(`i:${x.ing.id}`, `g:${familiaMoa(x.ing.moa)}`); }
    }
    const usos = await usosPorProducto(p.id);
    const cultivos = contar(cat, usos, (u) => [u.crop_id]).map(([id]) => cat.cultivos.get(id)).filter((c) => c && !c.esFrase);
    const objetivos = contar(cat, usos, (u) => u.objetivos).map(([id]) => cat.objetivos.get(id)).filter(Boolean);
    for (const c of cultivos.slice(0, MAX_DIBUJO)) { poner(nCultivo(c), 2); unir(centro.id, `c:${c.id}`); }
    for (const o of objetivos.slice(0, MAX_DIBUJO)) { poner(nObjetivo(o), 1); unir(centro.id, `o:${o.id}`); }
    lista('i', p.ings.map((x) => nIng(x.ing)));
    lista('g', p.familias.map((g) => nGrupo(g)));
    lista('c', cultivos.map((c) => nCultivo(c)));
    lista('o', objetivos.map((o) => nObjetivo(o)));
    enlaces.push({ texto: 'Ver la ficha del producto', href: ruta(`producto/${p.id}`) });
  } else {
    // Cultivo u objetivo: sus productos se agrupan por modo de acción (serían cientos de nodos).
    const usos = centro.tipo === 'c' ? await usosPorCultivo(k) : await usosPorObjetivos([k]);
    const prods = [...new Set(usos.map((u) => u.product_id))].map((id) => cat.productos.get(id)).filter(disponible).sort(porLineas);
    const grupos = contar(cat, usos, (u) => cat.productos.get(u.product_id).familias).sort((a, b) => b[1] - a[1] || compararMoa(a[0], b[0]));
    const otros = centro.tipo === 'c'
      ? contar(cat, usos, (u) => u.objetivos).map(([id, n]) => [cat.objetivos.get(id), n]).filter(([o]) => o).map(([o, n]) => nObjetivo(o, n))
      : contar(cat, usos, (u) => [u.crop_id]).map(([id, n]) => [cat.cultivos.get(id), n]).filter(([c]) => c && !c.esFrase).map(([c, n]) => nCultivo(c, n));
    const objetivo = centro.tipo === 'o' ? cat.objetivos.get(k) : null;
    info = [objetivo && limpio(objetivo.cientifico), plural(prods.length, 'producto', 'productos')].filter(Boolean).join(' · ');
    for (const [g, n] of grupos.slice(0, MAX_DIBUJO)) { poner(nGrupo(g, n), 2); unir(centro.id, `g:${g}`); }
    for (const n of otros.slice(0, MAX_DIBUJO)) { poner(n, 1); unir(centro.id, n.id); }
    lista('g', grupos.map(([g, n]) => nGrupo(g, n)));
    lista(otros.length ? otros[0].tipo : 'o', otros);
    lista('p', prods.map(nProd));
    enlaces.push({ texto: `Ver los ${plural(prods.length, 'producto', 'productos')} en la tabla`, href: ruta('', centro.tipo === 'c' ? { cultivo: k } : { objetivo: k }) });
  }
  return { nodos, aristas, listas, info, enlaces };
}

// ---------- Dibujo (Cytoscape) ----------

let promesaCytoscape = null;
function cargarCytoscape() {
  if (window.cytoscape) return Promise.resolve(window.cytoscape);
  if (!promesaCytoscape) {
    promesaCytoscape = (async () => {
      for (const url of CYTOSCAPE_URLS) {
        try {
          await new Promise((resolver, rechazar) => {
            const s = document.createElement('script');
            s.src = url;
            s.integrity = CYTOSCAPE_SRI;
            s.crossOrigin = 'anonymous';
            s.onload = resolver;
            s.onerror = () => { s.remove(); rechazar(new Error(url)); };
            document.head.append(s);
          });
          if (window.cytoscape) return window.cytoscape;
        } catch (e) { /* se intenta el otro CDN */ }
      }
      promesaCytoscape = null;
      throw new Error('No se pudo cargar el dibujo del mapa.');
    })();
  }
  return promesaCytoscape;
}

const etiquetaNodo = (n) => `${recortar(n.nombre, 30)}${n.n ? ` (${n.n})` : ''}`;

// Posiciones en anillos alrededor del centro (nivel 2 adentro, nivel 1 afuera). Los del anillo de afuera quedan
// cerca de su vecino del anillo de adentro, para que las líneas no se crucen. Devuelve { id: { x, y, a } }.
const SEPARACION_ANILLOS = 130;
const ARCO_POR_NODO = 50;
const ZIGZAG = 44;
function posiciones(v, centroId) {
  const pos = { [centroId]: { x: 0, y: 0, a: Math.PI / 2 } };
  const vecinos = new Map();
  for (const a of v.aristas) {
    const [x, y] = a.split('|');
    for (const [p, q] of [[x, y], [y, x]]) { if (!vecinos.has(p)) vecinos.set(p, []); vecinos.get(p).push(q); }
  }
  let r = 0;
  for (const nivel of [2, 1]) {
    let ids = [...v.nodos.values()].filter((n) => n.nivel === nivel).map((n) => n.id);
    if (!ids.length) continue;
    if (nivel === 1) {
      // Ángulo promedio de sus vecinos ya ubicados (sin contar el centro); los que solo se unen al centro, al final.
      const angulo = (id) => {
        const as = (vecinos.get(id) || []).filter((q) => q !== centroId && pos[q]).map((q) => pos[q].a);
        return as.length ? Math.atan2(as.reduce((s, a) => s + Math.sin(a), 0), as.reduce((s, a) => s + Math.cos(a), 0)) : null;
      };
      const giro = (a) => (a + Math.PI / 2 + 4 * Math.PI) % (2 * Math.PI);
      ids = ids.map((id) => [id, angulo(id)]).sort((x, y) => (x[1] == null) - (y[1] == null) || giro(x[1]) - giro(y[1])).map(([id]) => id);
    }
    r = Math.max(r + SEPARACION_ANILLOS, (ids.length * ARCO_POR_NODO) / (2 * Math.PI));
    // Anillo con muchos nodos: en zigzag (uno más afuera, otro más adentro), para que los nombres no se tapen.
    const zigzag = ids.length > 14 ? ZIGZAG : 0;
    ids.forEach((id, i) => {
      const a = -Math.PI / 2 + (2 * Math.PI * i) / ids.length;
      const ri = r + (i % 2) * zigzag;
      pos[id] = { x: ri * Math.cos(a), y: ri * Math.sin(a), a };
    });
    r += zigzag;
  }
  return pos;
}

// Nombre hacia afuera del anillo: a la derecha, a la izquierda, arriba o abajo del punto.
function ladoEtiqueta(a) {
  const c = Math.cos(a);
  if (c > 0.2) return { lh: 'right', lv: 'center', mx: 5, my: 0 };
  if (c < -0.2) return { lh: 'left', lv: 'center', mx: -5, my: 0 };
  return Math.sin(a) < 0 ? { lh: 'center', lv: 'top', mx: 0, my: -4 } : { lh: 'center', lv: 'bottom', mx: 0, my: 4 };
}

function dibujar(cytoscape, lienzo, centro, v) {
  const pos = posiciones(v, centro.id);
  const elementos = [
    ...[...v.nodos.values()].map((n) => ({
      data: { id: n.id, etiqueta: etiquetaNodo(n), ...ladoEtiqueta(pos[n.id].a) },
      position: { x: pos[n.id].x, y: pos[n.id].y },
      classes: [n.tipo, n.tipo === 'g' ? n.nombre.split(' ')[0] : '', n.id === centro.id ? 'centro' : ''].join(' '),
    })),
    ...[...v.aristas].map((a) => { const [source, target] = a.split('|'); return { data: { id: a, source, target } }; }),
  ];
  const estiloGrupo = Object.entries(SISTEMAS).map(([s, [tinta, fondo]]) => ({
    selector: `node.g.${s}`, style: { 'background-color': fondo, 'border-color': tinta, color: tinta },
  }));
  const cy = cytoscape({
    container: lienzo,
    elements: elementos,
    minZoom: 0.25,
    maxZoom: 3,
    style: [
      {
        selector: 'node',
        style: {
          width: 16, height: 16, 'background-color': COLOR.i, label: 'data(etiqueta)',
          'font-family': 'Rubik, system-ui, sans-serif', 'font-size': 12, color: '#141414',
          'text-halign': 'data(lh)', 'text-valign': 'data(lv)', 'text-margin-x': 'data(mx)', 'text-margin-y': 'data(my)',
          'text-wrap': 'wrap', 'text-max-width': 130,
          'text-background-color': '#ffffff', 'text-background-opacity': 0.85, 'text-background-padding': 2,
          'text-background-shape': 'roundrectangle',
        },
      },
      { selector: 'node.p', style: { 'background-color': COLOR.p } },
      { selector: 'node.c', style: { 'background-color': COLOR.c, shape: 'round-rectangle' } },
      { selector: 'node.o', style: { 'background-color': COLOR.o, shape: 'round-triangle', 'border-width': 1.5, 'border-color': '#5a3b00' } },
      {
        selector: 'node.g',
        style: {
          shape: 'round-rectangle', height: 26, width: (n) => Math.max(48, n.data('etiqueta').length * 7.2 + 18),
          'background-color': '#ebebe8', 'border-width': 1.5, 'border-color': '#6b6962', 'font-weight': 600,
          'text-halign': 'center', 'text-valign': 'center', 'text-margin-x': 0, 'text-margin-y': 0, 'text-background-opacity': 0,
        },
      },
      ...estiloGrupo,
      {
        selector: 'node.centro',
        style: { width: 30, height: 30, 'font-size': 14, 'font-weight': 700, 'border-width': 4, 'border-color': '#63d17b', 'text-halign': 'center', 'text-valign': 'bottom', 'text-margin-x': 0, 'text-margin-y': 6 },
      },
      {
        selector: 'node.g.centro',
        style: { height: 34, width: (n) => Math.max(60, n.data('etiqueta').length * 8.5 + 24), 'text-valign': 'center', 'text-margin-y': 0 },
      },
      { selector: 'edge', style: { width: 1.2, 'line-color': '#cfc8bb', 'curve-style': 'straight' } },
    ],
    layout: { name: 'preset', fit: true, padding: 30 },
  });
  // Si para que quepa todo la letra queda muy chica, se acerca al centro (el botón de la esquina muestra todo).
  if (cy.zoom() < ZOOM_LEGIBLE) {
    cy.zoom(ZOOM_LEGIBLE);
    cy.center(cy.getElementById(centro.id));
  }
  cy.on('tap', 'node', (e) => { if (e.target.id() !== centro.id) location.hash = ruta('mapa', { nodo: e.target.id() }); });
  cy.on('mouseover', 'node', () => { lienzo.style.cursor = 'pointer'; });
  cy.on('mouseout', 'node', () => { lienzo.style.cursor = ''; });
  // Al salir de esta página (o cambiar de nodo) se libera el dibujo.
  window.addEventListener('hashchange', () => cy.destroy(), { once: true });
  return cy;
}

function leyenda(v) {
  const tipos = new Set([...v.nodos.values()].map((n) => n.tipo));
  const muestra = (color, texto, forma = '') => h('span', null, h('i', { class: `muestra ${forma}`, style: `--color:${color}` }), texto);
  return h('div', { class: 'mapa-leyenda' },
    tipos.has('g') ? muestra(SISTEMAS.FRAC[0], 'Grupo (FRAC · IRAC · HRAC)', 'cuadrada') : null,
    tipos.has('i') ? muestra(COLOR.i, 'Ingrediente activo') : null,
    tipos.has('p') ? muestra(COLOR.p, 'Producto') : null,
    tipos.has('c') ? muestra(COLOR.c, 'Cultivo', 'cuadrada') : null,
    tipos.has('o') ? muestra(COLOR.o, 'Plaga, enfermedad o maleza', 'triangular') : null);
}

// ---------- Lista (debajo del dibujo) ----------

function enlaceNodo(n) {
  const detalle = n.n ? plural(n.n, 'producto', 'productos') : n.detalle;
  return h('a', { class: n.tipo === 'g' ? `chip chip-moa ${claseMoa(n.nombre)}` : 'chip', href: ruta('mapa', { nodo: n.id }) },
    recortar(n.nombre, 60), detalle ? h('small', null, detalle) : null);
}

function detalle(centro, v) {
  return h('section', { class: 'mapa-detalle' },
    h('span', { class: 'etiqueta etq-neutra' }, TIPOS[centro.tipo].nombre),
    h('h2', null, centro.nombre),
    v.info ? h('p', { class: 'tenue' }, v.info) : null,
    h('div', { class: 'acciones' }, v.enlaces.map((e) => h('a', { class: 'boton', href: e.href }, e.texto))),
    v.listas.map((l) => [
      h('h3', null, `${l.titulo} (${l.items.length})`),
      h('div', { class: 'chips mapa-lista' }, l.items.slice(0, MAX_LISTA).map(enlaceNodo),
        l.items.length > MAX_LISTA ? h('span', { class: 'chico tenue' }, `y ${l.items.length - MAX_LISTA} más`) : null),
    ]));
}

// Sin nodo elegido: grupos y cultivos con más productos para empezar.
function inicioMapa(cat) {
  const grupos = [...indice(cat).grupos.values()].sort((a, b) => b.productos.length - a.productos.length).slice(0, 12);
  const cultivos = [...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase).sort((a, b) => b.nProductos - a.nProductos).slice(0, 12);
  return h('div', { class: 'mapa-inicio' },
    h('h2', null, 'Empieza por un grupo'),
    h('div', { class: 'chips' }, grupos.map((g) => enlaceNodo(nGrupo(g.clave, g.productos.length)))),
    h('h2', null, 'O por un cultivo'),
    h('div', { class: 'chips' }, cultivos.map((c) => enlaceNodo(nCultivo(c, c.nProductos)))));
}

// ---------- Buscador ----------

function opcionesBusqueda(cat, texto) {
  const ir = (n) => () => { location.hash = ruta('mapa', { nodo: n.id }); };
  const op = (n, detalle) => ({ etiqueta: n.nombre, detalle, accion: ir(n) });
  const ix = indice(cat);
  const q = limpio(texto);
  if (!q) {
    return [...ix.grupos.values()].sort((a, b) => b.productos.length - a.productos.length).slice(0, 10)
      .map((g) => op(nGrupo(g.clave), `${TIPOS.g.nombre} · ${plural(g.productos.length, 'producto', 'productos')}`));
  }
  return [
    ...filtrar([...ix.grupos.values()], q, (g) => palabras(g.clave), (g) => g.productos.length, 4)
      .map((g) => op(nGrupo(g.clave), `${TIPOS.g.nombre} · ${plural(g.productos.length, 'producto', 'productos')}`)),
    ...filtrar(ix.ingredientes, q, (y) => y.palabras, (y) => y.n, 5)
      .map((y) => op(nIng(y.x), `${TIPOS.i.nombre} · ${plural(y.n, 'producto', 'productos')}`)),
    ...filtrar([...cat.productos.values()].filter(disponible), q, (p) => p.palabras, (p) => p.nLineas || 0, 6)
      .map((p) => op(nProd(p), [TIPOS.p.nombre, p.marca].filter(Boolean).join(' · '))),
    ...filtrar([...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase), q, (c) => c.palabras, (c) => c.nProductos, 5)
      .map((c) => op(nCultivo(c), `${TIPOS.c.nombre} · ${plural(c.nProductos, 'producto', 'productos')}`)),
    ...filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), q, (o) => o.palabras, (o) => o.nLineas, 5)
      .map((o) => op(nObjetivo(o), [TIPOS.o.nombre, limpio(o.cientifico)].filter(Boolean).join(' · '))),
  ];
}

// ---------- Vista ----------

export async function render(main, ctx) {
  const { cat, params } = ctx;
  const id = params.get('nodo') || '';
  const centro = id ? nodoDe(cat, id) : null;
  if (centro) ctx.titulo(`${centro.nombre} · Mapa`);

  main.append(h('h1', null, 'Mapa'),
    h('div', { class: 'panel-filtros mapa-buscar', role: 'search' }, combo({
      id: 'f-mapa', titulo: 'Buscar', placeholder: 'Producto, ingrediente, FRAC 3, cultivo o plaga',
      opciones: (t) => opcionesBusqueda(cat, t),
    })));
  if (id && !centro) {
    main.append(h('div', { class: 'nota nota-alerta' }, 'No encontramos eso en el catálogo. ', h('a', { href: '#/mapa' }, 'Volver al mapa')));
    return;
  }
  if (!centro) { main.append(inicioMapa(cat)); return; }

  const lienzo = h('div', { class: 'mapa-lienzo', role: 'img', 'aria-label': `Dibujo de las conexiones de ${centro.nombre}` },
    h('span', { class: 'esq' }));
  const caja = h('div', { class: 'mapa-caja' }, lienzo);
  const zonaDetalle = h('div', null, cargando('Buscando las conexiones…', 'lista'));
  main.append(caja, zonaDetalle);

  const v = await vecindario(cat, centro);
  if (!ctx.vigente()) return;
  zonaDetalle.replaceChildren(detalle(centro, v));
  try {
    const cytoscape = await cargarCytoscape();
    if (!ctx.vigente()) return;
    lienzo.replaceChildren();
    const cy = dibujar(cytoscape, lienzo, centro, v);
    caja.append(
      h('button', { type: 'button', class: 'boton-redondo mapa-centrar', title: 'Volver a ver todo el dibujo', 'aria-label': 'Volver a ver todo el dibujo', onclick: () => cy.fit(undefined, 24) }, icono('rotar')),
      leyenda(v));
  } catch (err) {
    console.error(err);
    caja.replaceChildren(h('div', { class: 'nota nota-alerta' }, 'No se pudo cargar el dibujo (revisa la conexión). Las conexiones están en la lista de abajo.'));
  }
}
