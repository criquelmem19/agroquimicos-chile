# Agroquímicos Chile

Catálogo del mercado chileno de agroquímicos, construido desde etiquetas
oficiales del SAG. Consulta, planificación de aplicaciones y foro.

## Arrancar

```bash
npm install
cp .env.local.example .env.local     # rellenar la anon key
npm run dev
```

La anon key está en el dashboard de Supabase, en Project Settings → API.

## Conectar la CLI de Supabase

```bash
npx supabase login
npx supabase link --project-ref cejkhfugaobfqnjpkgpl
npx supabase db pull                 # trae las 27 migraciones ya aplicadas
npm run types                        # genera los tipos completos
```

`types/database.types.ts` viene con un stub mínimo para que el scaffold
compile. `npm run types` lo reemplaza con las 16 tablas y 5 vistas reales.

## Estructura

```
app/              Next.js App Router
components/       Componentes compartidos
lib/supabase/     Clientes de Supabase (server y browser)
types/            Tipos generados desde la base
supabase/         Migraciones
sql/              Consultas de diagnóstico para el SQL Editor
docs/             Diagnóstico de datos y roadmap
CLAUDE.md         Contexto para Claude Code — leerlo primero
```

## Antes de escribir código, leer

- **`CLAUDE.md`** — esquema, convenciones y la regla no negociable de la
  interfaz sobre mostrar dosis y carencias.
- **`docs/DIAGNOSTICO-carencia.md`** — por qué falta el 98% de las carencias y
  cómo se arregla. Es la prioridad uno.
- **`docs/ROADMAP.md`** — el orden propuesto y las decisiones pendientes.

## Advertencia

Este catálogo se extrajo de PDFs con un modelo de lenguaje y hoy solo 56 de
2.743 líneas de uso tienen revisión humana. La etiqueta oficial del SAG es la
única fuente válida para decidir una aplicación. La app informa; no prescribe.
