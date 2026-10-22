-- Recopilador de etiquetas del SAG (22-10-2026).
-- 1) Inventario del listado de publicaciones del SAG: una fila por PDF, con su estado en el flujo
--    (nuevo → descargado → texto → extraido → validado → cargado). Proceso, privado.
create table public.sag_inventario (
  id bigint generated always as identity primary key,
  url text not null unique,
  archivo text not null,
  nombre text not null,
  tema text,
  anio smallint,
  empresa text,
  observaciones text,
  pagina_listado smallint,
  fila_listado smallint,
  visto_primera date not null default current_date,
  visto_ultima date not null default current_date,
  en_listado boolean not null default true,
  estado text not null default 'nuevo' check (estado in (
    'nuevo', 'descargado', 'texto', 'extraido', 'validado', 'cargado', 'diferencias',
    'ya_en_base', 'duplicado', 'version_anterior', 'no_etiqueta', 'error_descarga', 'ilegible', 'omitido')),
  motivo text,
  sha256 char(64),
  bytes integer,
  paginas smallint,
  paginas_sin_texto smallint,
  paginas_etiqueta smallint[],
  paginas_hds smallint[],
  registro_sag text,
  fecha_etiqueta date,
  autorizado_nsag text,
  autorizado_nombre text,
  autorizado_aptitud text,
  autorizado_titular text,
  autorizado_vence date,
  cancelado_fecha_limite date,
  solo_exportacion boolean,
  duplicado_de bigint references public.sag_inventario(id),
  producto_id uuid references public.products(id),
  documento_id uuid references public.documents(id),
  prioridad integer,
  lote text,
  extractor_version text,
  creado timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
comment on table public.sag_inventario is
  'Proceso (no dominio): cada PDF del listado de publicaciones del SAG y su estado en el recopilador. Privada.';
comment on column public.sag_inventario.registro_sag is 'N° de autorización SAG leído del texto de la etiqueta (script, sin IA).';
comment on column public.sag_inventario.autorizado_nsag is 'N° SAG de la planilla oficial de plaguicidas autorizados con que calza.';
comment on column public.sag_inventario.prioridad is 'Menor = antes. Vigentes en la planilla; insecticidas, fungicidas, herbicidas y acaricidas; etiquetas más nuevas.';
create index sag_inventario_estado_ix on public.sag_inventario (estado, prioridad);
create index sag_inventario_sha256_ix on public.sag_inventario (sha256);
create index sag_inventario_registro_ix on public.sag_inventario (registro_sag);
create index sag_inventario_duplicado_ix on public.sag_inventario (duplicado_de);
create index sag_inventario_producto_ix on public.sag_inventario (producto_id);
create index sag_inventario_documento_ix on public.sag_inventario (documento_id);
alter table public.sag_inventario enable row level security;
revoke all on public.sag_inventario from anon, authenticated;

-- 2) Entidades nuevas que crea el recopilador (cultivos, objetivos, ingredientes, empresas…), para revisión.
create table public.recopilador_revision (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('cultivo', 'objetivo', 'ingrediente', 'empresa', 'categoria', 'producto', 'otro')),
  entidad_id uuid,
  nombre text not null,
  documento_id uuid references public.documents(id),
  motivo text not null,
  resuelto boolean not null default false,
  creado timestamptz not null default now()
);
comment on table public.recopilador_revision is
  'Proceso (no dominio): entidades creadas por el recopilador que una persona debe revisar. Privada.';
create index recopilador_revision_documento_ix on public.recopilador_revision (documento_id);
alter table public.recopilador_revision enable row level security;
revoke all on public.recopilador_revision from anon, authenticated;

-- 3) URL oficial de cada documento. El sitio usa la copia del bucket si existe; si no, esta URL.
alter table public.documents add column source_url text;
comment on column public.documents.source_url is
  'URL oficial del PDF (listado del SAG u otra fuente). Los PDF del SAG no se suben al bucket.';

-- 4) Citas por campo, con el mismo formato que product_uses.field_citations:
--    {"campo": {"cita": texto literal, "pagina": N, "extractor": versión}}.
alter table public.products add column field_citations jsonb not null default '{}'::jsonb;
alter table public.product_active_ingredients add column field_citations jsonb not null default '{}'::jsonb;
alter table public.product_companies add column field_citations jsonb not null default '{}'::jsonb;
alter table public.product_safety_profiles add column field_citations jsonb not null default '{}'::jsonb;
alter table public.active_ingredients add column field_citations jsonb not null default '{}'::jsonb;

-- 5) Estado del producto según las listas oficiales del SAG y lo que dice su etiqueta.
alter table public.products
  add column sag_estado text check (sag_estado in ('autorizado', 'cancelado', 'no_figura')),
  add column sag_vencimiento date,
  add column sag_fecha_limite date,
  add column solo_exportacion boolean not null default false,
  add column sustancia_prohibida text,
  add column toxicidad_abejas text,
  add column avisaje_abejas text;
comment on column public.products.sag_estado is
  'autorizado: en la planilla de autorizados del SAG; cancelado: en la lista de cancelados; no_figura: en ninguna.';
comment on column public.products.sag_fecha_limite is
  'Cancelados: fecha hasta la que se puede usar, distribuir o vender (lista de cancelados del SAG).';
comment on column public.products.solo_exportacion is 'La etiqueta dice que es solo para exportación (no se usa en Chile).';
comment on column public.products.sustancia_prohibida is 'Ingrediente activo que está en la lista de plaguicidas prohibidos del SAG.';
