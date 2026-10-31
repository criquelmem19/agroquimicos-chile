// Trivia (tipo JetPunk): 10 preguntas de alternativas sobre los productos del catálogo: tipo de producto,
// grupo de modo de acción e ingrediente activo. Todo sale de los datos de las etiquetas.
// Parámetros: tipo=mezcla|tipo|moa|ing, tema=<id de categoría>
import { h, icono, ruta, vaciar, chipsMoa, ingredientesTexto } from '../ui.js';
import { normalizar } from '../buscador.js';

const PREGUNTAS = 10;
const CLAVE_RECORDS = 'trivia-v1';
const TIPOS = { mezcla: 'De todo', tipo: 'Tipo de producto', moa: 'Modo de acción', ing: 'Ingrediente activo' };
const TEMAS = ['Fungicida', 'Insecticida', 'Herbicida', 'Acaricida'];
const LETRAS = ['A', 'B', 'C', 'D'];

// ---------- Azar ----------

function barajar(lista) {
  const a = [...lista];
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const azar = (lista) => lista[Math.floor(Math.random() * lista.length)];

// Hasta n valores distintos entre sí y distintos de los excluidos. `clave` decide cuándo dos valores son «el mismo».
function distintos(candidatos, excluir, n, clave = (x) => x) {
  const vistos = new Set(excluir.map(clave));
  const res = [];
  for (const c of barajar(candidatos)) {
    if (vistos.has(clave(c))) continue;
    vistos.add(clave(c));
    res.push(c);
    if (res.length === n) break;
  }
  return res;
}

// ---------- Preguntas ----------

const nombreValido = (p) => /^[A-Za-zÁÉÍÓÚÑ]/.test(p.nombre);
// Ingredientes «limpios»: los que tienen grupo de modo de acción o grupo químico (deja fuera lecturas basura).
const ingsLimpios = (p) => p.ings.length && p.ings.every((x) => x.ing.moa || x.ing.grupoQuimico);
const textoIngs = (p) => p.ings.map((x) => x.ing.nombre).join(' + ');
// Mismo ingrediente escrito distinto («Pidiflumetofen» / «Pidiflumetofeno»): se comparan las primeras letras.
const raiz = (nombre) => normalizar(nombre).replace(/ /g, '').slice(0, 6);
const firmaIngs = (texto) => texto.split(' + ').map(raiz).sort().join('+');
const textoMoa = (p) => p.moa.join(' + ');
// Solo códigos de grupo actuales (números, «M03», «4A»). Los de letra antiguos («FRAC G1», «HRAC A») quedan fuera:
// el mismo modo de acción puede venir escrito con los dos códigos y habría dos alternativas correctas.
const CODIGO_ACTUAL = /^(\d+[A-Z]?|M\d+|P\d+|BM\d+|UN)$/;
const moaActual = (p) => p.moa.length && p.moa.every((k) => CODIGO_ACTUAL.test(k.split(' ')[1] || ''));
// «IRAC 3» y «IRAC 3A» se consideran iguales para no ponerlos como alternativas distintas.
const firmaMoa = (texto) => texto.split(' + ').map((k) => k.replace(/^(\w+ \d+)[A-Z]$/, '$1')).sort().join('+');

function pista(p) {
  return [p.marca, p.formulacionCodigo].filter(Boolean).join(' · ');
}

function armar(tipo, enunciado, p, correcta, otras) {
  if (otras.length < 3) return null;
  const opciones = barajar([correcta, ...otras]);
  return { tipo, enunciado, producto: p, opciones, correcta: opciones.indexOf(correcta), textoCorrecta: correcta };
}

const GENERADORES = {
  tipo(pool, cat, usados) {
    const cats = [...cat.categorias.values()].filter((c) => [...cat.productos.values()].filter((p) => p.categorias.includes(c)).length >= 3);
    const p = azar(pool.filter((x) => x.categorias.length && !usados.has(x.id)));
    if (!p) return null;
    const correcta = p.categorias[0].nombre;
    return armar('tipo', ['¿Qué tipo de producto es ', h('strong', null, p.nombre), '?'], p, correcta,
      distintos(cats.map((c) => c.nombre), p.categorias.map((c) => c.nombre), 3));
  },
  moa(pool, cat, usados) {
    const p = azar(pool.filter((x) => moaActual(x) && !usados.has(x.id)));
    if (!p) return null;
    const correcta = textoMoa(p);
    const sistema = p.moa[0].split(' ')[0];
    const conGrupo = [...cat.productos.values()].filter(moaActual);
    // Primero alternativas del mismo sistema (FRAC con FRAC…), para que no sea tan fácil.
    let otras = distintos(conGrupo.filter((x) => x.moa[0].startsWith(sistema)).map(textoMoa), [correcta], 3, firmaMoa);
    if (otras.length < 3) otras = otras.concat(distintos(conGrupo.map(textoMoa), [correcta, ...otras], 3 - otras.length, firmaMoa));
    return armar('moa', ['¿A qué grupo de modo de acción pertenece ', h('strong', null, p.nombre), '?'], p, correcta, otras);
  },
  ing(pool, cat, usados) {
    const p = azar(pool.filter((x) => ingsLimpios(x) && !usados.has(x.id)));
    if (!p) return null;
    const correcta = textoIngs(p);
    const parecidos = pool.filter((x) => ingsLimpios(x) && x.categorias.some((c) => p.categorias.includes(c)));
    let otras = distintos(parecidos.map(textoIngs), [correcta], 3, firmaIngs);
    if (otras.length < 3) otras = otras.concat(distintos([...cat.productos.values()].filter(ingsLimpios).map(textoIngs), [correcta, ...otras], 3 - otras.length, firmaIngs));
    return armar('ing', ['¿Qué ingrediente activo tiene ', h('strong', null, p.nombre), '?'], p, correcta, otras);
  },
  // Al revés: dado un ingrediente, ¿qué producto lo tiene?
  producto(pool, cat, usados) {
    const p = azar(pool.filter((x) => ingsLimpios(x) && !usados.has(x.id)));
    if (!p) return null;
    const ing = azar(p.ings).ing;
    const sinEse = pool.filter((x) => !x.ings.some((y) => raiz(y.ing.nombre) === raiz(ing.nombre)) && x.categorias.some((c) => p.categorias.includes(c)));
    const otras = distintos(sinEse.map((x) => x.nombre), [p.nombre], 3);
    return armar('producto', ['¿Cuál de estos productos tiene ', h('strong', null, ing.nombre), '?'], p, p.nombre, otras);
  },
};

function ronda(cat, tipo, temaId) {
  const tema = temaId ? cat.categorias.get(Number(temaId)) || cat.categorias.get(temaId) : null;
  const pool = [...cat.productos.values()].filter((p) => nombreValido(p) && (!tema || p.categorias.includes(tema)));
  const tipos = tipo === 'mezcla'
    ? (tema ? ['moa', 'ing', 'producto'] : ['tipo', 'moa', 'ing', 'producto'])
    : tipo === 'ing' ? ['ing', 'producto'] : [tipo];
  const usados = new Set();
  const preguntas = [];
  for (let intento = 0; preguntas.length < PREGUNTAS && intento < PREGUNTAS * 20; intento += 1) {
    const q = GENERADORES[azar(tipos)](pool, cat, usados);
    if (!q || usados.has(q.producto.id)) continue;
    usados.add(q.producto.id);
    preguntas.push(q);
  }
  return preguntas;
}

// ---------- Récords (solo en este equipo) ----------

function leerRecords() {
  try { return JSON.parse(localStorage.getItem(CLAVE_RECORDS) || '{}') || {}; } catch (e) { return {}; }
}

function guardarRecord(clave, puntos, segundos) {
  const r = leerRecords();
  const antes = r[clave];
  const mejor = !antes || puntos > antes.puntos || (puntos === antes.puntos && segundos < antes.segundos);
  if (mejor) {
    r[clave] = { puntos, segundos };
    try { localStorage.setItem(CLAVE_RECORDS, JSON.stringify(r)); } catch (e) { /* sin espacio o bloqueado */ }
  }
  return mejor;
}

const reloj = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

// ---------- Vista ----------

function opcionTexto(q, texto) {
  return q.tipo === 'moa' ? chipsMoa(texto.split(' + ')) : texto;
}

function ficha(p) {
  return h('span', null, h('a', { href: ruta(`producto/${p.id}`), target: '_blank', rel: 'noopener' }, p.nombre), ': ',
    [p.categorias.map((c) => c.nombre).join(' · '), p.moa.join(' + '), ingredientesTexto(p), p.marca].filter(Boolean).join(' · '));
}

export function render(main, ctx) {
  const { cat, params } = ctx;
  const temas = TEMAS.map((n) => [...cat.categorias.values()].find((c) => normalizar(c.nombre) === normalizar(n))).filter(Boolean);
  const eleccion = {
    tipo: TIPOS[params.get('tipo')] ? params.get('tipo') : 'mezcla',
    tema: temas.some((c) => String(c.id) === params.get('tema')) ? params.get('tema') : '',
  };
  const zona = h('div', { class: 'trivia' });
  main.append(zona);
  let temporizador = null;
  const parar = () => { clearInterval(temporizador); temporizador = null; };

  const claveRecord = () => `${eleccion.tipo}|${eleccion.tema}`;
  const textoRecord = () => {
    const r = leerRecords()[claveRecord()];
    return r ? `Tu mejor puntaje: ${r.puntos} de ${PREGUNTAS} en ${reloj(r.segundos)}` : null;
  };

  function portada() {
    parar();
    vaciar(zona);
    ctx.cambiarParams({ tipo: eleccion.tipo === 'mezcla' ? '' : eleccion.tipo, tema: eleccion.tema });
    const grupoChips = (titulo, opciones, actual, alElegir) => h('div', { class: 'trivia-eleccion' },
      h('span', { class: 'filtro-titulo' }, titulo),
      h('div', { class: 'chips' }, opciones.map(([v, t, desactivado]) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(v === actual), disabled: desactivado,
        onclick: () => { alElegir(v); portada(); },
      }, t))));
    const record = textoRecord();
    zona.append(
      h('h1', null, 'Trivia'),
      h('p', { class: 'trivia-bajada' }, `${PREGUNTAS} preguntas de alternativas sobre los productos registrados.`),
      h('div', { class: 'trivia-portada' },
        grupoChips('Preguntas', Object.entries(TIPOS).map(([v, t]) => [v, t, v === 'tipo' && Boolean(eleccion.tema)]), eleccion.tipo,
          (v) => { eleccion.tipo = v; }),
        grupoChips('Productos', [['', 'Todos'], ...temas.map((c) => [String(c.id), `${c.nombre}s`])], eleccion.tema,
          (v) => { eleccion.tema = v; if (v && eleccion.tipo === 'tipo') eleccion.tipo = 'mezcla'; }),
        h('div', { class: 'trivia-jugar' },
          h('button', { type: 'button', class: 'boton boton-primario boton-grande', onclick: jugar }, icono('trofeo'), 'Jugar'),
          record ? h('span', { class: 'chico tenue' }, record) : null)));
  }

  function jugar() {
    const preguntas = ronda(cat, eleccion.tipo, eleccion.tema);
    if (!preguntas.length) {
      zona.append(h('p', { class: 'nota nota-alerta' }, 'No hay productos suficientes para esta combinación. Prueba con otra.'));
      return;
    }
    const respuestas = [];
    const inicio = Date.now();
    let segundos = 0;
    const tiempo = h('span', { class: 'trivia-reloj' }, '0:00');
    parar();
    temporizador = setInterval(() => {
      if (!ctx.vigente() || !zona.isConnected) { parar(); return; }
      segundos = Math.floor((Date.now() - inicio) / 1000);
      tiempo.textContent = reloj(segundos);
    }, 500);

    const mostrar = (i) => {
      vaciar(zona);
      const q = preguntas[i];
      const puntos = respuestas.filter((r) => r.bien).length;
      const siguiente = h('button', { type: 'button', class: 'boton boton-primario', hidden: true },
        i + 1 < preguntas.length ? 'Siguiente' : 'Ver resultado', icono('flecha'));
      const resultado = h('div', { class: 'trivia-resultado', 'aria-live': 'polite' });
      const botones = q.opciones.map((texto, k) => h('button', { type: 'button', class: 'opcion-trivia', onclick: () => responder(k) },
        h('span', { class: 'opcion-letra' }, LETRAS[k]), h('span', { class: 'opcion-texto' }, opcionTexto(q, texto))));

      function responder(k) {
        if (respuestas.length > i) return;
        const bien = k === q.correcta;
        respuestas.push({ q, elegida: k, bien });
        botones.forEach((b, j) => {
          b.disabled = true;
          if (j === q.correcta) b.classList.add('correcta');
          else if (j === k) b.classList.add('incorrecta');
        });
        resultado.append(
          h('p', { class: bien ? 'trivia-bien' : 'trivia-mal' }, icono(bien ? 'check' : 'cerrar'),
            bien ? 'Correcto' : ['Era ', h('strong', null, q.textoCorrecta)]),
          h('p', { class: 'chico' }, ficha(q.producto)));
        siguiente.hidden = false;
        siguiente.focus();
      }
      siguiente.addEventListener('click', () => (i + 1 < preguntas.length ? mostrar(i + 1) : final()));
      // Teclado: 1–4 o A–D para responder; Enter para seguir.
      zona.onkeydown = (e) => {
        const k = '1234'.indexOf(e.key) >= 0 ? '1234'.indexOf(e.key) : 'abcd'.indexOf(e.key.toLowerCase());
        if (k >= 0 && k < botones.length && respuestas.length === i) { e.preventDefault(); responder(k); }
      };

      zona.append(
        h('div', { class: 'trivia-barra' },
          h('span', null, `Pregunta ${i + 1} de ${preguntas.length}`),
          h('span', null, 'Puntaje ', h('strong', null, String(puntos))),
          tiempo),
        h('div', { class: 'trivia-progreso', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(preguntas.length), 'aria-valuenow': String(i) },
          h('span', { style: `width:${(i / preguntas.length) * 100}%` })),
        h('div', { class: 'trivia-pregunta' },
          h('p', { class: 'trivia-enunciado' }, q.enunciado),
          q.tipo !== 'producto' && pista(q.producto) ? h('p', { class: 'chico' }, pista(q.producto)) : null),
        h('div', { class: 'trivia-opciones' }, botones),
        resultado,
        h('div', { class: 'trivia-acciones' }, siguiente));
      zona.tabIndex = -1;
      zona.focus({ preventScroll: true });
    };

    function final() {
      parar();
      segundos = Math.floor((Date.now() - inicio) / 1000);
      const puntos = respuestas.filter((r) => r.bien).length;
      const nuevo = guardarRecord(claveRecord(), puntos, segundos);
      zona.onkeydown = null;
      vaciar(zona);
      zona.append(
        h('div', { class: 'trivia-final' },
          h('p', { class: 'trivia-puntaje' }, h('strong', null, String(puntos)), ` de ${preguntas.length}`),
          h('p', null, `Tiempo: ${reloj(segundos)}`),
          nuevo ? h('p', { class: 'etiqueta etq-ok' }, icono('trofeo'), 'Nuevo récord') : h('p', { class: 'chico tenue' }, textoRecord()),
          h('div', { class: 'acciones' },
            h('button', { type: 'button', class: 'boton boton-primario', onclick: jugar }, 'Jugar otra vez'),
            h('button', { type: 'button', class: 'boton', onclick: portada }, 'Cambiar preguntas'))),
        h('h2', { class: 'titulo-seccion' }, 'Tus respuestas'),
        h('ol', { class: 'trivia-repaso' }, respuestas.map((r) => h('li', { class: r.bien ? 'bien' : 'mal' },
          h('span', { class: 'trivia-marca' }, icono(r.bien ? 'check' : 'cerrar')),
          h('div', null,
            h('p', null, r.q.enunciado),
            r.bien ? null : h('p', { class: 'chico' }, 'Respondiste: ', opcionTexto(r.q, r.q.opciones[r.elegida])),
            h('p', { class: 'chico' }, 'Respuesta: ', h('strong', null, opcionTexto(r.q, r.q.textoCorrecta))),
            h('p', { class: 'chico tenue' }, ficha(r.q.producto)))))));
    }

    mostrar(0);
  }

  portada();
}
