// Buscador (#/buscar; fue el inicio hasta el 02-11-2026): tabla de productos (una fila por producto) con un buscador
// principal (busca mientras se escribe en todas las columnas) y filtros por cultivo, plaga/enfermedad/maleza, tipo de
// producto, empresa y modo de acción. Es también «¿Qué aplico?»: con cultivo u objetivo, los cultivos y la dosis de cada
// fila salen solo de las líneas de uso que calzan. Los productos que no se usan en Chile no aparecen.
// Parámetros: cultivo=<id>, objetivo=<id>, oq=<texto de objetivo>, cat=<id>, q=<texto>, empresa=<nombre corto>,
// moa=<clave>|sin, ing=<id>, orden=moa|nombre|empresa|tipo|ing|cultivos, inv=1 (orden al revés)
import {
  usosPorCultivo, usosPorObjetivos, compararMoa, nombreCorto, familiaMoa, claveMoa, tipoFormulacion as tipoDe,
  cultivosVisibles, enListas,
} from '../db.js';
import { filtrar, palabras, puntaje, normalizar, preparar, contiene } from '../buscador.js';
import {
  h, icono, ruta, plural, recortar, limpio, vaciar, cargando, retrasar, combo, globo,
  chipsMoa, chipMoa, ingredientesTexto, dosisRango, resumenDosis, rangosDosis,
} from '../ui.js';
import { queHace, TIPOS, ORDEN_TIPOS, claveTipo, tipoDeClave } from '../moa.js';

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
// 11-11-2026 (Cristóbal: «reducir tanta info»): sin la columna del registro SAG y con la etiqueta (ícono) antes de la dosis.
const COLUMNAS = [
  ['Producto', 'nombre', 'producto'], ['Empresa', 'empresa', 'empresa'], ['Modo de acción', 'moa', 'moa'], ['Tipo', 'tipo', 'tipo'],
  ['Ingrediente activo', 'ing', 'ing'], ['Cultivos', 'cultivos', 'cultivos'], ['Etiqueta', null, 'etiqueta'],
  ['Dosis', null, 'dosis'], ['', null, 'plan'],
];
const SIN_GRUPO = 'Sin ingrediente activo en los datos';

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
const gruposDe = (p) => (p.familias.length ? p.familias : p.tipos.map(claveTipo));
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
// grupo químico, formulación, ingredientes con su concentración, cultivos (con sus sinónimos) y dosis. El registro SAG ya
// no va (la columna se sacó el 11-11-2026).
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
      tipoDe(p), p.formulacion,
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
    const rangos = rangosDosis(info.resumen.grupos);
    const dosis = rangos.length ? rangos.join(' ') : limpio(info.resumen.texto);
    textos.set(info, preparar(`${textoFijo(p)} ${cultivos} ${dosis}`));
  }
  return textos.get(info);
}

// Los códigos escritos tienen que estar en el producto; las demás palabras, en alguna columna.
function calzaBusqueda(b, p, info) {
  for (const k of b.grupos) {
    if (!p.moa.includes(k) && !p.familias.includes(k) && ![...p.moaEtiqueta.values()].some((xs) => xs.includes(k))) return false;
  }
  return !b.palabras.length || contiene(textoFila(p, info), b.palabras);
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
  return h('span', { class: 'cultivos' }, h('span', { class: 'recorte-2', title: cultivos.length <= VISIBLES_CULTIVOS ? nombres : null }, nombres), boton);
}

// En el celular las celdas sin dato no se muestran (en la tabla quedan con «—»).
const vacia = (clase, valor) => (valor ? clase : `${clase} vacia`);

function fila(p, info, op) {
  const url = p.etiqueta && p.etiqueta.url;
  const principal = p.empresas[0];
  const tipo = tipoDe(p);
  // La franja de color va siempre (no solo agrupados): el sistema del primer código.
  const sistema = p.moa.length ? String(p.moa[0]).split(' ')[0].toLowerCase() : null;
  // Sin código: lo que es («Regulador», «Feromona»…), también como botón a todos los de su tipo.
  const codigos = p.moa.length ? chipsMoa(p.moa, p.moaEtiqueta) : chipsMoa(p.tipos.map(claveTipo));
  const categorias = p.categorias.map((c) => c.nombre).join(' · ');
  return h('tr', { class: `fila-producto ${sistema ? `grupo-${sistema}` : 'grupo-sin'}` },
    h('td', { class: 'c-producto' },
      h('a', { href: ruta(`producto/${p.id}`, { cultivo: op.cultivoId }), title: p.nombre }, p.nombre),
      categorias ? h('span', { class: 'c-cat', title: categorias }, categorias) : null),
    h('td', { class: vacia('c-empresa', p.marca), 'data-etiqueta': 'Empresa', title: principal ? principal.empresa.nombre : null }, p.marca || '—'),
    h('td', { class: vacia('c-moa', codigos), 'data-etiqueta': 'Modo de acción' },
      codigos || h('span', { class: 'tenue', title: SIN_GRUPO }, '—')),
    h('td', { class: vacia('c-tipo', tipo), 'data-etiqueta': 'Tipo', title: p.formulacion || null }, tipo || '—'),
    h('td', { class: 'c-ing', 'data-etiqueta': 'Ingrediente activo', title: ingredientesTexto(p) },
      h('span', { class: 'recorte-2' }, p.ings.length ? p.ings.map((x) => x.ing.nombre).join(' + ') : h('span', { class: 'tenue' }, 'Sin ingrediente registrado'))),
    h('td', { class: 'c-cultivos', 'data-etiqueta': 'Cultivos' }, listaCultivos(info.cultivos)),
    // La etiqueta es solo un ícono (hoja con lupa) en el verde de énfasis; el título de la columna ya dice qué es.
    h('td', { class: vacia('c-etiqueta', url), 'data-etiqueta': 'Etiqueta' },
      url ? h('a', {
        class: 'boton-etiqueta', href: url, target: '_blank', rel: 'noopener',
        title: 'Abrir la etiqueta (PDF)', 'aria-label': `Abrir la etiqueta de ${p.nombre} (PDF)`,
      }, icono('etiqueta')) : h('span', { class: 'tenue', title: 'Sin PDF de la etiqueta en el sistema' }, '—')),
    h('td', { class: 'c-dosis', 'data-etiqueta': 'Dosis' }, dosisRango(info.resumen, 1, { soloRevisado: true })),
    h('td', { class: 'c-plan' }, h('a', {
      class: 'boton-redondo', href: ruta('plan', { producto: p.id }),
      title: 'Agregar al plan de aplicaciones', 'aria-label': `Agregar ${p.nombre} al plan de aplicaciones`,
    }, icono('calendario'))));
}

// Título de un grupo de productos con el mismo modo de acción: cada código con lo que hacen sus productos (moa.js),
// el grupo químico y cuántos son.
function filaGrupo(clave, productos) {
  const moa = clave ? clave.split(' + ') : [];
  const sinCodigo = moa.length && tipoDeClave(moa[0]);
  const sistema = moa.length && !sinCodigo ? moa[0].split(' ')[0].toLowerCase() : 'sin';
  // Grupo químico de los ingredientes que dan el código del grupo (o, sin código, de los que dan el tipo).
  const delGrupo = (x) => (sinCodigo ? moa.includes(claveTipo(x.ing.tipo)) : x.ing.moa && moa.includes(familiaMoa(x.ing.moa)));
  const quimicos = [...new Set(productos.flatMap((p) => p.ings.filter(delGrupo).map((x) => x.ing.grupoQuimico)).filter(Boolean))];
  const codigos = moa.map((k, i) => {
    const que = queHace(k);
    return h('span', { class: 'grupo-codigo' }, i ? h('span', { class: 'grupo-mas', 'aria-hidden': 'true' }, '+') : null,
      chipMoa(k), que ? h('span', { class: 'grupo-que', title: que }, que) : null);
  });
  return h('tr', { class: `fila-grupo grupo-${sistema}` }, h('td', { colspan: String(COLUMNAS.length) },
    h('div', { class: 'grupo-titulo' },
      moa.length ? h('span', { class: 'grupo-codigos' }, codigos) : h('strong', { class: 'grupo-que' }, SIN_GRUPO),
      quimicos.length ? h('span', { class: 'grupo-quimico', title: quimicos.join(' · ') }, quimicos.join(' · ')) : null,
      h('span', { class: 'grupo-cuenta' }, plural(productos.length, 'producto', 'productos')))));
}

// alOrdenar(clave): tocar el título de una columna.
function tabla(orden, alOrdenar) {
  return h('table', { class: 'tabla-productos' },
    h('colgroup', null, COLUMNAS.map(([, , ancho]) => h('col', { class: `col-${ancho}` }))),
    h('thead', null, h('tr', null, COLUMNAS.map(([titulo, clave]) => {
      if (!clave) return h('th', { scope: 'col', 'aria-label': titulo || 'Agregar al plan', class: titulo ? null : 'c-plan' }, titulo);
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
  const estado = {
    cultivo: params.get('cultivo') || '',
    objetivo: params.get('objetivo') || '',
    oq: limpio(params.get('oq')),
    cat: params.get('cat') || '',
    q: limpio(params.get('q')),
    empresa: params.get('empresa') || '',
    moa: params.get('moa') && params.get('moa') !== 'sin' ? familiaMoa(params.get('moa')) : params.get('moa') || '',
    ing: params.get('ing') || '',
    orden: ORDENES[params.get('orden')] ? params.get('orden') : 'moa',
    inv: params.get('inv') === '1',
  };
  // Links antiguos: empresa por id (#/productos?empresa=<id>).
  if (cat.empresas.has(estado.empresa)) estado.empresa = nombreCorto(cat.empresas.get(estado.empresa).nombre);

  const cultivo = estado.cultivo ? cat.cultivos.get(estado.cultivo) : null;
  const objetivo = estado.objetivo ? cat.objetivos.get(estado.objetivo) : null;
  const ing = estado.ing ? cat.ingredientes.get(estado.ing) : null;
  const conLineas = Boolean(cultivo || objetivo || estado.oq);
  const base = () => ({ cultivo: estado.cultivo, objetivo: estado.objetivo, oq: estado.oq, cat: estado.cat, q: estado.q, empresa: estado.empresa, moa: estado.moa, ing: estado.ing, orden: estado.orden === 'moa' ? '' : estado.orden, inv: estado.inv ? '1' : '' });

  main.append(h('h1', { class: 'titulo-inicio' }, '¿Qué aplico?'));
  if ((estado.cultivo && !cultivo) || (estado.objetivo && !objetivo)) {
    main.append(h('div', { class: 'nota nota-alerta' }, 'No encontramos ese cultivo u objetivo. ', h('a', { href: '#/buscar' }, 'Empezar de nuevo')));
    return;
  }

  // Líneas de uso (solo si hay cultivo u objetivo): se piden antes de armar los filtros para que las
  // sugerencias muestren solo lo que existe con lo ya elegido.
  const zona = h('div', null, conLineas ? cargando('Buscando los productos registrados…', 'inicio') : null);
  // Empresa y modo de acción: en pantallas anchas van en la misma fila que el resto; en el celular, tras «Más filtros».
  const panel = h('div', { class: `panel-filtros${estado.empresa || estado.moa ? ' con-extra' : ''}`, role: 'search', hidden: true });
  main.append(panel, zona);

  let lineas = null;
  let resaltados = null;
  let textoObjetivo = objetivo ? nombreObjetivo(objetivo) : '';
  if (conLineas) {
    if (cultivo) {
      lineas = await usosPorCultivo(cultivo.id, cultivo.variantes);
      if (objetivo) resaltados = new Set([objetivo.id]);
      else if (estado.oq) {
        const q = palabras(estado.oq);
        resaltados = new Set();
        for (const u of lineas) for (const t of u.objetivos) { const o = cat.objetivos.get(t); if (o && puntaje(q, o.palabras)) resaltados.add(t); }
      }
    } else {
      let ids = [objetivo && objetivo.id].filter(Boolean);
      if (!objetivo) {
        ids = filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), estado.oq, (o) => o.palabras, (o) => o.nLineas).map((o) => o.id).slice(0, MAX_OBJETIVOS_TEXTO);
      }
      resaltados = new Set(ids);
      lineas = ids.length ? await usosPorObjetivos(ids) : [];
    }
    if (!ctx.vigente()) return;
    if (resaltados) lineas = lineas.filter((u) => u.objetivos.some((t) => resaltados.has(t)));
    if (estado.oq) textoObjetivo = `Todos los que dicen «${estado.oq}» (${plural(resaltados.size, 'objetivo', 'objetivos')})`;
  }

  // ---- Filtros ----
  const objetivosDisponibles = () => {
    if (!cultivo) return [...cat.objetivos.values()].filter((o) => o.nLineas).map((o) => ({ o, n: o.nProductos }));
    const m = new Map();
    for (const u of lineas) for (const t of u.objetivos) {
      const o = cat.objetivos.get(t);
      if (!o) continue;
      if (!m.has(t)) m.set(t, { o, productos: new Set() });
      m.get(t).productos.add(u.product_id);
    }
    return [...m.values()].map((x) => ({ o: x.o, n: x.productos.size }));
  };
  const cultivosDisponibles = () => {
    if (!lineas || cultivo) return [...cat.cultivos.values()].filter((c) => c.nLineas && !c.esFrase).map((c) => ({ c, n: c.nProductos }));
    const m = new Map();
    for (const u of lineas) {
      for (const c of cultivosVisibles(cat, [u.crop_id])) {
        if (!m.has(c.id)) m.set(c.id, { c, productos: new Set() });
        m.get(c.id).productos.add(u.product_id);
      }
    }
    return [...m.values()].map((x) => ({ c: x.c, n: x.productos.size }));
  };
  const quitarObjetivo = ruta('buscar', { ...base(), objetivo: '', oq: '' });

  const selCat = h('select', { class: 'selector', id: 'f-cat' },
    h('option', { value: '' }, 'Todos'),
    [...cat.categorias.values()].map((c) => {
      const n = [...cat.productos.values()].filter((p) => enListas(p) && p.categorias.includes(c)).length;
      return n ? h('option', { value: c.id, selected: String(c.id) === estado.cat }, `${c.nombre} (${n})`) : null;
    }));
  const texto = h('input', {
    class: 'entrada entrada-busqueda', id: 'f-q', type: 'search', value: estado.q, placeholder: 'Ej: Tecto, cobre, FRAC 3',
    autocomplete: 'off', spellcheck: 'false', enterkeyhint: 'search',
  });
  const selEmpresa = h('select', { class: 'selector', id: 'f-empresa' },
    h('option', { value: '' }, 'Todas'),
    [...cat.marcas.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((m) => h('option', { value: m.nombre, selected: m.nombre === estado.empresa }, `${m.nombre} (${m.productos.length})`)));
  // Cuántos productos de la tabla (los que se usan en Chile) hay en cada código y en cada tipo sin código.
  const enTabla = [...cat.productos.values()].filter(enListas);
  const sinGrupo = enTabla.filter((p) => !gruposDe(p).length).length;
  const porFamilia = new Map();
  for (const p of enTabla) for (const k of gruposDe(p)) porFamilia.set(k, (porFamilia.get(k) || 0) + 1);
  const familiasMoa = [...porFamilia.keys()].filter((k) => !tipoDeClave(k)).sort(compararMoa);
  const tiposMoa = ORDEN_TIPOS.map(claveTipo).filter((k) => porFamilia.has(k));
  // Un código antiguo de la etiqueta («HRAC A», desde un link del inicio) también filtra: queda como opción.
  const moaRaro = estado.moa && estado.moa !== 'sin' && !porFamilia.has(estado.moa);
  const opcion = (k, texto) => h('option', { value: k, selected: k === estado.moa }, `${texto} (${porFamilia.get(k)})`);
  const selMoa = h('select', { class: 'selector', id: 'f-moa' },
    h('option', { value: '' }, 'Todos'),
    moaRaro ? h('option', { value: estado.moa, selected: true }, `${estado.moa} (en la etiqueta)`) : null,
    familiasMoa.map((k) => opcion(k, k)),
    tiposMoa.length ? h('optgroup', { label: 'Sin código FRAC, IRAC ni HRAC' },
      tiposMoa.map((k) => opcion(k, TIPOS[tipoDeClave(k)].nombre))) : null,
    sinGrupo ? h('option', { value: 'sin', selected: estado.moa === 'sin' }, `${SIN_GRUPO} (${sinGrupo})`) : null);
  const verExtra = h('button', {
    type: 'button', class: 'ver-extra', 'aria-expanded': String(panel.classList.contains('con-extra')),
    onclick: () => { verExtra.setAttribute('aria-expanded', String(panel.classList.toggle('con-extra'))); },
  }, 'Más filtros: empresa y modo de acción');

  panel.append(
    h('div', { class: 'filtros' },
      h('div', { class: 'filtro filtro-busqueda' },
        h('label', { class: 'filtro-titulo', for: 'f-q' }, 'Buscar en la tabla'),
        h('div', { class: 'busqueda' }, icono('buscar'), texto)),
      combo({
        id: 'f-cultivo', titulo: 'Cultivo', placeholder: 'Ej: cerezo, uva, trigo',
        elegido: cultivo ? recortar(cultivo.nombre, 50) : null,
        quitar: ruta('buscar', { ...base(), cultivo: '' }),
        opciones: (t) => {
          const lista = cultivosDisponibles();
          const elegidos = limpio(t) ? filtrar(lista, t, (x) => x.c.palabras, (x) => x.n, 40) : lista.sort((a, b) => b.n - a.n).slice(0, 15);
          return elegidos.map((x) => ({ etiqueta: recortar(x.c.nombre, 60), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), cultivo: x.c.id }) }));
        },
      }),
      combo({
        id: 'f-objetivo', titulo: 'Plaga, enfermedad o maleza', placeholder: 'Ej: avenilla, oídio, pulgón',
        elegido: textoObjetivo || null, quitar: quitarObjetivo,
        opciones: (t) => {
          const lista = objetivosDisponibles();
          const q = limpio(t);
          if (!q) return lista.sort((a, b) => b.n - a.n).slice(0, 15).map((x) => ({ etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), objetivo: x.o.id, oq: '' }) }));
          const calzan = filtrar(lista, q, (x) => x.o.palabras, (x) => x.n);
          const ops = [];
          // Los objetivos vienen con muchas variantes («Avenilla», «Avenilla (Avena fatua)»…): primero, todos juntos.
          if (calzan.length >= 2) ops.push({ etiqueta: `Todos los que dicen «${q}»`, detalle: plural(calzan.length, 'objetivo', 'objetivos'), clase: 'opcion-todos', accion: () => ir({ ...base(), objetivo: '', oq: q }) });
          for (const x of calzan.slice(0, 50)) ops.push({ etiqueta: nombreObjetivo(x.o), detalle: plural(x.n, 'producto', 'productos'), accion: () => ir({ ...base(), objetivo: x.o.id, oq: '' }) });
          return ops;
        },
      }),
      h('div', { class: 'filtro filtro-ancho' }, h('label', { class: 'filtro-titulo', for: 'f-cat' }, 'Tipo'), selCat),
      h('div', { class: 'filtro filtro-extra' }, h('label', { class: 'filtro-titulo', for: 'f-empresa' }, 'Empresa'), selEmpresa),
      h('div', { class: 'filtro filtro-extra' }, h('label', { class: 'filtro-titulo', for: 'f-moa' }, 'Modo de acción'), selMoa)),
    verExtra);

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
    .sort((a, b) => (b.id === estado.cultivo) - (a.id === estado.cultivo) || b.nProductos - a.nProductos || a.nombre.localeCompare(b.nombre, 'es'));
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

  const pintar = () => {
    ctx.cambiarParams(base());
    vaciar(zona);
    const busqueda = separarBusqueda(estado.q);
    const candidatos = lineas ? [...porProducto.keys()].map((id) => cat.productos.get(id)).filter(Boolean) : [...cat.productos.values()];
    const visibles = candidatos.filter((p) => {
      if (!enListas(p)) return false;
      if (estado.cat && !p.categorias.some((c) => String(c.id) === estado.cat)) return false;
      if (estado.empresa && p.marca !== estado.empresa) return false;
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
      h('div', { class: 'orden' }, h('label', null, 'Orden', orden),
        h('button', {
          type: 'button', class: 'boton-redondo', onclick: () => ordenar(estado.orden),
          title: 'Invertir el orden', 'aria-label': `Invertir el orden (ahora ${descendente ? 'de mayor a menor' : 'de menor a mayor'})`,
        }, icono(descendente ? 'abajo' : 'arriba')))));

    // Si lo escrito es un cultivo o una plaga, ofrecer ese filtro.
    if (estado.q.length >= 3) {
      const sug = [];
      if (!cultivo) {
        for (const c of filtrar([...cat.cultivos.values()].filter((x) => x.nLineas && !x.esFrase), estado.q, (x) => x.palabras, (x) => x.nProductos, 2)) {
          sug.push(h('a', { class: 'chip', href: ruta('buscar', { ...base(), q: '', cultivo: c.id }) }, `Cultivo: ${recortar(c.nombre, 30)}`));
        }
      }
      if (!objetivo && !estado.oq) {
        const n = filtrar([...cat.objetivos.values()].filter((o) => o.nLineas), estado.q, (o) => o.palabras, (o) => o.nLineas).length;
        if (n) sug.push(h('a', { class: 'chip', href: ruta('buscar', { ...base(), q: '', oq: estado.q }) }, `Plaga, enfermedad o maleza: «${estado.q}»`, h('small', null, plural(n, 'objetivo', 'objetivos'))));
      }
      if (sug.length) zona.append(h('div', { class: 'sugerencias' }, h('span', { class: 'chico tenue' }, '¿Buscabas esto?'), sug));
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
    const op = { cultivoId: estado.cultivo || null, agrupar: estado.orden === 'moa' };
    // Agrupados por modo de acción: un título antes del primer producto de cada grupo.
    const porGrupo = new Map();
    if (op.agrupar) {
      for (const p of visibles) {
        const k = claveGrupo(p);
        if (!porGrupo.has(k)) porGrupo.set(k, []);
        porGrupo.get(k).push(p);
      }
    }
    let grupoAnterior = null;
    const mostrarMas = () => {
      for (const p of visibles.slice(mostrados, mostrados + POR_PAGINA)) {
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

  selCat.addEventListener('change', () => { estado.cat = selCat.value; pintar(); });
  selEmpresa.addEventListener('change', () => { estado.empresa = selEmpresa.value; pintar(); });
  selMoa.addEventListener('change', () => { estado.moa = selMoa.value; pintar(); });
  texto.addEventListener('input', retrasar(() => { estado.q = limpio(texto.value); pintar(); }, 150));
  texto.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); texto.blur(); } });
  pintar();
}
