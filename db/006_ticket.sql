SET search_path = encore, pg_catalog;
CREATE FUNCTION verify_ticket(reference uuid) RETURNS TABLE(title text,starts_at timestamptz,valid boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  SELECT e.title,e.starts_at,b.status='confirmed' AND e.published FROM booking b JOIN event e ON e.id=b.event_id
  WHERE b.id=reference AND b.status IN ('confirmed','cancelled')
$$;
REVOKE ALL ON FUNCTION verify_ticket(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION verify_ticket(uuid) TO encore_guest;
