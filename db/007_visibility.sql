SET search_path = encore, pg_catalog;
CREATE OR REPLACE FUNCTION available_seats(target integer)
RETURNS TABLE(seat_id integer, section text, distance integer, row_label text, seat_no integer,
 accessible boolean, category text, price integer, state text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  SELECT s.id, x.name, x.distance, s.row_label, s.seat_no, s.accessible, t.name, t.price,
    CASE WHEN i.blocked THEN 'unavailable' WHEN b.status='confirmed' THEN 'booked'
      WHEN b.status='held' AND b.expires_at > statement_timestamp() THEN 'held'
      ELSE 'available' END
  FROM event_seat i JOIN event e ON e.id=i.event_id
  JOIN seat s ON s.id=i.seat_id JOIN section x ON x.id=s.section_id
  JOIN ticket_category t ON (t.event_id,t.name)=(i.event_id,i.category_name)
  LEFT JOIN booking b ON b.id=i.holder
  WHERE i.event_id=target AND (e.published OR EXISTS (
    SELECT 1 FROM app_user u WHERE u.id=actor() AND u.enabled
      AND (u.role='admin' OR (u.role='organizer' AND e.organizer_id=u.id))
  ))
  ORDER BY x.distance,x.name,s.row_label,s.seat_no
$$;
CREATE POLICY customer_booked_event ON event FOR SELECT TO encore_customer
USING(EXISTS(SELECT 1 FROM booking b WHERE b.event_id=event.id AND b.customer_id=actor()));
