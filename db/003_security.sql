SET search_path = encore, pg_catalog;
CREATE FUNCTION register_customer(mail text, full_name text, hash text) RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  INSERT INTO app_user(email,name,password_hash) VALUES(lower(mail),full_name,hash) RETURNING id
$$;
CREATE FUNCTION login_record(mail text) RETURNS TABLE(id integer, password_hash text)
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  SELECT u.id,u.password_hash FROM app_user u WHERE email=lower(mail) AND enabled
$$;
CREATE FUNCTION new_session(uid integer, key text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  INSERT INTO session(digest,user_id,expires_at) VALUES(key,uid,clock_timestamp()+interval '12 hours')
$$;
CREATE FUNCTION end_session(key text) RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  DELETE FROM session WHERE digest=key
$$;
CREATE FUNCTION session_user_info(key text) RETURNS TABLE(id integer,name text,email text,role account_role)
LANGUAGE sql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
  SELECT u.id,u.name,u.email,u.role FROM app_user u JOIN session s ON s.user_id=u.id
  WHERE s.digest=key AND u.enabled AND s.expires_at > statement_timestamp()
$$;
CREATE PROCEDURE initialize_inventory(target integer, price integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = encore, pg_catalog AS $$
DECLARE v integer;
BEGIN
  SELECT venue_id INTO v FROM event e WHERE e.id=target AND EXISTS (
    SELECT 1 FROM app_user u WHERE u.id=actor() AND enabled
      AND (u.role='admin' OR (u.role='organizer' AND e.organizer_id=u.id))
  ) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Event access required' USING ERRCODE='42501'; END IF;
  INSERT INTO ticket_category VALUES(target,'Standard',price),(target,'Front Row',price+500)
    ON CONFLICT (event_id,name) DO UPDATE SET price=EXCLUDED.price;
  INSERT INTO event_seat(event_id,venue_id,seat_id,category_name)
    SELECT target,v,s.id,CASE WHEN x.distance<=5 THEN 'Front Row' ELSE 'Standard' END
    FROM seat s JOIN section x ON x.id=s.section_id WHERE s.venue_id=v
    ON CONFLICT DO NOTHING;
END $$;
ALTER TABLE event ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_seat ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY public_catalog ON event FOR SELECT TO encore_guest,encore_customer
USING(published);
CREATE POLICY organizer_catalog ON event TO encore_organizer
USING(organizer_id=actor()) WITH CHECK(organizer_id=actor());
CREATE POLICY admin_catalog ON event TO encore_admin USING(true) WITH CHECK(true);
CREATE POLICY own_booking ON booking FOR SELECT TO encore_customer USING(customer_id=actor());
CREATE POLICY organizer_booking ON booking FOR SELECT TO encore_organizer
USING(EXISTS(SELECT 1 FROM event e WHERE e.id=event_id AND e.organizer_id=actor()));
CREATE POLICY admin_booking ON booking FOR SELECT TO encore_admin USING(true);
CREATE POLICY visible_booking_seats ON booking_seat FOR SELECT TO encore_customer,encore_organizer,encore_admin
USING(EXISTS(SELECT 1 FROM booking b WHERE b.id=booking_id));
CREATE POLICY own_activity ON event_activity TO encore_customer
USING(user_id=actor()) WITH CHECK(user_id=actor());
REVOKE ALL ON ALL ROUTINES IN SCHEMA encore FROM PUBLIC;
GRANT USAGE ON SCHEMA encore TO encore_guest,encore_customer,encore_organizer,encore_admin,encore_runtime;
GRANT SELECT ON event,venue,artist,category,ticket_category TO encore_guest,encore_customer,encore_organizer,encore_admin;
GRANT SELECT ON booking,booking_seat,seat,section TO encore_customer,encore_organizer,encore_admin;
GRANT SELECT,INSERT,UPDATE ON event_activity TO encore_customer;
GRANT INSERT,UPDATE ON event TO encore_organizer,encore_admin;
GRANT SELECT(id,email,name,role,enabled),UPDATE(role,enabled) ON app_user TO encore_admin;
GRANT SELECT ON audit_log TO encore_admin;
GRANT INSERT,UPDATE ON venue,section,seat TO encore_admin;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA encore TO encore_organizer,encore_admin;
GRANT EXECUTE ON FUNCTION actor(),available_seats(integer) TO encore_guest,encore_customer,encore_organizer,encore_admin;
GRANT EXECUTE ON FUNCTION booking_total(uuid) TO encore_customer,encore_organizer,encore_admin;
GRANT EXECUTE ON FUNCTION occupancy(integer),revenue(integer) TO encore_organizer,encore_admin;
GRANT EXECUTE ON PROCEDURE initialize_inventory(integer,integer) TO encore_organizer,encore_admin;
GRANT EXECUTE ON PROCEDURE reserve_seats(integer,integer[],uuid),change_booking(uuid,text),
  confirm_booking(uuid),cancel_booking(uuid) TO encore_customer;
GRANT EXECUTE ON PROCEDURE release_expired_reservations() TO encore_admin;
GRANT EXECUTE ON FUNCTION register_customer(text,text,text),login_record(text),new_session(integer,text),
  end_session(text), session_user_info(text) TO encore_runtime;
