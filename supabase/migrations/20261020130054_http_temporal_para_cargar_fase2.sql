-- Extensión http temporal: la base lee los candidatos de la Fase 2 directo desde GitHub
-- (archivo público fijado a un commit). Se elimina al terminar la carga.
create extension if not exists http with schema extensions;
