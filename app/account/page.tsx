import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Bookmark, CalendarDays, Compass, History, Settings2, Ticket } from 'lucide-react';
import { pageUser } from '@/lib/access';
import { bookings } from '@/lib/bookings';
import { database } from '@/lib/postgres';
import { listEvents } from '@/lib/catalog';
import { preferences } from '@/lib/mongo';
import { BookingList } from '@/components/booking-list';
import PreferenceForm from '@/components/preferences';
import EventCard from '@/components/event-card';

export const dynamic = 'force-dynamic';

export default async function Account() {
  const user = await pageUser();
  if (user.role !== 'customer') redirect('/workspace');
  const [records,activity,events,profile] = await Promise.all([
    bookings(user),database(user,async c=>(await c.query('SELECT * FROM encore.event_activity ORDER BY viewed_at DESC NULLS LAST')).rows),
    listEvents(),preferences().findOne({userId:user.id}),
  ]);
  const recommended = events.filter(e=>profile?.genres.some(g=>g.toLowerCase()===e.genre.toLowerCase())||profile?.categories.some(g=>g.toLowerCase()===e.genre.toLowerCase())||profile?.artists.some(a=>a.toLowerCase()===e.artist.toLowerCase())).filter(e=>profile?.budget == null||(e.price!==null&&e.price<=profile.budget));
  const saved = events.filter(e=>activity.some(a=>a.event_id===e.id&&a.saved));
  const viewed = activity.map(a=>a.viewed_at?events.find(e=>e.id===a.event_id):undefined).filter(e=>e!==undefined).slice(0,3);
  const upcoming = records.filter(b=>b.status==='confirmed'&&b.upcoming).slice(0,4);

  return <div className="shell page dashboard">
    <header className="account-banner"><div><p className="eyebrow">MY ENCORE</p><h1>Welcome, {user.name}</h1><p className="muted">{user.email}</p></div>
      <div className="actions"><Link className="button" href="/events"><Compass size={18}/> Browse events</Link><Link className="button outline" href="/account/bookings"><History size={18}/> Booking history</Link></div>
    </header>
    <nav className="account-links" aria-label="Account sections">
      <a className="pill" href="#upcoming"><CalendarDays size={17}/> Upcoming</a><a className="pill" href="#saved"><Bookmark size={17}/> Saved shows</a>
      <a className="pill" href="#preferences"><Settings2 size={17}/> Preferences</a>
    </nav>
    <section className="dashboard-section" id="upcoming"><div className="heading-icon"><Ticket size={23}/><h2>Upcoming bookings</h2></div><BookingList records={upcoming}/></section>
    <section className="dashboard-section"><div className="heading-icon"><History size={23}/><h2>Recent activity</h2></div><BookingList records={records.slice(0,3)}/></section>
    {([['saved','Saved shows',saved],['recommended','Recommended for you',recommended],['recent','Recently viewed',viewed]] as const).map(([id,title,items])=><section key={id} className="dashboard-section" id={id}>
      <h2>{title}</h2>{items.length ? <div className="cards">{items.map(e=><EventCard key={e.id} event={e}/>)}</div> :
      <div className="empty"><p>{id==='recommended'?(profile ? 'No upcoming shows match your preferences and budget.' : 'Add event preferences to see matching shows.'):'No events in this list yet.'}</p>
        {id==='recommended' && <a className="text-button" href="#preferences">Set event preferences</a>}</div>}
    </section>)}
    <section className="panel dashboard-section" id="preferences"><div className="heading-icon"><Settings2 size={23}/><h2>Event preferences</h2></div>
      <PreferenceForm defaults={profile?{genres:profile.genres,artists:profile.artists,categories:profile.categories,section:profile.section,budget:profile.budget,accessible:profile.accessible}:null}/>
    </section>
  </div>;
}
