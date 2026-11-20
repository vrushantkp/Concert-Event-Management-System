import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import { MongoClient } from 'mongodb';
import { randomUUID } from 'node:crypto';
import { examples } from '../db/demo.mjs';

const config={connectionString:process.env.DATABASE_URL};
const owner=new pg.Pool({connectionString:process.env.MIGRATION_DATABASE_URL});
const runtime=new pg.Pool(config);
let customers=[];
let staff;
let eventId;
let seatId;
async function as(role,who,work) {
  const client=await runtime.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE encore_'+role);
    await client.query("SELECT set_config('encore.actor',$1,true)",[String(who??'')]);
    const result=await work(client);
    await client.query('COMMIT');
    return result;
  } catch(error){await client.query('ROLLBACK');throw error}
  finally{client.release()}
}
const hold=(who,id,seat)=>as('customer',who,async c=>(await c.query('CALL encore.reserve_seats($1,$2,NULL)',[id,[seat]])).rows[0].reference);
const change=(who,method,ref)=>as('customer',who,c=>c.query('CALL encore.'+method+'($1)',[ref]));

test('PostgreSQL transactions, functions, audit, constraints and RLS',async t=>{
  const suffix=randomUUID();
  const created=await owner.query(
    "INSERT INTO encore.app_user(email,name,password_hash,role) VALUES($1,'Integration One','disabled-test-password','customer'),($2,'Integration Two','disabled-test-password','customer'),($3,'Integration Organizer','disabled-test-password','organizer') RETURNING id",
    ['one-'+suffix+'@test.invalid','two-'+suffix+'@test.invalid','staff-'+suffix+'@test.invalid']
  );
  customers=created.rows.slice(0,2).map(r=>r.id);staff=created.rows[2].id;
  const existing=(await owner.query('SELECT * FROM encore.event ORDER BY id LIMIT 1')).rows[0];
  eventId=(await owner.query(
    "INSERT INTO encore.event(organizer_id,venue_id,category_id,artist_id,title,description,starts_at,published) VALUES($1,$2,$3,$4,$5,'Integration test fixture',now()+interval '7 days',true) RETURNING id",
    [staff,existing.venue_id,existing.category_id,existing.artist_id,'Integration '+suffix]
  )).rows[0].id;
  await as('organizer',staff,c=>c.query('CALL encore.initialize_inventory($1,$2)',[eventId,1000]));
  const selectable=(await as('guest',null,c=>c.query('SELECT * FROM encore.available_seats($1)',[eventId]))).rows;
  seatId=selectable[0].seat_id;
  let winner;
  let reference;
  await t.test('two simultaneous attempts result in exactly one hold',async()=>{
    const result=await Promise.allSettled(customers.map(u=>hold(u,eventId,seatId)));
    assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
    const i=result.findIndex(r=>r.status==='fulfilled');
    winner=customers[i];reference=result[i].value;
    assert.equal(result[1-i].reason.code,'P0001');
    const persisted=await owner.query('SELECT holder FROM encore.event_seat WHERE event_id=$1 AND seat_id=$2',[eventId,seatId]);
    assert.equal(persisted.rows[0].holder,reference);
  });
  await t.test('booking isolation, confirmation, analytics, cancellation, and audit',async()=>{
    const other=customers.find(u=>u!==winner);
    assert.equal((await as('customer',other,c=>c.query('SELECT id FROM encore.booking WHERE id=$1',[reference]))).rowCount,0);
    await assert.rejects(change(other,'confirm_booking',reference),{code:'42501'});
    await change(winner,'confirm_booking',reference);
    const totals=(await as('organizer',staff,c=>c.query('SELECT encore.revenue($1) AS revenue,encore.occupancy($1) AS occupied',[eventId]))).rows[0];
    assert.equal(Number(totals.revenue),selectable[0].price);
    assert.ok(Number(totals.occupied)>0);
    const proof=(await as('guest',null,c=>c.query('SELECT valid FROM encore.verify_ticket($1)',[reference]))).rows[0];
    assert.equal(proof.valid,true);
    await change(winner,'cancel_booking',reference);
    assert.deepEqual((await owner.query('SELECT new_status FROM encore.audit_log WHERE booking_id=$1 ORDER BY id',[reference])).rows.map(r=>r.new_status),['held','confirmed','cancelled']);
  });
  await t.test('expired holds are reusable and rejected at confirmation',async()=>{
    const old=await hold(customers[0],eventId,seatId);
    await owner.query("UPDATE encore.booking SET expires_at=now()-interval '1 second' WHERE id=$1",[old]);
    await assert.rejects(change(customers[0],'confirm_booking',old),{code:'P0001'});
    const {rows:[admin]}=await owner.query("SELECT id FROM encore.app_user WHERE role='admin' LIMIT 1");
    await as('admin',admin.id,c=>c.query(examples['Expire holds']));
    assert.equal((await owner.query('SELECT status FROM encore.booking WHERE id=$1',[old])).rows[0].status,'expired');
    assert.ok(await hold(customers[1],eventId,seatId));
  });
  await t.test('roles, constraints and example queries',async()=>{
    assert.equal((await as('organizer',staff,c=>c.query('SELECT id FROM encore.event WHERE id=$1',[existing.id]))).rowCount,0);
    assert.equal((await as('organizer',staff,c=>c.query("UPDATE encore.event SET title='disallowed' WHERE id=$1",[existing.id]))).rowCount,0);
    await assert.rejects(as('customer',customers[0],c=>c.query("INSERT INTO encore.venue(name,city) VALUES('x','x')")),{code:'42501'});
    await assert.rejects(owner.query("INSERT INTO encore.seat(venue_id,section_id,row_label,seat_no) VALUES(1,1,'X',0)"),{code:'23514'});
    for(const [name,sql] of Object.entries(examples)) if(name!=='Expire holds') await owner.query(sql);
  });
}).finally(async()=>{
  if(eventId){
    await owner.query('DELETE FROM encore.audit_log WHERE booking_id IN (SELECT id FROM encore.booking WHERE event_id=$1)',[eventId]);
    await owner.query('UPDATE encore.event_seat SET holder=NULL WHERE event_id=$1',[eventId]);
    for(const table of ['booking_seat','event_seat','booking','ticket_category']) await owner.query('DELETE FROM encore.'+table+' WHERE event_id=$1',[eventId]);
    await owner.query('DELETE FROM encore.event WHERE id=$1',[eventId]);
  }
  await owner.query('DELETE FROM encore.app_user WHERE id=ANY($1)',[[...customers,staff].filter(Boolean)]);
  await owner.end();await runtime.end();
});

test('MongoDB persists, updates, aggregates and deletes real preferences',async()=>{
  const client=new MongoClient(process.env.MONGODB_URI);
  const coll=client.db(process.env.MONGODB_DB||'encore').collection('preferences');
  const userId=-Date.now();
  try {
    await coll.insertOne({userId,genres:['Integration Jazz'],budget:1000});
    assert.equal((await coll.findOne({userId})).budget,1000);
    await assert.rejects(coll.insertOne({userId}),error=>error.code===11000);
    await coll.updateOne({userId},{$set:{budget:2500}});
    const [result]=await coll.aggregate([{$match:{userId}},{$group:{_id:null,total:{$sum:'$budget'}}}]).toArray();
    assert.equal(result.total,2500);
    assert.equal((await coll.deleteOne({userId})).deletedCount,1);
    assert.equal(await coll.findOne({userId}),null);
  } finally {await coll.deleteOne({userId});await client.close()}
});
