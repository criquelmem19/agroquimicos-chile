// Cuenta (#/cuenta, 11-11-2026): entrar, crear cuenta y, con sesión, «Tu cuenta».
// Parámetros: modo=crear|entrar, volver=<hash al que ir después> y guardar=<id de producto que se quería guardar>.
import { h, icono, vaciar } from '../ui.js';
import {
  usuario, esAdmin, guardados, estaGuardado, alCambiarCuenta, cuentaLista,
  crearCuenta, entrar, salir, alternarGuardado,
} from '../cuenta.js';

// A dónde ir después de entrar: el hash de `volver` si es de este sitio; si no, los guardados.
function destino(volver) {
  if (typeof volver === 'string' && volver.startsWith('#/') && !volver.startsWith('#/cuenta')) return volver;
  return '#/guardados';
}

function tarjetaSesion() {
  const u = usuario();
  const n = guardados().size;
  return h('section', { class: 'tarjeta cu-tarjeta', 'aria-labelledby': 'cu-titulo' },
    h('h1', { id: 'cu-titulo', class: 'cu-titulo' }, 'Tu cuenta'),
    h('p', { class: 'cu-correo' }, h('span', { class: 'cu-etiqueta' }, 'Correo'), h('strong', null, u.correo)),
    h('div', { class: 'cu-acciones' },
      h('a', { class: 'boton boton-primario', href: '#/guardados' }, icono('marcador'), `Ver mis guardados (${n})`),
      esAdmin() ? h('a', { class: 'boton', href: '#/admin' }, icono('grafico'), 'Actividad del sitio') : null,
      h('button', {
        class: 'boton', type: 'button',
        onclick: async (ev) => {
          ev.currentTarget.disabled = true;
          await salir();
          location.hash = '#/';
        },
      }, icono('salir'), 'Cerrar sesión')));
}

function formulario(ctx, modo, cambiarModo) {
  const crear = modo === 'crear';
  const guardarParam = ctx.params.get('guardar');
  const guardar = guardarParam && ctx.cat && ctx.cat.productos && ctx.cat.productos.has(guardarParam) ? guardarParam : null;
  const volver = ctx.params.get('volver');
  const errorEl = h('div', { class: 'cu-error', role: 'alert' });
  const correo = h('input', {
    class: 'entrada', id: 'cu-correo', name: 'email', type: 'email', autocomplete: 'email',
    inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', required: true,
  });
  const clave = h('input', {
    class: 'entrada', id: 'cu-clave', name: 'password', type: 'password', required: true,
    autocomplete: crear ? 'new-password' : 'current-password', minlength: crear ? '8' : null,
    'aria-describedby': crear ? 'cu-ayuda' : null,
  });
  const ver = h('button', {
    class: 'boton boton-chico cu-ver', type: 'button', 'aria-pressed': 'false', 'aria-controls': 'cu-clave',
    onclick: () => {
      const visible = clave.type === 'password';
      clave.type = visible ? 'text' : 'password';
      ver.textContent = visible ? 'Ocultar' : 'Ver';
      ver.setAttribute('aria-pressed', visible ? 'true' : 'false');
    },
  }, 'Ver');
  const enviar = h('button', { class: 'boton boton-primario cu-enviar', type: 'submit' }, crear ? 'Crear cuenta' : 'Entrar');

  const form = h('form', { class: 'cu-form', method: 'post', action: '#', novalidate: true },
    h('div', { class: 'cu-campo' }, h('label', { for: 'cu-correo' }, 'Correo'), correo),
    h('div', { class: 'cu-campo' },
      h('label', { for: 'cu-clave' }, 'Contraseña'),
      h('div', { class: 'cu-clave' }, clave, ver),
      crear ? h('p', { class: 'cu-ayuda', id: 'cu-ayuda' }, '8 caracteres o más') : null),
    errorEl,
    enviar,
    crear ? h('p', { class: 'cu-ayuda' }, 'Tu correo y tu actividad en el sitio quedan visibles para el administrador') : null);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviar.disabled) return;
    errorEl.textContent = '';
    enviar.disabled = true;
    enviar.textContent = crear ? 'Creando…' : 'Entrando…';
    let r;
    try {
      r = await (crear ? crearCuenta : entrar)(correo.value, clave.value);
    } catch (e) {
      r = { ok: false, mensaje: 'No se pudo completar. Intenta de nuevo en un momento' };
    }
    if (!r.ok) {
      errorEl.textContent = r.mensaje || 'No se pudo completar. Intenta de nuevo en un momento';
      enviar.disabled = false;
      enviar.textContent = crear ? 'Crear cuenta' : 'Entrar';
      return;
    }
    try {
      if (guardar && !estaGuardado(guardar)) await alternarGuardado(guardar);
    } catch (e) { /* el producto se puede guardar después */ }
    location.hash = destino(volver);
  });

  const pestana = (clave2, texto) => h('button', {
    class: 'cu-pestana', type: 'button', role: 'tab', 'aria-selected': clave2 === modo ? 'true' : 'false',
    onclick: () => { if (clave2 !== modo) cambiarModo(clave2); },
  }, texto);

  return h('section', { class: 'tarjeta cu-tarjeta', 'aria-labelledby': 'cu-titulo' },
    h('h1', { id: 'cu-titulo', class: 'cu-titulo' }, crear ? 'Crea tu cuenta' : 'Entra a tu cuenta'),
    guardar ? h('p', { class: 'cu-guardar' }, icono('marcador'), 'Entra o crea tu cuenta para guardar productos') : null,
    h('div', { class: 'cu-pestanas', role: 'tablist', 'aria-label': 'Entrar o crear cuenta' },
      pestana('entrar', 'Entrar'), pestana('crear', 'Crear cuenta')),
    form);
}

export async function render(main, ctx) {
  ctx.titulo('Mi cuenta');
  // Espera (poco) a saber si ya hay sesión guardada, para no mostrar «Entrar» a quien ya entró.
  await Promise.race([cuentaLista(), new Promise((r) => setTimeout(r, 2500))]);
  if (!ctx.vigente()) return;

  let modo = ctx.params.get('modo') === 'crear' ? 'crear' : 'entrar';
  const caja = h('div', { class: 'cu-pagina' });
  main.append(caja);

  const dibujar = () => {
    vaciar(caja);
    if (usuario()) {
      caja.append(tarjetaSesion());
    } else {
      caja.append(formulario(ctx, modo, (nuevo) => {
        modo = nuevo;
        ctx.cambiarParams({
          modo: nuevo === 'crear' ? 'crear' : null,
          volver: ctx.params.get('volver'),
          guardar: ctx.params.get('guardar'),
        });
        dibujar();
        const campo = caja.querySelector('#cu-correo');
        if (campo) campo.focus();
      }));
    }
  };
  dibujar();

  // Si entra o sale (o llegan sus guardados), se dibuja de nuevo; deja de escuchar al cambiar de página.
  let idDibujado = usuario() ? usuario().id : null;
  let adminDibujado = esAdmin();
  let nDibujado = guardados().size;
  const dejar = alCambiarCuenta(() => {
    if (!ctx.vigente()) { dejar(); return; }
    const id = usuario() ? usuario().id : null;
    if (id === idDibujado && esAdmin() === adminDibujado && guardados().size === nDibujado) return;
    // Mientras se llena el formulario no se pisa lo escrito: solo se redibuja al entrar o salir.
    if (id === idDibujado && !id) return;
    idDibujado = id; adminDibujado = esAdmin(); nDibujado = guardados().size;
    dibujar();
  });
}
