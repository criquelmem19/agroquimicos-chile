// Configuración pública del sitio. Aquí NO va ninguna llave secreta.
// La llave "publishable" es pública por diseño: solo permite lo que dejan las
// políticas RLS de Supabase (lectura del catálogo). Nunca poner aquí service_role.
export const SUPABASE_URL = 'https://cejkhfugaobfqnjpkgpl.supabase.co';
export const SUPABASE_KEY = 'sb_publishable_dzR4zTF-RcJGyw6Fq1LCRA_lAf1tpF8';

// Bajo este puntaje de confianza del extractor, la línea se marca con alerta.
export const UMBRAL_CONFIANZA = 0.8;

// La API de Supabase entrega como máximo 1.000 filas por consulta.
export const FILAS_POR_PAGINA = 1000;
