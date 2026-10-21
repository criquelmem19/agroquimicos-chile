// Acceso a datos: todo lo que se lee de Supabase pasa por aquí.
// Las listas chicas (productos, cultivos, objetivos, ingredientes, empresas) se cargan
// una vez al abrir el sitio. Las líneas de uso se piden cuando se necesitan.
import { SUPABASE_URL, SUPABASE_KEY, FILAS_POR_PAGINA } from './config.js';
import { palabras } from './buscador.js';

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
// `construir` recibe el cliente y devuelve una consulta con orden estable.
async function todas(construir) {
  const db = await cliente();
  const filas = [];
  for (let desde = 0; ; desde += FILAS_POR_PAGINA) {
    const { data, error } = await construir(db).range(desde, desde + FILAS_POR_PAGINA - 1);
    if (error) throw error;
    filas.push(...data);
    if (data.length < FILAS_POR_PAGINA) return filas;
  }
}

// ---------- Catálogo (listas chicas) ----------

const CLAVE_CACHE = 'catalogo-v1';

async function descargarCatalogo() {
  const db = await cliente();
  const [productos, categorias, ingredientes, empresas, cultivos, objetivos, perfiles, estado] = await Promise.all([
    todas((c) => c.from('v_sitio_productos').select('*').order('id')),
    todas((c) => c.from('categories').select('id,name').order('id')),
    todas((c) => c.from('active_ingredients').select('id,common_name,chemical_group,mechanism_group,mechanism_system').order('id')),
    todas((c) => c.from('companies').select('id,legal_name').order('id')),
    todas((c) => c.from('v_sitio_cultivos').select('id,nombre,aliases,n_lineas,n_productos').order('id')),
    todas((c) => c.from('v_sitio_objetivos').select('id,nombre,cientifico,n_lineas,n_productos').order('id')),
    todas((c) => c.from('product_safety_profiles').select('product_id,reentry_hours').order('product_id')),
    db.from('v_estado_datos').select('ultima_actualizacion').maybeSingle(),
  ]);
  if (estado.error) throw estado.error;
  return {
    productos, categorias, ingredientes, empresas, cultivos, objetivos, perfiles,
    actualizado: estado.data ? estado.data.ultima_actualizacion : null,
  };
}

function guardarCache(crudo) {
  try { localStorage.setItem(CLAVE_CACHE, JSON.stringify({ t: Date.now(), crudo })); } catch (e) { /* sin espacio o bloqueado */ }
}

function leerCache() {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE_CACHE) || 'null');
    return x && x.crudo ? x : null;
  } catch (e) { return null; }
}

// Clave del grupo de modo de acción, por ejemplo "FRAC 3" o "IRAC 4A".
export function claveMoa(sistema, grupo) {
  if (!grupo) return null;
  return sistema ? `${sistema} ${grupo}` : String(grupo);
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

function armarCatalogo(crudo, fechaCache) {
  const categorias = new Map(crudo.categorias.map((x) => [x.id, { id: x.id, nombre: x.name }]));
  const ingredientes = new Map(crudo.ingredientes.map((x) => [x.id, {
    id: x.id,
    nombre: x.common_name,
    grupoQuimico: x.chemical_group,
    sistema: x.mechanism_system,
    grupo: x.mechanism_group,
    moa: claveMoa(x.mechanism_system, x.mechanism_group),
    productos: [],
  }]));
  const empresas = new Map(crudo.empresas.map((x) => [x.id, { id: x.id, nombre: x.legal_name, productos: [] }]));
  const reingreso = new Map(crudo.perfiles.map((x) => [x.product_id, x.reentry_hours]));
  const documentos = new Map();
  const productos = new Map();
  const gruposMoa = new Map();

  for (const p of crudo.productos) {
    for (const d of p.documentos || []) documentos.set(d.id, d);
    const ings = (p.ingredientes || [])
      .map((x) => ({ conc: x.conc, ing: ingredientes.get(x.id) }))
      .filter((x) => x.ing);
    const moa = [...new Set(ings.map((x) => x.ing.moa).filter(Boolean))].sort(compararMoa);
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
      categorias: (p.categorias || []).map((id) => categorias.get(id)).filter(Boolean),
      ings,
      moa,
      empresas: [...roles].map(([id, rs]) => ({ empresa: empresas.get(id), roles: rs })),
      documentos: p.documentos || [],
      etiqueta: (p.documentos || []).find((d) => d.url) || null,
      nLineas: p.n_lineas,
      nCultivos: p.n_cultivos,
      reingreso: reingreso.has(p.id) ? reingreso.get(p.id) : null,
    };
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
  const objetivos = new Map(crudo.objetivos.map((x) => [x.id, {
    id: x.id, nombre: x.nombre, cientifico: x.cientifico, nLineas: x.n_lineas, nProductos: x.n_productos,
  }]));

  // Palabras normalizadas, para buscar sin tildes ni mayúsculas.
  for (const p of productos.values()) p.palabras = palabras(`${p.nombre} ${p.registro || ''}`);
  for (const c of cultivos.values()) c.palabras = palabras(`${c.nombre} ${c.alias.join(' ')}`);
  for (const o of objetivos.values()) o.palabras = palabras(`${o.nombre} ${o.cientifico || ''}`);

  return {
    productos, categorias, ingredientes, empresas, cultivos, objetivos, documentos, gruposMoa,
    actualizado: crudo.actualizado,
    fechaCache, // null si los datos vienen en vivo; fecha si vienen guardados (sin conexión)
  };
}

export async function cargarCatalogo() {
  try {
    const crudo = await descargarCatalogo();
    guardarCache(crudo);
    return armarCatalogo(crudo, null);
  } catch (err) {
    const cache = leerCache();
    if (cache) return armarCatalogo(cache.crudo, new Date(cache.t));
    throw err;
  }
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

// Las líneas 'rechazado' (marcadas como erróneas por una persona) no se muestran.
export function usosPorCultivo(cultivoId) {
  return recordar(`c:${cultivoId}`, async () => conObjetivos(await todas((c) =>
    c.from('product_uses').select(`${CAMPOS_USO},todos:use_targets(target_id)`)
      .eq('crop_id', cultivoId).neq('review_status', 'rechazado').order('id'))));
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
