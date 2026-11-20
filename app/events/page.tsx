import { listEvents } from '@/lib/catalog';
import EventDiscovery from '@/components/event-discovery';

export const dynamic = 'force-dynamic';

export default async function Events({searchParams}: {searchParams: Promise<Record<string,string|string[]|undefined>>}) {
  const input = await searchParams;
  const entries = Object.entries(input).filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  const key = new URLSearchParams(entries).toString();
  const events = await listEvents();

  return <section className="shell page discovery">
    <header className="page-intro"><h1>Explore events</h1></header>
    <EventDiscovery key={key} events={events} query={key}/>
  </section>;
}
