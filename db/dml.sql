BEGIN;
CREATE TEMP TABLE demo_artist(name text PRIMARY KEY);
INSERT INTO demo_artist(name) VALUES ('Temporary performer');
ALTER TABLE demo_artist ADD COLUMN genre text;
UPDATE demo_artist SET genre='Jazz' WHERE name='Temporary performer';
SELECT * FROM demo_artist;
DELETE FROM demo_artist WHERE name='Temporary performer' RETURNING *;
DROP TABLE demo_artist;
ROLLBACK;
