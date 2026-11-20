import { notFound } from 'next/navigation';
import { z } from 'zod';
import { database } from '@/lib/postgres';
import { eventDate } from '@/lib/format';
export const dynamic='force-dynamic';
export default async function Ticket({params}:{params:Promise<{reference:string}>}) {
  const {reference}=await params;
  if(!z.uuid().safeParse(reference).success)notFound();
  const ticket=await database(null,async c=>(await c.query('SELECT * FROM encore.verify_ticket($1)',[reference])).rows[0]);
  if(!ticket)notFound();
  return <div className="shell narrow page"><div className="panel"><p className="eyebrow">TICKET VERIFICATION</p><h1>{ticket.valid?'Confirmed ticket':'Inactive ticket'}</h1><p>{ticket.title} · {eventDate(ticket.starts_at)}</p><p>{reference}</p></div></div>;
}
