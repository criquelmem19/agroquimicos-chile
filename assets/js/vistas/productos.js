// Lista de productos con filtros por categoría, grupo de modo de acción, empresa e ingrediente.
// Parámetros: cat=<id>, moa=<clave>|sin, empresa=<id>, ing=<id>, q=<texto>, orden=nombre|lineas
import { compararMoa } from '../db.js';
import { palabras, puntaje } from '../buscador.js';
import {
  h, ruta, plural, vaciar, retrasar, chipsMoa, ingredientesTexto, etiquetasCategoria, linkPdf, limpio,
} from '../ui.js';

const POR_PAGINA = 60;

function rolesTexto(roles) {
  return [...new Set(roles)].join(', ');
}

function tarjeta(p) {
  const principal = p.empresas[0];
  return h('article', { class: 'tarjeta ficha-mini' },
    p.categorias.length ? h('div', { class: 'chips' }, etiquetasCategoria(p)) : null,
    h('h3', null, h('a', { href: ruta(`producto/${p.id}`) }, p.nombre)),
    h('div', { class: 'linea-datos' }, [p.registro ? `Reg. SAG ${p.registro}` : 'Sin N° de registro en los datos', p.formulacion || p.formulacionCodigo].filter(Boolean).join(' · ')),
    h('div', { class: 'linea-datos' }, ingredientesTexto(p)),
    chipsMoa(p.moa),
    principal ? h('div', { class: 'linea-datos' }, `${principal.empresa.nombre} (${rolesTexto(principal.roles)})`) : null,
    h('div', { class: 'pie-ficha' },
      h('span', null, p.nLineas ? `${plural(p.nLineas, 'línea de uso', 'líneas de uso')} en ${plural(p.nCultivos, 'cultivo', 'cultivos')}` : 'Sin líneas de uso extraídas'),
      linkPdf(p.etiqueta && p.etiqueta.url)));
}

function opcion(valor, texto, actual) {
  return h('option', { value: valor, selected: String(actual || '') === String(valor) }, texto);
}

export function render(main, ctx) {
  const { cat, params } = ctx;
  const estado = {
    cat: params.get('cat') || '',
    moa: params.get('moa') || '',
    empresa: params.get('empresa') || '',
    ing: params.get('ing') || '',
    q: params.get('q') || '',
    orden: params.get('orden') === 'lineas' ? 'lineas' : 'nombre',
  };
  const todos = [...cat.productos.values()];

  // Selectores con la cantidad de productos de cada opción.
  const selCategoria = h('select', { class: 'selector', id: 'f-cat' },
    opcion('', 'Todas', estado.cat),
    [...cat.categorias.values()].map((c) => {
      const n = todos.filter((p) => p.categorias.includes(c)).length;
      return n ? opcion(c.id, `${c.nombre} (${n})`, estado.cat) : null;
    }));
  const claves = [...cat.gruposMoa.keys()].sort(compararMoa);
  const sinGrupo = todos.filter((p) => !p.moa.length).length;
  const selMoa = h('select', { class: 'selector', id: 'f-moa' },
    opcion('', 'Todos', estado.moa),
    claves.map((k) => opcion(k, `${k} (${cat.gruposMoa.get(k).productos.length})`, estado.moa)),
    sinGrupo ? opcion('sin', `Sin grupo informado (${sinGrupo})`, estado.moa) : null);
  const selEmpresa = h('select', { class: 'selector', id: 'f-empresa' },
    opcion('', 'Todas', estado.empresa),
    [...cat.empresas.values()].filter((e) => e.productos.length)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((e) => opcion(e.id, `${e.nombre} (${new Set(e.productos).size})`, estado.empresa)));
  const texto = h('input', { class: 'entrada', id: 'f-q', type: 'search', value: estado.q, placeholder: 'Nombre o ingrediente', autocomplete: 'off' });
  const selOrden = h('select', { class: 'selector', 'aria-label': 'Ordenar' },
    opcion('nombre', 'Ordenar por nombre', estado.orden), opcion('lineas', 'Más líneas de uso primero', estado.orden));

  const activos = h('div', { class: 'filtros-activos' });
  const contador = h('p', { class: 'resumen', 'aria-live': 'polite' });
  const lista = h('div', { class: 'lista-productos' });
  const masZona = h('div');

  const pintar = () => {
    ctx.cambiarParams({ cat: estado.cat, moa: estado.moa, empresa: estado.empresa, ing: estado.ing, q: estado.q, orden: estado.orden === 'nombre' ? '' : estado.orden });
    const q = palabras(estado.q);
    const ing = estado.ing ? cat.ingredientes.get(estado.ing) : null;
    const filtrados = todos.filter((p) => {
      if (estado.cat && !p.categorias.some((c) => String(c.id) === estado.cat)) return false;
      if (estado.moa === 'sin' && p.moa.length) return false;
      if (estado.moa && estado.moa !== 'sin' && !p.moa.includes(estado.moa)) return false;
      if (estado.empresa && !p.empresas.some((e) => e.empresa.id === estado.empresa)) return false;
      if (estado.ing && !p.ings.some((x) => x.ing.id === estado.ing)) return false;
      if (q.length) {
        const pal = p.palabras.concat(...p.ings.map((x) => palabras(x.ing.nombre)));
        if (!puntaje(q, pal)) return false;
      }
      return true;
    }).sort((a, b) => (estado.orden === 'lineas' ? b.nLineas - a.nLineas : 0) || a.nombre.localeCompare(b.nombre, 'es'));

    vaciar(activos);
    if (ing) {
      activos.append(h('span', { class: 'chico tenue' }, 'Ingrediente:'),
        h('button', { type: 'button', class: 'chip', 'aria-pressed': 'true', onclick: () => { estado.ing = ''; pintar(); } },
          ing.nombre, h('small', null, '✕ quitar')));
    }
    contador.textContent = filtrados.length === todos.length
      ? `${plural(todos.length, 'producto', 'productos')}`
      : `${plural(filtrados.length, 'producto', 'productos')} de ${todos.length}`;

    vaciar(lista);
    vaciar(masZona);
    if (!filtrados.length) {
      lista.append(h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'Ningún producto cumple esos filtros.')),
        h('button', { class: 'boton', type: 'button', onclick: limpiarTodo }, 'Quitar filtros')));
      return;
    }
    let mostrados = 0;
    const mostrarMas = () => {
      lista.append(...filtrados.slice(mostrados, mostrados + POR_PAGINA).map(tarjeta));
      mostrados += POR_PAGINA;
      vaciar(masZona);
      if (mostrados < filtrados.length) {
        masZona.append(h('button', { class: 'boton ver-mas', type: 'button', onclick: mostrarMas }, `Ver ${Math.min(POR_PAGINA, filtrados.length - mostrados)} más`));
      }
    };
    mostrarMas();
  };

  function limpiarTodo() {
    Object.assign(estado, { cat: '', moa: '', empresa: '', ing: '', q: '' });
    selCategoria.value = ''; selMoa.value = ''; selEmpresa.value = ''; texto.value = '';
    pintar();
  }

  selCategoria.addEventListener('change', () => { estado.cat = selCategoria.value; pintar(); });
  selMoa.addEventListener('change', () => { estado.moa = selMoa.value; pintar(); });
  selEmpresa.addEventListener('change', () => { estado.empresa = selEmpresa.value; pintar(); });
  selOrden.addEventListener('change', () => { estado.orden = selOrden.value; pintar(); });
  texto.addEventListener('input', retrasar(() => { estado.q = limpio(texto.value); pintar(); }, 150));

  main.append(
    h('h1', null, 'Productos'),
    h('div', { class: 'filtros', role: 'search' },
      h('label', { for: 'f-cat' }, 'Categoría', selCategoria),
      h('label', { for: 'f-moa' }, 'Modo de acción', selMoa),
      h('label', { for: 'f-empresa' }, 'Empresa', selEmpresa),
      h('label', { for: 'f-q' }, 'Texto', texto)),
    activos,
    h('div', { class: 'barra-herramientas' }, contador, selOrden),
    lista,
    masZona);
  pintar();
}
