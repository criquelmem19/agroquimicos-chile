// Buscador (#/buscar; fue el inicio hasta el 02-11-2026): tabla de productos (una fila por producto) con un buscador
// principal arriba (busca mientras se escribe en todas las columnas y en las plagas de las etiquetas) y, debajo, cuatro
// filtros con varias opciones: cultivo, plaga/enfermedad/maleza, tipo de producto y empresa (11-11-2026). Con cultivo u
// objetivo, los cultivos de cada fila salen solo de las líneas de uso que calzan. Los que no se usan en Chile no aparecen.
// Parámetros: cultivo=<id>,<id>…, objetivo=<id>,…, oq=<texto de objetivo>, cat=<id>,…, q=<texto>, empresa=<nombre corto>,…,
// moa=<clave>|sin (desde los chips de código: ya no hay lista), ing=<id>, orden=moa|nombre|empresa|tipo|ing|cultivos,
// inv=1 (orden al revés)
import {
  usosPorCultivo, usosPorObjetivos, compararMoa, nombreCorto, familiaMoa, claveMoa, tipoFormulacion as tipoDe,
  cultivosVisibles, enListas, productosPorObjetivo, gruposDe,
} from '../db.js';
import { filtrar, palabras, puntaje, normalizar, preparar, contiene, raiz } from '../buscador.js';
import {
  h, icono, ruta, plural, recortar, limpio, vaciar, cargando, retrasar, globo, selectorMultiple, dibujoComite,
  chipsMoa, chipMoa, ingredientesTexto, resumenDosis,
} from '../ui.js';
import { botonGuardar } from '../guardar.js';
import { registrarEvento } from '../cuenta.js';
import { queHace, breve, nombreClave, TIPOS, ORDEN_TIPOS, claveTipo, tipoDeClave } from '../moa.js';

// La vista usa todo el ancho de la pantalla (app.js).
export const ANCHA = true;

const POR_PAGINA = 100;
const VISIBLES_CULTIVOS = 3;
const MAX_OBJETIVOS_TEXTO = 300;
// Columnas que se ordenan al tocar su título (otro toque invierte el orden). Por defecto, agrupados por modo de acción.
// mayorPrimero: el primer toque ordena de mayor a menor.
const ORDENES = {
  moa: 'Modo de acción (agrupados)',
  nombre: 'Producto',
  empresa: 'Empresa',
  tipo: 'Tipo (WP, SC…)',
  ing: 'Ingrediente activo',
  cultivos: 'Cantidad de cultivos',
};
const MAYOR_PRIMERO = new Set(['cultivos']);
// Columnas de la tabla, con qué orden se asocia cada una (null: no se ordena) y su clase de ancho (app.css, col-*).
// Ancho fijo por columna y celdas recortadas a una o dos líneas: todas las filas tienen la misma altura (Cristóbal,
// 10-11-2026). Lo que no cabe se ve al pasar el mouse, en la burbuja de cultivos o en la ficha.
// 11-11-2026 (Cristóbal: «reducir tanta info»): sin registro SAG ni dosis; este orden; todo centrado y una línea por
// celda, salvo los ingredientes (uno por línea, completos); la etiqueta y el plan como íconos al final.
export const COLUMNAS = [
  ['Producto', 'nombre', 'producto'], ['Modo de acción', 'moa', 'moa'], ['Empresa', 'empresa', 'empresa'],
  ['Ingrediente activo', 'ing', 'ing'], ['Tipo', 'tipo', 'tipo'], ['Cultivos', 'cultivos', 'cultivos'],
  ['Etiqueta', null, 'etiqueta'], ['Guardar', null, 'guardar'], ['Plan', null, 'plan'],
];
// Secciones de la tabla agrupada: una por comité (y los sin código al final), sobre los grupos de cada código.
const SECCIONES = {
  frac: ['FRAC', 'Fungicidas y bactericidas'],
  irac: ['IRAC', 'Insecticidas, acaricidas y nematicidas'],
  hrac: ['HRAC', 'Herbicidas'],
  sin: [null, 'Sin código de rotación'],
};
const seccionDe = (clave) => {
  const k = String(clave || '').split(' + ')[0];
  return !k || tipoDeClave(k) ? 'sin' : k.split(' ')[0].toLowerCase();
};
const SIN_GRUPO = 'Sin ingrediente activo en los datos';
const DE_COMITE = { frac: 'FRAC: fungicida o bactericida', irac: 'IRAC: insecticida, acaricida o nematicida', hrac: 'HRAC: herbicida' };

function ir(params) { location.hash = ruta('buscar', params); }

// Nombre común + nombre científico (si no viene ya en el nombre), para distinguir variantes.
function nombreObjetivo(o) {
  const n = limpio(o.nombre);
  const c = limpio(o.cientifico);
  return recortar(c && !normalizar(n).includes(normalizar(c)) ? `${n} (${c})` : n, 80);
}

function valorOrden(clave, p, info) {
  if (clave === 'nombre') return p.nombre;
  if (clave === 'empresa') return p.marca;
  if (clave === 'tipo') return tipoDe(p);
  if (clave === 'ing') return p.ings.length ? p.ings.map((x) => x.ing.nombre).join(' + ') : null;
  if (clave === 'cultivos') return info.cultivos.length;
  return null;
}

const comparaTexto = (a, b) => String(a).localeCompare(String(b), 'es', { numeric: true, ignorePunctuation: true });

// Grupos de modo de acción de un producto como una sola clave («FRAC 7 + FRAC 11»): los que tienen la misma son lo mismo.
// Se usan las familias (en IRAC, el número sin la letra del subgrupo) y los códigos actuales. Sin código: lo que son
// sus ingredientes («tipo:regulador»), para que también queden agrupados y explicados.
const claveGrupo = (p) => gruposDe(p).join(' + ');

// Códigos primero (FRAC, IRAC, HRAC), después los tipos sin código y al final los sin ingrediente.
const rangoGrupo = (k) => {
  const t = tipoDeClave(k);
  return t ? 1 + ORDEN_TIPOS.indexOf(t) / 100 : 0;
};
function compararGrupos(a, b) {
  if (!a.length || !b.length) return !a.length - !b.length;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    const d = rangoGrupo(a[i]) - rangoGrupo(b[i]) || compararMoa(a[i], b[i]);
    if (d) return d;
  }
  return a.length - b.length;
}

// ---------- Buscador principal: todas las columnas de la tabla ----------
// Pedido de Cristóbal (11-11-2026): «tiene que filtrar todos y cada uno de los elementos que aparezcan en las columnas».
// Cada fila junta en un texto lo que se ve en sus columnas (y lo que aparece al pasar el mouse): producto y tipo de
// producto, empresa (nombre corto y completo), códigos (actual y el de la etiqueta) o lo que es si no tiene código,
// grupo químico, formulación, ingredientes con su concentración, registro SAG y cultivos (con sus sinónimos); y además
// las plagas, enfermedades y malezas de sus etiquetas (Cristóbal, 11-11-2026: «que ese filtro filtre absolutamente
// todo»: «avenilla» daba 0 productos), que se buscan en la base (db.js → productosPorObjetivo).
// Cada palabra escrita tiene que estar en alguna columna, en cualquier parte de una palabra («cipermetrina» encuentra
// «Alfacipermetrina»; ver buscador.js → contiene).

// «FRAC 3», «IRAC 4A», «HRAC A», «FRAC G1», «IRAC UNE», «FRAC NC» se buscan como grupo de modo de acción: si no, el
// «3» calzaría con cualquier número de la fila (registro, dosis…). «IRAC 4» incluye 4A, 4C…
const RE_MOA = /\b(frac|irac|hrac)\s*(n-un[a-z]?|un[a-z]?|nc|bm\d{1,2}|[a-z]{0,2}\d{1,2}[a-z]?|[a-z]\d?)\b/gi;

function separarBusqueda(texto) {
  const grupos = [];
  const resto = String(texto || '').replace(RE_MOA, (_, sistema, codigo) => { grupos.push(claveMoa(sistema.toUpperCase(), codigo)); return ' '; });
  return { grupos, palabras: palabras(resto) };
}

// Texto de las columnas fijas de cada producto (no cambian con el cultivo u objetivo elegido).
const fijas = new WeakMap();
function textoFijo(p) {
  if (!fijas.has(p)) {
    const principal = p.empresas[0];
    fijas.set(p, [
      p.nombre, p.categorias.map((c) => c.nombre).join(' '),
      p.marca, principal && principal.empresa.nombre,
      p.moa.join(' '), [...p.moaEtiqueta.values()].flat().join(' '),
      p.tipos.map((t) => `${TIPOS[t] ? `${TIPOS[t].corto} ${TIPOS[t].nombre}` : t}`).join(' '),
      p.ings.map((x) => `${x.ing.nombre} ${limpio(x.conc)} ${x.ing.grupoQuimico || ''}`).join(' '),
      tipoDe(p), p.formulacion, p.registro,
    ].filter(Boolean).join(' '));
  }
  return fijas.get(p);
}

// Texto completo de una fila: lo fijo, los cultivos y la dosis que se ven (dependen del cultivo u objetivo elegido).
// Se guarda por `info`, que es uno por producto mientras no cambien los filtros de arriba.
const textos = new WeakMap();
function textoFila(p, info) {
  if (!textos.has(info)) {
    const cultivos = info.cultivos.map((c) => `${c.nombre} ${c.alias.join(' ')}`).join(' ');
    textos.set(info, preparar(`${textoFijo(p)} ${cultivos}`));
  }
  return textos.get(info);
}

// Texto que se busca entre las plagas, enfermedades y malezas: las palabras de 3 letras o más, sin plural.
const raizObjetivo = (q) => { const r = raiz(q); return r.length >= 3 ? r : null; };

// Los códigos escritos tienen que estar en el producto; cada otra palabra, en alguna columna o en alguna plaga,
// enfermedad o maleza de sus etiquetas (b.porObjetivo: palabra → productos).
const VACIO = new Set();
function calzaBusqueda(b, p, info) {
  for (const k of b.grupos) {
    if (!p.moa.includes(k) && !p.familias.includes(k) && ![...p.moaEtiqueta.values()].some((xs) => xs.includes(k))) return false;
  }
  if (!b.palabras.length) return true;
  const texto = textoFila(p, info);
  return b.palabras.every((q) => contiene(texto, [q]) || (b.porObjetivo.get(q) || VACIO).has(p.id));
}

// ---------- Celdas ----------

// Los primeros cultivos y un botón «+N» que abre una burbuja con todos (la fila no cambia de alto).
function listaCultivos(cultivos) {
  if (!cultivos.length) return h('span', { class: 'tenue' }, '—');
  const resto = cultivos.length - VISIBLES_CULTIVOS;
  const nombres = cultivos.slice(0, VISIBLES_CULTIVOS).map((c) => recortar(c.nombre, 30)).join(', ');
  const boton = resto > 0 ? h('button', {
    type: 'button', class: 'mas-cultivos', 'aria-expanded': 'false', 'aria-haspopup': 'dialog',
    title: `Ver los ${cultivos.length} cultivos`,
    onclick: (e) => globo(e.currentTarget, [
      h('p', { class: 'globo-titulo' }, plural(cultivos.length, 'cultivo', 'cultivos')),
      h('p', { class: 'globo-texto' }, cultivos.map((c) => c.nombre).join(', '))]),
  }, `+${resto}`) : null;
  return h('span', { class: 'cultivos' }, h('span', { class: 'cultivos-nombres', title: nombres }, nombres), boton);
}

// En el celular las celdas sin dato no se muestran (en la tabla quedan con «—»).
const vacia = (clase, valor) => (valor ? clase : `${clase} vacia`);

export function fila(p, info, op) {
  const url = p.etiqueta && p.etiqueta.url;
  const principal = p.empresas[0];
  const tipo = tipoDe(p);
  // La franja de color va siempre (no solo agrupados): el sistema del primer código.
  const sistema = p.moa.length ? String(p.moa[0]).split(' ')[0].toLowerCase() : null;
  // Sin código: lo que es («Regulador», «Feromona»…), también como botón a todos los de su tipo.
  const codigos = p.moa.length ? chipsMoa(p.moa, p.moaEtiqueta) : chipsMoa(p.tipos.map(claveTipo));
  const categorias = p.categorias.map((c) => c.nombre).join(' · ');
  // Antes del nombre, el dibujo de su comité (hongo, insecto, maleza), solo líneas y del color del comité (11-11-2026).
  const comites = [...new Set(p.moa.map((k) => k.split(' ')[0].toLowerCase()))].filter((c) => DE_COMITE[c]);
  return h('tr', { class: `fila-producto ${sistema ? `grupo-${sistema}` : 'grupo-sin'}` },
    // Solo el nombre, en negrita; la categoría va al pasar el mouse (y en la tarjeta del celular).
    h('td', { class: 'c-producto' },
      h('span', { class: 'c-nombre' },
        comites.length ? h('span', { class: 'c-comites' }, comites.map((c) => h('span', { class: `c-comite comite-${c}`, title: DE_COMITE[c] },
          dibujoComite(c, 'c-dibujo', '4.5')))) : null,
        h('a', { href: ruta(`producto/${p.id}`, { cultivo: op.cultivoId }), title: categorias ? `${p.nombre} · ${categorias}` : p.nombre }, p.nombre)),
      categorias ? h('span', { class: 'c-cat', title: categorias }, categorias) : null),
    h('td', { class: vacia('c-moa', codigos), 'data-etiqueta': 'Modo de acción' },
      codigos || h('span', { class: 'tenue', title: SIN_GRUPO }, '—')),
    h('td', { class: vacia('c-empresa', p.marca), 'data-etiqueta': 'Empresa', title: principal ? principal.empresa.nombre : null }, p.marca || '—'),
    // Un ingrediente por línea, completos: la única celda que puede crecer.
    h('td', { class: 'c-ing', 'data-etiqueta': 'Ingrediente activo', title: ingredientesTexto(p) },
      p.ings.length ? p.ings.map((x) => h('span', { class: 'ing-linea' }, x.ing.nombre))
        : h('span', { class: 'tenue' }, 'Sin ingrediente registrado')),
    h('td', { class: vacia('c-tipo', tipo), 'data-etiqueta': 'Tipo', title: p.formulacion || null }, tipo || '—'),
    h('td', { class: 'c-cultivos', 'data-etiqueta': 'Cultivos' }, listaCultivos(info.cultivos)),
    // La etiqueta: un ícono de PDF relleno en el verde de énfasis; el título de la columna ya dice qué es.
    h('td', { class: vacia('c-etiqueta', url), 'data-etiqueta': 'Etiqueta' },
      url ? h('a', {
        class: 'boton-etiqueta', href: url, target: '_blank', rel: 'noopener',
        title: 'Abrir la etiqueta (PDF)', 'aria-label': `Abrir la etiqueta de ${p.nombre} (PDF)`,
        onclick: () => registrarEvento('etiqueta', { producto: p.id }),
      }, icono('pdfLleno')) : h('span', { class: 'tenue', title: 'Sin PDF de la etiqueta en el sistema' }, '—')),
    // El marcador va justo antes del botón del plan (pedido de Cristóbal, 11-11-2026).
    h('td', { class: 'c-guardar' }, botonGuardar(p)),
    h('td', { class: 'c-plan' }, h('a', {
      class: 'boton-redondo', href: ruta('plan', { producto: p.id }),
      onclick: () => registrarEvento('plan', { producto: p.id }),
      title: 'Agregar al plan de aplicaciones', 'aria-label': `Agregar ${p.nombre} al plan de aplicaciones`,
    }, icono('calendario'))));
}

// Título de una sección (comité): «FRAC · Fungicidas y bactericidas», con cuántos productos tiene.
function filaSeccion(seccion, n) {
  const [comite, nombre] = SECCIONES[seccion] || SECCIONES.sin;
  return h('tr', { class: `fila-seccion grupo-${seccion}` }, h('td', { colspan: String(COLUMNAS.length) },
    h('div', { class: 'seccion-titulo' },
      comite ? h('span', { class: 'seccion-comite' }, comite) : null,
      h('span', { class: 'seccion-nombre' }, nombre),
      h('span', { class: 'grupo-cuenta' }, plural(n, 'producto', 'productos')))));
}

// Título de un grupo de productos con el mismo modo de acción, en una línea: cada código con una frase breve de lo que
// hacen sus productos (moa.js → breve; la completa al pasar el mouse), el grupo químico aparte y cuántos son.
function filaGrupo(clave, productos) {
  const moa = clave ? clave.split(' + ') : [];
  const sinCodigo = moa.length && tipoDeClave(moa[0]);
  const sistema = moa.length && !sinCodigo ? moa[0].split(' ')[0].toLowerCase() : 'sin';
  // Grupo químico de los ingredientes que dan el código del grupo (o, sin código, de los que dan el tipo).
  const delGrupo = (x) => (sinCodigo ? moa.includes(claveTipo(x.ing.tipo)) : x.ing.moa && moa.includes(familiaMoa(x.ing.moa)));
  const quimicos = [...new Set(productos.flatMap((p) => p.ings.filter(delGrupo).map((x) => x.ing.grupoQuimico)).filter(Boolean))];
  const codigos = moa.map((k, i) => {
    const corta = breve(k);
    return h('span', { class: 'grupo-codigo' }, i ? h('span', { class: 'grupo-mas', 'aria-hidden': 'true' }, '+') : null,
      chipMoa(k), corta ? h('span', { class: 'grupo-que', title: queHace(k) || corta }, corta) : null);
  });
  // Grupo químico aparte, en etiquetas grises (hasta dos; el resto al pasar el mouse).
  const familiasQ = quimicos.length ? h('span', { class: 'grupo-quimicos', title: quimicos.join(' · ') },
    quimicos.slice(0, 2).map((q) => h('span', { class: 'grupo-quimico' }, q)),
    quimicos.length > 2 ? h('span', { class: 'grupo-quimico-mas' }, `+${quimicos.length - 2}`) : null) : null;
  // Botón a la página del grupo: cómo actúa, qué productos son y qué controlan (11-11-2026).
  const masInfo = moa.length ? h('a', {
    class: 'grupo-ver', href: `#/grupo/${encodeURIComponent(clave)}`,
    title: `Cómo actúa ${moa.map(nombreClave).join(' + ')}, sus productos y qué controlan`,
  }, 'Cómo actúa y qué controla', icono('flecha')) : null;
  return h('tr', { class: `fila-grupo grupo-${sistema}` }, h('td', { colspan: String(COLUMNAS.length) },
    h('div', { class: 'grupo-titulo' },
      moa.length ? h('span', { class: 'grupo-codigos' }, codigos) : h('strong', { class: 'grupo-que' }, SIN_GRUPO),
      familiasQ,
      h('span', { class: 'grupo-cuenta' }, plural(productos.length, 'producto', 'productos')),
      masInfo)));
}

// alOrdenar(clave): tocar el título de una columna (sin él, los títulos no se ordenan: página de guardados).
export function tabla(orden, alOrdenar) {
  return h('table', { class: 'tabla-productos' },
    h('colgroup', null, COLUMNAS.map(([, , ancho]) => h('col', { class: `col-${ancho}` }))),
    h('thead', null, h('tr', null, COLUMNAS.map(([titulo, clave]) => {
      if (!clave || !alOrdenar) return h('th', { scope: 'col', 'aria-label': titulo || 'Agregar al plan', class: titulo ? null : 'c-plan' }, titulo);
      const activa = orden.clave === clave;
      const flecha = activa ? (orden.descendente ? 'abajo' : 'arriba') : 'orden';
      // La última palabra va pegada a la flecha: si el título se parte, la flecha no queda sola en una línea.
      const partes = titulo.split(' ');
      const ultima = partes.pop();
      return h('th', { scope: 'col', 'aria-sort': activa ? (orden.descendente ? 'descending' : 'ascending') : 'none' },
        h('button', {
          type: 'button', class: `orden-col${activa ? ' activa' : ''}`, onclick: () => alOrdenar(clave),
          title: activa ? 'Tocar para invertir el orden' : `Ordenar por ${titulo.toLowerCase()}`,
        }, partes.length ? `${partes.join(' ')} ` : null, h('span', { class: 'orden-fin' }, ultima, icono(flecha))));
    }))),
    h('tbody'));
}

// ---------- Vista ----------

export async function render(main, ctx) {
  const { cat, params } = ctx;
  const lista = (k) => (params.get(k) || '').split(',').map((x) => x.trim()).filter(Boolean);
  const estado = {
    cultivos: lista('cultivo'),
    objetivos: lista('objetivo'),
    oq: limpio(params.get('oq')),
    cats: lista('cat'),
    q: limpio(params.get('q')),
    empresas: lista('empresa'),
    moa: params.get('moa') && params.get('moa') !== 'sin' ? familiaMoa(params.get('moa')) : params.get('moa') || '',
    ing: params.get('ing') || '',
    orden: ORDENES[params.get('orden')] ? params.get('orden') : 'moa',
    inv: params.get('inv') === '1',
  };
  // Links antiguos: empresa por id (#/productos?empresa=<id>).
  estado.empresas = estado.empresas.map((e) => (cat.empresas.has(e) ? nombreCorto(cat.empresas.get(e).nombre) : e));

  const cultivos = estado.cultivos.map((id) => cat.cultivos.get(id)).filter(Boolean);
  const objetivos = estado.objetivos.map((id) => cat.objetivos.get(id)).filter(Boolean);
  const ing = estado.ing ? cat.ingredientes.get(estado.ing) : null;
  const conLineas = Boolean(cultivos.length || objetivos.length || estado.oq);
  const base = () => ({
    cultivo: estado.cultivos.join(','), objetivo: estado.objetivos.join(','), oq: estado.oq, cat: estado.cats.join(','),
    q: estado.q, empresa: estado.empresas.join(','), moa: estado.moa, ing: estado.ing,
    orden: estado.orden === 'moa' ? '' : estado.orden, inv: estado.inv ? '1' : '',
  });
  const hayFiltros = () => Boolean(estado.q || estado.cultivos.length || estado.objetivos.length || estado.oq
    || estado.cats.length || estado.empresas.length || estado.moa || estado.ing);

  // El título dice lo que es (11-11-2026: «borra el "¿Qué aplico?", ponle un nombre como de lo que es»).
  main.append(h('h1', { class: 'titulo-inicio' }, 'Buscador de productos'));
  if (cultivos.length < estado.cultivos.length || objetivos.length < estado.objetivos.length) {
    main.append(h('div', { class: 'nota nota-alerta' }, 'No encontramos ese cultivo u objetivo. ', h('a', { href: '#/buscar' }, 'Empezar de nuevo')));
    return;
  }

  // Líneas de uso (solo si hay cultivo u objetivo): se piden antes de armar los filtros para que las
  // sugerencias muestren solo lo que existe con lo ya elegido.
  const zona = h('div', null, conLineas ? cargando('Buscando los productos registrados…', 'inicio') : null);
  const panel = h('div', { class: 'panel-filtros', role: 'search', hidden: true });
  main.append(panel, zona);

  // Líneas que calzan con los cultivos y las plagas elegidas (varias de cada una: vale cualquiera).
  let lineas = null;
  let lineasCultivo = null; // solo por cultivo: para ofrecer las plagas de esos cultivos
  let resaltados = null;
  if (conLineas) {
    if (cultivos.length) {
      const grupos = await Promise.all(cultivos.map((c) => usosPorCultivo(c.id, c.variantes)));
      lineasCultivo = [...new Map(grupos.flat().map((u) => [u.id, u])).values()];
      lineas = lineasCultivo;
      if (objetivos.length || estado.oq) {
        resaltados = new Set(objetivos.map((o) => o.id));
        if (estado.oq) {
          const q = palabras(estado.oq);
          for (const u of lineasCultivo) for (const t of u.objetivos) { const o = cat.objetivos.get(t); if (o && puntaje(q, o.palabras)) resaltados.add(t); }
        }
      }
    } else {
      const ids = new Set(objetivos.map((o) => o.id));
      if (estado.oq) {
        for (const o of filtrar([...cat.objetivos.values()].filter((x) => x.nLineas), estado.oq, (x) => x.palabras, (x) => x.nLineas).slice(0, MAX_OBJETIVOS_TEXTO)) ids.add(o.id);
      }
      resaltados = ids;
      lineas = ids.size ? await usosPorObjetivos([...ids]) : [];
    }
    if (!ctx.vigente()) return;
    if (resaltados) lineas = lineas.filter((u) => u.objetivos.some((t) => resaltados.has(t)));
  }

  // ---- Filtros ----
  // Arriba el buscador de todo y una X que borra todos los filtros; debajo, cuatro listas con varias opciones
  // (11-11-2026). El filtro de modo de acción se quitó («nadie lo va a usar»): se llega a un código tocando su chip.
  const objetivosDisponibles = () => {
    if (!lineasCultivo) return [...cat.objetivos.values()].filter((o) => o.nLineas).map((o) => ({ o, n: o.nProductos }));
    const m = new Map();
    for (const u of lineasCultivo) for (const t of u.objetivos) {
      const o = cat.objetivos.get(t);
      if (!o) continue;
      if (!m.has(t)) m.set(t, { o, productos: new Set() });
      m.get(t).productos.add(u.product_id);
    }
    return [...m.values()].map((x) => ({ o: x.o, n: x.productos.size }));
  };
  const cultivosDisponibles = () => {
    if (!lineas || cultivos.length) return [...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase).map((c) => ({ c, n: c.nProductos }));
    const m = new Map();
    for (const u of lineas) {
      for (const c of cultivosVisibles(cat, [u.crop_id])) {
        if (!m.has(c.id)) m.set(c.id, { c, productos: new Set() });
        m.get(c.id).productos.add(u.product_id);
      }
    }
    return [...m.values()].map((x) => ({ c: x.c, n: x.productos.size }));
  };
  const enTabla = [...cat.productos.values()].filter(enListas);
  const calzaTexto = (texto, q) => !limpio(q) || normalizar(texto).includes(normalizar(q));
  const porCategoria = new Map();
  for (const p of enTabla) for (const c of p.categorias) porCategoria.set(c.id, (porCategoria.get(c.id) || 0) + 1);
  const porMarca = new Map();
  for (const p of enTabla) if (p.marca) porMarca.set(p.marca, (porMarca.get(p.marca) || 0) + 1);
  const valores = (xs) => xs.map((x) => x.valor);

  const texto = h('input', {
    class: 'entrada entrada-busqueda', id: 'f-q', type: 'search', value: estado.q,
    placeholder: 'Producto, ingrediente, empresa, cultivo, plaga o código (ej: FRAC 3)',
    autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search',
  });
  const limpiar = h('button', {
    type: 'button', class: 'boton-redondo limpiar-filtros', title: 'Borrar todos los filtros', 'aria-label': 'Borrar todos los filtros',
    onclick: () => {
      if (location.hash.replace(/^#\/?/, '').split('?')[0] === 'buscar' && !conLineas && !estado.moa && !estado.ing) {
        // Sin filtros que pidan datos: se limpia aquí mismo (más rápido que volver a abrir la página).
        estado.q = ''; estado.cats = []; estado.empresas = []; texto.value = '';
        vaciar(filtrosLista); filtrosLista.append(...armarSelectores());
        pintar();
      } else ir({ orden: estado.orden === 'moa' ? '' : estado.orden, inv: estado.inv ? '1' : '' });
    },
  }, icono('cerrar'));

  function armarSelectores() {
    return [
      selectorMultiple({
        id: 'f-cultivo', titulo: 'Cultivo', vacio: 'Todos', buscar: 'Buscar cultivo (ej: cerezo, uva)',
        elegidos: cultivos.map((c) => ({ valor: c.id, etiqueta: recortar(c.nombre, 40) })),
        opciones: (t) => {
          const xs = cultivosDisponibles();
          const el = limpio(t) ? filtrar(xs, t, (x) => x.c.palabras, (x) => x.n, 60) : xs.sort((a, b) => b.n - a.n).slice(0, 60);
          return el.map((x) => ({ valor: x.c.id, etiqueta: recortar(x.c.nombre, 60), detalle: plural(x.n, 'producto', 'productos') }));
        },
        alAplicar: (xs) => ir({ ...base(), cultivo: valores(xs).join(',') }),
      }),
      selectorMultiple({
        id: 'f-objetivo', titulo: 'Plaga, enfermedad o maleza', vacio: 'Todas', buscar: 'Buscar (ej: avenilla, oídio, pulgón)',
        elegidos: [
          ...objetivos.map((o) => ({ valor: o.id, etiqueta: nombreObjetivo(o) })),
          ...(estado.oq ? [{ valor: `oq:${estado.oq}`, etiqueta: `Todos los que dicen «${estado.oq}»` }] : []),
        ],
        opciones: (t) => {
          const xs = objetivosDisponibles();
          const q = limpio(t);
          if (!q) return xs.sort((a, b) => b.n - a.n).slice(0, 60).map((x) => ({ valor: x.o.id, etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos') }));
          const calzan = filtrar(xs, q, (x) => x.o.palabras, (x) => x.n);
          // Los objetivos vienen con muchas variantes («Avenilla», «Avenilla (Avena fatua)»…): primero, todos juntos.
          const ops = calzan.length >= 2 ? [{ valor: `oq:${q}`, etiqueta: `Todos los que dicen «${q}»`, detalle: plural(calzan.length, 'variante', 'variantes'), clase: 'opcion-todos' }] : [];
          return ops.concat(calzan.slice(0, 60).map((x) => ({ valor: x.o.id, etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos') })));
        },
        alAplicar: (xs) => {
          const textos = valores(xs).filter((v) => v.startsWith('oq:')).map((v) => v.slice(3));
          ir({ ...base(), objetivo: valores(xs).filter((v) => !v.startsWith('oq:')).join(','), oq: textos[textos.length - 1] || '' });
        },
      }),
      selectorMultiple({
        id: 'f-cat', titulo: 'Tipo', vacio: 'Todos', buscar: 'Buscar tipo (ej: fungicida)',
        elegidos: estado.cats.map((id) => cat.categorias.get(Number(id)) || cat.categorias.get(id)).filter(Boolean)
          .map((c) => ({ valor: String(c.id), etiqueta: c.nombre })),
        opciones: (t) => [...cat.categorias.values()].filter((c) => porCategoria.get(c.id) && calzaTexto(c.nombre, t))
          .sort((a, b) => porCategoria.get(b.id) - porCategoria.get(a.id))
          .map((c) => ({ valor: String(c.id), etiqueta: c.nombre, detalle: plural(porCategoria.get(c.id), 'producto', 'productos') })),
        alAplicar: (xs) => { estado.cats = valores(xs); pintar(); },
      }),
      selectorMultiple({
        id: 'f-empresa', titulo: 'Empresa', vacio: 'Todas', buscar: 'Buscar empresa',
        elegidos: estado.empresas.map((e) => ({ valor: e, etiqueta: e })),
        opciones: (t) => [...porMarca.keys()].filter((m) => calzaTexto(m, t)).sort((a, b) => a.localeCompare(b, 'es'))
          .map((m) => ({ valor: m, etiqueta: m, detalle: plural(porMarca.get(m), 'producto', 'productos') })),
        alAplicar: (xs) => { estado.empresas = valores(xs); pintar(); },
      }),
    ];
  }
  const filtrosLista = h('div', { class: 'filtros-lista' }, armarSelectores());

  panel.append(
    h('div', { class: 'filtro filtro-busqueda' },
      h('label', { class: 'filtro-titulo', for: 'f-q' }, 'Buscar en todo'),
      h('div', { class: 'fila-busqueda' }, h('div', { class: 'busqueda' }, icono('buscar'), texto), limpiar)),
    filtrosLista);

  panel.hidden = false;

  // ---- Resultados ----
  // Con cultivo u objetivo: cultivos y dosis de cada producto salen de las líneas que calzan.
  const porProducto = new Map();
  if (lineas) {
    for (const u of lineas) {
      if (!porProducto.has(u.product_id)) porProducto.set(u.product_id, []);
      porProducto.get(u.product_id).push(u);
    }
  }
  const ordenCultivos = (ids) => cultivosVisibles(cat, ids)
    .sort((a, b) => estado.cultivos.includes(b.id) - estado.cultivos.includes(a.id) || b.nProductos - a.nProductos || a.nombre.localeCompare(b.nombre, 'es'));
  // Las líneas no cambian mientras se escribe: el resumen de cada producto se calcula una vez.
  const infos = new Map();
  const infoDe = (p) => {
    if (!infos.has(p)) {
      const us = lineas ? porProducto.get(p.id) || [] : null;
      infos.set(p, us ? { cultivos: ordenCultivos([...new Set(us.map((u) => u.crop_id))]), resumen: resumenDosis(us) }
        : { cultivos: ordenCultivos(p.cultivoIds), resumen: p.resumenDosis });
    }
    return infos.get(p);
  };

  // Plagas, enfermedades y malezas que calzan con cada palabra buscada (texto → productos), ya traídas de la base.
  const objetivosResueltos = new Map();
  const pintar = () => {
    ctx.cambiarParams(base());
    limpiar.disabled = !hayFiltros();
    vaciar(zona);
    const busqueda = separarBusqueda(estado.q);
    busqueda.porObjetivo = new Map();
    const pendientes = [];
    for (const q of busqueda.palabras) {
      const t = raizObjetivo(q);
      if (!t) continue;
      if (objetivosResueltos.has(t)) busqueda.porObjetivo.set(q, objetivosResueltos.get(t));
      else pendientes.push(t);
    }
    if (pendientes.length) {
      const consulta = estado.q;
      Promise.all(pendientes.map((t) => productosPorObjetivo(t).then((s) => objetivosResueltos.set(t, s))))
        .then(() => { if (estado.q === consulta && ctx.vigente()) pintar(); });
    }
    const candidatos = lineas ? [...porProducto.keys()].map((id) => cat.productos.get(id)).filter(Boolean) : [...cat.productos.values()];
    const visibles = candidatos.filter((p) => {
      if (!enListas(p)) return false;
      if (estado.cats.length && !p.categorias.some((c) => estado.cats.includes(String(c.id)))) return false;
      if (estado.empresas.length && !estado.empresas.includes(p.marca)) return false;
      if (estado.moa === 'sin' && gruposDe(p).length) return false;
      if (estado.moa && estado.moa !== 'sin' && !gruposDe(p).includes(estado.moa)
        && ![...p.moaEtiqueta.values()].some((xs) => xs.includes(estado.moa))) return false;
      if (ing && !p.ings.some((x) => x.ing === ing)) return false;
      return calzaBusqueda(busqueda, p, infoDe(p));
    });
    const nombre = (a, b) => comparaTexto(a.nombre, b.nombre);
    const descendente = MAYOR_PRIMERO.has(estado.orden) !== estado.inv;
    const signo = descendente ? -1 : 1;
    visibles.sort((a, b) => {
      if (estado.orden === 'moa') {
        // Los sin ingrediente siempre al final; dentro de cada grupo, por nombre.
        const ga = gruposDe(a);
        const gb = gruposDe(b);
        const d = compararGrupos(ga, gb);
        return (ga.length && gb.length ? d * signo : d) || nombre(a, b);
      }
      const va = valorOrden(estado.orden, a, infos.get(a));
      const vb = valorOrden(estado.orden, b, infos.get(b));
      const faltaA = va == null || va === '';
      const faltaB = vb == null || vb === '';
      if (faltaA || faltaB) return (faltaA - faltaB) || nombre(a, b);
      const d = typeof va === 'number' && typeof vb === 'number' ? va - vb : comparaTexto(va, vb);
      return d * signo || nombre(a, b);
    });
    const ordenar = (clave) => {
      if (estado.orden === clave) estado.inv = !estado.inv;
      else { estado.orden = clave; estado.inv = false; }
      pintar();
    };

    // Barra: cantidad, ingrediente elegido (desde la ficha) y el orden (en el celular, donde no se ven los títulos
    // de las columnas).
    const orden = h('select', { class: 'selector', 'aria-label': 'Ordenar' },
      Object.entries(ORDENES).map(([v, t]) => h('option', { value: v, selected: v === estado.orden }, t)));
    orden.addEventListener('change', () => { estado.orden = orden.value; estado.inv = false; pintar(); });
    zona.append(h('div', { class: 'barra-tabla' },
      h('p', { class: 'cuenta', 'aria-live': 'polite' }, h('strong', null, plural(visibles.length, 'producto', 'productos'))),
      ing ? h('a', { class: 'chip', 'aria-pressed': 'true', href: ruta('buscar', { ...base(), ing: '' }), title: 'Quitar este filtro' }, `Ingrediente: ${ing.nombre}`, icono('cerrar')) : null,
      // El código elegido desde un chip (ya no hay lista de modo de acción): se ve y se quita aquí.
      estado.moa ? h('a', { class: 'chip', 'aria-pressed': 'true', href: ruta('buscar', { ...base(), moa: '' }), title: 'Quitar este filtro' },
        `Modo de acción: ${estado.moa === 'sin' ? SIN_GRUPO : nombreClave(estado.moa)}`, icono('cerrar')) : null,
      h('div', { class: 'orden' }, h('label', null, 'Orden', orden),
        h('button', {
          type: 'button', class: 'boton-redondo', onclick: () => ordenar(estado.orden),
          title: 'Invertir el orden', 'aria-label': `Invertir el orden (ahora ${descendente ? 'de mayor a menor' : 'de menor a mayor'})`,
        }, icono(descendente ? 'abajo' : 'arriba')))));

    // Si lo escrito es un cultivo o una plaga, ofrecer ese filtro.
    if (estado.q.length >= 3) {
      const sug = [];
      if (!cultivos.length) {
        for (const c of filtrar([...cat.cultivos.values()].filter((x) => x.nLineas && !x.esFrase), estado.q, (x) => x.palabras, (x) => x.nProductos, 2)) {
          sug.push(h('a', { class: 'chip', href: ruta('buscar', { ...base(), q: '', cultivo: c.id }) }, `Cultivo: ${recortar(c.nombre, 30)}`));
        }
      }
      if (!objetivos.length && !estado.oq) {
        const n = filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), estado.q, (o) => o.palabras, (o) => o.nLineas).length;
        if (n) sug.push(h('a', { class: 'chip', href: ruta('buscar', { ...base(), q: '', oq: estado.q }) }, `Plaga, enfermedad o maleza: «${estado.q}»`, h('small', null, plural(n, 'objetivo', 'objetivos'))));
      }
      if (sug.length) zona.append(h('div', { class: 'sugerencias' }, h('span', { class: 'chico tenue' }, '¿Buscabas esto?'), sug));
    }

    // Mientras llegan las plagas que calzan con lo escrito, sin «ningún producto» (en un momento se vuelve a dibujar).
    if (!visibles.length && pendientes.length) {
      zona.append(cargando('Buscando…', 'lista'));
      return;
    }
    if (!visibles.length) {
      zona.append(h('div', { class: 'vacio' }, h('p', null, h('strong', null, 'Ningún producto cumple esos filtros')),
        h('a', { class: 'boton', href: '#/buscar' }, 'Quitar filtros')));
      return;
    }
    const cuerpo = tabla({ clave: estado.orden, descendente }, ordenar);
    const tbody = cuerpo.querySelector('tbody');
    const masZona = h('div', { class: 'ver-mas-zona' });
    let mostrados = 0;
    const op = { cultivoId: estado.cultivos[0] || null, agrupar: estado.orden === 'moa' };
    // Agrupados por modo de acción: un título antes del primer producto de cada grupo.
    const porGrupo = new Map();
    const porSeccion = new Map();
    if (op.agrupar) {
      for (const p of visibles) porSeccion.set(seccionDe(claveGrupo(p)), (porSeccion.get(seccionDe(claveGrupo(p))) || 0) + 1);
      for (const p of visibles) {
        const k = claveGrupo(p);
        if (!porGrupo.has(k)) porGrupo.set(k, []);
        porGrupo.get(k).push(p);
      }
    }
    let grupoAnterior = null;
    let seccionAnterior = null;
    const mostrarMas = () => {
      for (const p of visibles.slice(mostrados, mostrados + POR_PAGINA)) {
        if (op.agrupar && seccionDe(claveGrupo(p)) !== seccionAnterior) {
          seccionAnterior = seccionDe(claveGrupo(p));
          tbody.append(filaSeccion(seccionAnterior, porSeccion.get(seccionAnterior)));
        }
        if (op.agrupar && claveGrupo(p) !== grupoAnterior) {
          grupoAnterior = claveGrupo(p);
          tbody.append(filaGrupo(grupoAnterior, porGrupo.get(grupoAnterior)));
        }
        tbody.append(fila(p, infos.get(p), op));
      }
      mostrados += POR_PAGINA;
      vaciar(masZona);
      if (mostrados < visibles.length) {
        masZona.append(h('button', { class: 'boton', type: 'button', onclick: mostrarMas }, `Ver ${Math.min(POR_PAGINA, visibles.length - mostrados)} más`));
      }
    };
    mostrarMas();
    zona.append(cuerpo, masZona);
  };

  texto.addEventListener('input', retrasar(() => { estado.q = limpio(texto.value); pintar(); }, 150));
  // Evento «busqueda»: 2 segundos después de dejar de escribir, con 3 letras o más y sin repetir el mismo texto seguido.
  let ultimaBusqueda = '';
  texto.addEventListener('input', retrasar(() => {
    const t = limpio(texto.value);
    if (t.length >= 3 && t !== ultimaBusqueda) { ultimaBusqueda = t; registrarEvento('busqueda', { detalle: t }); }
  }, 2000));
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); texto.blur(); } });
  pintar();
}
