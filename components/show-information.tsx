import { CalendarDays, Clock3, DoorOpen, MapPin, Music2, ScanLine, Ticket } from 'lucide-react';
import type { Event, Seat } from '@/lib/catalog';
import { eventDate, eventTime, money } from '@/lib/format';

export function ShowInformation({event}: {event: Event}) {
  const starts = new Date(event.starts_at);
  const doors = event.doors_before_minutes === null ? null : new Date(starts.getTime()-event.doors_before_minutes*60_000);
  return <div className="show-details">
    <section className="show-detail-block" id="overview">
      <h2>About the show</h2>
      <div className="show-story">{event.description.split(/\r?\n\s*\r?\n/).filter(Boolean).map((paragraph,i)=><p key={i}>{paragraph}</p>)}</div>
      <div className="show-artist"><div className="section-icon"><Music2 size={20}/></div>
        <div><span>Performing live</span><strong>{event.artist}</strong></div><span className="genre-chip">{event.genre}</span></div>
    </section>

    <section className="show-detail-block" id="schedule">
      <div className="heading-icon"><CalendarDays size={23}/><h2>Show schedule</h2></div>
      <p className="muted"><time dateTime={starts.toISOString()}>{eventDate(event.starts_at)}</time> IST</p>
      <dl className="show-schedule">
        {doors && <div><dt><DoorOpen size={17}/> Doors open</dt><dd><time dateTime={doors.toISOString()}>{eventTime(doors)}</time></dd></div>}
        <div><dt><Clock3 size={17}/> Show starts</dt><dd><time dateTime={starts.toISOString()}>{eventTime(starts)}</time></dd></div>
        {event.duration_minutes !== null && <div><dt>Estimated run time</dt><dd>{event.duration_minutes} min</dd></div>}
      </dl>
    </section>

    <section className="show-detail-block" id="venue">
      <div className="heading-icon"><MapPin size={23}/><h2>Venue &amp; entry</h2></div>
      <div className="show-venue">
        <div><h3>{event.venue}</h3><p>{event.venue_note || event.city}</p>
          {event.venue === 'PES University, Ring Road Campus' &&
            <a className="text-button" href="https://pes.edu/contact/" target="_blank" rel="noreferrer">Campus information</a>}
        </div>
        <div className="show-entry"><ScanLine size={20}/><p>{event.entry_note || 'Your digital ticket includes a booking reference and QR code.'}</p></div>
      </div>
    </section>
  </div>;
}

export function ShowTickets({event,seats,seatingOpen}: {event: Event;seats: Seat[];seatingOpen: boolean}) {
  const tiers = new Map<string, {price:number; sections:Set<string>}>();
  for(const seat of seats) {
    if(seat.state === 'unavailable') continue;
    const tier = tiers.get(seat.category);
    if(tier) {
      tier.sections.add(seat.section);
      tier.price=Math.min(tier.price,seat.price);
    } else {
      tiers.set(seat.category,{price:seat.price,sections:new Set([seat.section])});
    }
  }
  const availablePrices = seats.filter(seat => seat.state === 'available').map(seat => seat.price);
  const lowestPrice = availablePrices.reduce((lowest, price) => Math.min(lowest, price), Infinity);
  const categories=[...tiers].sort(([,a],[,b])=>a.price-b.price);
  return <aside className="panel show-tickets" aria-labelledby="show-tickets-heading">
    <div className="basket-heading"><div className="section-icon"><Ticket size={20}/></div><h2 id="show-tickets-heading">Tickets</h2></div>
    {seatingOpen ? <>
      <p className="ticket-start-price">{Number.isFinite(lowestPrice) ? <>From <strong>{money(lowestPrice)}</strong><span> per available seat</span></> : 'All seats are currently held, booked or unavailable.'}</p>
      {categories.length > 0 && <dl className="ticket-tiers">
        {categories.map(([name,{price,sections}])=><div key={name}><dt>{name}<small>{[...sections].join(' · ')}</small></dt><dd>{money(price)}</dd></div>)}
      </dl>}
      <a className="button show-book-button" href="#seats"><Ticket size={18}/> {availablePrices.length ? 'Book tickets' : 'View seat map'}</a>
      <p className="ticket-note">{event.is_demo ? 'Demo booking · No payment' : 'Reserved seating · Digital ticket'}</p>
    </> : <p className="muted">{event.upcoming ? 'Tickets are not available yet.' : 'This show has ended.'}</p>}
  </aside>;
}
