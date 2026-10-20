// "Estado de los datos": explica en simple cuánto está completo y revisado.
import { estadoDatos } from '../db.js';
import { h, num, porcentaje, fecha, vaciar, cargando } from '../ui.js';

function indicador({ titulo, valor, total, texto, invertido = false }) {
  const pct = porcentaje(valor, total);
  // invertido: un número alto es malo (por ejemplo, líneas con confianza baja)
  const nivel = invertido ? (pct > 20 ? 'baja' : pct > 5 ? 'media' : '') : (pct < 50 ? 'baja' : pct < 85 ? 'media' : '');
  return h('article', { class: 'indicador' },
    h('div', { class: 'indicador-cabeza' },
      h('strong', null, titulo),
      h('span', { class: 'indicador-cifra' }, `${num(pct)}%`)),
    h('div', {
      class: `barra ${nivel}`, role: 'img', 'aria-label': `${num(pct)} por ciento`,
    }, h('span', { style: `width:${Math.max(pct, pct > 0 ? 1.5 : 0)}%` })),
    h('p', null, h('strong', null, `${num(valor)} de ${num(total)}`), ` ${texto}`));
}

export async function render(main, ctx) {
  main.append(
    h('h1', null, 'Estado de los datos'),
    h('p', { class: 'bajada' }, 'Los datos vienen de etiquetas y hojas de seguridad del SAG, leídas por un programa automático. Aquí está, sin adornos, cuánto está completo y cuánto revisó una persona.'));
  const zona = h('div', null, cargando('Calculando…'));
  main.append(zona);

  const e = await estadoDatos();
  if (!ctx.vigente()) return;
  vaciar(zona);
  if (!e) {
    zona.append(h('p', { class: 'nota nota-alerta' }, 'No se pudieron calcular los indicadores.'));
    return;
  }

  const L = e.lineas;
  const pctCarencia = porcentaje(e.con_carencia, L);
  const avisoCarencia = pctCarencia < 80
    ? h('div', { class: 'nota nota-peligro' },
      h('p', null, h('strong', null, pctCarencia < 50 ? 'Lo más importante: la carencia está muy incompleta. ' : 'Ojo: la carencia todavía está incompleta. '),
        `Solo ${num(e.con_carencia)} de ${num(L)} líneas de uso (${num(pctCarencia)}%) tienen la carencia en los datos. `,
        'Suele estar fuera del cuadro de dosis de la etiqueta y se está completando a partir de los mismos PDF.'),
      h('p', null, 'Toda línea sin carencia dice «Sin dato, verificar etiqueta» y trae el link al PDF. En fruta de exportación, un error de carencia puede significar rechazo en destino.'))
    : h('div', { class: 'nota nota-alerta' },
      h('p', null, h('strong', null, `La carencia está en ${num(pctCarencia)}% de las líneas. `),
        'Fue extraída automáticamente con su cita de la etiqueta: revísala en el PDF antes de decidir. Las que faltan dicen «Sin dato, verificar etiqueta».'));
  zona.append(
    avisoCarencia,

    h('h2', { class: 'titulo-seccion' }, 'Completitud por dato', h('span', { class: 'contador' }, `(sobre ${num(L)} líneas de uso)`)),
    h('div', { class: 'indicadores' },
      indicador({ titulo: 'Carencia (días a cosecha)', valor: e.con_carencia, total: L,
        texto: `líneas tienen carencia: ${num(e.carencia_dias)} con días y ${num(e.carencia_no_aplica)} donde la etiqueta dice que no aplica.` }),
      indicador({ titulo: 'Dosis', valor: e.con_dosis, total: L,
        texto: 'líneas tienen la dosis interpretada. El sitio muestra siempre el texto tal como viene en la etiqueta.' }),
      indicador({ titulo: 'Mojamiento (L/ha)', valor: e.con_mojamiento, total: L,
        texto: 'líneas tienen volumen de agua por hectárea.' }),
      indicador({ titulo: 'Método de aplicación', valor: e.con_metodo, total: L,
        texto: 'líneas indican cómo aplicar (foliar, al suelo, etc.).' }),
      indicador({ titulo: 'Intervalo entre aplicaciones', valor: e.con_intervalo, total: L,
        texto: 'líneas indican cada cuántos días repetir.' }),
      indicador({ titulo: 'Revisado por una persona', valor: e.aprobadas, total: L,
        texto: 'líneas fueron comparadas con la etiqueta por una persona y aparecen como «Revisado». El resto dice «Extraído automáticamente».' }),
      indicador({ titulo: 'Con alerta de confianza baja', valor: e.confianza_baja, total: L, invertido: true,
        texto: `líneas tienen un puntaje de confianza bajo 0,80 y se muestran con alerta. Promedio: ${num(e.confianza_promedio)}.` }),
      indicador({ titulo: 'Productos con etiqueta PDF', valor: e.productos_con_pdf, total: e.productos,
        texto: 'productos tienen su PDF disponible en el sistema.' })),

    h('h2', { class: 'titulo-seccion' }, 'Cómo leer el sitio'),
    h('div', { class: 'tarjeta seguridad' }, h('dl', null,
      [
        ['Revisado', 'Una persona comparó esa línea con la etiqueta oficial.'],
        ['Extraído automáticamente', 'Lo leyó un programa desde el PDF. Nadie lo ha revisado todavía: úsalo como guía y confirma en la etiqueta.'],
        ['Confianza baja', 'El programa tuvo dudas al leer esa línea (puntaje bajo 0,80). Revísala con más cuidado.'],
        ['Sin dato, verificar etiqueta', 'El dato no se extrajo. No significa que la etiqueta no lo tenga: búscalo en el PDF (cada línea trae su link y página).'],
        ['Modo de acción', 'Grupo IRAC (insecticidas y acaricidas), FRAC (fungicidas) o HRAC (herbicidas) del ingrediente activo. Alternar grupos ayuda a retrasar la resistencia.'],
        ['Nombres raros', 'Algunos nombres de cultivos y objetivos vienen mal leídos del PDF (por ejemplo, una frase de instrucciones en vez del cultivo). Los cultivos que en realidad son frases no aparecen en el buscador ni en «¿Qué aplico?», pero sus líneas se siguen viendo en la ficha de cada producto. Los nombres más usados aparecen primero.'],
      ].map(([dt, dd]) => h('div', null, h('dt', null, dt), h('dd', null, dd))))),

    h('p', { class: 'chico tenue' }, e.ultima_actualizacion ? `Última actualización de los datos: ${fecha(e.ultima_actualizacion)}.` : ''),
    h('p', { class: 'chico tenue' }, 'Los indicadores se calculan en vivo cada vez que abres esta página.'));
}
