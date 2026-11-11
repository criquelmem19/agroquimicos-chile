-- Topramezona: ingrediente nuevo del 11-11-2026 (etiqueta de Convey, que trae «HRAC 27»). Solo su grupo químico.
insert into public.moa_clasificacion (ingrediente_id, grupo_quimico, fuente)
select id, 'Benzoilpirazoles', 'Grupo químico según la lista oficial de su comité'
from public.active_ingredients where common_name = 'Topramezona'
on conflict do nothing;
