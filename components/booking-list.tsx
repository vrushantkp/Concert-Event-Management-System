import Link from 'next/link';
import { CalendarDays, Ticket } from 'lucide-react';
import type { Booking } from '@/lib/bookings';
import { eventDate,money } from '@/lib/format';

export function BookingList({records}:{records:Booking[]}) {
  return records.length ? <div className="row-list">{records.map(b=><Link key={b.id} className="record" href={'/account/bookings/'+b.id}>
    <span className="section-icon record-icon"><Ticket size={21}/></span>
    <div className="record-main"><strong>{b.title??'Event '+b.event_id}</strong>
      <span><CalendarDays size={15}/> {b.starts_at?eventDate(b.starts_at):'Event details unavailable'}{b.seats.length>0 && ' · '+b.seats.join(', ')}</span>
      <small>Booked {eventDate(b.created_at)} · Ref {b.id.slice(0,8).toUpperCase()}</small></div>
    <div className="record-price"><span className="tag" data-status={b.status}>{b.status}</span><strong>{money(b.total)}</strong></div>
  </Link>)}</div> : <div className="empty book-empty"><Ticket size={20}/> <p>No bookings here yet.</p></div>;
}
