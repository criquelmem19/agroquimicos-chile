// Mezclas en el estanque (pedido de Cristóbal, 02-11-2026: «una vista y una tabla con la interacción de productos que
// explique que no se pueden mezclar todas las cosas de WP y EC»). Arriba, «Arma tu mezcla»: productos del catálogo en
// el orden de carga según su formulación, alertas (mismo código, productos que no van al estanque) y lo que dice cada
// etiqueta sobre compatibilidad (texto leído de la etiqueta, con su PDF). Abajo, el orden de carga, la tabla de
// formulaciones, por qué una mezcla sale mal y la prueba de la jarra: explicación general; la etiqueta siempre manda.
// Parámetros: p=<id>,<id>… (productos de la mezcla, para compartir el link).
import { detalleProducto, tipoFormulacion } from '../db.js';
import { filtrar, palabras } from '../buscador.js';
import { h, agregar, icono, ruta, limpio, recortar, vaciar, combo, linkPdf, chipsMoa } from '../ui.js';

const MAX_PRODUCTOS = 6;

// Orden de carga del estanque. Los productos van en los pasos 3 a 6 según su formulación.
const PASOS = [
  { n: 1, titulo: 'Agua y agitación', texto: 'Llenar el estanque hasta la mitad con agua limpia y prender la agitación.' },
  { n: 2, titulo: 'Correctores de agua', texto: 'Si se usan: correctores de pH o de dureza y antiespumante.' },
  { n: 3, titulo: 'Sólidos', texto: 'Bolsas hidrosolubles, gránulos (WG) y polvos (WP, SG). Los WP, premezclados en un balde.' },
  { n: 4, titulo: 'Suspensiones', texto: 'Líquidos con partículas: SC, CS, SE, ZC. Agitar bien el envase antes.' },
  { n: 5, titulo: 'Emulsiones y aceites', texto: 'EC, EW, ME y OD: quedan blancos o lechosos en el agua.' },
  { n: 6, titulo: 'Solubles', texto: 'SL: líquidos que se disuelven del todo.' },
  { n: 7, titulo: 'Coadyuvantes y completar', texto: 'Mojantes, adherentes y aceites al final. Completar con agua sin parar la agitación.' },
];

// Tipos de formulación: código(s), nombre, cómo es, paso de carga (null = no va al estanque) y cuidado.
const FORMULACIONES = [
  { codigos: ['WP'], nombre: 'Polvo mojable', como: 'Polvo que no se disuelve: queda suspendido en el agua.', paso: 3, cuidado: 'Premezclar en un balde con poca agua hasta formar una pasta. Puede tapar filtros si la agitación es poca.' },
  { codigos: ['WG', 'WDG', 'DF'], nombre: 'Gránulos dispersables', como: 'Gránulos que se deshacen en el agua.', paso: 3, cuidado: 'Echar de a poco con agitación y esperar que se deshagan antes de seguir.' },
  { codigos: ['SG', 'SP'], nombre: 'Gránulos o polvo soluble', como: 'Se disuelven del todo en el agua.', paso: 3, cuidado: 'Esperar que se disuelvan completos.' },
  { codigos: ['SC'], nombre: 'Suspensión concentrada', como: 'Líquido espeso con partículas sólidas muy finas.', paso: 4, cuidado: 'Agitar el envase antes de usar: se asienta si queda quieto.' },
  { codigos: ['CS'], nombre: 'Suspensión de cápsulas', como: 'Microcápsulas con el ingrediente adentro, en agua.', paso: 4, cuidado: 'Agitar el envase antes de usar.' },
  { codigos: ['SE', 'ZC'], nombre: 'Suspoemulsión y mezclas', como: 'Mezcla de partículas y gotitas de aceite (SE) o de cápsulas y partículas (ZC).', paso: 4, cuidado: 'Agitar el envase antes de usar.' },
  { codigos: ['OD'], nombre: 'Dispersión en aceite', como: 'Partículas sólidas en aceite.', paso: 5, cuidado: 'Agitar el envase antes de usar.' },
  { codigos: ['EC'], nombre: 'Concentrado emulsionable', como: 'Ingrediente disuelto en un solvente: en el agua se pone blanco lechoso.', paso: 5, cuidado: 'Si se echa antes que los polvos o gránulos, puede formar grumos con ellos.' },
  { codigos: ['EW', 'ME'], nombre: 'Emulsión en agua y microemulsión', como: 'Gotitas de aceite ya repartidas en agua.', paso: 5, cuidado: 'Agitar el envase antes de usar.' },
  { codigos: ['SL'], nombre: 'Concentrado soluble', como: 'Líquido que se disuelve del todo en el agua.', paso: 6, cuidado: 'Suele ser el más fácil de mezclar.' },
  { codigos: ['DP', 'GR', 'GB', 'RB', 'TB', 'FS', 'WS', 'DS', 'UL'], nombre: 'No van al estanque', como: 'Polvo para espolvorear (DP), granulado (GR), cebos (GB, RB), tabletas (TB), tratamiento de semillas (FS, WS, DS) o ultra bajo volumen (UL).', paso: null, cuidado: 'Se aplican como dice su etiqueta, sin mezclarlos con agua en el estanque.' },
];
const POR_CODIGO = new Map(FORMULACIONES.flatMap((f) => f.codigos.map((c) => [c, f])));

const PROBLEMAS = [
  { icono: 'frasco', titulo: 'Se corta o hace grumos', texto: 'Grumos, espuma, natas o sedimento que tapan filtros y boquillas. Pasa más con el orden equivocado, poca agua o poca agitación.' },
  { icono: 'alerta', titulo: 'Un producto daña al otro', texto: 'Por ejemplo, el agua muy alcalina (pH alto) puede descomponer algunos insecticidas en pocas horas.' },
  { icono: 'brote', titulo: 'Quema el cultivo', texto: 'Algunas mezclas dañan la planta aunque cada producto solo no lo haga. Muchas etiquetas advierten no aplicar aceite cerca de una aplicación de azufre.' },
  { icono: 'escudo', titulo: 'Uno le quita fuerza al otro', texto: 'Por ejemplo, algunos herbicidas de hoja ancha (HRAC 4) le bajan el efecto a los graminicidas (HRAC 1) si van juntos.' },
];

const JARRA = [
  'En un frasco transparente de 1 litro, agua del mismo pozo o canal que se va a usar.',
  'Echar cada producto en la misma proporción que en el estanque y en el mismo orden. Si al estanque de 1.000 L van 500 cc, al frasco de 1 L van 0,5 cc.',
  'Tapar, agitar y dejar reposar 15 a 30 minutos.',
  'Mirar: si hay grumos, natas, aceite separado, sedimento o se calienta, no mezclar.',
  'Si sale bien, aplicar el mismo día y sin parar la agitación.',
];

const RAPIDAS = [
  'Nunca dos productos del mismo código en la misma mezcla: para la plaga es un solo golpe.',
  'La carencia de la mezcla es la más larga de sus productos. Lo mismo el reingreso.',
  'Mientras más productos, más riesgo de que la mezcla salga mal.',
  'Preparar solo lo que se va a aplicar ese día.',
];

// Productos que se pueden elegir: los que se usan en Chile. Palabras para buscarlos por nombre, empresa o ingrediente.
const palabrasDe = new WeakMap();
function palabrasProducto(p) {
  if (!palabrasDe.has(p)) palabrasDe.set(p, palabras(`${p.nombre} ${p.marca || ''} ${p.ings.map((x) => x.ing.nombre).join(' ')} ${tipoFormulacion(p) || ''}`));
  return palabrasDe.get(p);
}

const formulacionDe = (p) => POR_CODIGO.get(String(tipoFormulacion(p) || '').toUpperCase()) || null;

function capa(p) {
  const tipo = tipoFormulacion(p);
  const f = formulacionDe(p);
  return h('li', { class: `mz-capa mz-paso-${f && f.paso ? f.paso : 'x'}` },
    h('span', { class: 'mz-capa-n' }, f && f.paso ? String(f.paso) : '?'),
    h('span', { class: 'mz-capa-texto' },
      h('a', { href: `#/producto/${p.id}` }, p.nombre),
      h('small', null, f ? `${tipo} · ${f.nombre}` : tipo ? `${tipo} · tipo no reconocido` : 'Sin tipo de formulación en los datos')),
    chipsMoa(p.moa, p.moaEtiqueta));
}

function alertas(productos) {
  const lista = [];
  const porFamilia = new Map();
  for (const p of productos) for (const k of p.familias) porFamilia.set(k, [...(porFamilia.get(k) || []), p.nombre]);
  for (const [k, nombres] of porFamilia) {
    if (nombres.length > 1) lista.push(['peligro', [h('strong', null, `Mismo código ${k}: `), `${nombres.join(' y ')}. En la misma mezcla son un solo golpe para la plaga; cambia uno por otro código.`]]);
  }
  for (const p of productos) {
    const f = formulacionDe(p);
    if (f && !f.paso) lista.push(['peligro', [h('strong', null, `${p.nombre}: `), `no va al estanque (${tipoFormulacion(p)}). ${f.cuidado}`]]);
    else if (!f) lista.push(['alerta', [h('strong', null, `${p.nombre}: `), 'no sabemos su tipo de formulación. Revisa en la etiqueta en qué paso va.']]);
  }
  if (productos.length >= 4) lista.push(['alerta', [h('strong', null, `${productos.length} productos: `), 'mientras más productos, más riesgo de que la mezcla salga mal. Haz la prueba de la jarra.']]);
  return lista.length
    ? h('ul', { class: 'mz-alertas' }, lista.map(([nivel, texto]) => h('li', { class: `nota nota-${nivel}` }, icono('alerta'), h('span', null, texto))))
    : h('p', { class: 'mz-ok' }, icono('check'), 'Sin códigos repetidos ni productos fuera del estanque. Igual revisa las etiquetas y haz la prueba de la jarra.');
}

// Lo que dice cada etiqueta sobre mezclas (texto leído automáticamente de la etiqueta).
function etiquetas(productos, cuando) {
  const zona = h('div', { class: 'mz-etiquetas' });
  for (const p of productos) {
    const caja = h('article', { class: 'mz-etiqueta' },
      h('h4', null, p.nombre),
      h('p', { class: 'tenue chico' }, 'Buscando lo que dice la etiqueta…'));
    zona.append(caja);
    detalleProducto(p.id).then((d) => {
      if (!cuando()) return;
      const perfil = d.perfil || {};
      const campos = [['Compatibilidad', perfil.compatibility], ['Incompatibilidad', perfil.incompatibility],
        ['Preparación', perfil.mix_preparation], ['Fitotoxicidad', perfil.phytotoxicity]].filter(([, t]) => limpio(t));
      vaciar(caja).append(h('h4', null, p.nombre),
        campos.length ? h('dl', null, campos.map(([t, texto]) => h('div', null, h('dt', null, t), h('dd', null, recortar(texto, 320)))))
          : h('p', { class: 'chico' }, 'No tenemos el texto de mezclas de esta etiqueta: revisa el PDF.'),
        h('p', { class: 'mz-etiqueta-pie' },
          h('span', { class: 'etiqueta etq-auto' }, 'Extraído automáticamente'),
          p.etiqueta ? linkPdf(p.etiqueta.url, null, 'Ver etiqueta') : h('span', { class: 'pdf-falta' }, 'Sin PDF')));
    }, () => {
      if (!cuando()) return;
      vaciar(caja).append(h('h4', null, p.nombre), h('p', { class: 'chico' }, 'No se pudo leer la etiqueta. Revisa tu conexión.'));
    });
  }
  return zona;
}

function armar(cat, ctx) {
  const elegidos = (ctx.params.get('p') || '').split(',').map((id) => cat.productos.get(id)).filter(Boolean).slice(0, MAX_PRODUCTOS);
  const zona = h('section', { class: 'mz-armar', 'aria-labelledby': 'mz-armar-t' });
  let version = 0;

  const pintar = () => {
    const mia = ++version;
    ctx.cambiarParams({ p: elegidos.map((p) => p.id).join(',') });
    vaciar(zona);
    const disponibles = [...cat.productos.values()].filter((p) => !p.noDisponible && !elegidos.includes(p));
    const buscador = elegidos.length < MAX_PRODUCTOS ? combo({
      id: 'mz-producto', titulo: elegidos.length ? 'Agregar otro producto' : 'Agrega los productos de tu mezcla',
      placeholder: 'Ej: Tecto, Movento, cobre',
      opciones: (t) => (limpio(t) ? filtrar(disponibles, t, palabrasProducto, (p) => p.nLineas || 0, 20)
        : [...disponibles].sort((a, b) => (b.nLineas || 0) - (a.nLineas || 0)).slice(0, 8))
        .map((p) => ({ etiqueta: p.nombre, detalle: [tipoFormulacion(p), p.marca].filter(Boolean).join(' · '), accion: () => { elegidos.push(p); pintar(); setTimeout(() => document.getElementById('mz-producto')?.focus(), 0); } })),
    }) : h('p', { class: 'tenue' }, `Máximo ${MAX_PRODUCTOS} productos.`);

    // Estanque: abajo el agua, encima cada producto en su orden de carga y arriba completar con agua.
    const ordenados = [...elegidos].sort((a, b) => ((formulacionDe(a) || {}).paso || 9) - ((formulacionDe(b) || {}).paso || 9));
    const estanque = h('ol', { class: 'mz-estanque', 'aria-label': 'Orden de carga del estanque, de abajo hacia arriba' },
      h('li', { class: 'mz-capa mz-agua' }, h('span', { class: 'mz-capa-n' }, '1'), h('span', { class: 'mz-capa-texto' }, h('strong', null, 'Agua hasta la mitad'), h('small', null, 'y prender la agitación'))),
      ordenados.map(capa),
      h('li', { class: 'mz-capa mz-agua mz-agua-final' }, h('span', { class: 'mz-capa-n' }, '7'), h('span', { class: 'mz-capa-texto' }, h('strong', null, 'Coadyuvantes y completar con agua'), h('small', null, 'sin parar la agitación'))));

    agregar(zona, [
      h('h2', { id: 'mz-armar-t' }, 'Arma tu mezcla'),
      h('div', { class: 'mz-armar-cuerpo' },
        h('div', { class: 'mz-armar-izq' },
          buscador,
          elegidos.length ? h('ul', { class: 'mz-elegidos' }, elegidos.map((p) => h('li', null,
            h('span', null, p.nombre, h('small', null, tipoFormulacion(p) || 'sin tipo')),
            h('button', { type: 'button', class: 'combo-quitar', 'aria-label': `Quitar ${p.nombre}`, title: 'Quitar', onclick: () => { elegidos.splice(elegidos.indexOf(p), 1); pintar(); } }, icono('cerrar'))))) : null,
          elegidos.length ? alertas(elegidos) : h('p', { class: 'tenue' }, 'Busca por nombre, empresa o ingrediente. Verás en qué orden va cada uno al estanque y qué dice su etiqueta sobre mezclas.')),
        h('div', { class: 'mz-armar-der' },
          h('p', { class: 'md-rotulo' }, 'Orden de carga (de abajo hacia arriba)'),
          estanque)),
      elegidos.length ? [h('h3', { class: 'mz-subtitulo' }, 'Lo que dice cada etiqueta'), etiquetas(elegidos, () => mia === version && zona.isConnected)] : null]);
  };
  pintar();
  return zona;
}

export async function render(main, ctx) {
  const { cat } = ctx;
  main.append(h('div', { class: 'mz' },
    h('header', { class: 'mz-cabeza' },
      h('h1', null, 'Mezclas en el estanque'),
      h('p', { class: 'md-bajada' }, 'No todo se puede echar junto. El tipo de formulación (WP, SC, EC…) dice en qué orden va cada producto, y la etiqueta dice con qué no se mezcla.')),
    armar(cat, ctx),

    h('section', { class: 'md-seccion', 'aria-labelledby': 'mz-orden-t' },
      h('h2', { id: 'mz-orden-t' }, 'Orden de carga'),
      h('ol', { class: 'mz-pasos' }, PASOS.map((p) => h('li', null,
        h('span', { class: `mz-paso-n mz-paso-${p.n}` }, String(p.n)),
        h('div', null, h('h3', null, p.titulo), h('p', null, p.texto))))),
      h('p', { class: 'md-nota' }, 'Esperar que cada producto se reparta bien antes de echar el siguiente. Si la etiqueta indica otro orden, manda la etiqueta. Fertilizantes foliares y bioestimulantes: según su etiqueta y con prueba de la jarra.')),

    h('section', { class: 'md-seccion', 'aria-labelledby': 'mz-tipos-t' },
      h('h2', { id: 'mz-tipos-t' }, 'Tipos de formulación'),
      h('p', { class: 'md-intro' }, 'Las letras después del nombre del producto (TECTO 500 SC, PUNTO 70 WP) dicen cómo viene. Eso decide en qué paso va.'),
      h('div', { class: 'md-tabla' }, h('table', { class: 'tabla-simple mz-tabla' },
        h('thead', null, h('tr', null, ['Código', 'Nombre', 'Cómo es', 'Paso', 'Cuidado'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, FORMULACIONES.map((f) => h('tr', null,
          h('td', { 'data-etiqueta': 'Código' }, h('div', { class: 'mz-codigos' }, f.codigos.map((c) => h('span', { class: 'mz-codigo' }, c)))),
          h('td', { 'data-etiqueta': 'Nombre' }, h('strong', null, f.nombre)),
          h('td', { 'data-etiqueta': 'Cómo es' }, f.como),
          h('td', { 'data-etiqueta': 'Paso' }, f.paso ? h('span', { class: `mz-paso-chico mz-paso-${f.paso}` }, String(f.paso)) : 'No va'),
          h('td', { 'data-etiqueta': 'Cuidado' }, f.cuidado))))))),

    h('section', { class: 'md-seccion', 'aria-labelledby': 'mz-mal-t' },
      h('h2', { id: 'mz-mal-t' }, 'Por qué una mezcla sale mal'),
      h('div', { class: 'md-importa' }, PROBLEMAS.map((x) => h('div', { class: 'md-importa-item' },
        icono(x.icono), h('div', null, h('h3', null, x.titulo), h('p', null, x.texto)))))),

    h('section', { class: 'md-seccion', 'aria-labelledby': 'mz-jarra-t' },
      h('h2', { id: 'mz-jarra-t' }, 'Prueba de la jarra'),
      h('div', { class: 'mz-jarra' },
        h('ol', { class: 'mz-jarra-pasos' }, JARRA.map((t) => h('li', null, t))),
        h('ul', { class: 'mz-rapidas' }, RAPIDAS.map((t) => h('li', null, icono('check'), h('span', null, t)))))),

    h('p', { class: 'md-fuente' }, 'Explicación general. La etiqueta de cada producto manda: compatibilidad, orden, dosis y carencia. ',
      h('a', { href: ruta('buscar') }, 'Buscar productos'))));
}
