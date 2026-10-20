-- Fase 2: completar carencia, mojamiento, método e intervalo desde los PDF, siempre con cita y página.

-- 1) Reglas de calidad (recoge la idea de la migración "invariantes_de_calidad" que nunca se aplicó).
--    Al 20-10-2026 ninguna fila las viola.
alter table public.product_uses
  add constraint aprobado_requiere_carencia
    check (review_status <> 'aprobado' or withholding_period_days is not null or withholding_not_applicable),
  add constraint carencia_requiere_cita
    check ((withholding_period_days is null and not withholding_not_applicable)
           or nullif(btrim(withholding_period_raw), '') is not null),
  add constraint carencia_dias_o_no_aplica
    check (not (withholding_period_days is not null and withholding_not_applicable));

comment on constraint aprobado_requiere_carencia on public.product_uses is
  'Una línea no puede quedar aprobada sin carencia resuelta (días o no aplica).';
comment on constraint carencia_requiere_cita on public.product_uses is
  'Toda carencia (días o no aplica) debe tener su cita textual en withholding_period_raw.';

-- 2) Citas de los campos completados después de la carga inicial. source_page sigue siendo
--    la página del cuadro de dosis; la página de cada cita va aquí.
alter table public.product_uses
  add column if not exists field_citations jsonb not null default '{}'::jsonb;
comment on column public.product_uses.field_citations is
  'Citas de la etiqueta para campos completados en la Fase 2: {"carencia"|"mojamiento"|"metodo"|"intervalo": {"cita": texto literal, "pagina": N, "extractor": version}}.';

-- 3) Tabla aparte (privada) donde se escribe primero lo extraído, para comparar antes de tocar product_uses.
create table if not exists public.use_field_candidates (
  id bigint generated always as identity primary key,
  extractor_version text not null,
  product_use_id uuid not null references public.product_uses(id) on delete cascade,
  document_id uuid references public.documents(id),
  field_name text not null check (field_name in ('carencia', 'mojamiento', 'metodo', 'intervalo')),
  value_min numeric,
  value_max numeric,
  value_text text,
  not_applicable boolean not null default false,
  quote text not null check (btrim(quote) <> ''),
  page integer not null check (page > 0),
  source text not null default 'texto' check (source in ('texto', 'ocr')),
  status text not null default 'candidato'
    check (status in ('candidato', 'aplicado', 'igual', 'conflicto', 'descartado')),
  existing_value text,
  notes text,
  created_at timestamptz not null default now(),
  unique (extractor_version, product_use_id, field_name)
);
comment on table public.use_field_candidates is
  'Proceso (no dominio): valores extraídos de los PDF con cita y página, antes de aplicarlos a product_uses. Privada.';
create index if not exists use_field_candidates_use_ix on public.use_field_candidates (product_use_id);
create index if not exists use_field_candidates_doc_ix on public.use_field_candidates (document_id);

alter table public.use_field_candidates enable row level security;
revoke all on public.use_field_candidates from anon, authenticated;
