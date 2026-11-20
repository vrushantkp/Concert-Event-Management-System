import pg from 'pg';
import { MongoClient } from 'mongodb';
import { readFile } from 'node:fs/promises';
import { randomBytes, scryptSync } from 'node:crypto';

const { DATABASE_URL, MIGRATION_DATABASE_URL, MONGODB_URI, MONGODB_DB = 'encore', DEMO_PASSWORD } = process.env;
if (!DATABASE_URL || !MIGRATION_DATABASE_URL || !MONGODB_URI || !DEMO_PASSWORD || DEMO_PASSWORD.length < 12 || DEMO_PASSWORD.startsWith('REPLACE')) {
  throw new Error('Set the database URLs and a demo password of at least 12 characters in .env.local.');
}
const administrator = new pg.Client({ connectionString: MIGRATION_DATABASE_URL });
const mongo = new MongoClient(MONGODB_URI);
await administrator.connect();
try {
  await administrator.query('BEGIN');
  await administrator.query('CREATE TABLE IF NOT EXISTS public.encore_migration(version text primary key)');
  await administrator.query('SELECT pg_advisory_xact_lock(46290)');
  const url = new URL(DATABASE_URL);
  if (decodeURIComponent(url.username) !== 'encore_runtime') throw new Error('Use encore_runtime in DATABASE_URL.');
  for (const role of ['guest','customer','organizer','admin','runtime']) {
    await administrator.query(
      "DO $$ BEGIN CREATE ROLE encore_" + role + (role === 'runtime' ? " LOGIN NOINHERIT" : " NOLOGIN") +
      "; EXCEPTION WHEN duplicate_object THEN NULL; END $$"
    );
  }
  const { rows: [{ sql }] } = await administrator.query(
    "SELECT format('ALTER ROLE encore_runtime PASSWORD %L', $1::text) AS sql", [decodeURIComponent(url.password)]
  );
  await administrator.query(sql);
  await administrator.query('GRANT encore_guest,encore_customer,encore_organizer,encore_admin TO encore_runtime');
  for (const filename of ['001_schema.sql','002_booking.sql','003_security.sql','004_trending.sql','005_artist.sql','006_ticket.sql','007_visibility.sql','008_routine_search_path.sql','seed.sql','009_show_details.sql','010_ticket_pricing.sql']) {
    const applied = await administrator.query('SELECT 1 FROM public.encore_migration WHERE version=$1',[filename]);
    if (applied.rowCount) continue;
    if (filename === 'seed.sql') {
      for (const [role,name] of [['organizer','Asha Rao'],['admin','Demo Administrator'],['customer','Sam Mehta']]) {
        const salt = randomBytes(16).toString('hex');
        const hash = salt + ':' + scryptSync(DEMO_PASSWORD,salt,64).toString('hex');
        await administrator.query('INSERT INTO encore.app_user(email,name,password_hash,role) VALUES ($1,$2,$3,$4)',[role+'@encore.test',name,hash,role]);
      }
    }
    await administrator.query(await readFile(new URL('../db/'+filename,import.meta.url),'utf8'));
    await administrator.query('INSERT INTO public.encore_migration VALUES($1)',[filename]);
    console.log('Applied',filename);
  }
  await administrator.query('COMMIT');
  await mongo.db(MONGODB_DB).collection('preferences').createIndex({userId:1},{unique:true});
  await mongo.db(MONGODB_DB).command({ping:1});
  console.log('PostgreSQL schema and MongoDB preferences index ready.');
} finally {
  await administrator.end();
  await mongo.close();
}
