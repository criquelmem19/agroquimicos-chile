-- BASTA 14 SL (09-11-2026, con el «sí» de Cristóbal a reemplazar sus líneas por las de la etiqueta del SAG,
-- inventario 327): el producto venía de la carga original sin N° SAG ni ingrediente activo. Solo se llenan
-- campos vacíos, con la cita de la etiqueta del SAG (texto OCR). No se pisa ningún valor.
update products p
set registration_number = '3328',
    sag_estado = coalesce(p.sag_estado, 'autorizado'),
    sag_vencimiento = coalesce(p.sag_vencimiento, date '2030-05-18'),
    field_citations = coalesce(p.field_citations, '{}'::jsonb) || jsonb_build_object(
      'registro_sag', jsonb_build_object('cita', 'Autorización Servicio Agrícola y Ganadero N?: 3328',
                                         'pagina', 1, 'extractor', 'recopilador-sag-v1'))
where p.commercial_name = 'Basta 14 SL'
  and p.registration_number is null
  and not exists (select 1 from products o where o.registration_number = '3328');

insert into product_active_ingredients (product_id, active_ingredient_id, concentration_raw,
                                        concentration_percent_pv, concentration_g_l, field_citations)
select p.id, ai.id, '15 % p/v (150 g/L)', 15, 150,
       jsonb_build_object(
         'nombre', jsonb_build_object('cita', 'Glufosinato-amonio (*)', 'pagina', 1, 'extractor', 'recopilador-sag-v1'),
         'concentracion', jsonb_build_object('cita', '15 % p/v (150 g/L)', 'pagina', 1, 'extractor', 'recopilador-sag-v1'),
         'grupo', jsonb_build_object('cita', 'Glufosinato-amonio pertenece al grupo 10/H.', 'grupo', '10/H',
                                     'sistema', 'HRAC', 'pagina', 6, 'extractor', 'recopilador-sag-v1'))
from products p, active_ingredients ai
where p.commercial_name = 'Basta 14 SL' and ai.common_name = 'Glufosinato-amonio'
  and not exists (select 1 from product_active_ingredients x where x.product_id = p.id);
