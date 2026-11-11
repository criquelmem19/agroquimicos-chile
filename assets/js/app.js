// Arranque del sitio y navegación entre secciones (rutas con # para que funcione en GitHub Pages).
import { cargarCatalogo } from './db.js';
import { h, icono, vaciar, fecha, mensajeError } from './ui.js';
import * as vistaInicio from './vistas/inicio.js';
import * as vistaProducto from './vistas/producto.js';
import * as vistaPlan from './vistas/plan.js';
import * as vistaTrivia from './vistas/trivia.js';
import * as vistaModos from './vistas/modos.js';
import * as vistaMezclas from './vistas/mezclas.js';
import * as vistaGrupo from './vistas/grupo.js';

const NOMBRE_SITIO = 'Agroquímicos CRM';

// Secciones del menú (titulo: el de la página; menu: el del menú de arriba; corto: el de la barra del celular).
// Para la Fase 3 (foro, cuenta) basta sumarlas aquí.
// El inicio es la explicación de FRAC, IRAC y HRAC y la tabla es el «Buscador» (pedido de Cristóbal, 02-11-2026).
const SECCIONES = [
  { camino: '', titulo: '', menu: 'Inicio', corto: 'Inicio', icono: 'casa', vista: vistaModos },
  { camino: 'buscar', titulo: 'Buscador', menu: 'Buscador', corto: 'Buscar', icono: 'buscar', vista: vistaInicio },
  { camino: 'mezclas', titulo: 'Mezclas', menu: 'Mezclas', corto: 'Mezclas', icono: 'frasco', vista: vistaMezclas },
  { camino: 'plan', titulo: 'Plan de aplicaciones', menu: 'Plan', corto: 'Plan', icono: 'calendario', vista: vistaPlan },
  { camino: 'trivia', titulo: 'Trivia', menu: 'Trivia', corto: 'Trivia', icono: 'trofeo', vista: vistaTrivia },
];
// Rutas que no van en el menú.
// grupo: cómo actúa un código, sus productos y qué controlan (desde el título de cada grupo del buscador, 11-11-2026).
const OTRAS = { producto: vistaProducto, grupo: vistaGrupo };
// Links antiguos (guardados o compartidos). Estas secciones ahora son el buscador y se abren ahí con sus filtros.
// «mapa»: quitado por un tiempo a pedido de Cristóbal (31-10-2026); su código sigue en vistas/mapa.js.
const AL_BUSCADOR = ['aplicar', 'productos', 'mapa'];
// Hasta el 02-11-2026 la tabla era el inicio: un link al inicio con alguno de sus filtros abre el buscador.
const FILTROS_TABLA = ['cultivo', 'objetivo', 'oq', 'cat', 'q', 'empresa', 'moa', 'ing', 'orden', 'inv'];

const principal = document.getElementById('vista');
let catalogo = null;
let caminoAnterior = null;
// Última dirección del buscador (con sus filtros), para el botón «Volver» de la ficha.
let ultimoInicio = null;
let turno = 0;
// Si la persona ya usó la página (tocó, escribió o la movió), no se vuelve a dibujar sola cuando llega el catálogo
// al día: perdería lo que estaba haciendo. Los datos nuevos se ven desde la siguiente página.
let tocada = false;
for (const tipo of ['pointerdown', 'keydown', 'wheel', 'touchstart']) {
  window.addEventListener(tipo, () => { tocada = true; }, { capture: true, passive: true });
}

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
    p.textContent = `Datos guardados en este equipo el ${fecha(catalogo.fechaCache)}`;
  } else {
    p.textContent = catalogo.actualizado ? `Última actualización de los datos: ${fecha(catalogo.actualizado)}` : '';
  }
}

function avisoSinConexion() {
  return h('div', { class: 'nota nota-alerta', role: 'status' },
    `No se pudieron traer los datos al día (puede ser tu conexión o el servidor). Estás viendo los guardados el ${fecha(catalogo.fechaCache)}.`);
}

async function mostrar(evento) {
  tocada = false;
  if (evento && evento.oldURL) {
    const antes = evento.oldURL.slice(evento.oldURL.indexOf('#') + 1 || evento.oldURL.length);
    if (/^\/buscar(\?|$)/.test(antes)) ultimoInicio = `#${antes}`;
  }
  const llegada = leerRuta();
  const tablaAntigua = !llegada.partes.length && FILTROS_TABLA.some((k) => llegada.params.has(k));
  if (AL_BUSCADOR.includes(llegada.partes[0]) || tablaAntigua) {
    const consulta = llegada.params.toString();
    history.replaceState(null, '', `#/buscar${consulta ? `?${consulta}` : ''}`);
  } else if (llegada.partes[0] === 'modos') {
    history.replaceState(null, '', '#/');
  }
  const { partes, params } = leerRuta();
  const clave = partes[0] || '';
  const seccion = SECCIONES.find((s) => s.camino === clave);
  const vista = seccion ? seccion.vista : OTRAS[clave];
  const miTurno = ++turno;
  const caminoNuevo = partes.join('/');
  const cambioDePagina = caminoNuevo !== caminoAnterior;
  caminoAnterior = caminoNuevo;

  pintarMenus(seccion ? seccion.camino : clave === 'producto' || clave === 'grupo' ? 'buscar' : null);
  vaciar(principal);
  principal.classList.toggle('vista-ancha', Boolean(vista && vista.ANCHA));

  if (catalogo.fechaCache) principal.append(avisoSinConexion());

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

// Modo claro y oscuro (pedido de Cristóbal, 10-11-2026). index.html pone el modo antes de dibujar; el botón de la
// cabecera lo cambia y lo recuerda en este equipo. Si la persona nunca eligió, sigue al modo de su equipo.
const COLOR_BARRA = { claro: '#ffffff', oscuro: '#202725' };
function ponerTema(tema, guardar) {
  document.documentElement.setAttribute('data-tema', tema);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', COLOR_BARRA[tema]);
  if (guardar) { try { localStorage.setItem('tema', tema); } catch (e) { /* bloqueado: solo por esta visita */ } }
  const boton = document.querySelector('[data-tema-boton]');
  if (!boton) return;
  const otro = tema === 'oscuro' ? 'claro' : 'oscuro';
  vaciar(boton).append(icono(tema === 'oscuro' ? 'sol' : 'luna'));
  boton.setAttribute('aria-label', `Cambiar a modo ${otro}`);
  boton.title = `Modo ${otro}`;
  boton.hidden = false;
}

function iniciarTema() {
  const actual = () => (document.documentElement.getAttribute('data-tema') === 'oscuro' ? 'oscuro' : 'claro');
  ponerTema(actual(), false);
  const boton = document.querySelector('[data-tema-boton]');
  if (boton) boton.addEventListener('click', () => ponerTema(actual() === 'oscuro' ? 'claro' : 'oscuro', true));
  const sistema = window.matchMedia && matchMedia('(prefers-color-scheme: dark)');
  if (sistema && sistema.addEventListener) {
    sistema.addEventListener('change', (e) => {
      let elegido = null;
      try { elegido = localStorage.getItem('tema'); } catch (err) { /* bloqueado */ }
      if (!elegido) ponerTema(e.matches ? 'oscuro' : 'claro', false);
    });
  }
}

async function iniciar() {
  iniciarTema();
  pintarMenus(leerRuta().partes[0] || '');
  let carga;
  try {
    carga = await cargarCatalogo();
  } catch (err) {
    console.error(err);
    vaciar(principal).append(mensajeError(err));
    return;
  }
  catalogo = carga.catalogo;
  pintarPie();
  window.addEventListener('hashchange', mostrar);
  mostrar();
  // Se partió con la copia guardada en el equipo: llega la descarga.
  if (carga.nuevo) {
    carga.nuevo.then((nuevo) => {
      if (!nuevo) return;
      catalogo = nuevo;
      pintarPie();
      if (!tocada) mostrar();
    }, (err) => {
      console.error(err);
      catalogo.fechaCache = carga.fechaCopia;
      pintarPie();
      principal.prepend(avisoSinConexion());
    });
  }
}

iniciar();
