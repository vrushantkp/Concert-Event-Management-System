import Link from 'next/link';
import { pageUser } from '@/lib/access';
import { bookings } from '@/lib/bookings';
import { BookingList } from '@/components/booking-list';
export default async function History() {
  const user=await pageUser(['customer']);
  const records=await bookings(user);
  const upcoming=records.filter(b=>b.upcoming&&['held','confirmed'].includes(b.status));
  const other=records.filter(b=>!upcoming.includes(b));
  return <div className="shell page"><Link href="/account">My Encore</Link><h1>Booking history</h1>
    <section className="dashboard-section"><h2>Upcoming</h2><BookingList records={upcoming}/></section>
    <section className="dashboard-section"><h2>Past and closed</h2><BookingList records={other}/></section>
  </div>;
}
