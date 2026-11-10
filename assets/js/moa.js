// Qué hacen los productos de cada grupo de modo de acción, en una frase corta (pedido de Cristóbal, 10-11-2026: «es muy
// importante que en las categorías de FRAC 3 o cualquiera que sea pongas esa pequeña descripción de qué hacen los
// productos»). Va en el título de cada grupo del buscador y en las tablas del inicio.
// Escrito a mano desde las listas oficiales (FRAC Code List, IRAC MoA Classification, HRAC MoA Classification 2020),
// no desde la base. Están todos los grupos que hay en el catálogo (10-11-2026). Si llega un código nuevo sin frase, el
// sitio no muestra descripción (nunca se inventa): agregarlo aquí desde la lista oficial.

const MULTISITIO = 'Ataca muchos puntos a la vez: casi no genera resistencia';
const DEFENSAS = 'Activa las defensas de la planta';

export const QUE_HACE = {
  // Fungicidas (y bactericidas)
  'FRAC 1': 'Frena la división de sus células',
  'FRAC 2': 'Le altera las señales internas',
  'FRAC 3': 'Frena la fabricación de su membrana',
  'FRAC 4': 'Frena la fabricación de su material genético; contra mildiú y Phytophthora',
  'FRAC 5': 'Frena la fabricación de su membrana en otro punto',
  'FRAC 7': 'Le corta la respiración',
  'FRAC 8': 'Frena la fabricación de su material genético; contra oídio',
  'FRAC 9': 'Frena la fabricación de un aminoácido',
  'FRAC 11': 'Le corta la respiración en otro punto',
  'FRAC 12': 'Le altera las señales internas',
  'FRAC 13': 'Le altera las señales internas; contra oídio',
  'FRAC 17': 'Frena la fabricación de su membrana en otro punto',
  'FRAC 20': 'Frena la división de sus células; contra Rhizoctonia',
  'FRAC 21': 'Le corta la respiración en otro punto (sitio Qi)',
  'FRAC 22': 'Frena la división de sus células; contra mildiú',
  'FRAC 24': 'Frena la fabricación de sus proteínas (antibiótico)',
  'FRAC 25': 'Frena la fabricación de las proteínas de la bacteria (antibiótico)',
  'FRAC 27': 'Ataca al mildiú; modo de acción no del todo conocido',
  'FRAC 28': 'Le daña la membrana; contra mildiú y Pythium',
  'FRAC 29': 'Le quita la energía (desacopla su respiración)',
  'FRAC 40': 'Frena la fabricación de su pared; contra mildiú',
  'FRAC 41': 'Frena la fabricación de las proteínas de la bacteria (antibiótico)',
  'FRAC 43': 'Desarma el esqueleto de sus células; contra mildiú',
  'FRAC 45': 'Le corta la respiración en otro punto; contra mildiú',
  'FRAC 49': 'Frena el transporte de grasas dentro de sus células; contra mildiú',
  'FRAC 50': 'Desordena el esqueleto de sus células; contra oídio',
  'FRAC M01': MULTISITIO,
  'FRAC M02': MULTISITIO,
  'FRAC M03': MULTISITIO,
  'FRAC M04': MULTISITIO,
  'FRAC M05': MULTISITIO,
  'FRAC M07': MULTISITIO,
  'FRAC BM01': 'Extracto de planta: daña al hongo de varias formas',
  'FRAC P01': DEFENSAS,
  'FRAC P05': DEFENSAS,
  'FRAC P07': DEFENSAS,
  'FRAC U13': 'Ataca al oídio; modo de acción no conocido',
  'FRAC NC': 'Sin clasificar por FRAC',
  // Insecticidas y acaricidas
  'IRAC 1': 'Bloquea una enzima de sus nervios',
  'IRAC 2': 'Le quita un freno a sus nervios: quedan sobreexcitados',
  'IRAC 3': 'Deja sus nervios disparando sin parar',
  'IRAC 4': 'Imita la señal de los nervios y los satura',
  'IRAC 5': 'Sobreexcita sus nervios',
  'IRAC 6': 'Lo paraliza',
  'IRAC 7': 'Imita una hormona juvenil: no llega a adulto',
  'IRAC 9': 'Deja de alimentarse: le afecta los órganos de los sentidos',
  'IRAC 10': 'Frena el desarrollo de huevos y ninfas de ácaros',
  'IRAC 13': 'Le quita la energía (desacopla su respiración)',
  'IRAC 15': 'No deja que forme su nueva cubierta al mudar',
  'IRAC 18': 'Lo obliga a mudar antes de tiempo; contra larvas de polillas',
  'IRAC 20': 'Le corta la respiración; contra ácaros',
  'IRAC 21': 'Le corta la respiración en otro punto; contra ácaros',
  'IRAC 22': 'Bloquea sus nervios: queda paralizado',
  'IRAC 23': 'Frena la fabricación de sus grasas',
  'IRAC 25': 'Le corta la respiración en un tercer punto; contra ácaros',
  'IRAC 28': 'Contrae sus músculos sin control y deja de comer',
  'IRAC 29': 'Deja de alimentarse',
  'IRAC 30': 'Le quita un freno a sus nervios en otro punto',
  'IRAC 31': 'Virus que enferma a la larva de la polilla',
  'IRAC UN': 'Modo de acción no conocido o no confirmado',
  'IRAC N-UN': 'Nematicida de modo de acción no conocido',
  // Herbicidas
  'HRAC 1': 'Frena la fabricación de sus grasas; solo afecta a gramíneas',
  'HRAC 2': 'Frena la fabricación de aminoácidos',
  'HRAC 3': 'Frena la división de sus células: la raíz no crece',
  'HRAC 4': 'Imita una hormona de crecimiento: la maleza crece deformada',
  'HRAC 5': 'Frena la fotosíntesis',
  'HRAC 6': 'Frena la fotosíntesis en otro punto',
  'HRAC 9': 'Frena la fabricación de aminoácidos en otro punto',
  'HRAC 10': 'Frena una enzima clave para usar el nitrógeno',
  'HRAC 12': 'Blanquea la maleza: frena sus pigmentos protectores',
  'HRAC 13': 'Blanquea la maleza: frena sus pigmentos en otro punto',
  'HRAC 14': 'Rompe sus membranas con la luz del sol',
  'HRAC 15': 'Frena el crecimiento de la plántula recién nacida',
  'HRAC 18': 'Frena la fabricación de una vitamina (ácido fólico)',
  'HRAC 22': 'Quema el tejido verde en horas',
  'HRAC 27': 'Blanquea la maleza: frena sus pigmentos en un tercer punto',
  'HRAC 29': 'Frena la fabricación de su pared celular',
  'HRAC 32': 'Blanquea la maleza: frena sus pigmentos en un cuarto punto',
};

// Códigos que algunas etiquetas escriben raro y que son el mismo grupo («FRAC F-49» = 49, «HRAC I18» = 18…).
const ALIAS = { 'FRAC F-49': 'FRAC 49', 'HRAC 29 L': 'HRAC 29', 'HRAC I18': 'HRAC 18' };

// Familia: en IRAC manda el número («IRAC 4A» es el grupo 4).
const familia = (k) => String(k || '').replace(/^(IRAC \d+)[A-Z]$/, '$1');

export function queHace(clave) {
  const f = familia(clave);
  return QUE_HACE[f] || QUE_HACE[ALIAS[f]] || null;
}
