// Arranque del sitio y navegación entre secciones (rutas con # para que funcione en GitHub Pages).
import { cargarCatalogo } from './db.js';
import { h, icono, vaciar, fecha, mensajeError } from './ui.js';
import * as vistaInicio from './vistas/inicio.js';
import * as vistaProducto from './vistas/producto.js';
import * as vistaPlan from './vistas/plan.js';

const NOMBRE_SITIO = 'Agroquímicos CRM';

// Secciones del menú (titulo: el de la página; menu: el del menú de arriba; corto: el de la barra del celular).
// Para la Fase 3 (foro, cuenta) basta sumarlas aquí.
const SECCIONES = [
  { camino: '', titulo: '', menu: 'Inicio', corto: 'Inicio', icono: 'casa', vista: vistaInicio },
  { camino: 'plan', titulo: 'Plan de aplicaciones', menu: 'Plan de aplicaciones', corto: 'Plan', icono: 'calendario', vista: vistaPlan },
];
// Rutas que no van en el menú.
const OTRAS = { producto: vistaProducto };
// Secciones antiguas que ahora son el inicio (links guardados o compartidos): se abren ahí con sus filtros.
const ANTIGUAS = ['aplicar', 'productos', 'buscar'];

const principal = document.getElementById('vista');
let catalogo = null;
let caminoAnterior = null;
// Última dirección de la tabla del inicio (con sus filtros), para el botón «Volver» de la ficha.
let ultimoInicio = null;
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
        h('span', { class: 'nav-ico' }, icono(s.icono)), inferior ? s.corto : s.menu));
    }
  }
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

async function mostrar(evento) {
  if (evento && evento.oldURL) {
    const antes = evento.oldURL.slice(evento.oldURL.indexOf('#') + 1 || evento.oldURL.length);
    if (/^\/?(\?|$)/.test(antes)) ultimoInicio = `#${antes}`;
  }
  if (ANTIGUAS.includes(leerRuta().partes[0])) {
    const consulta = leerRuta().params.toString();
    history.replaceState(null, '', `#/${consulta ? `?${consulta}` : ''}`);
  }
  const { partes, params } = leerRuta();
  const clave = partes[0] || '';
  const seccion = SECCIONES.find((s) => s.camino === clave);
  const vista = seccion ? seccion.vista : OTRAS[clave];
  const miTurno = ++turno;
  const caminoNuevo = partes.join('/');
  const cambioDePagina = caminoNuevo !== caminoAnterior;
  caminoAnterior = caminoNuevo;

  pintarMenus(seccion ? seccion.camino : clave === 'producto' ? '' : null);
  vaciar(principal);
  principal.classList.toggle('vista-ancha', Boolean(vista && vista.ANCHA));

  if (catalogo.fechaCache) {
    principal.append(h('div', { class: 'nota nota-alerta', role: 'status' },
      `Sin conexión: estás viendo los datos guardados el ${fecha(catalogo.fechaCache)}. Pueden no estar al día.`));
  }

  if (!vista) {
    document.title = `Página no encontrada · ${NOMBRE_SITIO}`;
    principal.append(h('div', { class: 'vacio' }, h('h1', null, 'No encontramos esa página'),
      h('p', null, h('a', { href: '#/' }, 'Volver al inicio'))));
    return;
  }

  const contexto = {
    cat: catalogo,
    partes,
    params,
    volverInicio: ultimoInicio,
    vigente: () => miTurno === turno,
    // Cambia los parámetros de la dirección sin recargar la vista (para compartir el link tal cual).
    cambiarParams: (nuevos) => {
      const q = new URLSearchParams();
      for (const [k, v] of Object.entries(nuevos)) if (v != null && v !== '') q.set(k, v);
      const s = q.toString();
      history.replaceState(null, '', `#/${partes.map(encodeURIComponent).join('/')}${s ? `?${s}` : ''}`);
    },
    titulo: (t) => { document.title = t ? `${t} · ${NOMBRE_SITIO}` : NOMBRE_SITIO; },
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
  pintarMenus(leerRuta().partes[0] || '');
  try {
    catalogo = await cargarCatalogo();
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
