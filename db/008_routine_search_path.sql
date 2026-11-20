SET search_path = pg_catalog;
DO $$
DECLARE routine regprocedure;
BEGIN
  FOR routine IN
    SELECT p.oid::regprocedure FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='encore' AND p.prosecdef
  LOOP
    EXECUTE format('ALTER ROUTINE %s SET search_path = pg_catalog, encore, pg_temp',routine);
  END LOOP;
END
$$;
