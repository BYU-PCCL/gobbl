-- Supabase exposes the public schema through its Data API. The app only talks to
-- the database through Prisma (as the table owner, which bypasses RLS), so enable
-- RLS with no policies on every table to block access via the anon/authenticated keys.
-- Idempotent; rerun after `prisma db push` adds tables.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;
