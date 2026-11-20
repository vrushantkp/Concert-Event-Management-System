import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Music2, Ticket } from 'lucide-react';
import { eventDetails, relatedEvents } from '@/lib/catalog';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/postgres';
import { preferences } from '@/lib/mongo';
import { eventDate } from '@/lib/format';
import EventCard from '@/components/event-card';
import SeatMap from '@/components/seat-map';
import { SaveEvent } from '@/components/actions';
import { ShowInformation, ShowTickets } from '@/components/show-information';

export const dynamic = 'force-dynamic';

export default async function Details({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{seats?:string}>}) {
  const {id} = await params;
  const {seats:selection} = await searchParams;
  const eventId = Number(id);
  if(!/^\d+$/.test(id) || eventId < 1 || eventId > 2147483647) notFound();
  const [result,user] = await Promise.all([eventDetails(eventId),currentUser()]);
  if(!result) notFound();
  const {event,seats} = result;
  const customer = user?.role === 'customer' ? user : null;
  const [saved,pref,recommended] = await Promise.all([
    customer ? database(customer,async c=>{
      const row=(await c.query('INSERT INTO encore.event_activity(user_id,event_id,viewed_at) VALUES($1,$2,now()) ON CONFLICT(user_id,event_id) DO UPDATE SET viewed_at=EXCLUDED.viewed_at RETURNING saved',[customer.id,eventId])).rows[0];
      return row.saved as boolean;
    }) : false,
    customer ? preferences().findOne({userId:customer.id}) : null,
    relatedEvents(event),
  ]);
  const seatingOpen = event.upcoming && seats.length > 0;
  const initialSeats = typeof selection === 'string' && /^\d{1,10}(?:,\d{1,10}){0,7}$/.test(selection)
    ? [...new Set(selection.split(',').map(Number))].filter(id => seats.some(seat => seat.seat_id === id && seat.state === 'available')) : [];

  return <>
    <section className={'detail-hero '+event.artwork}><div className="shell detail-inner">
      <Link className="back-link" href="/events">All events</Link>
      <div className="show-labels"><p className="eyebrow">{event.genre}</p>{event.is_demo && <span className="tag">Demo show</span>}</div>
      <h1>{event.title}</h1>
      <div className="event-facts">
        <span><Music2 size={18}/> {event.artist}</span>
        <span><MapPin size={18}/> {event.venue}, {event.city}</span>
        <span><CalendarDays size={18}/> <time dateTime={new Date(event.starts_at).toISOString()}>{eventDate(event.starts_at)}</time></span>
      </div>
      <div className="actions detail-actions">{seatingOpen && <a className="button" href="#seats"><Ticket size={19}/> {seats.some(seat => seat.state === 'available') ? 'Book tickets' : 'View seat map'}</a>}
        {customer && <SaveEvent id={eventId} initial={saved}/>}</div>
    </div></section>

    <div className="shell page show-page">
      <nav className="show-nav" aria-label="Show sections">
        <a href="#overview">Overview</a><a href="#schedule">Schedule</a><a href="#venue">Venue &amp; entry</a>
        {recommended.length > 0 && <a href="#recommended-shows">Recommended shows</a>}
      </nav>
      <div className="show-main-grid"><ShowInformation event={event}/><ShowTickets event={event} seats={seats} seatingOpen={seatingOpen}/></div>
      {seatingOpen && <SeatMap key={eventId} eventId={eventId} seats={seats} initialSeats={initialSeats} canBook={!!customer} guest={!user}
        defaults={pref ? {budget:pref.budget,section:pref.section,accessible:pref.accessible} : undefined}/>}
      {recommended.length > 0 && <section className="show-related" id="recommended-shows">
        <div className="section-line"><div><h2>Recommended shows</h2><p className="muted">More live events, with similar artists, genres and cities first.</p></div>
          <Link className="button outline" href="/events">See all events</Link></div>
        <div className="cards">{recommended.map(show=><EventCard key={show.id} event={show}/>)}</div>
      </section>}
    </div>
  </>;
}
