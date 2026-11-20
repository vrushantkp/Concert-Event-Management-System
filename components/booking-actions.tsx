'use client';
import { useEffect,useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Clock3, LoaderCircle } from 'lucide-react';
import { api } from './actions';

export default function BookingActions({id,status,expires,eligible}:{id:string;status:string;expires:string;eligible:boolean}) {
  const [seconds,setSeconds] = useState<number|null>(null);
  const [message,setMessage] = useState('');
  const [pending,setPending] = useState<'confirm'|'cancel'|null>(null);
  const router = useRouter();

  useEffect(()=>{
    if(status!=='held') return;
    const tick = ()=>setSeconds(Math.max(0,Math.ceil((Date.parse(expires)-Date.now())/1000)));
    tick();
    const timer = setInterval(tick,1000);
    return ()=>clearInterval(timer);
  },[status,expires]);

  async function action(key:'confirm'|'cancel') {
    if(key === 'cancel' && !confirm('Cancel this booking and release the seats?')) return;
    setPending(key);
    setMessage('');
    try {
      await api(key,{bookingId:id});
      setMessage(key === 'confirm' ? 'Booking confirmed.' : 'Booking cancelled.');
      router.refresh();
    } catch(e) {
      setMessage((e as Error).message);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  const timerText = seconds === null ? 'Checking hold time…' : seconds === 0 ? 'This hold has expired.' :
    'Hold expires in '+Math.floor(seconds/60)+':'+String(seconds%60).padStart(2,'0');
  return <div className="stack">
    {status === 'held' && <>
      <div className="booking-timer"><p><Clock3 size={18}/> {timerText}</p>
        <progress max={300} value={Math.min(seconds ?? 300,300)} aria-label="Seat hold time remaining"/></div>
      <p className="muted">Demo confirmation. There is no payment or charge.</p>
    </>}
    <div className="actions">
      {status === 'held' && <button disabled={!!pending || seconds === 0 || !eligible} onClick={()=>action('confirm')}>
        {pending === 'confirm' ? <LoaderCircle className="spin" size={17}/> : <Check size={17}/>} Confirm booking</button>}
      {eligible && ['held','confirmed'].includes(status) && <button disabled={!!pending || (status === 'held' && seconds === 0)} className="outline" onClick={()=>action('cancel')}>
        {pending === 'cancel' && <LoaderCircle className="spin" size={17}/>} Cancel booking</button>}
    </div>
    {message && <p role="status">{message}</p>}
  </div>;
}
