# Agroquímicos Chile

Catálogo de agroquímicos de Chile construido desde las etiquetas oficiales del SAG:
buscador por producto, ingrediente activo, cultivo, plaga/enfermedad/maleza y empresa;
"¿Qué puedo aplicar?" para comparar dosis, carencia y modo de acción (IRAC/FRAC/HRAC);
fichas de producto y una página con el estado de los datos.

**Sitio:** https://criquelmem19.github.io/agroquimicos-chile/

> ⚠️ Los datos se extrajeron automáticamente de etiquetas en PDF y pueden tener errores.
> La carencia todavía falta en casi todas las líneas de uso. Antes de aplicar, lee siempre
> la etiqueta oficial del producto. Este sitio informa; no prescribe.

## Cómo funciona

- Sitio estático (HTML, CSS y JavaScript, sin paso de compilación) publicado con GitHub Pages
  desde la rama `main`.
- Los datos viven en Supabase y el sitio los lee en vivo con
  [supabase-js](https://github.com/supabase/supabase-js) (versión fija, cargada desde un CDN con
  huella SRI). Lo que se carga en la base aparece en el sitio sin volver a publicarlo.
- En el navegador solo va la llave pública (*publishable*), que permite únicamente leer el catálogo.
- Un flujo de GitHub Actions (`.github/workflows/mantener-activo.yml`) consulta la base dos veces al
  día para que el plan gratis de Supabase no la pause.

## Estructura

```
index.html                 Página única del sitio
assets/css/app.css         Estilos (modo claro y oscuro)
assets/js/                 Código: app.js (navegación), db.js (datos), buscador.js, ui.js
assets/js/vistas/          Una vista por sección
supabase/migrations/       Cambios a la base hechos desde este repositorio
scripts/                   Herramientas locales (servidor de prueba, extracción)
CLAUDE.md                  Contexto, reglas y decisiones del proyecto
```

## Probar en tu computador

```bash
python scripts/servidor_local.py
```

y abrir http://127.0.0.1:8765
