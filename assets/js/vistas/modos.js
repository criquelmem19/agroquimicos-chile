// Modos de acción: qué son FRAC, IRAC y HRAC y por qué importan (pedido de Cristóbal, 01-11-2026: «que lo entienda un
// agricultor sin estudios y que un ingeniero esté de acuerdo»). Cada idea va en palabras simples y, aparte, en términos
// técnicos. Se abre sola la primera vez que alguien entra al sitio (app.js).
// Los textos explican las clasificaciones oficiales (FRAC Code List, IRAC MoA Classification, HRAC MoA Classification);
// los productos y las cantidades de ejemplo salen del catálogo, nunca inventados.
import { h, icono, ruta, plural, claseMoa, chipsMoa } from '../ui.js';

const ESENCIAL = [
  'Cada producto ataca a la plaga de una forma. Esa forma se llama modo de acción.',
  'Los productos que atacan de la misma forma llevan el mismo código, aunque sean de otra marca o tengan otro ingrediente.',
  'Si se usa siempre el mismo código, la plaga se vuelve resistente y el producto deja de funcionar.',
  'Por eso se rota el código, no la marca, y se respetan la dosis y el máximo de aplicaciones de la etiqueta.',
];

const PALABRAS = [
  {
    titulo: 'Ingrediente activo',
    simple: 'Es la sustancia que hace el efecto. La marca es el nombre comercial; el ingrediente es lo que va adentro.',
    ejemplo: 'Muchas marcas distintas llevan tebuconazol. Para el hongo, todas son tebuconazol.',
    tecnico: 'La concentración (g/L o %) y la formulación (SC, WG, EC…) cambian de un producto a otro; el ingrediente y su sitio de acción definen el código.',
  },
  {
    titulo: 'Modo de acción',
    simple: 'Es el punto del insecto, del hongo o de la maleza donde actúa el producto: lo que deja de funcionar y por eso muere.',
    ejemplo: 'Los piretroides paralizan los nervios del insecto. Las estrobilurinas le cortan la respiración al hongo. El glifosato frena una enzima que la maleza necesita para crecer.',
    tecnico: 'Es el sitio de acción bioquímico: el canal de sodio en los piretroides (IRAC 3A), el complejo III de la respiración mitocondrial en las estrobilurinas (FRAC 11) y la enzima EPSPS en el glifosato (HRAC 9).',
  },
  {
    titulo: 'Resistencia',
    simple: 'Es cuando una plaga que antes moría con un producto ya no muere a la dosis de la etiqueta. No es que «se acostumbre»: sobreviven y se multiplican los pocos que ya lo aguantaban.',
    ejemplo: 'Un fungicida que hace unos años controlaba bien la botrytis y hoy, aplicado igual, ya no la frena.',
    tecnico: 'Es selección: cada aplicación elimina a los individuos sensibles y sube la frecuencia de los que traen resistencia (un cambio en el sitio de acción, más capacidad de degradar el producto o menos absorción). Es heredable.',
  },
  {
    titulo: 'Resistencia cruzada',
    simple: 'Si la plaga aguanta un producto, en general aguanta todos los de su mismo código, aunque sean de otra marca o de otro ingrediente.',
    ejemplo: 'Un oídio resistente a la azoxistrobina también resiste a la piraclostrobina y a la trifloxistrobina: las tres son FRAC 11.',
    tecnico: 'Ocurre porque comparten el sitio de acción. En algunos grupos es parcial (por ejemplo, entre algunos SDHI, FRAC 7), pero los comités recomiendan planificar como si todo el grupo fuera uno solo.',
  },
];

// Dibujo de la selección: 30 individuos por etapa. Las cantidades son de ejemplo, no datos.
// r: cuántos aguantan el producto; muertos: si los sensibles ya murieron.
const ETAPAS = [
  { titulo: '1. Antes de aplicar', texto: 'Entre muchos insectos, hongos o malezas hay unos pocos que, de nacimiento, aguantan el producto.', r: 2 },
  { titulo: '2. Se aplica el producto', texto: 'Mueren los sensibles. Quedan vivos los pocos que aguantan.', r: 2, muertos: true },
  { titulo: 'Si se repite el mismo código', texto: 'Los que aguantaron se multiplican. Después de varias aplicaciones casi todos aguantan y el producto ya no controla.', r: 24 },
  { titulo: 'Si se cambia de código', texto: 'El otro modo de acción mata también a los que aguantaban el primero. Los resistentes no aumentan y los dos productos siguen sirviendo.', r: 2 },
];
// Posiciones repartidas para que los que aguantan no queden todos juntos.
const ORDEN_PUNTOS = [7, 22, 13, 2, 27, 18, 10, 25, 4, 15, 29, 0, 20, 9, 24, 5, 16, 28, 11, 1, 21, 14, 26, 3, 19, 8, 23, 12, 17, 6];

const IMPORTA = [
  ['El producto deja de servir', 'Se aplica y la plaga sigue. Se pierde rendimiento o calidad de la fruta.'],
  ['Sube el costo', 'Cuando el control falla hay que volver a aplicar: más producto, más horas de tractor, más petróleo y más mano de obra.'],
  ['Más riesgo de residuos', 'Repetir aplicaciones para compensar, o tener que aplicar más cerca de la cosecha, aumenta el riesgo de pasar el límite máximo de residuos (LMR). En fruta de exportación eso es rechazo en destino.'],
  ['Se pierde para todos', 'La resistencia viaja con la plaga a los campos vecinos, y salen muy pocos modos de acción nuevos. Cada código que se pierde es una herramienta menos para todo el valle.'],
];

// Grupos frecuentes de cada comité: código actual, letra antigua (HRAC), qué hace en palabras simples, sitio de acción,
// familia química, ingredientes de ejemplo y, en FRAC, riesgo de resistencia según la FRAC Code List.
const SIGLAS = [
  {
    sistema: 'FRAC', clase: 'frac', para: 'Fungicidas', contra: 'Hongos: botrytis, oídio, venturia, mildiú, pudriciones',
    nombre: 'Fungicide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a fungicidas',
    que: 'Ordena los fungicidas (y algunos bactericidas) según el punto del hongo donde actúan.',
    lectura: [
      'Un número por modo de acción: 1, 3, 7, 11…',
      'Los códigos con M son multisitio: atacan muchos puntos del hongo a la vez. Es muy difícil que el hongo se haga resistente a ellos, por eso se usan como compañeros en mezclas y rotaciones.',
      'Cada grupo tiene un riesgo de resistencia: bajo, medio o alto. Con los de riesgo alto hay que ser más cuidadoso.',
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
    sistema: 'IRAC', clase: 'irac', para: 'Insecticidas y acaricidas', contra: 'Insectos, ácaros y nematodos: pulgones, polillas, trips, chanchitos blancos, arañitas',
    nombre: 'Insecticide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a insecticidas',
    que: 'Ordena los insecticidas, acaricidas y nematicidas según el punto del insecto o del ácaro donde actúan.',
    lectura: [
      'Un número por modo de acción y, a veces, una letra: 1A, 3A, 4A…',
      'El número es el que manda. La letra solo separa familias químicas que atacan el mismo punto: 4A y 4C son el mismo modo de acción.',
      'Ejemplo clave: 1A (carbamatos) y 1B (organofosforados) son químicos distintos, pero los dos atacan la misma enzima de los nervios. Pasar de 1A a 1B no es rotar.',
      'Se trabaja por ventanas: un mismo código durante una generación de la plaga (unos 30 días) y otro código en la generación siguiente.',
      'UN quiere decir que el modo de acción no se conoce o no está confirmado.',
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
    sistema: 'HRAC', clase: 'hrac', para: 'Herbicidas', contra: 'Malezas: ballica, avenilla, pasto pinto, yuyo, correhuela',
    nombre: 'Herbicide Resistance Action Committee', traduccion: 'Comité de acción contra la resistencia a herbicidas',
    que: 'Ordena los herbicidas según el punto de la maleza donde actúan.',
    lectura: [
      'Desde 2020 usa números (1, 2, 4, 9…). Antes usaba letras y muchas etiquetas en Chile todavía las traen: A = 1, B = 2, C1 y C2 = 5, E = 14, G = 9, H = 10, K3 = 15, O = 4, D = 22.',
      'En este sitio se muestran así: HRAC 1 (A). El número es el código actual y, entre paréntesis, la letra que trae la etiqueta.',
      'En malezas la resistencia aparece más lento que en insectos u hongos (muchas tienen una generación al año), pero cuando la semilla resistente queda en el suelo, el problema dura años.',
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

const REGLAS = [
  ['Rota códigos, no marcas', 'Antes de elegir un producto, mira su código. Dos marcas con el mismo código son el mismo golpe para la plaga.'],
  ['No repitas el mismo código seguido', 'En hongos y malezas, cambia de código entre aplicaciones seguidas contra la misma plaga, salvo que la etiqueta permita repetir. En insectos y ácaros, usa un código por ventana (una generación, unos 30 días) y cambia en la siguiente.'],
  ['Mezcla códigos distintos', 'Una mezcla de dos códigos (por ejemplo, un fungicida de riesgo alto con un multisitio M) protege a los dos. Cada producto de la mezcla tiene que controlar la plaga por sí solo y a su dosis de etiqueta.'],
  ['Usa la dosis de la etiqueta', 'Una dosis más baja deja vivos a los que aguantan un poco y apura la resistencia. Una más alta no está permitida y sube el riesgo de residuos.'],
  ['Respeta el máximo por temporada', 'Cuando la etiqueta dice «máximo 2 aplicaciones por temporada», también está cuidando el código. Un producto que trae dos ingredientes cuenta para los dos códigos.'],
  ['Aplica a tiempo y bien', 'Con la plaga chica o la enfermedad recién partiendo, con buen mojamiento y el equipo calibrado. Una aplicación mala deja sobrevivientes.'],
  ['Suma control sin químicos', 'Monitoreo y umbrales, enemigos naturales, poda y ventilación, rotación de cultivos y control mecánico de malezas. Lo que se controla sin químicos no selecciona resistencia.'],
  ['Si un producto falla, no lo repitas', 'Puede ser resistencia. Cambia de código, revisa cómo se aplicó y avisa a tu asesor o a la empresa.'],
];

const ROTACION = [
  { titulo: 'Así no', bien: false, pasos: [['Marca A', 'FRAC 7'], ['Marca B', 'FRAC 7'], ['Marca C', 'FRAC 7']], texto: 'Tres marcas, un solo código: el mismo golpe tres veces seguidas.' },
  { titulo: 'Así sí', bien: true, pasos: [['Marca A', 'FRAC 7'], ['Marca D', 'FRAC 12'], ['Marca E', 'FRAC 9']], texto: 'Tres códigos distintos: cada aplicación ataca un punto distinto del hongo.' },
];

const EJEMPLOS = [
  {
    moa: 'FRAC 7', titulo: 'Botrytis en uva de mesa',
    pasa: 'En una temporada lluviosa se aplican tres productos contra botrytis, de marcas distintas pero los tres FRAC 7. Para el hongo es el mismo golpe tres veces. La botrytis es de las enfermedades que más rápido se hacen resistentes.',
    hacer: 'Que cada aplicación seguida sea de un código distinto, por ejemplo FRAC 7, luego 12 y luego 9, siempre que la etiqueta los autorice para uva y botrytis, y sin pasar el máximo por temporada de cada uno.',
  },
  {
    moa: 'IRAC 6', titulo: 'Arañita roja en manzano',
    pasa: 'La arañita tiene muchas generaciones en una temporada. Si todas las aplicaciones son de abamectina (IRAC 6), en pocas temporadas puede dejar de responder.',
    hacer: 'Un código por ventana y otro en la siguiente, por ejemplo IRAC 6, luego 23 y luego 10, siempre que la etiqueta los autorice para ese cultivo. Cuidar a los ácaros depredadores también ayuda.',
  },
  {
    moa: 'HRAC 9', titulo: 'Ballica bajo la hilera',
    pasa: 'Por años se controla la maleza bajo la hilera del huerto o la viña solo con glifosato (HRAC 9). La ballica que sobrevive suelta semilla y con el tiempo ya no muere. En Chile hay casos documentados de ballica resistente a glifosato.',
    hacer: 'Alternar o mezclar con herbicidas de otro código autorizados para ese uso, sumar control mecánico o cubierta vegetal, y no dejar que la maleza que sobrevive suelte semilla.',
  },
];

// Códigos bien escritos (algunas etiquetas traen textos raros como «FRAC E3 GRUPO 2»): solo esos se muestran como ejemplo.
const CODIGO_VALIDO = /^(FRAC|IRAC|HRAC) (M\d{2}|\d{1,2}[A-Z]?|UN)$/;
// Nombres sacados del nombre de archivo («20241202 Botristop», «. Biocap…»): no sirven de ejemplo.
const nombreRaro = (p) => /^\W|^\d{6,}/.test(p.nombre);
const disponibles = (cat) => [...cat.productos.values()].filter((p) => !p.noDisponible && !nombreRaro(p));
const masUsados = (a, b) => (b.nLineas || 0) - (a.nLineas || 0);

function codigo(k) {
  return h('span', { class: claseMoa(k) }, k);
}

function seccion(id, titulo, ...hijos) {
  return h('section', { class: 'md-seccion', id: `md-${id}`, 'aria-labelledby': `md-${id}-t` },
    h('h2', { id: `md-${id}-t` }, titulo), hijos);
}

function irA(id) {
  const el = document.getElementById(`md-${id}`);
  if (el) el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
}

function portada() {
  return h('header', { class: 'md-cabeza' },
    h('div', { class: 'md-cabeza-texto' },
      h('h1', null, 'FRAC, IRAC y HRAC'),
      h('p', { class: 'md-bajada' }, 'Son los códigos que ordenan los agroquímicos según la forma en que matan al hongo, al insecto o a la maleza. Saber leerlos es la mejor manera de que un producto siga funcionando año tras año.'),
      h('div', { class: 'acciones' },
        h('a', { class: 'boton boton-primario', href: '#/' }, 'Ir a la tabla de productos'),
        h('a', { class: 'boton', href: ruta('trivia', { tipo: 'moa' }) }, icono('trofeo'), 'Ponte a prueba'))),
    h('div', { class: 'md-bloques' }, SIGLAS.map((s) => h('button', {
      type: 'button', class: `md-bloque md-bloque-${s.clase}`, onclick: () => irA(s.clase),
      'aria-label': `${s.sistema}: ${s.para}. Ir a la explicación`,
    },
    h('span', { class: 'md-bloque-sigla' }, s.sistema),
    h('span', { class: 'md-bloque-para' }, s.para),
    h('span', { class: 'md-bloque-contra' }, s.contra),
    icono('flecha')))));
}

function esencial() {
  return h('section', { class: 'md-esencial', 'aria-label': 'Lo esencial' },
    h('h2', null, 'Lo esencial'),
    h('ol', null, ESENCIAL.map((t) => h('li', null, t))));
}

function palabras() {
  return seccion('palabras', 'Cuatro palabras para entender todo',
    h('div', { class: 'md-palabras' }, PALABRAS.map((p) => h('article', { class: 'md-palabra' },
      h('h3', null, p.titulo),
      h('p', null, p.simple),
      h('p', { class: 'md-ejemplo' }, h('span', { class: 'md-rotulo' }, 'Ejemplo'), p.ejemplo),
      h('p', { class: 'md-tecnico' }, h('span', { class: 'md-rotulo' }, 'En términos técnicos'), p.tecnico)))));
}

function puntos(etapa) {
  const aguantan = new Set(ORDEN_PUNTOS.slice(0, etapa.r));
  return h('div', { class: 'md-puntos', 'aria-hidden': 'true' }, ORDEN_PUNTOS.map((_, i) => {
    const clase = aguantan.has(i) ? 'aguanta' : etapa.muertos ? 'muerto' : 'sensible';
    return h('span', { class: `md-punto md-${clase}` });
  }));
}

function resistencia() {
  return seccion('resistencia', 'Cómo aparece la resistencia',
    h('p', { class: 'md-intro' }, 'Sirve igual para un insecto, un hongo o una maleza. Cada punto es un individuo.'),
    h('div', { class: 'md-etapas' }, ETAPAS.map((e) => h('figure', { class: 'md-etapa' },
      puntos(e),
      h('figcaption', null, h('strong', null, e.titulo), h('span', null, e.texto))))),
    h('div', { class: 'md-leyenda' },
      h('span', null, h('i', { class: 'md-punto md-sensible' }), 'Muere con el producto'),
      h('span', null, h('i', { class: 'md-punto md-aguanta' }), 'Aguanta el producto'),
      h('span', null, h('i', { class: 'md-punto md-muerto' }), 'Muerto'),
      h('span', { class: 'tenue' }, 'Dibujo de ejemplo: las cantidades no son datos reales')));
}

function importa() {
  return seccion('importa', 'Por qué importa',
    h('div', { class: 'md-importa' }, IMPORTA.map(([t, d]) => h('div', null, h('h3', null, t), h('p', null, d)))));
}

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

// Cuántos productos del catálogo tienen cada código de este comité (links a la tabla con ese filtro).
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
    h('p', null, 'En este catálogo hay ', h('strong', null, plural(n, 'producto', 'productos')), ` con código ${sistema}. Los códigos con más productos:`),
    h('div', { class: 'md-familias' }, comunes.map(([k, c]) => h('a', {
      class: `${claseMoa(k)} md-familia`, href: ruta('', { moa: k }), title: `Ver los ${plural(c, 'producto', 'productos')} ${k} en la tabla`,
    }, k, h('small', null, String(c))))));
}

function siglas(cat) {
  return seccion('siglas', 'Las tres siglas',
    h('p', { class: 'md-intro' }, 'Son comités técnicos internacionales formados por las empresas de agroquímicos, que trabajan junto a investigadores. Cada uno ordena los ingredientes activos por modo de acción y publica recomendaciones para evitar la resistencia. Muchas etiquetas en Chile indican el código, por lo general en el párrafo de manejo de resistencia.'),
    SIGLAS.map((s) => h('article', { class: `md-sigla md-sigla-${s.clase}`, id: `md-${s.clase}` },
      h('header', { class: 'md-sigla-cabeza' },
        h('span', { class: `${claseMoa(s.sistema)} md-sigla-codigo` }, s.sistema),
        h('div', null,
          h('h3', null, s.para),
          h('p', { class: 'tenue' }, `${s.nombre}: ${s.traduccion}`))),
      h('p', null, s.que),
      h('ul', { class: 'md-lectura' }, s.lectura.map((t) => h('li', null, t))),
      tablaGrupos(s),
      enCatalogo(cat, s.sistema))),
    h('p', { class: 'md-fuente' }, 'Fuente: listas oficiales de clasificación de ',
      h('a', { href: 'https://www.frac.info/', target: '_blank', rel: 'noopener' }, 'FRAC'), ', ',
      h('a', { href: 'https://irac-online.org/', target: '_blank', rel: 'noopener' }, 'IRAC'), ' y ',
      h('a', { href: 'https://hracglobal.com/', target: '_blank', rel: 'noopener' }, 'HRAC'),
      '. Las listas se actualizan: ante una duda, manda la etiqueta y la lista vigente.'));
}

function campo() {
  return seccion('campo', 'Cómo usar los códigos en el campo',
    h('ol', { class: 'md-reglas' }, REGLAS.map(([t, d]) => h('li', null, h('h3', null, t), h('p', null, d)))),
    h('div', { class: 'md-rotacion' }, ROTACION.map((r) => h('div', { class: 'md-rotacion-fila' },
      h('strong', { class: `md-rotacion-titulo ${r.bien ? 'md-bien' : 'md-mal'}` }, icono(r.bien ? 'check' : 'cerrar'), r.titulo),
      h('ol', { class: 'md-pasos' }, r.pasos.map(([marca, k], i) => h('li', null,
        i ? icono('flecha') : null,
        h('span', { class: 'md-paso' }, h('span', { class: 'md-paso-n' }, `Aplicación ${i + 1}`), marca, codigo(k))))),
      h('p', null, r.texto)))));
}

// Dos productos de marcas e ingredientes distintos con el mismo código (del catálogo).
function dosMarcas(cat) {
  for (const k of ['FRAC 3', 'FRAC 11', 'IRAC 4', 'IRAC 3', 'HRAC 2']) {
    const solos = disponibles(cat).filter((p) => p.ings.length === 1 && p.familias.length === 1 && p.familias[0] === k).sort(masUsados);
    const a = solos[0];
    const b = a && solos.find((p) => p.ings[0].ing.nombre !== a.ings[0].ing.nombre && p.marca !== a.marca);
    if (a && b) return { k, a, b };
  }
  return null;
}

// Un producto que trae dos ingredientes de códigos distintos (del catálogo).
function mezclaDeFabrica(cat) {
  const dobles = disponibles(cat).filter((p) => p.ings.length === 2 && p.familias.length === 2 && p.ings.every((x) => x.ing.moa)).sort(masUsados);
  return dobles.find((p) => p.familias.join(' + ') === 'FRAC 7 + FRAC 11') || dobles[0] || null;
}

const enlaceProducto = (p) => h('a', { href: `#/producto/${p.id}` }, p.nombre);
const ingrediente = (x) => [x.ing.nombre.toLowerCase(), ' ', codigo(x.ing.moa)];

function ejemplos(cat) {
  const dos = dosMarcas(cat);
  const mezcla = mezclaDeFabrica(cat);
  const reales = [];
  if (dos) {
    reales.push(h('article', { class: 'md-real' },
      h('h3', null, 'Dos marcas, un solo código'),
      h('p', null, enlaceProducto(dos.a), ` (${dos.a.marca || 'sin empresa'}) lleva `, ingrediente(dos.a.ings[0]), '. ',
        enlaceProducto(dos.b), ` (${dos.b.marca || 'sin empresa'}) lleva `, ingrediente(dos.b.ings[0]), '.'),
      h('p', null, `Son marcas e ingredientes distintos, pero el mismo código ${dos.k}. Si la plaga se hace resistente a uno, en general también al otro: alternar entre ellos no es rotar.`)));
  }
  if (mezcla) {
    const [x, y] = mezcla.ings;
    reales.push(h('article', { class: 'md-real' },
      h('h3', null, 'Un producto, dos códigos'),
      h('p', null, enlaceProducto(mezcla), ' trae ', ingrediente(x), ' y ', ingrediente(y), '.'),
      h('p', null, `Cada aplicación cuenta para los dos códigos. Si después se aplica otro producto ${y.ing.moa}, se está repitiendo el ${y.ing.moa}.`)));
  }
  return seccion('ejemplos', 'Ejemplos',
    h('div', { class: 'md-ejemplos' }, EJEMPLOS.map((e) => h('article', { class: 'md-caso' },
      codigo(e.moa),
      h('h3', null, e.titulo),
      h('p', null, h('span', { class: 'md-rotulo' }, 'Qué pasa'), e.pasa),
      h('p', null, h('span', { class: 'md-rotulo' }, 'Qué conviene'), e.hacer)))),
    reales.length ? [h('h3', { class: 'md-subtitulo' }, 'En este catálogo'), h('div', { class: 'md-reales' }, reales)] : null);
}

function enEsteSitio() {
  return seccion('sitio', 'Cómo aparecen en este sitio',
    h('ul', { class: 'md-sitio-lista' },
      h('li', null, h('span', { class: 'md-muestras' }, chipsMoa(['FRAC 11', 'IRAC 4A', 'HRAC 9'])),
        'Cada producto muestra su código con el color de su comité: azul para FRAC, verde para IRAC y tierra para HRAC.'),
      h('li', null, h('span', { class: 'md-muestras' }, chipsMoa(['HRAC 1'], new Map([['HRAC 1', ['HRAC A']]]))),
        'El número es el código actual y, entre paréntesis, el antiguo que trae la etiqueta.'),
      h('li', null, 'La tabla de productos viene agrupada por código. Para ver uno solo, escribe por ejemplo «FRAC 11» en el buscador o usa «Más filtros», «Modo de acción».'),
      h('li', null, 'El plan de aplicaciones avisa si repites un código en la misma mezcla, en la aplicación anterior o antes en el plan.'),
      h('li', null, 'La etiqueta manda: dosis, carencia, intervalo y máximo de aplicaciones salen siempre de ella. Se abre desde la ficha de cada producto.')),
    h('div', { class: 'acciones md-final' },
      h('a', { class: 'boton boton-primario', href: '#/' }, 'Ir a la tabla de productos'),
      h('a', { class: 'boton', href: ruta('plan') }, icono('calendario'), 'Plan de aplicaciones'),
      h('a', { class: 'boton', href: ruta('trivia', { tipo: 'moa' }) }, icono('trofeo'), 'Ponte a prueba')));
}

export async function render(main, ctx) {
  const { cat } = ctx;
  main.append(h('div', { class: 'md' },
    portada(),
    esencial(),
    palabras(),
    resistencia(),
    importa(),
    siglas(cat),
    campo(),
    ejemplos(cat),
    enEsteSitio()));
}
