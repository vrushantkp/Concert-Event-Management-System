import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import '@fontsource-variable/manrope';
import '@fontsource-variable/space-grotesk';
import { currentUser } from '@/lib/auth';
import { EncoreBrand, Navigation } from '@/components/navigation';
import './styles.css';

export const metadata: Metadata = {
  title: 'Encore — Live events',
  description: 'Find your next live show and choose your seats.',
};
export const viewport: Viewport = { colorScheme: 'dark', themeColor: '#101112' };

export default async function Layout({children}: {children: React.ReactNode}) {
  const user = await currentUser();
  return <html lang="en"><body>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <Navigation role={user?.role}/>
    <main id="main-content">{children}</main>
    <footer className="site-footer"><div className="shell footer">
      <div className="footer-brand"><EncoreBrand/><p>Find your next live show, choose your seats, and keep your tickets in one place.</p></div>
      <nav className="footer-links" aria-label="Explore Encore">
        <strong>Discover</strong><Link href="/events">All events</Link><Link href="/events?city=Bengaluru">Shows in Bengaluru</Link>
      </nav>
      <nav className="footer-links" aria-label="Booking links">
        <strong>Tickets</strong><Link href="/#booking-guide">How booking works</Link><Link href="/account/bookings">Booking history</Link>
      </nav>
    </div></footer>
  </body></html>;
}
