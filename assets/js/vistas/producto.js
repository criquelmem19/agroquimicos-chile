// Ficha de producto: ingredientes, categoría, empresas, todas sus líneas de uso,
// perfil de seguridad y documentos (etiqueta PDF).
import { usosPorProducto, detalleProducto } from '../db.js';
import { palabras, puntaje } from '../buscador.js';
import {
  h, agregar, icono, ruta, plural, fecha, limpio, recortar, vaciar, cargando, retrasar, mensajeError,
  dosis, carencia, mojamiento, intervalo, maxAplicaciones, textoOSinDato, linkPdf, urlDeLinea,
  chipsMoa, etiquetasCategoria, reingreso,
} from '../ui.js';

const TIPOS_DOC = { etiqueta: 'Etiqueta', hds: 'Hoja de seguridad', ficha_tecnica: 'Ficha técnica', folleto: 'Folleto', otro: 'Otro documento' };
const PRIMEROS_AUXILIOS = {
  ojos: 'Contacto con los ojos', piel: 'Contacto con la piel', inhalacion: 'Inhalación', ingestion: 'Ingestión', general: 'General',
};

// Cada par dato/valor va en su propio bloque, para que la grilla no los separe.
function par(dt, dd) {
  return h('div', null, h('dt', null, dt), h('dd', null, dd));
}

function textoLargo(titulo, texto) {
  const t = limpio(texto);
  if (!t) return null;
  return h('details', { class: 'mas-texto' }, h('summary', null, titulo), h('p', null, String(texto).trim()));
}

function lineaUso(cat, u) {
  const url = urlDeLinea(cat, u);
  const objetivos = u.objetivos.map((t) => cat.objetivos.get(t)).filter(Boolean).map((o) => o.nombre);
  return h('div', { class: 'linea-uso' },
    h('div', { class: 'linea-objetivos' }, h('strong', null, 'Controla'),
      objetivos.length ? objetivos.map((n) => recortar(n, 80)).join(' · ') : h('span', { class: 'sin-dato' }, 'Sin objetivo en los datos')),
    h('dl', { class: 'datos-uso' },
      par('Dosis', dosis(u)),
      par('Carencia', carencia(u, url)),
      par('Mojamiento', mojamiento(u)),
      par('Intervalo', intervalo(u)),
      par('Máx. aplicaciones', maxAplicaciones(u)),
      par('Momento de aplicación', textoOSinDato(u.application_timing, 220)),
      par('Método', textoOSinDato(u.application_method, 160)),
      par('Fuente', linkPdf(url, u.source_page))),
    textoLargo('Observaciones', u.observations),
    textoLargo('Texto leído de la etiqueta', u.source_text));
}

function seccionUsos(cat, p, lineas, contenedor) {
  vaciar(contenedor);
  if (!lineas.length) {
    contenedor.append(h('div', { class: 'nota nota-info' },
      'Este producto no tiene líneas de uso extraídas todavía. Revisa la etiqueta PDF para conocer sus usos.'));
    return;
  }
  const conCarencia = lineas.filter((u) => u.withholding_period_days != null || u.withholding_not_applicable).length;
  const porCultivo = new Map();
  for (const u of lineas) {
    if (!porCultivo.has(u.crop_id)) porCultivo.set(u.crop_id, []);
    porCultivo.get(u.crop_id).push(u);
  }
  const grupos = [...porCultivo].map(([id, us]) => ({ cultivo: cat.cultivos.get(id), us }))
    .filter((g) => g.cultivo)
    .sort((a, b) => b.us.length - a.us.length || a.cultivo.nombre.localeCompare(b.cultivo.nombre, 'es'));

  contenedor.append(h('div', { class: 'resumen' },
    h('span', null, h('strong', null, plural(lineas.length, 'línea de uso', 'líneas de uso'))),
    h('span', null, 'en ', h('strong', null, plural(grupos.length, 'cultivo', 'cultivos'))),
    h('span', null, 'Carencia con dato: ', h('strong', null, `${conCarencia} de ${lineas.length}`))));

  const listado = h('div');
  const pintar = (texto) => {
    vaciar(listado);
    const q = palabras(texto);
    let visibles = 0;
    grupos.forEach((g, i) => {
      let us = g.us;
      if (q.length) {
        const calzaCultivo = puntaje(q, g.cultivo.palabras) > 0;
        if (!calzaCultivo) us = us.filter((u) => u.objetivos.some((t) => { const o = cat.objetivos.get(t); return o && puntaje(q, o.palabras); }));
      }
      if (!us.length) return;
      visibles += 1;
      listado.append(h('details', { class: 'cultivo-grupo', open: grupos.length <= 3 || (q.length > 0 && i < 6) },
        h('summary', null, recortar(g.cultivo.nombre, 80), h('small', null, plural(us.length, 'línea', 'líneas'))),
        h('div', { class: 'linea-uso' },
          h('a', { href: ruta('aplicar', { cultivo: g.cultivo.id }) }, 'Comparar con otros productos para este cultivo →')),
        us.map((u) => lineaUso(cat, u))));
    });
    if (!visibles) listado.append(h('p', { class: 'vacio' }, 'Ningún cultivo u objetivo coincide.'));
  };
  if (grupos.length > 3) {
    const filtro = h('input', { class: 'entrada', type: 'search', placeholder: 'Filtrar por cultivo u objetivo', 'aria-label': 'Filtrar usos por cultivo u objetivo' });
    filtro.addEventListener('input', retrasar(() => pintar(filtro.value), 120));
    contenedor.append(h('div', { class: 'barra-herramientas' }, filtro));
  }
  contenedor.append(listado);
  pintar('');
}

function seccionSeguridad(p, detalle, contenedor) {
  vaciar(contenedor);
  const perfil = detalle.perfil;
  const prod = detalle.producto || {};
  const banderas = [];
  if (prod.is_flammable) banderas.push(h('span', { class: 'etiqueta etq-peligro' }, 'Inflamable'));
  if (prod.is_corrosive) banderas.push(h('span', { class: 'etiqueta etq-peligro' }, 'Corrosivo'));
  if (prod.is_explosive) banderas.push(h('span', { class: 'etiqueta etq-peligro' }, 'Explosivo'));

  if (!perfil) {
    agregar(contenedor, [h('div', { class: 'nota nota-info' }, 'No hay perfil de seguridad extraído para este producto. Revisa la etiqueta PDF.'),
      banderas.length ? h('div', { class: 'chips' }, banderas) : null]);
    return;
  }
  const items = [];
  items.push(par('Reingreso al área tratada', reingreso(perfil.reentry_hours, p.etiqueta && p.etiqueta.url)));
  const agregarTexto = (titulo, valor) => {
    const t = limpio(valor);
    if (t) items.push(par(titulo, String(valor).trim()));
  };
  agregarTexto('Equipo de protección para preparar', perfil.ppe_preparation);
  agregarTexto('Equipo de protección para aplicar', perfil.ppe_application);
  const aux = perfil.first_aid && typeof perfil.first_aid === 'object' ? Object.entries(perfil.first_aid) : [];
  for (const [k, v] of aux) agregarTexto(`Primeros auxilios: ${PRIMEROS_AUXILIOS[k] || k}`, typeof v === 'string' ? v : JSON.stringify(v));
  agregarTexto('Síntomas de intoxicación', perfil.poisoning_symptoms);
  agregarTexto('Antídoto', perfil.antidote);
  agregarTexto('Tratamiento médico de emergencia', perfil.emergency_medical_treatment);
  // Vienen en dos formatos: {name, type, phone} o {tipo, telefono}.
  const contactos = (Array.isArray(perfil.emergency_contacts) ? perfil.emergency_contacts : [])
    .map((c) => {
      const nombre = limpio(c.name || c.nombre);
      const tipo = limpio(c.type || c.tipo);
      const fono = limpio(c.phone || c.telefono);
      const tipoMayus = tipo ? tipo.charAt(0).toUpperCase() + tipo.slice(1) : '';
      const quien = nombre ? (tipo && tipo.toLowerCase() !== nombre.toLowerCase() ? `${nombre} (${tipo})` : nombre) : tipoMayus;
      return fono ? `${quien ? `${quien}: ` : ''}${fono}` : '';
    })
    .filter(Boolean);
  if (contactos.length) items.push(par('Teléfonos de emergencia (según la etiqueta)', contactos.join('\n')));
  agregarTexto('Almacenamiento', perfil.storage);
  agregarTexto('Preparación de la mezcla', perfil.mix_preparation);
  agregarTexto('Compatibilidad', perfil.compatibility);
  agregarTexto('Incompatibilidad', perfil.incompatibility);
  agregarTexto('Fitotoxicidad', perfil.phytotoxicity);
  agregarTexto('Manejo de resistencia', perfil.resistance_management);
  agregarTexto('Ecotoxicología', perfil.ecotoxicology);
  const avisos = Array.isArray(perfil.warnings) ? perfil.warnings.filter((w) => limpio(w)) : [];
  if (avisos.length) items.push(par('Advertencias del proceso de extracción', avisos.join('\n')));

  agregar(contenedor, [
    h('div', { class: 'nota nota-info' }, 'Extraído automáticamente de la etiqueta y sin revisión. Puede venir incompleto o con errores de lectura: compáralo con el PDF.'),
    banderas.length ? h('div', { class: 'chips' }, banderas) : null,
    h('div', { class: 'tarjeta seguridad' }, h('dl', null, items))]);
}

export async function render(main, ctx) {
  const { cat, partes } = ctx;
  const p = cat.productos.get(partes[1]);
  if (!p) {
    main.append(h('div', { class: 'vacio' }, h('h1', null, 'Producto no encontrado'),
      h('p', null, 'Puede que el link esté incompleto. ', h('a', { href: '#/productos' }, 'Ver todos los productos'))));
    return;
  }
  ctx.titulo(p.nombre);

  const documentos = p.documentos.map((d) => h('li', null,
    d.url ? h('a', { class: 'pdf', href: d.url, target: '_blank', rel: 'noopener' }, icono('pdf'), TIPOS_DOC[d.tipo] || 'Documento')
      : h('span', { class: 'pdf-falta' }, `${TIPOS_DOC[d.tipo] || 'Documento'}: PDF no disponible en el sistema`),
    h('span', { class: 'chico tenue' }, [d.fecha ? ` · versión ${fecha(d.fecha)}` : '', d.paginas ? ` · ${plural(d.paginas, 'página', 'páginas')}` : ''].join(''))));

  const zonaDescripcion = h('div');
  const zonaUsos = h('div', null, cargando('Cargando las líneas de uso…'));
  const zonaSeguridad = h('div', null, cargando('Cargando el perfil de seguridad…'));

  main.append(
    h('a', { class: 'volver', href: '#/productos' }, icono('flecha'), 'Todos los productos'),
    h('header', { class: 'ficha-cabeza' },
      p.categorias.length ? h('div', { class: 'chips' }, etiquetasCategoria(p)) : null,
      h('h1', null, p.nombre),
      h('div', { class: 'linea-datos' },
        [p.registro ? `Registro SAG N° ${p.registro}` : 'Sin N° de registro en los datos',
          p.formulacion ? `${p.formulacion}${p.formulacionCodigo ? ` (${p.formulacionCodigo})` : ''}` : p.formulacionCodigo].filter(Boolean).join(' · ')),
      h('div', { class: 'chips' },
        p.clasificacion ? h('span', { class: 'etiqueta etq-neutra', title: 'Palabra de advertencia en la etiqueta' }, p.clasificacion) : null,
        chipsMoa(p.moa)),
      h('div', { class: 'acciones' },
        p.etiqueta
          ? h('a', { class: 'boton boton-primario', href: p.etiqueta.url, target: '_blank', rel: 'noopener' }, icono('pdf'), 'Abrir etiqueta oficial (PDF)')
          : h('span', { class: 'nota nota-peligro' }, 'La etiqueta PDF de este producto no está disponible en el sistema.'))),
    zonaDescripcion,

    h('h2', { class: 'titulo-seccion' }, 'Ingredientes activos'),
    p.ings.length
      ? h('div', { class: 'tarjeta' }, h('table', { class: 'tabla-simple' },
        h('thead', null, h('tr', null, ['Ingrediente', 'Concentración', 'Grupo químico', 'Modo de acción'].map((t) => h('th', { scope: 'col' }, t)))),
        h('tbody', null, p.ings.map((x) => h('tr', null,
          h('td', { 'data-etiqueta': 'Ingrediente' }, h('a', { href: ruta('productos', { ing: x.ing.id }), title: 'Ver otros productos con este ingrediente' }, x.ing.nombre)),
          h('td', { 'data-etiqueta': 'Concentración' }, textoOSinDato(x.conc)),
          h('td', { 'data-etiqueta': 'Grupo químico' }, textoOSinDato(x.ing.grupoQuimico)),
          h('td', { 'data-etiqueta': 'Modo de acción' }, x.ing.moa ? chipsMoa([x.ing.moa]) : h('span', { class: 'tenue chico' }, 'Sin grupo informado')))))))
      : h('p', { class: 'nota nota-info' }, 'Sin ingrediente activo registrado en los datos.'),

    h('h2', { class: 'titulo-seccion' }, 'Empresas'),
    p.empresas.length
      ? h('div', { class: 'tarjeta' }, h('ul', { class: 'lista-simple' }, p.empresas.map((e) => h('li', null,
        h('a', { href: ruta('productos', { empresa: e.empresa.id }) }, e.empresa.nombre), ` — ${[...new Set(e.roles)].join(', ')}`))))
      : h('p', { class: 'tenue' }, 'Sin empresas registradas en los datos.'),

    h('h2', { class: 'titulo-seccion' }, 'Usos registrados'),
    zonaUsos,

    h('h2', { class: 'titulo-seccion' }, 'Seguridad'),
    zonaSeguridad,

    h('h2', { class: 'titulo-seccion' }, 'Documentos'),
    documentos.length ? h('ul', { class: 'tarjeta lista-simple' }, documentos) : h('p', { class: 'nota nota-peligro' }, 'Sin documentos registrados.'));

  const [usos, detalle] = await Promise.allSettled([usosPorProducto(p.id), detalleProducto(p.id)]);
  if (!ctx.vigente()) return;

  if (usos.status === 'fulfilled') seccionUsos(cat, p, usos.value, zonaUsos);
  else vaciar(zonaUsos).append(mensajeError(usos.reason));

  if (detalle.status === 'fulfilled') {
    const d = detalle.value;
    const prod = d.producto || {};
    const extras = [];
    if (limpio(prod.description)) extras.push(h('p', { class: 'bajada' }, prod.description));
    const datos = [prod.label_version_date ? `Versión de la etiqueta: ${fecha(prod.label_version_date)}` : null,
      limpio(prod.net_content_raw) ? `Contenido: ${limpio(prod.net_content_raw)}` : null].filter(Boolean);
    if (datos.length) extras.push(h('p', { class: 'chico tenue' }, datos.join(' · ')));
    zonaDescripcion.append(...extras);
    seccionSeguridad(p, d, zonaSeguridad);
  } else {
    vaciar(zonaSeguridad).append(mensajeError(detalle.reason));
  }
}
