SET search_path = encore, pg_catalog;
CREATE FUNCTION audit_booking() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = encore, pg_catalog AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    INSERT INTO audit_log(booking_id,new_status) VALUES(NEW.id,NEW.status);
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log(booking_id,old_status,new_status) VALUES(NEW.id,OLD.status,NEW.status);
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER booking_activity AFTER INSERT OR UPDATE OF status ON booking
FOR EACH ROW EXECUTE FUNCTION audit_booking();
CREATE FUNCTION booking_total(reference uuid) RETURNS bigint LANGUAGE sql STABLE
AS $$ SELECT coalesce(sum(price),0) FROM encore.booking_seat WHERE booking_id=reference $$;
CREATE FUNCTION available_seats(target integer)
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
  WHERE i.event_id=target AND e.published
  ORDER BY x.distance,x.name,s.row_label,s.seat_no
$$;
CREATE PROCEDURE reserve_seats(target integer, seats integer[], INOUT reference uuid)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
DECLARE picked integer;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM app_user WHERE id=actor() AND enabled AND role='customer') THEN
    RAISE EXCEPTION 'Customer access required' USING ERRCODE='42501';
  END IF;
  IF seats IS NULL OR cardinality(seats) NOT BETWEEN 1 AND 8 THEN
    RAISE EXCEPTION 'Select one to eight seats' USING ERRCODE='P0001';
  END IF;
  PERFORM 1 FROM event WHERE id=target AND published AND starts_at>clock_timestamp() FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event is not open for reservations' USING ERRCODE='P0001'; END IF;
  PERFORM 1 FROM event_seat WHERE event_id=target AND seat_id=ANY(seats)
    ORDER BY seat_id FOR UPDATE;
  SELECT count(*) INTO picked FROM event_seat i LEFT JOIN booking b ON b.id=i.holder
  WHERE i.event_id=target AND i.seat_id=ANY(seats) AND NOT i.blocked
    AND (b.id IS NULL OR b.status IN ('expired','cancelled')
      OR (b.status='held' AND b.expires_at<=clock_timestamp()));
  IF picked<>cardinality(seats) THEN
    RAISE EXCEPTION 'Some seats are no longer available' USING ERRCODE='P0001';
  END IF;
  INSERT INTO booking(event_id,customer_id,expires_at)
  VALUES(target,actor(),clock_timestamp()+interval '5 minutes') RETURNING id INTO reference;
  INSERT INTO booking_seat(booking_id,event_id,seat_id,price)
  SELECT reference,i.event_id,i.seat_id,t.price FROM event_seat i
  JOIN ticket_category t ON (t.event_id,t.name)=(i.event_id,i.category_name)
  WHERE i.event_id=target AND i.seat_id=ANY(seats);
  UPDATE event_seat SET holder=reference WHERE event_id=target AND seat_id=ANY(seats);
END $$;
CREATE PROCEDURE change_booking(reference uuid, action text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
DECLARE held booking%ROWTYPE;
BEGIN
  SELECT b.* INTO held FROM booking b WHERE b.id=reference AND b.customer_id=actor() AND
    EXISTS(SELECT 1 FROM app_user WHERE id=actor() AND enabled AND role='customer');
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM event WHERE id=held.event_id AND starts_at>clock_timestamp()
    AND (action='cancel' OR published) FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This event is no longer open' USING ERRCODE='P0001'; END IF;
  PERFORM 1 FROM event_seat i JOIN booking_seat bs USING(event_id,seat_id)
    WHERE bs.booking_id=reference ORDER BY i.seat_id FOR UPDATE OF i;
  SELECT * INTO held FROM booking WHERE id=reference FOR UPDATE;
  IF action='confirm' AND held.status='confirmed' THEN RETURN; END IF;
  IF action='cancel' AND held.status='cancelled' THEN RETURN; END IF;
  IF action='confirm' AND held.status='held' AND held.expires_at>clock_timestamp()
    AND NOT EXISTS(SELECT 1 FROM booking_seat s JOIN event_seat i USING(event_id,seat_id)
                   WHERE s.booking_id=reference AND i.holder IS DISTINCT FROM reference) THEN
    UPDATE booking SET status='confirmed' WHERE id=reference;
  ELSIF action='cancel' AND held.status IN ('held','confirmed') THEN
    UPDATE booking SET status='cancelled' WHERE id=reference;
    UPDATE event_seat SET holder=NULL WHERE holder=reference;
  ELSE
    RAISE EXCEPTION 'This booking cannot be changed' USING ERRCODE='P0001';
  END IF;
END $$;
CREATE PROCEDURE confirm_booking(reference uuid) LANGUAGE sql
AS $$ CALL encore.change_booking(reference,'confirm') $$;
CREATE PROCEDURE cancel_booking(reference uuid) LANGUAGE sql
AS $$ CALL encore.change_booking(reference,'cancel') $$;
CREATE PROCEDURE release_expired_reservations()
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  UPDATE booking SET status='expired' WHERE status='held' AND expires_at<=clock_timestamp();
$$;
CREATE FUNCTION occupancy(target integer) RETURNS numeric LANGUAGE sql STABLE
AS $$ SELECT round(100.0*count(*) FILTER (WHERE state='booked')/nullif(count(*),0),1)
      FROM encore.available_seats(target) WHERE state<>'unavailable' $$;
CREATE FUNCTION revenue(target integer) RETURNS bigint LANGUAGE sql STABLE
AS $$ SELECT coalesce(sum(booking_total),0) FROM (
  SELECT encore.booking_total(id) AS booking_total FROM encore.booking
  WHERE event_id=target AND status='confirmed'
) totals $$;
