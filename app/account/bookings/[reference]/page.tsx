import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { CalendarDays, ScanLine, Ticket } from 'lucide-react';
import QRCode from 'qrcode';
import { z } from 'zod';
import { pageUser } from '@/lib/access';
import { bookings } from '@/lib/bookings';
import { eventDate,money } from '@/lib/format';
import BookingActions from '@/components/booking-actions';

export default async function BookingPage({params}:{params:Promise<{reference:string}>}) {
  const user = await pageUser(['customer']);
  const {reference} = await params;
  if (!z.uuid().safeParse(reference).success) notFound();
  const [booking] = await bookings(user,reference);
  if (!booking) notFound();
  const qr = booking.status === 'confirmed' ? await QRCode.toDataURL((process.env.APP_ORIGIN ?? 'http://localhost:3000')+'/ticket/'+booking.id) : null;
  return <div className="shell narrow page">
    <Link className="back-link" href="/account/bookings">Booking history</Link>
    <article className="panel booking-ticket">
      <header className="ticket-header"><p className="eyebrow">{qr ? 'DIGITAL TICKET' : 'YOUR RESERVATION'}</p><h1>{booking.title ?? 'Event '+booking.event_id}</h1></header>
      <span className="tag" data-status={booking.status}>{booking.status}</span>
      <div className="event-facts ticket-facts">
        {booking.starts_at && <span><CalendarDays size={17}/> {eventDate(booking.starts_at)}</span>}
        {booking.seats.length > 0 && <span><Ticket size={17}/> {booking.seats.join(', ')}</span>}
      </div>
      <p className="ticket-reference"><strong>Reference</strong><br/><span className="muted">{booking.id}</span></p>
      <p className="total">Total <strong>{money(booking.total)}</strong></p>
      {qr && <div className="ticket-frame"><Image className="ticket" src={qr} width={178} height={178} unoptimized alt="QR code for ticket verification"/>
        <div><strong>Booking verification</strong><br/><Link className="text-button" href={'/ticket/'+booking.id}><ScanLine size={17}/> Open ticket verification</Link></div></div>}
      <BookingActions id={booking.id} status={booking.status} expires={booking.expires_at} eligible={booking.upcoming}/>
    </article>
  </div>;
}
