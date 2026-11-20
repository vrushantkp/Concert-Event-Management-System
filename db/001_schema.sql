CREATE SCHEMA encore;
SET search_path = encore, pg_catalog;
CREATE TYPE account_role AS ENUM ('customer','organizer','admin');
CREATE TYPE booking_state AS ENUM ('held','confirmed','cancelled','expired');
CREATE TABLE app_user (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email text UNIQUE NOT NULL CHECK (email = lower(email)),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  password_hash text NOT NULL,
  role account_role NOT NULL DEFAULT 'customer',
  enabled boolean NOT NULL DEFAULT true
);
CREATE TABLE session (
  digest text PRIMARY KEY,
  user_id integer NOT NULL REFERENCES app_user ON DELETE CASCADE,
  expires_at timestamptz NOT NULL
);
CREATE INDEX session_expiry ON session(expires_at);
CREATE TABLE venue (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  city text NOT NULL
);
CREATE TABLE section (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venue_id integer NOT NULL REFERENCES venue,
  name text NOT NULL,
  distance integer NOT NULL CHECK (distance > 0),
  UNIQUE(venue_id,name), UNIQUE(id,venue_id)
);
CREATE TABLE seat (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  venue_id integer NOT NULL,
  section_id integer NOT NULL,
  row_label text NOT NULL,
  seat_no integer NOT NULL CHECK (seat_no > 0),
  accessible boolean NOT NULL DEFAULT false,
  FOREIGN KEY (section_id,venue_id) REFERENCES section(id,venue_id),
  UNIQUE(section_id,row_label,seat_no), UNIQUE(id,venue_id)
);
CREATE TABLE category (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE,
  parent_id integer REFERENCES category,
  CHECK (parent_id IS DISTINCT FROM id)
);
CREATE TABLE artist (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);
CREATE TABLE event (
  id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organizer_id integer NOT NULL REFERENCES app_user,
  venue_id integer NOT NULL REFERENCES venue,
  category_id integer NOT NULL REFERENCES category,
  artist_id integer NOT NULL REFERENCES artist,
  title text NOT NULL,
  description text NOT NULL,
  starts_at timestamptz NOT NULL,
  published boolean NOT NULL DEFAULT false,
  featured boolean NOT NULL DEFAULT false,
  artwork text NOT NULL DEFAULT 'ruby' CHECK (artwork IN ('ruby','indigo','amber')),
  UNIQUE(id,venue_id)
);
CREATE INDEX event_listing ON event(starts_at) WHERE published;
CREATE INDEX event_organizer ON event(organizer_id);
CREATE TABLE ticket_category (
  event_id integer NOT NULL REFERENCES event,
  name text NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  PRIMARY KEY(event_id,name)
);
CREATE TABLE booking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id integer NOT NULL REFERENCES event,
  customer_id integer NOT NULL REFERENCES app_user,
  status booking_state NOT NULL DEFAULT 'held',
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(id,event_id)
);
CREATE INDEX booking_customer ON booking(customer_id,created_at DESC);
CREATE INDEX booking_expiry ON booking(expires_at) WHERE status='held';
CREATE TABLE event_seat (
  event_id integer NOT NULL,
  venue_id integer NOT NULL,
  seat_id integer NOT NULL,
  category_name text NOT NULL,
  blocked boolean NOT NULL DEFAULT false,
  holder uuid,
  PRIMARY KEY(event_id,seat_id),
  FOREIGN KEY(event_id,venue_id) REFERENCES event(id,venue_id),
  FOREIGN KEY(seat_id,venue_id) REFERENCES seat(id,venue_id),
  FOREIGN KEY(event_id,category_name) REFERENCES ticket_category,
  FOREIGN KEY(holder,event_id) REFERENCES booking(id,event_id),
  CHECK (NOT blocked OR holder IS NULL)
);
CREATE TABLE booking_seat (
  booking_id uuid NOT NULL,
  event_id integer NOT NULL,
  seat_id integer NOT NULL,
  price integer NOT NULL CHECK (price >= 0),
  PRIMARY KEY(booking_id,seat_id),
  FOREIGN KEY(booking_id,event_id) REFERENCES booking(id,event_id),
  FOREIGN KEY(event_id,seat_id) REFERENCES event_seat
);
CREATE TABLE audit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  booking_id uuid NOT NULL REFERENCES booking,
  old_status booking_state,
  new_status booking_state NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE event_activity (
  user_id integer NOT NULL REFERENCES app_user,
  event_id integer NOT NULL REFERENCES event,
  saved boolean NOT NULL DEFAULT false,
  viewed_at timestamptz,
  PRIMARY KEY(user_id,event_id)
);
CREATE FUNCTION actor() RETURNS integer LANGUAGE sql STABLE
AS $$ SELECT nullif(current_setting('encore.actor', true),'')::integer $$;
