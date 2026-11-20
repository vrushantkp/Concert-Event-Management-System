SET search_path = encore, pg_catalog;

ALTER TABLE event
  ADD COLUMN doors_before_minutes integer CHECK (doors_before_minutes BETWEEN 0 AND 180),
  ADD COLUMN duration_minutes integer CHECK (duration_minutes BETWEEN 15 AND 600),
  ADD COLUMN venue_note text CHECK (length(venue_note) <= 600),
  ADD COLUMN entry_note text CHECK (length(entry_note) <= 600),
  ADD COLUMN is_demo boolean NOT NULL DEFAULT false;

ALTER TABLE event DROP CONSTRAINT event_artwork_check;
ALTER TABLE event ADD CONSTRAINT event_artwork_check
  CHECK (artwork IN ('ruby','indigo','amber','violet'));

UPDATE event e
SET description = CASE WHEN e.description = show.previous_copy THEN show.story ELSE e.description END,
    doors_before_minutes = show.doors,
    duration_minutes = show.duration,
    venue_note = show.location,
    entry_note = 'Keep your digital ticket QR ready. Choose one reserved seat per guest.',
    is_demo = true
FROM (VALUES
  ('After the Signal', 'Neon Atlas', 'The Hangar',
   'A live electronic set built around pulsing analog synths, dense drums and a lighting show that moves with the music.',
   E'Neon Atlas opens with slow-building synth textures and live percussion before moving into a set of heavier club tracks. Analog sequences, drum machines and a lighting rig built around the beat give the set its shape.\n\nChoose Floor seats for a closer view of the instruments, or look at the Mezzanine for a wider view of the stage and lighting.',
   45, 100, 'The Hangar, Bengaluru. The seating preview shows the Floor, Mezzanine and Balcony in order of distance from the stage.'),
  ('Songs for the City', 'Paper Satellites', 'Echo Hall',
   'An intimate night of indie rock with new arrangements and a full live band.',
   E'Paper Satellites plays an intimate set of guitar-led songs about late trains, changing neighbourhoods and getting home after dark. The band starts with quieter arrangements before bringing in the full rhythm section.\n\nExpect a mix of familiar songs and material written for the live set, with a short acoustic interlude.',
   30, 90, 'Echo Hall, Bengaluru. The seating preview groups rows by section. Accessible positions are marked on the map.'),
  ('Blue Hour Sessions', 'Blue Hour Quartet', 'The Foundry',
   'An evening of modern jazz and improvisation in a converted industrial hall.',
   E'Blue Hour Quartet brings saxophone, piano, bass and drums together for an evening of modern jazz. The first part of the set moves through original compositions. Later, the players open up the arrangements for longer solos and group improvisation.\n\nThe set is designed for seated listening, with a short interval between the two parts.',
   30, 105, 'The Foundry, Mumbai. Compare the Floor and raised sections on the seating preview before choosing your seats.')
) AS show(title, artist, venue, previous_copy, story, doors, duration, location)
JOIN artist a ON a.name = show.artist
JOIN venue v ON v.name = show.venue
WHERE e.title = show.title AND e.artist_id = a.id AND e.venue_id = v.id;

INSERT INTO venue(name,city)
VALUES ('PES University, Ring Road Campus','Bengaluru')
ON CONFLICT (name) DO NOTHING;

INSERT INTO artist(name) VALUES ('The 560 Collective') ON CONFLICT (name) DO NOTHING;

DO $$
DECLARE
  campus_id integer;
  host_id integer;
  show_id integer;
BEGIN
  SELECT id INTO STRICT campus_id FROM venue WHERE name = 'PES University, Ring Road Campus';
  SELECT id INTO STRICT host_id FROM app_user WHERE email = 'organizer@encore.test';

  INSERT INTO section(venue_id,name,distance)
  VALUES (campus_id,'Main Floor',4),(campus_id,'Gallery',14),(campus_id,'Balcony',23)
  ON CONFLICT (venue_id,name) DO NOTHING;

  INSERT INTO seat(venue_id,section_id,row_label,seat_no,accessible)
  SELECT campus_id,s.id,chr(64+r),n,r=1 AND n IN (1,2)
  FROM section s CROSS JOIN generate_series(1,3) r CROSS JOIN generate_series(1,10) n
  WHERE s.venue_id=campus_id AND s.name IN ('Main Floor','Gallery','Balcony')
  ON CONFLICT (section_id,row_label,seat_no) DO NOTHING;

  INSERT INTO event(organizer_id,venue_id,category_id,artist_id,title,description,starts_at,published,featured,artwork,
                    doors_before_minutes,duration_minutes,venue_note,entry_note,is_demo)
  SELECT host_id,campus_id,c.id,a.id,'Campus After Hours',
    E'The 560 Collective brings a campus-sized indie set to Bengaluru: jangly guitar, live drums and warm synth lines. The evening opens with stripped-back arrangements before the full band takes over for a louder second half.\n\nPick a Main Floor seat to get close to the stage, or choose the Gallery or Balcony for a wider view. The seating map marks accessible seats and shows current availability for each section.',
    (date_trunc('week',now() AT TIME ZONE 'Asia/Kolkata') + interval '2 weeks 5 days 18 hours 30 minutes') AT TIME ZONE 'Asia/Kolkata',
    true,false,'violet',45,95,
    '100 Feet Ring Road, BSK III Stage, Bengaluru 560085. The seating layout is illustrative for this demo.',
    'Use one ticket per guest in the demo. Your booking confirmation includes a QR verification link.',true
  FROM category c CROSS JOIN artist a WHERE c.name='Indie' AND a.name='The 560 Collective'
  RETURNING id INTO STRICT show_id;

  INSERT INTO ticket_category(event_id,name,price) VALUES
    (show_id,'Standard',499),(show_id,'Front Row',999);
  INSERT INTO event_seat(event_id,venue_id,seat_id,category_name)
  SELECT show_id,campus_id,s.id,CASE WHEN section.distance<=5 THEN 'Front Row' ELSE 'Standard' END
  FROM seat s JOIN section ON section.id=s.section_id WHERE s.venue_id=campus_id;
END $$;
