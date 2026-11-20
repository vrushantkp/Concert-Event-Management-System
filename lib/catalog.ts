import { database } from './postgres';
export type Event = {
  id:number; title:string; artist:string; genre:string; venue:string; city:string;
  starts_at:string; upcoming:boolean; description:string; artwork:string; featured:boolean;
  price:number|null; bookings:number; doors_before_minutes:number|null; duration_minutes:number|null;
  venue_note:string|null; entry_note:string|null; is_demo:boolean;
};
export type Seat = {seat_id:number;section:string;distance:number;row_label:string;seat_no:number;accessible:boolean;category:string;price:number;state:'available'|'held'|'booked'|'unavailable'};
export const listing = `SELECT e.*, e.starts_at>statement_timestamp() AS upcoming, a.name AS artist, c.name AS genre, v.name AS venue,v.city,
  (SELECT min(price) FROM encore.ticket_category t WHERE t.event_id=e.id) AS price,
  encore.public_booking_count(e.id) AS bookings
  FROM encore.event e JOIN encore.artist a ON e.artist_id=a.id
  JOIN encore.category c ON e.category_id=c.id JOIN encore.venue v ON e.venue_id=v.id`;
export function listEvents() {
  return database(null, async c => (await c.query<Event>(listing+' WHERE e.starts_at>now() ORDER BY e.featured DESC,e.starts_at')).rows);
}
export function relatedEvents(event:Pick<Event,'id'|'artist'|'genre'|'city'>) {
  return database(null, async c => (await c.query<Event>(listing+`
    WHERE e.starts_at>now() AND e.id<>$1
    ORDER BY (a.name=$2) DESC, (c.name=$3) DESC, (v.city=$4) DESC, e.starts_at, e.id
    LIMIT 3
  `,[event.id,event.artist,event.genre,event.city])).rows);
}
export function eventDetails(id:number) {
  return database(null,async c => {
    const event = (await c.query<Event>(listing+' WHERE e.id=$1',[id])).rows[0];
    return event ? {event,seats:(await c.query<Seat>('SELECT * FROM encore.available_seats($1)',[id])).rows} : null;
  });
}
