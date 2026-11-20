export const examples = {
  "DML lifecycle": "CREATE TEMP TABLE demo_artist(name text PRIMARY KEY) ON COMMIT DROP; INSERT INTO demo_artist VALUES ('Temporary performer'); ALTER TABLE demo_artist ADD COLUMN genre text; UPDATE demo_artist SET genre='Jazz' RETURNING *; SELECT * FROM demo_artist; DELETE FROM demo_artist RETURNING *; DROP TABLE demo_artist",
  "JOIN and occupancy": "SELECT e.title, v.name AS venue, a.name AS artist, encore.occupancy(e.id) AS occupancy_pct FROM encore.event e JOIN encore.venue v ON v.id=e.venue_id JOIN encore.artist a ON a.id=e.artist_id ORDER BY e.id",
  "Nested query": "SELECT title FROM encore.event WHERE venue_id IN (SELECT id FROM encore.venue WHERE city='Bengaluru')",
  "Correlated query": "SELECT e.title,(SELECT count(*) FROM encore.booking b WHERE b.event_id=e.id AND b.status='confirmed') AS confirmed FROM encore.event e",
  "Recursive query": "WITH RECURSIVE tree AS (SELECT id,name,0 AS depth,ARRAY[id] AS path FROM encore.category WHERE parent_id IS NULL UNION ALL SELECT c.id,c.name,t.depth+1,t.path||c.id FROM encore.category c JOIN tree t ON c.parent_id=t.id WHERE NOT c.id=ANY(t.path)) SELECT name,depth FROM tree ORDER BY path",
  "CTE and LEFT JOIN": "WITH totals AS (SELECT event_id,count(*) AS bookings FROM encore.booking WHERE status='confirmed' GROUP BY event_id) SELECT e.title,coalesce(t.bookings,0) AS bookings,encore.revenue(e.id) AS revenue FROM encore.event e LEFT JOIN totals t ON t.event_id=e.id",
  "Trigger audit": "SELECT booking_id,old_status,new_status,happened_at FROM encore.audit_log ORDER BY id DESC LIMIT 25",
  "Constraints": "SELECT table_name,constraint_type,constraint_name FROM information_schema.table_constraints WHERE table_schema='encore' ORDER BY table_name,constraint_type",
  "Expire holds": "CALL encore.release_expired_reservations()"
};
