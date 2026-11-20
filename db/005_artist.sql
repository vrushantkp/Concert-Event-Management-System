SET search_path = encore, pg_catalog;
CREATE FUNCTION add_artist(full_name text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
DECLARE result integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM app_user WHERE id=actor() AND enabled AND role IN ('organizer','admin')) THEN
    RAISE EXCEPTION 'Staff access required' USING ERRCODE='42501';
  END IF;
  INSERT INTO artist(name) VALUES(full_name) RETURNING id INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION add_artist(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION add_artist(text) TO encore_organizer,encore_admin;
