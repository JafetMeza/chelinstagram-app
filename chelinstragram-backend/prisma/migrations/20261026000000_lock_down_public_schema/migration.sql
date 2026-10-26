-- Supabase expone el schema "public" por su API REST (PostgREST) a los roles "anon" y
-- "authenticated". Esta app nunca usa esa API: todo pasa por el backend, que se conecta
-- como "postgres" (BYPASSRLS). Así que cerramos el acceso por completo:
--   1. RLS activado en todas las tablas y sin políticas => la API no ve filas.
--   2. Sin privilegios para anon/authenticated, tampoco en tablas futuras.
-- Los roles solo existen en Supabase; en un Postgres local (docker) se omite ese paso.

DO $$
DECLARE
    t record;
BEGIN
    FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
        REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
        REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
    END IF;
END $$;
