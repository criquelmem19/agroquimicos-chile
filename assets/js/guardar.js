// Botón «Guardar» de un producto (11-11-2026; ver docs/cuentas.md). Con sesión guarda o quita el producto de la lista de
// la persona y se actualiza en el lugar; sin sesión lleva a crear la cuenta o entrar y vuelve a donde estaba.
import { h, icono, notificar } from './ui.js';
import { usuario, estaGuardado, alternarGuardado, alCambiarCuenta, rutaCuenta } from './cuenta.js';

// Un solo oyente para todos los botones (el buscador rehace la tabla con cada tecla): cada botón guarda lo que necesita
// para repintarse y el oyente recorre los que siguen en la página.
const datos = new WeakMap(); // botón → { producto, conTexto }

function pintar(boton) {
  const d = datos.get(boton);
  if (!d) return;
  const { producto, conTexto } = d;
  const guardado = estaGuardado(producto.id);
  const texto = guardado ? `Quitar ${producto.nombre} de tus guardados` : `Guardar ${producto.nombre} para más tarde`;
  boton.classList.toggle('guardado', guardado);
  if (guardado) boton.setAttribute('aria-pressed', 'true'); else boton.removeAttribute('aria-pressed');
  boton.title = texto;
  boton.setAttribute('aria-label', texto);
  boton.replaceChildren(icono(guardado ? 'marcadorLleno' : 'marcador'), ...(conTexto ? [guardado ? 'Guardado' : 'Guardar'] : []));
}

alCambiarCuenta(() => {
  for (const boton of document.querySelectorAll('[data-guardar-id]')) pintar(boton);
});

export function botonGuardar(producto, { conTexto = false } = {}) {
  const boton = h('button', {
    type: 'button', class: conTexto ? 'boton boton-guardar' : 'boton-redondo boton-guardar', 'data-guardar-id': String(producto.id),
  });
  datos.set(boton, { producto, conTexto });

  boton.addEventListener('click', async () => {
    if (!usuario()) { location.hash = rutaCuenta(location.hash, producto.id); return; }
    boton.disabled = true;
    try {
      const r = await alternarGuardado(producto.id);
      pintar(boton);
      if (r && r.ok) notificar(r.guardado ? 'Guardado en tu lista' : 'Quitado de tus guardados');
      else notificar((r && r.mensaje) || 'No se pudo guardar, intenta de nuevo');
    } catch (e) {
      pintar(boton);
      notificar('No se pudo guardar, intenta de nuevo');
    } finally {
      boton.disabled = false;
    }
  });

  pintar(boton);
  return boton;
}
