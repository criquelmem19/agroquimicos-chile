-- Corrección con visto bueno de Cristóbal («si», 21-10-2026): Katana Syngenta, líneas de cítricos decían «Al follaje»,
-- pero la etiqueta (pág. 1) dice «Aplique solo como un rocío dirigido al suelo debajo de los árboles para
-- evitar daños al follaje y la corteza de los árboles.» El valor anterior queda en use_field_candidates.existing_value
-- (extractor 'correccion-fase2-v1') para poder deshacerlo.
insert into public.use_field_candidates
  (extractor_version, product_use_id, document_id, field_name, value_text, quote, page, source, status, existing_value, notes)
select 'correccion-fase2-v1', pu.id, pu.source_document_id, 'metodo', 'Al suelo',
       'Aplique solo como un rocío dirigido al suelo debajo de los árboles para evitar daños al follaje y la corteza de los árboles.',
       1, 'texto', 'aplicado', pu.application_method,
       'Conflicto de datos/fase2/reporte_otros_v1.txt corregido con visto bueno de Cristóbal («si», 21-10-2026).'
from public.product_uses pu
join public.products p on p.id = pu.product_id
where p.commercial_name = 'Katana Syngenta' and pu.application_method = 'Al follaje'
  and concat_ws(' ', pu.observations, pu.application_timing, pu.source_text) ilike '%rocío dirigido al suelo debajo de los árboles%';

update public.product_uses pu set
  application_method = 'Al suelo',
  field_citations = pu.field_citations || jsonb_build_object('metodo', jsonb_build_object(
    'cita', c.quote, 'pagina', c.page, 'extractor', c.extractor_version))
from public.use_field_candidates c
where c.extractor_version = 'correccion-fase2-v1' and c.field_name = 'metodo'
  and c.product_use_id = pu.id and pu.application_method = 'Al follaje';
