import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Headphones } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import AuthForm from '@/components/auth-form';

export default async function SignIn({searchParams}:{searchParams:Promise<{next?:string}>}) {
  const {next} = await searchParams;
  const path = typeof next === 'string' && /^\/events\/\d{1,10}(?:\?seats=\d{1,10}(?:,\d{1,10}){0,7})?(?:#seats)?$/.test(next) ? next : '/account';
  if(await currentUser()) redirect(path);

  return <div className="shell page auth-page">
    <div className="auth-photo ruby"><div><Headphones size={28}/><strong>Get closer to<br/>the music.</strong><Link href="/events" className="button outline">Browse upcoming shows</Link></div></div>
    <AuthForm next={path}/>
  </div>;
}
