import Link from 'next/link';
import { pageUser } from '@/lib/access';
import { staffData } from '@/lib/staff';
import { bookings } from '@/lib/bookings';
import { eventDate,money } from '@/lib/format';
import { ArtistEditor,EventEditor,StaffAdministration } from '@/components/staff-forms';
export const dynamic='force-dynamic';
export default async function Workspace() {
  const user=await pageUser(['organizer','admin']);
  const [data,records]=await Promise.all([staffData(user),bookings(user)]);
  const admin=user.role==='admin';
  const revenue=data.events.reduce((total,e)=>total+Number(e.revenue),0);
  return <div className="shell page"><p className="eyebrow">{admin?'ADMINISTRATION':'ORGANIZER'}</p><h1>{admin?'Platform overview':'Your events'}</h1>
    <dl className="workspace-metrics">
      <div><dt>Published events</dt><dd>{data.events.filter(event=>event.published).length} <small>of {data.events.length}</small></dd></div>
      <div><dt>Confirmed bookings</dt><dd>{data.events.reduce((sum,event)=>sum+Number(event.bookings),0)}</dd></div>
      <div><dt>Confirmed booking value</dt><dd>{money(revenue)}</dd></div>
    </dl>
    {admin && <p><Link href="/workspace/explorer" className="button">DBMS Explorer</Link></p>}
    <div className="columns"><section className="panel"><h2>Create event</h2><EventEditor data={data}/></section><section className="panel"><h2>Artists</h2><ArtistEditor/><p>{data.artists.map(a=>a.name).join(' · ')||'No artists yet.'}</p></section></div>
    <section className="dashboard-section"><h2>Event inventory</h2>
      {!data.events.length&&<p className="empty">Create an event to populate your inventory.</p>}
      {data.events.map(e=><details key={e.id} className="panel"><summary>{e.title} · {e.published?'Published':'Draft'}</summary>
        <p>{eventDate(e.starts_at)} · {e.venue} · {e.available} available · {e.occupancy??0}% occupancy · {e.bookings} bookings · {money(e.revenue)}</p>
        <EventEditor data={data} event={e}/></details>)}
    </section>
    <section className="dashboard-section"><h2>Booking activity</h2>
      {records.length?<div className="table-scroll"><table><thead><tr><th>Event</th><th>Reference</th><th>Seats</th><th>Status</th><th>Value</th></tr></thead><tbody>
        {records.map(b=><tr key={b.id}><td>{b.title??b.event_id}</td><td>{b.id}</td><td>{b.seats.join(', ')}</td><td>{b.status}</td><td>{money(b.total)}</td></tr>)}
      </tbody></table></div>:<p className="empty">No booking activity yet.</p>}
    </section>
    {admin&&<StaffAdministration data={data} userId={user.id}/>}
  </div>;
}
