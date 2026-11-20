import Link from 'next/link';
import { ArrowUpRight, MapPin } from 'lucide-react';
import type { Event } from '@/lib/catalog';
import { eventDate, money } from '@/lib/format';

const day = new Intl.DateTimeFormat('en-IN', {day:'2-digit',timeZone:'Asia/Kolkata'});
const month = new Intl.DateTimeFormat('en-IN', {month:'short',timeZone:'Asia/Kolkata'});

export default function EventCard({event: e}: {event: Event}) {
  const date = new Date(e.starts_at);
  return <Link href={'/events/' + e.id} className="event-card">
    <div className="event-visual">
      <div className={'event-art ' + e.artwork}/>
      <div className="event-overlay">
        <span className="date-tile" aria-hidden="true"><strong>{day.format(date)}</strong><small>{month.format(date)}</small></span>
        <span className="genre-chip">{e.genre}</span>
      </div>
    </div>
    <div className="event-copy">
      <p className="event-date">{eventDate(e.starts_at)}</p>
      <h3>{e.title}</h3>
      <p className="event-artist">{e.artist}</p>
      <p className="event-location"><MapPin size={17}/> {e.venue}, {e.city}</p>
      <div className="event-card-footer"><strong>{e.price === null ? 'Tickets coming soon' : <><small>From </small>{money(e.price)}</>}</strong><span className="card-ticket" aria-hidden="true"><ArrowUpRight size={18}/></span></div>
    </div>
  </Link>;
}
