import { NextResponse } from 'next/server';
import { randomInt } from 'node:crypto';
import { z } from 'zod';
import { currentUser,hashPassword,verifyPassword,startSession,endSession } from '@/lib/auth';
import { database,identity,type Role } from '@/lib/postgres';
import { preferences } from '@/lib/mongo';
import { eventDetails } from '@/lib/catalog';
import { bookings } from '@/lib/bookings';
import { recommend } from '@/lib/recommend';
import { runExample } from '@/lib/staff';
import { examples } from '@/db/demo.mjs';
export const runtime = 'nodejs';
type Context = {params:Promise<{action:string}>};
class HttpError extends Error { constructor(readonly status:number,message:string){super(message)} }
const id=z.number().int().positive().max(2147483647);
const text=z.string().trim().min(1).max(100);
const role=z.enum(['customer','organizer','admin']);
const reference=z.uuid();
const credentials=z.object({email:z.email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(128)});
const prefSchema=z.object({genres:z.array(text).max(15),artists:z.array(text).max(15),categories:z.array(text).max(15),section:z.string().trim().max(100),budget:z.number().int().nonnegative().max(1000000),accessible:z.boolean()});
const eventSchema=z.object({
  eventId:id.optional(),venueId:id,artistId:id,categoryId:id,title:text,description:z.string().trim().min(1).max(3000),
  startsAt:z.iso.datetime(),published:z.boolean(),featured:z.boolean(),artwork:z.enum(['ruby','indigo','amber','violet']),
  price:z.number().int().nonnegative().max(1000000),
  frontPrice:z.number().int().min(0).max(1000500).optional(),
  details:z.object({
    doorsBefore:z.number().int().min(0).max(180).nullable(),
    duration:z.number().int().min(15).max(600).nullable(),
    venueNote:z.string().trim().max(600),
    entryNote:z.string().trim().max(600),
    demo:z.boolean()
  }).optional()
});
const respond=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
async function required(roles:Role[]) {
  const user=await currentUser();
  if(!user) throw new HttpError(401,'Sign in to continue.');
  if(!roles.includes(user.role)) throw new HttpError(403,'This area requires a different account role.');
  return user;
}
function failure(error:unknown) {
  if(error instanceof HttpError) return respond({error:error.message},error.status);
  if(error instanceof z.ZodError) return respond({error:error.issues.map(i=>i.message).join(' · ')},400);
  if(error instanceof SyntaxError) return respond({error:'Send a valid JSON request.'},400);
  const code=(error as {code?:string})?.code;
  if(code==='42501') return respond({error:'You do not have access to this operation.'},403);
  if(code==='P0001' && error instanceof Error) return respond({error:error.message},409);
  if(code==='23505') return respond({error:'That record already exists.'},409);
  if(code==='23503'||code==='23514') return respond({error:'The change conflicts with related database records.'},409);
  console.error('Encore API',error instanceof Error ? error.message : error);
  return respond({error:'The service could not finish the request. Please try again.'},503);
}
export async function GET(req:Request,ctx:Context) {
  try {
    const {action}=await ctx.params;
    if(action==='inventory') {
      const data=await eventDetails(id.parse(Number(new URL(req.url).searchParams.get('eventId'))));
      if(!data) throw new HttpError(404,'Event not found.');
      return respond(data.seats);
    }
    if(action==='preferences') {
      const user=await required(['customer']);
      return respond(await preferences().findOne({userId:user.id},{projection:{_id:0}}));
    }
    throw new HttpError(404,'Unknown endpoint.');
  } catch(error){return failure(error)}
}
export async function POST(req:Request,ctx:Context) {
  try {
    if(req.headers.get('origin')!==(process.env.APP_ORIGIN || new URL(req.url).origin)) throw new HttpError(403,'Request origin did not match the application.');
    const {action}=await ctx.params;
    const data:unknown=await req.json();
    if(action==='register') {
      const {email,password,name}=credentials.extend({name:text}).parse(data);
      const hash=await hashPassword(password);
      const {rows:[result]}=await identity.query('SELECT encore.register_customer($1,$2,$3) AS id',[email,name,hash]);
      await startSession(result.id);
      return respond({role:'customer'},201);
    }
    if(action==='login') {
      const {email,password}=credentials.parse(data);
      const {rows:[record]}=await identity.query('SELECT * FROM encore.login_record($1)',[email]);
      if(!await verifyPassword(password,record?.password_hash)) throw new HttpError(401,'Email or password is incorrect.');
      await startSession(record.id);
      return respond({signedIn:true});
    }
    if(action==='logout') {await endSession();return respond({signedOut:true})}
    if(action==='demo'||action==='mongo-demo') {
      const user=await required(['admin']);
      if(action==='mongo-demo') {
        const {mode}=z.object({mode:z.enum(['aggregate','crud']).default('aggregate')}).parse(data);
        if(mode==='crud') {
          const collection=preferences();
          const userId=-randomInt(1,2**47);
          const {insertedId}=await collection.insertOne({userId,genres:['Jazz'],artists:[],categories:[],section:'Balcony',budget:2500,accessible:false,updatedAt:new Date()});
          try {
            const initial=await collection.findOne({_id:insertedId});
            await collection.updateOne({_id:insertedId},{$set:{budget:3000}});
            const updated=await collection.findOne({_id:insertedId});
            const {deletedCount}=await collection.deleteOne({_id:insertedId});
            return respond({command:"db.preferences.insertOne(document)\ndb.preferences.findOne({ _id })\ndb.preferences.updateOne({ _id }, { $set: { budget: 3000 } })\ndb.preferences.findOne({ _id })\ndb.preferences.deleteOne({ _id })",rows:[{initial,updated,deletedCount,retrievedAfterDelete:await collection.findOne({_id:insertedId})}]});
          } finally {await collection.deleteOne({_id:insertedId})}
        }
        const rows=await preferences().aggregate([
          {$unwind:'$genres'},{$group:{_id:'$genres',profiles:{$sum:1}}},{$sort:{profiles:-1}},{$limit:20}
        ]).toArray();
        return respond({command:"db.preferences.aggregate([{ $unwind: '$genres' }, { $group: { _id: '$genres', profiles: { $sum: 1 } } }, { $sort: { profiles: -1 } }, { $limit: 20 }])",rows});
      }
      const {name}=z.object({name:z.enum(Object.keys(examples) as [keyof typeof examples,...(keyof typeof examples)[]])}).parse(data);
      return respond(await runExample(user,name));
    }
    if(action==='event') {
      const user=await required(['organizer','admin']);
      const e=eventSchema.parse(data);
      const eventId=await database(user,async c=>{
        const values=[e.title,e.description,e.startsAt,e.artistId,e.categoryId,e.published,e.featured,e.artwork,e.venueId];
        const result=e.eventId?await c.query(
          'UPDATE encore.event SET title=$1,description=$2,starts_at=$3,artist_id=$4,category_id=$5,published=$6,featured=$7,artwork=$8 WHERE venue_id=$9 AND id=$10 RETURNING id',
          [...values,e.eventId]
        ):await c.query(
          'INSERT INTO encore.event(title,description,starts_at,artist_id,category_id,published,featured,artwork,venue_id,organizer_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id',
          [...values,user.id]
        );
        if(!result.rowCount) throw new HttpError(404,'Event unavailable. The venue is fixed after creation.');
        if(e.details) {
          const {doorsBefore,duration,venueNote,entryNote,demo}=e.details;
          await c.query(`UPDATE encore.event
            SET doors_before_minutes=$2,duration_minutes=$3,venue_note=$4,entry_note=$5,is_demo=$6
            WHERE id=$1`,[result.rows[0].id,doorsBefore,duration,venueNote||null,entryNote||null,demo]);
        }
        await c.query('CALL encore.configure_inventory($1,$2,$3)',[result.rows[0].id,e.price,e.frontPrice ?? e.price+500]);
        return result.rows[0].id;
      });
      return respond({eventId});
    }
    if(action==='artist') {
      const user=await required(['organizer','admin']);
      const {name}=z.object({name:text}).parse(data);
      await database(user,c=>c.query('SELECT encore.add_artist($1)',[name]));
      return respond({saved:true});
    }
    if(action==='user'||action==='venue'||action==='section'||action==='seat') {
      const user=await required(['admin']);
      await database(user,async c=>{
        if(action==='user') {
          const v=z.object({id,role,enabled:z.boolean()}).parse(data);
          if(v.id===user.id) throw new HttpError(400,'Use another administrator account to change this account.');
          await c.query('UPDATE encore.app_user SET role=$2,enabled=$3 WHERE id=$1',[v.id,v.role,v.enabled]);
        } else if(action==='venue') {
          const v=z.object({id:id.optional(),name:text,city:text}).parse(data);
          if(v.id) await c.query('UPDATE encore.venue SET name=$2,city=$3 WHERE id=$1',[v.id,v.name,v.city]);
          else await c.query('INSERT INTO encore.venue(name,city) VALUES($1,$2)',[v.name,v.city]);
        } else if(action==='section') {
          const v=z.object({id:id.optional(),venueId:id,name:text,distance:id}).parse(data);
          if(v.id) await c.query('UPDATE encore.section SET name=$2,distance=$3 WHERE id=$1 AND venue_id=$4',[v.id,v.name,v.distance,v.venueId]);
          else await c.query('INSERT INTO encore.section(venue_id,name,distance) VALUES($1,$2,$3)',[v.venueId,v.name,v.distance]);
        } else {
          const v=z.object({id:id.optional(),venueId:id,sectionId:id,row:text.max(4),number:id,accessible:z.boolean()}).parse(data);
          if(v.id) await c.query('UPDATE encore.seat SET row_label=$2,seat_no=$3,accessible=$4 WHERE id=$1 AND venue_id=$5 AND section_id=$6',[v.id,v.row,v.number,v.accessible,v.venueId,v.sectionId]);
          else await c.query('INSERT INTO encore.seat(venue_id,section_id,row_label,seat_no,accessible) VALUES($1,$2,$3,$4,$5)',[v.venueId,v.sectionId,v.row,v.number,v.accessible]);
        }
      });
      return respond({saved:true});
    }
    const user=await required(['customer']);
    if(action==='reserve'||action==='recommend') {
      if(action==='reserve') {
        const {eventId,seats}=z.object({eventId:id,seats:z.array(id).min(1).max(8)}).parse(data);
        const bookingId=await database(user,async c=>(await c.query('CALL encore.reserve_seats($1,$2,NULL)',[eventId,seats])).rows[0].reference);
        return respond({bookingId},201);
      }
      const {eventId,...criteria}=z.object({eventId:id,count:z.number().int().min(1).max(8),section:z.string().max(100),distance:id.max(1000),budget:z.number().int().nonnegative().max(1000000),accessible:z.boolean()}).parse(data);
      const event=await eventDetails(eventId);
      if(!event) throw new HttpError(404,'Event not found.');
      return respond(recommend(event.seats,criteria));
    }
    if(action==='confirm'||action==='cancel') {
      const {bookingId}=z.object({bookingId:reference}).parse(data);
      const sql=action==='confirm'?'CALL encore.confirm_booking($1)':'CALL encore.cancel_booking($1)';
      await database(user,c=>c.query(sql,[bookingId]));
      return respond((await bookings(user,bookingId))[0]);
    }
    if(action==='preferences') {
      const value=prefSchema.parse(data);
      await preferences().updateOne({userId:user.id},{$set:{...value,updatedAt:new Date()},$setOnInsert:{userId:user.id}},{upsert:true});
      return respond({saved:true});
    }
    if(action==='delete-preferences') {
      await preferences().deleteOne({userId:user.id});
      return respond({deleted:true});
    }
    if(action==='save-event'||action==='view-event') {
      const {eventId,saved}=z.object({eventId:id,saved:z.boolean().optional()}).parse(data);
      await database(user,async c=>{
        const found=await c.query('SELECT 1 FROM encore.event WHERE id=$1',[eventId]);
        if(!found.rowCount) throw new HttpError(404,'Event not found.');
        if(action==='save-event') await c.query('INSERT INTO encore.event_activity(user_id,event_id,saved) VALUES($1,$2,$3) ON CONFLICT(user_id,event_id) DO UPDATE SET saved=EXCLUDED.saved',[user.id,eventId,saved??true]);
        else await c.query('INSERT INTO encore.event_activity(user_id,event_id,viewed_at) VALUES($1,$2,now()) ON CONFLICT(user_id,event_id) DO UPDATE SET viewed_at=EXCLUDED.viewed_at',[user.id,eventId]);
      });
      return respond({saved});
    }
    throw new HttpError(404,'Unknown endpoint.');
  } catch(error){return failure(error)}
}
