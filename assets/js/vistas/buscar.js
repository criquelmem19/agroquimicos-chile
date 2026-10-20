// Portada: buscador único por producto, ingrediente activo, cultivo, objetivo y empresa.
import { buscar, normalizar } from '../buscador.js';
import { h, icono, ruta, plural, ingredientesTexto, retrasar, recortar, vaciar } from '../ui.js';

const MAX_INICIAL = 6;

function detalleObjetivo(o) {
  const partes = [];
  if (o.cientifico && !normalizar(o.nombre).includes(normalizar(o.cientifico))) partes.push(o.cientifico);
  partes.push(plural(o.nProductos, 'producto', 'productos'));
  return partes.join(' · ');
}

const GRUPOS = [
  {
    tipo: 'producto', titulo: 'Productos',
    enlace: (p) => ruta(`producto/${p.id}`),
    nombre: (p) => p.nombre,
    detalle: (p) => [ingredientesTexto(p), p.moa.join(' + '), p.registro ? `Reg. SAG ${p.registro}` : null].filter(Boolean).join(' · '),
  },
  {
    tipo: 'ingrediente', titulo: 'Ingredientes activos',
    enlace: (i) => ruta('productos', { ing: i.id }),
    nombre: (i) => i.nombre,
    detalle: (i) => [i.moa, i.grupoQuimico, plural(i.productos.length, 'producto', 'productos')].filter(Boolean).join(' · '),
  },
  {
    tipo: 'cultivo', titulo: 'Cultivos',
    enlace: (c) => ruta('aplicar', { cultivo: c.id }),
    nombre: (c) => recortar(c.nombre, 80),
    detalle: (c) => [plural(c.nProductos, 'producto', 'productos'), c.alias.length ? `también: ${c.alias.slice(0, 4).join(', ')}` : null].filter(Boolean).join(' · '),
  },
  {
    tipo: 'objetivo', titulo: 'Plagas, enfermedades y malezas',
    enlace: (o) => ruta('aplicar', { objetivo: o.id }),
    nombre: (o) => recortar(o.nombre, 90),
    detalle: detalleObjetivo,
  },
  {
    tipo: 'empresa', titulo: 'Empresas',
    enlace: (e) => ruta('productos', { empresa: e.id }),
    nombre: (e) => e.nombre,
    detalle: (e) => plural(e.productos.length, 'producto', 'productos'),
  },
];

function itemResultado(g, x) {
  return h('li', null, h('a', { class: 'resultado', href: g.enlace(x) },
    h('span', { class: 'resultado-texto' }, h('strong', null, g.nombre(x)), h('span', null, g.detalle(x))),
    icono('flecha')));
}

function pintarResultados(cont, cat, indice, consulta) {
  vaciar(cont);
  const { grupos, orden } = buscar(indice, consulta);
  const total = GRUPOS.reduce((n, g) => n + grupos[g.tipo].length, 0);
  if (!normalizar(consulta)) return;
  if (normalizar(consulta).length < 2) {
    cont.append(h('p', { class: 'ayuda-busqueda' }, 'Escribe al menos 2 letras.'));
    return;
  }
  if (!total) {
    cont.append(h('div', { class: 'vacio' },
      h('p', null, h('strong', null, `No encontramos «${consulta}».`)),
      h('p', { class: 'chico' }, 'Prueba con otra palabra, el nombre común o el ingrediente activo. Revisa que esté bien escrito.')));
    return;
  }
  cont.append(h('p', { class: 'oculto', 'aria-live': 'polite' }, `${total} resultados`));
  for (const tipo of orden) {
    const g = GRUPOS.find((x) => x.tipo === tipo);
    const lista = grupos[g.tipo];
    if (!lista.length) continue;
    const ul = h('ul', { class: 'lista-resultados' }, lista.slice(0, MAX_INICIAL).map((x) => itemResultado(g, x)));
    // Los objetivos vienen con muchas variantes ("Oídio", "Oidio:", con distinto nombre científico):
    // se ofrece verlos todos juntos.
    if (g.tipo === 'objetivo' && lista.length >= 2) {
      const t = consulta.trim();
      ul.prepend(h('li', null, h('a', { class: 'resultado', href: ruta('aplicar', { oq: t }) },
        h('span', { class: 'resultado-texto' },
          h('strong', null, `Ver juntos los ${lista.length} objetivos que dicen «${t}»`),
          h('span', null, 'En «¿Qué aplico?», con todos los productos y cultivos')),
        icono('flecha'))));
    }
    const bloque = h('section', { class: 'grupo-resultados' },
      h('h2', { class: 'titulo-seccion' }, g.titulo, h('span', { class: 'contador' }, `(${lista.length})`)), ul);
    if (lista.length > MAX_INICIAL) {
      const boton = h('button', { class: 'boton ver-mas', type: 'button' }, `Ver los ${lista.length}`);
      boton.addEventListener('click', () => {
        ul.append(...lista.slice(MAX_INICIAL).map((x) => itemResultado(g, x)));
        boton.remove();
      });
      bloque.append(boton);
    }
    cont.append(bloque);
  }
}

function accesos(cat) {
  const cultivosTop = [...cat.cultivos.values()]
    .filter((c) => c.nLineas >= 20 && c.nombre.length <= 30)
    .sort((a, b) => b.nLineas - a.nLineas)
    .slice(0, 12);
  return [
    h('div', { class: 'accesos' },
      h('a', { class: 'acceso', href: '#/aplicar' },
        h('span', { class: 'acceso-ico' }, icono('brote')),
        h('span', null, h('strong', null, '¿Qué puedo aplicar?'),
          h('span', null, 'Elige cultivo y plaga, enfermedad o maleza. Compara dosis, carencia y modo de acción para rotar.'))),
      h('a', { class: 'acceso', href: '#/productos' },
        h('span', { class: 'acceso-ico' }, icono('frasco')),
        h('span', null, h('strong', null, 'Productos'),
          h('span', null, `Los ${cat.productos.size} productos, con filtros por categoría, modo de acción y empresa.`))),
      h('a', { class: 'acceso', href: '#/estado' },
        h('span', { class: 'acceso-ico' }, icono('grafico')),
        h('span', null, h('strong', null, 'Estado de los datos'),
          h('span', null, 'Cuánto está completo y revisado. Importante: la carencia todavía falta en casi todas las líneas.')))),
    h('h2', { class: 'titulo-seccion' }, 'Cultivos con más registros'),
    h('div', { class: 'chips' }, cultivosTop.map((c) =>
      h('a', { class: 'chip', href: ruta('aplicar', { cultivo: c.id }) }, c.nombre, h('small', null, String(c.nProductos))))),
  ];
}

export function render(main, ctx) {
  const { cat, indice, params } = ctx;
  const inicial = params.get('q') || '';
  const entrada = h('input', {
    type: 'search', id: 'buscador', value: inicial, autocomplete: 'off', spellcheck: 'false',
    enterkeyhint: 'search', 'aria-describedby': 'buscador-ayuda',
    placeholder: 'Ej: oídio, cerezo, abamectina, Syngenta…',
  });
  const resultados = h('div', { 'aria-live': 'polite' });
  const extra = h('div', null, accesos(cat));

  const actualizar = () => {
    const q = entrada.value;
    pintarResultados(resultados, cat, indice, q);
    extra.hidden = normalizar(q).length >= 2;
  };
  entrada.addEventListener('input', retrasar(() => {
    actualizar();
    ctx.cambiarParams({ q: entrada.value.trim() });
  }, 120));
  entrada.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); entrada.blur(); }
  });

  main.append(
    h('section', { class: 'portada' },
      h('h1', null, 'Busca en las etiquetas de agroquímicos'),
      h('p', { class: 'bajada' }, 'Productos, ingredientes activos, cultivos, plagas, enfermedades, malezas y empresas. No importan las tildes ni las mayúsculas.'),
      h('div', { class: 'campo-busqueda' },
        h('label', { class: 'oculto', for: 'buscador' }, 'Buscar'),
        icono('buscar'), entrada),
      h('p', { class: 'ayuda-busqueda', id: 'buscador-ayuda' },
        `${plural(cat.productos.size, 'producto', 'productos')} · ${plural([...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase).length, 'cultivo', 'cultivos')} · ${plural([...cat.objetivos.values()].filter((o) => o.nLineas).length, 'objetivo', 'objetivos')}`)),
    resultados,
    extra);

  actualizar();
  if (!inicial && window.matchMedia('(min-width: 860px)').matches) entrada.focus();
}
