// Actividad del sitio (#/admin): solo para el administrador. Los datos vienen de admin_panel() (ver docs/cuentas.md);
// la base es la que decide quién puede verlos.
import { h, ruta, plural, num, vaciar, cargando, mensajeError } from '../ui.js';
import { usuario, esAdmin, alCambiarCuenta, cuentaLista, panelAdmin, rutaCuenta } from '../cuenta.js';

const ZONA = 'America/Santiago';
const fmtFechaHora = new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
const fmtFecha = new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, day: 'numeric', month: 'short', year: 'numeric' });
const fmtHora = new Intl.DateTimeFormat('es-CL', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false });
const fmtDiaUtc = new Intl.DateTimeFormat('es-CL', { timeZone: 'UTC', day: 'numeric', month: 'short' });

const sinPunto = (s) => String(s).replace(/\./g, '').replace(/\s+/g, ' ').replace(/(\d)\s(\d{2}:)/, '$1, $2');
const valida = (v) => { const d = v ? new Date(v) : null; return d && !Number.isNaN(d.getTime()) ? d : null; };
// «11 nov, 14:30»
const cuando = (v) => {
  const d = valida(v);
  if (!d) return '—';
  const s = sinPunto(fmtFechaHora.format(d));
  return s.includes(',') ? s : s.replace(/ (\d{2}:\d{2})$/, ', $1');
};
const dia = (v) => { const d = valida(v); return d ? sinPunto(fmtFecha.format(d)) : '—'; };
const hora = (v) => { const d = valida(v); return d ? fmtHora.format(d) : ''; };
// «2026-11-11» (día de Chile ya calculado por la base) → «11 nov»
const diaCorto = (s) => {
  const d = new Date(`${String(s).slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? String(s) : sinPunto(fmtDiaUtc.format(d));
};

const SECCIONES = {
  inicio: 'Inicio', buscar: 'Buscador', producto: 'Ficha de producto', grupo: 'Página de grupo', guardados: 'Guardados',
  cuenta: 'Cuenta', mezclas: 'Mezclas', plan: 'Plan', trivia: 'Trivia', admin: 'Actividad',
};
const seccion = (r) => {
  const k = String(r || '').replace(/^#?\/?/, '').split(/[/?]/)[0] || 'inicio';
  return SECCIONES[k] || k;
};

function queHizo(e) {
  const nombre = e.producto || 'un producto';
  switch (e.tipo) {
    case 'busqueda': return `Buscó «${e.detalle || ''}»`;
    case 'producto': return `Vio ${nombre}`;
    case 'etiqueta': return `Abrió la etiqueta de ${nombre}`;
    case 'guardar': return `Guardó ${nombre}`;
    case 'quitar': return `Quitó ${nombre}`;
    case 'plan': return `Agregó al plan ${nombre}`;
    case 'registro': return 'Creó su cuenta';
    case 'ingreso': return 'Entró';
    case 'visita': return `Visitó ${seccion(e.ruta)}`;
    default: return String(e.tipo || '—');
  }
}

function tarjetaNumero(titulo, grande, detalle, hoy = false) {
  return h('div', { class: 'tarjeta ad-numero' },
    h('p', { class: 'ad-numero-titulo' }, titulo),
    h('p', { class: 'ad-numero-grande' }, grande, hoy ? h('span', { class: 'ad-numero-detalle' }, ' hoy') : null),
    detalle ? h('p', { class: 'ad-numero-detalle' }, detalle) : null);
}

function tabla(titulo, vacio, cabeza, filas) {
  const cuerpo = filas.length
    ? h('div', { class: 'ad-tabla' }, h('table', { class: 'tabla-simple' },
      h('thead', null, h('tr', null, cabeza.map((c) => h('th', { scope: 'col', class: c.num ? 'ad-num' : null }, c.t)))),
      h('tbody', null, filas.map((f) => h('tr', null, f.map((celda, i) => h('td', { class: cabeza[i] && cabeza[i].num ? 'ad-num' : null }, celda)))))))
    : h('p', { class: 'ad-vacio' }, vacio);
  return [h('h2', { class: 'titulo-seccion' }, titulo), h('div', { class: 'tarjeta ad-tarjeta-tabla' }, cuerpo)];
}

const enlaceProducto = (x) => h('a', { href: ruta(`producto/${x.producto_id}`) }, x.nombre || 'Producto sin nombre');

function grafico(porDia) {
  const dias = Array.isArray(porDia) ? porDia : [];
  const total = dias.reduce((s, d) => s + (d.visitas || 0), 0);
  if (!dias.length || !total) return h('div', { class: 'tarjeta' }, h('p', { class: 'ad-vacio' }, 'Todavía no hay visitas registradas'));
  const max = Math.max(...dias.map((d) => d.visitas || 0));
  const mejor = dias.find((d) => (d.visitas || 0) === max);
  const resumen = `Visitas de los últimos ${dias.length} días: ${plural(total, 'visita', 'visitas')} en total. El día con más fue el ${diaCorto(mejor.dia)}, con ${plural(max, 'visita', 'visitas')}.`;
  const paso = dias.length > 20 ? 5 : 2;
  const columnas = dias.map((d, i) => {
    const v = d.visitas || 0;
    const info = `${diaCorto(d.dia)}: ${plural(v, 'visita', 'visitas')}, ${plural(d.personas || 0, 'persona', 'personas')}, ${plural(d.busquedas || 0, 'búsqueda', 'búsquedas')}`;
    const mostrar = i % paso === 0;
    return h('div', { class: 'ad-col', title: info },
      h('div', { class: 'ad-barra-zona' },
        h('span', { class: v ? 'ad-barra' : 'ad-barra ad-barra-cero', style: v ? `height:${Math.max(2, Math.round((v / max) * 100))}%` : null })),
      h('span', { class: 'ad-dia' }, mostrar ? diaCorto(d.dia) : ''));
  });
  return h('div', { class: 'tarjeta' },
    h('div', { class: 'ad-grafico' },
      h('div', { class: 'ad-eje', 'aria-hidden': 'true' }, h('span', null, num(max)), h('span', null, '0')),
      h('div', { class: 'ad-barras', role: 'img', 'aria-label': resumen }, columnas)),
    h('details', { class: 'ad-detalle' },
      h('summary', null, 'Ver los números por día'),
      h('div', { class: 'ad-tabla' }, h('table', { class: 'tabla-simple' },
        h('thead', null, h('tr', null, ['Día', 'Visitas', 'Personas', 'Búsquedas', 'Registros'].map((t, i) => h('th', { scope: 'col', class: i ? 'ad-num' : null }, t)))),
        h('tbody', null, [...dias].reverse().map((d) => h('tr', null,
          h('td', null, diaCorto(d.dia)),
          [d.visitas, d.personas, d.busquedas, d.registros].map((n) => h('td', { class: 'ad-num' }, num(n || 0))))))))));
}

function panel(p) {
  const t = p.totales || {};
  const cuerpo = [];
  cuerpo.push(h('div', { class: 'ad-numeros' },
    tarjetaNumero('Usuarios registrados', num(t.usuarios || 0), `+${num(t.usuarios_7d || 0)} esta semana`),
    tarjetaNumero('Personas', num(t.personas_hoy || 0), `${num(t.personas_7d || 0)} en 7 días · ${num(t.personas_30d || 0)} en 30 días`, true),
    tarjetaNumero('Visitas', num(t.visitas_hoy || 0), `${num(t.visitas_7d || 0)} en 7 días · ${num(t.visitas_30d || 0)} en 30 días`, true),
    tarjetaNumero('Productos guardados', num(t.guardados || 0), `por ${plural(t.usuarios_con_guardados || 0, 'usuario', 'usuarios')}`)));

  cuerpo.push(h('h2', { class: 'titulo-seccion' }, 'Últimos 30 días'), grafico(p.por_dia));

  cuerpo.push(...tabla('Usuarios', 'Todavía no hay usuarios', [{ t: 'Correo' }, { t: 'Se registró' }, { t: 'Último ingreso' }, { t: 'Guardados', num: true }, { t: 'Actividad en 30 días', num: true }],
    (p.usuarios || []).map((u) => [
      h('span', null, u.correo || '—', u.admin ? h('span', { class: 'ad-etiqueta' }, 'admin') : null),
      dia(u.creado), cuando(u.ultimo_ingreso), num(u.guardados || 0), num(u.eventos_30d || 0)])));
  const porProducto = (arr) => (arr || []).map((x) => [enlaceProducto(x), num(x.n || 0)]);
  cuerpo.push(...tabla('Productos más guardados', 'Todavía no hay productos guardados', [{ t: 'Producto' }, { t: 'Veces', num: true }], porProducto(p.mas_guardados)));
  cuerpo.push(...tabla('Productos más vistos (30 días)', 'Todavía no hay fichas vistas', [{ t: 'Producto' }, { t: 'Veces', num: true }], porProducto(p.mas_vistos)));
  cuerpo.push(...tabla('Etiquetas más abiertas (30 días)', 'Todavía no se abren etiquetas', [{ t: 'Producto' }, { t: 'Veces', num: true }], porProducto(p.etiquetas)));
  cuerpo.push(...tabla('Lo que más se busca (30 días)', 'Todavía no hay búsquedas', [{ t: 'Texto' }, { t: 'Veces', num: true }],
    (p.busquedas || []).map((b) => [h('a', { href: ruta('buscar', { q: b.texto }) }, b.texto), num(b.n || 0)])));
  cuerpo.push(...tabla('Secciones más usadas (30 días)', 'Todavía no hay visitas', [{ t: 'Sección' }, { t: 'Visitas', num: true }],
    (p.secciones || []).map((s) => [seccion(s.ruta), num(s.n || 0)])));
  cuerpo.push(...tabla('Actividad reciente', 'Todavía no hay actividad', [{ t: 'Cuándo' }, { t: 'Quién' }, { t: 'Qué' }],
    (p.reciente || []).map((e) => [cuando(e.creado), e.correo || 'Sin cuenta', queHizo(e)])));
  return cuerpo;
}

export async function render(main, ctx) {
  ctx.titulo('Actividad');
  let turno = 0; // cada dibujo o recarga invalida a los anteriores

  async function dibujar() {
    vaciar(main);
    if (!usuario()) {
      turno += 1;
      main.append(h('div', { class: 'vacio' },
        h('h1', null, 'Actividad del sitio'),
        h('p', null, 'Entra con tu cuenta de administrador'),
        h('a', { class: 'boton boton-primario', href: rutaCuenta('#/admin') }, 'Entrar')));
      return;
    }
    const zona = h('div', null);
    const botonAct = h('button', { class: 'boton', type: 'button', onclick: () => cargar() }, 'Actualizar');
    const horaEl = h('span', { class: 'ad-hora' });
    main.append(h('div', { class: 'ad-cabeza' },
      h('h1', null, 'Actividad del sitio'),
      h('div', { class: 'ad-cabeza-acciones' }, horaEl, botonAct)), zona);

    async function cargar() {
      turno += 1;
      const mio = turno;
      botonAct.disabled = true;
      vaciar(zona).append(cargando('Cargando la actividad…', 'lista'));
      try {
        const datos = await panelAdmin();
        if (!ctx.vigente() || mio !== turno) return;
        const hh = hora(datos.generado);
        horaEl.textContent = hh ? `Actualizado a las ${hh}` : '';
        vaciar(zona).append(...panel(datos));
      } catch (err) {
        if (!ctx.vigente() || mio !== turno) return;
        horaEl.textContent = '';
        vaciar(zona);
        if (esAdmin()) zona.append(mensajeError(err));
        else zona.append(h('div', { class: 'vacio' }, h('p', null, 'Esta página es solo para el administrador')));
      } finally {
        if (mio === turno) botonAct.disabled = false;
      }
    }
    await cargar();
  }

  // Espera (poco) a saber si ya hay sesión guardada, para no decir «sin sesión» antes de tiempo.
  await Promise.race([cuentaLista(), new Promise((r) => setTimeout(r, 2500))]);
  if (!ctx.vigente()) return;

  // Solo se piden los datos de nuevo si cambió la persona o si es administrador (no cuando cambian sus guardados).
  let idVisto = usuario() ? usuario().id : null;
  let adminVisto = esAdmin();
  const dejar = alCambiarCuenta(() => {
    if (!ctx.vigente()) { dejar(); return; }
    const id = usuario() ? usuario().id : null;
    if (id === idVisto && esAdmin() === adminVisto) return;
    idVisto = id; adminVisto = esAdmin();
    dibujar();
  });
  await dibujar();
}
