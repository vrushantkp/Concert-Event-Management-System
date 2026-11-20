import { database,type User } from './postgres';
import { examples } from '@/db/demo.mjs';
export type StaffData = Awaited<ReturnType<typeof staffData>>;
export function staffData(user:User) {
  return database(user, async c => ({
    events:(await c.query(`SELECT e.*,v.name AS venue,encore.occupancy(e.id) AS occupancy,encore.revenue(e.id) AS revenue,
      (SELECT count(*) FROM encore.available_seats(e.id) WHERE state='available') AS available,
      (SELECT count(*) FROM encore.booking WHERE event_id=e.id AND status='confirmed') AS bookings,
      (SELECT price FROM encore.ticket_category t WHERE t.event_id=e.id AND name='Standard') AS price,
      (SELECT price FROM encore.ticket_category t WHERE t.event_id=e.id AND name='Front Row') AS front_price
      FROM encore.event e JOIN encore.venue v ON v.id=e.venue_id ORDER BY e.starts_at`)).rows,
    venues:(await c.query('SELECT * FROM encore.venue ORDER BY name')).rows,
    artists:(await c.query('SELECT * FROM encore.artist ORDER BY name')).rows,
    categories:(await c.query('SELECT * FROM encore.category ORDER BY name')).rows,
    users:user.role==='admin'?(await c.query('SELECT id,name,email,role,enabled FROM encore.app_user ORDER BY id')).rows:[],
    sections:user.role==='admin'?(await c.query('SELECT * FROM encore.section ORDER BY venue_id,distance')).rows:[],
    seats:user.role==='admin'?(await c.query('SELECT * FROM encore.seat ORDER BY section_id,row_label,seat_no')).rows:[]
  }));
}
export function runExample(user:User,name:keyof typeof examples) {
  if(name==='DML lifecycle') {
    return database(user,async c=>{
      const rows:unknown[]=[];
      for(const command of examples[name].split('; ')) {
        const result=await c.query(command);
        rows.push({operation:result.command,affected:result.rowCount,rows:result.rows});
      }
      return {command:examples[name],rows};
    });
  }
  return database(user,async c=>({command:examples[name],rows:(await c.query(examples[name])).rows}));
}
