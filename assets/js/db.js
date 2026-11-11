// Acceso a datos: todo lo que se lee de Supabase pasa por aquí.
// Las listas chicas (productos, cultivos, objetivos, ingredientes, empresas) se cargan
// una vez al abrir el sitio. Las líneas de uso se piden cuando se necesitan.
import { SUPABASE_URL, SUPABASE_KEY, FILAS_POR_PAGINA } from './config.js';
import { palabras, normalizar } from './buscador.js';
import { ORDEN_TIPOS } from './moa.js';

let promesaCliente = null;

// supabase-js se carga desde un CDN (index.html). Esperamos a que esté disponible.
function esperarLibreria(msMax = 20000) {
  return new Promise((resolver, rechazar) => {
    const inicio = Date.now();
    (function revisar() {
      if (window.supabase && typeof window.supabase.createClient === 'function') return resolver(window.supabase);
      if (Date.now() - inicio > msMax) return rechazar(new Error('No se pudo cargar la librería de datos. Revisa tu conexión.'));
      setTimeout(revisar, 40);
    })();
  });
}

export function cliente() {
  if (!promesaCliente) {
    promesaCliente = esperarLibreria().then((lib) =>
      lib.createClient(SUPABASE_URL, SUPABASE_KEY, {
        // Fase 1: sin cuentas de usuario. En la Fase 3 (Supabase Auth) se activa la sesión.
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      })
    );
  }
  return promesaCliente;
}

// Trae todas las filas de una consulta, de a 1.000 (máximo de la API).
// `construir` recibe el cliente y devuelve una consulta con orden estable. Las páginas se piden varias a la vez:
// `primeras` al comienzo (las que se esperan) y después de a `despues` hasta que una venga incompleta.
// La base corta las consultas de más de 3 s (código 57014): con el servidor ocupado, otro intento suele pasar.
async function todas(construir, primeras = 1, despues = 3) {
  const db = await cliente();
  const pagina = async (n) => {
    for (let intento = 1; ; intento += 1) {
      const { data, error } = await construir(db).range(n * FILAS_POR_PAGINA, (n + 1) * FILAS_POR_PAGINA - 1);
      if (!error) return data;
      if (error.code !== '57014' || intento === 3) throw error;
    }
  };
  const filas = [];
  for (let n = 0, tanda = primeras; ; n += tanda, tanda = despues) {
    const paginas = await Promise.all(Array.from({ length: tanda }, (_, i) => pagina(n + i)));
    for (const data of paginas) {
      filas.push(...data);
      if (data.length < FILAS_POR_PAGINA) return filas;
    }
  }
}

// ---------- Catálogo (listas chicas) ----------

// Clave de la copia guardada en el equipo. Cambiarla (v4…) si cambia la forma de lo que devuelve descargarCatalogo:
// la copia se muestra antes de que llegue la descarga.
const CLAVE_CACHE = 'catalogo-v5';

async function descargarCatalogo() {
  const db = await cliente();
  // Desde el 11-11-2026 las cuatro listas pesadas se leen de copias ya calculadas (mv_sitio_*, renovadas cada 15 minutos
  // por pg_cron): con las vistas, v_sitio_productos sola ya tardaba más de los 3 s que da la base a la llave pública, y
  // había que pedir por etapas. Con las copias cada consulta tarda milisegundos: todo va a la vez (las páginas también).
  const [productos, categorias, ingredientes, equivalencias, clasificacion, empresas, perfiles, estado, resumen, cultivos,
    dosisTexto, objetivos] = await Promise.all([
    todas((c) => c.from('mv_sitio_productos').select('*').order('id'), 2),
    todas((c) => c.from('categories').select('id,name').order('id')),
    todas((c) => c.from('active_ingredients').select('id,common_name,chemical_group,mechanism_group,mechanism_system').order('id')),
    todas((c) => c.from('moa_equivalencias').select('id,sistema,codigo,codigo_actual,ingrediente_id,nota').order('id')),
    todas((c) => c.from('moa_clasificacion').select('ingrediente_id,sistema,codigo,tipo,grupo_quimico,fuente,nota').order('id')),
    todas((c) => c.from('companies').select('id,legal_name').order('id')),
    todas((c) => c.from('product_safety_profiles').select('product_id,reentry_hours').order('product_id')),
    // Fecha del pie: una consulta barata y que no es indispensable. Hasta el 06-11-2026 salía de v_estado_datos, que
    // recorre toda la base: con 40 mil líneas pasó los 3 s que tiene la llave pública y botaba el sitio entero.
    db.from('products').select('updated_at').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
    todas((c) => c.from('mv_sitio_resumen_productos').select('id,cultivos,n_lineas,n_aprobadas,n_baja_confianza,dosis').order('id'), 2),
    todas((c) => c.from('mv_sitio_cultivos').select('id,nombre,aliases,n_lineas,n_productos').order('id'), 2),
    // Texto de la dosis cuando no hay rango (11-11-2026): no es indispensable, si falla la tabla muestra el resto.
    todas((c) => c.from('v_sitio_dosis_texto').select('id,dosis_texto').order('id'))
      .catch((e) => { console.warn('Sin texto de dosis:', e); return []; }),
    todas((c) => c.from('mv_sitio_objetivos').select('id,nombre,cientifico,n_lineas,n_productos').order('id'), 6, 2),
  ]);
  if (estado.error) console.warn('Sin fecha de actualización:', estado.error);
  return {
    productos, resumen, dosisTexto, categorias, ingredientes, equivalencias, clasificacion, empresas, cultivos, objetivos, perfiles,
    actualizado: estado.data ? estado.data.updated_at : null,
  };
}

// La copia va en IndexedDB: pesa ~2 MB y crece, y localStorage tiene ~5 MB para todo criquelmem19.github.io
// (ahí van también los planes de aplicación). Hasta el 30-10-2026 iba en localStorage: se lee una vez y se borra.
function abrirCache() {
  return new Promise((resolver, rechazar) => {
    const pedido = indexedDB.open('agroquimicos-cache', 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('copias');
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rechazar(pedido.error);
  });
}

async function guardarCache(crudo) {
  try {
    for (const k of ['catalogo-v1', 'catalogo-v2', 'catalogo-v3', 'catalogo-v4', 'catalogo-v5']) localStorage.removeItem(k);
  } catch (e) { /* bloqueado */ }
  try {
    const bd = await abrirCache();
    await new Promise((resolver, rechazar) => {
      const tx = bd.transaction('copias', 'readwrite');
      tx.objectStore('copias').put({ t: Date.now(), crudo }, CLAVE_CACHE);
      for (const k of ['catalogo-v3', 'catalogo-v4']) tx.objectStore('copias').delete(k);
      tx.oncomplete = resolver;
      tx.onerror = tx.onabort = () => rechazar(tx.error);
    });
    bd.close();
  } catch (e) { /* sin espacio o bloqueado */ }
}

async function leerCache() {
  try {
    const bd = await abrirCache();
    const x = await new Promise((resolver, rechazar) => {
      const pedido = bd.transaction('copias').objectStore('copias').get(CLAVE_CACHE);
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rechazar(pedido.error);
    });
    bd.close();
    if (x && x.crudo) return x;
  } catch (e) { /* bloqueado */ }
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    return x && x.crudo ? x : null;
  } catch (e) { return null; }
}

// Clave del grupo de modo de acción, por ejemplo "FRAC 3" o "IRAC 4A".
// Solo se unifica cómo está escrito el código («M3» = «M03», mayúsculas), no grupos distintos.
export function claveMoa(sistema, grupo) {
  if (!grupo) return null;
  const g = String(grupo).trim().toUpperCase().replace(/^M(\d)$/, 'M0$1');
  return sistema ? `${sistema} ${g}` : g;
}

// Familia del grupo, para agrupar y para las alertas de rotación: en IRAC el modo de acción es el número y la
// letra es el subgrupo químico («IRAC 4A» e «IRAC 4D» son el grupo 4; «IRAC 3» = «IRAC 3A»).
export function familiaMoa(clave) {
  return String(clave).replace(/^(IRAC \d+)[A-Z]$/, '$1');
}

export function familias(claves) {
  return [...new Set(claves.map(familiaMoa))];
}

// Orden natural: FRAC, IRAC, HRAC y luego por número de grupo.
const ORDEN_SISTEMA = { FRAC: 1, IRAC: 2, HRAC: 3 };
export function compararMoa(a, b) {
  const [sa, ga = ''] = a.split(' ');
  const [sb, gb = ''] = b.split(' ');
  const d = (ORDEN_SISTEMA[sa] || 9) - (ORDEN_SISTEMA[sb] || 9);
  if (d) return d;
  return ga.localeCompare(gb, 'es', { numeric: true });
}

// Códigos de la lista oficial asignados a un ingrediente (cuando la etiqueta no lo trae): el producto usa los del
// sistema que calza con su tipo (un fungicida, FRAC; un acaricida, IRAC); si ninguno calza, todos.
const ORDEN_ASIGNADO = ['IRAC', 'FRAC', 'HRAC'];
const ACOMPANANTES = new Set(['aditivo', 'coadyuvante']);
const SISTEMA_DE_CATEGORIA = {
  fungicida: 'FRAC', bactericida: 'FRAC', 'inductor de resistencia': 'FRAC',
  insecticida: 'IRAC', acaricida: 'IRAC', nematicida: 'IRAC', 'insecticida sanitario': 'IRAC',
  herbicida: 'HRAC', alguicida: 'HRAC',
};
function codigosDelProducto(ing, categorias) {
  if (!ing.moaOpciones || ing.moaOpciones.length < 2) return ing.moa ? [ing.moa] : [];
  const sistemas = new Set(categorias.map((c) => SISTEMA_DE_CATEGORIA[String(c.nombre).toLowerCase()]).filter(Boolean));
  const calzan = ing.moaOpciones.filter((o) => sistemas.has(o.sistema));
  return (calzan.length ? calzan : ing.moaOpciones).map((o) => o.clave);
}

// Productos que se ofrecen en las listas del sitio: no ocultos (carga original sin datos) ni sin uso en Chile.
export const enListas = (p) => !p.oculto && !p.noDisponible;

// Código de formulación (WP, SC, EC…). Si falta en los datos, el que trae el nombre comercial («PUNTO 70 WP»).
export function tipoFormulacion(p) {
  if (p.formulacionCodigo) return p.formulacionCodigo;
  const m = String(p.nombre).match(/\b(SC|EC|WP|SL|WG|WDG|DP|FS|EW|CS|OD|SG|SE|SP|GR|ZC|ME|DC|TB|RB|GB|UL|WS|DS)\b/);
  return m ? m[1] : null;
}

// Nombre corto de la empresa para las tablas: «UPL Chile S.A.» → «UPL», «QUIMETAL INDUSTRIAL S.A.» → «Quimetal».
const MARCAS = [
  ['syngenta', 'Syngenta'], ['sygenta', 'Syngenta'], ['bayer', 'Bayer'], ['basf', 'BASF'], ['anasac', 'Anasac'],
  ['agricola nacional', 'Anasac'], ['corteva', 'Corteva'], ['du pont', 'DuPont'], ['dupont', 'DuPont'], ['upl', 'UPL'],
  ['adama', 'Adama'], ['quimetal', 'Quimetal'], ['agrospec', 'Agrospec'], ['sumitomo', 'Sumitomo'], ['nufarm', 'Nufarm'],
  ['gowan', 'Gowan'], ['fmc', 'FMC'], ['arysta', 'Arysta'], ['sipcam', 'Sipcam'], ['albaugh', 'Albaugh'],
  ['agrofresh', 'AgroFresh'], ['nichino', 'Nichino'], ['rizobacter', 'Rizobacter'], ['point', 'Point'], ['certis', 'Certis'],
  ['nutrien', 'Nutrien'], ['kwizda', 'Kwizda'], ['exwold', 'Exwold'], ['solfotecnica', 'Solfotecnica'], ['iqv', 'IQV'],
  ['industrias quimicas del valles', 'IQV'], ['monsanto', 'Monsanto'], ['ipanema', 'Ipanema'], ['binab', 'Binab'],
  ['ypf', 'YPF'], ['schirm', 'Schirm'], ['schrim', 'Schirm'], ['sintesis quimica', 'Síntesis Química'], ['h marks', 'A.H. Marks'],
];
// Palabras que no ayudan a reconocer la empresa: tipo de sociedad, país y rubro.
const PALABRAS_SOBRAN = new Set(('sa sac saic sas spa ltda ltd lmtd limitada limited llc lp inc gmbh ag srl slu sl bv nv scl '
  + 'co cia company corporation corp plc pty pvt cv rl sociedad anonima comercial industrial industria industries industry '
  + 'chemical chemicals international internacional chile agrochemical agrochemicals biochemical biotechnology technology '
  + 'pesticide factory protection trading crop science sciences sciencies compounds group modern agriculture exports logistics').split(' '));
const CONECTORES = new Set(['de', 'del', 'y', '&']);

export function nombreCorto(nombre) {
  const n = ` ${normalizar(nombre)} `;
  for (const [clave, marca] of MARCAS) if (n.includes(` ${clave} `)) return marca;
  const base = String(nombre || '').split(/[,(]/)[0].replace(/[®™]/g, ' ');
  const quedan = base.split(/\s+/).filter((w) => {
    const k = normalizar(w).replace(/ /g, '');
    if (w === '&' || k === 'y' || k === 'de' || k === 'del') return true;
    return k.length > 1 && !PALABRAS_SOBRAN.has(k);
  });
  // Una o dos palabras; tres si la segunda es «de», «y» o «&» («Martínez & Valdivieso»).
  let corto = quedan.slice(0, CONECTORES.has(normalizar(quedan[1] || '') || quedan[1]) && quedan[2] ? 3 : 2);
  while (corto.length && CONECTORES.has(normalizar(corto[corto.length - 1]) || corto[corto.length - 1])) corto = corto.slice(0, -1);
  // Las siglas cortas se mantienen (IQV); lo que viene en MAYÚSCULAS pasa a «Nombre».
  const texto = corto.map((w, i) => (i && CONECTORES.has(normalizar(w)) ? w.toLowerCase()
    : w === w.toUpperCase() && w.length > 3 ? w.charAt(0) + w.slice(1).toLowerCase() : w)).join(' ');
  return texto || String(nombre || '').trim();
}

// Muchos cultivos «frase» son cultivos reales con nombre largo: «Vides (de mesa, para vino y para pisco)», «Manzanos,
// perales y nogales», «Plantaciones forestales (Pino insigne, Eucaliptos)». Se unen a los cultivos del catálogo que
// nombran (las primeras 1 a 3 palabras de cada trozo, en singular simple): `bases` son esos cultivos y cada uno guarda
// en `variantes` los nombres largos que lo incluyen. Así sus líneas salen al filtrar por Vid, Manzano o Pino. Las frases
// de instrucciones («Aplicar en otoño…») no parten con un cultivo y quedan fuera. Solo sirven de base los cultivos con
// nombre limpio (no «pisquera)» ni «Cerezo”», restos de lecturas cortadas) y que no estén en NO_CULTIVOS (palabras
// leídas como cultivo). No cambia ningún dato.
const NOMBRE_LIMPIO = /^[A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÑáéíóúñü .'-]*$/;
const NO_CULTIVOS = new Set(['aplicar', 'notas', 'se recomienda', 'syngenta', 'cultivos', 'planta']);
function unirVariantes(cultivos, productos) {
  const porClave = new Map();
  for (const c of cultivos.values()) {
    c.bases = [];
    c.variantes = [];
    if (c.esFrase || !NOMBRE_LIMPIO.test(c.nombre.trim()) || NO_CULTIVOS.has(normalizar(c.nombre))) continue;
    for (const n of [c.nombre, ...c.alias]) {
      const k = normalizar(n);
      const otro = k && cultivos.get(porClave.get(k));
      if (k && (!otro || (c.nLineas || 0) > (otro.nLineas || 0))) porClave.set(k, c.id);
    }
  }
  const formas = (ws) => [ws, ws.map((w) => (w.length > 4 && w.endsWith('es') ? w.slice(0, -2) : w)),
    ws.map((w) => (w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w))];
  for (const c of cultivos.values()) {
    if (!c.esFrase) continue;
    const bases = new Set();
    for (const trozo of c.nombre.split(/[(,;:/]|\s+(?:y|e|o|u)\s+/i)) {
      const ws = palabras(trozo);
      for (let n = Math.min(3, ws.length); n >= 1; n--) {
        const id = formas(ws.slice(0, n)).map((f) => porClave.get(f.join(' '))).find(Boolean);
        if (id) { bases.add(id); break; }
      }
    }
    c.bases = [...bases];
    for (const id of c.bases) {
      const b = cultivos.get(id);
      b.variantes.push(c.id);
      b.nLineas += c.nLineas || 0;
    }
  }
  // Productos por cultivo, contando también los que solo lo tienen con el nombre largo.
  for (const b of cultivos.values()) {
    if (!b.variantes.length) continue;
    const ids = new Set([b.id, ...b.variantes]);
    b.nProductos = [...productos.values()].filter((p) => p.cultivoIds.some((id) => ids.has(id))).length;
  }
}

// Cultivos que se muestran para unas líneas: los nombres largos se cambian por los cultivos que nombran.
export function cultivosVisibles(cat, ids) {
  const vistos = new Set();
  for (const id of ids) {
    const c = cat.cultivos.get(id);
    if (!c) continue;
    for (const x of c.esFrase ? c.bases : [id]) vistos.add(x);
  }
  return [...vistos].map((id) => cat.cultivos.get(id));
}

function armarCatalogo(crudo, fechaCache) {
  const categorias = new Map(crudo.categorias.map((x) => [x.id, { id: x.id, nombre: x.name }]));
  // Equivalencias código antiguo → actual (tabla moa_equivalencias, de las tablas oficiales FRAC y HRAC). Las que
  // traen ingrediente valen solo para él. El código de la etiqueta se guarda aparte para mostrarlo.
  const equivalencias = new Map();
  for (const e of crudo.equivalencias || []) {
    const k = claveMoa(e.sistema, e.codigo);
    equivalencias.set(e.ingrediente_id ? `${e.ingrediente_id}|${k}` : k, e);
  }
  // Clasificación de los ingredientes cuya etiqueta no trae el código (moa_clasificacion, 11-11-2026): el grupo de la
  // lista oficial o, si ningún comité lo clasifica, qué es (regulador, feromona…); y el grupo químico de todos.
  const clasificacion = new Map();
  for (const c of crudo.clasificacion || []) {
    if (!clasificacion.has(c.ingrediente_id)) clasificacion.set(c.ingrediente_id, []);
    clasificacion.get(c.ingrediente_id).push(c);
  }
  const ingredientes = new Map(crudo.ingredientes.map((x) => {
    const enEtiqueta = claveMoa(x.mechanism_system, x.mechanism_group);
    const eq = enEtiqueta && (equivalencias.get(`${x.id}|${enEtiqueta}`) || equivalencias.get(enEtiqueta));
    const filas = clasificacion.get(x.id) || [];
    const deEtiqueta = eq ? claveMoa(eq.sistema, eq.codigo_actual) : enEtiqueta;
    // Opciones de la lista oficial (puede haber una por sistema: la fenazaquina es IRAC 21A y FRAC 39). El producto
    // elige la que calza con su tipo (opcionesMoa); el ingrediente solo, la primera (IRAC, FRAC, HRAC).
    const opciones = deEtiqueta ? [] : filas.filter((c) => c.codigo)
      .map((c) => ({ clave: claveMoa(c.sistema, c.codigo), sistema: c.sistema, fuente: c.fuente, nota: c.nota }))
      .sort((a, b) => ORDEN_ASIGNADO.indexOf(a.sistema) - ORDEN_ASIGNADO.indexOf(b.sistema));
    const tipo = deEtiqueta || opciones.length ? null : (filas.find((c) => c.tipo) || {}).tipo || null;
    const grupoQuimico = (filas.find((c) => c.grupo_quimico) || {}).grupo_quimico || x.chemical_group;
    return [x.id, {
      id: x.id,
      nombre: x.common_name,
      grupoQuimico,
      sistema: x.mechanism_system,
      grupo: x.mechanism_group,
      moa: deEtiqueta || (opciones.length ? opciones[0].clave : null),
      // Solo si la etiqueta lo escribe con el código antiguo: cómo viene en la etiqueta y de dónde sale el actual.
      // Sin codigo_actual el ingrediente no tiene grupo (la etiqueta se lo pone por error, como al cloquintocet).
      moaEtiqueta: eq ? enEtiqueta : null,
      moaNota: eq ? eq.nota : null,
      // El código no viene en la etiqueta: sale de la lista oficial (fuente y nota de moa_clasificacion).
      moaOpciones: opciones,
      // Sin código: qué es (moa.js → TIPOS) y por qué.
      tipo,
      tipoNota: tipo ? (filas.find((c) => c.tipo) || {}).nota || null : null,
      productos: [],
    }];
  }));
  const empresas = new Map(crudo.empresas.map((x) => [x.id, { id: x.id, nombre: x.legal_name, productos: [] }]));
  const reingreso = new Map(crudo.perfiles.map((x) => [x.product_id, x.reentry_hours]));
  const resumen = new Map((crudo.resumen || []).map((x) => [x.id, x]));
  const dosisTexto = new Map((crudo.dosisTexto || []).map((x) => [x.id, x.dosis_texto]));
  const marcas = new Map();
  const documentos = new Map();
  const productos = new Map();
  const gruposMoa = new Map();

  for (const p of crudo.productos) {
    for (const d of p.documentos || []) documentos.set(d.id, d);
    const ings = (p.ingredientes || [])
      .map((x) => ({ conc: x.conc, ing: ingredientes.get(x.id) }))
      .filter((x) => x.ing);
    const categoriasP = (p.categorias || []).map((id) => categorias.get(id)).filter(Boolean);
    const moa = [...new Set(ings.flatMap((x) => codigosDelProducto(x.ing, categoriasP)))].sort(compararMoa);
    // Sin ningún código: qué son sus ingredientes (regulador, feromona…), para agruparlo y mostrarlo igual.
    // Aditivos (amargante, sinergista) y coadyuvantes que acompañan a otra cosa no cuentan.
    let tipos = moa.length ? [] : [...new Set(ings.map((x) => x.ing.tipo).filter(Boolean))]
      .sort((a, b) => ORDEN_TIPOS.indexOf(a) - ORDEN_TIPOS.indexOf(b));
    if (tipos.some((t) => !ACOMPANANTES.has(t))) tipos = tipos.filter((t) => !ACOMPANANTES.has(t));
    // Código actual → cómo viene escrito en la etiqueta (solo los que cambian).
    const moaEtiqueta = new Map();
    for (const x of ings) {
      if (x.ing.moa && x.ing.moaEtiqueta) moaEtiqueta.set(x.ing.moa, [...new Set([...(moaEtiqueta.get(x.ing.moa) || []), x.ing.moaEtiqueta])]);
    }
    const roles = new Map();
    for (const e of p.empresas || []) {
      if (!empresas.has(e.id)) continue;
      if (!roles.has(e.id)) roles.set(e.id, []);
      roles.get(e.id).push(e.rol);
    }
    const prod = {
      id: p.id,
      nombre: p.nombre,
      registro: p.registro,
      formulacionCodigo: p.formulacion_codigo,
      formulacion: p.formulacion,
      clasificacion: p.clasificacion,
      categorias: categoriasP,
      ings,
      moa,
      tipos,
      moaEtiqueta,
      familias: familias(moa),
      empresas: [...roles].map(([id, rs]) => ({ empresa: empresas.get(id), roles: rs })),
      documentos: p.documentos || [],
      etiqueta: (p.documentos || []).find((d) => d.url) || null,
      nLineas: p.n_lineas,
      nCultivos: p.n_cultivos,
      reingreso: reingreso.has(p.id) ? reingreso.get(p.id) : null,
      // Motivo por el que no se puede usar en Chile (solo exportación, cancelado, sustancia prohibida) o null.
      noDisponible: p.no_disponible || null,
      // Registro de la carga original sin datos útiles (products.oculto_motivo, 11-11-2026): no va en ninguna lista del
      // sitio (tabla, filtros, buscadores); su ficha sigue abriendo por link. Usar enListas(p).
      oculto: p.oculto_motivo || null,
      toxicidadAbejas: p.toxicidad_abejas || null,
    };
    // Resumen de sus líneas de uso (para la tabla del inicio): cultivos y dosis desde-hasta por unidad.
    const r = resumen.get(p.id);
    prod.cultivoIds = (r && r.cultivos) || [];
    prod.resumenDosis = {
      grupos: (r && r.dosis) || [], n: r ? r.n_lineas : 0, aprobadas: r ? r.n_aprobadas : 0, baja: r ? r.n_baja_confianza : 0,
      texto: dosisTexto.get(p.id) || null,
    };
    prod.marca = prod.empresas.length ? nombreCorto(prod.empresas[0].empresa.nombre) : null;
    if (prod.marca && !prod.oculto) {
      if (!marcas.has(prod.marca)) marcas.set(prod.marca, { nombre: prod.marca, productos: [] });
      marcas.get(prod.marca).productos.push(prod);
    }
    productos.set(p.id, prod);
    for (const x of ings) if (!x.ing.productos.includes(prod)) x.ing.productos.push(prod);
    for (const e of prod.empresas) e.empresa.productos.push(prod);
    for (const k of moa) {
      if (!gruposMoa.has(k)) gruposMoa.set(k, { clave: k, productos: [] });
      gruposMoa.get(k).productos.push(prod);
    }
  }

  const cultivos = new Map(crudo.cultivos.map((x) => [x.id, {
    id: x.id, nombre: x.nombre, alias: x.aliases || [], nLineas: x.n_lineas, nProductos: x.n_productos,
    // Algunos "cultivos" son frases mal leídas del PDF (instrucciones). No van al buscador ni a los
    // selectores, pero sus líneas se siguen mostrando en la ficha de cada producto.
    esFrase: x.nombre.length > 40 || x.nombre.trim().split(/\s+/).length > 6,
  }]));
  unirVariantes(cultivos, productos);
  const objetivos = new Map(crudo.objetivos.map((x) => [x.id, {
    id: x.id, nombre: x.nombre, cientifico: x.cientifico, nLineas: x.n_lineas, nProductos: x.n_productos,
  }]));

  // Palabras normalizadas, para buscar sin tildes ni mayúsculas.
  // (El buscador de la tabla del inicio arma las suyas con todas las columnas: vistas/inicio.js.)
  for (const p of productos.values()) p.palabras = palabras(`${p.nombre} ${p.registro || ''}`);
  for (const c of cultivos.values()) c.palabras = palabras(`${c.nombre} ${c.alias.join(' ')}`);
  for (const o of objetivos.values()) o.palabras = palabras(`${o.nombre} ${o.cientifico || ''}`);

  return {
    productos, categorias, ingredientes, empresas, marcas, cultivos, objetivos, documentos, gruposMoa,
    actualizado: crudo.actualizado,
    fechaCache, // null si los datos vienen en vivo; fecha si vienen guardados (sin conexión)
  };
}

// Devuelve { catalogo, nuevo }. Si el equipo tiene una copia guardada, `catalogo` sale de ella (el sitio se ve
// al tiro, también en el campo con mala señal) y `nuevo` es la descarga: entrega el catálogo al día si cambió,
// null si es igual, o falla sin conexión (`fechaCopia` dice de cuándo es la copia). Sin copia, se espera la descarga.
export async function cargarCatalogo() {
  const descarga = descargarCatalogo();
  descarga.catch(() => {}); // el error se atiende más abajo
  const cache = await leerCache();
  let guardado = null;
  if (cache) {
    try { guardado = armarCatalogo(cache.crudo, null); } catch (e) { console.error(e); }
  }
  if (!guardado) {
    const crudo = await descarga;
    guardarCache(crudo);
    return { catalogo: armarCatalogo(crudo, null), nuevo: null };
  }
  const nuevo = descarga.then((crudo) => {
    guardarCache(crudo);
    return JSON.stringify(crudo) === JSON.stringify(cache.crudo) ? null : armarCatalogo(crudo, null);
  });
  return { catalogo: guardado, nuevo, fechaCopia: new Date(cache.t) };
}

// ---------- Líneas de uso (se piden cuando se necesitan) ----------

const CAMPOS_USO = [
  'id', 'product_id', 'crop_id', 'dose_raw', 'dose_min', 'dose_max', 'dose_unit', 'dose_basis',
  'water_volume_min_l_ha', 'water_volume_max_l_ha', 'application_method', 'application_timing', 'observations',
  'withholding_period_days', 'withholding_not_applicable', 'withholding_period_raw',
  'maximum_applications_per_season', 'interval_min_days', 'interval_max_days', 'season_restriction',
  'source_document_id', 'source_page', 'source_text', 'confidence_score', 'review_status', 'field_citations',
].join(',');

const memoria = new Map();
function recordar(clave, fn) {
  if (!memoria.has(clave)) memoria.set(clave, fn().catch((e) => { memoria.delete(clave); throw e; }));
  return memoria.get(clave);
}

function conObjetivos(filas) {
  for (const f of filas) {
    f.objetivos = (f.todos || []).map((x) => x.target_id);
    delete f.todos;
    delete f.filtro;
  }
  return filas;
}

// Las líneas 'rechazado' (marcadas como erróneas, o reemplazadas por una lectura nueva de la etiqueta) no se muestran.
// `variantes`: cultivos con nombre largo que incluyen a este («Vides (…)» para Vid), ver unirVariantes.
export function usosPorCultivo(cultivoId, variantes = []) {
  const ids = [cultivoId, ...variantes];
  return recordar(`c:${ids.join(',')}`, async () => conObjetivos(await todas((c) =>
    c.from('product_uses').select(`${CAMPOS_USO},todos:use_targets(target_id)`)
      .in('crop_id', ids).neq('review_status', 'rechazado').order('id'))));
}

export function usosPorProducto(productoId) {
  return recordar(`p:${productoId}`, async () => conObjetivos(await todas((c) =>
    c.from('product_uses').select(`${CAMPOS_USO},todos:use_targets(target_id)`)
      .eq('product_id', productoId).neq('review_status', 'rechazado').order('id'))));
}

export function usosPorObjetivos(objetivoIds) {
  const ids = [...objetivoIds].sort();
  return recordar(`o:${ids.join(',')}`, async () => {
    const filas = [];
    // De a 40 objetivos por consulta, para no alargar demasiado la dirección web.
    for (let i = 0; i < ids.length; i += 40) {
      const parte = ids.slice(i, i + 40);
      filas.push(...await todas((c) =>
        c.from('product_uses').select(`${CAMPOS_USO},todos:use_targets(target_id),filtro:use_targets!inner(target_id)`)
          .in('filtro.target_id', parte).neq('review_status', 'rechazado').order('id')));
    }
    const unicas = new Map(filas.map((f) => [f.id, f]));
    return conObjetivos([...unicas.values()]);
  });
}

export function cultivosDeProducto(productoId) {
  return usosPorProducto(productoId).then((us) => [...new Set(us.map((u) => u.crop_id))]);
}

export function productosDeCultivo(cultivoId) {
  return usosPorCultivo(cultivoId).then((us) => [...new Set(us.map((u) => u.product_id))]);
}

export function detalleProducto(productoId) {
  return recordar(`d:${productoId}`, async () => {
    const db = await cliente();
    const [prod, perfil] = await Promise.all([
      db.from('products').select('description,label_version_date,net_content_raw,is_flammable,is_corrosive,is_explosive')
        .eq('id', productoId).maybeSingle(),
      db.from('product_safety_profiles').select('*').eq('product_id', productoId).maybeSingle(),
    ]);
    if (prod.error) throw prod.error;
    if (perfil.error) throw perfil.error;
    return { producto: prod.data, perfil: perfil.data };
  });
}

// Planes guardados en la base para una persona: se leen solo con su clave (link personal), por una
// función de la base; la tabla no se puede leer con la llave pública.
export async function planGuardado(clave) {
  const db = await cliente();
  const { data, error } = await db.rpc('plan_guardado', { p_clave: clave });
  if (error) throw error;
  return data;
}

// Productos con alguna plaga, enfermedad o maleza (de sus líneas de uso) cuyo nombre común o científico contiene el texto
// (ya normalizado, 3 letras o más). Para el buscador principal de la tabla (Cristóbal, 11-11-2026: «que filtre
// absolutamente todo»; «avenilla» daba 0). Función productos_por_objetivo sobre la copia mv_sitio_objetivo_producto.
// Una consulta por texto: se guarda la promesa. Si falla, vacío (y se reintenta la próxima vez).
const porObjetivo = new Map();
export function productosPorObjetivo(texto) {
  if (!porObjetivo.has(texto)) {
    porObjetivo.set(texto, cliente()
      .then((db) => db.rpc('productos_por_objetivo', { p_texto: texto }))
      .then(({ data, error }) => {
        if (error) throw error;
        return new Set((data || []).map((x) => (typeof x === 'string' ? x : Object.values(x)[0])));
      })
      .catch((e) => { porObjetivo.delete(texto); console.warn('Sin búsqueda por objetivo:', e); return new Set(); }));
  }
  return porObjetivo.get(texto);
}
