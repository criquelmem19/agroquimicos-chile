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
