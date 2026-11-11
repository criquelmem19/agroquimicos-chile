// Productos guardados (#/guardados, 11-11-2026): la misma tabla del buscador con los productos que la persona guardó,
// agrupados por categoría (fungicidas, insecticidas, acaricidas, herbicidas y el resto).
import { cultivosVisibles } from '../db.js';
import { h, plural, vaciar } from '../ui.js';
import { usuario, guardados, alCambiarCuenta, cuentaLista, rutaCuenta } from '../cuenta.js';
import { tabla, fila } from './inicio.js';

export const ANCHA = true;

const ORDEN = ['fungicida', 'insecticida', 'acaricida', 'herbicida'];
const SIN_CATEGORIA = 'Sin categoría';
const comparar = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true });

// Plural simple: «Fungicida» → «Fungicidas», «Regulador de crecimiento» → «Reguladores de crecimiento».
function enPlural(nombre) {
  if (nombre === SIN_CATEGORIA) return nombre;
  const [primera, ...resto] = nombre.split(' ');
  const p = /[aeiou]$/i.test(primera) ? `${primera}s` : `${primera}es`;
  return [p, ...resto].join(' ');
}

function rangoCategoria(nombre) {
  if (nombre === SIN_CATEGORIA) return 1000;
  const i = ORDEN.indexOf(nombre.toLowerCase());
  return i >= 0 ? i : 100;
}

function filaCategoria(nombre, n, columnas) {
  return h('tr', { class: 'fila-seccion grupo-sin' }, h('td', { colspan: String(columnas) },
    h('div', { class: 'seccion-titulo' },
      h('span', { class: 'seccion-nombre' }, enPlural(nombre)),
      h('span', { class: 'grupo-cuenta' }, plural(n, 'producto', 'productos')))));
}

export async function render(main, ctx) {
  const { cat } = ctx;
  ctx.titulo('Productos guardados');
  // Espera (poco) a saber si ya hay sesión guardada, para no pedir que entre a quien ya entró.
  await Promise.race([cuentaLista(), new Promise((r) => setTimeout(r, 2500))]);
  if (!ctx.vigente()) return;
  const zona = h('div');
  main.append(h('h1', { class: 'titulo-inicio' }, 'Productos guardados'), zona);

  const pintar = () => {
    vaciar(zona);
    if (!usuario()) {
      zona.append(h('div', { class: 'vacio' },
        h('p', null, h('strong', null, 'Entra o crea tu cuenta para guardar productos y verlos aquí')),
        h('a', { class: 'boton boton-primario', href: rutaCuenta('#/guardados') }, 'Entrar o crear cuenta')));
      return;
    }
    const productos = [...guardados().keys()].map((id) => cat.productos.get(id)).filter((p) => p && !p.oculto);
    if (!productos.length) {
      zona.append(h('div', { class: 'vacio' },
        h('p', null, h('strong', null, 'Todavía no guardas productos')),
        h('p', null, 'En el buscador, toca el marcador de un producto para dejarlo aquí'),
        h('a', { class: 'boton boton-primario', href: '#/buscar' }, 'Ir al buscador')));
      return;
    }
    const porCategoria = new Map();
    for (const p of productos) {
      const nombre = (p.categorias[0] && p.categorias[0].nombre) || SIN_CATEGORIA;
      if (!porCategoria.has(nombre)) porCategoria.set(nombre, []);
      porCategoria.get(nombre).push(p);
    }
    const nombres = [...porCategoria.keys()].sort((a, b) => rangoCategoria(a) - rangoCategoria(b) || comparar(a, b));
    const cuerpo = tabla({ clave: null, descendente: false }, null);
    const tbody = cuerpo.querySelector('tbody');
    const columnas = cuerpo.querySelectorAll('col').length;
    const op = { cultivoId: null, agrupar: false };
    for (const nombre of nombres) {
      const lista = porCategoria.get(nombre).sort((a, b) => comparar(a.nombre, b.nombre));
      tbody.append(filaCategoria(nombre, lista.length, columnas));
      for (const p of lista) {
        const info = { cultivos: cultivosVisibles(cat, p.cultivoIds).sort((a, b) => b.nProductos - a.nProductos || comparar(a.nombre, b.nombre)) };
        tbody.append(fila(p, info, op));
      }
    }
    zona.append(h('div', { class: 'barra-tabla' }, h('p', { class: 'cuenta', 'aria-live': 'polite' },
      h('strong', null, plural(productos.length, 'producto guardado', 'productos guardados')))), cuerpo);
  };

  pintar();
  // Al guardar o quitar un producto (o cambiar la sesión) la página se vuelve a dibujar.
  const dejar = alCambiarCuenta(() => { if (ctx.vigente()) pintar(); else dejar(); });
}
