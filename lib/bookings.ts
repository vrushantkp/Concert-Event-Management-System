import { database,type User } from './postgres';
export type Booking = {id:string;event_id:number;title:string;starts_at:string;upcoming:boolean;status:string;expires_at:string;created_at:string;total:string;seats:string[]};
export function bookings(user:User, reference?:string) {
  return database(user,async c=>(await c.query<Booking>(`
    SELECT b.id,b.event_id,e.title,e.starts_at,coalesce(e.starts_at>statement_timestamp(),false) AS upcoming,
      CASE WHEN b.status='held' AND b.expires_at<=clock_timestamp() THEN 'expired' ELSE b.status::text END AS status,
      b.expires_at,b.created_at,encore.booking_total(b.id) AS total,
      ARRAY(SELECT x.name||' '||s.row_label||s.seat_no FROM encore.booking_seat bs
        JOIN encore.seat s ON s.id=bs.seat_id JOIN encore.section x ON x.id=s.section_id
        WHERE bs.booking_id=b.id ORDER BY x.name,s.row_label,s.seat_no) AS seats
    FROM encore.booking b LEFT JOIN encore.event e ON e.id=b.event_id
    WHERE ($1::uuid IS NULL OR b.id=$1::uuid) ORDER BY b.created_at DESC LIMIT 150
  `,[reference??null])).rows);
}
