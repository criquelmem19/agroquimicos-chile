// Cuenta (#/cuenta, 11-11-2026): entrar, crear cuenta y, con sesión, «Tu cuenta».
// 12-11-2026: «Olvidé mi contraseña» (modo=olvide, manda un correo con un link) y contraseña nueva (modo=nueva, al
// llegar desde ese link o desde «Cambiar contraseña»).
// Parámetros: modo=crear|entrar|olvide|nueva, volver=<hash al que ir después> y guardar=<id de producto que se quería guardar>.
import { h, icono, vaciar } from '../ui.js';
import {
  usuario, esAdmin, guardados, estaGuardado, alCambiarCuenta, cuentaLista,
  crearCuenta, entrar, salir, alternarGuardado, pedirRecuperacion, cambiarClave, recuperacion, terminarRecuperacion,
} from '../cuenta.js';
import { planes } from '../plan.js';

// A dónde ir después de entrar: el hash de `volver` si es de este sitio; si no, los guardados.
function destino(volver) {
  if (typeof volver === 'string' && volver.startsWith('#/') && !volver.startsWith('#/cuenta')) return volver;
  return '#/guardados';
}

// Campo de contraseña con el botón «Ver».
function campoClave(id, autocompletar, describe) {
  const clave = h('input', {
    class: 'entrada', id, name: 'password', type: 'password', required: true,
    autocomplete: autocompletar, minlength: autocompletar === 'new-password' ? '8' : null, 'aria-describedby': describe || null,
  });
  const ver = h('button', {
    class: 'boton boton-chico cu-ver', type: 'button', 'aria-pressed': 'false', 'aria-controls': id,
    onclick: () => {
      const visible = clave.type === 'password';
      clave.type = visible ? 'text' : 'password';
      ver.textContent = visible ? 'Ocultar' : 'Ver';
      ver.setAttribute('aria-pressed', visible ? 'true' : 'false');
    },
  }, 'Ver');
  return { clave, caja: h('div', { class: 'cu-clave' }, clave, ver) };
}

// «Olvidé mi contraseña»: pide el correo y manda el link.
function formularioOlvide(cambiarModo, vencido) {
  const errorEl = h('div', { class: 'cu-error', role: 'alert' });
  const correo = h('input', {
    class: 'entrada', id: 'cu-correo', name: 'email', type: 'email', autocomplete: 'email',
    inputmode: 'email', autocapitalize: 'none', spellcheck: 'false', required: true,
  });
  const enviar = h('button', { class: 'boton boton-primario cu-enviar', type: 'submit' }, 'Mandar el correo');
  const form = h('form', { class: 'cu-form', method: 'post', action: '#', novalidate: true },
    h('div', { class: 'cu-campo' }, h('label', { for: 'cu-correo' }, 'Correo de tu cuenta'), correo),
    errorEl, enviar);
  const seccion = h('section', { class: 'tarjeta cu-tarjeta', 'aria-labelledby': 'cu-titulo' },
    h('h1', { id: 'cu-titulo', class: 'cu-titulo' }, 'Recupera tu contraseña'),
    vencido ? h('p', { class: 'cu-guardar' }, icono('alerta'), 'Ese link ya no sirve. Pide otro correo') : null,
    h('p', { class: 'cu-texto' }, 'Te mandamos un correo con un link para poner una contraseña nueva'),
    form,
    h('button', { class: 'boton-texto cu-volver', type: 'button', onclick: () => cambiarModo('entrar') }, 'Volver a entrar'));
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviar.disabled) return;
    errorEl.textContent = '';
    enviar.disabled = true;
    enviar.textContent = 'Mandando…';
    const r = await pedirRecuperacion(correo.value);
    if (!r.ok) {
      errorEl.textContent = r.mensaje;
      enviar.disabled = false;
      enviar.textContent = 'Mandar el correo';
      return;
    }
    form.replaceWith(h('p', { class: 'cu-listo', role: 'status' }, icono('check'),
      h('span', null, 'Listo. Si ese correo tiene cuenta, en unos minutos te llega el mensaje. Revisa también el correo no deseado')));
  });
  return seccion;
}

// Contraseña nueva (con la sesión del link del correo, o la de siempre).
function formularioNueva(alTerminar) {
  const errorEl = h('div', { class: 'cu-error', role: 'alert' });
  const { clave, caja } = campoClave('cu-clave', 'new-password', 'cu-ayuda');
  const enviar = h('button', { class: 'boton boton-primario cu-enviar', type: 'submit' }, 'Guardar contraseña');
  // El correo va en un campo oculto para que el navegador guarde la contraseña en la cuenta correcta.
  const form = h('form', { class: 'cu-form', method: 'post', action: '#', novalidate: true },
    h('input', { type: 'email', name: 'email', autocomplete: 'username', value: usuario().correo, hidden: true, readonly: true }),
    h('div', { class: 'cu-campo' }, h('label', { for: 'cu-clave' }, 'Contraseña nueva'), caja,
      h('p', { class: 'cu-ayuda', id: 'cu-ayuda' }, '8 caracteres o más')),
    errorEl, enviar);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (enviar.disabled) return;
    errorEl.textContent = '';
    enviar.disabled = true;
    enviar.textContent = 'Guardando…';
    const r = await cambiarClave(clave.value);
    if (!r.ok) {
      errorEl.textContent = r.mensaje;
      enviar.disabled = false;
      enviar.textContent = 'Guardar contraseña';
      return;
    }
    alTerminar(true);
  });
  return h('section', { class: 'tarjeta cu-tarjeta', 'aria-labelledby': 'cu-titulo' },
    h('h1', { id: 'cu-titulo', class: 'cu-titulo' }, 'Pon tu contraseña nueva'),
    h('p', { class: 'cu-correo' }, h('span', { class: 'cu-etiqueta' }, 'Correo'), h('strong', null, usuario().correo)),
    form,
    h('button', { class: 'boton-texto cu-volver', type: 'button', onclick: () => alTerminar(false) }, 'Dejarla como está'));
}

function tarjetaSesion(cambiarModo, aviso) {
  const u = usuario();
  const n = guardados().size;
  const nPlanes = planes().length;
  return h('section', { class: 'tarjeta cu-tarjeta', 'aria-labelledby': 'cu-titulo' },
    h('h1', { id: 'cu-titulo', class: 'cu-titulo' }, 'Tu cuenta'),
    aviso ? h('p', { class: 'cu-listo', role: 'status' }, icono('check'), h('span', null, aviso)) : null,
    h('p', { class: 'cu-correo' }, h('span', { class: 'cu-etiqueta' }, 'Correo'), h('strong', null, u.correo)),
    h('div', { class: 'cu-acciones' },
      h('a', { class: 'boton boton-primario', href: '#/guardados' }, icono('marcador'), `Ver mis guardados (${n})`),
      h('a', { class: 'boton', href: '#/plan' }, icono('calendario'), `Ver mis planes (${nPlanes})`),
      esAdmin() ? h('a', { class: 'boton', href: '#/admin' }, icono('grafico'), 'Actividad del sitio') : null,
      h('button', {
        class: 'boton', type: 'button',
        onclick: async (ev) => {
          ev.currentTarget.disabled = true;
          await salir();
          location.hash = '#/';
        },
      }, icono('salir'), 'Cerrar sesión')),
    h('button', { class: 'boton-texto cu-volver', type: 'button', onclick: () => cambiarModo('nueva') }, 'Cambiar contraseña'));
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
  const { clave, caja: cajaClave } = campoClave('cu-clave', crear ? 'new-password' : 'current-password', crear ? 'cu-ayuda' : null);
  const enviar = h('button', { class: 'boton boton-primario cu-enviar', type: 'submit' }, crear ? 'Crear cuenta' : 'Entrar');

  const form = h('form', { class: 'cu-form', method: 'post', action: '#', novalidate: true },
    h('div', { class: 'cu-campo' }, h('label', { for: 'cu-correo' }, 'Correo'), correo),
    h('div', { class: 'cu-campo' },
      h('label', { for: 'cu-clave' }, 'Contraseña'),
      cajaClave,
      crear ? h('p', { class: 'cu-ayuda', id: 'cu-ayuda' }, '8 caracteres o más')
        : h('button', { class: 'boton-texto cu-olvide', type: 'button', onclick: () => cambiarModo('olvide') }, 'Olvidé mi contraseña')),
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
  // Si llegó con el link del correo, espera a que se compruebe (sin tope: sin eso no se puede seguir).
  if (recuperacion() === 'pendiente') await cuentaLista();
  else await Promise.race([cuentaLista(), new Promise((r) => setTimeout(r, 2500))]);
  if (!ctx.vigente()) return;

  const MODOS = ['entrar', 'crear', 'olvide', 'nueva'];
  let modo = MODOS.includes(ctx.params.get('modo')) ? ctx.params.get('modo') : 'entrar';
  let aviso = null;
  const caja = h('div', { class: 'cu-pagina' });
  main.append(caja);

  const cambiarModo = (nuevo) => {
    modo = nuevo;
    aviso = null;
    ctx.cambiarParams({
      modo: nuevo === 'entrar' ? null : nuevo,
      volver: ctx.params.get('volver'),
      guardar: ctx.params.get('guardar'),
    });
    dibujar();
    const campo = caja.querySelector('#cu-correo, #cu-clave');
    if (campo) campo.focus();
  };
  const dibujar = () => {
    vaciar(caja);
    const u = usuario();
    if (modo === 'nueva' && (recuperacion() === 'vencido' || !u)) {
      // El link del correo venció (o ya se usó): se pide otro.
      const vencido = recuperacion() === 'vencido';
      terminarRecuperacion();
      modo = 'olvide';
      caja.append(formularioOlvide(cambiarModo, vencido));
    } else if (modo === 'nueva') {
      caja.append(formularioNueva((cambiada) => {
        terminarRecuperacion();
        modo = 'entrar';
        ctx.cambiarParams({});
        aviso = cambiada ? 'Contraseña cambiada' : null;
        dibujar();
      }));
    } else if (u) {
      caja.append(tarjetaSesion(cambiarModo, aviso));
    } else if (modo === 'olvide') {
      caja.append(formularioOlvide(cambiarModo, false));
    } else {
      caja.append(formulario(ctx, modo, cambiarModo));
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
    // Tampoco mientras escribe la contraseña nueva.
    if (id === idDibujado && modo === 'nueva') return;
    idDibujado = id; adminDibujado = esAdmin(); nDibujado = guardados().size;
    dibujar();
  });
}
