-- Una línea oculta («rechazado») no impide cargar otra con el mismo documento, página, fila y cultivo:
-- al reemplazar las líneas de una etiqueta por una lectura nueva, las viejas quedan ocultas (no se borran).
drop index if exists public.product_uses_source_crop_ux;
create unique index product_uses_source_crop_ux on public.product_uses
  (source_document_id, source_page, source_table_row, crop_id)
  where source_document_id is not null and source_page is not null and source_table_row is not null
    and review_status <> 'rechazado';
