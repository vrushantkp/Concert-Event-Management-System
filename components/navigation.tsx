'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioLines, CircleUserRound, Compass } from 'lucide-react';
import type { Role } from '@/lib/postgres';
import { Logout } from './actions';

export function EncoreBrand() {
  return <Link className="brand" href="/" aria-label="Encore home">
    <span className="brand-mark"><AudioLines size={21} strokeWidth={2.5}/></span>
    <span>encore<span className="brand-period">.</span></span>
  </Link>;
}

export function Navigation({role}: {role?: Role}) {
  const path = usePathname();
  const customer = role === 'customer';
  const accountPath = customer ? '/account' : '/workspace';
  const explore = path.startsWith('/events');
  const account = path.startsWith(accountPath);
  return <header className="top"><nav className="shell nav" aria-label="Main navigation">
    <EncoreBrand/>
    <div className="nav-main">
      <Link className="nav-link nav-events" data-active={explore} aria-current={explore ? 'location' : undefined} href="/events"><Compass size={17}/> <span>Explore events</span></Link>
    </div>
    <div className="nav-account">{role ? <>
      <Link className="nav-link" data-active={account} aria-current={account ? 'location' : undefined} href={accountPath}><CircleUserRound size={17}/> <span>{customer ? 'My Encore' : 'Workspace'}</span></Link>
      <Logout/>
    </> : <Link className="button outline" href="/sign-in"><CircleUserRound size={17}/> Sign in</Link>}</div>
  </nav></header>;
}
