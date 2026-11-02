// Inicio: qué son FRAC, IRAC y HRAC y por qué importan (pedido de Cristóbal, 01-11-2026: «que lo entienda un agricultor
// sin estudios y que un ingeniero esté de acuerdo»; 02-11-2026: «más visual, divertido de entender» y que sea el inicio).
// Lo simple va a la vista, con dibujos, un juego de rotación y un «¿rotaste o no?»; lo técnico queda en «Para el técnico»
// (desplegables). Los textos explican las clasificaciones oficiales (FRAC Code List, IRAC MoA Classification, HRAC MoA
// Classification); los productos y las cantidades del catálogo salen de la base, nunca inventados.
import { h, icono, ruta, plural, claseMoa, chipsMoa, vaciar } from '../ui.js';

// Dibujos de línea de cada comité (64 × 64): hongo, insecto y maleza.
const DIBUJOS = {
  frac: '<path d="M8 31c0-13 11-22 24-22s24 9 24 22c0 2-2 3-4 3H12c-2 0-4-1-4-3z"/><path d="M24 34v14c0 4 4 7 8 7s8-3 8-7V34"/><circle cx="22" cy="21" r="3"/><circle cx="36" cy="16" r="2.5"/><circle cx="44" cy="25" r="3"/><path d="M10 58h44"/>',
  irac: '<ellipse cx="32" cy="38" rx="13" ry="16"/><circle cx="32" cy="17" r="6"/><path d="M32 23v31"/><path d="M19 31l-9-5M19 39H8M20 47l-8 6M45 31l9-5M45 39h11M44 47l8 6"/><path d="M29 12l-5-7M35 12l5-7"/>',
  hrac: '<path d="M8 57h48"/><path d="M32 57V28"/><path d="M32 42c-10 0-16-6-17-14 9 0 16 5 17 14z"/><path d="M32 35c9 0 15-6 16-13-9 0-15 5-16 13z"/><path d="M14 57c0-8 2-14 6-18M50 57c0-8-2-13-6-17M21 57c0-5 1-9 3-11"/>',
};

function dibujo(clase) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  for (const [k, v] of Object.entries({
    viewBox: '0 0 64 64', fill: 'none', stroke: 'currentColor', 'stroke-width': '2.5',
    'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true', focusable: 'false', class: 'md-dibujo',
  })) s.setAttribute(k, v);
  s.innerHTML = DIBUJOS[clase];
  return s;
}

const SIGLAS = [
  {
    sistema: 'FRAC', clase: 'frac', para: 'Fungicidas', contra: 'hongos', ejemplos: 'botrytis, oídio, venturia, mildiú',
    nombre: 'Fungicide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a fungicidas',
    lectura: [
      'Un número por modo de acción: 1, 3, 7, 11…',
      'Los que llevan M (M01 cobre, M02 azufre, M03 mancozeb) atacan muchos puntos a la vez: el hongo casi no se hace resistente a ellos. Son buenos compañeros de mezcla.',
    ],
    tecnico: [
      'Cada grupo tiene un riesgo de resistencia según la FRAC Code List: bajo, medio o alto.',
      'Algunas etiquetas antiguas traen letras (G1, C2, C3…). En este sitio se muestran con su número actual.',
    ],
    hace: 'Qué le hace al hongo',
    grupos: [
      { codigo: 'FRAC 1', que: 'Frena la división de sus células', sitio: 'β-tubulina', familia: 'Benzimidazoles', ejemplos: 'carbendazima, tiabendazol', riesgo: 'Alto' },
      { codigo: 'FRAC 3', que: 'Frena la fabricación de su membrana', sitio: 'C14-desmetilasa de esteroles', familia: 'Triazoles (DMI)', ejemplos: 'tebuconazol, difenoconazol, propiconazol', riesgo: 'Medio' },
      { codigo: 'FRAC 4', que: 'Frena la fabricación de su material genético', sitio: 'ARN polimerasa I', familia: 'Fenilamidas', ejemplos: 'metalaxil', riesgo: 'Alto' },
      { codigo: 'FRAC 7', que: 'Le corta la respiración', sitio: 'succinato deshidrogenasa (complejo II)', familia: 'Carboxamidas (SDHI)', ejemplos: 'boscalid, fluopiram, fluxapiroxad', riesgo: 'Medio a alto' },
      { codigo: 'FRAC 9', que: 'Frena la fabricación de un aminoácido', sitio: 'síntesis de metionina (propuesto)', familia: 'Anilinopirimidinas', ejemplos: 'ciprodinilo, pirimetanilo', riesgo: 'Medio' },
      { codigo: 'FRAC 11', que: 'Le corta la respiración en otro punto', sitio: 'citocromo bc1, sitio Qo (complejo III)', familia: 'Estrobilurinas (QoI)', ejemplos: 'azoxistrobina, piraclostrobina, trifloxistrobina', riesgo: 'Alto' },
      { codigo: 'FRAC 12', que: 'Le altera las señales internas', sitio: 'transducción de señal osmótica', familia: 'Fenilpirroles', ejemplos: 'fludioxonilo', riesgo: 'Bajo a medio' },
      { codigo: 'FRAC 17', que: 'Frena la fabricación de su membrana en otro punto', sitio: '3-ceto reductasa de esteroles', familia: 'Hidroxianilidas', ejemplos: 'fenhexamida', riesgo: 'Bajo a medio' },
      { codigo: 'FRAC M01', que: 'Ataca muchos puntos a la vez', sitio: 'multisitio', familia: 'Cobre', ejemplos: 'oxicloruro de cobre, hidróxido de cobre', riesgo: 'Bajo' },
      { codigo: 'FRAC M02', que: 'Ataca muchos puntos a la vez', sitio: 'multisitio', familia: 'Azufre', ejemplos: 'azufre, polisulfuro de calcio', riesgo: 'Bajo' },
      { codigo: 'FRAC M03', que: 'Ataca muchos puntos a la vez', sitio: 'multisitio', familia: 'Ditiocarbamatos', ejemplos: 'mancozeb, metiram, propineb', riesgo: 'Bajo' },
      { codigo: 'FRAC M05', que: 'Ataca muchos puntos a la vez', sitio: 'multisitio', familia: 'Cloronitrilos', ejemplos: 'clorotalonilo', riesgo: 'Bajo' },
    ],
  },
  {
    sistema: 'IRAC', clase: 'irac', para: 'Insecticidas y acaricidas', contra: 'insectos y ácaros', ejemplos: 'pulgones, polillas, trips, arañitas',
    nombre: 'Insecticide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a insecticidas',
    lectura: [
      'Un número y a veces una letra: 1A, 3A, 4A… Manda el número: 1A y 1B son el mismo modo de acción.',
      'Se rota por ventanas: un código durante una generación de la plaga (unos 30 días) y otro en la siguiente.',
    ],
    tecnico: [
      'La letra separa familias químicas que comparten el sitio de acción: 1A (carbamatos) y 1B (organofosforados) inhiben la acetilcolinesterasa.',
      'UN quiere decir que el modo de acción no se conoce o no está confirmado. También clasifica nematicidas.',
    ],
    hace: 'Qué le hace al insecto o ácaro',
    grupos: [
      { codigo: 'IRAC 1', que: 'Bloquea una enzima de los nervios', sitio: 'acetilcolinesterasa', familia: 'Carbamatos (1A) y organofosforados (1B)', ejemplos: 'pirimicarb, oxamilo (1A); profenofós (1B)' },
      { codigo: 'IRAC 3', que: 'Deja los nervios disparando sin parar', sitio: 'canal de sodio', familia: 'Piretroides (3A)', ejemplos: 'lambda-cihalotrina, alfacipermetrina, deltametrina' },
      { codigo: 'IRAC 4', que: 'Imita la señal de los nervios y los satura', sitio: 'receptor nicotínico de acetilcolina', familia: 'Neonicotinoides (4A) y sulfoximinas (4C)', ejemplos: 'imidacloprid, acetamiprid, tiametoxam (4A); sulfoxaflor (4C)' },
      { codigo: 'IRAC 5', que: 'Sobreexcita los nervios', sitio: 'receptor nicotínico, sitio alostérico', familia: 'Espinosinas', ejemplos: 'espinosad, espinetoram' },
      { codigo: 'IRAC 6', que: 'Lo paraliza', sitio: 'canal de cloro activado por glutamato', familia: 'Avermectinas', ejemplos: 'abamectina, emamectina' },
      { codigo: 'IRAC 10', que: 'Frena el desarrollo de huevos y ninfas de ácaros', sitio: 'inhibidores del crecimiento de ácaros (CHS1)', familia: 'Clofentezina y hexitiazox (10A), etoxazol (10B)', ejemplos: 'hexitiazox, clofentezina, etoxazol' },
      { codigo: 'IRAC 15', que: 'No deja que forme su nueva cubierta al mudar', sitio: 'síntesis de quitina (CHS1)', familia: 'Benzoilureas', ejemplos: 'lufenurón, novalurón, triflumurón' },
      { codigo: 'IRAC 23', que: 'Frena la fabricación de sus grasas', sitio: 'acetil-CoA carboxilasa', familia: 'Ácidos tetrónicos y tetrámicos', ejemplos: 'espirodiclofeno, espirotetramato' },
      { codigo: 'IRAC 28', que: 'Contrae sus músculos sin control y deja de comer', sitio: 'receptor de rianodina', familia: 'Diamidas', ejemplos: 'clorantraniliprol, ciantraniliprol' },
    ],
  },
  {
    sistema: 'HRAC', clase: 'hrac', para: 'Herbicidas', contra: 'malezas', ejemplos: 'ballica, avenilla, pasto pinto, correhuela',
    nombre: 'Herbicide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a herbicidas',
    lectura: [
      'Desde 2020 usa números. Muchas etiquetas traen todavía la letra antigua: A = 1, B = 2, G = 9, O = 4.',
      'En este sitio se ve así: HRAC 1 (A). El número es el código actual; entre paréntesis, el de la etiqueta.',
    ],
    tecnico: [
      'Equivalencias más usadas: A = 1, B = 2, C1 y C2 = 5, D = 22, E = 14, G = 9, H = 10, K3 = 15, O = 4 (clasificación HRAC 2020).',
      'La resistencia aparece más lento que en insectos u hongos (muchas malezas tienen una generación al año), pero la semilla resistente queda años en el suelo.',
    ],
    hace: 'Qué le hace a la maleza',
    grupos: [
      { codigo: 'HRAC 1', antes: 'A', que: 'Frena la fabricación de sus grasas; solo afecta a gramíneas', sitio: 'ACCasa', familia: 'Ariloxifenoxipropionatos («fop») y ciclohexanodionas («dim»)', ejemplos: 'quizalofop-P-etilo, haloxifop, cletodima' },
      { codigo: 'HRAC 2', antes: 'B', que: 'Frena la fabricación de aminoácidos', sitio: 'ALS', familia: 'Sulfonilureas e imidazolinonas', ejemplos: 'metsulfurón-metilo, nicosulfurón, imazamox' },
      { codigo: 'HRAC 4', antes: 'O', que: 'Imita una hormona de crecimiento: la maleza crece deformada', sitio: 'auxinas sintéticas', familia: 'Fenoxiácidos y ácidos piridincarboxílicos', ejemplos: '2,4-D, MCPA, clopiralid, picloram' },
      { codigo: 'HRAC 5', antes: 'C1, C2', que: 'Frena la fotosíntesis', sitio: 'fotosistema II', familia: 'Triazinas, triazinonas y ureas', ejemplos: 'simazina, atrazina, metribuzina, diurón' },
      { codigo: 'HRAC 9', antes: 'G', que: 'Frena la fabricación de aminoácidos en otro punto', sitio: 'EPSPS', familia: 'Glicinas', ejemplos: 'glifosato' },
      { codigo: 'HRAC 10', antes: 'H', que: 'Frena una enzima clave para usar el nitrógeno', sitio: 'glutamina sintetasa', familia: 'Ácidos fosfínicos', ejemplos: 'glufosinato de amonio' },
      { codigo: 'HRAC 14', antes: 'E', que: 'Rompe sus membranas con la luz del sol', sitio: 'PPO', familia: 'Difeniléteres y otros', ejemplos: 'oxifluorfeno, saflufenacilo' },
      { codigo: 'HRAC 15', antes: 'K3', que: 'Frena el crecimiento de la plántula recién nacida', sitio: 'ácidos grasos de cadena muy larga', familia: 'Cloroacetamidas y otros', ejemplos: 'S-metolacloro, flufenacet' },
      { codigo: 'HRAC 22', antes: 'D', que: 'Quema el tejido verde en horas', sitio: 'fotosistema I', familia: 'Bipiridilos', ejemplos: 'diquat' },
    ],
  },
];

const PALABRAS = [
  {
    icono: 'frasco', titulo: 'Ingrediente activo',
    simple: 'Lo que va adentro del envase y hace el efecto. La marca es solo el nombre.',
    ejemplo: 'Muchas marcas llevan tebuconazol. Para el hongo, todas son tebuconazol.',
    tecnico: 'La concentración (g/L o %) y la formulación (SC, WG, EC…) cambian de un producto a otro; el ingrediente y su sitio de acción definen el código.',
  },
  {
    icono: 'escudo', titulo: 'Modo de acción',
    simple: 'El punto del bicho, del hongo o de la maleza que el producto ataca.',
    ejemplo: 'Unos paralizan los nervios del insecto; otros le cortan la respiración al hongo.',
    tecnico: 'Es el sitio de acción bioquímico: el canal de sodio en los piretroides (IRAC 3A), el complejo III de la respiración en las estrobilurinas (FRAC 11), la enzima EPSPS en el glifosato (HRAC 9).',
  },
  {
    icono: 'alerta', titulo: 'Resistencia',
    simple: 'Cuando la plaga ya no muere con un producto que antes la mataba.',
    ejemplo: 'No es que «se acostumbre»: sobreviven y se multiplican los pocos que ya lo aguantaban.',
    tecnico: 'Es selección: cada aplicación elimina a los sensibles y sube la frecuencia de los que traen resistencia (cambio en el sitio de acción, mayor degradación del producto o menor absorción). Es heredable.',
  },
  {
    icono: 'rotar', titulo: 'Resistencia cruzada',
    simple: 'Si la plaga aguanta un producto, en general aguanta todos los de su mismo código.',
    ejemplo: 'Un oídio que aguanta azoxistrobina también aguanta piraclostrobina: las dos son FRAC 11.',
    tecnico: 'Pasa porque comparten el sitio de acción. En algunos grupos es parcial (por ejemplo, entre algunos SDHI, FRAC 7), pero los comités recomiendan planificar como si todo el grupo fuera uno solo.',
  },
];

// Juego: 40 individuos de botrytis. Cada uno aguanta o no cada código (5 % de partida, al azar). Al aplicar un código
// mueren los que no lo aguantan (salvo un 5 % que escapa por mala cobertura); los que quedan se multiplican y llega un
// 20 % de vecinos. Es un modelo de juguete para mostrar la idea, no un cálculo real.
const JUEGO = {
  opciones: [['Marca A', 'FRAC 7'], ['Marca B', 'FRAC 7'], ['Marca C', 'FRAC 12'], ['Marca D', 'FRAC 9']],
  total: 40, base: 0.05, escapan: 0.05, vecinos: 0.2, aplicaciones: 6,
};

const ROTASTE = [
  { antes: ['FRAC 11'], despues: ['FRAC 11'], marcas: ['Marca A', 'Marca B'], rota: false, explica: 'Es el mismo código. Aunque cambie la marca, para el hongo es el mismo golpe.' },
  { antes: ['IRAC 1A'], despues: ['IRAC 1B'], marcas: ['Insecticida', 'Insecticida'], rota: false, explica: 'Manda el número: 1A y 1B atacan el mismo punto de los nervios. Los dos son grupo 1.' },
  { antes: ['HRAC A'], despues: ['HRAC 1'], marcas: ['Herbicida', 'Herbicida'], rota: false, explica: 'A es el nombre antiguo del grupo 1. Es el mismo modo de acción con otro nombre.' },
  { antes: ['FRAC 7', 'FRAC 11'], despues: ['FRAC 3'], marcas: ['Mezcla', 'Fungicida'], rota: true, explica: 'El FRAC 3 ataca otro punto del hongo, distinto de los dos que traía la mezcla.' },
];

const REGLAS = [
  { icono: 'rotar', titulo: 'Rota códigos, no marcas', texto: 'Mira el código antes de elegir. Mismo código = mismo golpe.' },
  { icono: 'frasco', titulo: 'Mezcla con otro código', texto: 'Dos códigos distintos en el estanque se protegen entre ellos.' },
  { icono: 'pdf', titulo: 'Dosis de la etiqueta', texto: 'Ni menos (deja sobrevivientes) ni más (no está permitido).' },
  { icono: 'calendario', titulo: 'Respeta el máximo', texto: 'El máximo de aplicaciones por temporada también cuida el código.' },
];
const MAS_REGLAS = [
  ['No repitas el mismo código seguido', 'En hongos y malezas, cambia de código entre aplicaciones seguidas contra la misma plaga, salvo que la etiqueta permita repetir. En insectos y ácaros, un código por ventana (una generación, unos 30 días).'],
  ['Cada producto de la mezcla tiene que servir solo', 'En una mezcla, cada producto debe controlar la plaga por sí mismo y a su dosis de etiqueta. Un producto que trae dos ingredientes cuenta para los dos códigos.'],
  ['Aplica a tiempo y bien', 'Con la plaga chica o la enfermedad recién partiendo, con buen mojamiento y el equipo calibrado. Una aplicación mala deja sobrevivientes.'],
  ['Suma control sin químicos', 'Monitoreo y umbrales, enemigos naturales, poda y ventilación, rotación de cultivos, control mecánico de malezas.'],
  ['Si un producto falla, no lo repitas', 'Puede ser resistencia. Cambia de código, revisa cómo se aplicó y avisa a tu asesor o a la empresa.'],
];

const IMPORTA = [
  ['escudo', 'El producto deja de servir', 'Se aplica y la plaga sigue.'],
  ['grafico', 'Sube el costo', 'Hay que volver a aplicar: más producto, tractor y petróleo.'],
  ['alerta', 'Más riesgo de residuos', 'Más aplicaciones, más riesgo de pasar el LMR y de rechazo en destino.'],
  ['brote', 'Se pierde para todos', 'La resistencia pasa a los vecinos y salen pocos productos nuevos.'],
];

const EJEMPLOS = [
  { moa: 'FRAC 7', titulo: 'Botrytis en uva de mesa', pasa: 'Tres productos de marcas distintas, los tres FRAC 7, en una temporada lluviosa.', hacer: 'Alternar códigos (por ejemplo 7, 12 y 9) si la etiqueta los autoriza para uva y botrytis.' },
  { moa: 'IRAC 6', titulo: 'Arañita roja en manzano', pasa: 'Muchas generaciones y todas las aplicaciones con abamectina (IRAC 6).', hacer: 'Un código por ventana (por ejemplo 6, 23 y 10) y cuidar a los ácaros depredadores.' },
  { moa: 'HRAC 9', titulo: 'Ballica bajo la hilera', pasa: 'Años usando solo glifosato (HRAC 9). En Chile hay ballica resistente documentada.', hacer: 'Alternar o mezclar con otro código autorizado y sumar control mecánico.' },
];

// Códigos bien escritos (algunas etiquetas traen textos raros como «FRAC E3 GRUPO 2»): solo esos se muestran.
const CODIGO_VALIDO = /^(FRAC|IRAC|HRAC) (M\d{2}|\d{1,2}[A-Z]?|UN)$/;
// Nombres sacados del nombre de archivo («20241202 Botristop», «. Biocap…»): no sirven de ejemplo.
const nombreRaro = (p) => /^\W|^\d{6,}/.test(p.nombre);
const disponibles = (cat) => [...cat.productos.values()].filter((p) => !p.noDisponible && !nombreRaro(p));
const masUsados = (a, b) => (b.nLineas || 0) - (a.nLineas || 0);
const solos = (cat, k) => disponibles(cat).filter((p) => p.ings.length === 1 && p.familias.length === 1 && p.familias[0] === k).sort(masUsados);

const codigo = (k) => h('span', { class: claseMoa(k) }, k);

function seccion(id, titulo, ...hijos) {
  return h('section', { class: 'md-seccion', id: `md-${id}`, 'aria-labelledby': `md-${id}-t` },
    h('h2', { id: `md-${id}-t` }, titulo), hijos);
}

function irA(id) {
  const el = document.getElementById(`md-${id}`);
  if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function tecnico(...hijos) {
  return h('details', { class: 'md-tecnico' }, h('summary', null, 'Para el técnico'), h('div', null, hijos));
}

// ---------- Portada ----------

function portada() {
  return h('header', { class: 'md-cabeza' },
    h('div', { class: 'md-cabeza-texto' },
      h('h1', null, 'Rota el código, no la marca'),
      h('p', { class: 'md-bajada' }, 'FRAC, IRAC y HRAC son los códigos que dicen cómo mata cada producto. Si se repite el mismo código, la plaga se hace resistente y el producto deja de servir.'),
      h('div', { class: 'acciones' },
        h('a', { class: 'boton boton-primario', href: '#/buscar' }, icono('buscar'), 'Buscar un producto'),
        h('button', { type: 'button', class: 'boton', onclick: () => irA('juego') }, 'Aprender jugando'))),
    h('div', { class: 'md-bloques' }, SIGLAS.map((s) => h('button', {
      type: 'button', class: `md-bloque md-bloque-${s.clase}`, onclick: () => irA(s.clase),
      'aria-label': `${s.sistema}: ${s.para}. Ir a la explicación`,
    },
    dibujo(s.clase),
    h('span', { class: 'md-bloque-texto' },
      h('span', { class: 'md-bloque-sigla' }, s.sistema),
      h('span', { class: 'md-bloque-para' }, `${s.para} · ${s.contra}`)),
    icono('flecha')))));
}

// ---------- La idea en un dibujo: dos marcas con el mismo código y una con otro (productos del catálogo) ----------

function tarjetaProducto(p, k, generico) {
  return h(p ? 'a' : 'div', { class: 'md-envase', href: p ? `#/producto/${p.id}` : null },
    icono('frasco'),
    h('span', { class: 'md-envase-nombre' }, p ? p.nombre : generico),
    h('span', { class: 'md-envase-ing' }, p ? p.ings[0].ing.nombre.toLowerCase() : 'otro ingrediente'),
    codigo(k));
}

function idea(cat) {
  let par = null;
  for (const k of ['FRAC 3', 'FRAC 11', 'IRAC 4', 'IRAC 3']) {
    const lista = solos(cat, k);
    const a = lista[0];
    const b = a && lista.find((p) => p.ings[0].ing.nombre !== a.ings[0].ing.nombre && p.marca !== a.marca);
    if (a && b) { par = { k, a, b }; break; }
  }
  const k1 = par ? par.k : 'FRAC 3';
  const otroK = k1.startsWith('FRAC') ? (k1 === 'FRAC 7' ? 'FRAC 11' : 'FRAC 7') : 'IRAC 28';
  const otro = solos(cat, otroK)[0];
  const fila = (izq, signo, der, texto, bien) => h('div', { class: 'md-igual' },
    izq, h('span', { class: 'md-signo', 'aria-hidden': 'true' }, signo), der,
    h('p', { class: `md-veredicto ${bien ? 'md-bien' : 'md-mal'}` }, icono(bien ? 'check' : 'cerrar'), texto));
  return seccion('idea', 'La idea en un dibujo',
    fila(tarjetaProducto(par && par.a, k1, 'Marca A'), '=', tarjetaProducto(par && par.b, k1, 'Marca B'),
      'Marcas e ingredientes distintos, mismo código: alternar entre ellos no es rotar', false),
    fila(tarjetaProducto(par && par.a, k1, 'Marca A'), '≠', tarjetaProducto(otro, otroK, 'Marca C'),
      'Códigos distintos: atacan puntos distintos. Esto sí es rotar', true));
}

// ---------- Juego de rotación ----------

function juego() {
  const codigos = [...new Set(JUEGO.opciones.map(([, k]) => k))];
  const nuevo = () => Object.fromEntries(codigos.map((k) => [k, Math.random() < JUEGO.base]));
  let poblacion = [];
  let historial = [];
  let ocupado = false;

  const puntos = h('div', { class: 'md-poblacion', 'aria-hidden': 'true' });
  const mensaje = h('p', { class: 'md-juego-mensaje', 'aria-live': 'polite' });
  const linea = h('ol', { class: 'md-historial' });
  const leyenda = h('p', { class: 'md-juego-leyenda' });
  const botones = JUEGO.opciones.map(([marca, k]) => h('button', {
    type: 'button', class: 'md-opcion', onclick: () => aplicar(k, marca),
  }, h('span', null, marca), codigo(k)));
  const reiniciar = h('button', { type: 'button', class: 'boton boton-chico', onclick: () => empezar() }, icono('rotar'), 'Jugar de nuevo');

  // vivos: null = antes de aplicar; si no, el estado de cada uno. marca: el código que se muestra en negro.
  function pintar(estados, marcaK) {
    vaciar(puntos);
    poblacion.forEach((ind, i) => {
      const e = estados ? estados[i] : (marcaK && ind[marcaK] ? 'aguanta' : 'sensible');
      puntos.append(h('span', { class: `md-punto md-${e}` }));
    });
    leyenda.textContent = marcaK ? `Negro: aguantan ${marcaK}. Verde: mueren con ${marcaK}.` : 'Cada punto es un hongo. Verde: muere con el producto.';
  }

  function empezar() {
    // De partida, justo el 5 % aguanta cada código (en lugares al azar), para que el juego siempre muestre la idea.
    poblacion = Array.from({ length: JUEGO.total }, () => Object.fromEntries(codigos.map((k) => [k, false])));
    for (const k of codigos) {
      const lugares = poblacion.map((_, i) => i).sort(() => Math.random() - 0.5);
      for (const i of lugares.slice(0, Math.round(JUEGO.total * JUEGO.base))) poblacion[i][k] = true;
    }
    historial = [];
    vaciar(linea);
    mensaje.textContent = `Tienes ${JUEGO.aplicaciones} aplicaciones contra botrytis. Elige el producto de cada una.`;
    reiniciar.hidden = true;
    botones.forEach((b) => { b.disabled = false; });
    pintar(null, null);
  }

  function aplicar(k, marca) {
    if (ocupado || historial.length >= JUEGO.aplicaciones) return;
    ocupado = true;
    botones.forEach((b) => { b.disabled = true; });
    const estados = poblacion.map((ind) => (ind[k] ? 'aguanta' : Math.random() < JUEGO.escapan ? 'sensible' : 'muerto'));
    const muertos = estados.filter((e) => e === 'muerto').length;
    const control = Math.round((muertos / JUEGO.total) * 100);
    const repetido = historial.length && historial[historial.length - 1].k === k;
    historial.push({ k, marca, control });
    pintar(estados, k);
    linea.append(h('li', { class: control >= 80 ? 'md-bien' : control >= 50 ? 'md-regular' : 'md-mal' },
      h('span', { class: 'md-historial-n' }, `${historial.length}.ª`), codigo(k), h('strong', null, `${control} %`)));
    mensaje.textContent = `Controlaste el ${control} %. ${repetido ? `Repetiste ${k}: los que lo aguantaron la vez pasada ahora son más.`
      : control >= 80 ? 'Buen control.' : `Ojo: muchos ya aguantan ${k}.`}`;
    // Los que quedan vivos se multiplican y llegan vecinos.
    const vivos = poblacion.filter((_, i) => estados[i] !== 'muerto');
    const hijos = Math.round(JUEGO.total * (1 - JUEGO.vecinos));
    const espera = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 1200;
    setTimeout(() => {
      poblacion = [
        ...Array.from({ length: vivos.length ? hijos : 0 }, () => ({ ...vivos[Math.floor(Math.random() * vivos.length)] })),
        ...Array.from({ length: JUEGO.total - (vivos.length ? hijos : 0) }, nuevo),
      ];
      pintar(null, k);
      ocupado = false;
      if (historial.length >= JUEGO.aplicaciones) terminar();
      else botones.forEach((b) => { b.disabled = false; });
    }, espera);
  }

  function terminar() {
    const promedio = Math.round(historial.reduce((s, x) => s + x.control, 0) / historial.length);
    const repeticiones = historial.filter((x, i) => i && historial[i - 1].k === x.k).length;
    mensaje.textContent = `Control promedio: ${promedio} %. ${repeticiones
      ? `Repetiste el mismo código ${repeticiones === 1 ? 'una vez' : `${repeticiones} veces`} seguidas: ahí la botrytis se hizo resistente.`
      : 'No repetiste el código seguido: la botrytis siguió controlada.'}`;
    reiniciar.hidden = false;
  }

  empezar();
  return seccion('juego', 'Juega: que la botrytis no se haga resistente',
    h('p', { class: 'md-intro' }, 'Marca A y Marca B son distintas, pero las dos son FRAC 7. Prueba repetir y prueba rotar.'),
    h('div', { class: 'md-juego' },
      h('div', { class: 'md-juego-tablero' }, puntos, leyenda),
      h('div', { class: 'md-juego-panel' },
        h('p', { class: 'md-rotulo' }, 'Aplica'),
        h('div', { class: 'md-opciones' }, botones),
        mensaje,
        linea,
        reiniciar)),
    h('p', { class: 'md-nota' }, 'Es un juego para mostrar la idea: las cantidades no son datos reales.'));
}

// ---------- ¿Rotaste o no? ----------

function rotaste() {
  return seccion('rotaste', '¿Rotaste o no?',
    h('div', { class: 'md-preguntas' }, ROTASTE.map((q) => {
      const respuesta = h('p', { class: 'md-respuesta', 'aria-live': 'polite' });
      const responder = (dijo) => {
        respuesta.className = `md-respuesta ${dijo === q.rota ? 'md-bien' : 'md-mal'}`;
        vaciar(respuesta).append(icono(dijo === q.rota ? 'check' : 'cerrar'),
          h('span', null, h('strong', null, dijo === q.rota ? 'Bien. ' : 'No. '), q.explica));
      };
      return h('article', { class: 'md-pregunta' },
        h('div', { class: 'md-secuencia' },
          h('span', { class: 'md-paso' }, h('span', { class: 'md-paso-n' }, '1.ª aplicación'), q.marcas[0], h('span', { class: 'lista-moa' }, q.antes.map(codigo))),
          icono('flecha'),
          h('span', { class: 'md-paso' }, h('span', { class: 'md-paso-n' }, '2.ª aplicación'), q.marcas[1], h('span', { class: 'lista-moa' }, q.despues.map(codigo)))),
        h('div', { class: 'md-botones' },
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => responder(true) }, 'Sí rotó'),
          h('button', { type: 'button', class: 'boton boton-chico', onclick: () => responder(false) }, 'No rotó')),
        respuesta);
    })),
    h('p', null, h('a', { class: 'enlace-icono', href: ruta('trivia', { tipo: 'moa' }) }, 'Más preguntas en la Trivia', icono('flecha'))));
}

// ---------- Las tres siglas ----------

function tablaGrupos(s) {
  const conRiesgo = s.sistema === 'FRAC';
  const conAntes = s.sistema === 'HRAC';
  const titulos = ['Código', s.hace, 'Familia química', 'Ejemplos de ingrediente', conRiesgo ? 'Riesgo' : null].filter(Boolean);
  return h('div', { class: 'md-tabla' }, h('table', { class: 'tabla-simple' },
    h('thead', null, h('tr', null, titulos.map((t) => h('th', { scope: 'col' }, t)))),
    // Cada celda con un solo hijo: en el celular la fila se vuelve «título | valor» y cada hijo sería otra celda.
    h('tbody', null, s.grupos.map((g) => h('tr', null,
      h('td', { 'data-etiqueta': 'Código' }, h('div', null, codigo(g.codigo), conAntes ? h('span', { class: 'md-antes' }, `antes ${g.antes}`) : null)),
      h('td', { 'data-etiqueta': s.hace }, h('div', null, h('span', { class: 'md-que' }, g.que), h('span', { class: 'md-sitio' }, g.sitio))),
      h('td', { 'data-etiqueta': 'Familia química' }, g.familia),
      h('td', { 'data-etiqueta': 'Ejemplos' }, g.ejemplos),
      conRiesgo ? h('td', { 'data-etiqueta': 'Riesgo' }, g.riesgo) : null)))));
}

// Cuántos productos del catálogo tienen cada código de este comité (links al buscador con ese filtro).
function enCatalogo(cat, sistema) {
  const porFamilia = new Map();
  let n = 0;
  for (const p of cat.productos.values()) {
    if (p.noDisponible) continue;
    const propias = p.familias.filter((k) => k.startsWith(`${sistema} `));
    if (!propias.length) continue;
    n += 1;
    for (const k of propias) if (CODIGO_VALIDO.test(k)) porFamilia.set(k, (porFamilia.get(k) || 0) + 1);
  }
  if (!n) return null;
  const comunes = [...porFamilia].sort((a, b) => b[1] - a[1]).slice(0, 8);
  return h('div', { class: 'md-catalogo' },
    h('p', null, h('strong', null, plural(n, 'producto', 'productos')), ` con código ${sistema} en el catálogo. Toca un código para verlos:`),
    h('div', { class: 'md-familias' }, comunes.map(([k, c]) => h('a', {
      class: `${claseMoa(k)} md-familia`, href: ruta('buscar', { moa: k }), title: `Ver los ${plural(c, 'producto', 'productos')} ${k} en el buscador`,
    }, k, h('small', null, String(c))))));
}

function siglas(cat) {
  return seccion('siglas', 'Las tres siglas',
    h('div', { class: 'md-siglas' }, SIGLAS.map((s) => h('article', { class: `md-sigla md-sigla-${s.clase}`, id: `md-${s.clase}` },
      h('header', { class: 'md-sigla-cabeza' },
        dibujo(s.clase),
        h('div', null,
          h('h3', null, h('span', { class: 'md-sigla-nombre' }, s.sistema), s.para),
          h('p', null, `Contra ${s.contra}: ${s.ejemplos}`))),
      h('ul', { class: 'md-lectura' }, s.lectura.map((t) => h('li', null, t))),
      enCatalogo(cat, s.sistema),
      tecnico(
        h('p', null, `${s.nombre}: ${s.traduccion}. Comité técnico internacional formado por las empresas de agroquímicos junto a investigadores.`),
        h('ul', { class: 'md-lectura' }, s.tecnico.map((t) => h('li', null, t))),
        tablaGrupos(s))))),
    h('p', { class: 'md-fuente' }, 'Fuente: listas oficiales de ',
      h('a', { href: 'https://www.frac.info/', target: '_blank', rel: 'noopener' }, 'FRAC'), ', ',
      h('a', { href: 'https://irac-online.org/', target: '_blank', rel: 'noopener' }, 'IRAC'), ' y ',
      h('a', { href: 'https://hracglobal.com/', target: '_blank', rel: 'noopener' }, 'HRAC'),
      '. Ante una duda, manda la etiqueta y la lista vigente.'));
}

// ---------- Cuatro palabras, reglas, por qué importa, ejemplos ----------

function palabras() {
  return seccion('palabras', 'Cuatro palabras',
    h('div', { class: 'md-palabras' }, PALABRAS.map((p) => h('article', { class: 'md-palabra' },
      h('span', { class: 'md-palabra-ico' }, icono(p.icono)),
      h('h3', null, p.titulo),
      h('p', null, p.simple),
      h('p', { class: 'md-ejemplo' }, p.ejemplo),
      tecnico(h('p', null, p.tecnico))))));
}

function reglas() {
  return seccion('reglas', 'Cuatro reglas de oro',
    h('div', { class: 'md-reglas' }, REGLAS.map((r) => h('article', { class: 'md-regla' },
      h('span', { class: 'md-regla-ico' }, icono(r.icono)),
      h('h3', null, r.titulo),
      h('p', null, r.texto)))),
    h('details', { class: 'md-mas' }, h('summary', null, 'Más consejos para el campo'),
      h('ul', { class: 'md-mas-lista' }, MAS_REGLAS.map(([t, d]) => h('li', null, h('strong', null, t), h('span', null, d))))));
}

function importa() {
  return seccion('importa', 'Por qué importa',
    h('div', { class: 'md-importa' }, IMPORTA.map(([ico, t, d]) => h('div', { class: 'md-importa-item' },
      icono(ico), h('div', null, h('h3', null, t), h('p', null, d))))));
}

function ejemplos(cat) {
  // Un producto que trae dos ingredientes de códigos distintos (del catálogo).
  const dobles = disponibles(cat).filter((p) => p.ings.length === 2 && p.familias.length === 2 && p.ings.every((x) => x.ing.moa)).sort(masUsados);
  const mezcla = dobles.find((p) => p.familias.join(' + ') === 'FRAC 7 + FRAC 11') || dobles[0];
  return seccion('ejemplos', 'Ejemplos en el campo',
    h('div', { class: 'md-ejemplos' },
      EJEMPLOS.map((e) => h('article', { class: 'md-caso' },
        codigo(e.moa),
        h('h3', null, e.titulo),
        h('p', null, h('span', { class: 'md-rotulo md-mal' }, 'Qué pasa'), e.pasa),
        h('p', null, h('span', { class: 'md-rotulo md-bien' }, 'Qué conviene'), e.hacer))),
      mezcla ? h('article', { class: 'md-caso' },
        h('span', { class: 'lista-moa' }, mezcla.moa.map(codigo)),
        h('h3', null, 'Un producto, dos códigos'),
        h('p', null, h('a', { href: `#/producto/${mezcla.id}` }, mezcla.nombre), ` trae ${mezcla.ings.map((x) => x.ing.nombre.toLowerCase()).join(' y ')}.`),
        h('p', null, h('span', { class: 'md-rotulo md-bien' }, 'Qué conviene'), `Contarla como aplicación de los dos códigos: después, no repetir ${mezcla.moa.join(' ni ')}.`)) : null));
}

function enEsteSitio() {
  return seccion('sitio', 'Cómo usarlo en este sitio',
    h('div', { class: 'md-usos' },
      h('a', { class: 'md-uso', href: '#/buscar' }, icono('buscar'), h('strong', null, 'Buscador'),
        h('span', null, 'Cada producto con su código de color. Escribe «FRAC 11» para ver todos los de ese código.')),
      h('a', { class: 'md-uso', href: '#/mezclas' }, icono('frasco'), h('strong', null, 'Mezclas'),
        h('span', null, 'Qué se puede echar junto en el estanque y en qué orden.')),
      h('a', { class: 'md-uso', href: '#/plan' }, icono('calendario'), h('strong', null, 'Plan de aplicaciones'),
        h('span', null, 'Te avisa si repites un código en la mezcla o en la aplicación anterior.'))),
    h('p', { class: 'md-muestras' }, chipsMoa(['FRAC 11', 'IRAC 4A', 'HRAC 9']), chipsMoa(['HRAC 1'], new Map([['HRAC 1', ['HRAC A']]])),
      h('span', null, 'Azul FRAC, verde IRAC, tierra HRAC. Entre paréntesis, el código antiguo que trae la etiqueta. La etiqueta siempre manda.')));
}

export async function render(main, ctx) {
  const { cat } = ctx;
  main.append(h('div', { class: 'md' },
    portada(),
    idea(cat),
    juego(),
    siglas(cat),
    rotaste(),
    palabras(),
    reglas(),
    importa(),
    ejemplos(cat),
    enEsteSitio()));
}
