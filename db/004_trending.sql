SET search_path = encore, pg_catalog;
CREATE FUNCTION public_booking_count(target integer) RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  SELECT count(*)::integer FROM booking b JOIN event e ON e.id=b.event_id
  WHERE e.id=target AND e.published AND b.status='confirmed'
$$;
REVOKE ALL ON FUNCTION public_booking_count(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public_booking_count(integer) TO encore_guest,encore_customer,encore_organizer,encore_admin;
