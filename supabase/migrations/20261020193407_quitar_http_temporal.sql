-- Fin de la carga de la Fase 2: se quita la extensión http temporal (la base ya no necesita leer desde GitHub).
-- Para una carga futura: volver a crearla (20261020130054_http_temporal_para_cargar_fase2.sql) y quitarla al terminar.
drop extension if exists http;
