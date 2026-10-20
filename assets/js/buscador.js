// Búsqueda sin importar tildes ni mayúsculas, por inicio de palabra.
// "oidio" encuentra "Oídio"; "cerezas" encuentra "Cerezo" (alias y singular simple).

export function normalizar(s) {
  return String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function palabras(s) {
  const n = normalizar(s);
  return n ? n.split(' ') : [];
}

// Variantes de una palabra escrita por la persona: quita plurales simples.
function variantes(p) {
  const v = [p];
  if (p.length > 4 && p.endsWith('es')) v.push(p.slice(0, -2));
  if (p.length > 3 && p.endsWith('s')) v.push(p.slice(0, -1));
  return v;
}

// 0 = no coincide. Cada palabra de la consulta debe ser el inicio de alguna palabra
// del texto. Una palabra completa vale más que un inicio de palabra, y suma si el
// nombre parte con lo buscado ("oidio" → "Oídio de la vid" antes que "Control de oídio").
export function puntaje(consulta, textoPalabras) {
  if (!consulta.length || !textoPalabras || !textoPalabras.length) return 0;
  let total = 0;
  for (const q of consulta) {
    let mejor = 0;
    for (const v of variantes(q)) {
      for (const w of textoPalabras) {
        if (w === v) { mejor = 3; break; }
        if (mejor < 2 && w.startsWith(v)) mejor = 2;
      }
      if (mejor === 3) break;
    }
    if (!mejor) return 0;
    total += mejor;
  }
  if (variantes(consulta[0]).some((v) => textoPalabras[0].startsWith(v))) total += 1;
  return total;
}

// Ordena por puntaje y luego por "peso" (cantidad de líneas de uso), y corta en `max`.
export function filtrar(lista, consulta, obtenerPalabras, obtenerPeso, max = Infinity) {
  const q = palabras(consulta);
  if (!q.length) return [];
  const res = [];
  for (const x of lista) {
    const p = puntaje(q, obtenerPalabras(x));
    if (p) res.push([p, obtenerPeso(x), x]);
  }
  res.sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  return res.slice(0, max).map((r) => r[2]);
}

// Índice único para el buscador de la portada.
export function construirIndice(cat) {
  const items = [];
  for (const p of cat.productos.values()) {
    items.push({ tipo: 'producto', ref: p, palabras: p.palabras, peso: p.nLineas });
  }
  for (const i of cat.ingredientes.values()) {
    if (!i.productos.length) continue;
    items.push({ tipo: 'ingrediente', ref: i, palabras: palabras(`${i.nombre} ${i.grupoQuimico || ''}`), peso: i.productos.length });
  }
  for (const c of cat.cultivos.values()) {
    if (!c.nLineas || c.esFrase) continue;
    items.push({ tipo: 'cultivo', ref: c, palabras: c.palabras, peso: c.nProductos * 1000 + c.nLineas });
  }
  for (const o of cat.objetivos.values()) {
    if (!o.nLineas) continue;
    items.push({ tipo: 'objetivo', ref: o, palabras: o.palabras, peso: o.nProductos * 1000 + o.nLineas });
  }
  for (const e of cat.empresas.values()) {
    if (!e.productos.length) continue;
    items.push({ tipo: 'empresa', ref: e, palabras: palabras(e.nombre), peso: e.productos.length });
  }
  return items;
}

// Devuelve { grupos: {tipo: [refs]}, orden: [tipos] }: los grupos con la mejor coincidencia van primero.
export function buscar(indice, consulta) {
  const q = palabras(consulta);
  const crudo = { producto: [], ingrediente: [], cultivo: [], objetivo: [], empresa: [] };
  const fijo = Object.keys(crudo);
  if (!q.length || normalizar(consulta).length < 2) return { grupos: crudo, orden: fijo };
  for (const it of indice) {
    const p = puntaje(q, it.palabras);
    if (p) crudo[it.tipo].push([p, it.peso, it.ref]);
  }
  const mejor = {};
  const grupos = {};
  for (const k of fijo) {
    const lista = crudo[k].sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    mejor[k] = lista.length ? lista[0][0] : 0;
    grupos[k] = lista.map((r) => r[2]);
  }
  const orden = [...fijo].sort((a, b) => mejor[b] - mejor[a] || fijo.indexOf(a) - fijo.indexOf(b));
  return { grupos, orden };
}
