import Link from 'next/link';
import Image from 'next/image';
import Explorer from '@/components/explorer';
import { pageUser } from '@/lib/access';
import { examples } from '@/db/demo.mjs';
export default async function ExplorerPage() {
  await pageUser(['admin']);
  return <div className="shell page"><Link href="/workspace">Platform overview</Link><p className="eyebrow">DATABASE DEMONSTRATION</p><h1>DBMS Explorer</h1>
    <p>Use the predefined examples to inspect live database results.</p><Explorer examples={examples}/>
    <section className="panel dashboard-section"><h2>Relational design</h2>
      <Image src="/erd.png" width={1200} height={680} alt="Entity relationship diagram for Encore" style={{width:'100%',height:'auto'}}/>
      <p>Users own events or place bookings. A venue has sections and seats. Event inventory combines event and seat keys. A booking has line items that retain each seat price.</p>
      <p><code>db/001_schema.sql</code> defines keys, constraints and indexes. The Constraints example lists the keys visible to the database role.</p>
    </section><section className="panel dashboard-section"><h2>Booking transactions</h2>
      <p><code>db/002_booking.sql</code> contains the routines. Reserve the same event seat from two customer sessions to observe row locking and conflict handling. Confirm or cancel a booking, then open Trigger audit to see the stored status change.</p>
      <pre className="code">{'CALL encore.reserve_seats(event_id, seat_ids, NULL);\nCALL encore.confirm_booking(booking_id);\nCALL encore.cancel_booking(booking_id);'}</pre>
      <p>Revenue totals add confirmed booking line prices. Occupancy counts booked inventory and excludes blocked seats.</p>
    </section><section className="panel dashboard-section"><h2>MongoDB and access control</h2>
      <p>The preferences collection stores one flexible document per customer. Save, change or delete preferences in My Encore, then rerun the genre aggregation. PostgreSQL owns the seat inventory and booking records.</p>
      <p><code>db/003_security.sql</code> defines database roles and row policies. Sign in as different users to compare booking visibility and organizer ownership. The API selects the database role from the verified session.</p>
    </section>
  </div>;
}
