'use client';
import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';
import { Armchair, Check, ChevronDown, Clock3, LoaderCircle, Minus, Plus, Sparkles, Ticket, X } from 'lucide-react';
import type { Seat } from '@/lib/catalog';
import { money } from '@/lib/format';
import { api } from './actions';

type Recommendation = {ids:number[];label:string;total:number;score:number;reason:string};
type Props = {
  eventId:number;
  seats:Seat[];
  initialSeats:number[];
  canBook:boolean;
  guest:boolean;
  defaults?:{budget:number;section:string;accessible:boolean};
};
const limit = 8;
const legend = ['available','selected','held','booked','unavailable'] as const;

export default function SeatMap({eventId,seats,initialSeats,canBook,guest,defaults}: Props) {
  const [inventory,setInventory] = useState(seats);
  const [selected,setSelected] = useState(initialSeats);
  const [focus,setFocus] = useState<string | null>(null);
  const [count,setCount] = useState(2);
  const [results,setResults] = useState<Recommendation[] | null>(null);
  const [pending,setPending] = useState<'hold' | 'recommend' | null>(null);
  const [message,setMessage] = useState('');
  const [live,setLive] = useState(true);
  const sections = [...new Set(inventory.map(s => s.section))];
  const visibleSections = focus ? sections.filter(s => s === focus) : sections;
  const availableIds = new Set(inventory.filter(s => s.state === 'available').map(s => s.seat_id));
  const chosen = inventory.filter(s => selected.includes(s.seat_id) && availableIds.has(s.seat_id));
  const selectionChanged = chosen.length !== selected.length;
  const total = chosen.reduce((sum,s) => sum + s.price, 0);

  useEffect(()=>{
    const ctrl = new AbortController();
    let refreshing = false;
    async function refresh() {
      if (refreshing) return;
      refreshing = true;
      try {
        const response = await fetch('/api/inventory?eventId='+eventId,{cache:'no-store',signal:ctrl.signal});
        if(!response.ok) throw new Error('Inventory could not refresh');
        setInventory(await response.json());
        setLive(true);
      } catch {
        if(!ctrl.signal.aborted) setLive(false);
      } finally {
        refreshing = false;
      }
    }
    const timer = setInterval(refresh,8000);
    return ()=>{clearInterval(timer);ctrl.abort()};
  },[eventId]);

  function toggleSeat(seatId:number) {
    const current = selected.filter(id => availableIds.has(id));
    if (current.includes(seatId)) {
      setSelected(current.filter(id => id !== seatId));
      setMessage('');
    } else if(current.length < limit) {
      setSelected([...current,seatId]);
      setMessage('');
    } else {
      setMessage('You can select up to eight seats. Remove a seat to choose another.');
    }
  }

  async function hold() {
    if (selectionChanged || !chosen.length || pending) return;
    setPending('hold');
    setMessage('');
    try {
      const {bookingId} = await api<{bookingId:string}>('reserve',{eventId,seats:chosen.map(s=>s.seat_id)});
      window.location.assign('/account/bookings/'+bookingId);
    } catch(error) {
      setMessage((error as Error).message);
      setPending(null);
    }
  }

  async function suggestions(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending('recommend');
    setMessage('');
    const f = new FormData(e.currentTarget);
    try {
      setResults(await api('recommend',{
        eventId,count,budget:Number(f.get('budget')),distance:Number(f.get('distance')),
        section:f.get('section'),accessible:f.has('accessible'),
      }));
    } catch(error) {
      setMessage((error as Error).message);
    } finally {
      setPending(null);
    }
  }

  function chooseGroup(group:Recommendation) {
    setSelected(group.ids);
    setMessage('');
    setFocus(inventory.find(s => s.seat_id === group.ids[0])?.section ?? null);
  }

  const returnPath = '/events/'+eventId+(chosen.length ? '?seats='+chosen.map(s=>s.seat_id).join(',') : '')+'#seats';

  return <section className="seating" id="seats" tabIndex={-1} aria-labelledby="seats-heading">
    <div className="section-line seating-heading"><div><p className="eyebrow">SEAT MAP</p><h2 id="seats-heading">Choose your seats</h2></div>
      <span className="availability" data-live={live}><i/> {live ? 'Live availability' : 'Update delayed · retrying'}</span>
    </div>
    <div className="seat-layout">
      <div className="panel map">
        <div className="map-toolbar">
          <div className="seat-zones" role="group" aria-label="Filter seating sections">
            <button className="pill" type="button" aria-pressed={focus === null} onClick={()=>setFocus(null)}>All sections</button>
            {sections.map(section=><button key={section} className="pill" type="button" aria-pressed={focus === section} onClick={()=>setFocus(section)}>{section}</button>)}
          </div>
          <div className="legend" aria-label="Seat states">
            {legend.map(state=><span key={state}><i className={'state '+state}/>{state}</span>)}
          </div>
        </div>
        <div className="stage">Stage</div>
        {visibleSections.map(section=>{
          const area = inventory.filter(s => s.section === section);
          const open = area.filter(s => s.state === 'available').length;
          return <div className="section-map" key={section}>
            <div className="seat-area-title"><h3>{section}</h3><span>{open} available</span></div>
            <div className="seat-overflow" aria-label={section+' seat map'}>
              {[...new Set(area.map(s => s.row_label))].map(row=><div key={row} className="seat-row">
                <b aria-hidden="true">{row}</b>
                {area.filter(s => s.row_label === row).map((s,index,rowSeats)=>{
                  const active = s.state === 'available' && selected.includes(s.seat_id);
                  const caption = section+' '+row+s.seat_no+' · '+s.category+' · '+money(s.price)+' · '+(active?'selected':s.state)+(s.accessible?' · Accessible':'');
                  return <button key={s.seat_id} type="button" title={caption} aria-label={caption} aria-pressed={active}
                    className={'state '+(active?'selected':s.state)+(s.seat_no > 5 && (index === 0 || rowSeats[index-1].seat_no <= 5) ? ' aisle' : '')}
                    disabled={s.state !== 'available' || pending === 'hold'}
                    onClick={()=>toggleSeat(s.seat_id)}>{active ? <Check size={15}/> : s.seat_no}{s.accessible && <i className="accessible-marker"/>}</button>;
                })}
                <b aria-hidden="true">{row}</b>
              </div>)}
            </div>
          </div>;
        })}
        <div className="map-footer"><span><i className="accessible-key"/> Accessible seat</span>
          <a className="text-button selection-jump" href="#selection">View selection{chosen.length > 0 && ' ('+chosen.length+')'}</a>
        </div>
      </div>

      <div className="seat-side stack">
        <aside className="panel basket" id="selection">
          <div className="basket-heading"><div className="section-icon"><Ticket size={21}/></div><h3>Your selection</h3>
            {chosen.length > 0 && <span className="tag">{chosen.length} {chosen.length === 1 ? 'seat' : 'seats'}</span>}</div>
          {!chosen.length && <div className="empty basket-empty"><Armchair size={24}/><p>Pick up to eight available seats on the map.</p></div>}
          {chosen.length > 0 && <ul className="chosen-seats">{chosen.map(s=><li key={s.seat_id}>
            <span><strong>{s.section} {s.row_label}{s.seat_no}</strong><small>{s.category}</small></span><strong>{money(s.price)}</strong>
            <button type="button" className="icon-button" title="Remove seat" aria-label={'Remove '+s.section+' '+s.row_label+s.seat_no}
              disabled={pending === 'hold'} onClick={()=>toggleSeat(s.seat_id)}><X size={17}/></button>
          </li>)}</ul>}
          {selectionChanged && <div className="seat-notice" role="status">Some selected seats are no longer available.
            <button className="text-button" onClick={()=>setSelected(chosen.map(s=>s.seat_id))}>Keep available seats</button></div>}
          <p className="total"><span>Total</span><strong aria-live="polite">{money(total)}</strong></p>
          {canBook ? <button className="basket-action" disabled={!chosen.length || !!pending || selectionChanged} onClick={hold}>
            {pending === 'hold' ? <LoaderCircle className="spin" size={18}/> : <Clock3 size={18}/>} {pending === 'hold' ? 'Holding seats…' : 'Hold seats for 5 minutes'}
          </button> : guest ? <Link className="button basket-action" href={'/sign-in?next='+encodeURIComponent(returnPath)}>Sign in to reserve</Link> : <p className="muted">Use a customer account to reserve seats.</p>}
          {message && <p role="alert" className="error">{message}</p>}
        </aside>
        {canBook && <details className="panel seat-finder" open>
          <summary><span className="section-icon"><Sparkles size={20}/></span><h3>Find seats together</h3><ChevronDown size={19} className="summary-chevron"/></summary>
          <form className="stack" onSubmit={suggestions}>
            <div className="seat-finder-grid">
              <div className="stepper-group"><span id="seat-count-label">Seats together</span>
                <div className="stepper" role="group" aria-labelledby="seat-count-label">
                  <button type="button" className="icon-button" aria-label="Fewer seats" disabled={count===1} onClick={()=>setCount(count-1)}><Minus size={17}/></button>
                  <output aria-live="polite">{count}</output>
                  <button type="button" className="icon-button" aria-label="More seats" disabled={count===limit} onClick={()=>setCount(count+1)}><Plus size={17}/></button>
                </div>
              </div>
              <label>Total budget (₹)<input type="number" min={0} max={1000000} name="budget" defaultValue={defaults?.budget??6000} required/></label>
              <label>Preferred section<select name="section" defaultValue={defaults?.section??''}><option value="">Any section</option>{sections.map(s=><option key={s}>{s}</option>)}</select></label>
              <label>Preferred distance (m)<input type="number" min={1} max={1000} name="distance" defaultValue={6} required/></label>
            </div>
            <label className="check"><input type="checkbox" name="accessible" defaultChecked={defaults?.accessible}/> Include an accessible seat</label>
            <button className="outline finder-action" disabled={!!pending}>{pending === 'recommend' ? <LoaderCircle className="spin" size={17}/> : <Sparkles size={17}/>}
              {pending === 'recommend' ? 'Finding groups…' : 'Find available groups'}</button>
          </form>
          {results?.length === 0 && <p className="empty">No adjacent groups match your requirements.</p>}
          {results?.map(r=>{
            const applied = r.ids.length === selected.length && r.ids.every(id=>selected.includes(id));
            const unavailable = r.ids.some(id=>!availableIds.has(id));
            return <div className="recommendation" key={r.ids.join(',')} data-applied={applied}>
              <div className="recommendation-top"><strong>{r.label}</strong><span className="tag">{r.score}/100</span></div>
              <p>{money(r.total)}</p><small>{r.reason}</small>
              <button className="text-button" disabled={unavailable || applied || pending === 'hold'} onClick={()=>chooseGroup(r)}>
                {unavailable ? 'Seats no longer available' : applied ? 'Selected' : 'Select these seats'}</button>
            </div>;
          })}
        </details>}
      </div>
    </div>
  </section>;
}
