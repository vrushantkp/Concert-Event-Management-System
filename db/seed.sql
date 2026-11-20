SET search_path = encore, pg_catalog;
INSERT INTO venue(name,city) VALUES ('The Hangar','Bengaluru'),('Echo Hall','Bengaluru'),('The Foundry','Mumbai');
INSERT INTO section(venue_id,name,distance)
SELECT id,s.name,s.distance FROM venue CROSS JOIN (VALUES('Floor',4),('Mezzanine',14),('Balcony',24)) s(name,distance);
INSERT INTO seat(venue_id,section_id,row_label,seat_no,accessible)
SELECT venue_id,id,chr(64+r),n,r=1 AND n IN (1,2) FROM section CROSS JOIN generate_series(1,3) r CROSS JOIN generate_series(1,10) n;
INSERT INTO category(name) VALUES ('Music'),('Live performance');
INSERT INTO category(name,parent_id) SELECT child.name,c.id FROM category c CROSS JOIN
  (VALUES('Electronic'),('Indie'),('Jazz')) child(name) WHERE c.name='Music';
INSERT INTO artist(name) VALUES ('Neon Atlas'),('Paper Satellites'),('Blue Hour Quartet');
INSERT INTO event(organizer_id,venue_id,category_id,artist_id,title,description,starts_at,published,featured,artwork)
SELECT u.id,v.id,c.id,a.id,d.title,d.description,date_trunc('day',now())+make_interval(days=>d.days,hours=>14),true,d.days=12,d.art
FROM (VALUES
 ('The Hangar','Electronic','Neon Atlas','After the Signal','A live electronic set built around pulsing analog synths, dense drums and a lighting show that moves with the music.',12,'ruby'),
 ('Echo Hall','Indie','Paper Satellites','Songs for the City','An intimate night of indie rock with new arrangements and a full live band.',19,'indigo'),
 ('The Foundry','Jazz','Blue Hour Quartet','Blue Hour Sessions','An evening of modern jazz and improvisation in a converted industrial hall.',25,'amber')
) d(venue,category,artist,title,description,days,art)
JOIN venue v ON v.name=d.venue JOIN category c ON c.name=d.category JOIN artist a ON a.name=d.artist
CROSS JOIN app_user u WHERE u.email='organizer@encore.test';
SELECT set_config('encore.actor',(SELECT id::text FROM app_user WHERE email='organizer@encore.test'),true);
DO $$ DECLARE e record; BEGIN
  FOR e IN SELECT id FROM event LOOP CALL initialize_inventory(e.id,900+e.id*200); END LOOP;
END $$;
UPDATE event_seat SET blocked=true WHERE seat_id % 29 = 0;
