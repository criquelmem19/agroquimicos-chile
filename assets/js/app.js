// Arranque del sitio y navegación entre secciones (rutas con # para que funcione en GitHub Pages).
import { cargarCatalogo } from './db.js';
import { construirIndice } from './buscador.js';
import { h, icono, vaciar, fecha, mensajeError } from './ui.js';
import * as vistaBuscar from './vistas/buscar.js';
import * as vistaAplicar from './vistas/aplicar.js';
import * as vistaProductos from './vistas/productos.js';
import * as vistaProducto from './vistas/producto.js';
import * as vistaEstado from './vistas/estado.js';

// Secciones del menú. Para la Fase 3 (planes de manejo, foro, cuenta) basta sumarlas aquí.
const SECCIONES = [
  { camino: '', titulo: 'Buscar', corto: 'Buscar', icono: 'buscar', vista: vistaBuscar },
  { camino: 'aplicar', titulo: '¿Qué aplico?', corto: 'Qué aplico', icono: 'brote', vista: vistaAplicar },
  { camino: 'productos', titulo: 'Productos', corto: 'Productos', icono: 'frasco', vista: vistaProductos },
  { camino: 'estado', titulo: 'Estado de datos', corto: 'Estado', icono: 'grafico', vista: vistaEstado },
];
// Rutas que no van en el menú.
const OTRAS = { producto: vistaProducto };

const principal = document.getElementById('vista');
let catalogo = null;
let indice = null;
let caminoAnterior = null;
let turno = 0;

function leerRuta() {
  const sinNumeral = location.hash.replace(/^#\/?/, '');
  const corte = sinNumeral.indexOf('?');
  const camino = corte === -1 ? sinNumeral : sinNumeral.slice(0, corte);
  const consulta = corte === -1 ? '' : sinNumeral.slice(corte + 1);
  return { partes: camino.split('/').filter(Boolean).map(decodeURIComponent), params: new URLSearchParams(consulta), camino };
}

function pintarMenus(actual) {
  for (const nav of document.querySelectorAll('[data-nav]')) {
    const inferior = nav.classList.contains('nav-inf');
    vaciar(nav);
    for (const s of SECCIONES) {
      nav.append(h('a', { href: `#/${s.camino}`, 'aria-current': s.camino === actual ? 'page' : null },
        icono(s.icono), inferior ? s.corto : s.titulo));
    }
  }
}

function temaActual() {
  const t = document.documentElement.dataset.theme;
  if (t) return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

function pintarBotonTema() {
  const b = document.querySelector('[data-tema]');
  const oscuro = temaActual() === 'oscuro';
  b.replaceChildren(icono(oscuro ? 'sol' : 'luna'));
  b.setAttribute('aria-label', oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
  b.title = oscuro ? 'Modo claro' : 'Modo oscuro';
}

function prepararTema() {
  const b = document.querySelector('[data-tema]');
  b.addEventListener('click', () => {
    const nuevo = temaActual() === 'oscuro' ? 'claro' : 'oscuro';
    document.documentElement.dataset.theme = nuevo;
    try { localStorage.setItem('tema', nuevo); } catch (e) { /* sin almacenamiento */ }
    pintarBotonTema();
  });
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', pintarBotonTema);
  pintarBotonTema();
}

function pintarPie() {
  const p = document.querySelector('[data-actualizado]');
  if (!p || !catalogo) return;
  if (catalogo.fechaCache) {
    p.textContent = `Sin conexión: se muestran los datos guardados en este equipo el ${fecha(catalogo.fechaCache)}.`;
  } else {
    p.textContent = catalogo.actualizado ? `Última actualización de los datos: ${fecha(catalogo.actualizado)}.` : '';
  }
}

async function mostrar() {
  const { partes, params } = leerRuta();
  const clave = partes[0] || '';
  const seccion = SECCIONES.find((s) => s.camino === clave);
  const vista = seccion ? seccion.vista : OTRAS[clave];
  const miTurno = ++turno;
  const caminoNuevo = partes.join('/');
  const cambioDePagina = caminoNuevo !== caminoAnterior;
  caminoAnterior = caminoNuevo;

  pintarMenus(seccion ? seccion.camino : clave === 'producto' ? 'productos' : null);
  vaciar(principal);

  if (catalogo.fechaCache) {
    principal.append(h('div', { class: 'nota nota-alerta', role: 'status' },
      `Sin conexión: estás viendo los datos guardados el ${fecha(catalogo.fechaCache)}. Pueden no estar al día.`));
  }

  if (!vista) {
    document.title = 'Página no encontrada · Agroquímicos Chile';
    principal.append(h('div', { class: 'vacio' }, h('h1', null, 'No encontramos esa página'),
      h('p', null, h('a', { href: '#/' }, 'Volver al buscador'))));
    return;
  }

  const contexto = {
    cat: catalogo,
    indice,
    partes,
    params,
    vigente: () => miTurno === turno,
    // Cambia los parámetros de la dirección sin recargar la vista (para compartir el link tal cual).
    cambiarParams: (nuevos) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(nuevos)) if (v != null && v !== '') q.set(k, v);
      const s = q.toString();
      history.replaceState(null, '', `#/${partes.map(encodeURIComponent).join('/')}${s ? `?${s}` : ''}`);
    },
    titulo: (t) => { document.title = t ? `${t} · Agroquímicos Chile` : 'Agroquímicos Chile'; },
  };
  contexto.titulo(seccion ? (seccion.camino ? seccion.titulo : '') : '');

  if (cambioDePagina) {
    window.scrollTo(0, 0);
    if (document.activeElement && document.activeElement !== document.body) principal.focus({ preventScroll: true });
  }

  try {
    await vista.render(principal, contexto);
  } catch (err) {
    if (miTurno !== turno) return;
    console.error(err);
    principal.append(mensajeError(err));
  }
}

async function iniciar() {
  prepararTema();
  pintarMenus(leerRuta().partes[0] || '');
  try {
    catalogo = await cargarCatalogo();
    indice = construirIndice(catalogo);
  } catch (err) {
    console.error(err);
    vaciar(principal).append(mensajeError(err));
    return;
  }
  pintarPie();
  window.addEventListener('hashchange', mostrar);
  mostrar();
}

iniciar();
