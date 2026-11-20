import Link from 'next/link';
import { ArrowUpRight, Armchair, CalendarDays, MapPin, ScanLine, Search } from 'lucide-react';
import { listEvents } from '@/lib/catalog';
import { eventDate } from '@/lib/format';
import EventCard from '@/components/event-card';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const events = await listEvents();
  const featured = events.find(e => e.featured) ?? events[0];
  const lineup = events.slice(0,4);
  const trending = [...events].sort((a, b) => b.bookings - a.bookings).filter(e => e.bookings > 0).slice(0, 3);
  const genres = [...new Set(events.map(e => e.genre))];

  return <>
    <section className="shell home-intro">
      <div className={'concert-poster '+(featured?.artwork ?? 'ruby')}>
        <div className="poster-copy">
          {featured ? <>
            <p className="poster-label"><span/> Featured show <b aria-hidden="true">/</b> {featured.genre}</p>
            <h1>{featured.title}</h1>
            <p className="poster-artist">{featured.artist}</p>
            <div className="poster-facts">
              <span><CalendarDays size={17}/><time dateTime={new Date(featured.starts_at).toISOString()}>{eventDate(featured.starts_at)} IST</time></span>
              <span><MapPin size={17}/>{featured.venue}, {featured.city}</span>
            </div>
            <Link className="button poster-button" href={'/events/'+featured.id}>View show <ArrowUpRight size={18}/></Link>
          </> : <h1>Explore live music</h1>}
        </div>
      </div>
      <div className="lineup-search">
        <form className="hero-search" action="/events">
          <label className="search-field"><Search size={21}/><span className="sr-only">Search shows</span>
            <input type="search" name="q" placeholder="Artist, show or venue" maxLength={150}/>
          </label><button type="submit">Find events</button>
        </form>
        <nav className="genre-links" aria-label="Browse by genre">
          {genres.slice(0,5).map(genre=><Link key={genre} className="pill" href={'/events?genre='+encodeURIComponent(genre)}>{genre}</Link>)}
        </nav>
      </div>
    </section>

    <section className="shell page home-lineup">
      <div className="section-line"><div><h2>Upcoming shows</h2></div><Link className="button outline" href="/events">See all events</Link></div>
      <div className="cards lineup-cards" data-count={lineup.length}>{lineup.map(e => <EventCard key={e.id} event={e}/>)}</div>
      {!events.length && <p className="empty">No upcoming shows are listed yet.</p>}
    </section>
    {trending.length > 0 && <section className="shell page home-lineup"><h2>Trending</h2><div className="cards">{trending.map(e => <EventCard key={e.id} event={e}/>)}</div></section>}
    <section className="shell booking-guide" id="booking-guide">
      <div className="section-line"><h2>How booking works</h2><Link className="button outline" href="/events">Browse shows</Link></div>
      <div className="booking-steps">
        <div><div className="section-icon"><Search size={19}/></div><h3>Find a show</h3><p>Check the lineup, venue, and show times before choosing an event.</p></div>
        <div><div className="section-icon"><Armchair size={19}/></div><h3>Pick your seats</h3><p>Compare sections or find seats together, then place a five-minute hold.</p></div>
        <div><div className="section-icon"><ScanLine size={19}/></div><h3>Get your ticket</h3><p>Confirm your booking to get a QR ticket in your booking history.</p></div>
      </div>
    </section>
  </>;
}
