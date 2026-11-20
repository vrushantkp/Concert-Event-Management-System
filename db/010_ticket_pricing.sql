CREATE PROCEDURE encore.configure_inventory(target integer, standard_price integer, front_price integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, encore, pg_temp AS $$
BEGIN
  -- initialize_inventory checks ownership and locks the event before changing prices.
  CALL encore.initialize_inventory(target, standard_price);
  UPDATE encore.ticket_category SET price = front_price
  WHERE event_id = target AND name = 'Front Row';
END $$;
REVOKE ALL ON PROCEDURE encore.configure_inventory(integer,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON PROCEDURE encore.configure_inventory(integer,integer,integer) TO encore_organizer, encore_admin;
