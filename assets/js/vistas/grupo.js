// Página de un grupo de modo de acción (#/grupo/<clave>; «FRAC 3», «FRAC 7 + FRAC 11», «tipo:regulador»). Pedido de
// Cristóbal (11-11-2026): desde el título de cada grupo del buscador, «un lugar donde te explique los IRAC que tocaste,
// cómo actúa, qué productos son y qué busca controlar». Todo sale del catálogo y de moa.js (frases escritas desde las
// listas oficiales); lo que controla, de las etiquetas de esos productos (objetivos_de_productos, en la base).
import { cliente, gruposDe, enListas, tipoFormulacion as tipoDe, familiaMoa } from '../db.js';
import { h, icono, ruta, plural, vaciar, cargando, chipsMoa, chipMoa, dibujoComite } from '../ui.js';
import { queHace, breve, sitio, nombreClave, tipoDeClave, TIPOS } from '../moa.js';

const COMITES = {
  frac: ['FRAC', 'Fungicidas y bactericidas', 'hongos y bacterias'],
  irac: ['IRAC', 'Insecticidas, acaricidas y nematicidas', 'insectos, ácaros y nematodos'],
  hrac: ['HRAC', 'Herbicidas', 'malezas'],
};

async function queControlan(ids) {
  if (!ids.length) return [];
  const db = await cliente();
  const { data, error } = await db.rpc('objetivos_de_productos', { p_productos: ids });
  if (error) { console.warn('Sin objetivos del grupo:', error); return []; }
  return data || [];
}

export async function render(main, ctx) {
  const { cat, partes } = ctx;
  const clave = partes.slice(1).join('/');
  const codigos = clave.split(' + ').map((k) => (tipoDeClave(k) ? k : familiaMoa(k))).filter(Boolean);
  const volver = h('p', { class: 'volver' }, h('a', { href: ctx.volverInicio || '#/buscar' }, '← Volver al buscador'));
  main.append(volver);
  if (!codigos.length) {
    main.append(h('div', { class: 'vacio' }, h('h1', null, 'No encontramos ese grupo')));
    return;
  }
  const comite = tipoDeClave(codigos[0]) ? null : codigos[0].split(' ')[0].toLowerCase();
  const [sigla, nombreComite, contra] = COMITES[comite] || [null, 'Sin código de rotación', null];
  const productos = [...cat.productos.values()]
    .filter((p) => enListas(p) && codigos.every((k) => gruposDe(p).includes(k)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
  ctx.titulo(codigos.map(nombreClave).join(' + '));

  // ---- Cabecera ----
  const titulo = codigos.length === 1 ? breve(codigos[0]) : codigos.map(breve).join(' + ');
  main.append(h('section', { class: `gr-cabeza grupo-${comite || 'sin'}` },
    comite ? h('span', { class: 'gr-dibujo', 'aria-hidden': 'true' }, dibujoComite(comite, 'gr-dibujo-svg')) : null,
    h('div', { class: 'gr-cabeza-texto' },
      h('p', { class: 'gr-comite' }, sigla ? `${sigla} · ${nombreComite}` : nombreComite),
      h('h1', { class: 'gr-titulo' }, chipsMoa(codigos, null, { enlace: false }), h('span', null, titulo)),
      h('p', { class: 'gr-cuenta' }, plural(productos.length, 'producto en el catálogo', 'productos en el catálogo')))));

  // ---- Cómo actúa ----
  main.append(h('h2', { class: 'titulo-seccion' }, 'Cómo actúa'),
    h('div', { class: 'tarjeta gr-actua' }, codigos.map((k) => {
      const t = tipoDeClave(k);
      const quimicos = [...new Set(productos.flatMap((p) => p.ings
        .filter((x) => (t ? x.ing.tipo === t : x.ing.moa && familiaMoa(x.ing.moa) === k)).map((x) => x.ing.grupoQuimico)).filter(Boolean))];
      return h('div', { class: 'gr-codigo' },
        chipMoa(k, { enlace: false }),
        h('p', { class: 'gr-que' }, queHace(k) || (t && TIPOS[t] ? TIPOS[t].texto : '')),
        h('dl', { class: 'gr-tecnico' },
          !t && sitio(k) ? [h('dt', null, 'Sitio de acción'), h('dd', null, sitio(k))] : null,
          quimicos.length ? [h('dt', null, 'Grupo químico'), h('dd', null, quimicos.join(' · '))] : null));
    }),
    comite ? h('p', { class: 'gr-consejo' }, icono('rotar'),
      `Para que ${contra} no se hagan resistentes, no repitas este código en aplicaciones seguidas: altérnalo con productos de otro grupo.`) : null));

  // ---- Qué controla ----
  const zonaControla = h('div', { class: 'tarjeta' }, cargando('Buscando qué controlan…', 'texto'));
  main.append(h('h2', { class: 'titulo-seccion' }, 'Qué controla'), zonaControla);

  // ---- Ingredientes ----
  const porIng = new Map();
  for (const p of productos) for (const x of p.ings) {
    if (!porIng.has(x.ing.id)) porIng.set(x.ing.id, { ing: x.ing, n: 0 });
    porIng.get(x.ing.id).n += 1;
  }
  const ings = [...porIng.values()].sort((a, b) => b.n - a.n || a.ing.nombre.localeCompare(b.ing.nombre, 'es'));
  if (ings.length) {
    main.append(h('h2', { class: 'titulo-seccion' }, 'Ingredientes activos'),
      h('div', { class: 'chips' }, ings.map((x) => h('a', {
        class: 'chip', href: ruta('buscar', { ing: x.ing.id }), title: `Ver los productos con ${x.ing.nombre}`,
      }, x.ing.nombre, h('small', null, String(x.n))))));
  }

  // ---- Productos ----
  main.append(h('h2', { class: 'titulo-seccion' }, `Productos (${productos.length})`),
    codigos.length === 1 ? h('p', null, h('a', { class: 'boton', href: ruta('buscar', { moa: codigos[0] }) }, icono('buscar'), 'Verlos en el buscador')) : null,
    productos.length ? h('div', { class: 'tarjeta gr-productos' }, h('table', { class: 'tabla-simple' },
      h('thead', null, h('tr', null, ['Producto', 'Empresa', 'Ingrediente activo', 'Tipo', 'Etiqueta'].map((t) => h('th', { scope: 'col' }, t)))),
      h('tbody', null, productos.map((p) => h('tr', null,
        h('td', { 'data-etiqueta': 'Producto' }, h('a', { href: ruta(`producto/${p.id}`) }, h('strong', null, p.nombre))),
        h('td', { 'data-etiqueta': 'Empresa' }, p.marca || '—'),
        h('td', { 'data-etiqueta': 'Ingrediente activo' }, p.ings.map((x) => x.ing.nombre).join(' + ') || '—'),
        h('td', { 'data-etiqueta': 'Tipo' }, tipoDe(p) || '—'),
        h('td', { 'data-etiqueta': 'Etiqueta' }, p.etiqueta && p.etiqueta.url
          ? h('a', { class: 'boton-etiqueta', href: p.etiqueta.url, target: '_blank', rel: 'noopener', title: 'Abrir la etiqueta (PDF)', 'aria-label': `Abrir la etiqueta de ${p.nombre} (PDF)` }, icono('pdfLleno'))
          : '—')))))) : h('p', { class: 'tenue' }, 'No hay productos de este grupo en el catálogo.'));

  // Lo que controlan llega de la base (las plagas, enfermedades y malezas de sus etiquetas).
  const objetivos = await queControlan(productos.map((p) => p.id));
  if (!ctx.vigente()) return;
  vaciar(zonaControla);
  if (!objetivos.length) {
    zonaControla.append(h('p', { class: 'tenue' }, 'Las etiquetas de estos productos no traen plagas, enfermedades ni malezas en los datos.'));
    return;
  }
  zonaControla.append(
    h('p', { class: 'gr-ayuda' }, `Lo que más nombran las etiquetas de estos productos (y en cuántos productos aparece). Toca uno para ver qué productos de ${codigos.length === 1 ? nombreClave(codigos[0]) : 'este grupo'} lo controlan.`),
    h('div', { class: 'chips' }, objetivos.slice(0, 30).map((o) => h('a', {
      class: 'chip', href: ruta('buscar', { oq: o.nombre, moa: codigos.length === 1 ? codigos[0] : '' }),
    }, o.nombre, h('small', null, String(o.n))))));
}
