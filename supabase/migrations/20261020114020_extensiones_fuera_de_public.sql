-- Aplicada el 20-10-2026 con el MCP de Supabase (apply_migration).
-- Advisor de seguridad "extension_in_public": las funciones de citext y pg_trgm
-- quedaban expuestas como RPC en la API. Se mueven al esquema extensions.
-- Las columnas citext y los índices trigram siguen funcionando (referencian por OID).
alter extension pg_trgm set schema extensions;
alter extension citext set schema extensions;
